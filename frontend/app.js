/* =========================================================
   Q1 CHAT — app.js
   Supabase Anonymous Auth + Profiles + Messages + Blocks
   ========================================================= */

const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;
let selectedUser = null;
let messageSubscription = null;


/* =========================================================
   DOM HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   AUTH
   ========================================================= */

async function initializeAuth() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("Session error:", error);
      return;
    }

    if (data.session?.user) {
      currentUser = data.session.user;
      await loadOrCreateProfile();
      await loadUsers();
      return;
    }

    const { data: authData, error: authError } =
      await supabaseClient.auth.signInAnonymously();

    if (authError) {
      console.error("Anonymous sign-in failed:", authError);
      showStatus("Unable to start Q1 Chat.");
      return;
    }

    currentUser = authData.user;

    await loadOrCreateProfile();
    await loadUsers();

  } catch (error) {
    console.error("Initialization error:", error);
    showStatus("Something went wrong while starting Q1 Chat.");
  }
}


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

supabaseClient.auth.onAuthStateChange(async (_event, session) => {
  if (!session?.user) return;

  if (!currentUser || currentUser.id !== session.user.id) {
    currentUser = session.user;

    await loadOrCreateProfile();
    await loadUsers();
  }
});


/* =========================================================
   PROFILE
   ========================================================= */

async function loadOrCreateProfile() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Profile load error:", error);
    return;
  }

  if (data) {
    currentProfile = data;
    updateMyProfileUI();
    return;
  }

  const username =
    "user_" + currentUser.id.replace(/-/g, "").slice(0, 8);

  const newProfile = {
    id: currentUser.id,
    username: username,
    display_name: "Q1 User",
    gender: "other"
  };

  const { data: createdProfile, error: createError } =
    await supabaseClient
      .from("profiles")
      .insert(newProfile)
      .select()
      .single();

  if (createError) {
    console.error("Profile creation error:", createError);
    return;
  }

  currentProfile = createdProfile;
  updateMyProfileUI();
}


/* =========================================================
   UPDATE PROFILE
   ========================================================= */

async function updateMyProfile({
  username,
  display_name,
  gender
}) {
  if (!currentUser) return false;

  const updates = {};

  if (username !== undefined) {
    updates.username = username.trim();
  }

  if (display_name !== undefined) {
    updates.display_name = display_name.trim() || "Q1 User";
  }

  if (gender !== undefined) {
    updates.gender = gender;
  }

  const { data, error } = await supabaseClient
    .from("profiles")
    .update(updates)
    .eq("id", currentUser.id)
    .select()
    .single();

  if (error) {
    console.error("Profile update error:", error);
    return false;
  }

  currentProfile = data;
  updateMyProfileUI();

  return true;
}


/* =========================================================
   USERS
   ========================================================= */

async function loadUsers() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, username, display_name, gender, created_at")
    .neq("id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Users load error:", error);
    return;
  }

  renderUsers(data || []);
}


/* =========================================================
   RENDER USERS
   ========================================================= */

function renderUsers(users) {
  const container =
    $("#usersList") ||
    $("#userList") ||
    $(".users-list") ||
    $(".user-list");

  if (!container) {
    console.warn(
      "Users container not found. Add #usersList to your HTML."
    );
    return;
  }

  if (!users.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No other users yet.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = users.map(user => `
    <button
      class="user-item"
      data-user-id="${escapeHTML(user.id)}"
      type="button"
    >
      <div class="user-avatar">
        ${escapeHTML(
          (user.display_name || user.username || "U")
            .charAt(0)
            .toUpperCase()
        )}
      </div>

      <div class="user-info">
        <strong>
          ${escapeHTML(user.display_name || user.username || "Q1 User")}
        </strong>

        <small>
          @${escapeHTML(user.username || "user")}
        </small>
      </div>
    </button>
  `).join("");

  container.querySelectorAll(".user-item").forEach(button => {
    button.addEventListener("click", () => {
      const userId = button.dataset.userId;
      selectUser(userId);
    });
  });
}


/* =========================================================
   SELECT USER
   ========================================================= */

async function selectUser(userId) {
  if (!currentUser || userId === currentUser.id) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Selected user error:", error);
    return;
  }

  if (!data) {
    showStatus("User not found.");
    return;
  }

  selectedUser = data;

  updateChatHeader();
  await loadMessages();
  subscribeToMessages();

  const input =
    $("#messageInput") ||
    $("#chatInput");

  if (input) {
    input.focus();
  }
}


