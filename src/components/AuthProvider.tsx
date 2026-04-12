"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { type ReactNode, useState, useEffect } from "react";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId || !mounted) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#4ade80",
        },
        loginMethods: ["twitter"],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
