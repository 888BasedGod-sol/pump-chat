"use client";

import { usePrivySafe } from "@/hooks/usePrivySafe";
import { useWallet } from "@solana/wallet-adapter-react";
import { CommunityProvider } from "@/context/CommunityContext";
import type { ReactNode } from "react";
import { useCallback } from "react";

export default function CommunityProviderWrapper({ children }: { children: ReactNode }) {
  const privy = usePrivySafe();
  const { publicKey } = useWallet();

  const user = privy?.user;
  const getAccessTokenFn = privy?.getAccessToken;

  // X account is the primary identity via Privy; wallet is only for ownership claims
  const xUsername = user?.twitter?.username ?? undefined;
  const xId = user?.twitter?.subject ?? undefined;

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (!getAccessTokenFn) return null;
    try {
      return await getAccessTokenFn();
    } catch {
      return null;
    }
  }, [getAccessTokenFn]);

  return (
    <CommunityProvider
      xUsername={xUsername ?? null}
      xId={xId ?? null}
      walletAddress={publicKey?.toBase58() ?? null}
      getAccessToken={getAuthToken}
    >
      {children}
    </CommunityProvider>
  );
}
