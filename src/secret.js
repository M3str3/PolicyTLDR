/**
 * Secret management for encryption routines
 * 
 * Responsibilities:
 * - Generate and persist a random secret for AES-GCM key derivation
 * - Migrate API keys encrypted with a legacy static secret
 */

const LEGACY_SECRET = "extension-policy-secret";

/**
 * Retrieves the stored secret, generating a new one if none exists.
 * Migrates API keys encrypted with the legacy secret to the new one.
 * @returns {Promise<string>} The secret used for encryption.
 */
export async function getSecret() {
  const { secret } = await chrome.storage.local.get("secret");
  if (secret) return secret;

  const array = crypto.getRandomValues(new Uint8Array(32));
  const newSecret = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");

  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (apiKey) {
    try {
      const { iv, data } = JSON.parse(apiKey);
      const legacyKey = await importKey(LEGACY_SECRET);
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        legacyKey,
        new Uint8Array(data),
      );
      const plain = new TextDecoder().decode(decrypted);
      const newKey = await importKey(newSecret);
      const newIv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(plain);
      const cipher = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: newIv },
        newKey,
        encoded,
      );
      const payload = {
        iv: Array.from(newIv),
        data: Array.from(new Uint8Array(cipher)),
      };
      await chrome.storage.local.set({ apiKey: JSON.stringify(payload) });
    } catch {
      // Ignore migration errors
    }
  }

  await chrome.storage.local.set({ secret: newSecret });
  return newSecret;
}

/**
 * Imports a CryptoKey for AES-GCM operations from the provided secret.
 * @param {string} secret - The secret string.
 * @returns {Promise<CryptoKey>} The imported crypto key.
 */
export async function importKey(secret) {
  const enc = new TextEncoder().encode(secret);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
