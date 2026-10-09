const API_BASE_URL = (window.FOODLENS_CONFIG && window.FOODLENS_CONFIG.API_URL) || "http://127.0.0.1:8000";
console.info("[FoodLens API] Base URL:", API_BASE_URL);

const nutrientConfig = [
  { key: "calories", label: "Calories", unit: "kcal", icon: "◉" },
  { key: "protein", label: "Protein", unit: "g", icon: "⌁" },
  { key: "carbs", label: "Carbs", unit: "g", icon: "⌂" },
  { key: "fat", label: "Fat", unit: "g", icon: "◒" }
];

const elements = {
  apiStatus: document.querySelector("#api-status"),
  apiStatusText: document.querySelector("#api-status-text"),
  todayDate: document.querySelector("#today-date"),
  nutritionGrid: document.querySelector("#nutrition-grid"),
  input: document.querySelector("#image-input"),
  dropZone: document.querySelector("#drop-zone"),
  uploadEmpty: document.querySelector("#upload-empty"),
  previewWrap: document.querySelector("#preview-wrap"),
  previewImage: document.querySelector("#image-preview"),
  previewFilename: document.querySelector("#preview-filename"),
  previewStage: document.querySelector("#preview-stage"),
  overlay: document.querySelector("#detection-overlay"),
  chooseImage: document.querySelector("#choose-image"),
  removeImage: document.querySelector("#remove-image"),
  analyzeButton: document.querySelector("#analyze-button"),
  analyzeMessage: document.querySelector("#analyze-message"),
  resultsEmpty: document.querySelector("#results-empty"),
  resultsContent: document.querySelector("#results-content"),
  historyList: document.querySelector("#history-list"),
  recommendationsList: document.querySelector("#recommendations-list"),
  recommendationMealType: document.querySelector("#recommendation-meal-type"),
  refreshHistory: document.querySelector("#refresh-history"),
  mealDialog: document.querySelector("#meal-dialog"),
  mealDialogContent: document.querySelector("#meal-dialog-content"),
  closeDialog: document.querySelector("#close-dialog"),
  toastRegion: document.querySelector("#toast-region")
};

let selectedFile = null;
let previewUrl = null;
let latestPrediction = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatNumber(value, maximumFractionDigits = 1) {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(number)
    : "—";
}

