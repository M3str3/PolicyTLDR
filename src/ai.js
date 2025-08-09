/**
 * AI module for the Privacy Policy Extension
 * 
 * Responsibilities:
 * - Build provider-specific chat completion requests (xAI default, OpenAI optional)
 * - Enforce strict JSON response shape { privacy_score, score_explanation, summary }
 * - Parse loosely-structured outputs defensively (handles fenced code, arrays, wrappers)
 * - Provide sane defaults and robust timeouts
 * 
 * Notes for maintainers:
 * - To add a provider, extend buildProviderRequest and update options mapping.
 * - Keep messages compact; token cost scales with policy length.
 */

import { getApiKey, getAIOptions } from "./storage.js";

function buildProviderRequest(provider, apiKey, { model, temperature, maxTokens, rest, lang, text, sourceDomain }) {
  const messages = [
    {
      role: "system",
      content: `You are a privacy and data protection expert. Analyze the following privacy policy and provide:

1. A privacy abuse score from 0 to 10 where:
   - 0-2: Excellent privacy practices, minimal data collection, strong user rights
   - 3-4: Good privacy practices with some concerns
   - 5-6: Moderate privacy concerns, some problematic practices
   - 7-8: Significant privacy issues, excessive data collection
   - 9-10: Highly abusive practices, extensive data collection, weak user rights

2. A clear and concise summary in ${lang} highlighting:
   - What personal data is collected and how
   - How that data is used
   - If it is shared with third parties and with whom
   - Any relevant risks or warnings for the user
   - What rights the user has over their data and how to exercise them
   - Any other important or unusual aspects

IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
{
  "privacy_score": <number from 0 to 10>,
  "score_explanation": "<brief explanation of the score>",
  "summary": "<markdown formatted summary>"
}

The privacy_score must be a number between 0 and 10. The score_explanation must be an extremely brief, title-style phrase in ${lang} (max 8 words, no trailing period). The summary should use Markdown formatting with headings, lists, and bold text to emphasize the most relevant information.`,
    },
    { role: "user", content: `Source domain: ${sourceDomain || "unknown"}\n\nPolicy text:\n\n${text}` },
  ];

  if (provider === "openai") {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        ...rest,
        messages,
      }),
    };
  }

  // default: xAI
  return {
    url: "https://api.x.ai/v1/chat/completions",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      ...rest,
      messages,
    }),
  };
}

/**
 * Analyzes a privacy policy text and generates a comprehensive summary
 * 
 * @param {string} text - The privacy policy text to analyze
 * @param {string} lang - The language code for the summary (default: "en")
 * @param {Object} options - Additional AI options to override defaults
 * @returns {Promise<Object>} Object containing privacy_score, score_explanation, and summary
 * @throws {Error} If API key is missing, request fails, or response is invalid
 */
