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
  // Detect and report page language to background script
  const lang = document.documentElement.lang || "";
  if (lang) {
    chrome.runtime.sendMessage({ type: "PAGE_LANGUAGE", lang });
  }
  
  /**
   * Scans the current page for privacy policy links
   * Sends found links to the background script for processing
  */
  const checkLinks = () => {
    // eslint-disable-next-line no-undef
    const links = (window.findPrivacyLinks ? window.findPrivacyLinks(document) : []);
    if (links.length > 0) {
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
  checkLinks();

  /**
   * MutationObserver to watch for DOM changes
   * Re-scans for privacy links when new content is added to the page
   * This handles dynamic content loading and single-page applications
   */
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        scheduleCheckLinks();
        break; // Only need to check once per batch of mutations
      }
    }
  });

  // Start observing DOM changes if body exists
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
