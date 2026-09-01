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
  title: "Retcash - Digital Loyalty Card",
  description: "Track your visits and unlock exclusive cashback rewards.",
  openGraph: {
    title: "Retcash - Digital Loyalty Card",
    description: "Track your visits and unlock exclusive cashback rewards.",
    images: [
      {
        url: "/logo.jpeg",
        width: 1200,
        height: 630,
        alt: "Retcash Logo",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-white">

        {/* 🔥 மிகத் தூய்மையான மற்றும் நேர்த்தியான ஹெடர் (Clean Header) */}
        {/* உன்னுடைய மற்ற பக்கங்கள் இயல்பாக வேலை செய்யும் பகுதி */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

      </body>
    </html>
  );
}