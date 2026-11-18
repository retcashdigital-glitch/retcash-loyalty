import type { Metadata } from "next";
import IosInstallPrompt from "@/components/IosInstallPrompt";

export const metadata: Metadata = {
  manifest: "/manifest-merchant.json",
  themeColor: "#0d5c3f",
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