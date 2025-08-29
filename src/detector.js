/**
 * Find links likely pointing to privacy policies within a document.
 * Heuristics:
 * - Anchor href contains privacy/policy/legal/terms or localized variants
 * - Fallback: scan plain text for URLs containing those keywords
 * @param {Document} doc - DOM Document to search.
 * @returns {string[]} Array of matching URLs.
 */
function findPrivacyLinks(doc) {
  console.log("Detector: Starting privacy links search");
  const selectors = [
    'a[href*="privacy"]',
    'a[href*="policy"]',
    'a[href*="legal"]',
    'a[href*="terms"]',
    'a[href*="confidentialite"]',
    'a[href*="vie-privee"]',
    'a[href*="politique"]',
    'a[href*="datenschutz"]',
  ];
  const results = new Set();
  console.log("Detector: Checking selectors:", selectors);
  selectors.forEach((sel) => {
    const elements = doc.querySelectorAll(sel);
    console.log("Detector: Found", elements.length, "elements for selector:", sel);
    elements.forEach((a) => {
      const text = a.textContent.toLowerCase();
      console.log("Detector: Checking element text:", text.substring(0, 50));
      if (
        /privacy|política|legal|terms|términos|confidentialité|confidentialite|vie privée|vie privee|politique|datenschutz/.test(
          text,
        )
      ) {
        console.log("Detector: Adding privacy link:", a.href);
        results.add(a.href);
      }
    });
  });
  if (results.size === 0) {
    console.log("Detector: No links found with selectors, trying text search");
    const bodyText = doc.body?.textContent || "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let match;
    while ((match = urlRegex.exec(bodyText)) !== null) {
      const url = match[1];
      if (
        /privacy|terms|legal|confidentialite|politique|datenschutz/i.test(url)
      ) {
        console.log("Detector: Found privacy URL in text:", url);
        results.add(url);
      }
    }
  }
  const finalResults = Array.from(results);
  console.log("Detector: Final privacy links found:", finalResults);
  return finalResults;
}

// Expose as global for non-module content scripts
// Avoids import/export in contexts where ESM is not available
try {
  // eslint-disable-next-line no-undef
  if (typeof window !== "undefined") {
    // eslint-disable-next-line no-undef
    window.findPrivacyLinks = findPrivacyLinks;
  }
} catch (_) {}

