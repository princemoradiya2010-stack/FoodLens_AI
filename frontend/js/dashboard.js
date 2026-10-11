document.addEventListener("DOMContentLoaded", async () => {
  const ui = window.FoodLensUI;
  const api = ui.api;
  const auth = window.FoodLensAuth;

  const status = document.getElementById("backend-status");
  const greeting = document.getElementById("hero-greeting");
  const count = document.getElementById("hero-meal-count");
  const calories = document.getElementById("hero-calories");
  const model = document.getElementById("showcase-model-status");
  const progress = document.getElementById("daily-progress");
  const mealsTarget = document.getElementById("dashboard-meals");
  const insightTarget = document.getElementById("dashboard-insight");

  const visitorView = document.getElementById("visitor-view");
  const userDashboardView = document.getElementById("user-dashboard-view");
  const heroSecondaryBtn = document.getElementById("hero-secondary-btn");
  const visitorDemoBtn = document.getElementById("visitor-launch-demo-btn");

  const isUserLoggedIn = auth && auth.isAuthenticated && auth.isAuthenticated();
  const user = isUserLoggedIn ? auth.getUser() : null;

  // Toggle Visitor Information vs Personal Dashboard
  if (!isUserLoggedIn) {
    if (visitorView) visitorView.style.display = "block";
    if (userDashboardView) userDashboardView.style.display = "none";
    if (greeting) greeting.textContent = "Welcome to FoodLens AI 👋";
    if (heroSecondaryBtn) {
      heroSecondaryBtn.textContent = "Sign In / Register";
      heroSecondaryBtn.setAttribute("href", "login.html");
    }
  } else {
    if (visitorView) visitorView.style.display = "none";
    if (userDashboardView) userDashboardView.style.display = "block";

    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const goalTitle = user?.goal
      ? (user.goal === "weight_gain" ? "Weight Gain" : user.goal === "weight_loss" ? "Weight Loss" : "Stable Weight")
      : "";

    if (greeting) {
      greeting.textContent = `${timeGreeting}, ${user.username} ${goalTitle ? `· ${goalTitle}` : ""} 👋`;
    }
    if (heroSecondaryBtn) {
      heroSecondaryBtn.textContent = "View Today's Meals";
      heroSecondaryBtn.setAttribute("href", "today.html");
    }
  }

  // Handle 1-Click Visitor Demo Login (Prince · 78kg · Stable Weight)
  if (visitorDemoBtn) {
    visitorDemoBtn.addEventListener("click", async () => {
      visitorDemoBtn.disabled = true;
      visitorDemoBtn.textContent = "Launching Demo Profile…";

      const demoUser = "prince";
      const demoPass = "password123";

      try {
        const res = await api.login({ username_or_email: demoUser, password: demoPass });
        auth.saveAuth(res.token, res.user, res.targets);
        ui.showToast("Logged in as Prince (78kg · Stable Weight)! 7-day history unlocked.", "success");
        window.setTimeout(() => { window.location.reload(); }, 350);
      } catch {
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
          ui.showToast("Prince's demo account initialized & logged in!", "success");
          window.setTimeout(() => { window.location.reload(); }, 350);
        } catch (err) {
          ui.showToast("Demo login failed: " + err.message, "error");
          visitorDemoBtn.disabled = false;
          visitorDemoBtn.textContent = "⚡ Instant Demo Login (78kg)";
        }
      }
    });
  }

  status.innerHTML = '<span class="status-dot"></span><span>Connecting to FoodLens…</span>';

  // Fetch backend data
  const results = await Promise.allSettled([
    api.getHealth(), api.getTodaySummary(), api.getProgress(), api.getGoals(),
    api.getMeals(), api.getRecommendations()
  ]);
  const [health, summary, progressResult, goalsResult, mealsResult, recommendationsResult] = results.map((result) =>
    result.status === "fulfilled" ? result.value : null
  );

  const online = Boolean(health);
  status.classList.toggle("offline", !online);
  status.innerHTML = `<span class="status-dot"></span><span>${online ? "AI Server Connected" : "AI Server Offline"}</span>`;
  if (model) model.textContent = health?.model || (online ? "Connected" : "Offline");

  if (summary) {
    if (count) count.textContent = Number.isFinite(Number(summary.total_meals)) ? String(summary.total_meals) : "—";
    if (calories) {
      calories.textContent = Number.isFinite(Number(summary.total_calories))
        ? `${ui.formatNumber(summary.total_calories)} kcal` : "No data available yet";
    }
  } else {
    if (count) count.textContent = "—";
    if (calories) calories.textContent = "No data available yet";
  }

  // If user is logged in, render the personalized dashboard cards
  if (isUserLoggedIn) {
    ui.renderProgress(progress, progressResult?.progress, goalsResult?.daily_goals);

    if (mealsResult && Array.isArray(mealsResult.meals)) {
      const today = ui.localDateKey(new Date());
      const todayMeals = mealsResult.meals.filter((meal) => ui.localDateKey(meal.meal_date) === today).slice(0, 3);
      const detailed = await ui.hydrateMeals(todayMeals);
      ui.renderMealList(mealsTarget, detailed, "No meals logged today.");
    } else {
      if (mealsTarget) {
        mealsTarget.innerHTML = '<div class="empty-state-message">Today’s meals are unavailable while the backend is offline.</div>';
      }
    }
    await ui.bindMealDetails(mealsTarget);

    const recommendations = recommendationsResult?.recommendations?.filter((item) => typeof item === "string") || [];
    const goalName = recommendationsResult?.goal ? recommendationsResult.goal.replace('_', ' ') : 'Nutrition';

    if (insightTarget) {
      insightTarget.innerHTML = recommendations.length
        ? `<article class="suggestion-card"><span class="insight-mark" aria-hidden="true">✦</span><h3>Goal Guidance · ${ui.escapeHtml(ui.capitalize(goalName))}</h3><p>${ui.escapeHtml(recommendations[0])}</p><a class="text-link" href="insights.html">View all weekly insights →</a></article>`
        : `<div class="empty-state-message">${online ? "No nutrition insights are available right now." : "Nutrition insights are unavailable while the backend is offline."}</div>`;
    }
  }
});