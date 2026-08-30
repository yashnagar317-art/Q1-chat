/* =========================================================
   Q1 CHAT — APP.JS
   Supabase Auth + Profiles + Messages + Safety
   ========================================================= */


/* =========================
   SUPABASE CONFIG
   ========================= */

const SUPABASE_URL =
  "https://ubkvpmwpvmozhbwlxhmx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_n8GM1QZs-3hM90160r--2A_sGrkvxtY";


/* =========================
   SUPABASE CLIENT
   ========================= */

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


/* =========================
   APP STATE
   ========================= */

const state = {
  filter: "online",
  selected: null,

  blocked: JSON.parse(
    localStorage.getItem("q1blocked") || "[]"
  ),

  messages: JSON.parse(
    localStorage.getItem("q1messages") || "{}"
  ),

  settings: JSON.parse(
    localStorage.getItem("q1settings") ||
    '{"name":"You","gender":"other","age":"13-17"}'
  ),

  currentUser: null,
  users: []
};


/* =========================
   SHORTCUT
   ========================= */

const $ = selector =>
  document.querySelector(selector);


/* =========================
   HTML ESCAPE
   ========================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/[&<>'"]/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[character]);
}


/* =========================
   UUID CHECK
   ========================= */

function isUUID(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(String(value || ""));
}


/* =========================
   LOCAL STORAGE
   ========================= */

function saveLocal() {
  localStorage.setItem(
    "q1blocked",
    JSON.stringify(state.blocked)
  );

  localStorage.setItem(
    "q1messages",
    JSON.stringify(state.messages)
  );

  localStorage.setItem(
    "q1settings",
    JSON.stringify(state.settings)
  );
}


/* =========================
   SAFETY FILTER
   ========================= */

function blockedText(text) {
  return (
    /https?:\/\/\S+/i.test(text) ||
    /www\.\S+/i.test(text) ||
    /\b(instagram|snapchat|onlyfans|telegram|discord)\b/i.test(text) ||
    /\b(dm me|link in bio|follow me|add me)\b/i.test(text)
  );
}


/* =========================
   AUTH
   ========================= */

async function ensureUser() {
  try {

    const {
      data: sessionData,
      error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError) {
      console.warn(
        "Session error:",
        sessionError.message
      );
    }


    /* Existing session */

    if (sessionData?.session?.user) {

      state.currentUser =
        sessionData.session.user;

      return state.currentUser;
    }


    /* Create anonymous user */

    const {
      data,
      error
    } =
      await supabaseClient.auth.signInAnonymously();

    if (error) {

      console.error(
        "Anonymous sign-in failed:",
        error.message
      );

      showAuthError(error.message);

      return null;
    }


    state.currentUser =
      data.user;

    return data.user;

  } catch (error) {

    console.error(
      "Authentication error:",
      error
    );

    return null;
  }
}


/* =========================
   AUTH ERROR
   ========================= */

function showAuthError(message) {

  console.warn(
    "Q1 Chat authentication:",
    message
  );

}


/* =========================
   CREATE / UPDATE PROFILE
   ========================= */

async function saveProfileToSupabase() {

  if (!state.currentUser) {
    return false;
  }

  try {

    /*
      IMPORTANT:
      Your profiles table currently has:

      id
      username
      display_name
      gender
      created_at

      There is NO age_group column.
    */

    const username =
      "user_" +
      state.currentUser.id
        .replace(/-/g, "")
        .slice(0, 16);


    const profile = {

      id:
        state.currentUser.id,

      username:
        username,

      display_name:
        state.settings.name || "You",

      gender:
        state.settings.gender || "other"

    };


    const {
      error
    } =
      await supabaseClient
        .from("profiles")
        .upsert(
          profile,
          {
            onConflict: "id"
          }
        );


    if (error) {

      console.error(
        "Profile save failed:",
        error.message
      );

      return false;
    }


    return true;

  } catch (error) {

    console.error(
      "Profile error:",
      error
    );

    return false;
  }
}


/* =========================
   LOAD OWN PROFILE
   ========================= */

