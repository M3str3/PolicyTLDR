/**
 * Background script for the Privacy Policy Extension
 * 
 * Responsibilities:
 * - Detect potential privacy/terms/legal pages and set icon/badge state
 * - Bridge messages between popup/content and AI summarization
 * - Fetch, distill, and cache policy body text; avoid re-summarizing identical content
 * - Create context menu entry for quick summarization
 * 
 * Notes for maintainers:
 * - `extractBodyTextFromHTML` uses DOMParser to reduce token usage and stabilize hashes.
 * - For JS-heavy pages, `extractBodyTextByLoadingPage` opens a hidden tab to read rendered text.
 * - Icon images are generated to ImageData when possible, falling back to path.
 */

import { summarizePolicy } from "./ai.js";
import {
  getSummary,
  saveSummary,
  removeSummary,
  isDomainIgnored,
  getLanguage,
} from "./storage.js";

/**
 * Sets the extension icon state and badge for a specific tab
 * @param {string} state - The state to set ("alert" or "default")
 * @param {number} tabId - The ID of the tab to update
 */
const iconImageDataCache = new Map(); // state -> {16: ImageData, 32: ImageData}

async function getIconImageDataForState(state) {
  if (iconImageDataCache.has(state)) return iconImageDataCache.get(state);
  const file = state === "alert" ? "assets/raccoonhello.png" : "assets/raccoon.png";
  const url = chrome.runtime.getURL(file);
  const res = await fetch(url);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);

  const makeSize = (size) => {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    // draw centered contain
    const scale = Math.min(size / bitmap.width, size / bitmap.height);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const x = Math.floor((size - w) / 2);
    const y = Math.floor((size - h) / 2);
    ctx.drawImage(bitmap, x, y, w, h);
    return ctx.getImageData(0, 0, size, size);
  };

  const imageData = { 16: makeSize(16), 32: makeSize(32) };
  iconImageDataCache.set(state, imageData);
  return imageData;
}

export async function setIconState(state, tabId) {
  const text = state === "alert" ? "!" : "";
  try {
    const imageData = await getIconImageDataForState(state);
    await chrome.action.setIcon({ imageData, tabId });
  } catch (e) {
    // Fallback to path if imageData fails
    const iconFile = state === "alert" ? "assets/raccoonhello.png" : "assets/raccoon.png";
    const path = chrome.runtime.getURL(iconFile);
    chrome.action.setIcon({ path, tabId });
  }
  chrome.action.setBadgeText({ tabId, text });
  if (state === "alert") {
    chrome.action.setBadgeBackgroundColor({
      tabId,
      color: "#4688F1",
    });
  }
}

/**
 * Creates a SHA-256 hash of the given text
 * Used for detecting if a policy has changed
 * @param {string} text - The text to hash
 * @returns {Promise<string>} The hexadecimal hash string
 */
async function hashText(text) {
  const enc = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// In-memory storage for policy links and page languages
const policyLinks = new Map();
const pageLangs = new Map();
const KEYWORDS = ["privacy", "terms", "legal"];

/**
 * Extrae texto plano del <body> usando solo APIs nativas (DOMParser + textContent).
 * @param {string} html
 * @returns {string}
 */
function extractBodyTextFromHTML(html) {
  if (typeof html !== "string" || html.length === 0) return "";
  // eslint-disable-next-line no-undef
  if (typeof DOMParser === "undefined") return html;
  // eslint-disable-next-line no-undef
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const text = doc?.body?.textContent || "";
  return normalizeWhitespace(text);
}

function normalizeWhitespace(text) {
  return String(text).replace(/[\t\f\r ]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

/**
 * Loads a URL in an offscreen document to get fully rendered body text for JS-heavy pages.
 * Requires "offscreen" document permission and file in the extension to request this.
 * Falls back to empty string if not available.
 * @param {string} url
 * @returns {Promise<string>}
 */
async function extractBodyTextByLoadingPage(url) {
  let createdTabId;
  try {
    const tab = await chrome.tabs.create({ url, active: false });
    createdTabId = tab.id;
    await waitForTabLoadComplete(createdTabId, 15000);
    await delay(1200);
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: createdTabId },
      func: () => document.body?.innerText || document.body?.textContent || "",
    });
    const text = injection?.result || "";
    return normalizeWhitespace(text);
  } catch (_) {
    return "";
  } finally {
    if (createdTabId) {
      try { await chrome.tabs.remove(createdTabId); } catch (_) {}
    }
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForTabLoadComplete(tabId, timeoutMs = 15000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timer);
        finish();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * Listens for tab updates and detects privacy policy pages
 * Sets the extension icon to alert state when privacy-related pages are detected
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const lower = tab.url.toLowerCase();
    if (KEYWORDS.some((k) => lower.includes(k))) {
      const domain = new URL(tab.url).hostname;
      if (await isDomainIgnored(domain)) return;
      policyLinks.set(tabId, tab.url);
      setIconState("alert", tabId);
    }
  }
});

