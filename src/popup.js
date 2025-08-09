/**
 * Popup script for the Privacy Policy Extension
 * 
 * Responsibilities:
 * - Tab navigation (Summary, History, Settings shortcut)
 * - Policy summarization workflow and rendering
 * - History list rendering and deletion
 * - User notifications and confirmations
 * 
 * Notes for maintainers:
 * - Markdown rendering is handled by the vendored `libs/marked.js` and sanitized
 *   with `libs/dompurify.js` before injecting into DOM. Keep this order.
 * - Settings were moved to the dedicated options page; the popup only links to it.
 */

import {
  saveApiKey,
  getApiKey,
  getSummary,
  removeSummary,
  clearSummaries,
  saveLanguage,
  getLanguage,
} from "./storage.js";
import DOMPurify from "./libs/dompurify.js";
import { initI18n, t } from "./i18n.js";

// Import marked library locally (vendored in libs)
import { marked } from "./libs/marked.js";
import { showNotification, showConfirm } from "./notify.js";

// Global state variables
let currentPolicyUrl = "";
let currentTabId = 0;

/**
 * Switches between tabs in the popup interface
 * Updates tab visibility, ARIA attributes, and focus management
 * @param {string} name - The name of the tab to show
 */
function showTab(name) {
  // Hide all tab content
  document.querySelectorAll(".tab-content").forEach((el) => {
    el.classList.add("hidden");
    el.setAttribute("aria-hidden", "true");
  });
  
  // Show selected tab content
  const activePanel = document.getElementById(name);
  activePanel.classList.remove("hidden");
  activePanel.setAttribute("aria-hidden", "false");
  
  // Update tab button states
  const tabs = Array.from(document.querySelectorAll(".tab"));
  tabs.forEach((btn) => {
    const selected = btn.dataset.tab === name;
    btn.classList.toggle("active", selected);
    btn.classList.toggle("tab-active", selected);
    btn.classList.toggle("tab-inactive", !selected);
    btn.setAttribute("aria-selected", selected);
    btn.tabIndex = selected ? 0 : -1;
    if (selected) {
      btn.focus();
    }
  });
}

/**
 * Sets up tab navigation with keyboard support
 * Handles arrow key navigation and Enter/Space activation
 */
function setupTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  tabs.forEach((btn) => {
    if (btn.id === "tab-settings") {
      btn.addEventListener("click", async () => {
        // Abre la página de opciones en una nueva pestaña
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          window.open(chrome.runtime.getURL("pages/options.html"), "_blank");
        }
      });
      return;
    }
    btn.addEventListener("click", () => showTab(btn.dataset.tab));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const currentIndex = tabs.indexOf(e.currentTarget);
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const newIndex = (currentIndex + dir + tabs.length) % tabs.length;
        tabs[newIndex].focus();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showTab(btn.dataset.tab);
      }
    });
  });
  showTab("summary");
}

/**
 * Sets up the settings tab functionality
 * Handles API key and language preference management
 */
// Settings moved to dedicated options page



/**
 * Displays a summary in the summary element with proper formatting
 * Handles both simple text summaries and summaries with privacy scores
 * @param {string|object} summaryData - The summary data to display
 * @param {boolean} showScore - Whether to show privacy score (default: false)
 */
