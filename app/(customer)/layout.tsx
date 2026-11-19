import type { Metadata } from "next";
import IosInstallPrompt from "@/components/IosInstallPrompt";

export const metadata: Metadata = {
  manifest: "/manifest-customer.json",
  themeColor: "#0d5c3f",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Retcash",
  },
};

export default function CustomerLayout({
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