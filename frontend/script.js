const BACKEND_URL = (window.FOODLENS_CONFIG && window.FOODLENS_CONFIG.API_URL) || "http://127.0.0.1:8000";
const API = window.FoodLensAPI;

const state = {
  selectedFile: null,
  selectedImageUrl: "",
  savedImageSignature: "",
  activeImageSignature: "",
  activeResult: null,
  groupedFoods: [],
  mealSaved: false,
  isSavingMeal: false,
  currentFoodQuantity: 1,
  meals: [],
  expandedMeals: [],
  todaySummary: null,
  todayProgress: null,
  recommendations: []
};

const elements = {
  backendStatus: document.getElementById("backend-status"),
  uploadDropzone: document.getElementById("upload-dropzone"),
  imageInput: document.getElementById("image-input"),
  cameraInput: document.getElementById("camera-input"),
  imagePreview: document.getElementById("image-preview"),
  imagePreviewWrap: document.getElementById("image-preview-wrap"),
  dropzoneEmpty: document.getElementById("dropzone-empty"),
  chooseFileBtn: document.getElementById("choose-file-btn"),
  cameraBtn: document.getElementById("camera-btn"),
  removeImageBtn: document.getElementById("remove-image-btn"),
  changeImageBtn: document.getElementById("change-image-btn"),
  analyzeBtn: document.getElementById("analyze-btn"),
  resultsState: document.getElementById("results-state"),
  detectionGrid: document.getElementById("detection-grid"),
  mealNutrition: document.getElementById("meal-nutrition"),
  addMealActions: document.getElementById("add-meal-actions"),
  addMealButton: document.getElementById("add-meal-btn"),
  addMealMessage: document.getElementById("add-meal-message"),
  dailyProgress: document.getElementById("daily-progress"),
  historyList: document.getElementById("history-list"),
  todayMealsList: document.getElementById("today-meals-list"),
  todayMealCount: document.getElementById("today-meal-count"),
  suggestionsList: document.getElementById("suggestions-list"),
  mealSummary: document.getElementById("meal-summary"),
  nutritionNote: document.getElementById("nutrition-note"),
  resultMealType: document.getElementById("result-meal-type"),
  nutritionDistribution: document.getElementById("nutrition-distribution"),
  analysisStatus: document.getElementById("analysis-status"),
  previewFileName: document.getElementById("preview-file-name"),
  historyFilter: document.getElementById("history-filter"),
  customDateFilter: document.getElementById("custom-date-filter"),
  historyDateFrom: document.getElementById("history-date-from"),
  historyDateTo: document.getElementById("history-date-to"),
  mealModal: document.getElementById("meal-modal"),
  toastRegion: document.getElementById("toast-region"),
  modal: document.getElementById("food-modal"),
  modalTitle: document.getElementById("modal-title"),
  modalConfidence: document.getElementById("modal-confidence"),
  modalServing: document.getElementById("modal-serving"),
  modalCalories: document.getElementById("modal-calories"),
  modalProtein: document.getElementById("modal-protein"),
  modalCarbs: document.getElementById("modal-carbs"),
  modalFat: document.getElementById("modal-fat"),
  modalFiber: document.getElementById("modal-fiber"),
  quantityControl: document.getElementById("quantity-control"),
  saveQuantityBtn: document.getElementById("save-quantity-btn"),
  foodFullDetails: document.getElementById("food-full-details")
};

function initializeScanner() {
  if (elements.uploadDropzone) bindUploadInteractions();
  if (elements.modal) bindModalEvents();
  if (document.querySelector(".hero-content")) updateMealTypeBadge();
  if (elements.backendStatus || elements.dailyProgress || elements.historyList || elements.todayMealsList) refreshDashboard();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeScanner, { once: true });
} else {
  initializeScanner();
}

function bindNavigation() {
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-menu");

  navToggle?.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("is-open");
      navToggle?.setAttribute("aria-expanded", "false");
    });
  });

  elements.historyFilter?.addEventListener("change", () => {
    elements.customDateFilter.hidden = elements.historyFilter.value !== "custom";
    renderHistoryLists();
  });
  [elements.historyDateFrom, elements.historyDateTo].filter(Boolean).forEach((input) => input.addEventListener("change", renderHistoryLists));
  [elements.historyList, elements.todayMealsList].filter(Boolean).forEach((list) => list.addEventListener("click", (event) => {
    const card = event.target.closest("[data-meal-id]");
    if (card) openMealDetails(Number(card.dataset.mealId));
  }));
  elements.mealModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-meal-modal]") || event.target.closest(".modal-close")) closeMealModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      closeMealModal();
    }
  });
}

function bindUploadInteractions() {
  if (!elements.uploadDropzone) return;
  elements.uploadDropzone.addEventListener("click", (event) => {
    if (event.target.closest("button, input, a")) return;
    elements.imageInput.click();
  });
  elements.chooseFileBtn.addEventListener("click", () => elements.imageInput.click());
  elements.cameraBtn.addEventListener("click", () => elements.cameraInput.click());
  elements.changeImageBtn.addEventListener("click", () => elements.imageInput.click());
  elements.removeImageBtn.addEventListener("click", handleRemoveImage);
  elements.analyzeBtn.addEventListener("click", handleAnalyze);
  elements.addMealButton.addEventListener("click", handleAddMeal);

  elements.imageInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) handleSelectedFile(file);
  });

  elements.cameraInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) handleSelectedFile(file);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.uploadDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.uploadDropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.uploadDropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.uploadDropzone.classList.remove("dragover");
    });
  });

  elements.uploadDropzone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) handleSelectedFile(file);
  });

  elements.uploadDropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      elements.imageInput.click();
    }
  });
}

