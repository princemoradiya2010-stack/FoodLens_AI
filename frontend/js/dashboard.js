document.addEventListener("DOMContentLoaded", async () => {
  const ui = window.FoodLensUI;
  const api = ui.api;
  const status = document.getElementById("backend-status");
  const greeting = document.getElementById("hero-greeting");
  const count = document.getElementById("hero-meal-count");
  const calories = document.getElementById("hero-calories");
  const model = document.getElementById("showcase-model-status");
  const progress = document.getElementById("daily-progress");
  const mealsTarget = document.getElementById("dashboard-meals");
  const insightTarget = document.getElementById("dashboard-insight");
  const hour = new Date().getHours();
  greeting.textContent = `${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"} 👋`;
  status.innerHTML = '<span class="status-dot"></span><span>Connecting to FoodLens…</span>';

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
  model.textContent = health?.model || (online ? "Connected" : "Offline");

  if (summary) {
    count.textContent = Number.isFinite(Number(summary.total_meals)) ? String(summary.total_meals) : "—";
    calories.textContent = Number.isFinite(Number(summary.total_calories))
      ? `${ui.formatNumber(summary.total_calories)} kcal` : "No data available yet";
  } else {
    count.textContent = "—";
    calories.textContent = "No data available yet";
  }
  ui.renderProgress(progress, progressResult?.progress, goalsResult?.daily_goals);

  if (mealsResult && Array.isArray(mealsResult.meals)) {
    const today = ui.localDateKey(new Date());
    const todayMeals = mealsResult.meals.filter((meal) => ui.localDateKey(meal.meal_date) === today).slice(0, 3);
    const detailed = await ui.hydrateMeals(todayMeals);
    ui.renderMealList(mealsTarget, detailed, "No meals logged today.");
  } else {
    mealsTarget.innerHTML = '<div class="empty-state-message">Today’s meals are unavailable while the backend is offline.</div>';
  }
  await ui.bindMealDetails(mealsTarget);

  const recommendations = recommendationsResult?.recommendations?.filter((item) => typeof item === "string") || [];
  insightTarget.innerHTML = recommendations.length
    ? `<article class="suggestion-card"><span class="insight-mark" aria-hidden="true">✦</span><h3>Nutrition insight</h3><p>${ui.escapeHtml(recommendations[0])}</p><a class="text-link" href="insights.html">View all insights →</a></article>`
    : `<div class="empty-state-message">${online ? "No nutrition insights are available right now." : "Nutrition insights are unavailable while the backend is offline."}</div>`;
});