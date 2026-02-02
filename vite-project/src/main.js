import "./style.css";
import { markdown } from "markdown";

const attachBtn = document.getElementById("attachBtn");
const textarea = document.getElementById("textarea");
const messages = document.getElementById("messages");
const sendBtn = document.getElementById("send-btn");
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.querySelector(".theme-icon");
const imageUpload = document.getElementById("imageUpload");
const BASE_URL = "http://localhost:3000";

// User va conversation holati
let currentUser = null;
let currentConversation = null;

// Foydalanuvchi va suhbatni yaratish/olish
async function initSession() {
  try {
    // Foydalanuvchini yaratish yoki olish
    const userRes = await fetch(`${BASE_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Mehmon",
        email: "mehmon@example.com",
      }),
    });
    currentUser = await userRes.json();

    // Yangi suhbat yaratish
    const convRes = await fetch(`${BASE_URL}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: currentUser.id,
        title: "Yangi suhbat",
      }),
    });
    currentConversation = await convRes.json();
  } catch (err) {
    console.error("Session boshlashda xatolik:", err);
  }
}

// Sahifa yuklanganda sessionni boshlash
initSession();
function handleSend() {
  const text = textarea.value.trim();
  if (text) {
    createMessageItem(text, { type: "user" });
    sendPrompt(text);
    textarea.value = "";
    textarea.focus();
  }
}

textarea.onkeyup = (event) => {
  if (event.code === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSend();
  }
};

sendBtn.onclick = () => {
  handleSend();
};

window.addEventListener("keyup", (event) => {
  if (textarea.value.length === 0 && event.code.startsWith("Key")) {
    textarea.value += event.key;
    textarea.focus();
  }
});
// Image upload - paperclip button
attachBtn?.addEventListener("click", () => {
  imageUpload?.click();
});
// Theme functionality
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
}

themeToggle.onclick = toggleTheme;

// Initialize theme on page load
initTheme();

async function sendPrompt(promptText) {
  if (!currentConversation) {
    createMessageItem("Server bilan bog'lanishda xatolik", { type: "bot" });
    return;
  }

  const response = await fetch(`${BASE_URL}/prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: promptText,
      conversation_id: currentConversation.id,
    }),
  });

  const json = await response.json();

  createMessageItem(json.answer, { type: "bot" });
}

function createMessageItem(message, options) {
  const li = document.createElement("li");
  li.className = `message message-${options.type}`;

  const content = document.createElement("div");
  content.className = "message-content";

  if (options.isHtml) {
    content.innerHTML = message;
  } else {
    content.innerHTML = markdown.toHTML(message);
  }

  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = options.type === "user" ? "Siz" : "Bot";

  li.appendChild(label);
  li.appendChild(content);
  messages.appendChild(li);

  // Scroll to bottom
  li.scrollIntoView({ behavior: "smooth" });
}

imageUpload?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("image", file);

  // Rasmni yuklash
  const uploadRes = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });
  const uploadData = await uploadRes.json();
  createMessageItem(`<img src=${BASE_URL}${uploadData.url} />`, {
    type: "user",
    isHtml: true,
  });

  // Ovqatni tahlil qilish
  const analyzeFormData = new FormData();
  analyzeFormData.append("image", file);
  if (currentUser) {
    analyzeFormData.append("user_id", currentUser.id);
  }

  try {
    const analyzeRes = await fetch(`${BASE_URL}/analyze-food`, {
      method: "POST",
      body: analyzeFormData,
    });
    const analyzeData = await analyzeRes.json();
    if (analyzeData.success && analyzeData.result) {
      createMessageItem(analyzeData.result, { type: "bot" });
    } else {
      createMessageItem(analyzeData.message || "Xatolik yuz berdi", {
        type: "bot",
      });
    }
  } catch (err) {
    createMessageItem("Server bilan bog'lanishda xatolik", { type: "bot" });
  }
});
