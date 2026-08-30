# /*

Q1 CHAT
Modern UI + Supabase Realtime
Clean Replacement script.js
===========================

*/

/* ================= SUPABASE ================= */

const SUPABASE_URL =
"https://ubkvpmwpvmozhbwlxhmx.supabase.co";

const SUPABASE_KEY =
"sb_publishable_n8GM1QZs-3hM90160r--2A_sGrkvxtY";

if (!window.supabase) {
console.error("Supabase browser client was not loaded.");
throw new Error("Supabase library is missing.");
}

const supabaseClient =
window.supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);

/* ================= STATE ================= */

let currentUser = null;
let currentProfile = null;
let selectedUser = null;

let allUsers = [];

let blockedUserIds = new Set();
let onlineUsers = new Map();
let unreadCounts = new Map();

let presenceChannel = null;
let globalMessageChannel = null;

let uiInitialized = false;
let appStarted = false;

let currentFilter = "online";

/* ================= DOM ================= */

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

const profileViewDialog =
document.getElementById("profileDialog");

const closeProfileButton =
document.getElementById("closeProfile");

const profileViewContent =
document.getElementById("profileContent");

/* ================= HELPERS ================= */

function escapeHTML(value) {
return String(value ?? "")
.replace(/&/g, "&")
.replace(/</g, "<")
.replace(/>/g, ">")
.replace(/"/g, """)
.replace(/'/g, "'");
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

/* ================= THEME ================= */

function initTheme() {
const saved =
localStorage.getItem("q1-theme") ||
"light";

document.documentElement.setAttribute(
"data-theme",
saved
);

updateThemeButton(saved);
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

/* ================= AUTH STATUS ================= */

function setAuthStatus(
text,
type = "normal"
) {
if (!authStatus) return;

authStatus.innerHTML = `     <span class="connection-dot"></span>
    ${escapeHTML(text)}
  `;

const dot =
authStatus.querySelector(
".connection-dot"
);

if (!dot) return;

if (type === "success") {
dot.style.background = "#2db36c";
} else if (type === "error") {
dot.style.background = "#d9534f";
} else {
dot.style.background = "#f0a000";
}
}

/* ================= USERNAME ================= */

const adjectives = [
"Neon",
"Sky",
"Moon",
"Pixel",
"Star",
"Solar",
"Cyber",
"Silk",
"Swift",
"Silent",
"Bright",
"Dark",
"Cosmic",
"Golden",
"Silver",
"Rainbow",
"Thunder",
"Frost",
"Sunset",
"Dawn",
"Ocean",
"Forest",
"Mystic",
"Radiant",
"Vivid",
"Serene",
"Quantum",
"Nova",
"Stellar",
"Twilight",
"Crystal",
"Harmony",
"Blaze",
"Echo",
"Spark",
"Gentle",
"Smooth",
"Sleek",
"Majestic",
"Ethereal",
"Luminous"
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
"Cougar",
"Jaguar",
"Panther",
"Griffin",
"Hawk",
"Peacock",
"Koala",
"Lemur",
"Puma"
];

async function generateUniqueUsername() {
for (let i = 0; i < 10; i++) {
const adj =
adjectives[
Math.floor(
Math.random() *
adjectives.length
)
];

```
const animal =
  animals[
    Math.floor(
      Math.random() *
        animals.length
    )
  ];

const username =
  adj + animal;

const {
  data,
  error
} =
  await supabaseClient
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

if (error) {
  console.warn(
    "Username check error:",
    error
  );
}

if (!data) {
  return username;
}
```

}

return (
"Q1User" +
Math.floor(
Math.random() * 100000
)
);
}

/* ================= MESSAGE SAFETY ================= */

const badWords = [
"damn",
"hell",
"crap",
"piss",
"ass",
"bitch",
"bastard",
"shit",
"fuck",
"cock",
"pussy",
"dick",
"whore",
"slut",
"rape",
"kill",
"suicide",
"hate"
];

const spamPatterns = [
/https?://|[www.|.com|.net|.org|.io|.cc|.co/gi](http://www.|.com|.net|.org|.io|.cc|.co/gi),

/(?:email|mail|contact|dm|dm me|message me|call me|phone|number|tel)(?:\s|:|=)?+?[\d\s-()]{7,}/gi,

/\d{3}[\s-]?\d{3}[\s-]?\d{4}/g,

/@gmail|@yahoo|@outlook|@hotmail/gi
];

function checkMessageSafety(text) {
if (!text) {
return {
safe: true
};
}

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

```
if (pattern.test(normalized)) {
  return {
    safe: false,
    reason:
      "Please keep messages respectful."
  };
}
```

}

for (const pattern of spamPatterns) {
pattern.lastIndex = 0;

```
if (pattern.test(text)) {
  return {
    safe: false,
    reason:
      "Avoid sharing external links or contact information."
  };
}
```

}

return {
safe: true
};
}

/* ================= BLOCK SYSTEM ================= */

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
console.error(
"Blocked users error:",
error
);
return;
}

blockedUserIds =
new Set(
(data || []).map(
item => item.blocked_id
)
);

await renderBlockedUsers(
data || []
);

renderUsers(
getFilteredUsers()
);

updateBlockButtonState();
}

