/* =========================================================
   Q1 CHAT — CLEAN APP.JS
   Supabase + Realtime + Friends + Private Chat
   ========================================================= */

const SUPABASE_URL =
  "https://ubkvpmwpvmozhbwlxhmx.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_n8GM1QZs-3hM90160r--2A_sGrkvxtY";


/* =========================================================
   SUPABASE
   ========================================================= */

if (!window.supabase) {
  console.error("Supabase library was not loaded.");
  throw new Error("Supabase library is missing.");
}

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;
let selectedUser = null;

let allUsers = [];
let friendIds = new Set();
let blockedUserIds = new Set();
let onlineUsers = new Map();
let unreadCounts = new Map();

let presenceChannel = null;
let messageChannel = null;
let friendChannel = null;

let currentFilter = "online";
let uiInitialized = false;
let appStarted = false;


/* =========================================================
   DOM
   ========================================================= */

const authStatus =
  document.getElementById("authStatus");

const usersContainer =
  document.getElementById("users");

const userCount =
  document.getElementById("userCount");

const searchInput =
  document.getElementById("search");

const chatAvatar =
  document.getElementById("chatAvatar");

const chatName =
  document.getElementById("chatName");

const chatStatus =
  document.getElementById("status");

const messagesContainer =
  document.getElementById("messages");

const messageInput =
  document.getElementById("input");

const sendButton =
  document.getElementById("send");

const charCount =
  document.getElementById("charCount");

const blockButton =
  document.getElementById("block");

const reportButton =
  document.getElementById("report");

const settingsButton =
  document.getElementById("settingsBtn");

const settingsDialog =
  document.getElementById("settings");

const closeSettingsButton =
  document.getElementById("closeSettings");

const displayNameInput =
  document.getElementById("displayName");

const genderInput =
  document.getElementById("gender");

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

const themeToggle =
  document.getElementById("themeToggle");

const profileDialog =
  document.getElementById("profileDialog");

const closeProfileButton =
  document.getElementById("closeProfile");

const profileContent =
  document.getElementById("profileContent");


/* =========================================================
   HELPERS
   ========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function getUserName(user) {
  return (
    user?.display_name ||
    user?.username ||
    "Q1 User"
  );
}


function getInitial(user) {
  return (
    getUserName(user)
      .trim()
      .charAt(0)
      .toUpperCase() || "Q"
  );
}


function getGender(user) {
  return ["boy", "girl", "other"].includes(
    user?.gender
  )
    ? user.gender
    : "other";
}


function formatTime(timestamp) {
  if (!timestamp) return "";

  return new Date(timestamp).toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


function showError(message) {
  console.error("Q1:", message);

  if (!chatStatus) return;

  chatStatus.textContent =
    "❌ " + message;

  setTimeout(() => {
    if (selectedUser) {
      updateSelectedUserStatus();
    }
  }, 3000);
}


function showSuccess(message) {
  console.log("Q1:", message);

  if (!chatStatus) return;

  chatStatus.textContent =
    "✓ " + message;

  setTimeout(() => {
    if (selectedUser) {
      updateSelectedUserStatus();
    }
  }, 2500);
}


/* =========================================================
   THEME
   ========================================================= */

function initTheme() {
  const theme =
    localStorage.getItem("q1-theme") ||
    "light";

  document.documentElement.setAttribute(
    "data-theme",
    theme
  );

  updateThemeButton(theme);
}


function updateThemeButton(theme) {
  if (!themeToggle) return;

  themeToggle.textContent =
    theme === "dark"
      ? "☀️ Light mode"
      : "🌙 Dark mode";
}


function toggleTheme() {
  const current =
    document.documentElement.getAttribute(
      "data-theme"
    ) || "light";

  const next =
    current === "dark"
      ? "light"
      : "dark";

  document.documentElement.setAttribute(
    "data-theme",
    next
  );

  localStorage.setItem(
    "q1-theme",
    next
  );

  updateThemeButton(next);
}


/* =========================================================
   AUTH STATUS
   ========================================================= */

function setAuthStatus(
  text,
  type = "normal"
) {
  if (!authStatus) return;

  authStatus.innerHTML = `
    <span class="connection-dot"></span>
    ${escapeHTML(text)}
  `;

  const dot =
    authStatus.querySelector(
      ".connection-dot"
    );

  if (!dot) return;

  dot.style.background =
    type === "success"
      ? "#2db36c"
      : type === "error"
        ? "#d9534f"
        : "#f0a000";
}


