import { api } from "./api.js";

let authToken = "";
let currentUser = null;
let activeGameId = "click-rush";
let activeConversationId = "";

let clickRush = { active: false, score: 0, timer: null };
let mathSprint = { active: false, score: 0, timer: null, secondsLeft: 30, answer: 0 };

const gameConfig = {
  "click-rush": { leaderboardId: "click-rush-leaderboard" },
  "math-sprint": { leaderboardId: "math-sprint-leaderboard" },
};

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

function renderScoreList(containerId, entries, scoreField, emptyText) {
  if (!Array.isArray(entries) || entries.length === 0) {
    renderEmpty(containerId, emptyText);
    return;
  }

  const container = document.getElementById(containerId);
  clearNode(container);

  entries.forEach((entry, index) => {
    const item = document.createElement("article");
    item.className = "output-item";

    const title = document.createElement("h5");
    title.textContent = `#${index + 1} ${entry.displayName}`;

    const meta = document.createElement("p");
    meta.className = "output-meta";
    meta.textContent = `${entry[scoreField]} points`;

    item.append(title, meta);
    container.appendChild(item);
  });
}

function renderConversationList(conversations) {
  const container = document.getElementById("conversation-list");
  clearNode(container);

  if (!Array.isArray(conversations) || conversations.length === 0) {
    const empty = document.createElement("p");
    empty.className = "output-muted";
    empty.textContent = "No chats yet.";
    container.appendChild(empty);
    return;
  }

  conversations.forEach((conversation) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `conversation-item ${conversation.id === activeConversationId ? "active" : ""}`;
    button.dataset.conversationId = conversation.id;

    const name = document.createElement("p");
    name.className = "conversation-name";
    name.textContent = conversation.name;

    const preview = document.createElement("p");
    preview.className = "conversation-preview";
    preview.textContent = conversation.lastMessage?.text || (conversation.type === "direct" ? "Direct message" : "Group chat");

    button.append(name, preview);
    button.addEventListener("click", () => openConversation(conversation.id, conversation.name));

    container.appendChild(button);
  });
}

