/**
 * FoodLens AI - Global API & Environment Configuration
 *
 * Configures the backend URL connection for Vercel (frontend) + Render (backend).
 * 
 * Deployment Guide:
 * 1. Deploy your backend to Render.
 * 2. Copy your Render URL (e.g., https://foodlens-ai-backend.onrender.com).
 * 3. Replace RENDER_BACKEND_URL below, or configure it dynamically in browser
 *    via localStorage: localStorage.setItem("foodlens_api_url", "https://your-service.onrender.com")
 */
(() => {
  // === CONFIGURATION ===
  // When deploying to Render, put your Render service URL here:
  const RENDER_BACKEND_URL = "https://foodlens-ai-dnwx.onrender.com";

  // Local development backend URL:
  const LOCAL_BACKEND_URL = "http://127.0.0.1:8000";

  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "");

  function resolveApiUrl() {
    // 1. Check localStorage override (useful for testing different backends without code change)
    try {
      const stored = localStorage.getItem("foodlens_api_url");
      if (stored && stored.trim()) {
        return stored.trim().replace(/\/+$/, "");
      }
    } catch (_) {}

    // 2. Check window.__FOODLENS_API_URL__ injected at runtime
    if (typeof window !== "undefined" && window.__FOODLENS_API_URL__) {
      return String(window.__FOODLENS_API_URL__).trim().replace(/\/+$/, "");
    }

    // 3. Auto-detect localhost vs production Render deployment
    if (isLocal) {
      return LOCAL_BACKEND_URL;
    }

    return RENDER_BACKEND_URL.replace(/\/+$/, "");
  }

  const currentApiUrl = resolveApiUrl();

  window.FOODLENS_CONFIG = Object.freeze({
    API_URL: currentApiUrl,
    IS_LOCAL: isLocal,
    RENDER_BACKEND_URL,
    LOCAL_BACKEND_URL,
    getApiUrl: () => resolveApiUrl(),
    setApiUrl: (url) => {
      if (url && url.trim()) {
        localStorage.setItem("foodlens_api_url", url.trim().replace(/\/+$/, ""));
      } else {
        localStorage.removeItem("foodlens_api_url");
      }
      window.location.reload();
    },
    resetApiUrl: () => {
      localStorage.removeItem("foodlens_api_url");
      window.location.reload();
    }
  });

  console.info(`[FoodLens AI] API target: ${window.FOODLENS_CONFIG.API_URL} (${isLocal ? "local" : "production/remote"})`);
})();