/* =========================================================
   USERNAME
   ========================================================= */

const adjectives = [
  "Vivid",
  "Neon",
  "Sky",
  "Moon",
  "Pixel",
  "Star",
  "Solar",
  "Cyber",
  "Swift",
  "Bright",
  "Cosmic",
  "Golden",
  "Silver",
  "Rainbow",
  "Thunder",
  "Frost",
  "Ocean",
  "Mystic",
  "Quantum",
  "Nova",
  "Stellar",
  "Crystal",
  "Harmony",
  "Blaze",
  "Echo",
  "Spark"
];


const animals = [
  "Fox",
  "Panda",
  "Tiger",
  "Wolf",
  "Falcon",
  "Dragon",
  "Phoenix",
  "Eagle",
  "Raven",
  "Owl",
  "Lion",
  "Deer",
  "Rabbit",
  "Bear",
  "Cheetah",
  "Dolphin",
  "Whale",
  "Shark",
  "Swan",
  "Butterfly",
  "Penguin",
  "Otter",
  "Lynx",
  "Jaguar",
  "Panther",
  "Hawk",
  "Peacock",
  "Koala"
];


async function generateUniqueUsername() {
  for (let i = 0; i < 10; i++) {
    const adjective =
      adjectives[
        Math.floor(
          Math.random() *
          adjectives.length
        )
      ];

    const animal =
      animals[
        Math.floor(
          Math.random() *
          animals.length
        )
      ];

    const username =
      adjective + animal;

    const { data } =
      await supabaseClient
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();

    if (!data) {
      return username;
    }
  }

  return (
    "Q1User" +
    Math.floor(
      Math.random() * 100000
    )
  );
}


/* =========================================================
   MESSAGE SAFETY
   ========================================================= */

const badWords = [
  "damn",
  "hell",
  "crap",
  "bitch",
  "bastard",
  "shit",
  "fuck",
  "whore",
  "slut",
  "rape"
];


function checkMessageSafety(text) {
  const normalized =
    text
      .toLowerCase()
      .replace(/\s+/g, " ");

  for (const word of badWords) {
    const pattern =
      new RegExp(
        `\\b${word}\\b`,
        "i"
      );

    if (pattern.test(normalized)) {
      return {
        safe: false,
        reason:
          "Please keep messages respectful."
      };
    }
  }

  return {
    safe: true
  };
}


/* =========================================================
   PROFILE
   ========================================================= */

async function loadOrCreateProfile() {
  if (!currentUser) return;

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

  if (error) throw error;

  if (data) {
    currentProfile = data;
    fillSettings();
    return;
  }

  const username =
    await generateUniqueUsername();

  const profile = {
    id: currentUser.id,
    username,
    display_name: "Q1 User",
    gender: "other"
  };

  const {
    data: created,
    error: createError
  } =
    await supabaseClient
      .from("profiles")
      .insert(profile)
      .select()
      .single();

  if (createError) {
    throw createError;
  }

  currentProfile = created;

  fillSettings();
}


function fillSettings() {
  if (!currentProfile) return;

  if (displayNameInput) {
    displayNameInput.value =
      currentProfile.display_name ||
      "";
  }

  if (genderInput) {
    genderInput.value =
      currentProfile.gender ||
      "other";
  }
}


async function saveSettings() {
  if (!currentUser) return;

  const displayName =
    displayNameInput?.value.trim() ||
    "Q1 User";

  const gender =
    genderInput?.value ||
    "other";

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .update({
        display_name: displayName,
        gender
      })
      .eq("id", currentUser.id)
      .select()
      .single();

  if (error) {
    console.error(error);
    showError("Could not save settings.");
    return;
  }

  currentProfile = data;

  closeDialog(settingsDialog);

  await loadUsers();

  showSuccess("Settings saved.");
}


/* =========================================================
   FRIENDS
   ========================================================= */

