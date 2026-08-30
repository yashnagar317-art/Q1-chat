```javascript
/* =========================================================
   Q1 CHAT — APP.JS
   Supabase Auth + Profile Sync + Local Chat + Safety
   ========================================================= */


/* =========================
   SUPABASE CONFIG
   ========================= */

const SUPABASE_URL =
  "https://ubkvpmwpvmozhbwlxhmx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_n8GM1QZs-3hM90160r--2A_sGrkvxtY";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


/* =========================
   DEMO USERS
   ========================= */

const users = [
  {
    id: "rahul",
    name: "Rahul",
    gender: "boy",
    online: true,
    friends: true,
    unread: 2,
    last: "Hey! How are you?"
  },
  {
    id: "priya",
    name: "Priya",
    gender: "girl",
    online: true,
    friends: true,
    unread: 0,
    last: "See you later 👋"
  },
  {
    id: "aman",
    name: "Aman",
    gender: "boy",
    online: false,
    friends: false,
    unread: 1,
    last: "That project looks cool."
  },
  {
    id: "neha",
    name: "Neha",
    gender: "girl",
    online: true,
    friends: true,
    unread: 0,
    last: "Thanks!"
  }
];


/* =========================
   STATE
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
    '{"name":"You","gender":"boy","age":"13-17"}'
  ),

  currentUser: null
};


/* =========================
   SHORTCUTS
   ========================= */

const $ = selector =>
  document.querySelector(selector);

const getUser = id =>
  users.find(user => user.id === id);


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

    if (sessionData?.session?.user) {
      state.currentUser =
        sessionData.session.user;

      return state.currentUser;
    }


    /* Anonymous login */

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .signInAnonymously();

    if (error) {
      console.error(
        "Anonymous login failed:",
        error.message
      );

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
   CREATE / UPDATE PROFILE
   ========================= */

async function syncProfile() {

  if (!state.currentUser) {
    return;
  }

  try {

    const profile = {
      id: state.currentUser.id,
      display_name: state.settings.name,
      gender: state.settings.gender,
      age_group: state.settings.age
    };

    const {
      error
    } = await supabaseClient
      .from("profiles")
      .upsert(
        profile,
        {
          onConflict: "id"
        }
      );

    if (error) {

      console.warn(
        "Profile sync failed:",
        error.message
      );

      return;
    }

    console.log(
      "Q1 Chat profile synced."
    );

  } catch (error) {

    console.warn(
      "Profile sync error:",
      error
    );
  }
}


/* =========================
   LOAD PROFILE
   ========================= */

async function loadProfile() {

  if (!state.currentUser) {
    return;
  }

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("profiles")
      .select(
        "id,display_name,gender,age_group"
      )
      .eq(
        "id",
        state.currentUser.id
      )
      .maybeSingle();

    if (error) {

      console.warn(
        "Profile load failed:",
        error.message
      );

      return;
    }

    if (!data) {

      await syncProfile();

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

    if (data.age_group) {
      state.settings.age =
        data.age_group;
    }

    saveLocal();

  } catch (error) {

    console.warn(
      "Profile load error:",
      error
    );
  }
}


/* =========================
   RENDER USERS
   ========================= */

function renderUsers() {

  const search =
    $("#search");

  const usersBox =
    $("#users");

  if (!search || !usersBox) {
    return;
  }

  const query =
    search.value
      .trim()
      .toLowerCase();

  let list =
    users
      .filter(user =>
        !state.blocked.includes(
          user.id
        )
      )
      .filter(user =>
        user.name
          .toLowerCase()
          .includes(query)
      );


  if (state.filter === "online") {

    list =
      list.filter(
        user => user.online
      );

  } else if (
    state.filter === "unread"
  ) {

    list =
      list.filter(
        user => user.unread > 0
      );

  } else if (
    state.filter === "friends"
  ) {

    list =
      list.filter(
        user => user.friends
      );

  } else if (
    state.filter === "recent"
  ) {

    list =
      list.filter(
        user => Boolean(user.last)
      );
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
          class="avatar ${user.gender}"
        >
          ${escapeHtml(
            user.name.charAt(0)
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
            ${escapeHtml(
              user.last || ""
            )}
          </span>

        </span>

        ${
          user.unread
            ? `<small>${user.unread}</small>`
            : ""
        }

      </button>

    `).join("");


  if (!list.length) {

    usersBox.innerHTML =
      '<p style="padding:15px;color:#777">No users found.</p>';
  }
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

  if (
    state.blocked.includes(id)
  ) {
    return;
  }

  state.selected =
    id;

  user.unread =
    0;


  if (!state.messages[id]) {

    state.messages[id] = [
      {
        me: false,
        text:
          `Hi! I'm ${user.name}. 👋`,
        time: ""
      }
    ];
  }


  saveLocal();


  $("#chatName").textContent =
    user.name;

  $("#status").innerHTML = `
    <span
      class="dot ${
        user.online ? "on" : ""
      }"
    ></span>
    ${
      user.online
        ? "Online"
        : "Offline"
    }
  `;


  $("#input").disabled =
    false;

  $("#send").disabled =
    false;


  renderUsers();
  renderMessages();


  /*
    Real Supabase message loading
    will be enabled after the
    messages table UUID structure
    is confirmed.
  */

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
          Select a person to start
          a conversation.
        </p>

      </div>

    `;

    return;
  }


  const list =
    state.messages[
      state.selected
    ] || [];


  box.innerHTML =
    list.map(message => `

      <div
        class="msg ${
          message.me ? "me" : ""
        }"
      >

        ${escapeHtml(
          message.text
        )}

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

  if (!input) {
    return;
  }

  const text =
    input.value.trim();


  if (
    !text ||
    !state.selected
  ) {
    return;
  }


  if (
    blockedText(text)
  ) {

    alert(
      "This message was blocked by Q1 Chat safety filters."
    );

    return;
  }


  const time =
    new Date()
      .toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );


  if (
    !state.messages[
      state.selected
    ]
  ) {

    state.messages[
      state.selected
    ] = [];
  }


  state.messages[
    state.selected
  ].push({

    me: true,

    text: text,

    time: time

  });


  input.value = "";

  saveLocal();

  renderMessages();


  /*
    Do not insert into Supabase
    yet because demo user IDs are
    not Auth UUIDs.
  */

}


