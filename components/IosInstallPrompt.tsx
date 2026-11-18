'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Share, PlusSquare, X } from 'lucide-react';

export default function IosInstallPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. Check if the device is iOS (iPhone, iPad, iPod)
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    
    // 2. Check if the app is already running in standalone mode (Home Screen PWA)
    const isInStandaloneMode = 'standalone' in window && (window.navigator as any).standalone;

    // 3. Show prompt only if on iOS safari and NOT installed yet
    if (isIos && !isInStandaloneMode) {
      const dismissed = sessionStorage.getItem('ios_prompt_dismissed');
      if (!dismissed) {
        setShowBanner(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('ios_prompt_dismissed', 'true');
  };

  return (
    <>
      {/* 1. எப்போதுமே திரையில் இருக்கக்கூடிய நேர்த்தியான 'Install App' பட்டன் */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-50 bg-green-700 text-white px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 text-sm font-semibold hover:bg-green-800 transition-all duration-300 hover:scale-105"
      >
        <Smartphone className="w-4 h-4" />
        <span>Install App</span>
      </button>

      {/* 2. முதல் முறை ஆட்டோமேட்டிக்காக வரும் சிறிய பேனர் (Banner) */}
      {showBanner && (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-white rounded-2xl p-4 shadow-2xl border border-gray-100 text-gray-800 animate-slideUp">
          <div className="flex items-start justify-between gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-700 flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 text-sm">Install Retcash App</h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Add to your Home Screen for a fast, native app experience.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setShowBanner(false);
                    setIsOpen(true);
                  }}
                  className="bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-green-800"
                >
                  How to Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-gray-200"
                >
                  Later
                </button>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. முழுமையான வழிகாட்டி மோடல் (Modal) - பட்டனை அழுத்தும்போது திறக்கும் */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-gray-800 shadow-2xl relative border border-gray-100">
            
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center text-green-700">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Add to Home Screen
                </h3>
                <p className="text-xs text-gray-500">Quick access like a native app</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-5">
              Follow these quick steps in Safari to pin Retcash to your home screen:
            </p>

            <div className="space-y-3 text-sm text-gray-700 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3.5">
                <div className="bg-white shadow-sm text-green-700 font-bold w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100 text-xs">
                  1
                </div>
                <p className="flex items-center gap-1.5 flex-1 text-gray-700">
                  Tap the <span className="inline-flex items-center gap-1 font-semibold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200"><Share className="w-3.5 h-3.5 text-blue-600" /> Share</span> button below
                </p>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="bg-white shadow-sm text-green-700 font-bold w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100 text-xs">
                  2
                </div>
                <p className="flex items-center gap-1.5 flex-1 text-gray-700">
                  Select <span className="inline-flex items-center gap-1 font-semibold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200"><PlusSquare className="w-3.5 h-3.5 text-gray-700" /> Add to Home Screen</span>
                </p>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="bg-white shadow-sm text-green-700 font-bold w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-100 text-xs">
                  3
                </div>
                <p className="text-gray-700">
                  Tap <b className="text-gray-900 font-semibold">Add</b> in the top right corner. You're set!
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="mt-6 w-full bg-green-700 text-white py-3 rounded-2xl font-semibold hover:bg-green-800 transition-all shadow-lg shadow-green-700/20"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
}