async function loadFriends() {
  if (!currentUser) return;

  const {
    data,
    error
  } =
    await supabaseClient
      .from("friends")
      .select(
        "id,sender_id,receiver_id,status"
      )
      .or(
        `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
      );

  if (error) {
    console.warn(
      "Friends table unavailable:",
      error
    );

    friendIds.clear();
    return;
  }

  friendIds.clear();

  (data || []).forEach(friend => {
    if (
      friend.status !== "accepted"
    ) {
      return;
    }

    const friendId =
      friend.sender_id ===
      currentUser.id
        ? friend.receiver_id
        : friend.sender_id;

    if (friendId) {
      friendIds.add(friendId);
    }
  });
}


function isFriend(userId) {
  return friendIds.has(userId);
}


async function sendFriendRequest(userId) {
  if (
    !currentUser ||
    !userId ||
    userId === currentUser.id
  ) {
    return;
  }

  const {
    error
  } =
    await supabaseClient
      .from("friends")
      .insert({
        sender_id: currentUser.id,
        receiver_id: userId,
        status: "pending"
      });

  if (error) {
    console.error(error);
    showError(
      "Friend request could not be sent."
    );
    return;
  }

  showSuccess("Friend request sent.");
}


async function acceptFriendRequest(friendId) {
  const {
    error
  } =
    await supabaseClient
      .from("friends")
      .update({
        status: "accepted"
      })
      .eq("id", friendId)
      .eq("receiver_id", currentUser.id);

  if (error) {
    console.error(error);
    showError(
      "Could not accept request."
    );
    return;
  }

  await loadFriends();
  await loadUsers();

  showSuccess("Friend added.");
}


async function removeFriend(userId) {
  if (!currentUser) return;

  const {
    error
  } =
    await supabaseClient
      .from("friends")
      .delete()
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser.id})`
      );

  if (error) {
    console.error(error);
    showError(
      "Could not remove friend."
    );
    return;
  }

  friendIds.delete(userId);

  await loadUsers();

  showSuccess("Friend removed.");
}


/* =========================================================
   BLOCK
   ========================================================= */

async function loadBlockedUsers() {
  if (!currentUser) return;

  const {
    data,
    error
  } =
    await supabaseClient
      .from("blocks")
      .select("blocked_id")
      .eq(
        "blocker_id",
        currentUser.id
      );

  if (error) {
    console.error(error);
    return;
  }

  blockedUserIds =
    new Set(
      (data || []).map(
        row => row.blocked_id
      )
    );

  renderUsers(
    getFilteredUsers()
  );

  updateBlockButtonState();
}


function isUserBlocked(userId) {
  return blockedUserIds.has(userId);
}


async function blockSelectedUser() {
  if (
    !currentUser ||
    !selectedUser
  ) {
    return;
  }

  const name =
    getUserName(selectedUser);

  if (
    !confirm(
      `Block ${name}?`
    )
  ) {
    return;
  }

  const {
    error
  } =
    await supabaseClient
      .from("blocks")
      .insert({
        blocker_id: currentUser.id,
        blocked_id: selectedUser.id
      });

  if (error) {
    console.error(error);

    showError(
      "Could not block user."
    );

    return;
  }

  await loadBlockedUsers();

  showSuccess("User blocked.");

  renderBlockedMessage();
}


async function unblockUser(userId) {
  if (!currentUser) return;

  const {
    error
  } =
    await supabaseClient
      .from("blocks")
      .delete()
      .eq(
        "blocker_id",
        currentUser.id
      )
      .eq(
        "blocked_id",
        userId
      );

  if (error) {
    console.error(error);
    showError(
      "Could not unblock user."
    );
    return;
  }

  await loadBlockedUsers();

  showSuccess("User unblocked.");
}


function updateBlockButtonState() {
  if (!blockButton) return;

  if (!selectedUser) {
    blockButton.disabled = true;
    return;
  }

  const blocked =
    isUserBlocked(
      selectedUser.id
    );

  blockButton.textContent =
    blocked
      ? "✓ Blocked"
      : "🚫 Block";

  blockButton.disabled =
    blocked;
}


/* =========================================================
   USERS
   ========================================================= */

async function loadUsers() {
  if (!currentUser) return;

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "id,username,display_name,gender,created_at"
      )
      .neq(
        "id",
        currentUser.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );

  if (error) {
    console.error(error);
    showError(
      "Could not load people."
    );
    return;
  }

  allUsers =
    data || [];

  renderUsers(
    getFilteredUsers()
  );
}