async function loadOwnProfile() {

  if (!state.currentUser) {
    return;
  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,username,display_name,gender,created_at"
        )
        .eq(
          "id",
          state.currentUser.id
        )
        .maybeSingle();


    if (error) {

      console.warn(
        "Own profile load failed:",
        error.message
      );

      return;
    }


    if (!data) {

      await saveProfileToSupabase();

      return;
    }


    if (data.display_name) {

      state.settings.name =
        data.display_name;
    }


    if (data.gender) {

      state.settings.gender =
        data.gender;
    }


    saveLocal();

  } catch (error) {

    console.error(
      "Own profile error:",
      error
    );
  }
}


/* =========================
   LOAD REAL USERS
   ========================= */

async function loadUsersFromSupabase() {

  if (!state.currentUser) {
    return;
  }


  try {

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
          state.currentUser.id
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {

      console.error(
        "Users could not be loaded:",
        error.message
      );

      return;
    }


    state.users =
      (data || [])
        .filter(user =>
          isUUID(user.id)
        )
        .map(user => ({

          id:
            user.id,

          name:
            user.display_name ||
            user.username ||
            "Q1 User",

          gender:
            user.gender || "other",

          /*
            We don't have a real online-status
            table yet, so don't fake it.
          */

          online:
            false,

          friends:
            false,

          unread:
            0,

          last:
            ""

        }));


    renderUsers();

  } catch (error) {

    console.error(
      "Users loading error:",
      error
    );
  }
}


/* =========================
   GET USER
   ========================= */

function getUser(id) {

  return state.users.find(
    user => user.id === id
  );
}


/* =========================
   RENDER USERS
   ========================= */

function renderUsers() {

  const usersBox =
    $("#users");

  const search =
    $("#search");


  if (!usersBox || !search) {
    return;
  }


  const query =
    search.value
      .trim()
      .toLowerCase();


  let list =
    state.users
      .filter(
        user =>
          !state.blocked.includes(user.id)
      )
      .filter(
        user =>
          user.name
            .toLowerCase()
            .includes(query)
      );


  if (state.filter === "online") {

    list =
      list.filter(
        user => user.online
      );
  }


  if (state.filter === "unread") {

    list =
      list.filter(
        user => user.unread > 0
      );
  }


  if (state.filter === "friends") {

    list =
      list.filter(
        user => user.friends
      );
  }


  if (state.filter === "recent") {

    list =
      list.filter(
        user => user.last
      );
  }


  if (!list.length) {

    usersBox.innerHTML = `
      <div style="
        padding:20px;
        text-align:center;
        color:#777;
      ">
        <div style="font-size:28px;">👥</div>
        <strong>No users yet</strong>
        <p style="margin-top:6px;font-size:13px;">
          Other Q1 Chat users will appear here.
        </p>
      </div>
    `;

    return;
  }


  usersBox.innerHTML =
    list.map(user => `

      <button
        class="user ${
          state.selected === user.id
            ? "selected"
            : ""
        }"
        type="button"
        onclick="selectUser('${user.id}')"
      >

        <span
          class="avatar ${escapeHtml(user.gender)}"
        >
          ${escapeHtml(
            user.name.charAt(0).toUpperCase()
          )}
        </span>


        <span class="info">

          <b>
            ${escapeHtml(user.name)}

            <i
              class="dot ${
                user.online ? "on" : ""
              }"
            ></i>
          </b>


          <span class="preview">
            ${
              escapeHtml(
                user.last || "Start a conversation"
              )
            }
          </span>

        </span>


        ${
          user.unread
            ? `<small>${user.unread}</small>`
            : ""
        }

      </button>

    `).join("");
}


/* =========================
   SELECT USER
   ========================= */

