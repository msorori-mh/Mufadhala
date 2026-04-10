import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { saveNativeSession } from '@/lib/nativeSessionStorage';

export const isNativePlatform = () => Capacitor.isNativePlatform();

export async function initializeCapacitor() {
  if (!isNativePlatform()) return;

  try {
    await StatusBar.setBackgroundColor({ color: '#1A237E' });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (e) {
    console.warn('StatusBar setup failed:', e);
  }

  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch (e) {
    console.warn('SplashScreen hide failed:', e);
  }

  // Listen for app resume — refresh session automatically
  App.addListener('resume', async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Attempt a token refresh to keep session alive
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        if (refreshed) {
          await saveNativeSession(refreshed.access_token, refreshed.refresh_token);
        }
      }
    } catch (e) {
      console.warn('Session refresh on resume failed:', e);
    }
  });
}
