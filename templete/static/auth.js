const isPlaceholder = (value) => typeof value === "string" && value.includes("YOUR_");

export const getFirebaseConfig = () => {
  const cfg = window.__FIREBASE_CONFIG__;
  if (!cfg || typeof cfg !== "object") return null;

  const required = ["apiKey", "authDomain", "projectId", "appId"];
  for (const key of required) {
    const val = cfg[key];
    if (typeof val !== "string" || !val.trim() || isPlaceholder(val)) return null;
  }
  return cfg;
};

export const initFirebaseAuth = async () => {
  const cfg = getFirebaseConfig();
  if (!cfg) {
    throw new Error("Firebase config missing. Update /static/firebase-config.js with your project keys.");
  }

  const [{ initializeApp }, authSdk] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
  ]);

  const app = initializeApp(cfg);
  const auth = authSdk.getAuth(app);

  return { auth, authSdk };
};

export const signInWithGooglePopup = async () => {
  const { auth, authSdk } = await initFirebaseAuth();
  const provider = new authSdk.GoogleAuthProvider();
  return authSdk.signInWithPopup(auth, provider);
};

export const signInWithEmailPassword = async (email, password) => {
  const { auth, authSdk } = await initFirebaseAuth();
  return authSdk.signInWithEmailAndPassword(auth, email, password);
};

export const signUpWithEmailPassword = async (name, email, password) => {
  const { auth, authSdk } = await initFirebaseAuth();
  const cred = await authSdk.createUserWithEmailAndPassword(auth, email, password);
  const displayName = typeof name === "string" ? name.trim() : "";
  if (displayName) {
    try {
      await authSdk.updateProfile(cred.user, { displayName });
    } catch {
      // ignore profile update failures
    }
  }
  return cred;
};

export const signOutUser = async () => {
  const { auth, authSdk } = await initFirebaseAuth();
  return authSdk.signOut(auth);
};

export const onUserChanged = async (cb) => {
  const { auth, authSdk } = await initFirebaseAuth();
  return authSdk.onAuthStateChanged(auth, cb);
};

