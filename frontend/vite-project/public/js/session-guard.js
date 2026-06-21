// Guards the main app route and auto-saves prediction history to backend APIs.
(function () {
  const KEYS = {
    session: "audio_spoof_session",
    settings: "audio_spoof_settings",
    apiBaseUrl: "audio_spoof_api_base_url",
  };

  const DEFAULT_SETTINGS = {
    mode: "dark",
    accent: "default-dark",
    fontSize: "medium",
    animations: true,
  };

  function safeParse(rawValue, fallback) {
    try {
      return rawValue ? JSON.parse(rawValue) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function getSession() {
    return safeParse(localStorage.getItem(KEYS.session), null);
  }

  function getSettings() {
    const saved = safeParse(localStorage.getItem(KEYS.settings), {});
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
    };
  }

  function getApiBaseUrl() {
    return (
      localStorage.getItem(KEYS.apiBaseUrl)?.trim() || "http://127.0.0.1:5000"
    ).replace(/\/$/, "");
  }

  function applySettings() {
    const settings = getSettings();
    const root = document.documentElement;

    root.setAttribute("data-mode", settings.mode);
    root.setAttribute("data-accent", settings.accent);
    root.setAttribute("data-font-size", settings.fontSize);
    root.setAttribute("data-animations", settings.animations ? "on" : "off");
  }

  async function postHistoryEntry(entry) {
    await fetch(`${getApiBaseUrl()}/api/history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(entry),
    });
  }

  function buildHistoryEntry(resultPayload, requestConfig) {
    const body = requestConfig && requestConfig.body;
    const fileFromForm = body instanceof FormData ? body.get("file") : null;
    const session = getSession();

    if (!session || !session.id) {
      return null;
    }

    return {
      user_id: session.id,
      file_name: resultPayload.file_name || (fileFromForm && fileFromForm.name) || "Unknown file",
      prediction: resultPayload.prediction || "N/A",
      confidence: Number(resultPayload.confidence || 0),
      real_score: Number(resultPayload.ensemble_real_score ?? resultPayload.real_score ?? 0),
      fake_score: Number(resultPayload.ensemble_fake_score ?? resultPayload.fake_score ?? 0),
      timestamp: new Date().toISOString(),
    };
  }

  function isPredictRequest(resource, requestConfig) {
    const url = typeof resource === "string" ? resource : resource.url;
    const method = (requestConfig && requestConfig.method)
      || (resource && resource.method)
      || "GET";

    if (method.toUpperCase() !== "POST") {
      return false;
    }

    try {
      const parsedUrl = new URL(url, window.location.origin);
      return parsedUrl.pathname.endsWith("/predict");
    } catch (error) {
      return false;
    }
  }

  applySettings();

  if (!getSession()) {
    const next = encodeURIComponent(window.location.pathname);
    window.location.replace(`/profile.html?next=${next}`);
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (resource, requestConfig) {
    const response = await originalFetch(resource, requestConfig);

    if (!response.ok || !isPredictRequest(resource, requestConfig)) {
      return response;
    }

    try {
      const cloned = response.clone();
      const contentType = cloned.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const payload = await cloned.json();
        if (payload && payload.prediction) {
          const historyEntry = buildHistoryEntry(payload, requestConfig);
          if (historyEntry) {
            await postHistoryEntry(historyEntry);
          }
        }
      }
    } catch (error) {
      // Ignore history save failures so prediction flow is never interrupted.
    }

    return response;
  };
})();