/* =========================
   SAFETY FILTER
   ========================= */

function blockedText(text) {

  return (

    /https?:\/\/\S+/i
      .test(text) ||

    /www\.\S+/i
      .test(text) ||

    /\b(
      instagram|
      snapchat|
      onlyfans|
      telegram|
      discord
    )\b/ix
      .test(text) ||

    /\b(
      dm me|
      link in bio|
      follow me|
      add me
    )\b/ix
      .test(text)

  );
}


/* =========================
   ESCAPE HTML
   ========================= */

function escapeHtml(value) {

  return String(value)
    .replace(
      /[&<>'"]/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      })[character]
    );
}


/* =========================
   SEND BUTTON
   ========================= */

$("#send").onclick =
  sendMessage;


/* =========================
   ENTER TO SEND
   ========================= */

$("#input").onkeydown =
  event => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();
    }
  };


/* =========================
   NAVIGATION
   ========================= */

document
  .querySelectorAll(
    "nav button"
  )
  .forEach(button => {

    button.onclick = () => {

      document
        .querySelectorAll(
          "nav button"
        )
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
   SETTINGS
   ========================= */

$("#settingsBtn").onclick =
  () => {

    $("#displayName").value =
      state.settings.name;

    $("#gender").value =
      state.settings.gender;

    $("#age").value =
      state.settings.age;

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
          .trim() || "You",

      gender:
        $("#gender").value,

      age:
        $("#age").value
    };


    saveLocal();

    await syncProfile();

    $("#settings").close();
  };


/* =========================
   BLOCKED USERS
   ========================= */

$("#blocked").onclick =
  () => {

    const list =
      $("#blockedList");

    list.innerHTML =
      state.blocked
        .map(id => {

          const user =
            getUser(id);

          if (!user) {
            return "";
          }

          return `

            <div class="blockedrow">

              <span>
                ${escapeHtml(
                  user.name
                )}
              </span>

              <button
                type="button"
                onclick="unblock('${id}')"
              >
                Unblock
              </button>

            </div>

          `;

        })
        .join("");


    if (!list.innerHTML) {

      list.innerHTML =
        "<p>No blocked users.</p>";
    }


    $("#blockedDialog")
      .showModal();
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
   BLOCK
   ========================= */

$("#block").onclick =
  () => {

    if (!state.selected) {
      return;
    }

    const user =
      getUser(
        state.selected
      );

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


      $("#chatName")
        .textContent =
        "Select a person";

      $("#status")
        .textContent =
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
   AUTH STATE
   ========================= */

supabaseClient.auth
  .onAuthStateChange(
    (_event, session) => {

      if (session?.user) {

        state.currentUser =
          session.user;

        console.log(
          "Q1 Chat Auth:",
          session.user.id
        );
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


  const user =
    await ensureUser();


  if (!user) {

    console.warn(
      "Q1 Chat is running in local mode."
    );

    return;
  }


  console.log(
    "Q1 Chat authenticated:",
    user.id
  );


  await loadProfile();

  saveLocal();
}


/* =========================
   START
   ========================= */

initQ1Chat();
```
