import { getFirebaseConfig, initFirebaseAuth, signInWithGooglePopup, signUpWithEmailPassword } from "./auth.js";

const noticeEl = document.getElementById("notice");
const formEl = document.getElementById("signupForm");
const googleBtn = document.getElementById("googleBtn");
const signupBtn = document.getElementById("signupBtn");

const setNotice = (msg, kind = "info") => {
  if (!noticeEl) return;
  noticeEl.textContent = msg || "";
  noticeEl.dataset.kind = kind;
};

const setBusy = (busy) => {
  googleBtn.disabled = busy;
  signupBtn.disabled = busy;
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
  const loginLink = document.querySelector('a[href="/login"]');
  if (loginLink) loginLink.setAttribute("href", `/login?next=${encodeURIComponent(next)}`);
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

  const name = document.getElementById("name")?.value || "";
  const email = document.getElementById("email")?.value?.trim() || "";
  const password = document.getElementById("password")?.value || "";
  const confirmPassword = document.getElementById("confirmPassword")?.value || "";

  if (!email || !password) {
    setNotice("Email and password are required.", "warn");
    return;
  }

  if (password.length < 6) {
    setNotice("Password must be at least 6 characters.", "warn");
    return;
  }

  if (password !== confirmPassword) {
    setNotice("Passwords do not match.", "warn");
    return;
  }

  setBusy(true);
  try {
    await signUpWithEmailPassword(name, email, password);
    window.location.assign(getNextUrl());
  } catch (err) {
    setNotice(err?.message || "Signup failed.", "error");
  } finally {
    setBusy(false);
  }
});
