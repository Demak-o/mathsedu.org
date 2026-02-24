import { API_BASE } from "./config.js";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export const api = {
  signup: (payload) => request("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  verifyPhone: (payload) => request("/api/auth/verify-phone", { method: "POST", body: JSON.stringify(payload) }),
  createGroup: (payload, token) =>
    request("/api/portal/groups", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  listGroups: (token) => request("/api/portal/groups", { headers: { Authorization: `Bearer ${token}` } }),
  submitScore: (payload, token) =>
    request("/api/games/scores", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  leaderboard: (gameId) => request(`/api/games/leaderboard/${encodeURIComponent(gameId)}`),
};
