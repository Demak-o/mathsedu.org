import { api } from "./api.js";

let authToken = "";
let currentUser = null;

let clickRush = { active: false, score: 0, timer: null };
let mathSprint = { active: false, score: 0, timer: null, secondsLeft: 30, answer: 0 };

function formDataToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function userFacingError(error) {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "Cannot reach backend right now. Check Render deploy/CORS and try again.";
  }
  return error.message;
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function renderEmpty(containerId, text) {
  const container = document.getElementById(containerId);
  clearNode(container);
  const empty = document.createElement("p");
  empty.className = "output-muted";
  empty.textContent = text;
  container.appendChild(empty);
}

function renderError(containerId, message) {
  const container = document.getElementById(containerId);
  clearNode(container);
  const errorNode = document.createElement("p");
  errorNode.className = "output-error";
  errorNode.textContent = message;
  container.appendChild(errorNode);
}

function renderGroups(groups) {
  if (!Array.isArray(groups) || groups.length === 0) {
    renderEmpty("groups-output", "No groups yet. Create your first one.");
    return;
  }

  const container = document.getElementById("groups-output");
  clearNode(container);

  groups.forEach((group) => {
    const item = document.createElement("article");
    item.className = "output-item";

    const title = document.createElement("h5");
    title.textContent = group.name;

    const meta = document.createElement("p");
    meta.className = "output-meta";
    meta.textContent = `Group ID: ${group.id}`;

    item.append(title, meta);
    container.appendChild(item);
  });
}

function renderMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    renderEmpty("messages-output", "No messages in this group yet.");
    return;
  }

  const container = document.getElementById("messages-output");
  clearNode(container);

  messages.forEach((message) => {
    const item = document.createElement("article");
    item.className = "output-item";

    const body = document.createElement("p");
    body.textContent = message.text;

    const meta = document.createElement("p");
    meta.className = "output-meta";
    meta.textContent = `Sender: ${message.senderId}`;

    item.append(body, meta);
    container.appendChild(item);
  });
}

function renderLeaderboard(board) {
  if (!board?.top || board.top.length === 0) {
    renderEmpty("leaderboard-output", "No scores yet for this game.");
    return;
  }

  const container = document.getElementById("leaderboard-output");
  clearNode(container);

  board.top.forEach((entry, index) => {
    const item = document.createElement("article");
    item.className = "output-item";

    const title = document.createElement("h5");
    title.textContent = `#${index + 1} ${entry.displayName}`;

    const meta = document.createElement("p");
    meta.className = "output-meta";
    meta.textContent = `${entry.points} points`;

    item.append(title, meta);
    container.appendChild(item);
  });
}

function showGuest(panelId = "home-panel") {
  document.body.classList.remove("mode-app");
  document.body.classList.add("mode-guest");

  document.getElementById("guest-shell").classList.remove("hidden");
  document.getElementById("app-shell").classList.add("hidden");

  ["home-panel", "signup-panel", "signin-panel"].forEach((id) => {
    document.getElementById(id).classList.add("hidden");
  });
  document.getElementById(panelId).classList.remove("hidden");
}

function showApp(tab = "portal") {
  document.body.classList.remove("mode-guest");
  document.body.classList.add("mode-app");

  document.getElementById("guest-shell").classList.add("hidden");
  document.getElementById("app-shell").classList.remove("hidden");

  const welcome = currentUser ? `Welcome, ${currentUser.displayName}` : "Welcome";
  setText("welcome-title", welcome);

  document.querySelectorAll(".tab-chip").forEach((button) => {
    const active = button.dataset.tab === tab;
    button.classList.toggle("active", active);
  });
  document.getElementById("portal-tab").classList.toggle("hidden", tab !== "portal");
  document.getElementById("games-tab").classList.toggle("hidden", tab !== "games");
}

function setSession(token, user) {
  authToken = token;
  currentUser = user;
  sessionStorage.setItem("authToken", token);
  sessionStorage.setItem("authUser", JSON.stringify(user));
}

function clearSession() {
  authToken = "";
  currentUser = null;
  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("authUser");
}

