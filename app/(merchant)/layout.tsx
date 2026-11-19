import type { Metadata } from "next";
import IosInstallPrompt from "@/components/IosInstallPrompt";

export const metadata: Metadata = {
  manifest: "/manifest-merchant.json",
  themeColor: "#0d5c3f",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/Retcash%20Merchant%20logo.jpeg", sizes: "192x192", type: "image/jpeg" },
      { url: "/Retcash%20Merchant%20logo.jpeg", sizes: "512x512", type: "image/jpeg" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/Retcash%20Merchant%20logo.jpeg", sizes: "180x180", type: "image/jpeg" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Retcash Merchant",
  },
};

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <IosInstallPrompt />
    </>
  );
}