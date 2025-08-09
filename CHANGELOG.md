# Changelog

All notable changes to this project will be documented in this file.

## 1.0.0 — 2025-08-09

**Initial public release.**

- **Detection**: Find privacy policy links on visited pages.
- **AI providers**: Initial support for xAI (default) and OpenAI (optional).
- **Internationalization**: `en`, `es`, `fr`, `pt`, `de`, `it`.
- **Options page**: Configure API key, language, provider/model, temperature, and max tokens (default `1024`).
- **Secure storage**: AES‑GCM–encrypted API key; summaries stored with timestamps and content hashes; ignored domains list.
- **Safety**: Render Markdown via `marked` and sanitize with `DOMPurify`.
- **Dev hygiene**: Vendored libs under `src/libs/`.
- **Build**: Vite multi‑entry build with manifest/assets handling for extension packaging.