"use client";

import { usePrivySafe } from "@/hooks/usePrivySafe";
import { CommunityProvider } from "@/context/CommunityContext";
import type { ReactNode } from "react";
import { useCallback } from "react";

export default function CommunityProviderWrapper({ children }: { children: ReactNode }) {
  const privy = usePrivySafe();

  const user = privy?.user;
  const getAccessTokenFn = privy?.getAccessToken;

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
      getAccessToken={getAuthToken}
    >
      {children}
    </CommunityProvider>
  );
}
