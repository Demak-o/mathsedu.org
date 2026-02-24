import { API_BASE } from "./config.js";

async function request(path, options = {}) {
  const { headers: optionHeaders = {}, ...restOptions } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...optionHeaders,
    },
    ...restOptions,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  signup: (payload) => request("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),

  listConversations: (token) => request("/api/portal/conversations", { headers: authHeader(token) }),

  createConversation: (payload, token) =>
    request("/api/portal/conversations", {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(payload),
    }),

  sendMessage: (conversationId, payload, token) =>
    request(`/api/portal/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(payload),
    }),

  listMessages: (conversationId, token) =>
    request(`/api/portal/conversations/${encodeURIComponent(conversationId)}/messages`, {
      headers: authHeader(token),
    }),

  submitScore: (payload, token) =>
    request("/api/games/scores", {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(payload),
    }),

  leaderboard: (gameId) => request(`/api/games/leaderboard/${encodeURIComponent(gameId)}`),
  totalLeaderboard: () => request("/api/games/leaderboard-total"),
};
