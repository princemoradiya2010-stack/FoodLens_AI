document.addEventListener("DOMContentLoaded", () => {
  const ui = window.FoodLensUI;
  const params = new URLSearchParams(window.location.search);
  let selected = null;
  try {
    const saved = sessionStorage.getItem("foodlens-selected-food");
    selected = saved ? JSON.parse(saved) : null;
  } catch (error) {
    ui.showToast("Saved food details could not be read.", "error");
  }
  const paramFood = params.get("food");
  const food = paramFood || selected?.food || "";
  if (!food) return;
  if (paramFood && selected?.food && paramFood.toLowerCase() !== String(selected.food).toLowerCase()) selected = null;

  const nutrition = selected?.nutrition || Object.fromEntries(["calories", "protein", "carbs", "fat", "fiber"]
    .map((key) => [key, params.has(key) ? Number(params.get(key)) : null]));
  const quantity = params.has("quantity") ? Number(params.get("quantity")) : Number(selected?.quantity);
  const serving = params.get("serving") || selected?.serving || "";
  const confidence = params.has("confidence") ? Number(params.get("confidence")) : Number(selected?.confidence);
  document.getElementById("food-title").textContent = ui.capitalize(food);
  document.getElementById("food-serving").textContent = [
    Number.isFinite(quantity) && quantity > 0 ? `Quantity: ${ui.formatNumber(quantity)}` : "",
    serving ? `Serving: ${serving}` : ""
  ].filter(Boolean).join(" · ") || "Nutrition estimate from the selected scan result.";
  const confidenceBadge = document.getElementById("food-confidence");
  if (ui.hasNumber(confidence)) {
    confidenceBadge.hidden = false;
    confidenceBadge.textContent = `Average confidence ${ui.formatNumber(confidence <= 1 ? confidence * 100 : confidence)}%`;
  }
  const labels = [
    ["calories", "Calories", "kcal"], ["protein", "Protein", "g"],
    ["carbs", "Carbohydrates", "g"], ["fat", "Fat", "g"], ["fiber", "Fiber", "g"]
  ];
  const cards = labels.filter(([key]) => ui.hasNumber(nutrition[key]))
    .map(([key, label, unit]) => `<article class="nutrition-card"><span class="nutrition-label">${label}</span><strong class="nutrition-value">${ui.formatNumber(nutrition[key])} <small>${unit}</small></strong></article>`);
  document.getElementById("food-nutrition").innerHTML = cards.length
    ? cards.join("")
    : '<div class="empty-state-message">Nutrition values are not available for this food in the selected scan.</div>';
  document.getElementById("food-empty").hidden = true;

  const savable = ["calories", "protein", "carbs", "fat"].every((key) => ui.hasNumber(nutrition[key]))
    && Number.isFinite(quantity) && quantity > 0;
  const actions = document.getElementById("food-save-actions");
  const saveButton = document.getElementById("food-add-meal");
  const saveMessage = document.getElementById("food-save-message");
  actions.hidden = !savable;
  if (savable) {
    const signature = JSON.stringify({ food: food.toLowerCase(), quantity, nutrition });
    if (sessionStorage.getItem("foodlens-saved-food") === signature) {
      saveButton.disabled = true;
      saveButton.textContent = "✓ Added to Today's Meal";
      saveMessage.textContent = "This food has already been added from this detail view.";
    }
    saveButton.addEventListener("click", async () => {
      if (saveButton.disabled) return;
      saveButton.disabled = true;
      saveButton.textContent = "⏳ Adding…";
      saveMessage.textContent = "";
      try {
        const mealType = currentMealType();
        const response = await ui.api.saveMeal({
          meal_type: mealType,
          meal_summary: [{
            food,
            quantity,
            serving,
            confidence: ui.hasNumber(confidence) ? confidence : null,
            calories: Number(nutrition.calories),
            protein: Number(nutrition.protein),
            carbs: Number(nutrition.carbs),
            fat: Number(nutrition.fat)
          }],
          total_nutrition: {
            calories: Number(nutrition.calories),
            protein: Number(nutrition.protein),
            carbs: Number(nutrition.carbs),
            fat: Number(nutrition.fat)
          }
        });
        if (!Number.isInteger(Number(response?.meal_id)) || Number(response.meal_id) <= 0) {
          throw new Error("The backend did not confirm that this meal was saved.");
        }
        sessionStorage.setItem("foodlens-saved-food", signature);
        saveButton.textContent = "✓ Added to Today's Meal";
        saveMessage.textContent = "Meal added successfully to today's meals!";
        ui.showToast("✓ Meal added successfully to today's meals!", "success");
      } catch (error) {
        saveButton.disabled = false;
        saveButton.textContent = "❌ Try Again";
        saveMessage.textContent = error.message;
        ui.showToast(error.message, "error");
      }
    });
  }
});

function currentMealType() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 11) return "morning snacks";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 18) return "afternoon snacks";
  if (hour >= 18 && hour < 23) return "dinner";
  return "other";
}