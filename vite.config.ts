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
      injectRegister: false, // we register manually with iframe/preview guards
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon-192.png", "icon-512.png"],
      manifest: false, // we ship our own /public/manifest.webmanifest
      devOptions: {
        enabled: false, // never run SW in dev / Lovable preview
      },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/, /^\/auth/, /^\/reset-password/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        cleanupOutdatedCaches: true,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
