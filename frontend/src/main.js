import { api } from "./api.js";

let authToken = "";

function formDataToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function setJson(id, value) {
  document.getElementById(id).textContent = JSON.stringify(value, null, 2);
}

document.getElementById("signup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = formDataToObject(event.target);
    const result = await api.signup(payload);
    setText("signup-result", `Created user ${result.user.email}. OTP logged by backend dev provider.`);
    event.target.reset();
  } catch (error) {
    setText("signup-result", error.message);
  }
});

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = formDataToObject(event.target);
    const result = await api.login(payload);
    authToken = result.token;
    setText("login-result", `Logged in as ${result.user.displayName}`);
  } catch (error) {
    setText("login-result", error.message);
  }
});

document.getElementById("verify-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = formDataToObject(event.target);
    await api.verifyPhone(payload);
    setText("verify-result", "Phone verified");
  } catch (error) {
    setText("verify-result", error.message);
  }
});

document.getElementById("group-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!authToken) return setJson("groups-output", { error: "Login first" });
  try {
    const payload = formDataToObject(event.target);
    const group = await api.createGroup(payload, authToken);
    setJson("groups-output", group);
    event.target.reset();
  } catch (error) {
    setJson("groups-output", { error: error.message });
  }
});

document.getElementById("list-groups").addEventListener("click", async () => {
  if (!authToken) return setJson("groups-output", { error: "Login first" });
  try {
    const groups = await api.listGroups(authToken);
    setJson("groups-output", groups);
  } catch (error) {
    setJson("groups-output", { error: error.message });
  }
});

document.getElementById("score-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!authToken) return setJson("leaderboard-output", { error: "Login first" });
  try {
    const payload = formDataToObject(event.target);
    payload.points = Number(payload.points);
    const score = await api.submitScore(payload, authToken);
    setJson("leaderboard-output", score);
  } catch (error) {
    setJson("leaderboard-output", { error: error.message });
  }
});

document.getElementById("leaderboard-btn").addEventListener("click", async () => {
  try {
    const data = await api.leaderboard("aim-trainer");
    setJson("leaderboard-output", data);
  } catch (error) {
    setJson("leaderboard-output", { error: error.message });
  }
});
