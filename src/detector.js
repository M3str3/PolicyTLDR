/**
 * Find links likely pointing to privacy policies within a document.
 * Heuristics:
 * - Anchor href contains privacy/policy/legal/terms or localized variants
 * - Fallback: scan plain text for URLs containing those keywords
 * @param {Document} doc - DOM Document to search.
 * @returns {string[]} Array of matching URLs.
 */
function findPrivacyLinks(doc) {
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
  selectors.forEach((sel) => {
    doc.querySelectorAll(sel).forEach((a) => {
      const text = a.textContent.toLowerCase();
      if (
        /privacy|política|legal|terms|términos|confidentialité|confidentialite|vie privée|vie privee|politique|datenschutz/.test(
          text,
        )
      ) {
        results.add(a.href);
      }
    });
  });
  if (results.size === 0) {
    const bodyText = doc.body?.textContent || "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let match;
    while ((match = urlRegex.exec(bodyText)) !== null) {
      const url = match[1];
      if (
        /privacy|terms|legal|confidentialite|politique|datenschutz/i.test(url)
      ) {
        results.add(url);
      }
    }
  }
  return Array.from(results);
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