async function renderBlockedUsers(data) {
if (!blockedList) return;

blockedList.innerHTML = "";

if (!data.length) {
blockedList.innerHTML = `       <div class="empty-blocked">
        No blocked users.       </div>
    `;
return;
}

for (const block of data) {
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
block.blocked_id
)
.maybeSingle();

```
if (!user) continue;

const row =
  document.createElement(
    "div"
  );

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

      await loadBlockedUsers();
    }
  );

blockedList.appendChild(
  row
);
```

}
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
!window.confirm(
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
blocker_id:
currentUser.id,
blocked_id:
selectedUser.id
});

if (error) {
if (
error.code ===
"23505"
) {
showError(
"User already blocked."
);
} else {
console.error(error);

```
  showError(
    "Could not block user."
  );
}

return;
```

}

await loadBlockedUsers();
await loadMessages();

updateBlockButtonState();

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

```
showError(
  "Could not unblock user."
);

return;
```

}

showSuccess(
"User unblocked."
);
}

function isUserBlocked(userId) {
return blockedUserIds.has(
userId
);
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

if (messageInput) {
messageInput.disabled =
blocked;
}

if (sendButton) {
sendButton.disabled =
blocked;
}
}

/* ================= PRESENCE ================= */

function subscribeToPresence() {
if (!currentUser) return;

if (presenceChannel) {
supabaseClient.removeChannel(
presenceChannel
);

```
presenceChannel = null;
```

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

```
    onlineUsers.clear();

    for (
      const [
        key,
        presences
      ] of Object.entries(
        state
      )
    ) {
      if (
        presences &&
        presences.length
      ) {
        const presence =
          presences[0];

        onlineUsers.set(
          presence.user_id ||
            key,
          presence
        );
      }
    }

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
    for (
      const presence of
      newPresences || []
    ) {
      if (
        presence.user_id
      ) {
        onlineUsers.set(
          presence.user_id,
          presence
        );
      }
    }

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
    for (
      const presence of
      leftPresences || []
    ) {
      if (
        presence.user_id
      ) {
        onlineUsers.delete(
          presence.user_id
        );
      }
    }

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
```

}

function getOnlineStatus(userId) {
return onlineUsers.has(
userId
);
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

/* ================= PROFILE ================= */

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
currentProfile = data;
fillSettings();
return;
}

const username =
await generateUniqueUsername();

const newProfile = {
id:
currentUser.id,
username,
display_name:
"Q1 User",
gender:
"other"
};

const {
data: createdProfile,
error: createError
} =
await supabaseClient
.from("profiles")
.insert(
newProfile
)
.select()
.single();

if (createError) {
throw createError;
}

currentProfile =
createdProfile;

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

```
showError(
  "Could not save settings."
);

return;
```

}

currentProfile = data;

closeDialog(
settingsDialog
);

await loadUsers();

showSuccess(
"Settings saved."
);
}

/* ================= USERS ================= */

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

```
showError(
  "Could not load people."
);

return;
```

}

allUsers = data || [];

renderUsers(
getFilteredUsers()
);
}

/* ================= FILTER ================= */

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

```
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
```

}

