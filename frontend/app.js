/* =========================================================
   Q1 CHAT
   app.js
   Matches the supplied index.html + Supabase database
   ========================================================= */


/* =========================================================
   1. SUPABASE CONFIG
   ========================================================= */

// NOTE: Do NOT commit your anon/publishable key to source control.
// Set SUPABASE_KEY to your project's anon (publishable) key locally.
// Use the Supabase Project API URL (from Project Settings → API), not the raw DB host.
const SUPABASE_URL = "https://ykzqzjndqvkbvpbwzuqz.supabase.co";

const SUPABASE_KEY = "PASTE_YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY_HERE";


/* =========================================================
   2. CREATE SUPABASE CLIENT
   ========================================================= */

// When using the UMD bundle from the CDN, the global is `window.supabase`
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* =========================================================
   3. GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;
let selectedUser = null;

let allUsers = [];

let messageChannel = null;


/* =========================================================
   4. DOM ELEMENTS
   ========================================================= */

const authStatus = document.getElementById("authStatus");

const usersContainer = document.getElementById("users");

const userCount = document.getElementById("userCount");

const searchInput = document.getElementById("search");

const chatAvatar = document.getElementById("chatAvatar");

const chatName = document.getElementById("chatName");

const chatStatus = document.getElementById("status");

const messagesContainer = document.getElementById("messages");

const messageInput = document.getElementById("input");

const sendButton = document.getElementById("send");

const charCount = document.getElementById("charCount");

const blockButton = document.getElementById("block");

const reportButton = document.getElementById("report");

const settingsButton = document.getElementById("settingsBtn");

const settingsDialog = document.getElementById("settings");

const closeSettingsButton =
  document.getElementById("closeSettings");

const displayNameInput =
  document.getElementById("displayName");

const genderInput =
  document.getElementById("gender");

const ageInput =
  document.getElementById("age");

const saveButton =
  document.getElementById("save");

const blockedButton =
  document.getElementById("blocked");

const blockedDialog =
  document.getElementById("blockedDialog");

const closeBlockedButton =
  document.getElementById("closeBlocked");

const blockedList =
  document.getElementById("blockedList");


/* =========================================================
   5. SAFETY / HTML ESCAPING
   ========================================================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   6. STATUS
   ========================================================= */

function setAuthStatus(text) {

  if (authStatus) {
    authStatus.textContent = text;
  }
}


/* =========================================================
   7. START APP
   ========================================================= */

async function startQ1Chat() {

  try {

    if (
      SUPABASE_URL.includes("PASTE_") ||
      SUPABASE_KEY.includes("PASTE_")
    ) {

      setAuthStatus("Add Supabase keys");

      console.error(
        "Q1 Chat: Supabase URL/key has not been configured."
      );

      return;
    }


    setAuthStatus("Connecting...");


    /* -----------------------------------------------
       Check existing session
       ----------------------------------------------- */

    const {
      data: sessionData,
      error: sessionError
    } = await supabaseClient.auth.getSession();


    if (sessionError) {
      throw sessionError;
    }


    if (sessionData.session?.user) {

      currentUser = sessionData.session.user;

    } else {

      /* ---------------------------------------------
         Anonymous login
         --------------------------------------------- */

      // Use signInAnonymously if available, otherwise attempt the older fallback.
      let anonResult;

      if (typeof supabaseClient.auth.signInAnonymously === 'function') {
        anonResult = await supabaseClient.auth.signInAnonymously();
      } else if (typeof supabaseClient.auth.signUp === 'function') {
        // Some older/newer SDKs may not expose an explicit anonymous method.
        // This fallback will try to create an "anonymous" user by calling signUp with no credentials —
        // typically this will fail for projects that don't allow it, so the preferred path is
        // to supply the publishable anon key and use signInAnonymously.
        try {
          anonResult = await supabaseClient.auth.signUp({});
        } catch (e) {
          anonResult = { error: e };
        }
      } else {
        throw new Error('Anonymous auth is not supported by the loaded Supabase client.');
      }


      if (anonResult.error) {
        throw anonResult.error;
      }


      currentUser = anonResult.data?.user || anonResult.user;
    }


    if (!currentUser) {
      throw new Error("No authenticated user found.");
    }


    setAuthStatus("Connected");


    /* -----------------------------------------------
       Profile
       ----------------------------------------------- */

    await loadOrCreateProfile();


    /* -----------------------------------------------
       Users
       ----------------------------------------------- */

    await loadUsers();


    /* -----------------------------------------------
       UI
       ----------------------------------------------- */

    setupUI();

  } catch (error) {

    console.error(
      "Q1 Chat startup error:",
      error
    );

    setAuthStatus("Connection failed");

    showError(
      "Q1 Chat could not connect to Supabase."
    );
  }
}


/* =========================================================
   8. AUTH STATE
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (_event, session) => {

    if (!session?.user) {
      return;
    }

    if (
      currentUser &&
      currentUser.id === session.user.id
    ) {
      return;
    }

    currentUser = session.user;

    setAuthStatus("Connected");

    await loadOrCreateProfile();

    await loadUsers();
  }
);


/* =========================================================
   9. PROFILE
   ========================================================= */

async function loadOrCreateProfile() {

  if (!currentUser) {
    return;
  }


  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();


  if (error) {
    throw error;
  }


  if (data) {

    currentProfile = data;

    fillSettings();

    return;
  }


  /* -----------------------------------------------
     Create first profile
     ----------------------------------------------- */

  const username =
    "user_" +
    currentUser.id
      .replace(/-/g, "")
      .substring(0, 8);


  const newProfile = {

    id: currentUser.id,

    username: username,

    display_name: "Q1 User",

    gender: "other"
  };


  const {
    data: createdProfile,
    error: createError
  } = await supabaseClient
    .from("profiles")
    .insert(newProfile)
    .select()
    .single();


  if (createError) {
    throw createError;
  }


  currentProfile = createdProfile;

  fillSettings();
}


/* =========================================================
   10. SETTINGS
   ========================================================= */

function fillSettings() {

  if (!currentProfile) {
    return;
  }


  if (displayNameInput) {

    displayNameInput.value =
      currentProfile.display_name || "";
  }


  if (genderInput) {

    genderInput.value =
      currentProfile.gender || "other";
  }


  /*
     Age is currently UI-only.

     Your profiles table does NOT have an age column,
     so we intentionally do not store age in the database.
  */

}


/* =========================================================
   11. SAVE SETTINGS
   ========================================================= */

async function saveSettings() {

  if (!currentUser) {
    return;
  }


  const displayName =
    displayNameInput.value.trim() ||
    "Q1 User";


  const gender =
    genderInput.value;


  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .update({

    {