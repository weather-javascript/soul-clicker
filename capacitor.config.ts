import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.weatherjavascript.infinitysoulclicker',
  appName: 'Infinity Soul Clicker',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0a0f',
  },
};

export default config;