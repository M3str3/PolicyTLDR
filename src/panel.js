/**
 * Side panel script for the Privacy Policy Extension
 * 
 * Responsibilities:
 * - Display current page domain and quick actions
 * - Ignore domain (won’t alert or summarize on that site)
 * - Let user dismiss the alert state for the current tab
 */

import { addIgnoredDomain } from "./storage.js";
import { initI18n } from "./i18n.js";

/**
 * Initialize the side panel when it opens
 * Sets up event listeners and retrieves current tab information
 */
async function init() {
  await initI18n();
  // Get the currently active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Request the policy link for the current tab from background script
  const { url } = await chrome.runtime.sendMessage({
    type: "GET_POLICY_LINK",
    tabId: tab.id,
  });
  
  // Extract domain from URL for ignore functionality
  const domain = url ? new URL(url).hostname : "";

  /**
   * Restore the extension icon to default state and close the panel
   * Called when user dismisses the panel
   */
  const restore = () => {
    chrome.runtime.sendMessage({
      type: "SET_ICON_STATE",
      state: "default",
      tabId: tab.id,
    });
    chrome.sidePanel.close({ tabId: tab.id });
  };

  // Set up "remind me later" button
  document.getElementById("remind").addEventListener("click", restore);

  // Set up "ignore this domain" button
  document.getElementById("ignore").addEventListener("click", async () => {
    if (domain) {
      await addIgnoredDomain(domain);
    }
    restore();
  });
}

// Initialize the panel when script loads
init();