export async function summarizePolicy(text, lang = "en", options = {}) {
  // Validate API key is available
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("API key not set");
  
  // Get stored AI options and merge with provided options
  const stored = await getAIOptions();
  const {
    provider = "xai",
    model = "grok-3-mini",
    temperature = 0.2,
    maxTokens = 1024,
    timeout = 30000,
    ...rest
  } = { ...stored, ...options };
  
  // Set up request timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Build provider-specific request
  const { url, headers, body } = buildProviderRequest(provider, apiKey, {
      model,
      temperature,
      maxTokens,
      rest,
      lang,
      text,
      sourceDomain: options.sourceDomain,
    });

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Handle HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }
    
    // Parse response and validate structure
    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    // Utilities for parsing
    function stripCodeFences(text) {
      if (typeof text !== "string") return text;
      let t = text.trim();
      if (t.startsWith("```") && t.endsWith("```")) {
        t = t.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
      }
      return t;
    }

    // Try to robustly parse JSON from the model output first
    function tryParseJsonFromContent(content) {
      // Some providers (xAI, reasoning models) return content as an array of segments
      if (Array.isArray(content)) {
        const joined = content
          .map((seg) => {
            if (typeof seg === "string") return seg;
            if (seg && typeof seg === "object") {
              if (typeof seg.text === "string") return seg.text;
              if (typeof seg.content === "string") return seg.content;
            }
            return "";
          })
          .join("");
        return tryParseJsonFromContent(joined);
      }

      if (content && typeof content === "object") {
        // Some SDKs wrap again: { content: "{...}" } or { text: "{...}" }
        const inner = typeof content.content === "string"
          ? content.content
          : typeof content.text === "string"
            ? content.text
            : null;
        if (inner) {
          return tryParseJsonFromContent(inner);
        }
        return content;
      }

      if (typeof content !== "string") return null;
      const text = stripCodeFences(content);
      try {
        return JSON.parse(text);
      } catch {}
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const candidate = text.slice(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(candidate);
        } catch {}
      }
      return null;
    }

    function clampScore(score) {
      if (Number.isNaN(score)) return 5;
      return Math.max(0, Math.min(10, Math.round(score)));
    }

    function extractFromUnstructured(content) {
      const text = stripCodeFences(typeof content === "string" ? content : "");
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

      // Score detection (EN/ES)
      const scorePatterns = [
        /\bprivacy\s*(?:abuse\s*)?score\b\s*[:\-]?\s*(\d{1,2})(?:\s*\/\s*10)?/i,
        /\bscore\b\s*[:\-]?\s*(\d{1,2})(?:\s*\/\s*10)?/i,
        /\bpuntuaci[oó]n\s*(?:de\s*privacidad)?\b\s*[:\-]?\s*(\d{1,2})(?:\s*\/\s*10)?/i,
        /\bpuntaje\s*(?:de\s*privacidad)?\b\s*[:\-]?\s*(\d{1,2})(?:\s*\/\s*10)?/i,
        /\b(\d{1,2})\s*\/\s*10\b/,
      ];
      let detectedScore = undefined;
      let scoreLineIndex = -1;
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        for (const re of scorePatterns) {
          const m = line.match(re);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!Number.isNaN(n)) {
              detectedScore = clampScore(n);
              scoreLineIndex = i;
              break;
            }
          }
        }
        if (detectedScore !== undefined) break;
      }

      // Explanation: prefer text after the score on same line or the next line
      let explanation = "";
      if (scoreLineIndex !== -1) {
        const after = lines[scoreLineIndex].replace(/^[^:\-]+[:\-]?\s*/, "");
        const afterNumber = after.replace(/^(\d{1,2})(?:\s*\/\s*10)?\s*/, "").trim();
        if (afterNumber && /[a-zA-Z\u00C0-\u017F]/.test(afterNumber)) {
          explanation = afterNumber;
        } else if (lines[scoreLineIndex + 1]) {
          const next = lines[scoreLineIndex + 1];
          if (/(explana|explica|porque|motivo|reason|because|justif)/i.test(next)) {
            explanation = next;
          }
        }
      }

      // Summary detection: capture section under Summary/Resumen heading if present
      const headingIdx = lines.findIndex((l) => /^(summary|resumen)\b[:\-]?/i.test(l));
      let summaryText = "";
      if (headingIdx !== -1) {
        const section = [];
        for (let i = headingIdx + 1; i < lines.length; i += 1) {
          const l = lines[i];
          if (/^#{1,6}\s+/.test(l) || /^(score|puntuaci[oó]n|puntaje)\b/i.test(l) || /^(rights|derechos)\b/i.test(l)) {
            break;
          }
          section.push(lines[i]);
        }
        summaryText = section.join("\n").trim();
      }
      if (!summaryText) {
        // Fallback: remove the score line and return remaining text
        const body = lines.filter((_, idx) => idx !== scoreLineIndex).join("\n").trim();
        summaryText = body || text;
      }

      const finalScore = detectedScore !== undefined ? detectedScore : 5;
      const finalExplanation = explanation || (detectedScore !== undefined ? "Detected score from response." : "No explicit score provided; using neutral score.");
      return {
        privacy_score: finalScore,
        score_explanation: finalExplanation,
        summary: summaryText,
      };
    }

    let parsed = tryParseJsonFromContent(rawContent);
    if (!parsed) {
      // Some providers also place JSON inside top-level data fields – attempt those
      const altContent =
        data.choices?.[0]?.message?.reasoning_content ||
        data.choices?.[0]?.message?.tool_content ||
        data.choices?.[0]?.message?.content_text ||
        null;
      if (altContent) parsed = tryParseJsonFromContent(altContent);
    }
    if (!parsed) {
      parsed = extractFromUnstructured(rawContent);
    }

    // Normalize and validate required fields
    const norm = (() => {
      // If still wrapped
      if (parsed && typeof parsed === "object" && parsed.content && typeof parsed.content === "string") {
        const inner = tryParseJsonFromContent(parsed.content);
        if (inner) parsed = inner;
      }

      // If parsed is an array of segments, try again
      if (Array.isArray(parsed)) {
        parsed = tryParseJsonFromContent(parsed) || extractFromUnstructured(String(parsed));
      }

      let score = parsed?.privacy_score;
      // Accept numeric strings
      if (typeof score === "string") {
        const n = Number(score);
        if (!Number.isNaN(n)) score = n;
      }
      if (typeof score !== "number") {
        // As a last resort, try to find score inside a nested field
        const maybe = tryParseJsonFromContent(parsed?.summary || parsed?.text || "");
        if (maybe && typeof maybe.privacy_score === "number") score = maybe.privacy_score;
      }
      score = clampScore(Number(score));

      let explanation = String(parsed?.score_explanation ?? "");
      // Enforce ultra-brief, title-style explanation: trim, remove trailing period, cap words
      explanation = explanation.trim().replace(/[\.\s]+$/g, "");
      const words = explanation.split(/\s+/).filter(Boolean);
      if (words.length > 8) explanation = words.slice(0, 8).join(" ");
      explanation = explanation.replace(/\.$/, "");
      const summary = String(parsed?.summary ?? "");
      return { privacy_score: score, score_explanation: explanation, summary };
    })();

    if (
      typeof norm.score_explanation !== "string" ||
      typeof norm.summary !== "string"
    ) {
      throw new Error("Missing required fields in response");
    }
    if (norm.privacy_score < 0 || norm.privacy_score > 10) {
      throw new Error("privacy_score out of range (must be 0-10)");
    }

    return norm;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw err;
  }
}
