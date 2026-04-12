"use client";

import { usePrivy } from "@privy-io/react-auth";

const FALLBACK = {
  ready: false,
  authenticated: false,
  user: null,
  login: () => {},
  logout: async () => {},
  getAccessToken: async () => null as string | null,
} as const;

/**
 * Safe wrapper around usePrivy that returns safe defaults when
 * PrivyProvider is not yet mounted (e.g. during SSR or before hydration).
 */
export function usePrivySafe() {
  try {
    return usePrivy();
  } catch {
    return FALLBACK;
  }
}
