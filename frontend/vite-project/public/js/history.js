// Renders searchable/filterable prediction history with delete and clear actions.
document.addEventListener("DOMContentLoaded", function () {
  const {
    requireAuth,
    getHistoryByUser,
    deleteHistoryById,
    clearHistoryByUser,
    formatDateTime,
    clearSession,
  } = window.ADS;

  const session = requireAuth();
  if (!session) {
    return;
  }

  const searchInput = document.getElementById("historySearch");
  const resultFilter = document.getElementById("historyFilter");
  const clearAllButton = document.getElementById("clearAllHistoryBtn");
  const listContainer = document.getElementById("historyList");
  const statsNode = document.getElementById("historyStats");
  const logoutButton = document.getElementById("sidebarLogoutBtn");

  let allEntries = [];

  function formatPercent(score) {
    return `${(Number(score || 0) * 100).toFixed(2)}%`;
  }

  function buildStats(entries) {
    const realCount = entries.filter(function (item) {
      return item.prediction === "REAL";
    }).length;

    const fakeCount = entries.filter(function (item) {
      return item.prediction === "DEEPFAKE";
    }).length;

    statsNode.textContent = `Total: ${entries.length} | REAL: ${realCount} | DEEPFAKE: ${fakeCount}`;
  }

  function renderEntries() {
    const keyword = searchInput.value.trim().toLowerCase();
    const filterValue = resultFilter.value;

    const filtered = allEntries.filter(function (entry) {
      const safeFileName = (entry.fileName || "").toString();
      const fileMatch = safeFileName.toLowerCase().includes(keyword);
      const predictionMatch = filterValue === "ALL" || entry.prediction === filterValue;
      return fileMatch && predictionMatch;
    });

    buildStats(filtered);

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state-card">
          <h3>No history records found</h3>
          <p>Try another search term, filter, or run a new prediction.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered
      .map(function (entry) {
        const badgeClass = entry.prediction === "REAL" ? "badge-real" : "badge-fake";

        return `
          <article class="history-card" data-id="${entry.id}">
            <div class="history-top-row">
              <h3 class="file-name">${entry.fileName}</h3>
              <span class="result-badge ${badgeClass}">${entry.prediction}</span>
            </div>
            <div class="history-meta-grid">
              <p><strong>Confidence:</strong> ${formatPercent(entry.confidence)}</p>
              <p><strong>Real Score:</strong> ${formatPercent(entry.realScore)}</p>
              <p><strong>Fake Score:</strong> ${formatPercent(entry.fakeScore)}</p>
              <p><strong>Timestamp:</strong> ${formatDateTime(entry.timestamp)}</p>
            </div>
            <div class="history-actions">
              <button type="button" class="danger-btn" data-action="delete" data-id="${entry.id}">Delete</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function loadHistory() {
    listContainer.innerHTML = `
      <div class="empty-state-card">
        <h3>Loading history...</h3>
      </div>
    `;

    try {
      allEntries = await getHistoryByUser(session.id);
    } catch (error) {
      allEntries = [];
      listContainer.innerHTML = `
        <div class="empty-state-card">
          <h3>Failed to load history</h3>
          <p>${error.message || "Please try again."}</p>
        </div>
      `;
      statsNode.textContent = "Total: 0 | REAL: 0 | DEEPFAKE: 0";
      return;
    }

    renderEntries();
  }

  listContainer.addEventListener("click", async function (event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.getAttribute("data-action");
    if (action !== "delete") {
      return;
    }

    const id = target.getAttribute("data-id");
    if (!id) {
      return;
    }

    try {
      await deleteHistoryById(id);
      allEntries = allEntries.filter(function (entry) {
        return entry.id !== id;
      });
      renderEntries();
    } catch (error) {
      window.alert(error.message || "Failed to delete history entry.");
    }
  });

  clearAllButton.addEventListener("click", async function () {
    if (!allEntries.length) {
      return;
    }

    const confirmed = window.confirm("Clear all prediction history?");
    if (!confirmed) {
      return;
    }

    try {
      await clearHistoryByUser(session.id);
      allEntries = [];
      renderEntries();
    } catch (error) {
      window.alert(error.message || "Failed to clear history.");
    }
  });

  searchInput.addEventListener("input", renderEntries);
  resultFilter.addEventListener("change", renderEntries);

  logoutButton.addEventListener("click", function () {
    clearSession();
    window.location.replace("/profile.html");
  });

  loadHistory();
});