function getFilteredUsers() {
  let users =
    [...allUsers];

  const query =
    searchInput?.value
      .trim()
      .toLowerCase() || "";

  if (query) {
    users =
      users.filter(user => {
        const name =
          (
            user.display_name ||
            ""
          ).toLowerCase();

        const username =
          (
            user.username ||
            ""
          ).toLowerCase();

        return (
          name.includes(query) ||
          username.includes(query)
        );
      });
  }

  if (currentFilter === "online") {
    users =
      users.filter(user =>
        onlineUsers.has(user.id)
      );
  }

  if (currentFilter === "unread") {
    users =
      users.filter(user =>
        getUnreadCount(user.id) > 0
      );
  }

  if (currentFilter === "friends") {
    users =
      users.filter(user =>
        isFriend(user.id)
      );
  }

  return users;
}


/* =========================================================
   UNREAD
   ========================================================= */

function getUnreadCount(userId) {
  return (
    unreadCounts.get(userId) ||
    0
  );
}


function addUnread(userId) {
  if (
    !userId ||
    userId === currentUser?.id
  ) {
    return;
  }

  unreadCounts.set(
    userId,
    getUnreadCount(userId) + 1
  );

  renderUsers(
    getFilteredUsers()
  );
}


function clearUnread(userId) {
  unreadCounts.delete(userId);

  renderUsers(
    getFilteredUsers()
  );
}


/* =========================================================
   RENDER USERS
   ========================================================= */

function renderUsers(users) {
  if (!usersContainer) return;

  usersContainer.innerHTML = "";

  if (userCount) {
    userCount.textContent =
      `${users.length} ${
        users.length === 1
          ? "person"
          : "people"
      }`;
  }

  if (!users.length) {
    usersContainer.innerHTML = `
      <div
        style="
          padding:35px 20px;
          text-align:center;
          color:var(--muted);
        "
      >
        👥<br><br>
        No people found.
      </div>
    `;

    return;
  }

  users.forEach(user => {
    const button =
      document.createElement("button");

    button.type = "button";
    button.className = "user";
    button.dataset.userId =
      user.id;

    if (
      selectedUser &&
      selectedUser.id === user.id
    ) {
      button.classList.add("selected");
    }

    const name =
      getUserName(user);

    const gender =
      getGender(user);

    const online =
      getOnlineStatus(user.id);

    const unread =
      getUnreadCount(user.id);

    const friend =
      isFriend(user.id);

    button.innerHTML = `
      <div class="avatar ${gender}">
        ${escapeHTML(
          getInitial(user)
        )}
      </div>

      <div class="info">

        <strong>
          ${escapeHTML(name)}
        </strong>

        <div class="preview">
          @${escapeHTML(
            user.username || "user"
          )}
        </div>

        ${
          friend
            ? `<small>♥ Friend</small>`
            : ""
        }

      </div>

      <span class="status-indicator">

        ${
          unread > 0
            ? `<span class="unread-badge">${unread}</span>`
            : online
              ? "🟢"
              : "⚫"
        }

      </span>
    `;

    button.addEventListener(
      "click",
      () => selectUser(user)
    );

    usersContainer.appendChild(
      button
    );
  });
}


/* =========================================================
   SELECT USER
   ========================================================= */

async function selectUser(user) {
  if (!user) return;

  selectedUser = user;

  clearUnread(user.id);

  document.body.classList.add(
    "chat-open"
  );

  if (chatName) {
    chatName.textContent =
      getUserName(user);
  }

  if (chatAvatar) {
    chatAvatar.textContent =
      getInitial(user);

    chatAvatar.className =
      `chat-avatar ${getGender(user)}`;
  }

  renderUsers(
    getFilteredUsers()
  );

  updateBlockButtonState();

  updateSelectedUserStatus();

  await loadMessages();

  if (
    messageInput &&
    !isUserBlocked(user.id)
  ) {
    messageInput.disabled = false;
    messageInput.focus();
  }

  if (sendButton) {
    sendButton.disabled =
      isUserBlocked(user.id);
  }
}


/* =========================================================
   LOAD MESSAGES
   ========================================================= */

async function loadMessages() {
  if (
    !currentUser ||
    !selectedUser ||
    !messagesContainer
  ) {
    return;
  }

  if (
    isUserBlocked(
      selectedUser.id
    )
  ) {
    renderBlockedMessage();
    return;
  }

  const currentId =
    currentUser.id;

  const selectedId =
    selectedUser.id;

  const {
    data,
    error
  } =
    await supabaseClient
      .from("messages")
      .select(
        "id,sender_id,receiver_id,text,created_at"
      )
      .or(
        `and(sender_id.eq.${currentId},receiver_id.eq.${selectedId}),and(sender_id.eq.${selectedId},receiver_id.eq.${currentId})`
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );

  if (error) {
    console.error(error);
    showError(
      "Could not load messages."
    );
    return;
  }

  renderMessages(
    data || []
  );
}


