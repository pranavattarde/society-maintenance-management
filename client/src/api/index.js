/**
 * API module — single source for all HTTP communication.
 *
 * Uses the native fetch API. No external HTTP library.
 *
 * The base request function:
 *   - Attaches the Authorization header when a token is provided
 *   - Sets Content-Type for JSON bodies
 *   - Passes FormData bodies without Content-Type (browser sets multipart boundary)
 *   - Throws a structured error for non-2xx responses
 *
 * All API functions read the token from AuthContext via the caller —
 * they do not access localStorage directly.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * @param {string} method - HTTP method
 * @param {string} path - API path (e.g. '/auth/login')
 * @param {object|FormData|null} body
 * @param {string|null} token - JWT access token
 * @returns {Promise<object>}
 * @throws {Error} with message from server and optional .errors array
 */
async function request(method, path, body = null, token = null) {
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = { method, headers };

  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== null) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "We couldn't complete your request. Please try again in a moment.");
    error.status = response.status;
    error.errors = data.errors || [];
    throw error;
  }

  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  register: (data) => request('POST', '/auth/register', data),
  login: (data) => request('POST', '/auth/login', data),
  me: (token) => request('GET', '/auth/me', null, token),
};

// ─── Complaints ───────────────────────────────────────────────────────────────

export const complaints = {
  list: (params = {}, token) => {
    const query = new URLSearchParams(params).toString();
    return request('GET', `/complaints${query ? `?${query}` : ''}`, null, token);
  },
  create: (formData, token) => request('POST', '/complaints', formData, token),
  getById: (id, token) => request('GET', `/complaints/${id}`, null, token),
  updateStatus: (id, data, token) => request('PATCH', `/complaints/${id}/status`, data, token),
};

// ─── Notices ──────────────────────────────────────────────────────────────────

export const notices = {
  list: (token) => request('GET', '/notices', null, token),
  create: (data, token) => request('POST', '/notices', data, token),
  update: (id, data, token) => request('PATCH', `/notices/${id}`, data, token),
  togglePin: (id, token) => request('PATCH', `/notices/${id}/pin`, null, token),
  delete: (id, token) => request('DELETE', `/notices/${id}`, null, token),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboard = {
  get: (token) => request('GET', '/dashboard', null, token),
};

// ─── AI Assistant ─────────────────────────────────────────────────────────────

export const ai = {
  /**
   * Sends raw complaint text to the AI service for structured analysis.
   *
   * @param {string} complaint - Free-text complaint (min 20 chars)
   * @param {string} token     - JWT access token
   * @returns {Promise<{title, category, priority, summary, reasoning, confidence}>}
   */
  analyze: (complaint, token) =>
    request('POST', '/ai/analyze-complaint', { complaint }, token),

  /**
   * Checks new complaint text against recent unresolved complaints for duplicates.
   *
   * @param {string} complaint - Combined title + description text (min 10 chars)
   * @param {string} token     - JWT access token
   * @returns {Promise<{data: [{complaintId, title, category, status, createdAt, similarity, reason}]}>}
   */
  detectDuplicates: (complaint, token) =>
    request('POST', '/ai/detect-duplicates', { complaint }, token),

  /**
   * Parses natural language queries into structured search filter criteria.
   *
   * @param {string} query - The natural language search query
   * @param {string} token - JWT access token
   * @returns {Promise<{data: {status, category, priority, date, search}}>}
   */
  parseSearch: (query, token) =>
    request('POST', '/ai/parse-search', { query }, token),

  /**
   * Fetches AI operations insights summaries.
   *
   * @param {string} token - JWT access token
   * @returns {Promise<{data: {insights: string[]}}>}
   */
  getOperationsInsights: (token) =>
    request('GET', '/ai/operations-insights', null, token),

  /**
   * Generates notice or resolution writing texts based on instructions.
   *
   * @param {string} type        - 'NOTICE' or 'RESOLUTION'
   * @param {string} instruction - Brief prompt/instructions
   * @param {string} token       - JWT access token
   * @returns {Promise<{data: object}>}
   */
  generateText: (type, instruction, token) =>
    request('POST', '/ai/generate-text', { type, instruction }, token),
};

// ─── Users & Profiles ────────────────────────────────────────────────────────
export const users = {
  list: (params = {}, token) => {
    const query = new URLSearchParams(params).toString();
    return request('GET', `/users${query ? `?${query}` : ''}`, null, token);
  },
  updateRole: (id, role, token) => request('PATCH', `/users/${id}/role`, { role }, token),
  updateProfile: (formData, token) => request('PATCH', '/users/profile', formData, token),
};
