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
const SUPABASE_URL = "https://ubkvpmwpvmozhbwlxhmx.supabase.co";

const SUPABASE_KEY = "sb_publishable_n8GM1QZs-3hM90160r--2A_sGrkvxtY";


/* =========================================================
   2. CREATE SUPABASE CLIENT
   ========================================================= */

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
let blockedUserIds = new Set();

let messageChannel = null;
let presenceChannel = null;
let onlineUsers = new Map(); // user_id -> presence metadata


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
const closeSettingsButton = document.getElementById("closeSettings");
const displayNameInput = document.getElementById("displayName");
const genderInput = document.getElementById("gender");
const ageInput = document.getElementById("age");
const saveButton = document.getElementById("save");
const blockedButton = document.getElementById("blocked");
const blockedDialog = document.getElementById("blockedDialog");
const closeBlockedButton = document.getElementById("closeBlocked");
const blockedList = document.getElementById("blockedList");
const themeToggle = document.getElementById("themeToggle");
const feedbackButton = document.getElementById("feedbackBtn");
const feedbackDialog = document.getElementById("feedbackDialog");
const closeFeedbackButton = document.getElementById("closeFeedback");
const feedbackCategory = document.getElementById("feedbackCategory");
const feedbackRating = document.getElementById("feedbackRating");
const feedbackMessage = document.getElementById("feedbackMessage");
const feedbackSubmit = document.getElementById("feedbackSubmit");
const profileViewDialog = document.getElementById("profileDialog");
const closeProfileButton = document.getElementById("closeProfile");
const profileViewContent = document.getElementById("profileContent");
const mainContainer = document.getElementById("mainContainer");


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
   6. THEME MANAGEMENT
   ========================================================= */

function initTheme() {
  const saved = localStorage.getItem("q1-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  if (themeToggle) {
    themeToggle.textContent = saved === "dark" ? "☀️ Light" : "🌙 Dark";
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("q1-theme", next);
  if (themeToggle) {
    themeToggle.textContent = next === "dark" ? "☀️ Light" : "🌙 Dark";
  }
}


/* =========================================================
   7. STATUS
   ========================================================= */

function setAuthStatus(text) {
  if (authStatus) {
    authStatus.textContent = text;
  }
}


/* =========================================================
   8. RANDOM USERNAME GENERATION
   ========================================================= */

const adjectives = [
  "Neon", "Sky", "Moon", "Pixel", "Star", "Solar", "Cyber", "Silk",
  "Swift", "Silent", "Bright", "Dark", "Cosmic", "Golden", "Silver",
  "Rainbow", "Thunder", "Frost", "Sunset", "Dawn", "Ocean", "Forest",
  "Mystic", "Radiant", "Vivid", "Serene", "Quantum", "Nova", "Stellar",
  "Twilight", "Crystal", "Harmony", "Blaze", "Echo", "Spark", "Gentle",
  "Smooth", "Vivid", "Sleek", "Majestic", "Ethereal", "Luminous"
];

const animals = [
  "Fox", "Panda", "Tiger", "Wolf", "Falcon", "Dragon", "Phoenix", "Eagle",
  "Raven", "Owl", "Lion", "Deer", "Rabbit", "Bear", "Cheetah", "Dolphin",
  "Whale", "Shark", "Swan", "Butterfly", "Penguin", "Otter", "Lynx", "Cougar",
  "Jaguar", "Panther", "Griffin", "Unicorn", "Hawk", "Cobra", "Peacock", "Elk",
  "Moose", "Badger", "Meerkat", "Koala", "Lemur", "Puma", "Lynx"
];

async function generateUniqueUsername() {
  const maxAttempts = 10;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const username = adj + animal;
    
    // Check if username already exists
    const { data: existing } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    
    if (!existing) {
      return username;
    }
  }
  
  // Fallback: add random number if collisions continue
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 1000);
  return adj + animal + num;
}


/* =========================================================
   9. MESSAGE SAFETY FILTER
   ========================================================= */

const badWords = [
  "damn", "hell", "crap", "piss", "ass", "bitch", "bastard", "shit",
  "fuck", "cock", "pussy", "dick", "whore", "slut", "rape", "kill",
  "suicide", "hate", "nigger", "fag"
];

