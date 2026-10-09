document.addEventListener("DOMContentLoaded", async () => {
  const ui = window.FoodLensUI;
  const api = ui.api;
  const progress = document.getElementById("insights-progress");
  const weekly = document.getElementById("weekly-nutrition");
  const recommendations = document.getElementById("recommendations-list");
  progress.innerHTML = '<div class="loading-state">Loading nutrition progress…</div>';
  weekly.innerHTML = '<div class="loading-state">Loading meal history…</div>';
  recommendations.innerHTML = '<div class="loading-state">Loading nutrition insights…</div>';
  const [progressResult, goalsResult, recommendationsResult, mealsResult] = await Promise.allSettled([
    api.getProgress(), api.getGoals(), api.getRecommendations(), api.getMeals()
  ]);
  const data = progressResult.status === "fulfilled" ? progressResult.value : null;
  const goals = goalsResult.status === "fulfilled" ? goalsResult.value : null;
  ui.renderProgress(progress, data?.progress, goals?.daily_goals);
  if (mealsResult.status === "fulfilled" && Array.isArray(mealsResult.value?.meals)) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { date, key: ui.localDateKey(date), calories: 0, protein: 0, carbs: 0, fat: 0, mealCount: 0 };
    });
    const daysByKey = new Map(days.map((day) => [day.key, day]));
    mealsResult.value.meals.forEach((meal) => {
      const day = daysByKey.get(ui.localDateKey(meal.meal_date));
      if (!day) return;
      day.mealCount += 1;
      day.calories += Number(meal.total_calories) || 0;
      day.protein += Number(meal.total_protein) || 0;
      day.carbs += Number(meal.total_carbs) || 0;
      day.fat += Number(meal.total_fat) || 0;
    });
    const hasMeals = days.some((day) => day.mealCount);
    if (hasMeals) {
      weekly.innerHTML = `<div class="weekly-nutrition-grid">${[
        ["Calories", "calories", "kcal"], ["Protein", "protein", "g"],
        ["Carbohydrates", "carbs", "g"], ["Fat", "fat", "g"]
      ].map(([label, key, unit]) => {
        const total = days.reduce((sum, day) => sum + day[key], 0);
        const peak = Math.max(...days.map((day) => day[key]), 1);
        return `<article class="nutrition-card"><span class="nutrition-label">7-day ${label.toLowerCase()}</span><strong class="nutrition-value">${ui.formatNumber(total)} <small>${unit}</small></strong><div class="weekly-bars" aria-label="Daily ${label.toLowerCase()} totals for the last seven days">${days.map((day) => `<span style="height:${day[key] ? Math.max(day[key] / peak * 100, 4) : 0}%" title="${day.date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}: ${ui.formatNumber(day[key])} ${unit}"></span>`).join("")}</div><div class="weekly-day-labels">${days.map((day) => `<span>${day.date.toLocaleDateString([], { weekday: "narrow" })}</span>`).join("")}</div></article>`;
      }).join("")}</div><p class="settings-note">Totals reflect meals saved over the last seven calendar days. Empty days represent no saved meals.</p>`;
    } else {
      weekly.innerHTML = '<div class="empty-state-message">No meal history is available for the last seven days yet.</div>';
    }
  } else {
    weekly.innerHTML = '<div class="empty-state-message">Weekly nutrition is unavailable while meal history cannot be loaded.</div>';
  }
  const items = recommendationsResult.status === "fulfilled"
    ? recommendationsResult.value?.recommendations?.filter((item) => typeof item === "string" && item.trim()) || []
    : [];
  recommendations.innerHTML = items.length
    ? items.map((item) => `<article class="suggestion-card"><span class="insight-mark" aria-hidden="true">✦</span><h3>Nutrition insight</h3><p>${ui.escapeHtml(item)}</p></article>`).join("")
    : `<div class="empty-state-message">${recommendationsResult.status === "fulfilled" ? "No nutrition recommendations are available right now." : "Nutrition recommendations are unavailable while the backend is offline."}</div>`;
});