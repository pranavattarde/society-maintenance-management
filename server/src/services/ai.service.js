/**
 * ai.service.js — Groq LLM integration for complaint analysis.
 *
 * Calls the Groq Chat Completions API with a strict JSON prompt.
 * Tries 3 models in priority order; if a model fails it falls through
 * to the next. All errors bubble up as ApiError instances.
 *
 * Expected LLM output (strict JSON, no markdown):
 * {
 *   "title":      "Concise issue title",
 *   "category":   "PLUMBING" | "ELECTRICAL" | "CLEANING" | "SECURITY" | "LIFT" | "PARKING" | "OTHER",
 *   "priority":   "LOW" | "MEDIUM" | "HIGH",
 *   "summary":    "One-sentence summary for admin",
 *   "reasoning":  "Why this category and priority were chosen",
 *   "confidence": 0-100
 * }
 */

const ApiError = require('../utils/ApiError');

// ─── Constants ────────────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Priority order for model fallback */
const MODELS = [
  'openai/gpt-oss-20b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.1-8b-instant',
];

const VALID_CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'CLEANING', 'SECURITY', 'LIFT', 'PARKING', 'OTHER'];
const VALID_PRIORITIES  = ['LOW', 'MEDIUM', 'HIGH'];

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a complaint analyst for a residential society management system.

When given a resident's complaint text, you MUST respond with STRICT JSON only.
Do NOT include markdown, code fences, explanations, or any text outside the JSON object.

Return exactly this JSON structure:
{
  "title": "A concise 5-10 word title summarising the issue",
  "category": "One of: PLUMBING, ELECTRICAL, CLEANING, SECURITY, LIFT, PARKING, OTHER",
  "priority": "One of: LOW, MEDIUM, HIGH",
  "summary": "One sentence summary suitable for an admin dashboard",
  "reasoning": "Brief explanation of why you chose this category and priority",
  "confidence": <integer 0-100 representing your confidence in this classification>
}

Category definitions:
- PLUMBING: water leaks, pipe issues, drainage, taps, toilets
- ELECTRICAL: power outages, wiring, short circuits, lighting, switches
- CLEANING: garbage, dirt, hygiene, common area cleanliness
- SECURITY: unauthorized access, broken locks, CCTV, guard issues
- LIFT: elevator malfunction, service, noise, doors
- PARKING: parking violations, blocked spaces, signage
- OTHER: anything that does not fit the above categories

Priority definitions:
- HIGH: safety hazard, affects many residents, service outage, immediate risk
- MEDIUM: inconvenience, affects few residents, non-urgent repair needed
- LOW: cosmetic issue, minor inconvenience, routine maintenance

Respond with only the JSON object. No preamble. No postamble.`;

// ─── Core Groq Call ───────────────────────────────────────────────────────────

/**
 * Calls Groq with a specific model. Returns parsed JSON result or throws.
 *
 * @param {string} model - Groq model identifier
 * @param {string} complaintText - Raw complaint text from resident
 * @param {string} apiKey - Groq API key
 * @returns {Promise<object>} Parsed AI analysis result
 */
async function callGroqModel(model, complaintText, apiKey) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: `Analyse this complaint: ${complaintText}` },
      ],
      temperature: 0.2,        // low temperature → consistent structured output
      max_tokens:  512,
      response_format: { type: 'json_object' }, // Groq JSON mode (supported on most models)
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq ${model} responded ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`Groq ${model} returned empty content`);

  return content;
}

// ─── Response Validator ───────────────────────────────────────────────────────

/**
 * Parses and validates the LLM JSON response.
 * Normalises category and priority to uppercase enums.
 * Throws ApiError(422) if the shape is invalid.
 *
 * @param {string} rawContent - Raw string from LLM
 * @returns {object} Validated and normalised result
 */
function parseAndValidate(rawContent) {
  let parsed;
  try {
    // Strip markdown fences just in case the model ignores instructions
    const cleaned = rawContent.replace(/```(?:json)?/gi, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ApiError(422, 'AI returned malformed JSON. Please try again.');
  }

  const { title, category, priority, summary, reasoning, confidence } = parsed;

  if (!title || typeof title !== 'string') {
    throw new ApiError(422, 'AI response missing valid title field.');
  }

  const normCategory = (category || '').toString().toUpperCase().trim();
  const normPriority  = (priority  || '').toString().toUpperCase().trim();

  if (!VALID_CATEGORIES.includes(normCategory)) {
    throw new ApiError(422, `AI returned unknown category: ${category}`);
  }
  if (!VALID_PRIORITIES.includes(normPriority)) {
    throw new ApiError(422, `AI returned unknown priority: ${priority}`);
  }

  const normConfidence = Math.min(100, Math.max(0, parseInt(confidence, 10) || 70));

  return {
    title:      title.trim().slice(0, 100),
    category:   normCategory,
    priority:   normPriority,
    summary:    (summary   || '').toString().trim(),
    reasoning:  (reasoning || '').toString().trim(),
    confidence: normConfidence,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyses a resident complaint using Groq LLM with model fallback.
 *
 * Tries models in MODELS array order. If one fails (network, rate-limit,
 * model unavailable) it logs the failure and tries the next.
 * Throws ApiError if all models fail or the API key is absent.
 *
 * @param {string} complaintText - Free-text complaint from the resident
 * @returns {Promise<object>} { title, category, priority, summary, reasoning, confidence }
 */
async function analyzeComplaint(complaintText) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new ApiError(503, 'AI service is not configured. Contact the administrator.');
  }

  const errors = [];

  for (const model of MODELS) {
    try {
      const rawContent = await callGroqModel(model, complaintText, apiKey);
      const result     = parseAndValidate(rawContent);
      return result;
    } catch (err) {
      // If it's already an ApiError (validation failure), rethrow immediately
      if (err instanceof ApiError) throw err;

      const message = `[ai.service] Model ${model} failed: ${err.message}`;
      console.warn(message);
      errors.push(message);
    }
  }

  // All models exhausted
  console.error('[ai.service] All Groq models failed:', errors);
  throw new ApiError(502, 'AI service is temporarily unavailable. Please try again shortly.');
}

module.exports = { analyzeComplaint };
