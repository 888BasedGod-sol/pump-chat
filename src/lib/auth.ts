import { PrivyClient } from "@privy-io/server-auth";

let _privy: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (_privy) return _privy;
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("Missing NEXT_PUBLIC_PRIVY_APP_ID or PRIVY_APP_SECRET env vars");
  }
  _privy = new PrivyClient(appId, appSecret);
  return _privy;
}

/**
 * Verify a Privy auth token from the Authorization header.
 * Returns the Privy user ID (DID) on success, null on failure.
 */
export async function verifyPrivyToken(request: Request): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const claims = await getPrivyClient().verifyAuthToken(token);
    return { userId: claims.userId };
  } catch {
    return null;
  }
}

/**
 * Get a Privy user by ID (includes linked accounts like twitter).
 */
export async function getPrivyUser(userId: string) {
  return getPrivyClient().getUser(userId);
}