function bindModalEvents() {
  document.querySelector(".modal-close")?.addEventListener("click", closeModal);
  document.querySelector(".modal-backdrop")?.addEventListener("click", closeModal);
  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.querySelectorAll(".qty-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.qtyAction;
      const current = Number(elements.quantityControl.value || 1);
      const nextValue = action === "increase" ? current + 0.5 : Math.max(0.5, current - 0.5);
      elements.quantityControl.value = nextValue.toFixed(1).replace(/\.0$/, "");
      updateFoodModalCalories();
    });
  });

  elements.quantityControl?.addEventListener("input", updateFoodModalCalories);
  elements.saveQuantityBtn?.addEventListener("click", saveFoodQuantityChanges);
}

async function refreshDashboard() {
  const endpoints = [
    `${BACKEND_URL}/health`,
    `${BACKEND_URL}/summary/today`,
    `${BACKEND_URL}/summary/progress`,
    `${BACKEND_URL}/meals`,
    `${BACKEND_URL}/goals`,
    `${BACKEND_URL}/recommendations/today`
  ];
  const results = await Promise.allSettled(endpoints.map((url) => fetchJson(url)));
  const values = results.map((result) => result.status === "fulfilled" ? result.value : null);
  const [health, summary, progress, meals, goals, recommendations] = values;
  const backendOnline = Boolean(health);
  setBackendStatus(backendOnline, health, results.find((result) => result.status === "rejected")?.reason);
  if (summary) state.todaySummary = summary;
  state.todayProgress = progress?.progress || null;
  state.meals = meals?.meals || [];
  state.recommendations = recommendations?.recommendations || [];

  if (elements.dailyProgress) renderTodaySummary(summary || {}, progress?.progress || null, goals?.daily_goals || null);
  if (elements.historyList || elements.todayMealsList) renderHistory(state.meals);
  if (elements.suggestionsList) renderSuggestions(recommendations);
  const count = Number(summary?.total_meals);
  if (elements.todayMealCount) elements.todayMealCount.textContent = Number.isFinite(count) ? `${count} ${count === 1 ? "meal" : "meals"}` : "Unavailable";
  const heroCount = document.getElementById("hero-meal-count");
  if (heroCount) heroCount.textContent = Number.isFinite(count) ? String(count) : "—";
  const heroCalories = document.getElementById("hero-calories");
  if (heroCalories) heroCalories.textContent = hasNumericValue(summary?.total_calories) ? `${formatNumber(Number(summary.total_calories))} kcal` : "—";
  if (!backendOnline && elements.suggestionsList) renderSuggestions(null);
}

function setBackendStatus(isOnline, healthData, error) {
  const statusText = isOnline
    ? `${healthData?.status === "ok" ? "AI Server Connected" : "AI Server Connected"}`
    : "AI Server Offline";

  elements.backendStatus.classList.toggle("offline", !isOnline);
  elements.backendStatus.innerHTML = `
    <span class="status-dot"></span>
    <span>${statusText}</span>
  `;
  const showcaseStatus = document.getElementById("showcase-model-status");
  if (showcaseStatus) showcaseStatus.textContent = isOnline ? (healthData?.model || "Connected") : "Offline";
  const todayDate = document.getElementById("today-date");
  if (todayDate) todayDate.textContent = new Date().toLocaleDateString([], { month: "short", day: "numeric" });
  const greeting = document.getElementById("hero-greeting");
  if (greeting) {
    const hour = new Date().getHours();
    greeting.textContent = `${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"} 👋`;
  }

  if (!isOnline && error) {
    console.warn("Backend unavailable:", error);
  }
}

async function fetchJson(url, options = {}) {
  const currentBase = (window.FOODLENS_CONFIG && window.FOODLENS_CONFIG.API_URL) || BACKEND_URL;
  const path = url.replace(currentBase, "").replace("http://127.0.0.1:8000", "");
  return API.request(path, options);
}

function handleSelectedFile(file) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedExts = [".jpg", ".jpeg", ".png", ".webp"];
  const fileExt = (file.name.toLowerCase().match(/\.[^.]+$/) || [""])[0];
  if (!allowedTypes.includes(file.type) && !allowedExts.includes(fileExt)) {
    showFriendlyMessage("Please upload a JPG, PNG, or WEBP image.");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showFriendlyMessage("Image is too large. Please choose a file under 10MB.");
    return;
  }

  state.selectedFile = file;
  const previewUrl = URL.createObjectURL(file);
  if (state.selectedImageUrl) URL.revokeObjectURL(state.selectedImageUrl);
  state.selectedImageUrl = previewUrl;

  elements.previewFileName.textContent = file.name;
  elements.removeImageBtn.hidden = false;
  elements.changeImageBtn.hidden = false;
  elements.analyzeBtn.disabled = false;
  elements.detectionGrid.innerHTML = "";
  elements.mealSummary.hidden = true;
  elements.imagePreview.src = previewUrl;
  elements.imagePreviewWrap.classList.add("is-visible");
  elements.dropzoneEmpty.classList.remove("is-visible");
  elements.resultsState.textContent = "Image ready. Click analyze to detect foods.";
  elements.resultsState.className = "result-state";
  resetAddMealState();
}