const spamPatterns = [
  /https?:\/\/|www\.|\.com|\.net|\.org|\.io|\.cc|\.co/gi,
  /(?:email|mail|contact|dm|dm me|message me|call me|call|phone|number|tel)(?:\s|:|=)?\+?[\d\s\-\(\)]{7,}/gi,
  /\d{3}[\s\-]?\d{3}[\s\-]?\d{4}/g, // phone pattern
  /@gmail|@yahoo|@outlook|@hotmail/gi, // email patterns
];

function checkMessageSafety(text) {
  if (!text) return { safe: true };
  
  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  
  // Check for bad words (word boundary check to avoid false positives)
  for (const word of badWords) {
    const pattern = new RegExp(`\\b${word}\\b`, "i");
    if (pattern.test(normalized)) {
      return {
        safe: false,
        reason: "Please keep messages respectful."
      };
    }
  }
  
  // Check for links, phone numbers, email addresses
  for (const pattern of spamPatterns) {
    if (pattern.test(text)) {
      return {
        safe: false,
        reason: "Avoid sharing external links or contact information."
      };
    }
  }
  
  return { safe: true };
}


/* =========================================================
   10. BLOCK SYSTEM
   ========================================================= */

async function loadBlockedUsers() {
  if (!currentUser) return;
  
  const { data, error } = await supabaseClient
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", currentUser.id);
  
  if (error) {
    console.error("Blocked users error:", error);
    return;
  }
  
  blockedUserIds = new Set(data?.map(b => b.blocked_id) || []);
  
  // Update UI
  if (blockedList) {
    blockedList.innerHTML = "";
    
    if (!data || !data.length) {
      blockedList.innerHTML = "<p style='color: #69737e; text-align: center;'>No blocked users.</p>";
      return;
    }
    
    for (const block of data) {
      const { data: user } = await supabaseClient
        .from("profiles")
        .select("id,username,display_name")
        .eq("id", block.blocked_id)
        .maybeSingle();
      
      if (!user) continue;
      
      const row = document.createElement("div");
      row.className = "blockedrow";
      row.innerHTML = `
        <span>
          ${escapeHTML(user.display_name || user.username || "Q1 User")}
        </span>
        <button type="button" data-user-id="${escapeHTML(user.id)}">
          Unblock
        </button>
      `;
      
      row.querySelector("button").addEventListener("click", async () => {
        await unblockUser(user.id);
        await loadBlockedUsers();
        if (selectedUser && selectedUser.id === user.id) {
          await loadMessages();
          updateBlockButtonState();
        }
      });
      
      blockedList.appendChild(row);
    }
  }
}

async function blockSelectedUser() {
  if (!currentUser || !selectedUser) return;
  
  const confirmed = window.confirm(
    `Block ${selectedUser.display_name || selectedUser.username || "this user"}?`
  );
  
  if (!confirmed) return;
  
  const { error } = await supabaseClient
    .from("blocks")
    .insert({
      blocker_id: currentUser.id,
      blocked_id: selectedUser.id
    });
  
  if (error) {
    if (error.code === "23505") {
      showError("User already blocked.");
    } else {
      console.error("Block error:", error);
      showError("Could not block user.");
    }
    return;
  }
  
  await loadBlockedUsers();
  await loadMessages();
  updateBlockButtonState();
  showSuccess("User blocked.");
}

async function unblockUser(userId) {
  if (!currentUser) return;
  
  const { error } = await supabaseClient
    .from("blocks")
    .delete()
    .eq("blocker_id", currentUser.id)
    .eq("blocked_id", userId);
  
  if (error) {
    console.error("Unblock error:", error);
    showError("Could not unblock user.");
    return;
  }
  
  showSuccess("User unblocked.");
}

function isUserBlocked(userId) {
  return blockedUserIds.has(userId);
}

function updateBlockButtonState() {
  if (!blockButton || !selectedUser) return;
  
  if (isUserBlocked(selectedUser.id)) {
    blockButton.textContent = "✓ Blocked";
    blockButton.disabled = true;
    blockButton.style.opacity = "0.6";
    messageInput.disabled = true;
    sendButton.disabled = true;
  } else {
    blockButton.textContent = "🚫 Block";
    blockButton.disabled = false;
    blockButton.style.opacity = "1";
    messageInput.disabled = false;
    sendButton.disabled = false;
  }
}


/* =========================================================
   11. ONLINE/OFFLINE PRESENCE
   ========================================================= */

