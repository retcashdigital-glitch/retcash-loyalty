import type { Metadata } from "next";
import IosInstallPrompt from "@/components/IosInstallPrompt";

export const metadata: Metadata = {
  manifest: "/manifest-customer.json",
  themeColor: "#0d5c3f",
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