if (
currentFilter ===
"online"
) {
users =
users.filter(
user =>
getOnlineStatus(
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

return users;
}

/* ================= UNREAD ================= */

function getUnreadCount(userId) {
return (
unreadCounts.get(
userId
) || 0
);
}

function clearUnread(userId) {
unreadCounts.delete(
userId
);

renderUsers(
getFilteredUsers()
);
}

function addUnread(userId) {
if (
!userId ||
userId ===
currentUser?.id
) {
return;
}

const current =
getUnreadCount(
userId
);

unreadCounts.set(
userId,
current + 1
);

renderUsers(
getFilteredUsers()
);
}

/* ================= RENDER USERS ================= */

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
usersContainer.innerHTML = ` <div
     style="
       padding:35px 20px;
       text-align:center;
       color:var(--muted);
       font-size:11px;
     "
   > <div
       style="
         font-size:25px;
         margin-bottom:8px;
       "
     >
👥 </div>

```
    No people found.
  </div>
`;

return;
```

}

users.forEach(
user => {
const button =
document.createElement(
"button"
);

```
  button.type =
    "button";

  button.className =
    "user";

  button.dataset.userId =
    user.id;

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

  const firstLetter =
    getInitial(user);

  const gender =
    getGender(user);

  const isOnline =
    getOnlineStatus(
      user.id
    );

  const unread =
    getUnreadCount(
      user.id
    );

  button.innerHTML = `
    <div class="avatar ${gender}">
      ${escapeHTML(
        firstLetter
      )}
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
          : isOnline
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
```

);
}

/* ================= SEARCH ================= */

function searchUsers() {
renderUsers(
getFilteredUsers()
);
}

/* ================= SELECT USER ================= */

async function selectUser(user) {
if (!user) return;

selectedUser =
user;

clearUnread(
user.id
);

document.body.classList.add(
"chat-open"
);

const name =
getUserName(user);

const firstLetter =
getInitial(user);

const gender =
getGender(user);

if (chatName) {
chatName.textContent =
name;
}

if (chatAvatar) {
chatAvatar.textContent =
firstLetter;

```
chatAvatar.className =
  `chat-avatar ${gender}`;
```

}

if (messageInput) {
messageInput.disabled =
false;
}

if (sendButton) {
sendButton.disabled =
false;
}

if (blockButton) {
blockButton.disabled =
false;
}

if (reportButton) {
reportButton.disabled =
false;
}

renderUsers(
getFilteredUsers()
);

await loadMessages();

updateBlockButtonState();
updateSelectedUserStatus();

messageInput?.focus();
}

/* ================= LOAD MESSAGES ================= */

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
messagesContainer.innerHTML = ` <div class="welcome"> <div class="welcome-logo">
🚫 </div>

```
    <h2>
      User blocked
    </h2>

    <p>
      You have blocked this user.
    </p>

    <div class="welcome-tip">
      Unblock them from Settings.
    </div>
  </div>
`;

return;
```

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
console.error(
"Load messages error:",
error
);

```
showError(
  "Could not load messages."
);

return;
```

}

renderMessages(
data || []
);
}

/* ================= RENDER MESSAGES ================= */

function renderMessages(messages) {
if (!messagesContainer) {
return;
}

messagesContainer.innerHTML =
"";

if (!messages.length) {
messagesContainer.innerHTML = ` <div class="welcome"> <div class="welcome-logo">
💬 </div>

```
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
```

}

messages.forEach(
message => {
const wrapper =
document.createElement(
"div"
);

```
  wrapper.className =
    message.sender_id ===
    currentUser.id
      ? "msg me"
      : "msg";

  const text =
    document.createElement(
      "div"
    );

  text.textContent =
    message.text;

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

  messagesContainer.appendChild(
    wrapper
  );
}
```

);

scrollMessagesToBottom();
}

/* ================= SEND MESSAGE ================= */

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

```
return;
```

}

const text =
messageInput.value.trim();

if (!text) return;

if (text.length > 2000) {
showError(
"Message cannot exceed 2000 characters."
);

```
return;
```

}

const safety =
checkMessageSafety(
text
);

if (!safety.safe) {
showError(
"⚠️ " +
safety.reason
);

```
return;
```

}

if (sendButton) {
sendButton.disabled =
true;
}

const {
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
});

if (sendButton) {
sendButton.disabled =
false;
}

if (error) {
console.error(
"Send message error:",
error
);

```
showError(
  "Message could not be sent."
);

return;
```

}

messageInput.value =
"";

updateCharCount();

/*
Realtime will normally update the chat.
We also load once here so the sender
sees their message immediately.
*/
await loadMessages();

messageInput.focus();
}

/* =========================================================
GLOBAL REALTIME MESSAGE SYSTEM
========================================================= */

