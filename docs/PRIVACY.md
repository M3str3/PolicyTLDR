# Privacy Notice

Policy TL;DR processes only what is needed to generate summaries of privacy policies.

- When you click “Summarize”, the extension fetches the target page and distills body text locally.
- The distilled text (not the full HTML) is sent to the selected AI provider to generate a summary.
- Your API key is stored securely in browser storage and encrypted with a key derived from a random secret.
- We do not collect analytics or personal data in this repository.

For details, see the code in `src/background.js`, `src/ai.js`, and `src/storage.js`.