import { getFirebaseConfig, initFirebaseAuth, signOutUser } from "./auth.js";

const loginLink = document.getElementById("loginLink");
const logoutBtn = document.getElementById("logoutBtn");
const userBadge = document.getElementById("userBadge");

const setSignedOutUI = () => {
  userBadge.hidden = true;
  userBadge.textContent = "";
  logoutBtn.hidden = true;
  loginLink.hidden = false;
};

const setSignedInUI = (label) => {
  userBadge.textContent = label;
  userBadge.hidden = false;
  logoutBtn.hidden = false;
  loginLink.hidden = true;
};

const hasGuestOverride = () => {
  try {
    return new URLSearchParams(window.location.search).get("guest") === "1";
  } catch {
    return false;
  }
};

const redirectToLogin = () => {
  const next = encodeURIComponent(window.location.pathname || "/");
  window.location.assign(`/login?next=${next}`);
};

logoutBtn?.addEventListener("click", async () => {
  logoutBtn.disabled = true;
  try {
    await signOutUser();
  } catch {
    // ignore
  } finally {
    logoutBtn.disabled = false;
  }
});

const boot = async () => {
  if (!getFirebaseConfig()) {
    // Auth not configured yet; leave the app usable.
    setSignedOutUI();
    return;
  }

  const { auth, authSdk } = await initFirebaseAuth();
  authSdk.onAuthStateChanged(auth, (user) => {
    if (user) {
      const label = user.displayName || user.email || "Signed in";
      setSignedInUI(label);
      return;
    }

    setSignedOutUI();
    if (!hasGuestOverride()) redirectToLogin();
  });
};

boot().catch(() => {
  setSignedOutUI();
});

