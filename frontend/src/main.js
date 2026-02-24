import { api } from "./api.js";

function formDataToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function show(panelId) {
  document.getElementById("home-panel").classList.add("hidden");
  document.getElementById("signup-panel").classList.add("hidden");
  document.getElementById("signin-panel").classList.add("hidden");
  document.getElementById(panelId).classList.remove("hidden");
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

document.getElementById("show-signup").addEventListener("click", () => show("signup-panel"));
document.getElementById("show-signin").addEventListener("click", () => show("signin-panel"));
document.getElementById("back-from-signup").addEventListener("click", () => show("home-panel"));
document.getElementById("back-from-signin").addEventListener("click", () => show("home-panel"));

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

    setText("signup-result", "Account created. You can now sign in.");
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
    setText("login-result", `Signed in as ${result.user.displayName}`);
  } catch (error) {
    setText("login-result", error.message);
  }
});
