document.addEventListener("DOMContentLoaded", () => {
  const ui = window.FoodLensUI;
  const api = window.FoodLensAPI;
  const auth = window.FoodLensAuth;

  // Tabs
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const paneLogin = document.getElementById("pane-login");
  const paneRegister = document.getElementById("pane-register");
  const authTitle = document.getElementById("auth-title");
  const authSubtitle = document.getElementById("auth-subtitle");

  // Forms
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const demoLoginBtn = document.getElementById("demo-login-btn");

  // Register inputs for live preview
  const regWeight = document.getElementById("reg-weight");
  const regHeight = document.getElementById("reg-height");
  const regAge = document.getElementById("reg-age");
  const regGender = document.getElementById("reg-gender");
  const regActivity = document.getElementById("reg-activity");
  const goalCards = document.querySelectorAll(".goal-option-card");

  // Live preview targets
  const previewCalories = document.getElementById("preview-calories");
  const previewProtein = document.getElementById("preview-protein");
  const previewCarbs = document.getElementById("preview-carbs");
  const previewFat = document.getElementById("preview-fat");
  const previewWater = document.getElementById("preview-water");

  function switchTab(tab) {
    if (tab === "register") {
      tabRegister.classList.add("active");
      tabRegister.setAttribute("aria-selected", "true");
      tabLogin.classList.remove("active");
      tabLogin.setAttribute("aria-selected", "false");
      paneLogin.style.display = "none";
      paneRegister.style.display = "block";
      authTitle.textContent = "Personalized Goal Setup";
      authSubtitle.textContent = "Tell us your current weight and goal to calculate your ideal macro targets.";
      updateLivePreview();
    } else {
      tabLogin.classList.add("active");
      tabLogin.setAttribute("aria-selected", "true");
      tabRegister.classList.remove("active");
      tabRegister.setAttribute("aria-selected", "false");
      paneLogin.style.display = "block";
      paneRegister.style.display = "none";
      authTitle.textContent = "Welcome to FoodLens AI";
      authSubtitle.textContent = "Sign in to sync your meals or manage your nutrition targets.";
    }
  }

  tabLogin.addEventListener("click", () => switchTab("login"));
  tabRegister.addEventListener("click", () => switchTab("register"));

  // Check URL query parameters (e.g. ?mode=register)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("mode") === "register") {
    switchTab("register");
  }

  // Goal radio styling
  goalCards.forEach((card) => {
    card.addEventListener("click", () => {
      goalCards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      updateLivePreview();
    });
  });

  // Client-side instant Mifflin-St Jeor calculation for smooth zero-lag UI
  function updateLivePreview() {
    const weight = Math.max(30, Number(regWeight?.value) || 70);
    const height = Math.max(80, Number(regHeight?.value) || 172);
    const age = Math.max(14, Number(regAge?.value) || 25);
    const gender = regGender?.value || "male";
    const activity = regActivity?.value || "moderate";

    const selectedRadio = document.querySelector('input[name="reg-goal"]:checked');
    const goal = selectedRadio ? selectedRadio.value : "weight_loss";

    // Mifflin-St Jeor
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr += (gender === "female" ? -161 : 5);

    const mults = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };
    const tdee = bmr * (mults[activity] || 1.55);

    let calories, protein, fat, carbs;
    if (goal === "weight_loss") {
      calories = Math.max(1200, Math.round(tdee - 500));
      protein = Math.round(weight * 2.0);
      fat = Math.round((calories * 0.25) / 9);
      carbs = Math.max(50, Math.round((calories - (protein * 4) - (fat * 9)) / 4));
    } else if (goal === "weight_gain") {
      calories = Math.round(tdee + 450);
      protein = Math.round(weight * 1.8);
      fat = Math.round((calories * 0.25) / 9);
      carbs = Math.max(80, Math.round((calories - (protein * 4) - (fat * 9)) / 4));
    } else {
      calories = Math.round(tdee);
      protein = Math.round(weight * 1.5);
      fat = Math.round((calories * 0.28) / 9);
      carbs = Math.max(60, Math.round((calories - (protein * 4) - (fat * 9)) / 4));
    }

    const water = (weight * 0.035).toFixed(1);

    if (previewCalories) previewCalories.textContent = `~${calories.toLocaleString()} kcal / day`;
    if (previewProtein) previewProtein.innerHTML = `Protein: <strong>${protein}g</strong>`;
    if (previewCarbs) previewCarbs.innerHTML = `Carbs: <strong>${carbs}g</strong>`;
    if (previewFat) previewFat.innerHTML = `Fat: <strong>${fat}g</strong>`;
    if (previewWater) previewWater.innerHTML = `Water: <strong>${water}L</strong>`;
  }

  [regWeight, regHeight, regAge, regGender, regActivity].forEach((el) => {
    if (el) {
      el.addEventListener("input", updateLivePreview);
      el.addEventListener("change", updateLivePreview);
    }
  });

  // Handle Login Submission
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("login-submit-btn");
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;

    if (!username || !password) {
      ui.showToast("Please enter both username and password.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>Signing in…</span>";

    try {
      const res = await api.login({ username_or_email: username, password });
      auth.saveAuth(res.token, res.user, res.targets);
      ui.showToast(`Welcome back, ${res.user.username}!`, "success");
      window.setTimeout(() => {
        window.location.href = "profile.html";
      }, 500);
    } catch (err) {
      ui.showToast(err.message, "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = "<span>Sign In to FoodLens</span>";
    }
  });

  // Handle Register Submission
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("register-submit-btn");

    const username = document.getElementById("reg-username").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const weight = Number(regWeight.value) || 70;
    const height = Number(regHeight.value) || 172;
    const age = Number(regAge.value) || 25;
    const gender = regGender.value;
    const activity_level = regActivity.value;

    const selectedRadio = document.querySelector('input[name="reg-goal"]:checked');
    const goal = selectedRadio ? selectedRadio.value : "weight_loss";

    if (!username || !email || !password) {
      ui.showToast("Please fill out all required fields.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = "<span>Calculating targets & saving…</span>";

    try {
      const res = await api.register({
        username,
        email,
        password,
        weight,
        height,
        age,
        gender,
        activity_level,
        goal
      });

      auth.saveAuth(res.token, res.user, res.targets);
      ui.showToast("Account created! Personalized nutrition goals initialized.", "success");
      window.setTimeout(() => {
        window.location.href = "profile.html";
      }, 500);
    } catch (err) {
      ui.showToast(err.message, "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = "<span>Create Account &amp; Set Targets</span>";
    }
  });

  // Demo Login Quick-Action (Prince · 78kg · Stable Weight)
  demoLoginBtn.addEventListener("click", async () => {
    demoLoginBtn.disabled = true;
    demoLoginBtn.textContent = "Logging into Prince's profile…";

    const demoUser = "prince";
    const demoPass = "password123";

    try {
      // Try login first
      const res = await api.login({ username_or_email: demoUser, password: demoPass });
      auth.saveAuth(res.token, res.user, res.targets);
      ui.showToast("Logged in as Prince (78kg · Stable Weight)!", "success");
      window.setTimeout(() => { window.location.href = "profile.html"; }, 400);
    } catch {
      // If demo user doesn't exist yet, auto-register it
      try {
        const regRes = await api.register({
          username: demoUser,
          email: "prince@foodlens.ai",
          password: demoPass,
          weight: 78.0,
          height: 179.0,
          age: 20,
          gender: "male",
          activity_level: "moderate",
          goal: "maintenance"
        });
        auth.saveAuth(regRes.token, regRes.user, regRes.targets);
        ui.showToast("Demo profile created & logged in!", "success");
        window.setTimeout(() => { window.location.href = "profile.html"; }, 400);
      } catch (err) {
        ui.showToast("Demo login failed: " + err.message, "error");
        demoLoginBtn.disabled = false;
        demoLoginBtn.textContent = "⚡ Try Demo User (Prince · 78 kg · Stable Weight)";
      }
    }
  });

  // Initialize preview
  updateLivePreview();
});
