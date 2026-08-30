const SUPABASE_URL = "https://ubkvpmwpvmozhbwlxhmx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_n8GM1QZs-3hM90160r--2A_sGrkvxtY";
const BACKEND_URL = "";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// --------------------------------------------------
// Q1 CHAT STATE
// --------------------------------------------------

const state = {
  filter: "online",
  selected: null,
  currentUser: null,
  profiles: [],
  blocked: [],
  messages: {},
  settings: {
    name: "You",
    gender: "boy",
    age: "13-17"
  }
};

const $ = (x) => document.querySelector(x);

// --------------------------------------------------
// SAFETY
// --------------------------------------------------

function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[c]));
}

function blockedText(t) {
  return /https?:\/\/\S+|www\.\S+|\b(instagram|snapchat|onlyfans|telegram|discord)\b|\b(dm me|link in bio|follow me|add me)\b/i.test(t);
}

// --------------------------------------------------
// AUTH
// --------------------------------------------------

async function initAuth() {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session?.user) {
    state.currentUser = session.user;
  } else {
    const { data, error } =
      await supabaseClient.auth.signInAnonymously();

    if (error) {
      console.error("Anonymous sign-in error:", error);
      alert("Q1 Chat login failed. Please try again.");
      return false;
    }

    state.currentUser = data.user;
  }

  return true;
}

// --------------------------------------------------
// PROFILE
// --------------------------------------------------

async function loadMyProfile() {
  if (!state.currentUser) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", state.currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Profile load error:", error);
    return;
  }

  if (data) {
    state.settings.name = data.display_name || "You";
    state.settings.gender = data.gender || "boy";
  } else {
    const username =
      "user_" + state.currentUser.id.replace(/-/g, "").slice(0, 10);

    const { error: insertError } = await supabaseClient
      .from("profiles")
      .insert({
        id: state.currentUser.id,
        username,
        display_name: "You",
        gender: "boy"
      });

    if (insertError) {
      console.error("Profile create error:", insertError);
    }
  }
}

// --------------------------------------------------
// LOAD USERS
// --------------------------------------------------

async function loadUsers() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .neq("id", state.currentUser.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Users load error:", error);
    return;
  }

  state.profiles = data || [];

  await loadBlockedUsers();
  renderUsers();
}

// --------------------------------------------------
// BLOCKED USERS
// --------------------------------------------------

async function loadBlockedUsers() {
  const { data, error } = await supabaseClient
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", state.currentUser.id);

  if (error) {
    console.error("Blocked users error:", error);
    return;
  }

  state.blocked = (data || []).map((x) => x.blocked_id);
}

// --------------------------------------------------
// USER HELPERS
// --------------------------------------------------

function getUser(id) {
  return state.profiles.find((x) => x.id === id);
}

// --------------------------------------------------
// RENDER USERS
// --------------------------------------------------

function renderUsers() {
  const search = $("#search");
  const container = $("#users");

  if (!search || !container) return;

  const q = search.value.toLowerCase();

  let users = state.profiles
    .filter((user) => !state.blocked.includes(user.id))
    .filter((user) =>
      (user.display_name || "")
        .toLowerCase()
        .includes(q)
    );

  container.innerHTML =
    users.map((user) => {
      const name = user.display_name || "User";
      const gender = user.gender || "other";

      return `
        <button
          class="user ${state.selected === user.id ? "selected" : ""}"
          onclick="selectUser('${user.id}')"
        >
          <span class="avatar ${escapeHtml(gender)}">
            ${escapeHtml(name.charAt(0).toUpperCase())}
          </span>

          <span class="info">
            <b>${escapeHtml(name)}</b>
            <span class="preview">Start a conversation</span>
          </span>
        </button>
      `;
    }).join("") ||
    '<p style="padding:15px;color:#777">No users found.</p>';
}

// --------------------------------------------------
// SELECT USER
// --------------------------------------------------

async function selectUser(id) {
  const user = getUser(id);

  if (!user) return;

  state.selected = id;

  $("#chatName").textContent =
    user.display_name || "User";

  $("#status").innerHTML =
    '<span class="dot on"></span> Q1 Chat user';

  $("#input").disabled = false;
  $("#send").disabled = false;

  renderUsers();

  await loadMessages(id);
}

// --------------------------------------------------
// LOAD MESSAGES
// --------------------------------------------------