function displaySummary(summaryData, showScore = false) {
  const summaryEl = document.getElementById("summaryText");
  
  // Extract summary text and metadata
  let summaryText;
  let privacyScore;
  let scoreExplanation;

  if (typeof summaryData === 'string') {
    // Simple string format
    summaryText = summaryData;
    // No privacy score available in plain string format
  } else if (summaryData && typeof summaryData === 'object') {
    if (summaryData.privacy_score !== undefined) {
      // JSON format with privacy score
      privacyScore = summaryData.privacy_score;
      scoreExplanation = summaryData.score_explanation;
      summaryText = summaryData.summary;
    } else if (summaryData.summary) {
      // Object with summary property only
      summaryText = summaryData.summary;
    } else {
      // Fallback
      summaryText = t("summary.placeholderTitle");
    }
  } else {
    // Fallback for invalid data
    summaryText = t("summary.placeholderTitle");
  }
  
  // Ensure summaryText is a string
  summaryText = typeof summaryText === 'string' ? summaryText : String(summaryText);
  
  // Only show score when explicitly requested and the data includes it
  const shouldShowScore = showScore && privacyScore !== undefined;
  
  if (shouldShowScore && privacyScore !== undefined) {
    // Create score display with color coding
    const getScoreColor = (score) => {
      if (score <= 2) return 'text-green-600 bg-green-100';
      if (score <= 4) return 'text-blue-600 bg-blue-100';
      if (score <= 6) return 'text-yellow-600 bg-yellow-100';
      if (score <= 8) return 'text-orange-600 bg-orange-100';
      return 'text-red-600 bg-red-100';
    };
    
    const scoreColor = getScoreColor(privacyScore);
    
    summaryEl.innerHTML = `
      <div class="mb-4 p-4 rounded-lg border ${scoreColor}">
        <div class="flex items-center justify-between mb-2">
          <span class="font-semibold">${t("summary.privacyScore")}: ${privacyScore}/10</span>
          <span class="text-sm">${scoreExplanation}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="h-2 rounded-full ${scoreColor.includes('green') ? 'bg-green-600' : scoreColor.includes('blue') ? 'bg-blue-600' : scoreColor.includes('yellow') ? 'bg-yellow-600' : scoreColor.includes('orange') ? 'bg-orange-600' : 'bg-red-600'}" style="width: ${(privacyScore / 10) * 100}%"></div>
        </div>
      </div>
      <div class="summary-content">
        ${DOMPurify.sanitize(marked.parse(summaryText))}
      </div>
    `;
  } else {
    // Simple summary display without score
    summaryEl.innerHTML = DOMPurify.sanitize(marked.parse(summaryText));
  }
  
  // Set proper CSS class for styling
  summaryEl.className = "summary-content";
}


/**
  * Renders the history list with natural scroll
  * Displays stored policy summaries with domain, date, and action buttons
 */
async function renderHistory() {
  const listEl = document.getElementById("historyList");
  const clearBtn = document.getElementById("historyClear");
  const { summaries = {} } = await chrome.storage.local.get("summaries");
  const entries = Object.entries(summaries).map(([url, data]) => ({
    url,
    ...data,
  }));
  entries.sort((a, b) => (b.date || 0) - (a.date || 0));
  
  listEl.innerHTML = "";
  
  // Show empty state if no history
  if (entries.length === 0) {
    if (clearBtn) clearBtn.classList.add("hidden");
    listEl.innerHTML = `
      <div class="text-center py-8 text-secondary-500">
        <svg class="w-12 h-12 mx-auto mb-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <p class="text-sm">${t("history.emptyTitle")}</p>
        <p class="text-xs text-secondary-400">${t("history.emptySubtitle")}</p>
      </div>
    `;
    return;
  }
  if (clearBtn) clearBtn.classList.remove("hidden");
  
  // Render all entries (natural scroll)
  entries.forEach(({ url, summary, date }) => {
    const item = document.createElement("div");
    item.className = "card hover-lift";
    
    const domain = new URL(url).hostname;

    // Handle both old string format and new object format
    let summaryText;
    let summarySnippet;
    let privacyScore;
    if (typeof summary === 'string') {
      // Old format - summary is a string
      summaryText = summary;
      summarySnippet = summary.slice(0, 150) + (summary.length > 150 ? "..." : "");
    } else if (summary && typeof summary === 'object' && summary.summary) {
      // New format - summary is an object with summary property
      summaryText = summary.summary;
      privacyScore = summary.privacy_score;
      summarySnippet =
        privacyScore !== undefined && summary.score_explanation
          ? summary.score_explanation
          : summaryText.slice(0, 150) + (summaryText.length > 150 ? "..." : "");
    } else {
      // Fallback for invalid data
      summaryText = t("summary.placeholderTitle");
      summarySnippet = t("summary.placeholderTitle");
    }

    const dateStr = date ? new Date(date).toLocaleDateString() : "";

    // Create score badge if available
    let scoreBadge = '';
    if (privacyScore !== undefined) {
      const getScoreColor = (score) => {
        if (score <= 2) return 'text-green-600 bg-green-100';
        if (score <= 4) return 'text-blue-600 bg-blue-100';
        if (score <= 6) return 'text-yellow-600 bg-yellow-100';
        if (score <= 8) return 'text-orange-600 bg-orange-100';
        return 'text-red-600 bg-red-100';
      };
      const scoreColor = getScoreColor(privacyScore);
      scoreBadge = `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${scoreColor}">${t("history.scoreBadge", { score: privacyScore })}</span>`;
    }
     
    item.innerHTML = `
       <div class="card-header">
         <div class="flex items-start gap-3">
           <div class="flex-shrink-0">
             <div class="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
               <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
               </svg>
             </div>
           </div>
           <div class="flex-1 min-w-0">
             <div class="flex items-center gap-2">
               <h3 class="card-title text-base">${domain}</h3>
               ${scoreBadge}
             </div>
             <div class="flex items-center justify-between mt-1">
               <p class="card-subtitle text-xs">${dateStr}</p>
               <div class="flex gap-2">
                 <button class="btn-outline btn-sm view-summary" data-url="${url}">
                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                   </svg>
                   ${t("buttons.view")}
                 </button>
                 <button class="btn-error btn-sm delete-summary" data-url="${url}">
                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                   </svg>
                 </button>
               </div>
             </div>
           </div>
         </div>
       </div>
       <div class="card-content">
         <p class="text-sm text-secondary-600 line-clamp-2">${summarySnippet}</p>
       </div>
     `;
    
    // Add event listeners for view and delete actions
    item.querySelector(".view-summary").addEventListener("click", () => {
      displaySummary(summary, true);
      showTab("summary");
    });
    
    item.querySelector(".delete-summary").addEventListener("click", async () => {
      await removeSummary(url);
      await renderHistory();
      showNotification(t("alerts.summaryDeleted"), "success");
    });
    
    listEl.appendChild(item);
  });
}

