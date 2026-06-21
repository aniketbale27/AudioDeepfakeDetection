// Shared utility helpers for Profile, History, and Settings pages.
(function () {
  const STORAGE_KEYS = Object.freeze({
    session: "audio_spoof_session",
    settings: "audio_spoof_settings",
    apiBaseUrl: "audio_spoof_api_base_url",
  });

  const DEFAULT_SETTINGS = Object.freeze({
    mode: "dark",
    accent: "default-dark",
    fontSize: "medium",
    animations: true,
  });

  const DEFAULT_API_BASE_URL = "http://127.0.0.1:5000";

  function safeParse(rawValue, fallback) {
    try {
      return rawValue ? JSON.parse(rawValue) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getApiBaseUrl() {
    return (
      localStorage.getItem(STORAGE_KEYS.apiBaseUrl)?.trim() || DEFAULT_API_BASE_URL
    ).replace(/\/$/, "");
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      const message =
        (data && (data.detail || data.message || data.error)) ||
        `Request failed (${response.status})`;
      throw new Error(message);
    }

    return data;
  }

  function normalizeUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      joinedAt: user.joined_at || user.joinedAt,
    };
  }

  function normalizeHistory(entry) {
    return {
      id: entry.id,
      userId: entry.user_id || entry.userId,
      fileName: entry.file_name || entry.fileName,
      prediction: entry.prediction,
      confidence: Number(entry.confidence || 0),
      realScore: Number(entry.real_score ?? entry.realScore ?? 0),
      fakeScore: Number(entry.fake_score ?? entry.fakeScore ?? 0),
      timestamp: entry.timestamp,
    };
  }

  async function registerUser(payload) {
    const data = await apiRequest("/api/users/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeUser(data);
  }

  async function loginUser(payload) {
    const data = await apiRequest("/api/users/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeUser(data);
  }

  async function getUserById(userId) {
    const data = await apiRequest(`/api/users/${userId}`, {
      method: "GET",
    });
    return normalizeUser(data);
  }

  async function updateUserProfile(userId, payload) {
    const data = await apiRequest(`/api/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return normalizeUser(data);
  }

  async function createHistoryEntry(payload) {
    const data = await apiRequest("/api/history", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return normalizeHistory(data);
  }

  async function getHistoryByUser(userId) {
    const data = await apiRequest(`/api/history/user/${userId}`, {
      method: "GET",
    });
    return Array.isArray(data) ? data.map(normalizeHistory) : [];
  }

  async function deleteHistoryById(entryId) {
    return apiRequest(`/api/history/${entryId}`, {
      method: "DELETE",
    });
  }

  async function clearHistoryByUser(userId) {
    return apiRequest(`/api/history/user/${userId}`, {
      method: "DELETE",
    });
  }

  function getSession() {
    return safeParse(localStorage.getItem(STORAGE_KEYS.session), null);
  }

  function setSession(sessionUser) {
    saveJson(STORAGE_KEYS.session, sessionUser);
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.session);
  }

  function getSettings() {
    const saved = safeParse(localStorage.getItem(STORAGE_KEYS.settings), {});
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
    };
  }

  function saveSettings(settings) {
    const merged = {
      ...DEFAULT_SETTINGS,
      ...settings,
    };
    saveJson(STORAGE_KEYS.settings, merged);
    return merged;
  }

  function applySettings() {
    const settings = getSettings();
    const root = document.documentElement;

    root.setAttribute("data-mode", settings.mode);
    root.setAttribute("data-accent", settings.accent);
    root.setAttribute("data-font-size", settings.fontSize);
    root.setAttribute("data-animations", settings.animations ? "on" : "off");

    document.body.classList.toggle("animations-off", !settings.animations);

    return settings;
  }

  function requireAuth() {
    const session = getSession();
    if (!session) {
      const next = encodeURIComponent(window.location.pathname);
      window.location.replace(`/profile.html?next=${next}`);
      return null;
    }
    return session;
  }

  function formatDate(isoString) {
    if (!isoString) {
      return "N/A";
    }
    return new Date(isoString).toLocaleDateString();
  }

  function formatDateTime(isoString) {
    if (!isoString) {
      return "N/A";
    }
    return new Date(isoString).toLocaleString();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function updateSidebarUser() {
    const userNode = document.querySelector("[data-user-slot]");
    if (!userNode) {
      return;
    }

    const session = getSession();
    if (!session) {
      userNode.textContent = "Guest";
      return;
    }

    userNode.textContent = `${session.name} (${session.email})`;
  }

  window.ADS = {
    STORAGE_KEYS,
    DEFAULT_SETTINGS,
    DEFAULT_API_BASE_URL,
    getApiBaseUrl,
    apiRequest,
    registerUser,
    loginUser,
    getUserById,
    updateUserProfile,
    createHistoryEntry,
    getHistoryByUser,
    deleteHistoryById,
    clearHistoryByUser,
    getSession,
    setSession,
    clearSession,
    getSettings,
    saveSettings,
    applySettings,
    requireAuth,
    formatDate,
    formatDateTime,
    isValidEmail,
    updateSidebarUser,
  };

  document.addEventListener("DOMContentLoaded", function () {
    applySettings();
    updateSidebarUser();

    const activePage = document.body.getAttribute("data-page");
    if (activePage) {
      const activeNav = document.querySelector(`[data-nav='${activePage}']`);
      if (activeNav) {
        activeNav.classList.add("active");
      }
    }
  });
})();
