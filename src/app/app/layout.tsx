import AppHeader from "@/components/AppHeader";
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
    <CommunityProviderWrapper>
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="flex-1">{children}</main>
      </div>
    </CommunityProviderWrapper>
    </AuthProvider>
  );
}
