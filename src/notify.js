/**
 * Notification utilities for extension UI
 * Provides helper functions to show temporary alerts and confirmation prompts.
 *
 * Notes for maintainers:
 * - Alerts auto-dismiss after 5s; confirmation stays until user action.
 * - Container can be overridden per-call to place alerts contextually.
 */

import { t } from "./i18n.js";

/**
 * Shows a temporary notification message to the user.
 *
 * @param {string} message - The message to display
 * @param {string} [type="info"] - The notification type (info, success, error, warning)
 * @param {HTMLElement} [container] - Optional container element where the notification will be inserted.
 *   Defaults to the current visible tab content or document body.
 */
export function showNotification(message, type = "info", container) {
  const alertEl = document.createElement("div");
  alertEl.className = `alert alert-${type} mb-4 animate-fade-in`;
  alertEl.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 mt-0.5">
        ${
          type === "success"
            ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
            : type === "error"
              ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
              : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
        }
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm">${message}</div>
      </div>
      <button class="flex-shrink-0 btn-ghost p-1 -mt-1 -mr-1 alert-close-btn">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;

  const closeBtn = alertEl.querySelector(".alert-close-btn");
  closeBtn.addEventListener("click", () => {
    alertEl.remove();
  });

  const target =
    container ||
    document.querySelector(".tab-content:not(.hidden)") ||
    document.body;
  target.insertBefore(alertEl, target.firstChild);

  setTimeout(() => {
    if (alertEl.parentElement) {
      alertEl.remove();
    }
  }, 5000);
}

/**
 * Shows a confirmation message with OK and Cancel buttons.
 *
 * @param {string} message - The message to display
 * @param {HTMLElement} [container] - Optional container for the confirmation prompt
 * @returns {Promise<boolean>} Resolves to true if confirmed, false otherwise
 */
export function showConfirm(message, container) {
  return new Promise((resolve) => {
    const alertEl = document.createElement("div");
    alertEl.className = `alert alert-warning mb-4 animate-fade-in`;
    alertEl.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-1 min-w-0">
          <div class="text-sm mb-2">${message}</div>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-primary confirm-yes">${t("buttons.ok")}</button>
            <button class="btn btn-sm confirm-no">${t("buttons.cancel")}</button>
          </div>
        </div>
      </div>
    `;

    const target =
      container ||
      document.querySelector(".tab-content:not(.hidden)") ||
      document.body;
    target.insertBefore(alertEl, target.firstChild);

    alertEl.querySelector(".confirm-yes").addEventListener("click", () => {
      alertEl.remove();
      resolve(true);
    });
    alertEl.querySelector(".confirm-no").addEventListener("click", () => {
      alertEl.remove();
      resolve(false);
    });
  });
}

