import { Connection } from "@solana/web3.js";

const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

// Warn if no dedicated RPC is configured
if (!process.env.SOLANA_RPC_URL) {
  console.warn("WARNING: SOLANA_RPC_URL not set — falling back to public RPC (rate-limited).");
}

export const SOLANA_RPC_URL: string = process.env.SOLANA_RPC_URL || PUBLIC_RPC;

export const connection = new Connection(SOLANA_RPC_URL, "confirmed");

// Pump.fun program IDs
export const PUMP_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
export const PUMP_AMM_PROGRAM_ID = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