function renderBlockedMessage() {
  if (!messagesContainer) return;

  messagesContainer.innerHTML = `
    <div class="welcome">
      <div class="welcome-logo">
        🚫
      </div>

      <h2>
        User blocked
      </h2>

      <p>
        You have blocked this user.
      </p>

      <div class="welcome-tip">
        Unblock this user to chat again.
      </div>
    </div>
  `;

  if (messageInput) {
    messageInput.disabled = true;
  }

  if (sendButton) {
    sendButton.disabled = true;
  }
}


/* =========================================================
   RENDER MESSAGES
   ========================================================= */

function renderMessages(messages) {
  if (!messagesContainer) return;

  messagesContainer.innerHTML = "";

  if (!messages.length) {
    messagesContainer.innerHTML = `
      <div class="welcome">
        <div class="welcome-logo">
          💬
        </div>

        <h2>
          Start chatting
        </h2>

        <p>
          Send a message to
          ${escapeHTML(
            getUserName(
              selectedUser
            )
          )}.
        </p>

        <div class="welcome-tip">
          🛡️ Never share private information.
        </div>
      </div>
    `;

    return;
  }

  messages.forEach(message => {
    const wrapper =
      document.createElement("div");

    wrapper.className =
      message.sender_id ===
      currentUser.id
        ? "msg me"
        : "msg";

    wrapper.dataset.messageId =
      message.id;

    const text =
      document.createElement("div");

    text.className = "message-text";
    text.textContent =
      message.text;

    const meta =
      document.createElement("div");

    meta.className = "meta";

    meta.textContent =
      formatTime(
        message.created_at
      );

    wrapper.appendChild(text);
    wrapper.appendChild(meta);

    messagesContainer.appendChild(
      wrapper
    );
  });

  scrollMessagesToBottom();
}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {
  if (
    !currentUser ||
    !selectedUser ||
    !messageInput
  ) {
    return;
  }

  if (
    isUserBlocked(
      selectedUser.id
    )
  ) {
    showError(
      "Cannot message a blocked user."
    );
    return;
  }

  const text =
    messageInput.value.trim();

  if (!text) return;

  if (text.length > 2000) {
    showError(
      "Message cannot exceed 2000 characters."
    );
    return;
  }

  const safety =
    checkMessageSafety(text);

  if (!safety.safe) {
    showError(
      safety.reason
    );
    return;
  }

  if (sendButton) {
    sendButton.disabled = true;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("messages")
      .insert({
        sender_id:
          currentUser.id,
        receiver_id:
          selectedUser.id,
        text
      })
      .select()
      .single();

  if (error) {
    console.error(error);

    if (sendButton) {
      sendButton.disabled = false;
    }

    showError(
      "Message could not be sent."
    );

    return;
  }

  messageInput.value = "";

  updateCharCount();

  if (data) {
    addMessageIfMissing(data);
  }

  if (sendButton) {
    sendButton.disabled = false;
  }

  messageInput.focus();
}


/* =========================================================
   REALTIME MESSAGE
   ========================================================= */

function subscribeToMessages() {
  if (!currentUser) return;

  if (messageChannel) {
    supabaseClient.removeChannel(
      messageChannel
    );
  }

  messageChannel =
    supabaseClient.channel(
      `q1-messages-${currentUser.id}`
    );

  messageChannel.on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages"
    },
    payload => {
      const message =
        payload?.new;

      if (!message) return;

      const incoming =
        message.receiver_id ===
        currentUser.id;

      const outgoing =
        message.sender_id ===
        currentUser.id;

      if (!incoming && !outgoing) {
        return;
      }

      if (
        isUserBlocked(
          incoming
            ? message.sender_id
            : message.receiver_id
        )
      ) {
        return;
      }

      if (
        selectedUser &&
        (
          (
            message.sender_id ===
            selectedUser.id &&
            message.receiver_id ===
            currentUser.id
          ) ||
          (
            message.receiver_id ===
            selectedUser.id &&
            message.sender_id ===
            currentUser.id
          )
        )
      ) {
        addMessageIfMissing(message);

        clearUnread(
          selectedUser.id
        );

        return;
      }

      if (incoming) {
        addUnread(
          message.sender_id
        );

        showBrowserNotification(
          message
        );
      }
    }
  );

  messageChannel.subscribe(
    status => {
      console.log(
        "Q1 message realtime:",
        status
      );

      if (status === "SUBSCRIBED") {
        console.log(
          "✅ Q1 realtime connected"
        );

        setAuthStatus(
          "Connected",
          "success"
        );
      }
    }
  );
}