/* =========================================================
   CHAT HEADER
   ========================================================= */

function updateChatHeader() {
  if (!selectedUser) return;

  const name =
    selectedUser.display_name ||
    selectedUser.username ||
    "Q1 User";

  const elements = [
    $("#chatUserName"),
    $("#selectedUserName"),
    $(".chat-user-name")
  ];

  elements.forEach(element => {
    if (element) {
      element.textContent = name;
    }
  });
}


/* =========================================================
   LOAD MESSAGES
   ========================================================= */

async function loadMessages() {
  if (!currentUser || !selectedUser) return;

  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedUser.id}),` +
      `and(sender_id.eq.${selectedUser.id},receiver_id.eq.${currentUser.id})`
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Messages load error:", error);
    return;
  }

  renderMessages(data || []);
}


/* =========================================================
   RENDER MESSAGES
   ========================================================= */

function renderMessages(messages) {
  const container =
    $("#messages") ||
    $("#messagesList") ||
    $(".messages") ||
    $(".messages-list");

  if (!container) {
    console.warn(
      "Messages container not found. Add #messages to your HTML."
    );
    return;
  }

  if (!messages.length) {
    container.innerHTML = `
      <div class="empty-chat">
        <p>Start the conversation 👋</p>
      </div>
    `;
    return;
  }

  container.innerHTML = messages.map(message => {
    const mine = message.sender_id === currentUser.id;

    return `
      <div class="message ${mine ? "message-sent" : "message-received"}">
        <div class="message-bubble">
          ${escapeHTML(message.text)}
        </div>

        <small class="message-time">
          ${formatTime(message.created_at)}
        </small>
      </div>
    `;
  }).join("");

  scrollMessagesToBottom();
}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {
  if (!currentUser || !selectedUser) {
    showStatus("Select a user first.");
    return;
  }

  const input =
    $("#messageInput") ||
    $("#chatInput");

  if (!input) {
    console.error("Message input not found.");
    return;
  }

  const text = input.value.trim();

  if (!text) return;

  if (text.length > 2000) {
    showStatus("Message is too long.");
    return;
  }

  const { error } = await supabaseClient
    .from("messages")
    .insert({
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      text: text
    });

  if (error) {
    console.error("Send message error:", error);
    showStatus("Message could not be sent.");
    return;
  }

  input.value = "";
  input.focus();

  await loadMessages();
}


/* =========================================================
   REALTIME MESSAGES
   ========================================================= */

function subscribeToMessages() {
  if (!currentUser || !selectedUser) return;

  if (messageSubscription) {
    supabaseClient.removeChannel(messageSubscription);
    messageSubscription = null;
  }

  messageSubscription = supabaseClient
    .channel(
      `q1-chat-${currentUser.id}-${selectedUser.id}`
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${currentUser.id}`
      },
      async () => {
        await loadMessages();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `sender_id=eq.${currentUser.id}`
      },
      async () => {
        await loadMessages();
      }
    )
    .subscribe((status) => {
      console.log("Realtime status:", status);
    });
}


/* =========================================================
   BLOCK USER
   ========================================================= */

async function blockUser(userId) {
  if (!currentUser || !userId) return false;

  const { error } = await supabaseClient
    .from("blocks")
    .insert({
      blocker_id: currentUser.id,
      blocked_id: userId
    });

  if (error) {
    if (error.code === "23505") {
      showStatus("User is already blocked.");
    } else {
      console.error("Block error:", error);
      showStatus("Could not block user.");
    }

    return false;
  }

  showStatus("User blocked.");
  return true;
}


