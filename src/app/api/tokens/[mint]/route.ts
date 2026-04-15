import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/lib/solana";

export const dynamic = "force-dynamic";

const PUMP_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const GRADUATION_SOL = 85;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    const { mint } = await params;
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");
    const mintPubkey = new PublicKey(mint);

    // Derive bonding curve PDA
    const [bondingCurvePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding-curve"), mintPubkey.toBuffer()],
      PUMP_PROGRAM
    );

    const accountInfo = await connection.getAccountInfo(bondingCurvePda);

    if (!accountInfo) {
      return NextResponse.json({
        mint,
        marketCap: "0",
        isGraduated: false,
        progressBps: 0,
        progressPercent: 0,
      });
    }

    const solBalance = accountInfo.lamports / 1e9;
    const progressPercent = Math.min(Math.round((solBalance / GRADUATION_SOL) * 100), 100);

    return NextResponse.json({
      mint,
      marketCap: Math.round(solBalance * 10) / 10,
      isGraduated: progressPercent >= 100,
      progressBps: progressPercent * 100,
      progressPercent,
    }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to fetch token detail:", message);
    return NextResponse.json(
      { error: "Failed to fetch token", detail: message },
      { status: 500 }
    );
  }
}