function addMessageIfMissing(message) {
  if (
    !messagesContainer ||
    !message
  ) {
    return;
  }

  const existing =
    messagesContainer.querySelector(
      `[data-message-id="${message.id}"]`
    );

  if (existing) {
    return;
  }

  const welcome =
    messagesContainer.querySelector(
      ".welcome"
    );

  if (welcome) {
    messagesContainer.innerHTML = "";
  }

  const wrapper =
    document.createElement("div");

  wrapper.className =
    message.sender_id ===
    currentUser.id
      ? "msg me"
      : "msg";

  wrapper.dataset.messageId =
    message.id;

  const text =
    document.createElement("div");

  text.className =
    "message-text";

  text.textContent =
    message.text;

  const meta =
    document.createElement("div");

  meta.className =
    "meta";

  meta.textContent =
    formatTime(
      message.created_at
    );

  wrapper.appendChild(text);
  wrapper.appendChild(meta);

  messagesContainer.appendChild(
    wrapper
  );

  scrollMessagesToBottom();
}


/* =========================================================
   PRESENCE
   ========================================================= */

function subscribeToPresence() {
  if (!currentUser) return;

  if (presenceChannel) {
    supabaseClient.removeChannel(
      presenceChannel
    );
  }

  presenceChannel =
    supabaseClient.channel(
      "q1-online-users",
      {
        config: {
          presence: {
            key:
              currentUser.id
          }
        }
      }
    );

  presenceChannel
    .on(
      "presence",
      {
        event: "sync"
      },
      () => {
        const state =
          presenceChannel.presenceState();

        onlineUsers.clear();

        Object.entries(state)
          .forEach(
            ([key, presences]) => {
              const presence =
                presences?.[0];

              if (presence) {
                onlineUsers.set(
                  presence.user_id ||
                  key,
                  presence
                );
              }
            }
          );

        renderUsers(
          getFilteredUsers()
        );

        updateSelectedUserStatus();
      }
    )
    .on(
      "presence",
      {
        event: "join"
      },
      ({ newPresences }) => {
        (newPresences || [])
          .forEach(presence => {
            if (
              presence.user_id
            ) {
              onlineUsers.set(
                presence.user_id,
                presence
              );
            }
          });

        renderUsers(
          getFilteredUsers()
        );

        updateSelectedUserStatus();
      }
    )
    .on(
      "presence",
      {
        event: "leave"
      },
      ({ leftPresences }) => {
        (leftPresences || [])
          .forEach(presence => {
            if (
              presence.user_id
            ) {
              onlineUsers.delete(
                presence.user_id
              );
            }
          });

        renderUsers(
          getFilteredUsers()
        );

        updateSelectedUserStatus();
      }
    )
    .subscribe(
      async status => {
        console.log(
          "Q1 presence:",
          status
        );

        if (
          status === "SUBSCRIBED"
        ) {
          await presenceChannel.track({
            user_id:
              currentUser.id,
            online_at:
              new Date().toISOString()
          });
        }
      }
    );
}


function getOnlineStatus(userId) {
  return onlineUsers.has(userId);
}


function updateSelectedUserStatus() {
  if (
    !selectedUser ||
    !chatStatus
  ) {
    return;
  }

  chatStatus.textContent =
    getOnlineStatus(
      selectedUser.id
    )
      ? "🟢 Online"
      : "⚫ Offline";
}


/* =========================================================
   BROWSER NOTIFICATION
   ========================================================= */

function showBrowserNotification(message) {
  if (
    typeof Notification ===
    "undefined"
  ) {
    return;
  }

  if (
    Notification.permission !==
    "granted"
  ) {
    return;
  }

  const sender =
    allUsers.find(
      user =>
        user.id ===
        message.sender_id
    );

  const name =
    getUserName(sender);

  try {
    new Notification(
      `New message from ${name}`,
      {
        body:
          "You have a new Q1 Chat message."
      }
    );
  } catch (error) {
    console.warn(
      "Notification error:",
      error
    );
  }
}


