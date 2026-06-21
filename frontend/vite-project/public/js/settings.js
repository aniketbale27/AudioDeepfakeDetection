// Manages user customization settings and persists them in localStorage.
document.addEventListener("DOMContentLoaded", function () {
  const {
    requireAuth,
    getSettings,
    saveSettings,
    applySettings,
    clearSession,
  } = window.ADS;

  const session = requireAuth();
  if (!session) {
    return;
  }

  const modeToggle = document.getElementById("modeToggle");
  const modeLabel = document.getElementById("modeLabel");
  const accentOptions = document.querySelectorAll("input[name='accentColor']");
  const fontSizeSelect = document.getElementById("fontSizeSelect");
  const animationToggle = document.getElementById("animationToggle");
  const saveButton = document.getElementById("saveSettingsBtn");
  const resetButton = document.getElementById("resetSettingsBtn");
  const messageNode = document.getElementById("settingsMessage");
  const logoutButton = document.getElementById("sidebarLogoutBtn");

  function setMessage(text, isError) {
    messageNode.textContent = text || "";
    messageNode.classList.toggle("error-text", Boolean(isError));
    messageNode.classList.toggle("success-text", !isError && Boolean(text));
  }

  function hydrateFormFromSettings(settings) {
    modeToggle.checked = settings.mode === "light";
    modeLabel.textContent = settings.mode === "light" ? "Light Mode" : "Dark Mode";

    accentOptions.forEach(function (option) {
      option.checked = option.value === settings.accent;
    });

    fontSizeSelect.value = settings.fontSize;
    animationToggle.checked = settings.animations;
  }

  function getSettingsFromForm() {
    const selectedAccent = document.querySelector("input[name='accentColor']:checked");
    return {
      mode: modeToggle.checked ? "light" : "dark",
      accent: selectedAccent ? selectedAccent.value : "default-dark",
      fontSize: fontSizeSelect.value,
      animations: animationToggle.checked,
    };
  }

  function applyAndPersist() {
    const updatedSettings = saveSettings(getSettingsFromForm());
    applySettings();
    hydrateFormFromSettings(updatedSettings);
    return updatedSettings;
  }

  modeToggle.addEventListener("change", function () {
    modeLabel.textContent = modeToggle.checked ? "Light Mode" : "Dark Mode";
    applyAndPersist();
  });

  accentOptions.forEach(function (option) {
    option.addEventListener("change", function () {
      applyAndPersist();
    });
  });

  fontSizeSelect.addEventListener("change", function () {
    applyAndPersist();
  });

  animationToggle.addEventListener("change", function () {
    applyAndPersist();
  });

  saveButton.addEventListener("click", function () {
    applyAndPersist();
    setMessage("Settings saved successfully.", false);
  });

  resetButton.addEventListener("click", function () {
    const defaults = {
      mode: "dark",
      accent: "default-dark",
      fontSize: "medium",
      animations: true,
    };

    saveSettings(defaults);
    applySettings();
    hydrateFormFromSettings(defaults);
    setMessage("Settings reset to defaults.", false);
  });

  logoutButton.addEventListener("click", function () {
    clearSession();
    window.location.replace("/profile.html");
  });

  const currentSettings = getSettings();
  hydrateFormFromSettings(currentSettings);
  applySettings();
});
