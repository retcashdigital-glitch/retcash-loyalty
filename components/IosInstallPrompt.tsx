'use client';

import { useState, useEffect } from 'react';

export default function IosInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Check if the device is iOS (iPhone, iPad, iPod)
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    
    // 2. Check if the app is already running in standalone mode (Home Screen PWA)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    // 3. Show prompt only if on iOS Safari and NOT installed yet
    if (isIos && !isInStandaloneMode) {
      const dismissed = sessionStorage.getItem('ios_prompt_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('ios_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      right: '20px',
      backgroundColor: '#ffffff',
      color: '#0d5c3f',
      padding: '16px',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 9999,
      border: '1px solid #0d5c3f',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <strong style={{ fontSize: '15px' }}>📱 Install Retcash App</strong>
        <button 
          onClick={handleDismiss} 
          style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#666' }}
        >
          ✕
        </button>
      </div>
      <p style={{ fontSize: '13px', margin: '0 0 10px 0', color: '#333', lineHeight: '1.4' }}>
        For the best experience, tap the <b>Share button</b> ⎋ at the bottom of your Safari browser and select <b>'Add to Home Screen'</b>.
      </p>
    </div>
  );
}