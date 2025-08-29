/**
 * Content script for the Privacy Policy Extension
 *
 * Responsibilities:
 * - Report page language to background
 * - Find privacy/terms/legal links via `window.findPrivacyLinks`
 * - Watch DOM mutations to catch SPA updates
 * - Send results to background for further processing
 */
// detector.js será cargado antes desde el manifest y expondrá window.findPrivacyLinks

/**
 * Immediately invoked function expression (IIFE) that initializes the content script
 * Runs when the script is injected into a web page
 */
(() => {
  console.log("Content: Content script initialized");
  // Detect and report page language to background script
  const lang = document.documentElement.lang || "";
  console.log("Content: Page language detected:", lang);
  if (lang) {
    console.log("Content: Sending page language to background:", lang);
    chrome.runtime.sendMessage({ type: "PAGE_LANGUAGE", lang });
  }
  
  /**
   * Scans the current page for privacy policy links
   * Sends found links to the background script for processing
  */
  const checkLinks = () => {
    console.log("Content: Checking for privacy links");
    // eslint-disable-next-line no-undef
    const links = (window.findPrivacyLinks ? window.findPrivacyLinks(document) : []);
    console.log("Content: Found privacy links:", links);
    if (links.length > 0) {
      console.log("Content: Sending privacy links to background");
      chrome.runtime.sendMessage({ type: "PRIVACY_LINKS_FOUND", links });
    }
  };

  // Debounced version of checkLinks to batch rapid DOM mutations
  let checkLinksTimeout;
  const scheduleCheckLinks = () => {
    clearTimeout(checkLinksTimeout);
    checkLinksTimeout = setTimeout(checkLinks, 100);
  };

  // Initial scan for privacy links
  console.log("Content: Performing initial privacy links scan");
  checkLinks();

  /**
   * MutationObserver to watch for DOM changes
   * Re-scans for privacy links when new content is added to the page
   * This handles dynamic content loading and single-page applications
   */
  const observer = new MutationObserver((mutations) => {
    console.log("Content: DOM mutation detected, mutations count:", mutations.length);
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        console.log("Content: Nodes added, scheduling privacy links check");
        scheduleCheckLinks();
        break; // Only need to check once per batch of mutations
      }
    }
  });

  // Start observing DOM changes if body exists
  if (document.body) {
    console.log("Content: Starting DOM observer");
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    console.log("Content: Document body not found, cannot start observer");
  }
})();
