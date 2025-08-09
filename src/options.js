/**
 * Options page script for the Privacy Policy Extension
 * 
 * Responsibilities:
 * - Manage API key, language, and AI model settings
 * - Validate numeric inputs (temperature, max tokens) with helpful messages
 * - Persist settings to chrome.storage
 * 
 * Notes for maintainers:
 * - Models are populated based on provider selection; extend PROVIDER_MODELS to add more.
 */

import {
  saveApiKey,
  getApiKey,
  saveLanguage,
  getLanguage,
  saveAIOptions,
  getAIOptions,
} from "./storage.js";
import { initI18n, t } from "./i18n.js";
import { showNotification } from "./notify.js";

// Supported models by provider
const PROVIDER_MODELS = {
  xai: [
    { id: "grok-3-mini", label: "grok-3-mini" },
    { id: "grok-3", label: "grok-3" },
  ],
  openai: [
    { id: "gpt-4o-mini", label: "gpt-4o-mini" },
    { id: "gpt-4o", label: "gpt-4o" },
    { id: "gpt-4.1-mini", label: "gpt-4.1-mini" },
  ],
};

function populateModels(provider, selectedModel) {
  const modelSelect = document.getElementById("model");
  modelSelect.innerHTML = "";
  const models = PROVIDER_MODELS[provider] || [];
  for (const m of models) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.label;
    if (selectedModel && selectedModel === m.id) opt.selected = true;
    modelSelect.appendChild(opt);
  }
}


/**
 * Event listener for the save button
 * Collects all form data and saves it to storage
 */
document.getElementById("save").addEventListener("click", async () => {
  const formEl = document.getElementById("optionsForm");
  // Get form values
  const key = document.getElementById("apiKey").value.trim();
  const language = document.getElementById("language").value;
  const provider = document.getElementById("provider").value || "xai";
  const model = document.getElementById("model").value || (provider === "xai" ? "grok-3-mini" : "gpt-4o-mini");
  const temperature = parseFloat(document.getElementById("temperature").value) || 0.7;
  const maxTokens = parseInt(document.getElementById("maxTokens").value, 10) || 1024;

  // Validate inputs
  if (!key) {
    showNotification(t("alerts.apiKeyRequired"), "warning", formEl);
  }

  if (temperature < 0 || temperature > 2) {
    showNotification(t("alerts.temperatureRange"), "error", formEl);
    return;
  }

  if (maxTokens < 100 || maxTokens > 4000) {
    showNotification(t("alerts.maxTokensRange"), "error", formEl);
    return;
  }
  
  // Save all settings to storage
  await saveApiKey(key);
  await saveLanguage(language);
  await saveAIOptions({ provider, model, temperature, maxTokens });

  // Show success message
  showNotification(t("alerts.settingsSaved"), "success", formEl);
});

/**
 * Initialize the options page when DOM is loaded
 * Populates form fields with current stored values
 */
document.addEventListener("DOMContentLoaded", async () => {
  await initI18n();
  // Load and display current API key
  const key = await getApiKey();
  document.getElementById("apiKey").value = key || "";
  
  // Load and display current language preference
  const lang = await getLanguage();
  document.getElementById("language").value = lang || "";
  
  // Load and display current AI options with defaults
  const {
    provider = "xai",
    model = provider === "xai" ? "grok-3-mini" : "gpt-4o-mini",
    temperature = 0.7,
    maxTokens = 1024,
  } = await getAIOptions();
  
  document.getElementById("provider").value = provider;
  populateModels(provider, model);
  updateApiKeyHelp(provider);
  document.getElementById("temperature").value = temperature || 0.7;
  document.getElementById("maxTokens").value = maxTokens || 1024;

  // Update models when provider changes
  document.getElementById("provider").addEventListener("change", (e) => {
    const p = e.target.value;
    populateModels(p);
    updateApiKeyHelp(p);
  });

  // Apply i18n instantly when language changes
  document.getElementById("language").addEventListener("change", async (e) => {
    const newLang = e.target.value || "";
    await saveLanguage(newLang);
    await initI18n();
  });
});

function updateApiKeyHelp(provider) {
  const el = document.getElementById("apiKeyHelp");
  if (!el) return;
  if (provider === "openai") {
    el.innerHTML = '<a href="https://platform.openai.com/api-keys" target="_blank">OpenAI API Keys</a>';
  } else {
    el.innerHTML = '<a href="https://console.x.ai/" target="_blank">xAI Console</a>';
  }
}
