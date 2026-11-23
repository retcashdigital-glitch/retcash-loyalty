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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Retcash",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, Android, iOS",
  url: "https://retcashapp.com",
  description:
    "Retcash is a digital loyalty card and cashback platform for retail stores. Customers track visit stamps, use a Digital QR Pass, receive instant web push alerts, and secure their wallet with a 4-digit PIN and Email OTP.",
  featureList: [
    "Digital Loyalty Wallets & QR Pass",
    "4-Digit PIN & Email OTP Security",
    "Visit Stamp & Cashback Tracker",
    "Instant Browser Push Notifications & Store Offers",
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://retcashapp.com"),
  title: "Retcash - Digital Loyalty Card & Cashback Wallet",
  description:
    "Retcash is a digital loyalty card and cashback platform for retail stores. Track visit stamps, use your Digital QR Pass, get instant push alerts, and secure your wallet with a 4-digit PIN and Email OTP.",
  keywords: [
    "Retcash",
    "Retcash App",
    "Digital Loyalty Card",
    "Cashback Wallet",
    "QR Loyalty Pass",
    "Retail Rewards Sri Lanka",
  ],
  verification: {
    google: "ZgVNM5oW8qGZGQDQGXzDV-Jf54z_B2pBrgM5m2nOlFY",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Retcash - Digital Loyalty Card & Cashback Wallet",
    description:
      "Track visit stamps, use your Digital QR Pass, get instant push alerts, and secure your rewards wallet with a 4-digit PIN and Email OTP.",
    url: "https://retcashapp.com",
    siteName: "Retcash",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <main className="min-h-full flex flex-col bg-neutral-950 text-white">
          {children}
        </main>
      </body>
    </html>
  );
}