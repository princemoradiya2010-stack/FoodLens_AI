document.addEventListener("DOMContentLoaded", async () => {
  const ui = window.FoodLensUI;
  const api = ui.api;
  const list = document.getElementById("history-list");
  const filter = document.getElementById("history-filter");
  const custom = document.getElementById("custom-date-filter");
  const from = document.getElementById("history-date-from");
  const to = document.getElementById("history-date-to");

  if (list) {
    list.innerHTML = '<div class="loading-state">Loading meal history…</div>';
  }

  let allMeals = [];

  function applyFilter() {
    if (!list) return;
    const now = new Date();
    const today = ui.localDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = ui.localDateKey(yesterday);
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const filterVal = filter ? filter.value : "all";
    const fromVal = from ? from.value : "";
    const toVal = to ? to.value : "";

    const results = allMeals.filter((meal) => {
      const date = new Date(meal.meal_date);
      const key = ui.localDateKey(date);
      if (filterVal === "today") return key === today;
      if (filterVal === "yesterday") return key === yesterdayKey;
      if (filterVal === "week") return date >= startOfWeek;
      if (filterVal === "month") return key >= startOfMonth;
      if (filterVal === "custom") return (!fromVal || key >= fromVal) && (!toVal || key <= toVal);
      return true;
    });

    list.innerHTML = results.length
      ? results.map(ui.renderMealCard).join("")
      : '<div class="empty-state-message">No meals match this time period.</div>';
  }

  if (filter) {
    filter.addEventListener("change", () => {
      if (custom) custom.hidden = filter.value !== "custom";
      applyFilter();
    });
  }

  [from, to].filter(Boolean).forEach((input) => {
    input.addEventListener("change", applyFilter);
  });

  if (list) {
    await ui.bindMealDetails(list);
  }

  try {
    const response = await api.getMeals();
    const rawMeals = Array.isArray(response?.meals) ? response.meals : [];
    allMeals = await ui.hydrateMeals(rawMeals);
    applyFilter();
  } catch (error) {
    if (list) {
      list.innerHTML = `<div class="empty-state-message">${ui.escapeHtml(error.message || "Failed to load meal history.")}</div>`;
    }
    ui.showToast(error.message || "Failed to load meals", "error");
  }
});