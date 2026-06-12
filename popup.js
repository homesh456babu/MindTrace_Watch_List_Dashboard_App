// popup.js

let historyData = [];
let activeTab = "all";
let searchQuery = "";

// Initialize popup
document.addEventListener("DOMContentLoaded", () => {
  initUI();
  loadHistory();
  setupListeners();
});

function initUI() {
  const list = document.getElementById("list");
  list.innerHTML = `<div class="loading-state">Loading history...</div>`;
}

function loadHistory() {
  chrome.storage.local.get(["history"], (result) => {
    historyData = result.history || [];
    renderDashboard();
  });
}

function setupListeners() {
  // Search input
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderList();
  });

  // Tabs
  const tabButtons = document.querySelectorAll(".tab-btn");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeTab = btn.getAttribute("data-tab");
      renderList();
    });
  });

  // Clear History
  const clearBtn = document.getElementById("clear-btn");
  clearBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all your reading and watching history? This cannot be undone.")) {
      chrome.storage.local.set({ history: [] }, () => {
        historyData = [];
        renderDashboard();
      });
    }
  });

  // Listen for background updates (e.g. LLM insight finished, duration updated)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.history) {
      historyData = changes.history.newValue || [];
      renderDashboard();
    }
  });
}

function renderDashboard() {
  renderStats();
  renderList();
}

function renderStats() {
  let totalSeconds = 0;
  let articles = 0;
  let videos = 0;

  historyData.forEach(item => {
    totalSeconds += (item.timeSpent || 0);
    if (item.isVideo) {
      videos++;
    } else {
      articles++;
    }
  });

  // Format total time spent
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  
  let timeStr = "0m";
  if (totalHours > 0) {
    timeStr = `${totalHours}h ${totalMinutes % 60}m`;
  } else if (totalMinutes > 0) {
    timeStr = `${totalMinutes}m ${totalSeconds % 60}s`;
  } else {
    timeStr = `${totalSeconds}s`;
  }

  document.getElementById("stat-time").textContent = timeStr;
  document.getElementById("stat-read").textContent = articles;
  document.getElementById("stat-watch").textContent = videos;
}

function renderList() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  // Apply tab filter
  let filtered = historyData;
  if (activeTab === "reading") {
    filtered = historyData.filter(item => !item.isVideo);
  } else if (activeTab === "watching") {
    filtered = historyData.filter(item => item.isVideo);
  }

  // Apply search query filter
  if (searchQuery) {
    filtered = filtered.filter(item => 
      (item.title && item.title.toLowerCase().includes(searchQuery)) ||
      (item.url && item.url.toLowerCase().includes(searchQuery))
    );
  }

  if (filtered.length === 0) {
    const emptyMsg = searchQuery 
      ? `No results found matching "${searchQuery}" 🔍`
      : `No ${activeTab === 'all' ? 'history' : activeTab} logged yet. Go browse some articles or videos! 🚀`;
    
    list.innerHTML = `<div class="empty-state">${emptyMsg}</div>`;
    return;
  }

  // Reverse list to show most recent first
  const displayItems = [...filtered].reverse();

  displayItems.forEach(item => {
    const card = document.createElement("div");
    card.className = `history-card ${item.isVideo ? 'watching-card' : 'reading-card'}`;

    // Format individual time spent
    const m = Math.floor((item.timeSpent || 0) / 60);
    const s = (item.timeSpent || 0) % 60;
    const durationStr = m > 0 ? `${m}m ${s}s` : `${s}s`;

    // Format date
    const date = new Date(item.timestamp);
    const dateStr = date.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // Header section of card (Title + category badge + delete button)
    const cardHeader = document.createElement("div");
    cardHeader.className = "card-header";
    
    const badgeHtml = item.isVideo 
      ? `<span class="badge badge-watching">🎥 Video</span>`
      : `<span class="badge badge-reading">📚 Article</span>`;

    cardHeader.innerHTML = `
      <div class="card-title-container">
        ${badgeHtml}
        <h4 class="card-title" title="${item.title}">${item.title}</h4>
      </div>
      <button class="delete-item-btn" data-id="${item.id}" title="Delete item">✕</button>
    `;

    // Metadata section (URL + stats line)
    const cardMeta = document.createElement("div");
    cardMeta.className = "card-meta";
    cardMeta.innerHTML = `
      <a href="${item.url}" target="_blank" class="card-url" title="${item.url}">${item.url}</a>
      <div class="meta-row">
        <span>⏱️ <b>${durationStr}</b> active dwell</span>
        <span>📅 ${dateStr}</span>
      </div>
    `;

    // Insight section
    const insightSection = document.createElement("div");
    insightSection.className = "insight-section";

    if (!item.insight) {
      insightSection.innerHTML = `
        <div class="insight-box loading-insight">
          <span class="pulsing-dot"></span>
          <span>Generating AI Insight...</span>
        </div>
      `;
    } else if (item.insight.startsWith("⚠️")) {
      insightSection.innerHTML = `
        <div class="insight-box error-insight">
          <span>${item.insight}</span>
        </div>
      `;
    } else {
      insightSection.innerHTML = `
        <div class="insight-box success-insight">
          <div class="insight-content">
            <b>🧠 Insight:</b>
            <p>${item.insight}</p>
          </div>
          <button class="copy-btn" data-insight="${item.insight.replace(/"/g, '&quot;')}" title="Copy insight">📋</button>
        </div>
      `;
    }

    card.appendChild(cardHeader);
    card.appendChild(cardMeta);
    card.appendChild(insightSection);
    
    list.appendChild(card);
  });

  // Setup interactions on rendered elements
  setupCardInteractions();
}

function setupCardInteractions() {
  // Delete buttons
  const deleteBtns = document.querySelectorAll(".delete-item-btn");
  deleteBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-id");
      deleteHistoryItem(id);
    });
  });

  // Copy buttons
  const copyBtns = document.querySelectorAll(".copy-btn");
  copyBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const insight = btn.getAttribute("data-insight");
      navigator.clipboard.writeText(insight).then(() => {
        btn.textContent = "✅";
        setTimeout(() => {
          btn.textContent = "📋";
        }, 1500);
      });
    });
  });
}

function deleteHistoryItem(id) {
  chrome.storage.local.get(["history"], (result) => {
    const history = result.history || [];
    const updated = history.filter(item => item.id !== id);
    chrome.storage.local.set({ history: updated }, () => {
      historyData = updated;
      renderDashboard();
    });
  });
}