/* =========================================================
   UNBLOCK USER
   ========================================================= */

async function unblockUser(userId) {
  if (!currentUser || !userId) return false;

  const { error } = await supabaseClient
    .from("blocks")
    .delete()
    .eq("blocker_id", currentUser.id)
    .eq("blocked_id", userId);

  if (error) {
    console.error("Unblock error:", error);
    showStatus("Could not unblock user.");
    return false;
  }

  showStatus("User unblocked.");
  return true;
}


/* =========================================================
   CHECK BLOCK
   ========================================================= */

async function isUserBlocked(userId) {
  if (!currentUser || !userId) return false;

  const { data, error } = await supabaseClient
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", currentUser.id)
    .eq("blocked_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Block check error:", error);
    return false;
  }

  return !!data;
}


/* =========================================================
   FORMAT TIME
   ========================================================= */

function formatTime(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}


/* =========================================================
   SCROLL CHAT
   ========================================================= */

function scrollMessagesToBottom() {
  const container =
    $("#messages") ||
    $("#messagesList") ||
    $(".messages") ||
    $(".messages-list");

  if (!container) return;

  container.scrollTop = container.scrollHeight;
}


/* =========================================================
   MY PROFILE UI
   ========================================================= */

function updateMyProfileUI() {
  if (!currentProfile) return;

  const name =
    currentProfile.display_name ||
    currentProfile.username ||
    "Q1 User";

  const username =
    currentProfile.username || "";

  const nameElements = [
    $("#myDisplayName"),
    $("#profileName"),
    $(".my-display-name")
  ];

  nameElements.forEach(element => {
    if (element) {
      element.textContent = name;
    }
  });

  const usernameElements = [
    $("#myUsername"),
    $("#profileUsername"),
    $(".my-username")
  ];

  usernameElements.forEach(element => {
    if (element) {
      element.textContent = username
        ? "@" + username
        : "";
    }
  });
}


/* =========================================================
   STATUS MESSAGE
   ========================================================= */

function showStatus(message) {
  console.log(message);

  const status =
    $("#status") ||
    $("#statusMessage") ||
    $(".status-message");

  if (!status) return;

  status.textContent = message;
  status.classList.add("show");

  setTimeout(() => {
    status.classList.remove("show");
  }, 3000);
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

  /* Send button */

  const sendButton =
    $("#sendButton") ||
    $("#sendBtn") ||
    $(".send-button");

  if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
  }


  /* Enter key */

  const input =
    $("#messageInput") ||
    $("#chatInput");

  if (input) {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });
  }


  /* Profile save */

  const profileForm = $("#profileForm");

  if (profileForm) {
    profileForm.addEventListener("submit", async event => {
      event.preventDefault();

      const username =
        $("#username")?.value || "";

      const display_name =
        $("#displayName")?.value || "";

      const gender =
        $("#gender")?.value || "other";

      const success = await updateMyProfile({
        username,
        display_name,
        gender
      });

      if (success) {
        showStatus("Profile updated.");
        await loadUsers();
      }
    });
  }


  /* Refresh users */

  const refreshButton =
    $("#refreshUsers") ||
    $("#refreshButton");

  if (refreshButton) {
    refreshButton.addEventListener("click", loadUsers);
  }


  /* Block button */

  const blockButton =
    $("#blockUser") ||
    $("#blockButton");

  if (blockButton) {
    blockButton.addEventListener("click", async () => {
      if (!selectedUser) return;

      const success = await blockUser(selectedUser.id);

      if (success) {
        await loadUsers();
      }
    });
  }
}


/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener("beforeunload", () => {
  if (messageSubscription) {
    supabaseClient.removeChannel(messageSubscription);
  }
});


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.Q1Chat = {
  sendMessage,
  loadUsers,
  loadMessages,
  selectUser,
  updateMyProfile,
  blockUser,
  unblockUser,
  isUserBlocked
};


/* =========================================================
   START Q1 CHAT
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await initializeAuth();
});
```
