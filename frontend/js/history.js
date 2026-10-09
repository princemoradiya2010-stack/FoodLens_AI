document.addEventListener("DOMContentLoaded", async () => {
  const ui = window.FoodLensUI;
  const api = ui.api;
  const list = document.getElementById("history-list");
  const filter = document.getElementById("history-filter");
  const custom = document.getElementById("custom-date-filter");
  const from = document.getElementById("history-date-from");
  const to = document.getElementById("history-date-to");
  list.innerHTML = '<div class="loading-state">Loading meal history…</div>';
  let allMeals = [];

  function applyFilter() {
    const now = new Date();
    const today = ui.localDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = ui.localDateKey(yesterday);
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const results = allMeals.filter((meal) => {
      const date = new Date(meal.meal_date);
      const key = ui.localDateKey(date);
      if (filter.value === "today") return key === today;
      if (filter.value === "yesterday") return key === yesterdayKey;
      if (filter.value === "week") return date >= startOfWeek;
      if (filter.value === "month") return key >= startOfMonth;
      if (filter.value === "custom") return (!from.value || key >= from.value) && (!to.value || key <= to.value);
      return true;
    });
    list.innerHTML = results.length
      ? results.map(ui.renderMealCard).join("")
      : '<div class="empty-state-message">No meals match this time period.</div>';
  }

  filter.addEventListener("change", () => {
    custom.hidden = filter.value !== "custom";
    applyFilter();
  });
  [from, to].forEach((input) => input.addEventListener("change", applyFilter));
  await ui.bindMealDetails(list);
  try {
    const response = await api.getMeals();
    allMeals = await ui.hydrateMeals(Array.isArray(response.meals) ? response.meals : []);
    applyFilter();
  } catch (error) {
    list.innerHTML = `<div class="empty-state-message">${ui.escapeHtml(error.message)}</div>`;
    ui.showToast(error.message, "error");
  }
});