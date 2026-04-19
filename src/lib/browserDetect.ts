/**
 * Browser/platform detection helpers for install flow gating.
 *
 * Why: PWA install via `beforeinstallprompt` is only reliable on Android Chrome.
 * Samsung Internet, Firefox, Opera, etc. either don't fire the event or install
 * a non-standard "WebAPK" that confuses users. We restrict the install CTA
 * to Android Chrome and show a fallback message everywhere else on Android.
 */

export type AndroidBrowserSupport =
  | "android-chrome"      // ✅ supported — show install
  | "android-other"       // ⚠️ Android but unsupported browser — show fallback
  | "not-android";        // not Android — handled by other branches (iOS / desktop)

export function detectAndroidBrowser(ua: string = navigator.userAgent): AndroidBrowserSupport {
  const lower = ua.toLowerCase();
  const isAndroid = /android/.test(lower);
  if (!isAndroid) return "not-android";

  // Order matters: Samsung/Edge/Opera/Brave all include "chrome" in UA, so exclude them first.
  const isSamsung = /samsungbrowser/.test(lower);
  const isEdge = /\bedga?\b|edg\//.test(lower);
  const isOpera = /\bopr\/|opera/.test(lower);
  const isFirefox = /firefox|fxios/.test(lower);
  const isUcBrowser = /ucbrowser/.test(lower);
  const isMiBrowser = /miuibrowser/.test(lower);
  const isHuawei = /huaweibrowser/.test(lower);

  if (isSamsung || isEdge || isOpera || isFirefox || isUcBrowser || isMiBrowser || isHuawei) {
    return "android-other";
  }

  // Real Chrome on Android has "Chrome/" and "Mobile Safari" but none of the above.
  const isChrome = /chrome\/\d+/.test(lower) && /mobile/.test(lower);
  return isChrome ? "android-chrome" : "android-other";
}

/** Build an intent:// URL that opens the current page in Chrome on Android. */
export function buildChromeIntentUrl(targetUrl: string = window.location.href): string {
  const url = new URL(targetUrl);
  // Strip protocol for intent syntax
  const stripped = `${url.host}${url.pathname}${url.search}${url.hash}`;
  return `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;end`;
}