function subscribeToGlobalMessages() {
if (!currentUser) {
return;
}

/*
Prevent duplicate channels.
*/
if (globalMessageChannel) {
supabaseClient.removeChannel(
globalMessageChannel
);

```
globalMessageChannel =
  null;
```

}

const channelName =
`q1-global-messages-${currentUser.id}`;

globalMessageChannel =
supabaseClient.channel(
channelName
);

/*
Listen for every INSERT on messages.

```
We intentionally do not add a receiver_id
filter here. This makes the listener work
reliably with the existing application logic.
```

*/
globalMessageChannel.on(
"postgres_changes",
{
event: "INSERT",
schema: "public",
table: "messages"
},
async payload => {
const message =
payload?.new;

```
  if (!message) {
    return;
  }

  if (!currentUser) {
    return;
  }

  const isIncoming =
    message.receiver_id ===
    currentUser.id;

  const isOutgoing =
    message.sender_id ===
    currentUser.id;

  /*
    Ignore messages that have nothing
    to do with this logged-in user.
  */
  if (
    !isIncoming &&
    !isOutgoing
  ) {
    return;
  }

  console.log(
    "🔥 Q1 REALTIME MESSAGE:",
    message
  );

  /*
    OUR OWN MESSAGE
  */
  if (isOutgoing) {
    if (
      selectedUser &&
      message.receiver_id ===
        selectedUser.id
    ) {
      await loadMessages();
    }

    return;
  }

  /*
    INCOMING MESSAGE FROM OTHER USER
  */

  if (
    isUserBlocked(
      message.sender_id
    )
  ) {
    return;
  }

  /*
    CURRENT CHAT IS OPEN
  */
  if (
    selectedUser &&
    message.sender_id ===
      selectedUser.id
  ) {
    await loadMessages();

    scrollMessagesToBottom();

    return;
  }

  /*
    ANOTHER CHAT / NO CHAT OPEN

    Increase unread badge immediately.
  */
  addUnread(
    message.sender_id
  );

  showBrowserNotification(
    message
  );
}
```

);

globalMessageChannel.subscribe(
status => {
console.log(
"Q1 message realtime:",
status
);

```
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

  if (
    status ===
      "CHANNEL_ERROR" ||
    status ===
      "TIMED_OUT"
  ) {
    console.warn(
      "⚠️ Q1 realtime connection:",
      status
    );
  }
}
```

);
}

/* ================= BROWSER NOTIFICATION ================= */

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
console.warn(
"Notification permission error:",
error
);
}
}
}

/* ================= PROFILE VIEW ================= */

function showProfileView(user) {
if (
!profileViewDialog ||
!profileViewContent
) {
return;
}

const name =
getUserName(user);

const firstLetter =
getInitial(user);

const gender =
getGender(user);

const online =
getOnlineStatus(
user.id
);

profileViewContent.innerHTML = ` <div class="profile-view">

```
  <div
    class="profile-avatar ${gender}"
  >
    ${escapeHTML(
      firstLetter
    )}
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

</div>
```

`;

openDialog(
profileViewDialog
);
}

/* ================= TIME ================= */

function formatTime(timestamp) {
if (!timestamp) {
return "";
}

return new Date(
timestamp
).toLocaleTimeString(
[],
{
hour: "2-digit",
minute: "2-digit"
}
);
}

/* ================= CHARACTER COUNT ================= */

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

/* ================= SCROLL ================= */

function scrollMessagesToBottom() {
if (!messagesContainer) {
return;
}

requestAnimationFrame(
() => {
messagesContainer.scrollTop =
messagesContainer.scrollHeight;
}
);
}

/* ================= DIALOG ================= */

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

/* ================= ERROR / SUCCESS ================= */

function showError(message) {
console.error(
message
);

if (!chatStatus) {
return;
}

chatStatus.textContent =
"❌ " + message;

setTimeout(
() => {
if (selectedUser) {
updateSelectedUserStatus();
}
},
3000
);
}

function showSuccess(message) {
console.log(
message
);

if (!chatStatus) {
return;
}

chatStatus.textContent =
"✓ " + message;

setTimeout(
() => {
if (selectedUser) {
updateSelectedUserStatus();
}
},
2500
);
}

/* ================= UI ================= */

