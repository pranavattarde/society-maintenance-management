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

const ApiError  = require('../utils/ApiError');
const prisma    = require('../config/db');
const { STATUS } = require('../utils/constants');

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
 * Calls Groq with a specific model. Returns raw content string or throws.
 *
 * Accepts an optional systemPrompt so duplicate detection can reuse
 * the same HTTP plumbing with a different prompt.
 *
 * @param {string} model        - Groq model identifier
 * @param {string} userMessage  - The user-role message content
 * @param {string} apiKey       - Groq API key
 * @param {string} [systemPrompt=SYSTEM_PROMPT] - System prompt override
 * @returns {Promise<string>} Raw LLM response content string
 */
async function callGroqModel(model, userMessage, apiKey, systemPrompt = SYSTEM_PROMPT) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage },
      ],
      temperature: 0.2,
      max_tokens:  600,
      response_format: { type: 'json_object' },
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
      const rawContent = await callGroqModel(model, `Analyse this complaint: ${complaintText}`, apiKey);
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

// ─── Duplicate Detection Prompt ───────────────────────────────────────────────

const DUPLICATE_DETECTION_PROMPT = `You are a duplicate complaint detector for a residential society maintenance system.

Given a new complaint and a numbered list of existing open complaints, identify which are most similar to the new one.

Return ONLY a JSON object in this exact format — no markdown, no preamble:
{
  "matches": [
    {
      "complaintId": "<exact id from list>",
      "similarity": <integer 0-100>,
      "reason": "<one concise sentence explaining the similarity>"
    }
  ]
}

Rules:
- Include ONLY matches with similarity >= 30
- Return at most 3 results, ordered by similarity descending (highest first)
- If no matches score >= 30, return: {"matches": []}
- complaintId MUST exactly match one of the IDs provided — never invent or modify IDs
- Focus on semantic similarity: same problem type, location, or system affected
- Examples:
  "Water leaking from ceiling" vs "Water dripping from roof" → ~90%
  "Broken lights in lobby" vs "Power outage on floor 2" → ~60%
  "Garbage not collected" vs "Broken lift" → ~5%`;

// ─── Duplicate Response Parser ────────────────────────────────────────────────

/**
 * Parses and validates the Groq duplicate detection response.
 * Filters out invalid IDs, enforces similarity threshold, and enriches
 * each match with the actual complaint data from the DB.
 *
 * @param {string}   rawContent        - Raw LLM content string
 * @param {object[]} existingComplaints - DB complaint records
 * @returns {object[]} Enriched, validated match array (max 3)
 */
