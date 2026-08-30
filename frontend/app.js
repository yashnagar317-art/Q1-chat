/* =========================================================
   Q1 CHAT — COMPLETE CLEAN APP.JS
   Matches the supplied HTML IDs exactly
   ========================================================= */


/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
  "https://ubkvpmwpvmozhbwlxhmx.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_n8GM1QZs-3hM90160r--2A_sGrkvxtY";


if (!window.supabase) {
  console.error("Supabase library not loaded.");
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
let allFriends = [];

let blockedUserIds = new Set();
let onlineUsers = new Set();
let unreadCounts = new Map();

let presenceChannel = null;
let messageChannel = null;

let currentFilter = "online";
let appStarted = false;
let uiReady = false;


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
  const name =
    getUserName(user).trim();

  return (
    name.charAt(0).toUpperCase() ||
    "Q"
  );
}


function getGender(user) {
  if (
    user?.gender === "boy" ||
    user?.gender === "girl"
  ) {
    return user.gender;
  }

  return "other";
}


function isOnline(userId) {
  return onlineUsers.has(userId);
}


function formatTime(timestamp) {
  if (!timestamp) return "";

  const date =
    new Date(timestamp);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}


function showError(message) {
  console.error(
    "Q1:",
    message
  );

  if (!chatStatus) return;

  const old =
    chatStatus.textContent;

  chatStatus.textContent =
    "❌ " + message;

  setTimeout(() => {
    if (
      selectedUser &&
      chatStatus
    ) {
      updateChatStatus();
    } else if (chatStatus) {
      chatStatus.textContent =
        old || "Ready";
    }
  }, 3000);
}


function showSuccess(message) {
  console.log(
    "Q1:",
    message
  );

  if (!chatStatus) return;

  const old =
    chatStatus.textContent;

  chatStatus.textContent =
    "✓ " + message;

  setTimeout(() => {
    if (
      selectedUser &&
      chatStatus
    ) {
      updateChatStatus();
    } else if (chatStatus) {
      chatStatus.textContent =
        old || "Ready";
    }
  }, 2500);
}


/* =========================================================
   THEME
   ========================================================= */

function initTheme() {
  const savedTheme =
    localStorage.getItem(
      "q1-theme"
    ) || "light";

  document.documentElement.setAttribute(
    "data-theme",
    savedTheme
  );

  updateThemeButton(
    savedTheme
  );
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
   PROFILE
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
  "Ocean",
  "Forest",
  "Mystic",
  "Quantum",
  "Nova",
  "Stellar",
  "Crystal"
];


const animals = [
  "Griffin",
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
  "Dolphin",
  "Penguin",
  "Otter",
  "Hawk",
  "Koala"
];


async function generateUsername() {
  for (
    let attempt = 0;
    attempt < 10;
    attempt++
  ) {
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

    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select("id")
        .eq(
          "username",
          username
        )
        .maybeSingle();

    if (
      !error &&
      !data
    ) {
      return username;
    }
  }

  return (
    "user_" +
    Math.random()
      .toString(36)
      .substring(2, 10)
  );
}


