(() => {
  const api = window.FoodLensAPI;
  const toastRegion = document.getElementById("toast-region");

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function formatNumber(value, digits = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return number.toFixed(number % 1 === 0 ? 0 : digits);
  }

  function hasNumber(value) {
    return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
  }

  function localDateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatMealDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function showToast(message, kind = "info") {
    if (!toastRegion) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${kind}`;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }

  function renderProgress(target, progress, goals) {
    if (!target) return;
    const nutrients = [
      ["calories", "Calories", "kcal", "◉"],
      ["protein", "Protein", "g", "↗"],
      ["carbs", "Carbohydrates", "g", "◇"],
      ["fat", "Fat", "g", "◌"]
    ];
    target.innerHTML = nutrients.map(([key, label, unit, icon]) => {
      const current = hasNumber(progress?.[key]?.current) ? Number(progress[key].current) : null;
      const goalValue = progress?.[key]?.goal ?? goals?.[key];
      const goal = hasNumber(goalValue) ? Number(goalValue) : null;
      const percentValue = progress?.[key]?.percentage;
      const percent = hasNumber(percentValue)
        ? Number(percentValue)
        : current !== null && goal > 0 ? current / goal * 100 : null;
      const currentText = current === null ? "No data available yet" : `${formatNumber(current)}${key === "calories" ? "" : ` ${unit}`}`;
      const goalText = goal === null ? "" : ` <span>/ ${formatNumber(goal)} ${unit}</span>`;
      return `<article class="daily-card daily-card-${key}">
        <div class="daily-card-heading"><span class="daily-icon" aria-hidden="true">${icon}</span>${label}</div>
        <div class="daily-card-value">${currentText}${goalText}</div>
        <div class="progress-track" role="progressbar" aria-label="${label} daily goal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent === null ? 0 : Math.round(percent)}"><span class="progress-fill" style="width:${percent === null ? 0 : Math.min(Math.max(percent, 0), 100)}%"></span></div>
        <span class="daily-card-caption">${percent === null ? (goal === null ? "Daily goal unavailable" : "Progress unavailable") : `${formatNumber(percent)}% of daily goal`}</span>
      </article>`;
    }).join("");
  }

  function renderMealCard(meal, index = 0) {
    const foods = Array.isArray(meal.items) ? meal.items : [];
    const foodsText = foods.length
      ? foods.map((item) => `${escapeHtml(item.food_name)} × ${formatNumber(item.quantity)}`).join(" · ")
      : meal.itemsLoading ? "Loading food details…" : "Food details unavailable";
    return `<button class="history-card history-card-button" type="button" data-meal-id="${Number(meal.id)}" aria-label="View ${escapeHtml(meal.meal_type || "meal")} details">
      <span class="history-timeline-dot" aria-hidden="true"></span>
      <span class="history-header"><strong>${escapeHtml(capitalize(meal.meal_type || "meal"))}</strong><span class="history-meta">${escapeHtml(formatMealDate(meal.meal_date))}</span></span>
      <span class="history-foods">${foodsText}</span>
      <span class="history-card-totals"><strong>${formatNumber(meal.total_calories)} kcal</strong><span>${formatNumber(meal.total_protein)} g protein</span></span>
    </button>`;
  }

  function capitalize(value) {
    return String(value || "").replace(/\b[a-z]/g, (character) => character.toUpperCase());
  }

  function renderMealList(target, meals, emptyMessage) {
    if (!target) return;
    target.innerHTML = meals.length
      ? meals.map(renderMealCard).join("")
      : `<div class="empty-state-message">${escapeHtml(emptyMessage)}<a class="empty-state-link" href="scan.html">Scan a meal →</a></div>`;
  }

  async function hydrateMeals(meals) {
    const detailedMeals = await Promise.all(meals.map(async (meal) => {
      try {
        const detail = await api.getMeal(meal.id);
        return { ...meal, items: Array.isArray(detail.items) ? detail.items : [], itemsLoading: false };
      } catch (error) {
        return { ...meal, items: [], itemsLoading: false, detailsError: error.message };
      }
    }));
    return detailedMeals;
  }

  async function bindMealDetails(list) {
    if (!list) return;
    list.addEventListener("click", async (event) => {
      const card = event.target.closest("[data-meal-id]");
      if (!card) return;
      const dialog = document.getElementById("meal-modal");
      if (!dialog) return;
      dialog.classList.remove("hidden");
      dialog.setAttribute("aria-hidden", "false");
      const title = document.getElementById("meal-modal-title");
      const date = document.getElementById("meal-modal-date");
      const foods = document.getElementById("meal-modal-foods");
      const nutrition = document.getElementById("meal-modal-nutrition");
      title.textContent = "Meal details";
      foods.textContent = "Loading meal details…";
      nutrition.replaceChildren();
      try {
        const meal = await api.getMeal(card.dataset.mealId);
        if (meal.error) throw new Error(meal.error);
        title.textContent = `${capitalize(meal.meal_type || "meal")} details`;
        date.textContent = formatMealDate(meal.meal_date);
        foods.innerHTML = Array.isArray(meal.items) && meal.items.length
          ? meal.items.map((item) => `<div class="meal-modal-food"><span>${escapeHtml(capitalize(item.food_name))}</span><strong>× ${formatNumber(item.quantity)}</strong></div>`).join("")
          : "Food details are not available for this meal.";
        nutrition.innerHTML = [
          ["Calories", `${formatNumber(meal.total_calories)} kcal`],
          ["Protein", `${formatNumber(meal.total_protein)} g`],
          ["Carbohydrates", `${formatNumber(meal.total_carbs)} g`],
          ["Fat", `${formatNumber(meal.total_fat)} g`]
        ].map(([label, value]) => `<div class="info-box"><span>${label}</span><strong>${value}</strong></div>`).join("");
      } catch (error) {
        foods.textContent = "Unable to load meal details. Please try again.";
        showToast(error.message, "error");
      }
    });
  }

  function bindNavigation() {
    const toggle = document.querySelector(".nav-toggle");
    const menu = document.querySelector(".nav-menu");
    toggle?.addEventListener("click", () => {
      const expanded = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(expanded));
    });
    menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      toggle?.setAttribute("aria-expanded", "false");
    }));
    const page = document.body.dataset.page;
    document.querySelectorAll(".nav-menu a").forEach((link) => {
      if (link.dataset.page === page) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
    });
    if (page === "profile") document.querySelector(".nav-actions .profile-button")?.classList.add("active");
    const date = document.getElementById("today-date");
    if (date) date.textContent = new Date().toLocaleDateString([], { month: "short", day: "numeric" });
    document.querySelectorAll("[data-close-meal-modal], #meal-modal .modal-close").forEach((button) => {
      button.addEventListener("click", () => {
        const dialog = document.getElementById("meal-modal");
        dialog?.classList.add("hidden");
        dialog?.setAttribute("aria-hidden", "true");
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const dialog = document.getElementById("meal-modal");
        dialog?.classList.add("hidden");
        dialog?.setAttribute("aria-hidden", "true");
      }
    });
  }

  window.FoodLensUI = Object.freeze({
    api, escapeHtml, formatNumber, hasNumber, localDateKey, formatMealDate, showToast,
    renderProgress, renderMealCard, renderMealList, hydrateMeals, bindMealDetails, capitalize
  });
  document.addEventListener("DOMContentLoaded", bindNavigation);
})();