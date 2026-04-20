import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// --- PWA service worker registration (production only, never in iframe / Lovable preview) ---
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (isPreviewHost || isInIframe) {
  // Always clear any stale SW in preview/iframe contexts
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
} else if (import.meta.env.PROD && "serviceWorker" in navigator) {
  // Dynamic import so dev builds never touch virtual:pwa-register
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      /* PWA plugin not active — safe to ignore */
    });
}

createRoot(document.getElementById("root")!).render(<App />);