async function loadOrCreateProfile() {
  if (!currentUser) return;

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq(
        "id",
        currentUser.id
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    currentProfile =
      data;

    fillSettings();

    return;
  }

  const username =
    await generateUsername();

  const profile = {
    id:
      currentUser.id,
    username,
    display_name:
      "Q1 User",
    gender:
      "other"
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

  currentProfile =
    created;

  fillSettings();
}


function fillSettings() {
  if (!currentProfile) return;

  if (displayNameInput) {
    displayNameInput.value =
      currentProfile.display_name ||
      "Q1 User";
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
    genderInput?.value || "other";

  if (displayName.length < 1) {
    showError(
      "Please enter a display name."
    );
    return;
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .update({
        display_name:
          displayName,
        gender
      })
      .eq(
        "id",
        currentUser.id
      )
      .select()
      .single();

  if (error) {
    console.error(error);

    showError(
      "Could not save settings."
    );

    return;
  }

  currentProfile =
    data;

  closeDialog(
    settingsDialog
  );

  await loadUsers();

  if (selectedUser) {
    updateChatHeader();
  }

  showSuccess(
    "Settings saved."
  );
}


/* =========================================================
   BLOCK SYSTEM
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
    console.warn(
      "Blocks table unavailable:",
      error
    );

    blockedUserIds =
      new Set();

    return;
  }

  blockedUserIds =
    new Set(
      (data || []).map(
        row => row.blocked_id
      )
    );

  await renderBlockedUsers(
    data || []
  );

  renderUsers(
    getFilteredUsers()
  );

  updateBlockButton();
}


async function renderBlockedUsers(rows) {
  if (!blockedList) return;

  blockedList.innerHTML = "";

  if (!rows.length) {
    blockedList.innerHTML = `
      <div class="empty-blocked">
        No blocked users.
      </div>
    `;

    return;
  }

  for (const row of rows) {
    const {
      data: user
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,username,display_name,gender"
        )
        .eq(
          "id",
          row.blocked_id
        )
        .maybeSingle();

    if (!user) continue;

    const element =
      document.createElement(
        "div"
      );

    element.className =
      "blockedrow";

    element.innerHTML = `
      <span>
        ${escapeHTML(
          getUserName(user)
        )}
      </span>

      <button
        type="button"
        data-user-id="${escapeHTML(
          user.id
        )}"
      >
        Unblock
      </button>
    `;

    element
      .querySelector("button")
      ?.addEventListener(
        "click",
        async () => {
          await unblockUser(
            user.id
          );
        }
      );

    blockedList.appendChild(
      element
    );
  }
}


async function blockSelectedUser() {
  if (
    !currentUser ||
    !selectedUser
  ) {
    return;
  }

  if (
    blockedUserIds.has(
      selectedUser.id
    )
  ) {
    return;
  }

  const name =
    getUserName(
      selectedUser
    );

  const confirmed =
    window.confirm(
      `Block ${name}?`
    );

  if (!confirmed) {
    return;
  }

  const {
    error
  } =
    await supabaseClient
      .from("blocks")
      .insert({
        blocker_id:
          currentUser.id,
        blocked_id:
          selectedUser.id
      });

  if (error) {
    console.error(error);

    showError(
      "Could not block user."
    );

    return;
  }

  blockedUserIds.add(
    selectedUser.id
  );

  updateBlockButton();

  await loadMessages();

  showSuccess(
    "User blocked."
  );
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

  blockedUserIds.delete(
    userId
  );

  await loadBlockedUsers();

  if (
    selectedUser &&
    selectedUser.id === userId
  ) {
    updateBlockButton();
    await loadMessages();
  }

  showSuccess(
    "User unblocked."
  );
}


function updateBlockButton() {
  if (!blockButton) return;

  if (!selectedUser) {
    blockButton.disabled =
      true;

    return;
  }

  const blocked =
    blockedUserIds.has(
      selectedUser.id
    );

  blockButton.disabled =
    blocked;

  blockButton.textContent =
    blocked
      ? "✓ Blocked"
      : "🚫 Block";

  if (messageInput) {
    messageInput.disabled =
      blocked;
  }

  if (sendButton) {
    sendButton.disabled =
      blocked;
  }
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
        "id,user_id,friend_id,status"
      )
      .or(
        `user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`
      );

  if (error) {
    console.warn(
      "Friends table unavailable:",
      error
    );

    allFriends = [];

    return;
  }

  allFriends =
    (data || []).filter(
      row =>
        row.status ===
        "accepted"
    );
}


function isFriend(userId) {
  return allFriends.some(
    row =>
      (
        row.user_id ===
          currentUser.id &&
        row.friend_id ===
          userId
      ) ||
      (
        row.friend_id ===
          currentUser.id &&
        row.user_id ===
          userId
      )
  );
}


async function addFriend(user) {
  if (
    !currentUser ||
    !user ||
    user.id ===
      currentUser.id
  ) {
    return;
  }

  if (isFriend(user.id)) {
    showSuccess(
      "Already friends."
    );

    return;
  }

  const {
    error
  } =
    await supabaseClient
      .from("friends")
      .insert({
        user_id:
          currentUser.id,
        friend_id:
          user.id,
        status:
          "accepted"
      });

  if (error) {
    console.error(error);

    showError(
      "Could not add friend."
    );

    return;
  }

  await loadFriends();

  renderUsers(
    getFilteredUsers()
  );

  showSuccess(
    "Friend added."
  );
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
    console.error(
      "Users error:",
      error
    );

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


/* =========================================================
   FILTER
   ========================================================= */

function getFilteredUsers() {
  let users =
    [...allUsers];

  const query =
    searchInput?.value
      .trim()
      .toLowerCase() || "";

  if (query) {
    users =
      users.filter(
        user => {
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
        }
      );
  }

  if (
    currentFilter ===
    "online"
  ) {
    users =
      users.filter(
        user =>
          isOnline(
            user.id
          )
      );
  }

  if (
    currentFilter ===
    "unread"
  ) {
    users =
      users.filter(
        user =>
          (
            unreadCounts.get(
              user.id
            ) || 0
          ) > 0
      );
  }

  if (
    currentFilter ===
    "friends"
  ) {
    users =
      users.filter(
        user =>
          isFriend(
            user.id
          )
      );
  }

  if (
    currentFilter ===
    "recent"
  ) {
    users.sort(
      (a, b) =>
        new Date(
          b.created_at
        ) -
        new Date(
          a.created_at
        )
    );
  }

  return users.filter(
    user =>
      !blockedUserIds.has(
        user.id
      )
  );
}


/* =========================================================
   RENDER USERS
   ========================================================= */

function renderUsers(users) {
  if (!usersContainer) return;

  usersContainer.innerHTML =
    "";

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
          font-size:11px;
        "
      >
        <div
          style="
            font-size:25px;
            margin-bottom:8px;
          "
        >
          👥
        </div>

        No people found.
      </div>
    `;

    return;
  }

  users.forEach(
    user => {
      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      button.className =
        "user";

      if (
        selectedUser &&
        selectedUser.id ===
          user.id
      ) {
        button.classList.add(
          "selected"
        );
      }

      const name =
        getUserName(user);

      const initial =
        getInitial(user);

      const gender =
        getGender(user);

      const online =
        isOnline(
          user.id
        );

      const unread =
        unreadCounts.get(
          user.id
        ) || 0;

      button.innerHTML = `
        <div class="avatar ${gender}">
          ${escapeHTML(initial)}
        </div>

        <div class="info">
          <strong>
            ${escapeHTML(name)}
          </strong>

          <div class="preview">
            @${escapeHTML(
              user.username ||
              "user"
            )}
          </div>
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
        () =>
          selectUser(user)
      );

      usersContainer.appendChild(
        button
      );
    }
  );
}