function subscribeToPresence() {
  if (presenceChannel) {
    supabaseClient.removeChannel(presenceChannel);
  }
  
  presenceChannel = supabaseClient.channel("q1-online-users", {
    config: {
      broadcast: { self: true },
      presence: { key: currentUser.id }
    }
  });
  
  presenceChannel
    .on("presence", { event: "sync" }, () => {
      const state = presenceChannel.presenceState();
      onlineUsers.clear();
      
      for (const [key, presences] of Object.entries(state)) {
        if (presences && presences.length > 0) {
          onlineUsers.set(presences[0].user_id, presences[0]);
        }
      }
      
      renderUsers(allUsers);
      if (selectedUser) updateSelectedUserStatus();
    })
    .on("presence", { event: "join" }, ({ key, newPresences }) => {
      if (newPresences && newPresences.length > 0) {
        onlineUsers.set(newPresences[0].user_id, newPresences[0]);
      }
      renderUsers(allUsers);
      if (selectedUser) updateSelectedUserStatus();
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      if (leftPresences && leftPresences.length > 0) {
        onlineUsers.delete(leftPresences[0].user_id);
      }
      renderUsers(allUsers);
      if (selectedUser) updateSelectedUserStatus();
    })
    .subscribe(async status => {
      if (status === "SUBSCRIBED") {
        // Announce current user as online
        const timestamp = new Date().toISOString();
        await presenceChannel.track({
          user_id: currentUser.id,
          online_at: timestamp
        });
      }
    });
}

function getOnlineStatus(userId) {
  return onlineUsers.has(userId);
}

function updateSelectedUserStatus() {
  if (!selectedUser || !chatStatus) return;
  
  if (getOnlineStatus(selectedUser.id)) {
    chatStatus.textContent = "🟢 Online";
  } else {
    chatStatus.textContent = "⚫ Offline";
  }
}

window.addEventListener("beforeunload", () => {
  if (presenceChannel) {
    supabaseClient.removeChannel(presenceChannel);
  }
  if (messageChannel) {
    supabaseClient.removeChannel(messageChannel);
  }
});


/* =========================================================
   12. START APP
   ========================================================= */