async function requestNotificationPermission() {
  if (
    typeof Notification ===
    "undefined"
  ) {
    return;
  }

  if (
    Notification.permission ===
    "default"
  ) {
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.warn(error);
    }
  }
}


/* =========================================================
   PROFILE VIEW
   ========================================================= */

function showProfileView(user) {
  if (
    !profileDialog ||
    !profileContent
  ) {
    return;
  }

  const friend =
    isFriend(user.id);

  profileContent.innerHTML = `
    <div class="profile-view">

      <div
        class="profile-avatar ${getGender(user)}"
      >
        ${escapeHTML(
          getInitial(user)
        )}
      </div>

      <h3>
        ${escapeHTML(
          getUserName(user)
        )}
      </h3>

      <p>
        @${escapeHTML(
          user.username || "user"
        )}
      </p>

      <p>
        ${
          getOnlineStatus(user.id)
            ? "🟢 Online"
            : "⚫ Offline"
        }
      </p>

      <div class="profile-actions">

        ${
          friend
            ? `
              <button
                type="button"
                id="removeFriendBtn"
              >
                ♥ Remove Friend
              </button>
            `
            : `
              <button
                type="button"
                id="addFriendBtn"
              >
                ➕ Add Friend
              </button>
            `
        }

      </div>

    </div>
  `;

  const addButton =
    document.getElementById(
      "addFriendBtn"
    );

  addButton?.addEventListener(
    "click",
    async () => {
      await sendFriendRequest(
        user.id
      );
    }
  );

  const removeButton =
    document.getElementById(
      "removeFriendBtn"
    );

  removeButton?.addEventListener(
    "click",
    async () => {
      await removeFriend(
        user.id
      );

      closeDialog(
        profileDialog
      );
    }
  );

  openDialog(
    profileDialog
  );
}


/* =========================================================
   BLOCKED LIST
   ========================================================= */

async function renderBlockedUsers() {
  if (!blockedList) return;

  blockedList.innerHTML = "";

  if (!blockedUserIds.size) {
    blockedList.innerHTML = `
      <div class="empty-blocked">
        No blocked users.
      </div>
    `;

    return;
  }

  for (
    const userId of blockedUserIds
  ) {
    const {
      data: user
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,username,display_name,gender"
        )
        .eq("id", userId)
        .maybeSingle();

    if (!user) continue;

    const row =
      document.createElement("div");

    row.className =
      "blockedrow";

    row.innerHTML = `
      <span>
        ${escapeHTML(
          getUserName(user)
        )}
      </span>

      <button type="button">
        Unblock
      </button>
    `;

    row
      .querySelector("button")
      .addEventListener(
        "click",
        async () => {
          await unblockUser(
            user.id
          );

          await renderBlockedUsers();
        }
      );

    blockedList.appendChild(row);
  }
}


/* =========================================================
   SCROLL
   ========================================================= */

function scrollMessagesToBottom() {
  if (!messagesContainer) return;

  requestAnimationFrame(() => {
    messagesContainer.scrollTop =
      messagesContainer.scrollHeight;
  });
}


/* =========================================================
   CHAR COUNT
   ========================================================= */

function updateCharCount() {
  if (
    !messageInput ||
    !charCount
  ) {
    return;
  }

  charCount.textContent =
    `${messageInput.value.length}/2000`;
}


/* =========================================================
   DIALOG
   ========================================================= */

function openDialog(dialog) {
  if (!dialog) return;

  if (
    typeof dialog.showModal ===
    "function"
  ) {
    if (!dialog.open) {
      dialog.showModal();
    }
  } else {
    dialog.setAttribute(
      "open",
      ""
    );
  }
}


function closeDialog(dialog) {
  if (!dialog) return;

  if (
    typeof dialog.close ===
    "function"
  ) {
    if (dialog.open) {
      dialog.close();
    }
  } else {
    dialog.removeAttribute(
      "open"
    );
  }
}


/* =========================================================
   UI
   ========================================================= */

