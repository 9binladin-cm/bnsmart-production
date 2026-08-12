// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        // The guarded wrapper in src/lib/pwa.ts is the only registrar.
        injectRegister: null,
        filename: "sw.js",
        outDir: "dist/client",
        devOptions: { enabled: false },
        includeAssets: [
          "favicon.png",
          "apple-touch-icon.png",
          "offline.html",
          "dayneramit-logo.jpg",
        ],
        manifest: {
          name: "Day Neramit — Smart Repair & Renovation",
          short_name: "DayNeramit",
          description: "ระบบ Booking, Site Survey, JOB, เอกสาร, ต้นทุน และ AI Engineering",
          id: "/",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "any",
          background_color: "#050505",
          theme_color: "#050505",
          lang: "th",
          categories: ["business", "productivity", "utilities"],
          icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            {
              src: "/pwa-maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,jpg,ico,woff2}"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: "/offline.html",
          navigateFallbackDenylist: [
            /^\/~oauth/,
            /^\/api\//,
            /_serverFn/,
            /^\/sitemap\.xml$/,
            /^\/robots\.txt$/,
          ],
          runtimeCaching: [
            {
              // HTML navigations must always try the network first.
              urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "dayneramit-pages",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              urlPattern: ({ sameOrigin, request }: { sameOrigin: boolean; request: Request }) =>
                sameOrigin && ["style", "script", "worker", "font"].includes(request.destination),
              handler: "StaleWhileRevalidate",
              options: { cacheName: "dayneramit-assets" },
            },
            {
              urlPattern: ({ sameOrigin, request }: { sameOrigin: boolean; request: Request }) =>
                sameOrigin && request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "dayneramit-images",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "dayneramit-google-fonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  },
});
