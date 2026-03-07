import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.plexo.Plexo',
  appName: 'Plexo',
  webDir: 'www',
  server: {
    allowNavigation: ['*'],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
