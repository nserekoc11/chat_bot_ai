(() => {
  const STORAGE_KEY_MESSAGES = "chatbot.messages.v1";
  const STORAGE_KEY_THEME = "chatbot.theme.v1";
  const STORAGE_KEY_API_BASE = "chatbot.apiBase.v1";
  const MAX_CHARS = 800;

  const messagesEl = document.getElementById("messages");
  const emptyStateEl = document.getElementById("emptyState");
  const formEl = document.getElementById("composerForm");
  const inputEl = document.getElementById("messageInput");
  const sendBtnEl = document.getElementById("sendBtn");
  const charCountEl = document.getElementById("charCount");
  const themeToggleEl = document.getElementById("themeToggle");
  const themeIconEl = document.getElementById("themeIcon");
  const clearChatEl = document.getElementById("clearChat");

  /** @type {{ role: "user" | "bot", text: string, ts: number }[]} */
  let history = [];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const formatTime = (ts) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(ts));
    } catch {
      const d = new Date(ts);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
  };

  const saveHistory = () => {
    try {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(history));
    } catch {
      // ignore quota / private mode errors
    }
  };

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      history = parsed
        .filter((m) => m && (m.role === "user" || m.role === "bot") && typeof m.text === "string")
        .slice(-200)
        .map((m) => ({ role: m.role, text: m.text, ts: typeof m.ts === "number" ? m.ts : Date.now() }));
    } catch {
      // ignore
    }
  };

  const setBusy = (busy) => {
    messagesEl.setAttribute("aria-busy", busy ? "true" : "false");
  };

  const scrollToBottom = () => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const renderEmptyState = () => {
    if (!emptyStateEl) return;
    emptyStateEl.style.display = history.length === 0 ? "block" : "none";
  };

  const createBubble = ({ role, text, ts }) => {
    const bubble = document.createElement("div");
    bubble.className = `bubble ${role}`;

    const content = document.createElement("div");
    content.textContent = text;

    const meta = document.createElement("div");
    meta.className = "meta";

    const who = document.createElement("span");
    who.textContent = role === "user" ? "You" : "Bot";

    const time = document.createElement("span");
    time.textContent = formatTime(ts);

    meta.appendChild(who);
    meta.appendChild(time);

    bubble.appendChild(content);
    bubble.appendChild(meta);
    return bubble;
  };

  const addMessage = (role, text) => {
    const msg = { role, text, ts: Date.now() };
    history.push(msg);
    messagesEl.appendChild(createBubble(msg));
    renderEmptyState();
    saveHistory();
    scrollToBottom();
  };

  const createTypingBubble = () => {
    const bubble = document.createElement("div");
    bubble.className = "bubble bot";

    const typing = document.createElement("div");
    typing.className = "typing";
    typing.setAttribute("aria-label", "Bot is typing");

    for (let i = 0; i < 3; i += 1) {
      const dot = document.createElement("span");
      dot.className = "dot";
      typing.appendChild(dot);
    }

    bubble.appendChild(typing);
    return bubble;
  };

  const autoGrow = () => {
    inputEl.style.height = "auto";
    inputEl.style.height = `${clamp(inputEl.scrollHeight, 48, 140)}px`;
  };

  const updateComposerState = () => {
    const len = inputEl.value.length;
    charCountEl.textContent = String(len);
    sendBtnEl.disabled = len === 0 || len > MAX_CHARS;
  };

  const getPreferredTheme = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_THEME);
      if (stored === "light" || stored === "dark") return stored;
    } catch {
      // ignore
    }

    const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches;
    return prefersLight ? "light" : "dark";
  };

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    themeIconEl.textContent = theme === "light" ? "☀" : "◐";
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // ignore
    }
  };

  const withTimeout = async (promise, ms) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      // @ts-ignore - consumers can pass in fetch that uses this signal
      return await promise(controller.signal);
    } finally {
      clearTimeout(id);
    }
  };

  const fetchBotReply = async (text) => {
    const getApiBase = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_API_BASE);
        if (typeof stored === "string" && stored.trim()) return stored.trim().replace(/\/+$/, "");
      } catch {
        // ignore
      }

      if (window.location.protocol === "file:") return "http://127.0.0.1:5000";
      const isLocalhost = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
      if (isLocalhost && window.location.port && window.location.port !== "5000") return "http://127.0.0.1:5000";

      return "";
    };

    // Backend: POST /api/chat -> { reply: "..." }
    const attempt = async (signal) => {
      const apiBase = getApiBase();
      const url = apiBase ? `${apiBase}/api/chat` : "/api/chat";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && typeof data.reply === "string") return data.reply;
      throw new Error("Invalid response shape");
    };

    try {
      return await withTimeout(attempt, 5000);
    } catch {
      // Front-end fallback: return only the user's message (no hints/errors).
      const trimmed = text.trim();
      if (!trimmed) return "";
      return trimmed;
    }
  };

  const renderHistory = () => {
    messagesEl.textContent = "";
    if (emptyStateEl) messagesEl.appendChild(emptyStateEl);

    for (const msg of history) {
      messagesEl.appendChild(createBubble(msg));
    }
    renderEmptyState();
    scrollToBottom();
  };

  const initChips = () => {
    const chips = document.querySelectorAll(".chip[data-prompt]");
    for (const chip of chips) {
      chip.addEventListener("click", () => {
        const prompt = chip.getAttribute("data-prompt") || "";
        inputEl.value = prompt;
        autoGrow();
        updateComposerState();
        inputEl.focus();
      });
    }
  };

  themeToggleEl?.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || getPreferredTheme();
    applyTheme(current === "light" ? "dark" : "light");
  });

  clearChatEl?.addEventListener("click", () => {
    const ok = window.confirm("Clear chat history on this device?");
    if (!ok) return;
    history = [];
    saveHistory();
    renderHistory();
  });

  inputEl.addEventListener("input", () => {
    if (inputEl.value.length > MAX_CHARS) inputEl.value = inputEl.value.slice(0, MAX_CHARS);
    autoGrow();
    updateComposerState();
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtnEl.disabled) formEl.requestSubmit();
    }
  });

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.value = "";
    autoGrow();
    updateComposerState();

    addMessage("user", text);
    setBusy(true);
    sendBtnEl.disabled = true;

    const typingBubble = createTypingBubble();
    messagesEl.appendChild(typingBubble);
    scrollToBottom();

    const reply = await fetchBotReply(text);
    typingBubble.remove();
    addMessage("bot", reply);

    setBusy(false);
  });

  // boot
  applyTheme(getPreferredTheme());
  loadHistory();
  renderHistory();
  initChips();
  autoGrow();
  updateComposerState();
})();
