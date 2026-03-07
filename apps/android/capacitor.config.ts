import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.plexo.Plexo',
  appName: 'Plexo',
  webDir: 'www',
  server: {
    allowNavigation: ['*'],
    errorPath: 'error.html',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