/* =========================================================
   SELECT USER
   ========================================================= */

async function selectUser(user) {
  if (!user) return;

  selectedUser =
    user;

  unreadCounts.delete(
    user.id
  );

  document.body.classList.add(
    "chat-open"
  );

  updateChatHeader();

  renderUsers(
    getFilteredUsers()
  );

  await loadMessages();

  updateBlockButton();

  updateChatStatus();

  messageInput?.focus();
}


function updateChatHeader() {
  if (!selectedUser) return;

  const name =
    getUserName(
      selectedUser
    );

  const initial =
    getInitial(
      selectedUser
    );

  const gender =
    getGender(
      selectedUser
    );

  if (chatName) {
    chatName.textContent =
      name;
  }

  if (chatAvatar) {
    chatAvatar.textContent =
      initial;

    chatAvatar.className =
      `chat-avatar ${gender}`;
  }
}


function updateChatStatus() {
  if (
    !selectedUser ||
    !chatStatus
  ) {
    return;
  }

  chatStatus.textContent =
    isOnline(
      selectedUser.id
    )
      ? "🟢 Online"
      : "⚫ Offline";
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
    blockedUserIds.has(
      selectedUser.id
    )
  ) {
    renderBlockedChat();
    return;
  }

  const currentId =
    currentUser.id;

  const otherId =
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
        `and(sender_id.eq.${currentId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentId})`
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );

  if (error) {
    console.error(
      "Messages error:",
      error
    );

    showError(
      "Could not load messages."
    );

    return;
  }

  renderMessages(
    data || []
  );
}


