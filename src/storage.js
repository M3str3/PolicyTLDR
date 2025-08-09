/**
 * Storage module for the Privacy Policy Extension
 * 
 * Responsibilities:
 * - Secure API key storage (AES-GCM)
 * - Persist summaries with content hash and timestamp
 * - Store user preferences (language, AI options)
 * - Manage ignored domains list
 * 
 * Notes for maintainers:
 * - Keys are encrypted with a secret managed by `secret.js`.
 * - Summaries are keyed by URL; cache invalidates when content hash changes.
 */

import {
  getSecret,
  importKey as importKeyFromSecret,
} from "./secret.js";

/**
 * Generates a cryptographic key from the secret for encryption/decryption
 * @returns {Promise<CryptoKey>} The crypto key for AES-GCM operations
 */
async function getCryptoKey() {
  const secret = await getSecret();
  return importKeyFromSecret(secret);
}

/**
 * Encrypts and saves the API key to Chrome storage
 * Uses AES-GCM encryption for security
 * @param {string} key - The API key to encrypt and save
 */
export async function saveApiKey(key) {
  const cryptoKey = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(key);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoded,
  );
  const payload = {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(cipher)),
  };
  await chrome.storage.local.set({ apiKey: JSON.stringify(payload) });
}

/**
 * Retrieves and decrypts the stored API key
 * @returns {Promise<string>} The decrypted API key or empty string if not found
 */
export async function getApiKey() {
  const { apiKey } = await chrome.storage.local.get(["apiKey"]);
  if (!apiKey) return "";
  try {
    const { iv, data } = JSON.parse(apiKey);
    const cryptoKey = await getCryptoKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      cryptoKey,
      new Uint8Array(data),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return "";
  }
}

/**
 * Saves a policy summary with metadata to storage
 * @param {string} url - The URL of the policy
 * @param {Object} summary - The summary object containing privacy score and text
 * @param {string} hash - The SHA-256 hash of the policy content for change detection
 */
export async function saveSummary(url, summary, hash) {
  const { summaries = {} } = await chrome.storage.local.get("summaries");
  summaries[url] = { summary, hash, date: Date.now() };
  await chrome.storage.local.set({ summaries });
}

/**
 * Retrieves a stored policy summary by URL
 * @param {string} url - The URL of the policy
 * @returns {Promise<Object|null>} The summary object or null if not found
 */
export async function getSummary(url) {
  const { summaries = {} } = await chrome.storage.local.get("summaries");
  return summaries[url] || null;
}

/**
 * Saves the user's preferred language for summaries
 * @param {string} language - The language code (e.g., "en", "es", "fr")
 */
export async function saveLanguage(language) {
  await chrome.storage.local.set({ language });
}

/**
 * Retrieves the user's preferred language
 * @returns {Promise<string>} The language code or empty string if not set
 */
export async function getLanguage() {
  const { language = "" } = await chrome.storage.local.get(["language"]);
  return language || "";
}

/**
 * Saves AI model configuration options
 * @param {Object} options - The AI options object (model, temperature, maxTokens, etc.)
 */
export async function saveAIOptions(options) {
  await chrome.storage.local.set({ aiOptions: options });
}

/**
 * Retrieves the stored AI configuration options
 * @returns {Promise<Object>} The AI options object with defaults
 */
export async function getAIOptions() {
  const { aiOptions = {} } = await chrome.storage.local.get(["aiOptions"]);
  return aiOptions;
}

/**
 * Adds a domain to the ignored list
 * Prevents the extension from processing policies from this domain
 * @param {string} domain - The domain to ignore (e.g., "example.com")
 */
export async function addIgnoredDomain(domain) {
  const { ignoredDomains = [] } =
    await chrome.storage.local.get("ignoredDomains");
  if (!ignoredDomains.includes(domain)) {
    ignoredDomains.push(domain);
    await chrome.storage.local.set({ ignoredDomains });
  }
}

/**
 * Checks if a domain is in the ignored list
 * @param {string} domain - The domain to check
 * @returns {Promise<boolean>} True if the domain is ignored
 */
export async function isDomainIgnored(domain) {
  const { ignoredDomains = [] } =
    await chrome.storage.local.get("ignoredDomains");
  return ignoredDomains.includes(domain);
}

/**
 * Removes a specific policy summary from storage
 * @param {string} url - The URL of the policy to remove
 * @returns {Promise<boolean>} True if the summary was removed, false if not found
 */
export async function removeSummary(url) {
  const { summaries = {} } = await chrome.storage.local.get("summaries");
  if (summaries[url]) {
    delete summaries[url];
    await chrome.storage.local.set({ summaries });
    return true;
  }
  return false;
}

/**
 * Clears all stored policy summaries
 * Used for cache management
 */
export async function clearSummaries() {
  await chrome.storage.local.remove("summaries");
}