function setupUI() {
  if (uiInitialized) return;

  uiInitialized = true;

  searchInput?.addEventListener(
    "input",
    () => {
      renderUsers(
        getFilteredUsers()
      );
    }
  );


  sendButton?.addEventListener(
    "click",
    sendMessage
  );


  messageInput?.addEventListener(
    "keydown",
    event => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        sendMessage();
      }
    }
  );


  messageInput?.addEventListener(
    "input",
    updateCharCount
  );


  settingsButton?.addEventListener(
    "click",
    () => {
      fillSettings();
      openDialog(
        settingsDialog
      );
    }
  );


  closeSettingsButton?.addEventListener(
    "click",
    () => {
      closeDialog(
        settingsDialog
      );
    }
  );


  saveButton?.addEventListener(
    "click",
    saveSettings
  );


  themeToggle?.addEventListener(
    "click",
    toggleTheme
  );


  blockButton?.addEventListener(
    "click",
    blockSelectedUser
  );


  blockedButton?.addEventListener(
    "click",
    async () => {
      await renderBlockedUsers();
      openDialog(
        blockedDialog
      );
    }
  );


  closeBlockedButton?.addEventListener(
    "click",
    () => {
      closeDialog(
        blockedDialog
      );
    }
  );


  chatAvatar?.addEventListener(
    "click",
    () => {
      if (selectedUser) {
        showProfileView(
          selectedUser
        );
      }
    }
  );


  closeProfileButton?.addEventListener(
    "click",
    () => {
      closeDialog(
        profileDialog
      );
    }
  );


  document
    .querySelectorAll(
      ".filter[data-filter]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          document
            .querySelectorAll(
              ".filter[data-filter]"
            )
            .forEach(btn =>
              btn.classList.remove(
                "active"
              )
            );

          button.classList.add(
            "active"
          );

          currentFilter =
            button.dataset.filter ||
            "online";

          renderUsers(
            getFilteredUsers()
          );
        }
      );
    });


  reportButton?.addEventListener(
    "click",
    () => {
      if (!selectedUser) return;

      alert(
        "Report feature will be connected to the Q1 moderation system."
      );
    }
  );


  document.addEventListener(
    "click",
    requestNotificationPermission,
    {
      once: true
    }
  );
}


/* =========================================================
   START
   ========================================================= */

async function startQ1Chat() {
  if (appStarted) return;

  appStarted = true;

  try {
    initTheme();
    setupUI();

    setAuthStatus(
      "Connecting..."
    );

    const {
      data: sessionData,
      error: sessionError
    } =
      await supabaseClient.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (
      sessionData?.session?.user
    ) {
      currentUser =
        sessionData.session.user;
    } else {
      const {
        data,
        error
      } =
        await supabaseClient.auth
          .signInAnonymously();

      if (error) {
        throw error;
      }

      currentUser =
        data?.user;
    }

    if (!currentUser) {
      throw new Error(
        "No authenticated user."
      );
    }

    await loadOrCreateProfile();

    await loadFriends();

    await loadBlockedUsers();

    await loadUsers();

    subscribeToPresence();

    subscribeToMessages();

    updateCharCount();

    setAuthStatus(
      "Connected",
      "success"
    );

    console.log(
      "✅ Q1 Chat started successfully"
    );

  } catch (error) {
    console.error(
      "Q1 startup error:",
      error
    );

    setAuthStatus(
      "Connection failed",
      "error"
    );

    showError(
      "Q1 Chat could not connect to Supabase."
    );
  }
}


/* =========================================================
   AUTH
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (_event, session) => {
    if (!session?.user) return;

    if (
      currentUser &&
      currentUser.id ===
        session.user.id
    ) {
      return;
    }

    currentUser =
      session.user;

    try {
      await loadOrCreateProfile();
      await loadFriends();
      await loadBlockedUsers();
      await loadUsers();

      subscribeToPresence();
      subscribeToMessages();

      setAuthStatus(
        "Connected",
        "success"
      );

    } catch (error) {
      console.error(
        "Auth state error:",
        error
      );

      showError(
        "Could not load your profile."
      );
    }
  }
);


/* =========================================================
   MOBILE BACK
   ========================================================= */

window.addEventListener(
  "popstate",
  () => {
    document.body.classList.remove(
      "chat-open"
    );
  }
);


/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {
    if (presenceChannel) {
      supabaseClient.removeChannel(
        presenceChannel
      );
    }

    if (messageChannel) {
      supabaseClient.removeChannel(
        messageChannel
      );
    }

    if (friendChannel) {
      supabaseClient.removeChannel(
        friendChannel
      );
    }
  }
);


/* =========================================================
   RUN
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    startQ1Chat,
    {
      once: true
    }
  );
} else {
  startQ1Chat();
}
