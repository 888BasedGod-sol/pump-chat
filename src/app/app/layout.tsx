import AppHeader from "@/components/AppHeader";
import CommunityProviderWrapper from "@/components/CommunityProviderWrapper";
import AuthProvider from "@/components/AuthProvider";
import MusicPlayer from "@/components/MusicPlayer";
import TickerBanner from "@/components/TickerBanner";

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
        <TickerBanner />
        <main className="flex-1">{children}</main>
      </div>
      <MusicPlayer />
    </CommunityProviderWrapper>
    </AuthProvider>
  );
}
