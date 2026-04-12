import AppHeader from "@/components/AppHeader";
import WalletProvider from "@/components/WalletProvider";
import CommunityProviderWrapper from "@/components/CommunityProviderWrapper";
import AuthProvider from "@/components/AuthProvider";

export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
    <WalletProvider>
    <CommunityProviderWrapper>
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex-1">{children}</main>
      </div>
    </CommunityProviderWrapper>
    </WalletProvider>
    </AuthProvider>
  );
}
