/**
 * Native plugin utilities — Session 11.
 *
 * All Capacitor plugins are imported dynamically so the web bundle stays clean.
 * Every exported function is a no-op on the web platform, so nothing in the
 * existing codebase breaks when running in a browser.
 */

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

/** True only when running inside a Capacitor native shell (iOS or Android). */
export function isNative(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any)?.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/** Returns 'ios' | 'android' | 'web'. */
export function getPlatform(): 'ios' | 'android' | 'web' {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any)?.Capacitor?.getPlatform?.() ?? 'web';
  } catch {
    return 'web';
  }
}

// ---------------------------------------------------------------------------
// Haptics
// ---------------------------------------------------------------------------

/** Light haptic tap — button press confirmations. No-op on web. */
export async function hapticTap(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* best-effort */
  }
}

/** Medium haptic impact — form submissions, primary actions. No-op on web. */
export async function hapticMedium(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    /* best-effort */
  }
}

/** Success notification haptic — saves, completions. No-op on web. */
export async function hapticSuccess(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    /* best-effort */
  }
}

/** Error notification haptic — validation failures. No-op on web. */
export async function hapticError(): Promise<void> {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Error });
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// Status Bar
// ---------------------------------------------------------------------------

/**
 * Set status bar to brand indigo with light (white) text.
 * Called once on app startup in main.tsx.
 * No-op on web.
 */
export async function initStatusBar(): Promise<void> {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // Style.Dark = light text (counterintuitive naming from native SDKs)
    await StatusBar.setStyle({ style: Style.Dark });
    if (getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#4F35C2' });
    }
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// Splash Screen
// ---------------------------------------------------------------------------

/**
 * Hide the splash screen after the React tree has rendered.
 * Called in main.tsx after ReactDOM.createRoot().render().
 * No-op on web.
 */
export async function hideSplash(): Promise<void> {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// Geolocation
// ---------------------------------------------------------------------------

export interface NativePosition {
  lat: number;
  lng: number;
}

/**
 * Get the device's current GPS position.
 * Uses Capacitor Geolocation on native (higher accuracy, proper permission
 * flow) and falls back to the browser Geolocation API on web.
 *
 * @throws Error when the user denies permission or GPS is unavailable.
 */
export async function getCurrentPosition(): Promise<NativePosition> {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { timeout: 8000, enableHighAccuracy: true },
    );
  });
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

/**
 * Open the camera or photo library and return a data-URL string.
 * Uses Capacitor Camera on native; falls back to a file-input click on web.
 *
 * Pass `fileInputRef` for the web fallback — when Capacitor is absent, the
 * function triggers a click on that input and returns null (the file input's
 * onChange handler must handle the resulting File).
 *
 * @returns data-URL string on native, null on web (file-input path).
 */
export async function takeCameraPhoto(
  fileInputRef?: React.RefObject<HTMLInputElement>,
): Promise<string | null> {
  if (isNative()) {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt, // lets user choose Camera vs. Library
    });
    return photo.dataUrl ?? null;
  }

  // Web fallback — trigger the hidden <input type="file" capture="environment">
  fileInputRef?.current?.click();
  return null;
}

// ---------------------------------------------------------------------------
// Push Notifications (permission request only — server handles sending)
// ---------------------------------------------------------------------------

/**
 * Request push notification permission on native.
 * Safe to call; no-op on web.
 * Returns 'granted' | 'denied' | 'prompt' on native, 'web' on browser.
 */
export async function requestPushPermission(): Promise<string> {
  if (!isNative()) return 'web';
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const result = await PushNotifications.requestPermissions();
    if (result.receive === 'granted') {
      await PushNotifications.register();
    }
    return result.receive;
  } catch {
    return 'denied';
  }
}