function parseDuplicateResponse(rawContent, existingComplaints) {
  let parsed;
  try {
    const cleaned = rawContent.replace(/```(?:json)?/gi, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // Malformed JSON — treat as no matches (non-fatal)
    console.warn('[ai.service] Duplicate response was not valid JSON, treating as empty.');
    return [];
  }

  const rawMatches = Array.isArray(parsed.matches) ? parsed.matches : [];
  const existingMap = new Map(existingComplaints.map((c) => [c.id, c]));

  return rawMatches
    .filter((m) => {
      if (!m.complaintId || !existingMap.has(m.complaintId)) return false;
      const sim = parseInt(m.similarity, 10);
      return !isNaN(sim) && sim >= 30;
    })
    .map((m) => {
      const complaint = existingMap.get(m.complaintId);
      return {
        complaintId: m.complaintId,
        similarity:  Math.min(100, Math.max(0, parseInt(m.similarity, 10))),
        reason:      (m.reason || '').toString().trim(),
        // DB-enriched fields for frontend display
        title:       complaint.title,
        category:    complaint.category,
        status:      complaint.status,
        createdAt:   complaint.createdAt,
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

// ─── Public: Detect Duplicates ────────────────────────────────────────────────

/**
 * Compares a new complaint text against recent unresolved complaints using Groq.
 *
 * Workflow:
 *   1. Fetch last 30 OPEN/IN_PROGRESS complaints from the last 60 days
 *   2. Build a compact prompt with truncated descriptions (token-safe)
 *   3. Call Groq with model fallback
 *   4. Parse, validate, and enrich the response
 *   5. Return top 3 matches with similarity >= 30
 *
 * Returns an empty array when:
 *   - No existing unresolved complaints found
 *   - AI returns no matches above the threshold
 *   - All models fail (non-throwing — caller handles gracefully)
 *
 * @param {string} newComplaintText - Combined title + description text
 * @returns {Promise<object[]>} Enriched match array (max 3)
 */
async function detectDuplicates(newComplaintText) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new ApiError(503, 'AI service is not configured.');

  // ── Fetch recent unresolved complaints ────────────────────────────────────
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const existing = await prisma.complaint.findMany({
    where: {
      status:    { in: [STATUS.OPEN, STATUS.IN_PROGRESS] },
      createdAt: { gte: sixtyDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id:        true,
      title:     true,
      description: true,
      category:  true,
      status:    true,
      createdAt: true,
    },
  });

  // Nothing to compare against — return immediately without calling Groq
  if (existing.length === 0) return [];

  // ── Build compact prompt payload ──────────────────────────────────────────
  const complaintsList = existing
    .map((c) => `${c.id}: "${c.title}" — "${c.description.slice(0, 150)}"`)
    .join('\n');

  const userMessage = [
    `New complaint: "${newComplaintText.slice(0, 400)}"`,
    '',
    'Existing unresolved complaints to compare against:',
    complaintsList,
  ].join('\n');

  // ── Model fallback loop ───────────────────────────────────────────────────
  const errors = [];

  for (const model of MODELS) {
    try {
      const rawContent = await callGroqModel(
        model,
        userMessage,
        apiKey,
        DUPLICATE_DETECTION_PROMPT,
      );
      return parseDuplicateResponse(rawContent, existing);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const msg = `[ai.service] detectDuplicates model ${model} failed: ${err.message}`;
      console.warn(msg);
      errors.push(msg);
    }
  }

  console.error('[ai.service] All models failed for duplicate detection:', errors);
  throw new ApiError(502, 'AI service temporarily unavailable.');
}

// ─── Search Intent Parser ─────────────────────────────────────────────────────

async function parseSearchIntent(query) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new ApiError(503, 'AI service is not configured.');

  const currentDateStr = new Date().toISOString().split('T')[0];
  const systemPrompt = `You are a search intent parser for a residential society complaint backlog.
Extract the user's search intent into a structured JSON filter.

Rules:
- Respond with STRICT JSON only.
- Fields to return:
  - "status": "OPEN" | "IN_PROGRESS" | "RESOLVED" | "UNRESOLVED" | null
  - "category": "PLUMBING" | "ELECTRICAL" | "CLEANING" | "SECURITY" | "LIFT" | "PARKING" | "OTHER" | null
  - "priority": "LOW" | "MEDIUM" | "HIGH" | null
  - "date": "YYYY-MM-DD" | null (calculate based on context: today is ${currentDateStr}. E.g. "yesterday" is 1 day ago)
  - "search": a keyword string query (e.g. flat number "B-302", tower "Tower A", resident name, or keywords like "leak") or null.

Current Date: ${currentDateStr}

Examples:
"Show unresolved plumbing complaints from Tower A" -> {"status": "UNRESOLVED", "category": "PLUMBING", "search": "Tower A"}
"Show complaints from Flat B-302" -> {"search": "B-302"}
"Show high priority lift complaints" -> {"priority": "HIGH", "category": "LIFT"}
"Show electrical complaints today" -> {"category": "ELECTRICAL", "date": "${currentDateStr}"}

Respond ONLY with the JSON object.`;

  const errors = [];
  for (const model of MODELS) {
    try {
      const rawContent = await callGroqModel(model, `Parse this search query: "${query}"`, apiKey, systemPrompt);
      const cleaned = rawContent.replace(/```(?:json)?/gi, '').trim();
      const parsed = JSON.parse(cleaned);

      const status = parsed.status ? parsed.status.toUpperCase().trim() : null;
      const category = parsed.category ? parsed.category.toUpperCase().trim() : null;
      const priority = parsed.priority ? parsed.priority.toUpperCase().trim() : null;

      return {
        status: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'UNRESOLVED'].includes(status) ? status : null,
        category: ['PLUMBING', 'ELECTRICAL', 'CLEANING', 'SECURITY', 'LIFT', 'PARKING', 'OTHER'].includes(category) ? category : null,
        priority: ['LOW', 'MEDIUM', 'HIGH'].includes(priority) ? priority : null,
        date: parsed.date || null,
        search: parsed.search || null,
      };
    } catch (err) {
      console.warn(`[ai.service] parseSearchIntent model ${model} failed: ${err.message}`);
      errors.push(err.message);
    }
  }
  throw new ApiError(502, 'AI search intent service temporarily unavailable.');
}

