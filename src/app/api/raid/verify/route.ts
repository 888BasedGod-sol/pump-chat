import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/lib/solana";
import { raidVerifySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = raidVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors, verified: false },
        { status: 400 }
      );
    }
    const { wallet, mint, raidId, type } = parsed.data;

    let walletPubkey: PublicKey;
    let mintPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(wallet);
      mintPubkey = new PublicKey(mint);
    } catch {
      return NextResponse.json(
        { error: "Invalid wallet or mint address", verified: false },
        { status: 400 }
      );
    }

    const connection = new Connection(SOLANA_RPC_URL, "confirmed");

    // Check both Token Program and Token-2022
    const [tokenAccounts, token2022Accounts] = await Promise.all([
      connection.getParsedTokenAccountsByOwner(
        walletPubkey,
        { mint: mintPubkey, programId: TOKEN_PROGRAM_ID }
      ),
      connection.getParsedTokenAccountsByOwner(
        walletPubkey,
        { mint: mintPubkey, programId: TOKEN_2022_PROGRAM_ID }
      ),
    ]);

    let balance = 0;
    for (const account of [...tokenAccounts.value, ...token2022Accounts.value]) {
      const parsed = account.account.data.parsed;
      if (parsed?.info?.tokenAmount?.uiAmount) {
        balance += parsed.info.tokenAmount.uiAmount;
      }
    }

    // Return 200 with verified field — client checks data.verified
    return NextResponse.json({
      verified: balance > 0,
      wallet,
      mint,
      raidId,
      type,
      balance,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Raid verification failed:", message);
    return NextResponse.json(
      { error: "Verification failed", verified: false },
      { status: 500 }
    );
  }
}
