import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.retcashapp.merchant',
  appName: 'Retcash Merchant',
  webDir: 'public',
  server: {
    url: 'https://retcashapp.com/merchant', // உங்களது கடையுரிமையாளர் லாகின் வெப் முகவரி
    cleartext: true
  }
};

export default config;