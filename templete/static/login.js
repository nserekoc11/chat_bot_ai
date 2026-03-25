import { getFirebaseConfig, initFirebaseAuth, signInWithEmailPassword, signInWithGooglePopup } from "./auth.js";

const noticeEl = document.getElementById("notice");
const formEl = document.getElementById("loginForm");
const googleBtn = document.getElementById("googleBtn");
const loginBtn = document.getElementById("loginBtn");

const setNotice = (msg, kind = "info") => {
  if (!noticeEl) return;
  noticeEl.textContent = msg || "";
  noticeEl.dataset.kind = kind;
};

const setBusy = (busy) => {
  googleBtn.disabled = busy;
  loginBtn.disabled = busy;
  formEl.querySelectorAll("input").forEach((i) => (i.disabled = busy));
};

const getNextUrl = () => {
  try {
    const next = new URLSearchParams(window.location.search).get("next");
    if (typeof next === "string" && next.startsWith("/")) return next;
  } catch {
    // ignore
  }
  return "/";
};

const syncLinks = () => {
  const next = getNextUrl();
  const signupLink = document.querySelector('a[href="/signup"]');
  if (signupLink) signupLink.setAttribute("href", `/signup?next=${encodeURIComponent(next)}`);
};

if (!getFirebaseConfig()) {
  setNotice("Update /static/firebase-config.js first, then refresh this page.", "warn");
}

syncLinks();

if (getFirebaseConfig()) {
  initFirebaseAuth()
    .then(({ auth, authSdk }) => {
      authSdk.onAuthStateChanged(auth, (user) => {
        if (user) window.location.replace(getNextUrl());
      });
    })
    .catch(() => {
      // ignore
    });
}

googleBtn?.addEventListener("click", async () => {
  setNotice("");
  setBusy(true);
  try {
    await signInWithGooglePopup();
    window.location.assign(getNextUrl());
  } catch (e) {
    setNotice(e?.message || "Google sign-in failed.", "error");
  } finally {
    setBusy(false);
  }
});

formEl?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setNotice("");

  const email = document.getElementById("email")?.value?.trim() || "";
  const password = document.getElementById("password")?.value || "";

  if (!email || !password) {
    setNotice("Enter your email and password.", "warn");
    return;
  }

  setBusy(true);
  try {
    await signInWithEmailPassword(email, password);
    window.location.assign(getNextUrl());
  } catch (err) {
    setNotice(err?.message || "Login failed.", "error");
  } finally {
    setBusy(false);
  }
});
