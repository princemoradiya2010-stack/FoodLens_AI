document.addEventListener("DOMContentLoaded", async () => {
  const ui = window.FoodLensUI;
  const target = document.getElementById("goals-list");
  target.innerHTML = '<div class="loading-state">Loading your nutrition goals…</div>';
  try {
    const response = await ui.api.getGoals();
    const goals = response?.daily_goals;
    if (!goals || typeof goals !== "object") throw new Error("Nutrition goals are not available.");
    const labels = [
      ["calories", "Daily calories", "kcal"],
      ["protein", "Daily protein", "g"],
      ["carbs", "Daily carbohydrates", "g"],
      ["fat", "Daily fat", "g"]
    ];
    target.innerHTML = labels.filter(([key]) => Number.isFinite(Number(goals[key])))
      .map(([key, label, unit]) => `<article class="nutrition-card goal-card"><span class="nutrition-label">${label}</span><strong class="nutrition-value">${ui.formatNumber(goals[key])} <small>${unit}</small></strong><span class="goal-readonly">Backend goal · read only</span></article>`).join("")
      || '<div class="empty-state-message">No daily goals are configured.</div>';
  } catch (error) {
    target.innerHTML = `<div class="empty-state-message">${ui.escapeHtml(error.message)}</div>`;
    ui.showToast(error.message, "error");
  }
});