document.addEventListener("DOMContentLoaded", async () => {
  const ui = window.FoodLensUI;
  const api = ui.api;
  const totals = document.getElementById("today-totals");
  const list = document.getElementById("today-meals-list");
  const count = document.getElementById("today-count");

  const auth = window.FoodLensAuth;
  if (auth && !auth.isAuthenticated()) {
    const heading = document.querySelector(".page-heading");
    if (heading && !document.getElementById("visitor-today-banner")) {
      const banner = document.createElement("div");
      banner.id = "visitor-today-banner";
      banner.className = "guest-callout-card";
      banner.innerHTML = `
        <div>
          <strong>Visitor Mode · Personal Journal Locked</strong>
          <p>Sign in to record your meals, or launch Prince's live demo profile (78kg · pre-loaded with meals).</p>
        </div>
        <a href="login.html">⚡ Try Demo Profile (Prince · 78kg) →</a>
      `;
      heading.appendChild(banner);
    }
  }

  totals.innerHTML = '<div class="loading-state">Loading today’s nutrition…</div>';
  list.innerHTML = '<div class="loading-state">Loading your meals…</div>';

  const [summaryResult, mealsResult] = await Promise.allSettled([api.getTodaySummary(), api.getMeals()]);
  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const mealsResponse = mealsResult.status === "fulfilled" ? mealsResult.value : null;
  const today = ui.localDateKey(new Date());
  const meals = Array.isArray(mealsResponse?.meals)
    ? mealsResponse.meals.filter((meal) => ui.localDateKey(meal.meal_date) === today)
    : [];

  if (summary) {
    totals.innerHTML = [
      ["Calories", summary.total_calories, "kcal"],
      ["Protein", summary.total_protein, "g"],
      ["Carbohydrates", summary.total_carbs, "g"],
      ["Fat", summary.total_fat, "g"]
    ].map(([label, value, unit]) => `<article class="nutrition-card"><span class="nutrition-label">${label}</span><strong class="nutrition-value">${ui.formatNumber(value)} <small>${unit}</small></strong></article>`).join("");
  } else {
    totals.innerHTML = '<div class="empty-state-message">Today’s nutrition is unavailable. Please check the backend connection.</div>';
  }
  count.textContent = `${meals.length} ${meals.length === 1 ? "meal" : "meals"}`;
  const details = await ui.hydrateMeals(meals);
  ui.renderMealList(list, details, mealsResponse ? "No meals logged today." : "Today’s meals are unavailable.");
  await ui.bindMealDetails(list);
});