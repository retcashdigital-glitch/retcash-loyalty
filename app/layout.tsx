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
  metadataBase: new URL("https://retcashapp.com"),
  title: "Retcash - Digital Loyalty Card",
  description: "Track your visits and unlock exclusive cashback rewards.",
  icons: {
    icon: [
      { url: "/logo.png?v=2", type: "image/png" },
    ],
    shortcut: "/logo.png?v=2",
    apple: "/logo.png?v=2",
  },
  openGraph: {
    title: "Retcash - Digital Loyalty Card",
    description: "Track your visits and unlock exclusive cashback rewards.",
    url: "https://retcashapp.com",
    siteName: "Retcash",
    images: [
      {
        url: "/logo.png?v=2",
        width: 1200,
        height: 630,
        alt: "Retcash Logo",
      },
    ],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <main className="min-h-full flex flex-col bg-neutral-950 text-white">
          {children}
        </main>
      </body>
    </html>
  );
}