function formatMealType(value) {
  return String(value || "other").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function setApiStatus(state, message) {
  elements.apiStatus.classList.remove("connected", "disconnected");
  if (state) elements.apiStatus.classList.add(state);
  elements.apiStatusText.textContent = message;
}

async function requestJson(path, options = {}) {
  const url = new URL(path, `${API_BASE_URL}/`).toString();
  const method = (options.method || "GET").toUpperCase();
  let response;
  console.info(`[FoodLens API] Request: ${method} ${url}`);

  try {
    response = await fetch(url, options);
  } catch (error) {
    setApiStatus("disconnected", "Backend unavailable");
    console.error(`[FoodLens API] ${method} ${url} failed before receiving a response. Check the browser's network and CORS diagnostics.`, error);
    throw new Error(`Could not ${method} ${url}: ${error.message}`, { cause: error });
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const responseText = await response.text();
    const error = new Error(
      `Expected JSON from ${url}, but received HTTP ${response.status} (${contentType || "unknown content type"}). ${responseText}`
    );
    console.error("[FoodLens API] Unexpected response:", error);
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error(`[FoodLens API] Could not parse JSON from ${method} ${url}.`, error);
    throw new Error(`Could not parse the response from ${url}: ${error.message}`, { cause: error });
  }

  console.info(`[FoodLens API] Response: ${method} ${url} → HTTP ${response.status}`);
  if (!response.ok) {
    const message = data.detail || data.error || `The API request failed (${response.status}).`;
    const error = new Error(`${method} ${url} returned HTTP ${response.status}: ${message}`);
    console.error("[FoodLens API] Request failed:", error, data);
    throw error;
  }
  if (data && typeof data === "object" && !Array.isArray(data) && data.error) {
    const error = new Error(`${method} ${url} returned an API error: ${data.error}`);
    console.error("[FoodLens API] Request failed:", error, data);
    throw error;
  }
  setApiStatus("connected", "Backend connected");
  return data;
}

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.className = `toast${isError ? " error" : ""}`;
  toast.textContent = message;
  elements.toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function setAnalyzeMessage(message, kind = "") {
  elements.analyzeMessage.textContent = message;
  elements.analyzeMessage.classList.remove("error", "success");
  if (kind) elements.analyzeMessage.classList.add(kind);
}

function renderNutrition(progress) {
  if (!progress || typeof progress !== "object") {
    throw new Error("The nutrition progress response is incomplete.");
  }

  const cards = nutrientConfig.map(({ key, label, unit, icon }) => {
    const item = progress[key];
    if (!item || !Number.isFinite(Number(item.current)) || !Number.isFinite(Number(item.goal))) {
      throw new Error(`The nutrition progress response is missing ${key}.`);
    }
    const current = Number(item.current);
    const goal = Number(item.goal);
    const percentage = Number.isFinite(Number(item.percentage))
      ? Number(item.percentage)
      : goal > 0 ? (current / goal) * 100 : 0;

    return `<article class="metric-card ${key}">
      <div class="metric-top"><span class="metric-name">${label}</span><span class="metric-icon ${key}" aria-hidden="true">${icon}</span></div>
      <div class="metric-value"><strong>${formatNumber(current)}</strong><span>${unit}</span></div>
      <div class="metric-goal"><b>${formatNumber(percentage, 0)}%</b> of ${formatNumber(goal, 0)} ${unit} goal</div>
      <div class="progress-track" role="progressbar" aria-label="${label} daily goal" aria-valuenow="${Math.max(0, percentage)}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill" style="width:${Math.min(100, Math.max(0, percentage))}%"></div></div>
    </article>`;
  });
  elements.nutritionGrid.innerHTML = cards.join("");
}

async function loadDashboard() {
  try {
    const progressResponse = await requestJson("/summary/progress");
    const progress = progressResponse.progress;
    if (!progress) throw new Error("The nutrition progress response is incomplete.");
    renderNutrition(progress);
  } catch (error) {
    elements.nutritionGrid.innerHTML = `<div class="empty-state"><span>!</span><strong>Nutrition data is unavailable</strong>${escapeHtml(error.message)}</div>`;
    setApiStatus("disconnected", "Backend unavailable");
  }
}

function validateImage(file) {
  if (!file) {
    setAnalyzeMessage("Choose an image before analyzing.", "error");
    return false;
  }
  if (!file.type.startsWith("image/")) {
    setAnalyzeMessage("That file is not an image. Choose a JPG, PNG, or WEBP file.", "error");
    return false;
  }
  return true;
}

function setSelectedFile(file) {
  if (!validateImage(file)) return;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  selectedFile = file;
  latestPrediction = null;
  previewUrl = URL.createObjectURL(file);
  elements.previewImage.src = previewUrl;
  elements.previewFilename.textContent = file.name;
  elements.uploadEmpty.hidden = true;
  elements.previewWrap.hidden = false;
  elements.analyzeButton.disabled = false;
  elements.overlay.replaceChildren();
  elements.resultsContent.hidden = true;
  elements.resultsEmpty.hidden = false;
  setAnalyzeMessage("Image ready. Analyze it when you’re ready.");
}

function clearSelectedFile() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  selectedFile = null;
  latestPrediction = null;
  elements.input.value = "";
  elements.previewImage.removeAttribute("src");
  elements.overlay.replaceChildren();
  elements.previewWrap.hidden = true;
  elements.uploadEmpty.hidden = false;
  elements.analyzeButton.disabled = true;
  elements.resultsContent.hidden = true;
  elements.resultsEmpty.hidden = false;
  setAnalyzeMessage("Choose a meal image to get started.");
}

function setAnalyzing(isAnalyzing) {
  elements.analyzeButton.disabled = isAnalyzing || !selectedFile;
  elements.analyzeButton.classList.toggle("loading", isAnalyzing);
  elements.analyzeButton.querySelector(".button-label").textContent = isAnalyzing ? "Analyzing…" : "Analyze food";
}

function validPrediction(data) {
  return data && typeof data === "object"
    && Array.isArray(data.meal_summary)
    && Array.isArray(data.detections)
    && data.total_nutrition && typeof data.total_nutrition === "object"
    && typeof data.meal_type === "string"
    && Number.isInteger(data.total_objects)
    && data.total_objects >= 0
    && data.total_objects === data.detections.length
    && nutrientConfig.every(({ key }) => Number.isFinite(Number(data.total_nutrition[key])))
    && data.meal_summary.every((item) => item
      && typeof item.food === "string"
      && Number.isFinite(Number(item.quantity))
      && Number.isFinite(Number(item.calories))
      && Number.isFinite(Number(item.protein))
      && Number.isFinite(Number(item.carbs))
      && Number.isFinite(Number(item.fat)));
}