async function startQ1Chat() {
  try {
    initTheme();
    
    if (
      SUPABASE_URL.includes("PASTE_") ||
      SUPABASE_KEY.includes("PASTE_")
    ) {
      setAuthStatus("Add Supabase keys");
      console.error("Q1 Chat: Supabase URL/key has not been configured.");
      return;
    }
    
    setAuthStatus("Connecting...");
    
    // Check existing session
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError) {
      throw sessionError;
    }
    
    if (sessionData.session?.user) {
      currentUser = sessionData.session.user;
    } else {
      // Anonymous login
      let anonResult;
      
      if (typeof supabaseClient.auth.signInAnonymously === "function") {
        anonResult = await supabaseClient.auth.signInAnonymously();
      } else if (typeof supabaseClient.auth.signUp === "function") {
        try {
          anonResult = await supabaseClient.auth.signUp({});
        } catch (e) {
          anonResult = { error: e };
        }
      } else {
        throw new Error("Anonymous auth is not supported by the loaded Supabase client.");
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
    
    // Profile and data loading
    await loadOrCreateProfile();
    await loadBlockedUsers();
    await loadUsers();
    
    // Subscribe to presence
    subscribeToPresence();
    
    // Setup UI
    setupUI();
    
  } catch (error) {
    console.error("Q1 Chat startup error:", error);
    setAuthStatus("Connection failed");
    showError("Q1 Chat could not connect to Supabase.");
  }
}


/* =========================================================
   13. AUTH STATE
   ========================================================= */

supabaseClient.auth.onAuthStateChange(async (_event, session) => {
  if (!session?.user) {
    return;
  }
  
  if (currentUser && currentUser.id === session.user.id) {
    return;
  }
  
  currentUser = session.user;
  setAuthStatus("Connected");
  
  await loadOrCreateProfile();
  await loadBlockedUsers();
  await loadUsers();
});


/* =========================================================
   14. PROFILE
   ========================================================= */

async function loadOrCreateProfile() {
  if (!currentUser) {
    return;
  }
  
  const { data, error } = await supabaseClient
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
  
  // Create first profile
  const username = await generateUniqueUsername();
  
  const newProfile = {
    id: currentUser.id,
    username: username,
    display_name: "Q1 User",
    gender: "other"
  };
  
  const { data: createdProfile, error: createError } = await supabaseClient
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
   15. SETTINGS
   ========================================================= */

function fillSettings() {
  if (!currentProfile) {
    return;
  }
  
  if (displayNameInput) {
    displayNameInput.value = currentProfile.display_name || "";
  }
  
  if (genderInput) {
    genderInput.value = currentProfile.gender || "other";
  }
}

async function saveSettings() {
  if (!currentUser) {
    return;
  }
  
  const displayName = displayNameInput.value.trim() || "Q1 User";
  const gender = genderInput.value;
  
  const { data, error } = await supabaseClient
    .from("profiles")
    .update({
      display_name: displayName,
      gender: gender
    })
    .eq("id", currentUser.id)
    .select()
    .single();
  
  if (error) {
    console.error("Profile update error:", error);
    showError("Could not save settings.");
    return;
  }
  
  currentProfile = data;
  closeDialog(settingsDialog);
  await loadUsers();
  showSuccess("Settings saved.");
}


/* =========================================================
   16. LOAD USERS
   ========================================================= */

async function loadUsers() {
  if (!currentUser) {
    return;
  }
  
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,username,display_name,gender,created_at")
    .neq("id", currentUser.id)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("Users load error:", error);
    showError("Could not load people.");
    return;
  }
  
  allUsers = data || [];
  renderUsers(allUsers);
}


/* =========================================================
   17. RENDER USERS
   ========================================================= */

function renderUsers(users) {
  if (!usersContainer) {
    return;
  }
  
  usersContainer.innerHTML = "";
  
  if (userCount) {
    userCount.textContent = `${users.length} ${
      users.length === 1 ? "person" : "people"
    }`;
  }
  
  if (!users.length) {
    usersContainer.innerHTML = `
      <div style="padding:25px; text-align:center; color:#69737e; font-size:13px;">
        No other users yet.
      </div>
    `;
    return;
  }
  
  users.forEach(user => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "user";
    button.dataset.userId = user.id;
    
    const name = user.display_name || user.username || "Q1 User";
    const firstLetter = name.trim().charAt(0).toUpperCase() || "Q";
    const gender = ["boy", "girl", "other"].includes(user.gender)
      ? user.gender
      : "other";
    
    const isOnline = getOnlineStatus(user.id);
    const statusDot = isOnline ? "🟢" : "⚫";
    
    button.innerHTML = `
      <div class="avatar ${gender}">
        ${escapeHTML(firstLetter)}
      </div>
      <div class="info">
        <strong>
          ${escapeHTML(name)}
        </strong>
        <div class="preview">
          @${escapeHTML(user.username || "user")}
        </div>
      </div>
      <span class="status-indicator">${statusDot}</span>
    `;
    
    button.addEventListener("click", () => selectUser(user));
    usersContainer.appendChild(button);
  });
}


/* =========================================================
   18. SEARCH
   ========================================================= */

function searchUsers() {
  const query = searchInput.value.trim().toLowerCase();
  
  if (!query) {
    renderUsers(allUsers);
    return;
  }
  
  const filtered = allUsers.filter(user => {
    const name = (user.display_name || "").toLowerCase();
    const username = (user.username || "").toLowerCase();
    
    return name.includes(query) || username.includes(query);
  });
  
  renderUsers(filtered);
}


/* =========================================================
   19. SELECT USER
   ========================================================= */

async function selectUser(user) {
  if (!user) {
    return;
  }
  
  selectedUser = user;
  
  // Highlight selected user
  document.querySelectorAll(".user").forEach(element => {
    element.classList.toggle(
      "selected",
      element.dataset.userId === user.id
    );
  });
  
  const name = user.display_name || user.username || "Q1 User";
  const firstLetter = name.trim().charAt(0).toUpperCase() || "?";
  const gender = ["boy", "girl", "other"].includes(user.gender)
    ? user.gender
    : "other";
  
  if (chatName) {
    chatName.textContent = name;
  }
  
  if (chatAvatar) {
    chatAvatar.textContent = firstLetter;
    chatAvatar.className = `chat-avatar ${gender}`;
  }
  
  messageInput.disabled = false;
  sendButton.disabled = false;
  blockButton.disabled = false;
  reportButton.disabled = false;
  
  await loadMessages();
  updateBlockButtonState();
  updateSelectedUserStatus();
  subscribeToMessages();
  messageInput.focus();
}


/* =========================================================
   20. LOAD MESSAGES
   ========================================================= */