function restoreSession() {
  const token = sessionStorage.getItem("authToken");
  const rawUser = sessionStorage.getItem("authUser");
  if (!token || !rawUser) return false;
  try {
    const user = JSON.parse(rawUser);
    setSession(token, user);
    return true;
  } catch {
    return false;
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nextMathQuestion() {
  const a = randomInt(2, 30);
  const b = randomInt(2, 30);
  const operator = Math.random() > 0.5 ? "+" : "-";
  mathSprint.answer = operator === "+" ? a + b : a - b;
  setText("math-question", `${a} ${operator} ${b}`);
}

function endClickRush() {
  clickRush.active = false;
  clearTimeout(clickRush.timer);
  document.getElementById("click-rush-board").classList.add("hidden");
  setText("click-rush-status", `Finished: ${clickRush.score} points. Game ID: click-rush`);
  document.querySelector("#submit-score-form [name='gameId']").value = "click-rush";
  document.querySelector("#submit-score-form [name='points']").value = String(clickRush.score);
}

function endMathSprint() {
  mathSprint.active = false;
  clearInterval(mathSprint.timer);
  document.getElementById("math-board").classList.add("hidden");
  setText("math-status", `Finished: ${mathSprint.score} points. Game ID: math-sprint`);
  document.querySelector("#submit-score-form [name='gameId']").value = "math-sprint";
  document.querySelector("#submit-score-form [name='points']").value = String(mathSprint.score);
}

function setupEvents() {
  document.getElementById("show-signup").addEventListener("click", () => showGuest("signup-panel"));
  document.getElementById("show-signin").addEventListener("click", () => showGuest("signin-panel"));
  document.getElementById("back-from-signup").addEventListener("click", () => showGuest("home-panel"));
  document.getElementById("back-from-signin").addEventListener("click", () => showGuest("home-panel"));

  document.getElementById("signup-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = formDataToObject(event.target);
      if (payload.password !== payload.confirmPassword) {
        setText("signup-result", "Passwords do not match");
        return;
      }

      await api.signup({
        displayName: payload.displayName,
        realName: payload.realName,
        email: payload.email,
        phone: payload.phone,
        password: payload.password,
      });

      setText("signup-result", "Account created. Redirecting to sign in...");
      event.target.reset();
      setTimeout(() => showGuest("signin-panel"), 550);
    } catch (error) {
      setText("signup-result", userFacingError(error));
    }
  });

  document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = formDataToObject(event.target);
      const result = await api.login(payload);
      setSession(result.token, result.user);
      setText("login-result", "Signed in");
      showApp("portal");
    } catch (error) {
      setText("login-result", userFacingError(error));
    }
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    clearSession();
    showGuest("home-panel");
  });

  document.querySelectorAll(".tab-chip").forEach((button) => {
    button.addEventListener("click", () => showApp(button.dataset.tab));
  });

  document.getElementById("group-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = formDataToObject(event.target);
      await api.createGroup(payload, authToken);
      const groups = await api.listGroups(authToken);
      renderGroups(groups);
      event.target.reset();
    } catch (error) {
      renderError("groups-output", userFacingError(error));
    }
  });

  document.getElementById("refresh-groups").addEventListener("click", async () => {
    try {
      const groups = await api.listGroups(authToken);
      renderGroups(groups);
    } catch (error) {
      renderError("groups-output", userFacingError(error));
    }
  });

  document.getElementById("message-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = formDataToObject(event.target);
      await api.sendMessage(payload.groupId, { text: payload.text }, authToken);
      const messages = await api.listMessages(payload.groupId, authToken);
      renderMessages(messages);
      event.target.reset();
    } catch (error) {
      renderError("messages-output", userFacingError(error));
    }
  });

  document.getElementById("load-messages").addEventListener("click", async () => {
    const groupId = document.querySelector("#message-form [name='groupId']").value.trim();
    if (!groupId) {
      renderError("messages-output", "Enter Group ID first");
      return;
    }
    try {
      const messages = await api.listMessages(groupId, authToken);
      renderMessages(messages);
    } catch (error) {
      renderError("messages-output", userFacingError(error));
    }
  });

  document.getElementById("start-click-rush").addEventListener("click", () => {
    clickRush.active = true;
    clickRush.score = 0;
    setText("click-rush-status", "15s running... click fast");
    document.getElementById("click-rush-board").classList.remove("hidden");
    const target = document.getElementById("click-target");

    target.onclick = () => {
      if (!clickRush.active) return;
      clickRush.score += 1;
      const x = randomInt(5, 85);
      const y = randomInt(8, 75);
      target.style.left = `${x}%`;
      target.style.top = `${y}%`;
      setText("click-rush-status", `Score: ${clickRush.score}`);
    };

    clearTimeout(clickRush.timer);
    clickRush.timer = setTimeout(endClickRush, 15000);
  });

  document.getElementById("start-math-sprint").addEventListener("click", () => {
    mathSprint.active = true;
    mathSprint.score = 0;
    mathSprint.secondsLeft = 30;
    setText("math-status", "30s running...");
    document.getElementById("math-board").classList.remove("hidden");
    nextMathQuestion();

    clearInterval(mathSprint.timer);
    mathSprint.timer = setInterval(() => {
      mathSprint.secondsLeft -= 1;
      setText("math-status", `Time: ${mathSprint.secondsLeft}s | Score: ${mathSprint.score}`);
      if (mathSprint.secondsLeft <= 0) endMathSprint();
    }, 1000);
  });

  document.getElementById("math-answer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!mathSprint.active) return;
    const input = document.getElementById("math-answer");
    const guess = Number(input.value);
    if (guess === mathSprint.answer) {
      mathSprint.score += 1;
      setText("math-status", `Correct. Score: ${mathSprint.score}`);
      nextMathQuestion();
    } else {
      setText("math-status", `Try again. Score: ${mathSprint.score}`);
    }
    input.value = "";
    input.focus();
  });

  document.getElementById("submit-score-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = formDataToObject(event.target);
      payload.points = Number(payload.points);
      await api.submitScore(payload, authToken);
      setText("score-submit-status", `Saved ${payload.points} for ${payload.gameId}`);
    } catch (error) {
      setText("score-submit-status", userFacingError(error));
    }
  });

  document.getElementById("leaderboard-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payload = formDataToObject(event.target);
      const board = await api.leaderboard(payload.gameId);
      renderLeaderboard(board);
    } catch (error) {
      renderError("leaderboard-output", userFacingError(error));
    }
  });
}

setupEvents();
if (restoreSession()) {
  showApp("portal");
} else {
  showGuest("home-panel");
}