async function analyzeMeal() {
  if (!validateImage(selectedFile)) return;
  const formData = new FormData();
  formData.append("file", selectedFile);
  setAnalyzing(true);
  setAnalyzeMessage("Your meal is being analyzed…");

  try {
    const prediction = await requestJson("/predict", { method: "POST", body: formData });
    if (!validPrediction(prediction)) throw new Error("The prediction response did not contain the expected meal details.");
    latestPrediction = prediction;
    renderDetections(prediction.detections);
    renderPrediction(prediction);
    setAnalyzeMessage(
      prediction.total_objects === 0
        ? "No food was detected. Try a clearer, well-lit image with the food in view."
        : "Analysis complete. Review your meal before saving.",
      prediction.total_objects === 0 ? "error" : "success"
    );
  } catch (error) {
    setAnalyzeMessage(error.message, "error");
    showToast(error.message, true);
  } finally {
    setAnalyzing(false);
  }
}

function renderDetections(detections) {
  const image = elements.previewImage;
  const { naturalWidth: width, naturalHeight: height } = image;
  if (!width || !height) return;
  elements.overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
  elements.overlay.setAttribute("preserveAspectRatio", "none");

  const colors = ["#4bb87a", "#df9d43", "#8f78cf", "#dc7180", "#4e9bbb"];
  const boxElements = [];
  detections.forEach((detection, index) => {
    const box = detection.box;
    if (!box || ![box.x1, box.y1, box.x2, box.y2].every((coordinate) => Number.isFinite(Number(coordinate)))) return;
    const x = Math.max(0, Number(box.x1));
    const y = Math.max(0, Number(box.y1));
    const boxWidth = Math.max(0, Math.min(width, Number(box.x2)) - x);
    const boxHeight = Math.max(0, Math.min(height, Number(box.y2)) - y);
    if (!boxWidth || !boxHeight) return;
    const color = colors[index % colors.length];
    const label = `${detection.food || "Food"} ${formatNumber(Number(detection.confidence) * 100, 0)}%`;
    const labelWidth = Math.min(width - x, Math.max(72, label.length * 7 + 14));
    const labelY = Math.max(0, y - 23);
    boxElements.push(`<rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" fill="${color}" fill-opacity=".08" stroke="${color}" stroke-width="${Math.max(2, width / 320)}" vector-effect="non-scaling-stroke" rx="4"></rect>
      <rect x="${x}" y="${labelY}" width="${labelWidth}" height="22" rx="5" fill="${color}"></rect>
      <text x="${x + 7}" y="${labelY + 15}" class="box-label">${escapeHtml(label)}</text>`);
  });
  elements.overlay.innerHTML = boxElements.join("");
}

function renderPrediction(prediction) {
  elements.resultsEmpty.hidden = true;
  elements.resultsContent.hidden = false;
  if (!prediction.total_objects) {
    elements.resultsContent.innerHTML = `<div class="no-detections">No food was detected in this image. No meal was saved. Try another image with the plate clearly visible.</div>`;
    return;
  }

  const foods = prediction.meal_summary.map((item) => {
    const matchingDetections = prediction.detections.filter((detection) => detection.food === item.food);
    const confidence = matchingDetections.length
      ? Math.max(...matchingDetections.map((detection) => Number(detection.confidence) || 0))
      : null;
    const confidenceText = confidence === null ? "Nutrition estimate" : `${formatNumber(confidence * 100, 0)}% confidence`;
    return `<div class="detection-row">
      <div><div class="detection-name">${escapeHtml(item.food)}</div><div class="detection-meta">${formatNumber(item.quantity, 0)} serving${Number(item.quantity) === 1 ? "" : "s"}${item.serving ? ` · ${escapeHtml(item.serving)}` : ""}</div></div>
      <span class="detection-confidence">${confidenceText}</span>
    </div>`;
  }).join("");

  const nutrition = prediction.total_nutrition;
  const nutrients = nutrientConfig.map(({ key, label, unit }) =>
    `<div class="summary-nutrient"><strong>${formatNumber(nutrition[key])}</strong>${label} (${unit})</div>`
  ).join("");
  elements.resultsContent.innerHTML = `
    <div class="results-title-row"><h3>What we found</h3><span class="meal-type-pill">${escapeHtml(formatMealType(prediction.meal_type))}</span></div>
    <div class="detection-list">${foods || `<div class="no-detections">Detections were returned, but no nutrition items are available to summarize.</div>`}</div>
    <div class="nutrition-summary"><div class="summary-heading">Estimated nutrition</div><div class="summary-nutrients">${nutrients}</div></div>
    ${prediction.meal_summary.length
      ? `<div class="summary-actions"><p>Review this estimate before adding it to your journal.</p><button class="primary-button save-button" id="save-meal-button" type="button">Save meal <span aria-hidden="true">↗</span></button></div>`
      : `<div class="no-detections">Food was detected, but the API returned no nutrition items to save.</div>`}`;
  const saveButton = document.querySelector("#save-meal-button");
  if (saveButton) saveButton.addEventListener("click", saveMeal);
}