// ─── Operations Insights Generator ────────────────────────────────────────────

async function generateOperationsInsights() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new ApiError(503, 'AI service is not configured.');

  const [activeList, total, open, progress, resolved] = await Promise.all([
    prisma.complaint.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        title: true,
        category: true,
        priority: true,
        status: true,
        createdAt: true,
        resident: { select: { flatNumber: true } },
      },
    }),
    prisma.complaint.count(),
    prisma.complaint.count({ where: { status: 'OPEN' } }),
    prisma.complaint.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.complaint.count({ where: { status: 'RESOLVED' } }),
  ]);

  if (total === 0 || activeList.length < 2) {
    return {
      insights: ['Insufficient data exists; meaningful insights cannot yet be generated.'],
    };
  }

  const activeFormatted = activeList
    .map((c, i) => `${i + 1}. "${c.title}" - Category: ${c.category}, Priority: ${c.priority}, Status: ${c.status}, Unit: ${c.resident?.flatNumber}, Created: ${c.createdAt.toISOString().split('T')[0]}`)
    .join('\n');

  const statsText = `
Total Registered Tickets: ${total}
Open Tickets: ${open}
In Progress Tickets: ${progress}
Resolved Tickets: ${resolved}

Recent Active (Unresolved) Complaints List:
${activeFormatted}
  `.trim();

  const systemPrompt = `You are a property operations analyst.
Analyze the provided community complaints log and statistics. Generate a list of exactly 4 to 6 concise, professional, actionable operational insights.

Rules:
- Bullet points must be strictly factual, derived from the logs and statistics. No hallucinations.
- Identify categories with high activity, repeat locations/flats, SLA risks (tickets open for over a week), or bottlenecks.
- Keep each point under 15 words.
- Format your response as a strict JSON object:
  {"insights": ["Insight 1", "Insight 2", ...]}

Respond with only the JSON object.`;

  const errors = [];
  for (const model of MODELS) {
    try {
      const rawContent = await callGroqModel(model, statsText, apiKey, systemPrompt);
      const cleaned = rawContent.replace(/```(?:json)?/gi, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && Array.isArray(parsed.insights)) {
        return parsed;
      }
    } catch (err) {
      console.warn(`[ai.service] generateOperationsInsights model ${model} failed: ${err.message}`);
      errors.push(err.message);
    }
  }
  return {
    insights: ['AI service is temporarily unavailable. Could not load operations insights.'],
  };
}

// ─── Writing Assistant ────────────────────────────────────────────────────────

async function generateText(type, instruction) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new ApiError(503, 'AI service is not configured.');

  const systemPrompt = `You are a professional administrative writing assistant for residential community operations.
Based on the user's brief instruction, generate a high-quality, professional response.

If type is "NOTICE", generate a formal community announcement. Return strictly this JSON structure:
{
  "title": "Clear, professional notice title",
  "content": "Well-structured notice content with appropriate formatting",
  "summary": "One sentence summary of the notice",
  "tone": "Brief description of the chosen tone (e.g. Formal, urgent, polite)"
}

If type is "RESOLUTION", generate a courteous resident-facing resolution message. Return strictly this JSON structure:
{
  "content": "Courteous resolution message explaining the issue has been resolved, asking them to check, and thanking them for patience."
}

Ensure the output is STRICT JSON with no markdown formatting outside it.`;

  const userMessage = `Type: ${type}\nInstruction: ${instruction}`;

  const errors = [];
  for (const model of MODELS) {
    try {
      const rawContent = await callGroqModel(model, userMessage, apiKey, systemPrompt);
      const cleaned = rawContent.replace(/```(?:json)?/gi, '').trim();
      const parsed = JSON.parse(cleaned);
      return parsed;
    } catch (err) {
      console.warn(`[ai.service] generateText model ${model} failed: ${err.message}`);
      errors.push(err.message);
    }
  }
  throw new ApiError(502, 'AI writing assistant is temporarily unavailable.');
}

module.exports = {
  analyzeComplaint,
  detectDuplicates,
  parseSearchIntent,
  generateOperationsInsights,
  generateText,
};
