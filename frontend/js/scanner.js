const scannerApp = document.createElement("script");
scannerApp.src = "script.js";
scannerApp.addEventListener("error", () => {
  window.FoodLensUI.showToast("The food scanner could not be loaded. Please refresh and try again.", "error");
});
document.body.appendChild(scannerApp);