/**
 * Cleans up tab-specific data when tabs are closed or replaced
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  policyLinks.delete(tabId);
  pageLangs.delete(tabId);
});

chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
  policyLinks.delete(removedTabId);
  pageLangs.delete(removedTabId);
  policyLinks.delete(addedTabId);
  pageLangs.delete(addedTabId);
});

/**
 * Creates context menu item for summarizing privacy policies
 * Triggered when the extension is installed
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarize-policy",
    title: "Policy TL;DR: Summarize privacy policy",
    contexts: ["link"],
  });
});

// Notification helpers for missing API key
const API_KEY_NOTIFICATION_ID = "policy-tldr-missing-api-key";

function showApiKeyMissingNotification() {
  if (!chrome.notifications) return;
  chrome.notifications.create(API_KEY_NOTIFICATION_ID, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("assets/raccoon.png"),
    title: "Policy TL;DR",
    message: "Add your API key to generate summaries.",
    requireInteraction: true,
    buttons: [{ title: "Open settings" }],
    priority: 2,
  });
}

chrome.notifications?.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === API_KEY_NOTIFICATION_ID && buttonIndex === 0) {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
    chrome.notifications.clear(notificationId);
  }
});

chrome.notifications?.onClicked.addListener((notificationId) => {
  if (notificationId === API_KEY_NOTIFICATION_ID) {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
    chrome.notifications.clear(notificationId);
  }
});

/**
 * Handles context menu clicks for policy summarization
 * Allows users to right-click on links to summarize policies
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarize-policy" && info.linkUrl) {
    chrome.runtime.sendMessage({
      type: "SUMMARIZE_POLICY",
      url: info.linkUrl,
      tabId: tab?.id,
    });
  }
});

/**
 * Main message handler for communication between different parts of the extension
 * Handles various message types from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Store page language for AI processing
  if (message.type === "PAGE_LANGUAGE" && sender.tab?.id) {
    pageLangs.set(sender.tab.id, message.lang);
  } 
  // Handle privacy links found by content script
  else if (
    message.type === "PRIVACY_LINKS_FOUND" &&
    message.links.length > 0
  ) {
    (async () => {
      const url = message.links[0];
      const domain = new URL(url).hostname;
      if (await isDomainIgnored(domain)) return;
      if (sender.tab?.id) {
        policyLinks.set(sender.tab.id, url);
        setIconState("alert", sender.tab.id);
      }
    })();
  } 
  // Return policy link for current tab
  else if (message.type === "GET_POLICY_LINK") {
    const url = policyLinks.get(message.tabId) || "";
    sendResponse({ url });
  } 
  // Handle policy summarization requests
  else if (message.type === "SUMMARIZE_POLICY") {
    (async () => {
      try {
        // Fetch the policy content (server HTML)
        chrome.runtime.sendMessage({
          type: "SUMMARY_PROGRESS",
          step: "fetching_policy",
          tabId: message.tabId,
          url: message.url,
        });
        const res = await fetch(message.url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} when fetching policy`);
        }
        const html = await res.text();
        chrome.runtime.sendMessage({
          type: "SUMMARY_PROGRESS",
          step: "policy_fetched",
          tabId: message.tabId,
          url: message.url,
        });
        const lang =
          (await getLanguage()) || pageLangs.get(message.tabId) || "en";
        
        // Extract only the body text to minimize tokens and improve caching stability
        let bodyText = extractBodyTextFromHTML(html);

        // Fallback for dynamically rendered pages (SPA/JS-heavy). Load in a background tab and read rendered DOM.
        if (!bodyText || bodyText.length < 200) {
          bodyText = await extractBodyTextByLoadingPage(message.url);
        }

        // Check if we already have a summary for this content (hash the text, not raw HTML)
        const hash = await hashText(bodyText);
        const existing = await getSummary(message.url);
        let summary = existing?.summary;
        
        // Only generate new summary if content has changed
        if (!existing || existing.hash !== hash) {
          if (existing) await removeSummary(message.url);
          chrome.runtime.sendMessage({
            type: "SUMMARY_PROGRESS",
            step: "sending_request",
            tabId: message.tabId,
            url: message.url,
          });
          const sourceDomain = (() => {
            try { return new URL(message.url).hostname; } catch { return undefined; }
          })();
          summary = await summarizePolicy(bodyText, lang, { sourceDomain });
          await saveSummary(message.url, summary, hash);
        }
        
        sendResponse({ summary });
        if (message.tabId) {
          setIconState("default", message.tabId);
        }
      } catch (err) {
        console.error("Failed to summarize policy", err);
        if (String(err?.message || "").includes("API key not set")) {
          showApiKeyMissingNotification();
          sendResponse({ error: "NO_API_KEY" });
          return;
        }
        if (chrome.notifications) {
          chrome.notifications.create({
            type: "basic",
            iconUrl: chrome.runtime.getURL("assets/raccoon.png"),
            title: "Policy TL;DR",
            message: "Failed to download policy.",
          });
        }
        sendResponse({ error: "FAILED" });
      }
    })();
    return true; // Indicates async response
  } 
  // Handle icon state changes
  else if (message.type === "SET_ICON_STATE") {
    setIconState(message.state, message.tabId);
  }
});

// Handle offscreen DOM scraping request/response loop
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "OFFSCREEN_READY") {
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