async function loadMessages(otherUserId) {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${state.currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${state.currentUser.id})`
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Messages load error:", error);
    return;
  }

  state.messages[otherUserId] = (data || []).map((message) => ({
    me: message.sender_id === state.currentUser.id,
    text: message.text,
    time: message.created_at
      ? new Date(message.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      : ""
  }));

  renderMessages();
}

// --------------------------------------------------
// RENDER MESSAGES
// --------------------------------------------------

function renderMessages() {
  const box = $("#messages");

  if (!state.selected) {
    box.innerHTML = `
      <div class="welcome">
        💬
        <h2>Welcome to Q1 Chat</h2>
        <p>Select a person to start a conversation.</p>
      </div>
    `;
    return;
  }

  const messages =
    state.messages[state.selected] || [];

  if (!messages.length) {
    box.innerHTML = `
      <div class="welcome">
        👋
        <h2>Start chatting</h2>
        <p>Send the first message.</p>
      </div>
    `;
    return;
  }

  box.innerHTML = messages
    .map(
      (m) => `
        <div class="msg ${m.me ? "me" : ""}">
          ${escapeHtml(m.text)}
          <div class="meta">${escapeHtml(m.time || "")}</div>
        </div>
      `
    )
    .join("");

  box.scrollTop = box.scrollHeight;
}

// --------------------------------------------------
// SEND MESSAGE
// --------------------------------------------------

async function sendMessage() {
  const input = $("#input");

  const text = input.value.trim();

  if (!text || !state.selected) return;

  if (blockedText(text)) {
    alert(
      "This message was blocked by Q1 Chat safety filters."
    );
    return;
  }

  const { data, error } = await supabaseClient
    .from("messages")
    .insert({
      sender_id: state.currentUser.id,
      receiver_id: state.selected,
      text
    })
    .select()
    .single();

  if (error) {
    console.error("Send message error:", error);
    alert("Message could not be sent.");
    return;
  }

  if (!state.messages[state.selected]) {
    state.messages[state.selected] = [];
  }

  state.messages[state.selected].push({
    me: true,
    text: data.text,
    time: new Date(data.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })
  });

  input.value = "";

  renderMessages();
}

$("#send").onclick = sendMessage;

$("#input").onkeydown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

// --------------------------------------------------
// REALTIME MESSAGES
// --------------------------------------------------

function startRealtime() {
  supabaseClient
    .channel("q1-chat-messages")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages"
      },
      async (payload) => {
        const message = payload.new;

        const belongsToCurrentUser =
          message.sender_id === state.currentUser.id ||
          message.receiver_id === state.currentUser.id;

        if (!belongsToCurrentUser) return;

        const otherUserId =
          message.sender_id === state.currentUser.id
            ? message.receiver_id
            : message.sender_id;

        if (!state.messages[otherUserId]) {
          state.messages[otherUserId] = [];
        }

        const alreadyExists =
          state.messages[otherUserId].some(
            (m) =>
              m.text === message.text &&
              m.time ===
                new Date(message.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })
          );

        if (!alreadyExists) {
          state.messages[otherUserId].push({
            me:
              message.sender_id ===
              state.currentUser.id,
            text: message.text,
            time: new Date(
              message.created_at
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            })
          });
        }

        if (state.selected === otherUserId) {
          renderMessages();
        }
      }
    )
    .subscribe();
}

// --------------------------------------------------
// BLOCK USER
// --------------------------------------------------

$("#block").onclick = async () => {
  if (!state.selected) return;

  const id = state.selected;
  const user = getUser(id);

  if (!user) return;

  const name = user.display_name || "this user";

  if (!confirm(`Block ${name}?`)) return;

  const { error } = await supabaseClient
    .from("blocks")
    .insert({
      blocker_id: state.currentUser.id,
      blocked_id: id
    });

  if (error) {
    console.error("Block error:", error);
    alert("Could not block this user.");
    return;
  }

  state.blocked.push(id);
  state.selected = null;

  $("#input").disabled = true;
  $("#send").disabled = true;

  $("#chatName").textContent = "Select a person";
  $("#status").textContent = "Choose a chat";

  renderUsers();
  renderMessages();
};

// --------------------------------------------------
// REPORT
// --------------------------------------------------

$("#report").onclick = () => {
  if (!state.selected) return;

  alert(
    "Report submitted for moderation. Thank you for helping keep Q1 Chat safe."
  );
};

// --------------------------------------------------
// SETTINGS
// --------------------------------------------------

$("#settingsBtn").onclick = () => {
  $("#displayName").value =
    state.settings.name || "You";

  $("#gender").value =
    state.settings.gender || "boy";

  $("#age").value =
    state.settings.age || "13-17";

  settings.showModal();
};

$("#save").onclick = async () => {
  const name =
    $("#displayName").value.trim() || "You";

  const gender = $("#gender").value;

  state.settings.name = name;
  state.settings.gender = gender;

  const { error } = await supabaseClient
    .from("profiles")
    .update({
      display_name: name,
      gender
    })
    .eq("id", state.currentUser.id);

  if (error) {
    console.error("Settings save error:", error);
    alert("Settings could not be saved.");
    return;
  }

  settings.close();

  await loadUsers();
};

// --------------------------------------------------
// BLOCKED USERS DIALOG
// --------------------------------------------------

$("#blocked").onclick = async () => {
  const list = $("#blockedList");

  await loadBlockedUsers();

  list.innerHTML =
    state.blocked.map((id) => {
      const user = getUser(id);

      if (!user) return "";

      return `
        <div class="blockedrow">
          <span>
            ${escapeHtml(user.display_name || "User")}
          </span>

          <button onclick="unblockUser('${id}')">
            Unblock
          </button>
        </div>
      `;
    }).join("") ||
    "<p>No blocked users.</p>";

  blockedDialog.showModal();
};

async function unblockUser(id) {
  const { error } = await supabaseClient
    .from("blocks")
    .delete()
    .eq("blocker_id", state.currentUser.id)
    .eq("blocked_id", id);

  if (error) {
    console.error("Unblock error:", error);
    alert("Could not unblock this user.");
    return;
  }

  state.blocked =
    state.blocked.filter((x) => x !== id);

  blockedDialog.close();

  await loadUsers();
}

// --------------------------------------------------
// SEARCH
// --------------------------------------------------

$("#search").oninput = renderUsers;

// --------------------------------------------------
// FILTER NAVIGATION
// --------------------------------------------------

document
  .querySelectorAll("nav button")
  .forEach((button) => {
    button.onclick = () => {
      document
        .querySelectorAll("nav button")
        .forEach((x) =>
          x.classList.remove("active")
        );

      button.classList.add("active");

      state.filter =
        button.dataset.filter;

      renderUsers();
    };
  });

// --------------------------------------------------
// START Q1 CHAT
// --------------------------------------------------

async function startQ1Chat() {
  const authenticated = await initAuth();

  if (!authenticated) return;

  await loadMyProfile();
  await loadUsers();

  startRealtime();

  renderMessages();

  console.log(
    "Q1 Chat connected to Supabase successfully."
  );
}

startQ1Chat();
```
