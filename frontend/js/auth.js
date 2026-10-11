/**
 * FoodLens AI - Authentication & Session Manager
 */
(() => {
  const TOKEN_KEY = "foodlens_token";
  const USER_KEY = "foodlens_user";
  const TARGETS_KEY = "foodlens_targets";

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  }

  function getUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function getTargets() {
    try {
      const data = localStorage.getItem(TARGETS_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function isAuthenticated() {
    return Boolean(getToken());
  }

  function saveAuth(token, user, targets) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      if (targets) localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
      window.dispatchEvent(new CustomEvent("foodlens:auth-changed", { detail: { user, targets } }));
      updateNavigation();
    } catch (err) {
      console.warn("Failed to persist auth state in localStorage", err);
    }
  }

  function clearAuth() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TARGETS_KEY);
      window.dispatchEvent(new CustomEvent("foodlens:auth-changed", { detail: { user: null } }));
      updateNavigation();
    } catch (err) {
      console.warn("Failed to clear auth state", err);
    }
  }

  function logout(redirect = true) {
    clearAuth();
    if (window.FoodLensUI && window.FoodLensUI.showToast) {
      window.FoodLensUI.showToast("Signed out successfully.", "info");
    }
    if (redirect) {
      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 350);
    }
  }

  async function syncCurrentUser() {
    if (!isAuthenticated()) return null;
    try {
      if (!window.FoodLensAPI || !window.FoodLensAPI.getMe) return getUser();
      const res = await window.FoodLensAPI.getMe();
      if (res && res.user) {
        saveAuth(getToken(), res.user, res.targets);
        return res.user;
      }
    } catch (err) {
      // If token expired (401), clean up
      if (String(err).includes("401") || String(err).includes("Authentication required")) {
        clearAuth();
      }
    }
    return getUser();
  }

  function updateNavigation() {
    const navActions = document.querySelector(".nav-actions");
    if (!navActions) return;

    const user = getUser();
    const existingAuthBtn = navActions.querySelector(".nav-auth-item");
    if (existingAuthBtn) existingAuthBtn.remove();

    const profileBtn = navActions.querySelector(".profile-button");

    if (user && user.username) {
      const initial = (user.username.trim()[0] || "U").toUpperCase();
      if (profileBtn) {
        profileBtn.textContent = initial;
        profileBtn.setAttribute("title", `Signed in as ${user.username} (${user.goal ? user.goal.replace('_', ' ') : 'profile'})`);
        profileBtn.setAttribute("aria-label", `User Profile - ${user.username}`);
        profileBtn.classList.add("profile-logged-in");
      }

      // If on hero section, optionally customize greeting
      const greeting = document.getElementById("hero-greeting");
      if (greeting) {
        greeting.textContent = `Welcome back, ${user.username}`;
      }
    } else {
      if (profileBtn) {
        profileBtn.textContent = "F";
        profileBtn.setAttribute("title", "Sign In / Profile");
        profileBtn.classList.remove("profile-logged-in");
      }
      // Insert sleek "Sign In" link before profile button if on desktop
      const signInLink = document.createElement("a");
      signInLink.className = "nav-auth-item nav-signin-btn";
      signInLink.href = "login.html";
      signInLink.innerHTML = "<span>Sign In</span>";
      navActions.insertBefore(signInLink, profileBtn);
    }
  }

  window.FoodLensAuth = Object.freeze({
    getToken,
    getUser,
    getTargets,
    isAuthenticated,
    saveAuth,
    clearAuth,
    logout,
    syncCurrentUser,
    updateNavigation
  });

  document.addEventListener("DOMContentLoaded", () => {
    updateNavigation();
    if (isAuthenticated()) {
      syncCurrentUser();
    }
  });
})();