function renderChatThread(messages) {
  const thread = document.getElementById("chat-thread");
  clearNode(thread);

  if (!Array.isArray(messages) || messages.length === 0) {
    const empty = document.createElement("p");
    empty.className = "output-muted";
    empty.textContent = "No messages yet. Say hello.";
    thread.appendChild(empty);
    return;
  }

  messages.forEach((message) => {
    const mine = message.senderId === currentUser?.id;

    const wrap = document.createElement("article");
    wrap.className = `chat-bubble-wrap ${mine ? "mine" : "other"}`;

    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${mine ? "mine" : "other"}`;

    const sender = document.createElement("p");
    sender.className = "chat-sender";
    sender.textContent = message.senderDisplayName || "Unknown";

    const text = document.createElement("p");
    text.className = "chat-text";
    text.textContent = message.text;

    bubble.append(sender, text);
    wrap.appendChild(bubble);
    thread.appendChild(wrap);
  });

  thread.scrollTop = thread.scrollHeight;
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
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  document.getElementById("portal-tab").classList.toggle("hidden", tab !== "portal");
  document.getElementById("games-tab").classList.toggle("hidden", tab !== "games");

  if (tab === "games") {
    refreshTotalLeaderboard();
    refreshGameLeaderboard(activeGameId);
  }

  if (tab === "portal") {
    refreshConversations();
  }
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
  activeConversationId = "";
  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("authUser");
}

function restoreSession() {
  const token = sessionStorage.getItem("authToken");
  const rawUser = sessionStorage.getItem("authUser");
  if (!token || !rawUser) return false;
  try {
    setSession(token, JSON.parse(rawUser));
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

async function refreshConversations() {
  try {
    const conversations = await api.listConversations(authToken);
    renderConversationList(conversations);

    if (!activeConversationId && conversations.length > 0) {
      await openConversation(conversations[0].id, conversations[0].name);
    }
  } catch (error) {
    renderError("conversation-list", userFacingError(error));
  }
}

async function openConversation(conversationId, name) {
  activeConversationId = conversationId;
  setText("active-chat-title", name || "Chat");
  document.getElementById("send-message-form").classList.remove("hidden");

  try {
    const messages = await api.listMessages(conversationId, authToken);
    renderChatThread(messages);
    const conversations = await api.listConversations(authToken);
    renderConversationList(conversations);
  } catch (error) {
    renderError("chat-thread", userFacingError(error));
  }
}

async function saveGameScore(gameId, points) {
  if (!authToken) return false;
  try {
    await api.submitScore({ gameId, points }, authToken);
    await Promise.all([refreshGameLeaderboard(gameId), refreshTotalLeaderboard()]);
    return true;
  } catch (error) {
    const statusId = gameId === "click-rush" ? "click-rush-status" : "math-status";
    setText(statusId, userFacingError(error));
    return false;
  }
}

async function refreshGameLeaderboard(gameId) {
  const leaderboardId = gameConfig[gameId]?.leaderboardId;
  if (!leaderboardId) return;

  try {
    const board = await api.leaderboard(gameId);
    renderScoreList(leaderboardId, board.top, "points", "No scores yet for this game.");
  } catch (error) {
    renderError(leaderboardId, userFacingError(error));
  }
}

async function refreshTotalLeaderboard() {
  try {
    const data = await api.totalLeaderboard();
    renderScoreList("total-leaderboard-output", data.top, "totalPoints", "No scores yet across games.");
  } catch (error) {
    renderError("total-leaderboard-output", userFacingError(error));
  }
}

function switchGame(gameId) {
  activeGameId = gameId;

  document.querySelectorAll(".game-select").forEach((button) => {
    button.classList.toggle("active", button.dataset.game === gameId);
  });

  document.querySelectorAll(".game-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.gamePanel !== gameId);
  });

  refreshGameLeaderboard(gameId);
}

function endClickRush() {
  clickRush.active = false;
  clearTimeout(clickRush.timer);
  document.getElementById("click-rush-board").classList.add("hidden");
  setText("click-rush-status", `Finished: ${clickRush.score} points. Saving...`);
  void saveGameScore("click-rush", clickRush.score).then((saved) => {
    if (saved) setText("click-rush-status", `Finished: ${clickRush.score} points. Saved.`);
  });
}

function endMathSprint() {
  mathSprint.active = false;
  clearInterval(mathSprint.timer);
  document.getElementById("math-board").classList.add("hidden");
  setText("math-status", `Finished: ${mathSprint.score} points. Saving...`);
  void saveGameScore("math-sprint", mathSprint.score).then((saved) => {
    if (saved) setText("math-status", `Finished: ${mathSprint.score} points. Saved.`);
  });
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

  document.getElementById("new-chat-btn").addEventListener("click", () => {
    document.getElementById("new-chat-form").classList.toggle("hidden");
  });

  document.getElementById("chat-type").addEventListener("change", (event) => {
    const direct = event.target.value === "direct";
    document.getElementById("chat-name").classList.toggle("hidden", direct);
    document.getElementById("chat-member-emails").classList.toggle("hidden", direct);
    document.getElementById("chat-target-email").classList.toggle("hidden", !direct);
  });
  document.getElementById("chat-type").dispatchEvent(new Event("change"));

  document.getElementById("new-chat-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const type = document.getElementById("chat-type").value;
    const name = document.getElementById("chat-name").value.trim();
    const targetEmail = document.getElementById("chat-target-email").value.trim();
    const memberEmails = document
      .getElementById("chat-member-emails")
      .value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    try {
      const conversation = await api.createConversation({ type, name, targetEmail, memberEmails }, authToken);
      document.getElementById("new-chat-form").reset();
      document.getElementById("new-chat-form").classList.add("hidden");
      await refreshConversations();
      await openConversation(conversation.id, conversation.name);
    } catch (error) {
      alert(userFacingError(error));
    }
  });

  document.getElementById("send-message-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeConversationId) return;

    const input = document.getElementById("chat-message-input");
    const text = input.value.trim();
    if (!text) return;

    try {
      await api.sendMessage(activeConversationId, { text }, authToken);
      input.value = "";
      const messages = await api.listMessages(activeConversationId, authToken);
      renderChatThread(messages);
      await refreshConversations();
    } catch (error) {
      alert(userFacingError(error));
    }
  });

  document.querySelectorAll(".game-select").forEach((button) => {
    button.addEventListener("click", () => switchGame(button.dataset.game));
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
      target.style.left = `${randomInt(5, 85)}%`;
      target.style.top = `${randomInt(8, 75)}%`;
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
}

setupEvents();
if (restoreSession()) {
  showApp("portal");
} else {
  showGuest("home-panel");
}

switchGame("click-rush");
