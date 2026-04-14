import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || "https://pumpchat.app"),
  title: "Pump Chat",
  description: "The one-stop hub for memecoin communities",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/nobg.png", type: "image/png", sizes: "2000x2000" },
    ],
    apple: "/nobg.png",
  },
  openGraph: {
    title: "Pump Chat",
    description: "The one-stop hub for memecoin communities",
    images: [{ url: "/nobg.png", width: 2000, height: 2000 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Pump Chat",
    description: "The one-stop hub for memecoin communities",
    images: ["/nobg.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
