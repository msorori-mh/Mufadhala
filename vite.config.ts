import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      // Disable in dev to avoid stale caches inside Lovable preview iframe
      devOptions: {
        enabled: false,
      },
      includeAssets: [
        "favicon.ico",
        "icon-192.png",
        "icon-512.png",
        "fonts/*.woff2",
      ],
      manifest: {
        name: "مُفَاضَلَة | Mufadhala",
        short_name: "مُفَاضَلَة",
        description: "منصتك الذكية للتحضير لاختبارات القبول الجامعي في اليمن",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#1A237E",
        theme_color: "#1A237E",
        dir: "rtl",
        lang: "ar",
        categories: ["education"],
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Never cache OAuth or admin auth flows
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/~oauth/,
          /^\/admin-login/,
          /^\/admin-reset-password/,
          /^\/api\//,
        ],
        // Allow larger bundles to be precached (Cairo font + chunks)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // Supabase API calls — always network first, fall back if offline
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Fonts (self-hosted Cairo)
            urlPattern: /\.(?:woff2?|ttf|otf)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "font-cache",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Images
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
