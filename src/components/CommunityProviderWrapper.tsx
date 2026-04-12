"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallet } from "@solana/wallet-adapter-react";
import { CommunityProvider } from "@/context/CommunityContext";
import type { ReactNode } from "react";
import { useCallback } from "react";

export default function CommunityProviderWrapper({ children }: { children: ReactNode }) {
  const { user, getAccessToken } = usePrivy();
  const { publicKey } = useWallet();

  // X account is the primary identity via Privy; wallet is only for ownership claims
  const xUsername = user?.twitter?.username ?? undefined;
  const xId = user?.twitter?.subject ?? undefined;

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      return await getAccessToken();
    } catch {
      return null;
    }
  }, [getAccessToken]);

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
