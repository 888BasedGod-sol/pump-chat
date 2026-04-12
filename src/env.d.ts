declare namespace NodeJS {
  interface ProcessEnv {
    SOLANA_RPC_URL?: string;
    NODE_ENV: "development" | "production" | "test";
    AUTH_SECRET: string;
    AUTH_TWITTER_ID: string;
    AUTH_TWITTER_SECRET: string;
    AUTH_URL?: string;
  }
}
