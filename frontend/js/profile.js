document.addEventListener("DOMContentLoaded", async () => {
  const ui = window.FoodLensUI;
  const api = window.FoodLensAPI;
  const auth = window.FoodLensAuth;

  const authBanner = document.getElementById("profile-auth-status");
  const targetList = document.getElementById("goals-list");
  const strategyContent = document.getElementById("strategy-content");
  const customizerForm = document.getElementById("profile-customizer-form");

  const inputWeight = document.getElementById("prof-weight");
  const inputGoal = document.getElementById("prof-goal");
  const inputActivity = document.getElementById("prof-activity");
  const inputHeight = document.getElementById("prof-height");
  const inputAge = document.getElementById("prof-age");
  const inputGender = document.getElementById("prof-gender");
  const saveBtn = document.getElementById("save-targets-btn");

  function getGoalBadgeInfo(goal) {
    if (goal === "weight_gain") {
      return { icon: "📈", label: "Weight Gain (Caloric Surplus)", color: "#1f6b4f" };
    } else if (goal === "maintenance") {
      return { icon: "⚖️", label: "Maintenance (Energy Balance)", color: "#2da774" };
    }
    return { icon: "📉", label: "Weight Loss (Caloric Deficit)", color: "#1f6b4f" };
  }

  function renderAuthBanner() {
    const user = auth.getUser();
    if (user && user.username) {
      const initial = (user.username.trim()[0] || "U").toUpperCase();
      const badge = getGoalBadgeInfo(user.goal);
      authBanner.innerHTML = `
        <div class="user-profile-header">
          <div class="user-profile-info">
            <div class="user-avatar-circle">${ui.escapeHtml(initial)}</div>
            <div class="user-meta">
              <h2>${ui.escapeHtml(user.username)}</h2>
              <p>${ui.escapeHtml(user.email || "")}</p>
              <span class="user-goal-badge">${badge.icon} ${ui.escapeHtml(badge.label)}</span>
            </div>
          </div>
          <div class="user-profile-actions">
            <button class="btn-secondary-outline" id="logout-btn" type="button">Sign Out</button>
          </div>
        </div>
      `;

      document.getElementById("logout-btn")?.addEventListener("click", () => {
        auth.logout(true);
      });
    } else {
      authBanner.innerHTML = `
        <div class="guest-callout-card">
          <div>
            <strong>Guest Mode · Default Goals Active</strong>
            <p>Sign in or create an account to personalize nutrition targets to your exact weight and fitness goal.</p>
          </div>
          <a href="login.html">Sign In / Register →</a>
        </div>
      `;
    }
  }

  function populateForm(user, calcDetails) {
    const data = user || (calcDetails ? calcDetails.inputs : null);
    if (!data) return;

    if (data.weight || data.weight_kg) inputWeight.value = data.weight || data.weight_kg;
    if (data.goal) inputGoal.value = data.goal;
    if (data.height || data.height_cm) inputHeight.value = data.height || data.height_cm;
    if (data.age) inputAge.value = data.age;
    if (data.gender) inputGender.value = data.gender;
    if (data.activity_level) inputActivity.value = data.activity_level;
  }

  function renderGoalsGrid(goals, calcDetails) {
    if (!goals || typeof goals !== "object") {
      targetList.innerHTML = '<div class="empty-state-message">Nutrition targets are unavailable.</div>';
      return;
    }

    const goalMode = inputGoal.value || "weight_loss";
    const goalSubtitle = goalMode === "weight_loss"
      ? "Daily deficit target"
      : goalMode === "weight_gain"
        ? "Daily surplus target"
        : "Equilibrium target";

    const proteinSubtitle = goalMode === "weight_loss"
      ? "2.0g/kg lean muscle retention"
      : goalMode === "weight_gain"
        ? "1.8g/kg muscle hypertrophy"
        : "1.5g/kg baseline maintenance";

    const cards = [
      {
        label: "Daily Calories",
        value: ui.formatNumber(goals.calories),
        unit: "kcal",
        caption: goalSubtitle
      },
      {
        label: "Daily Protein",
        value: ui.formatNumber(goals.protein),
        unit: "g",
        caption: proteinSubtitle
      },
      {
        label: "Carbohydrates",
        value: ui.formatNumber(goals.carbs),
        unit: "g",
        caption: "Energy & workout fuel"
      },
      {
        label: "Healthy Fat",
        value: ui.formatNumber(goals.fat),
        unit: "g",
        caption: "Hormone & metabolic support"
      },
      {
        label: "Daily Water Intake",
        value: goals.water_liters ? ui.formatNumber(goals.water_liters, 1) : (Number(inputWeight.value) * 0.035).toFixed(1),
        unit: "L",
        caption: "Vital hydration level"
      },
      {
        label: "Dietary Fiber",
        value: goals.fiber ? ui.formatNumber(goals.fiber) : "28",
        unit: "g",
        caption: "Digestion & gut health"
      },
      {
        label: "Basal Metabolic Rate",
        value: calcDetails?.bmr ? ui.formatNumber(calcDetails.bmr) : "—",
        unit: "kcal",
        caption: "Resting metabolic burn"
      },
      {
        label: "Total Daily Expenditure",
        value: calcDetails?.tdee ? ui.formatNumber(calcDetails.tdee) : "—",
        unit: "kcal",
        caption: "Maintenance expenditure"
      }
    ];

    targetList.innerHTML = cards.map((c) => `
      <article class="goal-card">
        <span class="nutrition-label">${ui.escapeHtml(c.label)}</span>
        <strong class="nutrition-value">${c.value} <small>${ui.escapeHtml(c.unit)}</small></strong>
        <span class="goal-card-caption">${ui.escapeHtml(c.caption)}</span>
      </article>
    `).join("");
  }

  function renderStrategy(calcDetails) {
    const goalMode = inputGoal.value || "weight_loss";
    const notes = calcDetails?.strategy_notes || [];

    let indianFoods = "";
    if (goalMode === "weight_loss") {
      indianFoods = `
        <div style="margin-top: 16px;">
          <strong style="color: var(--primary-deep); font-size: 0.88rem;">🥗 Recommended Indian Foods for Weight Loss:</strong>
          <p style="margin: 6px 0 0; color: var(--muted); font-size: 0.82rem; line-height: 1.6;">
            Sprout salad, moong dal soup, steamed idli, besan chilla, boiled chana, roasted makhana, cucumber raita, and unsweetened buttermilk (chaas).
            Minimize fried samosas, pakoras, creamy gravies, and sugary chai.
          </p>
        </div>
      `;
    } else if (goalMode === "weight_gain") {
      indianFoods = `
        <div style="margin-top: 16px;">
          <strong style="color: var(--primary-deep); font-size: 0.88rem;">💪 Recommended Indian Foods for Weight Gain:</strong>
          <p style="margin: 6px 0 0; color: var(--muted); font-size: 0.82rem; line-height: 1.6;">
            Paneer bhurji, peanut butter with whole wheat toast, banana milkshakes, almonds and walnuts, rajma-chawal, dal with a spoon of desi ghee, and curd.
            Eat in 4-5 structured meals throughout the day to meet your calorie surplus without feeling bloated.
          </p>
        </div>
      `;
    } else {
      indianFoods = `
        <div style="margin-top: 16px;">
          <strong style="color: var(--primary-deep); font-size: 0.88rem;">⚖️ Recommended Indian Foods for Balanced Maintenance:</strong>
          <p style="margin: 6px 0 0; color: var(--muted); font-size: 0.82rem; line-height: 1.6;">
            A balanced plate: 1 bowl of dal or paneer, 2 rotis or 1 cup rice, seasonal sabzi, and a bowl of fresh cucumber salad and curd.
          </p>
        </div>
      `;
    }

    strategyContent.innerHTML = `
      <div class="strategy-list">
        ${notes.map((n) => `
          <div class="strategy-item">
            <span class="icon">✦</span>
            <div>${ui.escapeHtml(n)}</div>
          </div>
        `).join("")}
      </div>
      ${indianFoods}
    `;
  }

  // Load initial targets
  async function loadInitial() {
    renderAuthBanner();
    try {
      const response = await api.getGoals();
      const user = response?.user;
      const details = response?.details;
      const goals = response?.daily_goals;

      populateForm(user, details);
      renderGoalsGrid(goals, details);
      renderStrategy(details);
    } catch (err) {
      ui.showToast("Could not load current targets: " + err.message, "error");
    }
  }

  // Handle Form Submission
  customizerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.textContent = "Calculating…";

    const payload = {
      weight: Number(inputWeight.value) || 70,
      goal: inputGoal.value,
      height: Number(inputHeight.value) || 172,
      age: Number(inputAge.value) || 25,
      gender: inputGender.value,
      activity_level: inputActivity.value
    };

    try {
      if (auth.isAuthenticated()) {
        const res = await api.updateProfile(payload);
        auth.saveAuth(auth.getToken(), res.user, res.targets);
        renderAuthBanner();
        renderGoalsGrid(res.targets.daily_goals, res.targets);
        renderStrategy(res.targets);
        ui.showToast("Nutrition targets updated and saved to your profile!", "success");
      } else {
        const calcRes = await api.calculateTargets(payload);
        renderGoalsGrid(calcRes.daily_goals, calcRes);
        renderStrategy(calcRes);
        ui.showToast("Targets recalculated for preview! Sign in to save permanently.", "info");
      }
    } catch (err) {
      ui.showToast("Failed to update targets: " + err.message, "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "⚡ Recalculate & Save Targets";
    }
  });

  await loadInitial();
});