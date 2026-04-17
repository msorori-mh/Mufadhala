import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";

// CRITICAL: Detect recovery session BEFORE Supabase strips the hash
(() => {
  const hash = window.location.hash;
  if (hash && hash.includes("type=recovery")) {
    sessionStorage.setItem("supabase_recovery_mode", "true");
  }
})();

// PWA: Guard service worker — never register inside Lovable preview iframe
(() => {
  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.app") && host.includes("id-preview");

  if (isInIframe || isPreviewHost) {
    // Clean up any previously-registered SW in preview/iframe contexts
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).catch(() => {});
    }
  } else if ("serviceWorker" in navigator) {
    // Production: register the auto-generated SW from vite-plugin-pwa
    import("virtual:pwa-register")
      .then(({ registerSW }) => {
        registerSW({ immediate: true });
      })
      .catch(() => {
        // virtual module not available in dev — safe to ignore
      });
  }
})();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="mufadhala-theme">
    <App />
  </ThemeProvider>
);
