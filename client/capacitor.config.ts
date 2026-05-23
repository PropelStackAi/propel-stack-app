import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration — Session 11.
 * Bundle ID: ai.propelstack.app  |  App name: Propel Stack AI
 * webDir points at the Vite build output.
 */
const config: CapacitorConfig = {
  appId: 'ai.propelstack.app',
  appName: 'Propel Stack AI',
  webDir: 'dist',

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchFadeOutDuration: 300,
      backgroundColor: '#4F35C2',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      iosSpinnerStyle: 'small',
    },
    StatusBar: {
      // "Dark" Capacitor style = light-coloured text on a dark background
      style: 'Dark',
      backgroundColor: '#4F35C2',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Geolocation: {
      // iOS: NSLocationWhenInUseUsageDescription must be set in Info.plist
    },
    Camera: {
      // iOS: NSCameraUsageDescription + NSPhotoLibraryUsageDescription must be set in Info.plist
    },
  },
};

export default config;