async function loadMessages() {
  if (!currentUser || !selectedUser) {
    return;
  }
  
  // Check if blocked
  if (isUserBlocked(selectedUser.id)) {
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="welcome">
          <div class="welcome-icon">
            🚫
          </div>
          <h2>User Blocked</h2>
          <p>You have blocked this user. Unblock them in settings to chat.</p>
        </div>
      `;
    }
    return;
  }
  
  const currentId = currentUser.id;
  const selectedId = selectedUser.id;
  
  const { data, error } = await supabaseClient
    .from("messages")
    .select("id,sender_id,receiver_id,text,created_at")
    .or(
      `and(sender_id.eq.${currentId},receiver_id.eq.${selectedId}),and(sender_id.eq.${selectedId},receiver_id.eq.${currentId})`
    )
    .order("created_at", { ascending: true });
  
  if (error) {
    console.error("Messages load error:", error);
    showError("Could not load messages.");
    return;
  }
  
  renderMessages(data || []);
}


/* =========================================================
   21. RENDER MESSAGES
   ========================================================= */

function renderMessages(messages) {
  if (!messagesContainer) {
    return;
  }
  
  messagesContainer.innerHTML = "";
  
  if (!messages.length) {
    messagesContainer.innerHTML = `
      <div class="welcome">
        <div class="welcome-icon">
          💬
        </div>
        <h2>Start chatting</h2>
        <p>
          Send a respectful message to
          ${escapeHTML(selectedUser?.display_name || "this person")}.
        </p>
        <small>
          Never share passwords, addresses, phone numbers or private contact details.
        </small>
      </div>
    `;
    return;
  }
  
  messages.forEach(message => {
    const wrapper = document.createElement("div");
    wrapper.className = message.sender_id === currentUser.id ? "msg me" : "msg";
    
    const messageText = document.createElement("div");
    messageText.textContent = message.text;
    wrapper.appendChild(messageText);
    
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = formatTime(message.created_at);
    wrapper.appendChild(meta);
    
    messagesContainer.appendChild(wrapper);
  });
  
  scrollMessagesToBottom();
}


/* =========================================================
   22. SEND MESSAGE
   ========================================================= */

async function sendMessage() {
  if (!currentUser || !selectedUser) {
    return;
  }
  
  if (isUserBlocked(selectedUser.id)) {
    showError("Cannot send message to blocked user.");
    return;
  }
  
  const text = messageInput.value.trim();
  
  if (!text) {
    return;
  }
  
  if (text.length > 2000) {
    showError("Message cannot exceed 2000 characters.");
    return;
  }
  
  // Safety check
  const safety = checkMessageSafety(text);
  if (!safety.safe) {
    showError("⚠️ " + safety.reason);
    return;
  }
  
  sendButton.disabled = true;
  
  const { error } = await supabaseClient
    .from("messages")
    .insert({
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      text: text
    });
  
  sendButton.disabled = false;
  
  if (error) {
    console.error("Send message error:", error);
    showError("Message could not be sent.");
    return;
  }
  
  messageInput.value = "";
  updateCharCount();
  await loadMessages();
  messageInput.focus();
}


/* =========================================================
   23. REALTIME
   ========================================================= */

function subscribeToMessages() {
  if (!currentUser || !selectedUser) {
    return;
  }
  
  if (messageChannel) {
    supabaseClient.removeChannel(messageChannel);
    messageChannel = null;
  }
  
  messageChannel = supabaseClient
    .channel(`q1-chat-${currentUser.id}-${selectedUser.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages"
      },
      async payload => {
        const message = payload.new;
        
        const relevant =
          (message.sender_id === currentUser.id &&
            message.receiver_id === selectedUser.id) ||
          (message.sender_id === selectedUser.id &&
            message.receiver_id === currentUser.id);
        
        if (relevant) {
          await loadMessages();
        }
      }
    )
    .subscribe(status => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("Realtime subscription error:", status);
      }
    });
}


/* =========================================================
   24. PROFILE VIEW
   ========================================================= */

function showProfileView(user) {
  if (!profileViewDialog || !profileViewContent) return;
  
  const name = user.display_name || user.username || "Q1 User";
  const firstLetter = name.trim().charAt(0).toUpperCase() || "Q";
  const gender = ["boy", "girl", "other"].includes(user.gender)
    ? user.gender
    : "other";
  
  const isOnline = getOnlineStatus(user.id);
  const statusText = isOnline ? "🟢 Online" : "⚫ Offline";
  
  profileViewContent.innerHTML = `
    <div class="profile-view">
      <div class="profile-avatar ${gender}">
        ${escapeHTML(firstLetter)}
      </div>
      <h3>${escapeHTML(name)}</h3>
      <p style="color: #69737e; margin: 0;">@${escapeHTML(user.username || "user")}</p>
      <p style="color: #69737e; margin: 8px 0 0 0; font-size: 12px;">${statusText}</p>
    </div>
  `;
  
  openDialog(profileViewDialog);
}