async function saveMeal() {
  if (!latestPrediction || latestPrediction.total_objects === 0) {
    setAnalyzeMessage("Analyze a meal with detected food before saving.", "error");
    return;
  }
  const button = document.querySelector("#save-meal-button");
  if (!button || button.disabled) return;
  button.disabled = true;
  button.textContent = "Saving…";
  try {
    const result = await requestJson("/save-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meal_type: latestPrediction.meal_type,
        meal_summary: latestPrediction.meal_summary,
        total_nutrition: latestPrediction.total_nutrition
      })
    });
    if (!Number.isFinite(Number(result.meal_id))) throw new Error("The save response did not include a meal ID.");
    button.textContent = "Meal saved";
    setAnalyzeMessage("Your meal is saved in your journal.", "success");
    showToast("Meal saved to your FoodLens journal.");
    latestPrediction = null;
    await Promise.all([loadDashboard(), loadHistory(), loadRecommendations()]);
  } catch (error) {
    button.disabled = false;
    button.innerHTML = 'Save meal <span aria-hidden="true">↗</span>';
    setAnalyzeMessage(error.message, "error");
    showToast(error.message, true);
  }
}

function renderHistory(data) {
  if (!data || !Array.isArray(data.meals)) throw new Error("The meal history response is invalid.");
  if (data.meals.length === 0) {
    elements.historyList.innerHTML = `<div class="empty-state"><span>◷</span><strong>Your journal is ready</strong>Saved meals will appear here. Analyze a meal and choose Save meal to begin.</div>`;
    return;
  }
  const validMeals = data.meals.every((meal) => meal
    && Number.isFinite(Number(meal.id))
    && typeof meal.meal_date === "string"
    && typeof meal.meal_type === "string"
    && ["total_calories", "total_protein", "total_carbs", "total_fat"].every((key) => Number.isFinite(Number(meal[key]))));
  if (!validMeals) throw new Error("The meal history contains an invalid meal record.");

  elements.historyList.innerHTML = data.meals.slice(0, 6).map((meal) => {
    const date = new Date(meal.meal_date);
    const dateText = Number.isNaN(date.getTime())
      ? "Date unavailable"
      : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
    const amount = formatNumber(meal.total_calories, 0);
    return `<button class="history-item" type="button" data-meal-id="${escapeHtml(meal.id)}" aria-label="View ${escapeHtml(formatMealType(meal.meal_type))} meal from ${escapeHtml(dateText)}">
      <span class="history-icon" aria-hidden="true">◷</span>
      <span class="history-main"><strong>${escapeHtml(formatMealType(meal.meal_type))} <span aria-hidden="true">·</span> ${escapeHtml(dateText)}</strong><span>${formatNumber(meal.total_protein)}g protein · ${formatNumber(meal.total_carbs)}g carbs · ${formatNumber(meal.total_fat)}g fat</span></span>
      <span class="history-calories">${amount} kcal</span>
    </button>`;
  }).join("");

  elements.historyList.querySelectorAll("[data-meal-id]").forEach((button) => {
    button.addEventListener("click", () => loadMealDetails(button.dataset.mealId));
  });
}

async function loadHistory() {
  try {
    renderHistory(await requestJson("/meals"));
  } catch (error) {
    elements.historyList.innerHTML = `<div class="empty-state"><span>!</span><strong>Couldn’t load meal history</strong>${escapeHtml(error.message)}</div>`;
  }
}

function renderMealDetails(meal) {
  if (!meal || meal.error) throw new Error(meal && meal.error ? meal.error : "The meal detail response is invalid.");
  if (!Number.isFinite(Number(meal.id))
    || typeof meal.meal_date !== "string"
    || typeof meal.meal_type !== "string"
    || !["total_calories", "total_protein", "total_carbs", "total_fat"].every((key) => Number.isFinite(Number(meal[key])))
    || !Array.isArray(meal.items)) {
    throw new Error("The meal detail response is incomplete.");
  }
  const date = new Date(meal.meal_date);
  const dateText = Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "short" }).format(date);
  const values = [
    ["total_calories", "Calories", "kcal"],
    ["total_protein", "Protein", "g"],
    ["total_carbs", "Carbs", "g"],
    ["total_fat", "Fat", "g"]
  ].map(([key, label, unit]) =>
    `<div><strong>${formatNumber(meal[key])}</strong><span>${label} · ${unit}</span></div>`
  ).join("");
  const items = meal.items;
  const itemMarkup = items.length
    ? items.map((item) => `<div class="detail-food-item"><div><strong>${escapeHtml(item.food_name)}</strong><br><span>${formatNumber(item.quantity, 0)} serving${Number(item.quantity) === 1 ? "" : "s"}</span></div><span>${formatNumber(item.calories, 0)} kcal</span></div>`).join("")
    : `<div class="empty-state">No item details were returned for this meal.</div>`;

  elements.mealDialogContent.innerHTML = `
    <p class="detail-date">${escapeHtml(dateText)} · ${escapeHtml(formatMealType(meal.meal_type))}</p>
    <div class="detail-nutrition">${values}</div>
    <h3 class="detail-items-title">Foods in this meal</h3>${itemMarkup}`;
}

