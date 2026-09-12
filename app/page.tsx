import Link from 'next/link';

export default function GlobalLandingPage() {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-100 flex flex-col justify-between items-center p-6 font-sans selection:bg-[#FF6B00]">
      
      {/* Header */}
      <header className="w-full max-w-md flex justify-between items-center pt-4">
        <h1 className="text-2xl font-black text-[#FF6B00] tracking-wider uppercase">
          RETCASH
        </h1>
        <span className="text-[10px] bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full font-mono">
          v2.0
        </span>
      </header>

      {/* Main Selection Area */}
      <main className="w-full max-w-sm bg-[#161B26] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6 my-auto text-center">
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">
            Welcome to Retcash
          </h2>
          <p className="text-xs text-gray-400">
            Please select your portal to continue
          </p>
        </div>

        {/* Option Buttons */}
        <div className="space-y-3 pt-2">
          
          {/* Merchant Portal */}
          <Link 
            href="/merchant"
            className="w-full bg-[#FF6B00] hover:bg-[#ff8526] text-white font-bold py-4 px-4 rounded-2xl text-sm transition duration-200 shadow-lg shadow-[#FF6B00]/20 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🏪</span>
              <div className="text-left">
                <div className="font-bold">Merchant Portal</div>
                <div className="text-[10px] text-orange-100 font-normal">Store login & manage billing</div>
              </div>
            </div>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>

          {/* Customer Portal */}
          <Link 
            href="/customer/login"
            className="w-full bg-[#0B0E14] hover:bg-gray-900 text-gray-200 border border-gray-800 font-bold py-4 px-4 rounded-2xl text-sm transition duration-200 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">💳</span>
              <div className="text-left">
                <div className="font-bold">Customer Portal</div>
                <div className="text-[10px] text-gray-400 font-normal">Check cashback & wallet</div>
              </div>
            </div>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>

        </div>

      </main>

      {/* Footer */}
      <footer className="pb-4 text-center">
        <p className="text-[11px] text-gray-500">
          Secure Loyalty & Rewards Platform
        </p>
      </footer>

    </div>
  );
}