/* =========================================================
   25. FEEDBACK
   ========================================================= */

async function submitFeedback() {
  if (!currentUser) return;
  
  const category = feedbackCategory.value;
  const rating = feedbackRating.value ? parseInt(feedbackRating.value) : null;
  const message = feedbackMessage.value.trim();
  
  if (!message) {
    showError("Please enter feedback.");
    return;
  }
  
  feedbackSubmit.disabled = true;
  
  // For now, just show a success message
  // Feedback table creation will be handled via SQL separately
  showSuccess("Thanks for your feedback! ❤️");
  
  // Clear form
  feedbackCategory.value = "general";
  feedbackRating.value = "";
  feedbackMessage.value = "";
  
  feedbackSubmit.disabled = false;
  closeDialog(feedbackDialog);
}


/* =========================================================
   26. CHARACTER COUNT
   ========================================================= */

function updateCharCount() {
  if (!messageInput || !charCount) {
    return;
  }
  
  charCount.textContent = `${messageInput.value.length}/2000`;
}


/* =========================================================
   27. TIME
   ========================================================= */

function formatTime(timestamp) {
  if (!timestamp) {
    return "";
  }
  
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}


/* =========================================================
   28. SCROLL
   ========================================================= */

function scrollMessagesToBottom() {
  if (!messagesContainer) {
    return;
  }
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}


/* =========================================================
   29. DIALOG HELPERS
   ========================================================= */

function openDialog(dialog) {
  if (!dialog) {
    return;
  }
  
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDialog(dialog) {
  if (!dialog) {
    return;
  }
  
  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}


/* =========================================================
   30. UI SETUP
   ========================================================= */

function setupUI() {
  // Search
  searchInput?.addEventListener("input", searchUsers);
  
  // Send
  sendButton?.addEventListener("click", sendMessage);
  
  // Enter to send
  messageInput?.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
  
  // Character count
  messageInput?.addEventListener("input", updateCharCount);
  
  // Settings
  settingsButton?.addEventListener("click", () => {
    fillSettings();
    openDialog(settingsDialog);
  });
  
  closeSettingsButton?.addEventListener("click", () => {
    closeDialog(settingsDialog);
  });
  
  // Save settings
  saveButton?.addEventListener("click", saveSettings);
  
  // Theme toggle
  themeToggle?.addEventListener("click", toggleTheme);
  
  // Block
  blockButton?.addEventListener("click", blockSelectedUser);
  
  // Blocked users
  blockedButton?.addEventListener("click", async () => {
    await loadBlockedUsers();
    openDialog(blockedDialog);
  });
  
  closeBlockedButton?.addEventListener("click", () => {
    closeDialog(blockedDialog);
  });
  
  // Feedback
  feedbackButton?.addEventListener("click", () => {
    openDialog(feedbackDialog);
  });
  
  closeFeedbackButton?.addEventListener("click", () => {
    closeDialog(feedbackDialog);
  });
  
  feedbackSubmit?.addEventListener("click", submitFeedback);
  
  // Profile view
  chatAvatar?.addEventListener("click", () => {
    if (selectedUser) {
      showProfileView(selectedUser);
    }
  });
  
  closeProfileButton?.addEventListener("click", () => {
    closeDialog(profileViewDialog);
  });
  
  // Navigation filters
  document.querySelectorAll("nav button[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll("nav button[data-filter]").forEach(btn =>
        btn.classList.remove("active")
      );
      button.classList.add("active");
      renderUsers(allUsers);
    });
  });
}


/* =========================================================
   31. ERROR / SUCCESS
   ========================================================= */

function showError(message) {
  console.error(message);
  if (chatStatus) {
    chatStatus.textContent = "❌ " + message;
  }
}

function showSuccess(message) {
  console.log(message);
  if (chatStatus) {
    chatStatus.textContent = "✓ " + message;
  }
}


/* =========================================================
   32. START
   ========================================================= */

document.addEventListener("DOMContentLoaded", startQ1Chat);