async function selectUser(id) {

  const user =
    getUser(id);


  if (!user) {
    return;
  }


  if (state.blocked.includes(id)) {
    return;
  }


  state.selected =
    id;


  user.unread =
    0;


  if (!state.messages[id]) {
    state.messages[id] = [];
  }


  $("#chatName").textContent =
    user.name;


  $("#status").innerHTML = `
    <span class="dot ${
      user.online ? "on" : ""
    }"></span>

    ${
      user.online
        ? "Online"
        : "Available"
    }
  `;


  $("#input").disabled =
    false;

  $("#send").disabled =
    false;


  renderUsers();
  renderMessages();


  await loadMessagesFromSupabase(id);
}


/* =========================
   LOAD MESSAGES
   ========================= */

async function loadMessagesFromSupabase(userId) {

  if (!state.currentUser) {
    return;
  }


  if (!isUUID(userId)) {

    console.warn(
      "Invalid receiver UUID."
    );

    return;
  }


  try {

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
          `and(sender_id.eq.${state.currentUser.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${state.currentUser.id})`
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );


    if (error) {

      console.error(
        "Messages load failed:",
        error.message
      );

      return;
    }


    state.messages[userId] =
      (data || []).map(row => ({

        me:
          row.sender_id ===
          state.currentUser.id,

        text:
          row.text || "",

        time:
          row.created_at
            ? new Date(
                row.created_at
              ).toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit"
                }
              )
            : ""

      }));


    saveLocal();
    renderMessages();

  } catch (error) {

    console.error(
      "Message loading error:",
      error
    );
  }
}


/* =========================
   RENDER MESSAGES
   ========================= */

function renderMessages() {

  const box =
    $("#messages");


  if (!box) {
    return;
  }


  if (!state.selected) {

    box.innerHTML = `
      <div class="welcome">

        💬

        <h2>
          Welcome to Q1 Chat
        </h2>

        <p>
          Select a person to start a conversation.
        </p>

      </div>
    `;

    return;
  }


  const list =
    state.messages[state.selected] || [];


  if (!list.length) {

    box.innerHTML = `
      <div class="welcome">

        👋

        <h2>
          Start the conversation
        </h2>

        <p>
          Send a friendly message to begin.
        </p>

      </div>
    `;

    return;
  }


  box.innerHTML =
    list.map(message => `

      <div
        class="msg ${
          message.me ? "me" : ""
        }"
      >

        ${escapeHtml(message.text)}

        <div class="meta">
          ${escapeHtml(
            message.time || ""
          )}
        </div>

      </div>

    `).join("");


  box.scrollTop =
    box.scrollHeight;
}


/* =========================
   SEND MESSAGE
   ========================= */

async function sendMessage() {

  const input =
    $("#input");


  if (!input || !state.selected) {
    return;
  }


  const text =
    input.value.trim();


  if (!text) {
    return;
  }


  if (blockedText(text)) {

    alert(
      "This message was blocked by Q1 Chat safety filters."
    );

    return;
  }


  if (!state.currentUser) {

    alert(
      "Please wait for Q1 Chat to connect."
    );

    return;
  }


  if (!isUUID(state.selected)) {

    alert(
      "This user is not connected to a valid Q1 account yet."
    );

    return;
  }


  const now =
    new Date();


  const time =
    now.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );


  /* Optimistic UI */

  if (!state.messages[state.selected]) {
    state.messages[state.selected] = [];
  }


  state.messages[state.selected].push({

    me: true,

    text: text,

    time: time

  });


  input.value =
    "";


  saveLocal();
  renderMessages();


  /* Save to Supabase */

  const {
    error
  } =
    await supabaseClient
      .from("messages")
      .insert({

        sender_id:
          state.currentUser.id,

        receiver_id:
          state.selected,

        /*
          IMPORTANT:
          Your table column is "text",
          NOT "content".
        */

        text:
          text

      });


  if (error) {

    console.error(
      "Message was not saved:",
      error.message
    );


    alert(
      "Message could not be saved. Check your Supabase policies."
    );

  }
}


/* =========================
   SETTINGS
   ========================= */

$("#settingsBtn").onclick =
  () => {

    $("#displayName").value =
      state.settings.name || "You";

    $("#gender").value =
      state.settings.gender || "other";

    $("#age").value =
      state.settings.age || "13-17";


    $("#settings").showModal();
  };