function setupUI() {
if (uiInitialized) {
return;
}

uiInitialized = true;

/* SEARCH */

searchInput?.addEventListener(
"input",
searchUsers
);

/* SEND */

sendButton?.addEventListener(
"click",
sendMessage
);

/* ENTER */

messageInput?.addEventListener(
"keydown",
event => {
if (
event.key ===
"Enter" &&
!event.shiftKey
) {
event.preventDefault();

```
    sendMessage();
  }
}
```

);

/* CHARACTER COUNT */

messageInput?.addEventListener(
"input",
updateCharCount
);

/* SETTINGS */

settingsButton?.addEventListener(
"click",
() => {
fillSettings();

```
  openDialog(
    settingsDialog
  );
}
```

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

/* THEME */

themeToggle?.addEventListener(
"click",
toggleTheme
);

/* BLOCK */

blockButton?.addEventListener(
"click",
blockSelectedUser
);

/* BLOCKED USERS */

blockedButton?.addEventListener(
"click",
async () => {
await loadBlockedUsers();

```
  openDialog(
    blockedDialog
  );
}
```

);

closeBlockedButton?.addEventListener(
"click",
() => {
closeDialog(
blockedDialog
);
}
);

/* PROFILE */

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
profileViewDialog
);
}
);

/* FILTERS */

document
.querySelectorAll(
".filter[data-filter]"
)
.forEach(
button => {
button.addEventListener(
"click",
() => {
document
.querySelectorAll(
".filter[data-filter]"
)
.forEach(
btn =>
btn.classList.remove(
"active"
)
);

```
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
  }
);
```

/* REPORT */

reportButton?.addEventListener(
"click",
() => {
if (!selectedUser) {
return;
}

```
  alert(
    "Report feature will be connected to the Q1 moderation system."
  );
}
```

);

/*
Notification permission is requested
after the user's first click.
*/
document.addEventListener(
"click",
requestNotificationPermission,
{
once: true
}
);
}

/* ================= START Q1 CHAT ================= */

async function startQ1Chat() {
if (appStarted) {
return;
}

appStarted = true;

try {
initTheme();
setupUI();

```
if (
  !SUPABASE_URL ||
  !SUPABASE_KEY
) {
  setAuthStatus(
    "Add Supabase key",
    "error"
  );

  return;
}

setAuthStatus(
  "Connecting..."
);

/*
  Check existing session.
*/
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
  /*
    Anonymous authentication.
  */
  if (
    typeof supabaseClient
      .auth
      .signInAnonymously !==
    "function"
  ) {
    throw new Error(
      "Anonymous auth is not supported by this Supabase client."
    );
  }

  const {
    data,
    error
  } =
    await supabaseClient
      .auth
      .signInAnonymously();

  if (error) {
    throw error;
  }

  currentUser =
    data?.user;
}

if (!currentUser) {
  throw new Error(
    "No authenticated user found."
  );
}

setAuthStatus(
  "Connected",
  "success"
);

/*
  Load application data.
*/
await loadOrCreateProfile();

await loadBlockedUsers();

await loadUsers();

/*
  Start realtime systems ONCE.
*/
subscribeToPresence();

subscribeToGlobalMessages();

updateCharCount();

console.log(
  "✅ Q1 Chat started successfully"
);
```

} catch (error) {
console.error(
"Q1 startup error:",
error
);

```
setAuthStatus(
  "Connection failed",
  "error"
);

showError(
  "Q1 Chat could not connect to Supabase."
);
```

}
}

/* ================= AUTH STATE ================= */

supabaseClient.auth.onAuthStateChange(
async (
_event,
session
) => {
if (!session?.user) {
return;
}

```
/*
  Ignore duplicate session event
  for the same user.
*/
if (
  currentUser &&
  currentUser.id ===
    session.user.id
) {
  return;
}

currentUser =
  session.user;

setAuthStatus(
  "Connected",
  "success"
);

try {
  await loadOrCreateProfile();

  await loadBlockedUsers();

  await loadUsers();

  subscribeToPresence();

  subscribeToGlobalMessages();
} catch (error) {
  console.error(
    "Auth state error:",
    error
  );

  showError(
    "Could not load your profile."
  );
}
```

}
);

/* ================= MOBILE BACK ================= */

window.addEventListener(
"popstate",
() => {
document.body.classList.remove(
"chat-open"
);
}
);

/* ================= CLEANUP ================= */

window.addEventListener(
"beforeunload",
() => {
if (presenceChannel) {
supabaseClient.removeChannel(
presenceChannel
);

```
  presenceChannel = null;
}

if (
  globalMessageChannel
) {
  supabaseClient.removeChannel(
    globalMessageChannel
  );

  globalMessageChannel =
    null;
}
```

}
);

/* ================= START ================= */

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
