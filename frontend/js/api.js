(() => {
  function getBaseUrl() {
    return (window.FOODLENS_CONFIG && window.FOODLENS_CONFIG.getApiUrl && window.FOODLENS_CONFIG.getApiUrl()) ||
           (window.FOODLENS_CONFIG && window.FOODLENS_CONFIG.API_URL) ||
           "http://127.0.0.1:8000";
  }

  function getAuthToken() {
    try {
      return localStorage.getItem("foodlens_token") || null;
    } catch {
      return null;
    }
  }

  async function request(path, options = {}) {
    const baseUrl = getBaseUrl();
    const headers = new Headers(options.headers || {});

    // Automatically inject auth header if available and not already provided
    const token = getAuthToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const fetchOptions = {
      ...options,
      headers
    };

    let response;
    try {
      response = await fetch(`${baseUrl}${path}`, fetchOptions);
    } catch (error) {
      const isRemote = !baseUrl.includes("127.0.0.1") && !baseUrl.includes("localhost");
      const hint = isRemote
        ? " (If hosted on Render free tier, the server may take up to 45s to wake up on first request.)"
        : "";
      throw new Error(`Unable to connect to FoodLens backend at ${baseUrl}.${hint}`);
    }

    let payload;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    if (!response.ok) {
      const detail = typeof payload === "string" ? payload : payload?.detail || payload?.error;
      throw new Error(typeof detail === "string" ? detail : `FoodLens request failed (${response.status}).`);
    }
    if (payload && typeof payload === "object" && payload.error) {
      throw new Error(String(payload.error));
    }
    return payload;
  }

  window.FoodLensAPI = Object.freeze({
    request: (path, options) => request(path, options),
    getHealth: () => request("/health"),
    predictFood: (file) => {
      const body = new FormData();
      body.append("file", file);
      return request("/predict", { method: "POST", body });
    },
    saveMeal: (meal) => request("/save-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meal)
    }),
    getMeals: () => request("/meals"),
    getMeal: (mealId) => request(`/meals/${encodeURIComponent(mealId)}`),
    getTodaySummary: () => request("/summary/today"),
    getProgress: () => request("/summary/progress"),
    getGoals: () => request("/goals"),
    getRecommendations: () => request("/recommendations/today"),

    // Auth & Nutrition Target endpoints
    register: (userData) => request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData)
    }),
    login: (credentials) => request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials)
    }),
    getMe: () => request("/auth/me"),
    updateProfile: (profileData) => request("/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData)
    }),
    calculateTargets: (metrics) => request("/nutrition/calculate-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metrics)
    })
  });
})();