/* =========================
   SAVE SETTINGS
   ========================= */

$("#save").onclick =
  async () => {

    state.settings = {

      name:
        $("#displayName")
          .value
          .trim()
          .slice(0, 40)
          || "You",

      gender:
        $("#gender").value,

      /*
        Age is currently local only
        because your profiles table
        does not contain age_group.
      */

      age:
        $("#age").value

    };


    saveLocal();


    const saved =
      await saveProfileToSupabase();


    if (!saved) {

      alert(
        "Settings saved locally, but Supabase profile could not be updated."
      );

      return;
    }


    $("#settings").close();


    await loadUsersFromSupabase();
  };


/* =========================
   BLOCKED USERS
   ========================= */

$("#blocked").onclick =
  () => {

    const list =
      $("#blockedList");


    const blockedUsers =
      state.blocked
        .map(id =>
          getUser(id)
        )
        .filter(Boolean);


    if (!blockedUsers.length) {

      list.innerHTML =
        "<p>No blocked users.</p>";

    } else {

      list.innerHTML =
        blockedUsers
          .map(user => `

            <div class="blockedrow">

              <span>
                ${escapeHtml(user.name)}
              </span>

              <button
                type="button"
                onclick="unblock('${user.id}')"
              >
                Unblock
              </button>

            </div>

          `)
          .join("");
    }


    $("#blockedDialog").showModal();
  };


/* =========================
   UNBLOCK
   ========================= */

function unblock(id) {

  state.blocked =
    state.blocked.filter(
      item => item !== id
    );


  saveLocal();
  renderUsers();


  const dialog =
    $("#blockedDialog");


  if (dialog.open) {
    dialog.close();
  }
}


/* =========================
   BLOCK USER
   ========================= */

$("#block").onclick =
  () => {

    if (!state.selected) {

      alert(
        "Select a person first."
      );

      return;
    }


    const user =
      getUser(state.selected);


    if (!user) {
      return;
    }


    if (
      confirm(
        `Block ${user.name}?`
      )
    ) {

      if (
        !state.blocked.includes(
          user.id
        )
      ) {

        state.blocked.push(
          user.id
        );
      }


      state.selected =
        null;


      $("#input").disabled =
        true;

      $("#send").disabled =
        true;


      $("#chatName").textContent =
        "Select a person";

      $("#status").textContent =
        "Choose a chat";


      saveLocal();

      renderUsers();
      renderMessages();
    }
  };


/* =========================
   REPORT
   ========================= */

$("#report").onclick =
  () => {

    if (!state.selected) {

      alert(
        "Select a person first."
      );

      return;
    }


    alert(
      "Report submitted for moderation."
    );
  };


/* =========================
   NAVIGATION
   ========================= */

document
  .querySelectorAll("nav button")
  .forEach(button => {

    button.onclick =
      () => {

        document
          .querySelectorAll("nav button")
          .forEach(item =>
            item.classList.remove(
              "active"
            )
          );


        button.classList.add(
          "active"
        );


        state.filter =
          button.dataset.filter;


        renderUsers();
      };
  });


/* =========================
   SEARCH
   ========================= */

$("#search").oninput =
  renderUsers;


/* =========================
   AUTH LISTENER
   ========================= */

supabaseClient.auth.onAuthStateChange(
  (_event, session) => {

    if (session?.user) {

      state.currentUser =
        session.user;
    }

  }
);


/* =========================
   INITIALIZE
   ========================= */

async function initQ1Chat() {

  saveLocal();


  renderUsers();
  renderMessages();


  /*
    1. Get existing session
    2. Otherwise create anonymous user
  */

  const user =
    await ensureUser();


  if (!user) {

    return;
  }


  /*
    Create/load own profile
  */

  await loadOwnProfile();


  /*
    Load other real Q1 users
  */

  await loadUsersFromSupabase();


  /*
    Render again after Supabase data
  */

  renderUsers();
  renderMessages();

}


/* =========================
   START APP
   ========================= */

initQ1Chat();
```
