import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/lib/solana";
import { balanceQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  const mint = req.nextUrl.searchParams.get("mint");

  const parsed = balanceQuerySchema.safeParse({ wallet, mint });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  let walletPubkey: PublicKey;
  let mintPubkey: PublicKey;
  try {
    walletPubkey = new PublicKey(parsed.data.wallet);
    mintPubkey = new PublicKey(parsed.data.mint);
  } catch {
    return NextResponse.json(
      { error: "Invalid wallet or mint address" },
      { status: 400 }
    );
  }

  try {
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");

    // Find the associated token account (ATA) for this wallet + mint
    const TOKEN_PROGRAM_ID = new PublicKey(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    );
    const TOKEN_2022_PROGRAM_ID = new PublicKey(
      "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
    );

    // Check both Token Program and Token-2022 accounts
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

    return NextResponse.json({
      wallet,
      mint,
      balance,
      hasToken: balance > 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Token balance check failed:", message);
    return NextResponse.json(
      { error: "Failed to check token balance", detail: message },
      { status: 500 }
    );
  }
}