function handleRemoveImage() {
  state.selectedFile = null;
  elements.imageInput.value = "";
  elements.cameraInput.value = "";
  if (state.selectedImageUrl) URL.revokeObjectURL(state.selectedImageUrl);
  state.selectedImageUrl = "";
  elements.imagePreview.src = "";
  elements.previewFileName.textContent = "";
  elements.removeImageBtn.hidden = true;
  elements.changeImageBtn.hidden = true;
  elements.analyzeBtn.disabled = true;
  elements.detectionGrid.innerHTML = "";
  elements.mealSummary.hidden = true;
  elements.analysisStatus.textContent = "";
  elements.imagePreviewWrap.classList.remove("is-visible");
  elements.dropzoneEmpty.classList.add("is-visible");
  elements.resultsState.textContent = "Upload a meal image to get AI-powered food detection.";
  elements.resultsState.className = "result-state empty-state";
  state.activeResult = null;
  state.groupedFoods = [];
  resetAddMealState();
}

async function handleAnalyze() {
  if (!state.selectedFile) {
    showFriendlyMessage("Please choose an image before analyzing your meal.");
    return;
  }

  const imageSignature = getImageSignature(state.selectedFile);
  if (imageSignature === state.savedImageSignature) {
    showFriendlyMessage("This image is already added to today's meal. Upload a new image to add another meal.");
    return;
  }

  resetAddMealState();
  const formData = new FormData();
  formData.append("file", state.selectedFile);

  elements.analyzeBtn.disabled = true;
  elements.analyzeBtn.classList.add("loading");
  elements.analyzeBtn.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Analyzing your meal...';
  elements.analysisStatus.textContent = "Analyzing your meal...";
  elements.imagePreviewWrap.classList.add("is-scanning");

  try {
    const payload = await API.predictFood(state.selectedFile);

    if (payload?.error) {
      throw new Error(payload.error);
    }

    if (!payload || !Array.isArray(payload.detections)) {
      throw new Error("The prediction response is missing detection data.");
    }

    const groupedFoods = groupDetections(payload.detections, payload.meal_summary);
    const totalNutrition = calculateMealNutrition(groupedFoods);
    state.activeResult = payload;
    state.groupedFoods = groupedFoods;
    state.activeImageSignature = imageSignature;
    state.mealSaved = false;
    state.isSavingMeal = false;
    renderDetectionResults(groupedFoods);
    elements.mealSummary.hidden = groupedFoods.length === 0;
    elements.resultMealType.textContent = `🍽 ${capitalizeWords(payload.meal_type || getCurrentMealType())}`;
    renderMealNutrition(totalNutrition);
    renderNutritionNote(groupedFoods);
    renderNutritionDistribution(totalNutrition);

    const savableFoods = groupedFoods.filter(isSavableFoodGroup);
    elements.addMealActions.hidden = savableFoods.length === 0;
    elements.addMealButton.disabled = false;
    elements.addMealButton.textContent = "➕ Add to Today's Meal";
    elements.addMealMessage.textContent = "";
    elements.analysisStatus.textContent = groupedFoods.length
      ? "Analysis complete. Review the results and nutrition estimate below."
      : "No food detected. Try a clearer image with better lighting.";
    if (groupedFoods.length === 0) {
      showFriendlyMessage("No food was detected. Try another image with the full plate visible.");
    } else if (savableFoods.length === 0) {
      elements.addMealMessage.textContent = "Food was detected, but nutrition data is unavailable to save this meal.";
    }
  } catch (error) {
    console.error("Analyze error:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred while analyzing this image.";
    elements.resultsState.className = "result-state";
    elements.resultsState.textContent = message;
    elements.addMealActions.hidden = true;
    elements.analysisStatus.textContent = message;
    showFriendlyMessage(message);
  } finally {
    elements.analyzeBtn.disabled = false;
    elements.analyzeBtn.classList.remove("loading");
    elements.analyzeBtn.innerHTML = 'Scan Food <span aria-hidden="true">→</span>';
    elements.imagePreviewWrap.classList.remove("is-scanning");
    elements.analysisStatus.textContent ||= "Analysis finished.";
  }
}

async function saveCurrentMeal(payload, groupedFoods, totalNutrition) {
  const mealSummary = buildMealSummary(groupedFoods);
  if (!mealSummary.length) {
    throw new Error("No foods with nutrition data are available to save.");
  }

  const result = await API.saveMeal({
      meal_type: payload.meal_type || getCurrentMealType(),
      meal_summary: mealSummary,
      total_nutrition: totalNutrition
  });
  if (!Number.isInteger(Number(result?.meal_id)) || Number(result.meal_id) <= 0) {
    throw new Error("The backend response did not include a valid saved meal ID.");
  }
  return result;
}

async function handleAddMeal() {
  if (state.isSavingMeal || state.mealSaved || !state.activeResult) return;

  const groupedFoods = state.groupedFoods.filter(isSavableFoodGroup);
  if (!groupedFoods.length) {
    elements.addMealMessage.textContent = "There are no foods with nutrition data to save.";
    return;
  }

  state.isSavingMeal = true;
  elements.addMealButton.disabled = true;
  elements.addMealButton.textContent = "⏳ Adding...";
  elements.addMealMessage.textContent = "";

  try {
    const totalNutrition = calculateMealNutrition(groupedFoods);
    await saveCurrentMeal(state.activeResult, groupedFoods, totalNutrition);
    state.mealSaved = true;
    state.savedImageSignature = state.activeImageSignature;
    elements.addMealButton.textContent = "✅ Added to Today's Meal";
    elements.addMealMessage.textContent = "Meal added successfully to today's meals!";

    await refreshDashboard();
    renderMealNutrition(calculateMealNutrition(state.groupedFoods));
    showFriendlyMessage("✓ Meal added successfully to today's meals!");
  } catch (error) {
    console.error("Unable to save meal:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred while saving this meal.";
    elements.addMealButton.disabled = false;
    elements.addMealButton.textContent = "❌ Try Again";
    elements.addMealMessage.textContent = message;
    showFriendlyMessage(message);
  } finally {
    state.isSavingMeal = false;
  }
}

function resetAddMealState() {
  state.mealSaved = false;
  state.isSavingMeal = false;
  elements.addMealActions.hidden = true;
  elements.addMealButton.disabled = false;
  elements.addMealButton.textContent = "➕ Add to Today's Meal";
  elements.addMealMessage.textContent = "";
}

function getImageSignature(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function isSavableFoodGroup(group) {
  return Boolean(group.food)
    && group.hasNutrition
    && ["calories", "protein", "carbs", "fat"].every((nutrient) => hasNumericValue(group.totalNutrition?.[nutrient]));
}

function normalizeFoodName(foodName) {
  return String(foodName || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function groupDetections(detections, mealSummary = []) {
  const groups = new Map();
  const summaries = new Map();

  (Array.isArray(mealSummary) ? mealSummary : []).forEach((item) => {
    if (!item || typeof item !== "object") return;
    const key = normalizeFoodName(item.food);
    if (!key) return;
    const existing = summaries.get(key);
    if (existing) {
      existing.quantity += Number(item.quantity) || 0;
      existing.hasNutrition = existing.hasNutrition && ["calories", "protein", "carbs", "fat"].every((nutrient) => hasNumericValue(item[nutrient]));
      ["calories", "protein", "carbs", "fat"].forEach((nutrient) => {
        if (hasNumericValue(item[nutrient])) {
          existing.totalNutrition[nutrient] = (existing.totalNutrition[nutrient] || 0) + Number(item[nutrient]);
        }
      });
      if (hasNumericValue(item.fiber)) {
        existing.totalNutrition.fiber = (existing.totalNutrition.fiber || 0) + Number(item.fiber);
        existing.hasFiber = true;
      }
    } else {
      summaries.set(key, {
        food: String(item.food).trim(),
        quantity: Number(item.quantity) || 0,
        serving: item.serving || "",
        hasNutrition: ["calories", "protein", "carbs", "fat"].every((nutrient) => hasNumericValue(item[nutrient])),
        totalNutrition: {
          calories: hasNumericValue(item.calories) ? Number(item.calories) : null,
          protein: hasNumericValue(item.protein) ? Number(item.protein) : null,
          carbs: hasNumericValue(item.carbs) ? Number(item.carbs) : null,
          fat: hasNumericValue(item.fat) ? Number(item.fat) : null,
          fiber: hasNumericValue(item.fiber) ? Number(item.fiber) : null
        },
        hasFiber: hasNumericValue(item.fiber)
      });
    }
  });

  detections.forEach((detection) => {
    const key = normalizeFoodName(detection.food);
    if (!key) return;

    let group = groups.get(key);
    if (!group) {
      group = {
        food: String(detection.food).trim(),
        normalizedName: key,
        detections: [],
        detectedItems: 0,
        quantity: 0,
        averageConfidence: null,
        serving: detection.nutrition?.serving || summaries.get(key)?.serving || "",
        hasNutrition: Boolean(detection.nutrition)
          && ["calories", "protein", "carbs", "fat"].every((nutrient) => hasNumericValue(detection.nutrition[nutrient])),
        perServingNutrition: {},
        totalNutrition: null
      };
      groups.set(key, group);
    }

    group.detections.push(detection);
    group.detectedItems += 1;
    group.quantity += Number(detection.quantity) > 0 ? Number(detection.quantity) : 1;
    if (!group.serving) {
      group.serving = detection.nutrition?.serving || summaries.get(key)?.serving || "";
    }
  });

  summaries.forEach((summary, key) => {
    if (groups.has(key)) return;
    const quantity = summary.quantity > 0 ? summary.quantity : 1;
    groups.set(key, {
      food: summary.food,
      normalizedName: key,
      detections: [],
      detectedItems: quantity,
      quantity,
      averageConfidence: null,
      serving: summary.serving || "",
      hasNutrition: summary.hasNutrition,
      perServingNutrition: {},
      totalNutrition: { ...summary.totalNutrition }
    });
  });

  groups.forEach((group, key) => {
    const confidences = group.detections
      .map((detection) => Number(detection.confidence))
      .filter(Number.isFinite);
    if (confidences.length) {
      group.averageConfidence = confidences.reduce((sum, confidence) => sum + confidence, 0) / confidences.length;
    }

    const firstNutrition = group.detections.find((detection) => detection.nutrition)?.nutrition;
    const summary = summaries.get(key);
    if (firstNutrition) {
      group.perServingNutrition = { ...firstNutrition };
    } else if (summary?.quantity > 0) {
      group.perServingNutrition = Object.fromEntries(
        Object.entries(summary.totalNutrition)
          .filter(([, value]) => Number.isFinite(value))
          .map(([nutrient, value]) => [nutrient, value / summary.quantity])
      );
    }

    const detectionNutrition = sumDetectionNutrition(group.detections);
    group.totalNutrition = summary ? { ...summary.totalNutrition } : detectionNutrition;
    Object.keys(group.totalNutrition).forEach((nutrient) => {
      if (!hasNumericValue(group.totalNutrition[nutrient]) && hasNumericValue(detectionNutrition[nutrient])) {
        group.totalNutrition[nutrient] = detectionNutrition[nutrient];
      }
    });
    group.hasNutrition = ["calories", "protein", "carbs", "fat"]
      .every((nutrient) => hasNumericValue(group.totalNutrition[nutrient]));

    if (!group.serving) group.serving = firstNutrition?.serving || "1 serving";
  });

  return [...groups.values()].sort((a, b) => (b.averageConfidence || 0) - (a.averageConfidence || 0));
}

function sumDetectionNutrition(detections) {
  const total = { calories: null, protein: null, carbs: null, fat: null, fiber: null };

  detections.forEach((detection) => {
    const quantity = Number(detection.quantity) > 0 ? Number(detection.quantity) : 1;
    const nutrition = detection.nutrition || {};
    ["calories", "protein", "carbs", "fat"].forEach((nutrient) => {
      if (hasNumericValue(nutrition[nutrient])) {
        total[nutrient] = (total[nutrient] || 0) + Number(nutrition[nutrient]) * quantity;
      }
    });
    if (hasNumericValue(nutrition.fiber)) {
      total.fiber = (total.fiber || 0) + Number(nutrition.fiber) * quantity;
    }
  });

  return total;
}

function calculateMealNutrition(groups) {
  const total = { calories: null, protein: null, carbs: null, fat: null, fiber: null };

  groups.forEach((group) => {
    ["calories", "protein", "carbs", "fat"].forEach((nutrient) => {
      if (hasNumericValue(group.totalNutrition?.[nutrient])) {
        total[nutrient] = (total[nutrient] || 0) + Number(group.totalNutrition[nutrient]);
      }
    });
    if (hasNumericValue(group.totalNutrition?.fiber)) {
      total.fiber = (total.fiber || 0) + Number(group.totalNutrition.fiber);
    }
  });

  return total;
}

function formatGroupServing(group) {
  const quantity = Number(group.quantity) || 0;
  const match = String(group.serving || "").match(/^\s*([\d.]+)\s*([a-zA-Z]+)\s*$/);
  if (!match) {
    const unit = quantity === 1 ? "serving" : "servings";
    return `${formatNumber(quantity)} ${unit}`;
  }

  const amountPerServing = Number(match[1]);
  const unit = match[2].toLowerCase();
  const totalAmount = amountPerServing * quantity;
  if (unit === "piece" || unit === "pieces") {
    return `${formatNumber(quantity)} ${quantity === 1 ? "piece" : "pieces"}`;
  }
  return `${formatNumber(totalAmount)} ${unit}`;
}

function buildMealSummary(groups) {
  return groups.map((group) => ({
    food: group.food,
    quantity: group.quantity,
    serving: group.serving,
    confidence: group.averageConfidence,
    calories: group.totalNutrition.calories,
    protein: group.totalNutrition.protein,
    carbs: group.totalNutrition.carbs,
    fat: group.totalNutrition.fat,
    fiber: group.totalNutrition.fiber
  }));
}

function renderDetectionResults(groups) {
  elements.detectionGrid.innerHTML = "";

  if (!groups.length) {
    elements.resultsState.className = "result-state";
    elements.resultsState.innerHTML = `
      <p><strong>We couldn't confidently identify any food.</strong> Try uploading a clearer image with the full plate visible.</p>
    `;
    return;
  }

  groups.forEach((group) => {
    const card = document.createElement("article");
    card.className = "detection-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open details for ${group.food}`);

    const nutrition = group.totalNutrition || {};
    const confidence = group.averageConfidence === null
      ? null
      : group.averageConfidence <= 1
        ? group.averageConfidence * 100
        : group.averageConfidence;
    const confidenceText = confidence === null ? "Confidence unavailable" : `Average confidence ${formatPercent(confidence)}%`;

    card.innerHTML = `
      <div class="food-header">
        <h3 class="food-name">${escapeHtml(capitalizeWords(group.food))}</h3>
        <span class="confidence-badge">${confidence === null ? "—" : `${formatPercent(confidence)}%`}</span>
      </div>
      <p class="detected-quantity">${formatNumber(group.detectedItems)} ${group.detectedItems === 1 ? "item" : "items"} detected</p>
      <p class="metric-label">${confidenceText}</p>
      <div class="confidence-meter"><span class="confidence-fill" style="width:${Math.min(confidence || 0, 100)}%"></span></div>
      <div class="nutrition-info">
        <div class="metric">
          <span class="metric-label">Estimated serving</span>
          <span class="metric-value">${formatGroupServing(group)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Calories</span>
          <span class="metric-value">${formatNutritionValue(nutrition.calories, "kcal")}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Protein</span>
          <span class="metric-value">${formatNutritionValue(nutrition.protein, "g")}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Carbs</span>
          <span class="metric-value">${formatNutritionValue(nutrition.carbs, "g")}</span>
        </div>
        <div class="metric" style="grid-column: span 2;">
          <span class="metric-label">Fat</span>
          <span class="metric-value">${formatNutritionValue(nutrition.fat, "g")}</span>
        </div>
        <div class="metric" style="grid-column: span 2;">
          <span class="metric-label">Fiber</span>
          <span class="metric-value">${formatNutritionValue(nutrition.fiber, "g")}</span>
        </div>
      </div>
      ${group.hasNutrition ? "" : '<p class="nutrition-unavailable">Nutrition data is unavailable or incomplete for this food.</p>'}
    `;

    card.addEventListener("click", () => openFoodModal(group));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFoodModal(group);
      }
    });

    elements.detectionGrid.appendChild(card);
  });

  elements.resultsState.className = "result-state";
  elements.resultsState.innerHTML = "";
}

function renderNutritionCards(summaryData) {
  renderMealNutrition({
    calories: summaryData?.total_calories,
    protein: summaryData?.total_protein,
    carbs: summaryData?.total_carbs,
    fat: summaryData?.total_fat,
    fiber: summaryData?.total_fiber
  });
}

function renderMealNutrition(totalNutrition) {
  const data = {
    calories: {value: hasNumericValue(totalNutrition.calories) ? Number(totalNutrition.calories) : null, icon: "🔥", label: "Calories", colorClass: "primary"},
    protein: {value: hasNumericValue(totalNutrition.protein) ? Number(totalNutrition.protein) : null, icon: "💪", label: "Protein", colorClass: "dark"},
    carbs: {value: hasNumericValue(totalNutrition.carbs) ? Number(totalNutrition.carbs) : null, icon: "🌾", label: "Carbohydrates", colorClass: "primary"},
    fat: {value: hasNumericValue(totalNutrition.fat) ? Number(totalNutrition.fat) : null, icon: "🥑", label: "Fat", colorClass: "primary"},
    fiber: {value: hasNumericValue(totalNutrition.fiber) ? Number(totalNutrition.fiber) : null, icon: "🌿", label: "Fiber", colorClass: "dark"}
  };

  elements.mealNutrition.innerHTML = Object.values(data)
    .map((item) => `
      <article class="nutrition-card">
        <div class="nutrition-header">
          <span class="nutrition-icon">${item.icon}</span>
        </div>
        <div class="nutrition-value">${item.value === null ? "—" : formatNumber(item.value)}${item.label === "Calories" || item.value === null ? "" : " g"}</div>
        <span class="nutrition-label">${item.value === null ? `${item.label} · unavailable` : item.label === "Calories" ? "kcal" : item.label}</span>
        ${item.value === null ? "" : `<div class="progress-track"><span class="progress-fill ${item.colorClass}" style="width:${Math.min((Number(item.value) || 0) / 300 * 100, 100)}%"></span></div>`}
      </article>
    `)
    .join("");
}

function renderNutritionNote(groups) {
  if (!elements.nutritionNote) return;
  const unavailableCount = groups.filter((group) => !group.hasNutrition).length;
  elements.nutritionNote.hidden = groups.length === 0;
  elements.nutritionNote.textContent = [
    "Nutrition values are estimates from the built-in database for typical servings; serving amounts are estimated as one serving per detected item.",
    unavailableCount
      ? `Meal totals exclude ${unavailableCount} detected ${unavailableCount === 1 ? "food" : "foods"} with incomplete nutrition data.`
      : ""
  ].filter(Boolean).join(" ");
}

function formatNutritionValue(value, unit) {
  return hasNumericValue(value) ? `${formatNumber(Number(value))} ${unit}` : "Unavailable";
}

function renderNutritionDistribution(nutrition) {
  const macros = [
    { name: "Protein", value: Number(nutrition.protein) * 4, color: "protein" },
    { name: "Carbohydrates", value: Number(nutrition.carbs) * 4, color: "carbs" },
    { name: "Fat", value: Number(nutrition.fat) * 9, color: "fat" }
  ].filter((macro) => Number.isFinite(macro.value) && macro.value >= 0);
  const total = macros.reduce((sum, macro) => sum + macro.value, 0);
  elements.nutritionDistribution.innerHTML = total > 0
    ? `<div class="distribution-heading"><strong>Macro balance</strong><span>Estimated from available nutrition data</span></div>
       <div class="distribution-bar" aria-label="Nutrition distribution">${macros.map((macro) =>
      `<span class="distribution-${macro.color}" style="width:${macro.value / total * 100}%" title="${macro.name}: ${formatNumber(macro.value / total * 100)}%"></span>`
    ).join("")}</div>
       <div class="distribution-legend">${macros.map((macro) =>
      `<span><i class="legend-${macro.color}"></i>${macro.name} ${formatNumber(macro.value / total * 100)}%</span>`
    ).join("")}</div>`
    : "";
}

function renderTodaySummary(summary, progress = null, goals = null) {
  const measures = [
    { key: "calories", label: "Calories", unit: "kcal", icon: "◉", color: "calories" },
    { key: "protein", label: "Protein", unit: "g", icon: "↗", color: "protein" },
    { key: "carbs", label: "Carbohydrates", unit: "g", icon: "◇", color: "carbs" },
    { key: "fat", label: "Fat", unit: "g", icon: "◌", color: "fat" }
  ];
  elements.dailyProgress.innerHTML = measures.map((item) => {
    const current = hasNumericValue(progress?.[item.key]?.current)
      ? Number(progress[item.key].current)
      : hasNumericValue(summary?.[`total_${item.key === "carbs" ? "carbs" : item.key}`])
        ? Number(summary[`total_${item.key === "carbs" ? "carbs" : item.key}`])
        : null;
    const goal = hasNumericValue(progress?.[item.key]?.goal)
      ? Number(progress[item.key].goal)
      : hasNumericValue(goals?.[item.key]) ? Number(goals[item.key]) : null;
    const percent = hasNumericValue(progress?.[item.key]?.percentage)
      ? Number(progress[item.key].percentage)
      : current !== null && goal > 0 ? current / goal * 100 : null;
    const amount = current === null ? "—" : `${formatNumber(current)}${item.key === "calories" ? "" : " g"}`;
    const target = goal === null ? "" : ` <span>/ ${formatNumber(goal)} ${item.unit}</span>`;
    return `<article class="daily-card daily-card-${item.color}">
      <div class="daily-card-heading"><span class="daily-icon" aria-hidden="true">${item.icon}</span><span>${item.label}</span></div>
      <div class="daily-card-value">${amount}${target}</div>
      <div class="progress-track" role="progressbar" aria-label="${item.label} daily goal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent === null ? 0 : Math.round(percent)}">
        <span class="progress-fill" style="width:${percent === null ? 0 : Math.min(Math.max(percent, 0), 100)}%"></span>
      </div>
      <span class="daily-card-caption">${percent === null ? (goal === null ? "Daily goal unavailable" : "Progress unavailable") : `${formatNumber(percent)}% of daily goal`}</span>
    </article>`;
  }).join("");
}

function renderHistory(meals) {
  state.expandedMeals = meals.map((meal) => ({ ...meal, items: null, detailsLoading: true }));
  renderHistoryLists();
  Promise.all(meals.map(async (meal) => {
    try {
      const details = await fetchJson(`${BACKEND_URL}/meals/${meal.id}`);
      return { ...meal, items: details.items || [], detailsLoading: false };
    } catch (error) {
      console.warn(`Meal details unavailable for meal ${meal.id}:`, error);
      return { ...meal, items: null, detailsLoading: false };
    }
  })).then((expandedMeals) => {
    state.expandedMeals = expandedMeals;
    renderHistoryLists();
  });
}

function renderHistoryLists() {
  const now = new Date();
  const todayKey = localDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday);
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const filter = elements.historyFilter.value;
  const from = elements.historyDateFrom.value;
  const to = elements.historyDateTo.value;

  const matchingMeals = state.expandedMeals.filter((meal) => {
    const dateKey = localDateKey(new Date(meal.meal_date));
    if (filter === "today") return dateKey === todayKey;
    if (filter === "yesterday") return dateKey === yesterdayKey;
    if (filter === "week") return new Date(meal.meal_date) >= weekStart;
    if (filter === "custom") return (!from || dateKey >= from) && (!to || dateKey <= to);
    return true;
  });

  const todayMeals = state.expandedMeals.filter((meal) => localDateKey(new Date(meal.meal_date)) === todayKey);
  elements.todayMealsList.innerHTML = todayMeals.length
    ? todayMeals.map(renderHistoryCard).join("")
    : `<div class="empty-state-message"><strong>No meals logged today</strong><br />Scan your first meal to start tracking your nutrition.<a class="empty-state-link" href="#scanner">Scan a meal →</a></div>`;

  elements.historyList.innerHTML = matchingMeals.length
    ? matchingMeals.map(renderHistoryCard).join("")
    : `<div class="empty-state-message">No meals match this date range.</div>`;
}

function renderHistoryCard(meal) {
  const items = Array.isArray(meal.items) ? meal.items : [];
  const foodLine = items.length
    ? items.map((item) => `${capitalizeWords(item.food_name)} × ${formatNumber(Number(item.quantity) || 1)}`).join(" · ")
    : meal.detailsLoading ? "Loading meal details…" : "Food details unavailable";
  return `<button class="history-card history-card-button" type="button" data-meal-id="${Number(meal.id)}" aria-label="View ${escapeHtml(capitalizeWords(meal.meal_type || "meal"))} meal details">
    <span class="history-timeline-dot" aria-hidden="true"></span>
    <span class="history-header"><strong>${escapeHtml(capitalizeWords(meal.meal_type || "meal"))}</strong><span class="history-meta">${escapeHtml(formatMealDate(meal.meal_date))}</span></span>
    <span class="history-foods">${escapeHtml(foodLine)}</span>
    <span class="history-card-totals"><strong>${formatNumber(Number(meal.total_calories || 0))} kcal</strong><span>${formatNumber(Number(meal.total_protein || 0))} g protein</span></span>
  </button>`;
}

async function openMealDetails(mealId) {
  const meal = state.expandedMeals.find((item) => item.id === mealId);
  if (!meal) return;
  elements.mealModal.classList.remove("hidden");
  elements.mealModal.setAttribute("aria-hidden", "false");
  document.getElementById("meal-modal-title").textContent = capitalizeWords(meal.meal_type || "Meal");
  document.getElementById("meal-modal-date").textContent = formatMealDate(meal.meal_date);
  document.getElementById("meal-modal-foods").textContent = "Loading meal items…";
  if (meal.items === null) {
    try {
      const details = await fetchJson(`${BACKEND_URL}/meals/${meal.id}`);
      meal.items = details.items || [];
    } catch (error) {
      console.error("Unable to load meal details:", error);
      document.getElementById("meal-modal-foods").textContent = "Unable to load food details. Please try again.";
      return;
    }
  }
  document.getElementById("meal-modal-foods").innerHTML = meal.items.length
    ? meal.items.map((item) => `<div class="meal-modal-food"><span>${escapeHtml(capitalizeWords(item.food_name))}</span><strong>× ${formatNumber(Number(item.quantity) || 1)}</strong></div>`).join("")
    : "Food details are not available for this meal.";
  document.getElementById("meal-modal-nutrition").innerHTML = [
    ["Calories", `${formatNumber(Number(meal.total_calories || 0))} kcal`],
    ["Protein", `${formatNumber(Number(meal.total_protein || 0))} g`],
    ["Carbohydrates", `${formatNumber(Number(meal.total_carbs || 0))} g`],
    ["Fat", `${formatNumber(Number(meal.total_fat || 0))} g`]
  ].map(([label, value]) => `<div class="info-box"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function closeMealModal() {
  elements.mealModal.classList.add("hidden");
  elements.mealModal.setAttribute("aria-hidden", "true");
}

function renderSuggestions(recommendationsData) {
  const suggestions = Array.isArray(recommendationsData?.recommendations)
    ? recommendationsData.recommendations.filter((item) => typeof item === "string" && item.trim())
    : [];
  if (!suggestions.length) {
    elements.suggestionsList.innerHTML = `<div class="empty-state-message">${recommendationsData
      ? "No nutrition insights are available right now."
      : "Nutrition insights are unavailable while the FoodLens backend is offline."}</div>`;
    return;
  }
  elements.suggestionsList.innerHTML = suggestions.map((text) =>
    `<article class="suggestion-card"><span class="insight-mark" aria-hidden="true">✦</span><h3>Nutrition insight</h3><p>${escapeHtml(text)}</p></article>`
  ).join("");
}

function renderFallbackDemoState() {
  elements.dailyProgress.innerHTML = `<div class="empty-state-message">Today's nutrition is unavailable. Please check your backend connection.</div>`;
}

function openFoodModal(detection) {
  const quantity = Number(detection.quantity || 1);
  const nutrition = detection.perServingNutrition || {};

  state.activeResult = detection;
  state.currentFoodQuantity = quantity;

  elements.modalTitle.textContent = capitalizeWords(detection.food);
  if (elements.foodFullDetails) {
    const foodData = {
      food: detection.food,
      quantity,
      serving: detection.serving,
      confidence: detection.averageConfidence,
      nutrition: detection.totalNutrition
    };
    sessionStorage.setItem("foodlens-selected-food", JSON.stringify(foodData));
    elements.foodFullDetails.href = `food.html?food=${encodeURIComponent(detection.food)}`;
  }
  const confidence = detection.averageConfidence;
  elements.modalConfidence.textContent = confidence === null
    ? "Confidence unavailable"
    : `${formatPercent(confidence <= 1 ? confidence * 100 : confidence)}% average confidence`;
  elements.modalServing.textContent = formatGroupServing(detection);
  elements.quantityControl.value = String(quantity);
  updateFoodModalCalories();
  elements.modal.classList.remove("hidden");
  elements.modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  elements.modal.classList.add("hidden");
  elements.modal.setAttribute("aria-hidden", "true");
}

function updateFoodModalCalories() {
  const quantity = Number(elements.quantityControl.value || 1);
  const group = state.activeResult;
  if (!group || !Number.isFinite(quantity) || quantity <= 0) return;

  const nutrition = nutritionAtQuantity(group, quantity);
  elements.modalCalories.textContent = formatNutritionValue(nutrition.calories, "kcal");
  elements.modalProtein.textContent = formatNutritionValue(nutrition.protein, "g");
  elements.modalCarbs.textContent = formatNutritionValue(nutrition.carbs, "g");
  elements.modalFat.textContent = formatNutritionValue(nutrition.fat, "g");
  elements.modalFiber.textContent = hasNumericValue(nutrition.fiber) ? formatNutritionValue(nutrition.fiber, "g") : "Unavailable";
  elements.modalServing.textContent = formatGroupServing({ ...group, quantity });
}

async function saveFoodQuantityChanges() {
  const updatedQuantity = Number(elements.quantityControl.value || 1);
  const group = state.activeResult;
  if (!group || !Number.isFinite(updatedQuantity) || updatedQuantity <= 0) return;

  const updatedNutrition = nutritionAtQuantity(group, updatedQuantity);
  group.quantity = updatedQuantity;
  group.totalNutrition = updatedNutrition;
  const totalNutrition = calculateMealNutrition(state.groupedFoods);
  renderDetectionResults(state.groupedFoods);
  renderMealNutrition(totalNutrition);
  renderNutritionNote(state.groupedFoods);
  renderNutritionDistribution(totalNutrition);
  if (state.activeResult) state.activeResult = group;

  closeModal();
  showFriendlyMessage(`${capitalizeWords(group.food)} updated to ${formatNumber(updatedQuantity)} serving(s).`);
}

function nutritionAtQuantity(group, quantity) {
  const perServing = group.perServingNutrition || {};
  const originalQuantity = Number(group.quantity) || 1;
  const total = {};

  ["calories", "protein", "carbs", "fat"].forEach((nutrient) => {
    if (hasNumericValue(perServing[nutrient])) {
      total[nutrient] = Number(perServing[nutrient]) * quantity;
    } else if (hasNumericValue(group.totalNutrition?.[nutrient])) {
      total[nutrient] = Number(group.totalNutrition[nutrient]) * quantity / originalQuantity;
    } else {
      total[nutrient] = null;
    }
  });

  if (hasNumericValue(perServing.fiber)) {
    total.fiber = Number(perServing.fiber) * quantity;
  } else if (hasNumericValue(group.totalNutrition?.fiber)) {
    total.fiber = Number(group.totalNutrition.fiber) * quantity / originalQuantity;
  } else {
    total.fiber = null;
  }

  return total;
}

function formatPercent(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}

function hasNumericValue(value) {
  return value !== null
    && value !== undefined
    && !(typeof value === "string" && value.trim() === "")
    && Number.isFinite(Number(value));
}

function showFriendlyMessage(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  elements.toastRegion.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

function updateMealTypeBadge() {
  const value = getCurrentMealType();
  const iconMap = {
    breakfast: "🌅",
    "morning snacks": "🥐",
    lunch: "☀️",
    "afternoon snacks": "🌤️",
    dinner: "🌙",
    other: "🕒"
  };

  let badge = document.querySelector(".meal-type-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "meal-type-badge";
    badge.style.cssText = "display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:rgba(31,107,79,0.08);color:var(--primary);font-weight:700;margin-top:18px;";
    const heroContent = document.querySelector(".hero-content");
    if (heroContent) heroContent.appendChild(badge);
  }

  badge.textContent = `${iconMap[value] || "🕒"} ${capitalizeWords(value)}`;
}

function getCurrentMealType() {
  const hour = new Date().getHours();

  if (hour >= 4 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 11) return "morning snacks";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 18) return "afternoon snacks";
  if (hour >= 18 && hour < 23) return "dinner";
  return "other";
}

function formatMealDate(dateString) {
  if (!dateString) return "Today";
  const date = new Date(dateString);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function localDateKey(date) {
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "0";
  return Number(value).toFixed(value % 1 === 0 ? 0 : 1);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function capitalizeWords(value) {
  if (!value) return "";
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