async function loadMealDetails(mealId) {
  try {
    const meal = await requestJson(`/meals/${encodeURIComponent(mealId)}`);
    renderMealDetails(meal);
    elements.mealDialog.showModal();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function loadRecommendations() {
  try {
    const data = await requestJson("/recommendations/today");
    if (!Array.isArray(data.recommendations)
      || !data.recommendations.every((recommendation) => typeof recommendation === "string")
      || typeof data.meal_type !== "string") {
      throw new Error("The recommendations response is invalid.");
    }
    elements.recommendationMealType.innerHTML = `<span class="context-dot"></span> Current meal · ${escapeHtml(formatMealType(data.meal_type))}`;
    elements.recommendationsList.innerHTML = data.recommendations.length
      ? data.recommendations.map((recommendation) => `<div class="recommendation-item"><span aria-hidden="true">✳</span><span>${escapeHtml(recommendation)}</span></div>`).join("")
      : `<div class="empty-state">No recommendations were returned right now.</div>`;
  } catch (error) {
    elements.recommendationMealType.innerHTML = `<span class="context-dot"></span> Current meal unavailable`;
    elements.recommendationsList.innerHTML = `<div class="empty-state"><span>!</span><strong>Recommendations unavailable</strong>${escapeHtml(error.message)}</div>`;
  }
}

async function checkBackendHealth() {
  try {
    const health = await requestJson("/health");
    if (health.status !== "ok" || health.model !== "YOLO11s" || !Number.isFinite(Number(health.classes))) {
      throw new Error(`Unexpected /health response: ${JSON.stringify(health)}`);
    }
    console.info("[FoodLens API] Health check passed:", health);
  } catch (error) {
    console.error("[FoodLens API] Health check failed:", error);
    setApiStatus("disconnected", "Backend health check failed");
  }
}

function setTodayDate() {
  elements.todayDate.textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());
}

function setupNavigation() {
  const pageName = document.querySelector("#page-name");
  const sectionNames = new Map([
    ["dashboard", "Overview"],
    ["analyze", "Analyze meal"],
    ["history", "Meal history"],
    ["recommendations", "For you"]
  ]);
  const links = [...document.querySelectorAll(".nav-link")];
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    const id = visible.target.id;
    pageName.textContent = sectionNames.get(id) || "Overview";
    links.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${id}`));
  }, { rootMargin: "-15% 0px -70% 0px", threshold: [0, .2, .5] });
  sectionNames.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) observer.observe(section);
  });
}

elements.chooseImage.addEventListener("click", (event) => {
  event.stopPropagation();
  elements.input.click();
});
elements.dropZone.addEventListener("click", (event) => {
  if (event.target.closest("button")) return;
  elements.input.click();
});
elements.dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    elements.input.click();
  }
});
elements.input.addEventListener("change", () => {
  if (elements.input.files && elements.input.files[0]) setSelectedFile(elements.input.files[0]);
});
elements.removeImage.addEventListener("click", clearSelectedFile);
elements.analyzeButton.addEventListener("click", analyzeMeal);
elements.refreshHistory.addEventListener("click", loadHistory);
elements.closeDialog.addEventListener("click", () => elements.mealDialog.close());
elements.mealDialog.addEventListener("click", (event) => {
  if (event.target === elements.mealDialog) elements.mealDialog.close();
});
["dragenter", "dragover"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("dragging");
  });
});
["dragleave", "drop"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("dragging");
  });
});
elements.dropZone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file) setSelectedFile(file);
});
elements.previewImage.addEventListener("load", () => {
  if (latestPrediction) renderDetections(latestPrediction.detections);
});
window.addEventListener("beforeunload", () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
});

setTodayDate();
setupNavigation();
checkBackendHealth();
loadDashboard();
loadHistory();
loadRecommendations();