function renderBlockedChat() {
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
        Unblock this user from Settings.
      </div>
    </div>
  `;
}


/* =========================================================
   RENDER MESSAGES
   ========================================================= */

function renderMessages(messages) {
  if (!messagesContainer) {
    return;
  }

  messagesContainer.innerHTML =
    "";

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
          Send a respectful message to
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

  const fragment =
    document.createDocumentFragment();

  messages.forEach(
    message => {
      const wrapper =
        document.createElement(
          "div"
        );

      wrapper.className =
        message.sender_id ===
        currentUser.id
          ? "msg me"
          : "msg";

      wrapper.dataset.messageId =
        message.id;

      const text =
        document.createElement(
          "div"
        );

      text.className =
        "message-text";

      text.textContent =
        message.text || "";

      const meta =
        document.createElement(
          "div"
        );

      meta.className =
        "meta";

      meta.textContent =
        formatTime(
          message.created_at
        );

      wrapper.appendChild(
        text
      );

      wrapper.appendChild(
        meta
      );

      fragment.appendChild(
        wrapper
      );
    }
  );

  messagesContainer.appendChild(
    fragment
  );

  scrollMessagesToBottom();
}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

function checkMessageSafety(text) {
  const blockedWords = [
    "suicide",
    "rape",
    "fuck",
    "shit",
    "bitch"
  ];

  const lower =
    text.toLowerCase();

  for (
    const word of blockedWords
  ) {
    const pattern =
      new RegExp(
        `\\b${word}\\b`,
        "i"
      );

    if (
      pattern.test(lower)
    ) {
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


async function sendMessage() {
  if (
    !currentUser ||
    !selectedUser ||
    !messageInput
  ) {
    return;
  }

  if (
    blockedUserIds.has(
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

  if (
    text.length > 2000
  ) {
    showError(
      "Message cannot exceed 2000 characters."
    );

    return;
  }

  const safety =
    checkMessageSafety(
      text
    );

  if (!safety.safe) {
    showError(
      safety.reason
    );

    return;
  }

  if (sendButton) {
    sendButton.disabled =
      true;
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
    console.error(
      "Send message error:",
      error
    );

    if (sendButton) {
      sendButton.disabled =
        false;
    }

    showError(
      "Message could not be sent."
    );

    return;
  }

  messageInput.value =
    "";

  updateCharCount();

  if (data) {
    await loadMessages();
  }

  if (sendButton) {
    sendButton.disabled =
      false;
  }

  messageInput.focus();
}


/* =========================================================
   REALTIME MESSAGES
   ========================================================= */

function subscribeToMessages() {
  if (!currentUser) return;

  if (messageChannel) {
    supabaseClient.removeChannel(
      messageChannel
    );

    messageChannel = null;
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
    async payload => {
      const message =
        payload?.new;

      if (!message) return;

      const incoming =
        message.receiver_id ===
        currentUser.id;

      const outgoing =
        message.sender_id ===
        currentUser.id;

      if (
        !incoming &&
        !outgoing
      ) {
        return;
      }

      if (outgoing) {
        return;
      }

      if (
        blockedUserIds.has(
          message.sender_id
        )
      ) {
        return;
      }

      if (
        selectedUser &&
        selectedUser.id ===
          message.sender_id
      ) {
        await loadMessages();

        return;
      }

      const old =
        unreadCounts.get(
          message.sender_id
        ) || 0;

      unreadCounts.set(
        message.sender_id,
        old + 1
      );

      renderUsers(
        getFilteredUsers()
      );
    }
  );

  messageChannel.subscribe(
    status => {
      console.log(
        "Q1 message realtime:",
        status
      );

      if (
        status ===
        "SUBSCRIBED"
      ) {
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


/* =========================================================
   PRESENCE
   ========================================================= */

function subscribeToPresence() {
  if (!currentUser) return;

  if (presenceChannel) {
    supabaseClient.removeChannel(
      presenceChannel
    );

    presenceChannel = null;
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

  presenceChannel.on(
    "presence",
    {
      event: "sync"
    },
    () => {
      const state =
        presenceChannel.presenceState();

      onlineUsers =
        new Set(
          Object.keys(
            state || {}
          )
        );

      renderUsers(
        getFilteredUsers()
      );

      updateChatStatus();
    }
  );

  presenceChannel.subscribe(
    async status => {
      console.log(
        "Q1 presence:",
        status
      );

      if (
        status ===
        "SUBSCRIBED"
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


/* =========================================================
   PROFILE VIEW
   ========================================================= */

function showProfileView(user) {
  if (
    !profileDialog ||
    !profileContent ||
    !user
  ) {
    return;
  }

  const name =
    getUserName(user);

  const initial =
    getInitial(user);

  const gender =
    getGender(user);

  const online =
    isOnline(
      user.id
    );

  const friend =
    isFriend(
      user.id
    );

  profileContent.innerHTML = `
    <div class="profile-view">

      <div
        class="profile-avatar ${gender}"
      >
        ${escapeHTML(initial)}
      </div>

      <h3>
        ${escapeHTML(name)}
      </h3>

      <p>
        @${escapeHTML(
          user.username ||
          "user"
        )}
      </p>

      <p>
        ${
          online
            ? "🟢 Online"
            : "⚫ Offline"
        }
      </p>

      <p>
        ${
          friend
            ? "❤️ Friend"
            : "👤 Not a friend"
        }
      </p>

    </div>
  `;

  openDialog(
    profileDialog
  );
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
   SCROLL
   ========================================================= */

function scrollMessagesToBottom() {
  if (!messagesContainer) {
    return;
  }

  requestAnimationFrame(() => {
    messagesContainer.scrollTop =
      messagesContainer.scrollHeight;
  });
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
  if (uiReady) return;

  uiReady = true;

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
        event.key ===
          "Enter" &&
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
      await loadBlockedUsers();

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
    .forEach(
      button => {
        button.addEventListener(
          "click",
          async () => {
            document
              .querySelectorAll(
                ".filter[data-filter]"
              )
              .forEach(
                item =>
                  item.classList.remove(
                    "active"
                  )
              );

            button.classList.add(
              "active"
            );

            currentFilter =
              button.dataset.filter ||
              "online";

            if (
              currentFilter ===
              "friends"
            ) {
              await loadFriends();
            }

            renderUsers(
              getFilteredUsers()
            );
          }
        );
      }
    );


  reportButton?.addEventListener(
    "click",
    () => {
      if (!selectedUser) return;

      window.alert(
        "Report feature will be connected to Q1 moderation."
      );
    }
  );


  updateCharCount();
}


/* =========================================================
   START
   ========================================================= */

async function startQ1Chat() {
  if (appStarted) {
    return;
  }

  appStarted = true;

  try {
    initTheme();
    setupUI();

    setAuthStatus(
      "Connecting..."
    );

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (
      data?.session?.user
    ) {
      currentUser =
        data.session.user;
    } else {
      const result =
        await supabaseClient.auth.signInAnonymously();

      if (result.error) {
        throw result.error;
      }

      currentUser =
        result.data?.user;
    }

    if (!currentUser) {
      throw new Error(
        "No authenticated user."
      );
    }

    await loadOrCreateProfile();

    await loadBlockedUsers();

    await loadFriends();

    await loadUsers();

    subscribeToPresence();

    subscribeToMessages();

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

    if (
      chatStatus
    ) {
      chatStatus.textContent =
        "❌ Could not connect to Q1.";
    }
  }
}


/* =========================================================
   AUTH STATE
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (
    _event,
    session
  ) => {
    if (!session?.user) {
      return;
    }

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

      await loadBlockedUsers();

      await loadFriends();

      await loadUsers();

      subscribeToPresence();

      subscribeToMessages();

    } catch (error) {
      console.error(
        "Auth state error:",
        error
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

      presenceChannel = null;
    }

    if (messageChannel) {
      supabaseClient.removeChannel(
        messageChannel
      );

      messageChannel = null;
    }
  }
);


/* =========================================================
   BOOT
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