/**
 * Sets up the history page functionality
 * Handles pagination and cache clearing
 */
function setupHistory() {
  const clear = document.getElementById("historyClear");

  clear.addEventListener("click", async () => {
    const confirmed = await showConfirm(t("confirm.clearAll"));
    if (confirmed) {
      await clearSummaries();
      renderHistory();
      showNotification(t("alerts.cacheCleared"), "success");
    }
  });
  
  renderHistory();
}

/**
 * Sets up the summary page functionality
 * Handles policy detection, summarization, and display
 */
async function setupSummary() {
  const summaryEl = document.getElementById("summaryText");
  const btn = document.getElementById("summarize");
  let hasCurrentSummary = false;
  const taglineEl = document.getElementById("tagline");

  // Get current tab and policy URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;
  const { url } = await chrome.runtime.sendMessage({
    type: "GET_POLICY_LINK",
    tabId: currentTabId,
  });
  currentPolicyUrl = url;
  // Toggle mascot image based on detection
  const mascotImg = document.getElementById("mascotImg");
  if (mascotImg) {
    mascotImg.src = url ? "../assets/raccoonhello.png" : "../assets/raccoon.png";
  }

  if (taglineEl) taglineEl.textContent = t("app.subtitle");
  
  // Load existing summary if available
  if (url) {
    const stored = await getSummary(url);
    if (stored) {
      displaySummary(stored.summary);
      hasCurrentSummary = true;
      // Initialize button in re-summarize mode
      setButtonModeResummarize();
    }
  }

  /**
   * Performs policy summarization
   * Handles both new JSON format with privacy scores and legacy string format
   */
  const summarize = async () => {
    if (!currentPolicyUrl) {
      showNotification(t("alerts.noPolicy"), "warning");
      return;
    }
    
    const previousMode = btn.dataset.mode || (hasCurrentSummary ? "resummarize" : "summarize");
    // If we are in re-summarize mode, clear existing cache so it regenerates
    if (previousMode === "resummarize") {
      await removeSummary(currentPolicyUrl);
    }

    // Update UI to show loading state
    setButtonStateLoading();
    
    summaryEl.innerHTML = `
      <div class="text-center py-8">
        <div class="spinner-lg mx-auto mb-4"></div>
        <p id="summaryProgressText" class="text-secondary-600">${t("summary.collectingPolicy")}</p>
      </div>
    `;
    summaryEl.className = "summary-placeholder";
    
    let succeeded = false;
    try {
      // Listen for progress updates from background
      const progressHandler = (msg) => {
        if (msg?.type !== "SUMMARY_PROGRESS" || msg.tabId !== currentTabId) return;
        const progressText = document.getElementById("summaryProgressText");
        if (!progressText) return;
        if (msg.step === "fetching_policy") progressText.textContent = t("summary.collectingPolicy");
        else if (msg.step === "policy_fetched") progressText.textContent = t("summary.sendingRequest");
        else if (msg.step === "sending_request") progressText.textContent = t("summary.waitingModel");
      };
      chrome.runtime.onMessage.addListener(progressHandler);
      const res = await chrome.runtime.sendMessage({
        type: "SUMMARIZE_POLICY",
        url: currentPolicyUrl,
        tabId: currentTabId,
      });
      chrome.runtime.onMessage.removeListener(progressHandler);
      
      if (res.summary) {
        // Handle new JSON format with privacy score
        let summaryContent, privacyScore, scoreExplanation;
        
        if (typeof res.summary === 'object' && res.summary.privacy_score !== undefined) {
          // New JSON format
          privacyScore = res.summary.privacy_score;
          scoreExplanation = res.summary.score_explanation;
          summaryContent = res.summary.summary;
        } else {
          // Legacy format (string)
          privacyScore = 5;
          scoreExplanation = t("summary.scoreNotAvailable");
          summaryContent = res.summary;
        }
        
        displaySummary(res.summary, true);
        showNotification(t("alerts.summaryGenerated"), "success");
        hasCurrentSummary = true;
        succeeded = true;
        if (mascotImg) mascotImg.src = "../assets/raccoonhello.png";
      } else {
        summaryEl.innerHTML = `
          <div class="text-center py-8 text-secondary-500">
            <svg class="w-12 h-12 mx-auto mb-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
            </svg>
            <p class="text-sm">${t("error.failedSummaryTitle")}</p>
            <p class="text-xs text-secondary-400">${t("error.failedSummarySubtitle")}</p>
          </div>
        `;
        summaryEl.className = "summary-placeholder";
        showNotification(t("alerts.failedGenerate"), "error");
      }
    } catch (error) {
      summaryEl.innerHTML = `
        <div class="text-center py-8 text-secondary-500">
          <svg class="w-12 h-12 mx-auto mb-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
          </svg>
          <p class="text-sm">${t("error.title")}</p>
          <p class="text-xs text-secondary-400">${t("error.checkConnection")}</p>
        </div>
      `;
      summaryEl.className = "summary-placeholder";
      showNotification(t("alerts.errorOccurred"), "error");
    } finally {
      if (succeeded) {
        setButtonModeResummarize();
      } else {
        // Restore previous mode
        if (previousMode === "resummarize") {
          setButtonModeResummarize();
        } else {
          setButtonModeSummarize();
        }
      }
    }
  };

  btn.addEventListener("click", summarize);

  // Helpers to manage button UI state
  function setButtonStateLoading() {
    btn.disabled = true;
    btn.innerHTML = `
      <div class="spinner-sm"></div>
      ${t("buttons.summarizing")}
    `;
  }

  function setButtonModeSummarize() {
    btn.disabled = false;
    btn.dataset.mode = "summarize";
    btn.classList.remove("btn-secondary");
    btn.classList.add("btn-primary");
    btn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
      ${t("buttons.summarize")}
    `;
  }

  function setButtonModeResummarize() {
    btn.disabled = false;
    btn.dataset.mode = "resummarize";
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-secondary");
    btn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      ${t("buttons.resummarize")}
    `;
  }

  // Removed "More options" button and side panel action

  // Manual link management moved to options page
}

/**
 * Initializes the popup interface
 * Sets up all tabs, settings, history, and summary functionality
 */
async function init() {
  setupTabs();
  setupHistory();
  await setupSummary();
}

// Initialize i18n then the popup
(async () => {
  await initI18n();
  init();
})();

export { init, showTab };