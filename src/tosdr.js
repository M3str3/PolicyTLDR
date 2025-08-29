/**
 * Fetches ToS;DR rating info for a given domain.
 * Uses an in-memory cache to avoid repeated requests.
 * Returns a summary object with source metadata when a rating is found.
 * @param {string} domain
 * @returns {Promise<{summary: string, source: 'tosdr', serviceId: number, rating: string, name: string}|null>}
 */
const cache = new Map(); // domain -> { ts: number, result: any }
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export async function lookupTosdr(domain) {
  if (!domain) return null;
  
  // Remove www. prefix if present
  const cleanDomain = domain.replace(/^www\./, '');
  
  const now = Date.now();
  const cached = cache.get(cleanDomain);
  if (cached && now - cached.ts < CACHE_TTL_MS) return cached.result;
  
  try {
    const url = `https://api.tosdr.org/search/v5/?query=${encodeURIComponent(cleanDomain)}`;
    const res = await fetch(url);
    if (!res.ok) {
      cache.set(cleanDomain, { ts: now, result: null });
      return null;
    }
    const data = await res.json();
    const service = data?.services?.find((s) => s.rating && s.rating !== "N/A" && s.rating !== "");
    const result = service
      ? { 
          summary: `ToS;DR rating for ${service.name}: ${service.rating}`, 
          source: "tosdr",
          serviceId: service.id,
          rating: service.rating,
          name: service.name
        }
      : null;
    cache.set(cleanDomain, { ts: now, result });
    return result;
  } catch {
    cache.set(cleanDomain, { ts: now, result: null });
    return null;
  }
}

/**
 * Fetches detailed service information from ToS;DR API
 * @param {number} serviceId - The service ID from the search result
 * @returns {Promise<Object|null>} Detailed service information or null if not found
 */
export async function getTosdrServiceDetails(serviceId) {
  if (!serviceId) return null;
  
  try {
    const url = `https://api.tosdr.org/service/v3/?id=${serviceId}`;
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}
