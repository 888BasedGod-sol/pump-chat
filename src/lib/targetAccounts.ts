/** Monitored X accounts whose tweets appear in the Targets feed. */
export const TARGET_ACCOUNTS = [
  "assasin_eth",
  "0xSweep",
  "mrpunkdoteth",
  "SolJakey",
  "ToolySOL",
  "p_eng_uin",
  "henokcrypto",
  "MINHxDYNASTY",
  "MacroCRG",
  "CastilloTrading",
  "anonchain",
  "DustyBC",
  "PopPunkOnChain",
  "DegenerateNews",
  "BagCalls",
  "pepeDRT",
] as const;

export type TargetAccount = (typeof TARGET_ACCOUNTS)[number];
