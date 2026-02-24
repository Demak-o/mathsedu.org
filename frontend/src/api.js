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

  createGroup: (payload, token) =>
    request("/api/portal/groups", {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(payload),
    }),

  listGroups: (token) => request("/api/portal/groups", { headers: authHeader(token) }),

  sendMessage: (groupId, payload, token) =>
    request(`/api/portal/groups/${encodeURIComponent(groupId)}/messages`, {
      method: "POST",
      headers: authHeader(token),
      body: JSON.stringify(payload),
    }),

  listMessages: (groupId, token) =>
    request(`/api/portal/groups/${encodeURIComponent(groupId)}/messages`, {
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
