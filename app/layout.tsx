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
        <header className="w-full py-3.5 px-6 border-b border-neutral-800/80 flex items-center justify-center bg-neutral-900/40 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="Retcash Logo"
              className="w-8 h-8 rounded-xl object-contain shadow-md border border-orange-500/30"
            />
            <div className="text-xl font-black tracking-widest flex items-center">
              <span className="text-orange-500">RET</span>
              <span className="text-white">CASH</span>
            </div>
          </div>
        </header>

        {/* உன்னுடைய மற்ற பக்கங்கள் இயல்பாக வேலை செய்யும் பகுதி */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

      </body>
    </html>
  );
}