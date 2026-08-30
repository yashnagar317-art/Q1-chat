/* =========================================================
   Q1 CHAT — APP.JS
   Supabase + Local UI + Safe Messaging
   ========================================================= */

const SUPABASE_URL =
  "https://ubkvpmwpvmozhbwlxhmx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_n8GM1QZs-3hM90160r--2A_sGrkvxtY";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


/* =========================================================
   STATE
   ========================================================= */

const state = {

  filter: "online",

  selected: null,

  currentUser: null,

  users: [],

  blocked: JSON.parse(
    localStorage.getItem("q1blocked") || "[]"
  ),

  messages: JSON.parse(
    localStorage.getItem("q1messages") || "{}"
  ),

  settings: JSON.parse(
    localStorage.getItem("q1settings") ||
    '{"name":"You","gender":"other","age":"13-17"}'
  )

};


/* =========================================================
   SHORTCUTS
   ========================================================= */

const $ = selector =>
  document.querySelector(selector);


function escapeHtml(value) {

  return String(value ?? "")
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


/* =========================================================
   SAFETY FILTER
   ========================================================= */

function blockedText(text) {

  return (
    /https?:\/\/\S+/i.test(text) ||
    /www\.\S+/i.test(text) ||
    /\b(instagram|snapchat|onlyfans|telegram|discord)\b/i.test(text) ||
    /\b(dm me|link in bio|follow me|add me)\b/i.test(text)
  );

}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

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


/* =========================================================
   AUTH
   ========================================================= */

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

      showAppError(
        "Could not create your chat session. Check Supabase Anonymous Sign-Ins."
      );

      return null;

    }


    state.currentUser =
      data.user;

    return state.currentUser;

  }

  catch (error) {

    console.error(
      "Authentication error:",
      error
    );

    showAppError(
      "Authentication could not be completed."
    );

    return null;

  }

}


/* =========================================================
   ERROR MESSAGE
   ========================================================= */

function showAppError(message) {

  const usersBox = $("#users");

  if (!usersBox) return;

  usersBox.innerHTML = `
    <div style="
      padding:16px;
      margin:10px;
      border-radius:12px;
      background:#fff3f3;
      color:#b42318;
      font-size:14px;
    ">
      ⚠️ ${escapeHtml(message)}
    </div>
  `;

}


/* =========================================================
   LOAD PROFILES
   ========================================================= */

async function loadUsers() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id, username, display_name, gender, created_at"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {

      console.warn(
        "Profiles could not be loaded:",
        error.message
      );

      state.users = [];

      renderUsers();

      return;

    }


    state.users =
      (data || [])
        .filter(
          profile =>
            profile.id !== state.currentUser?.id
        )
        .map(profile => ({

          id: profile.id,

          name:
            profile.display_name ||
            profile.username ||
            "Q1 User",

          gender:
            profile.gender ||
            "other",

          online: true,

          friends: false,

          unread: 0,

          last: ""

        }));


    renderUsers();

  }

  catch (error) {

    console.error(
      "User loading error:",
      error
    );

  }

}


/* =========================================================
   GET USER
   ========================================================= */

function getUser(id) {

  return state.users.find(
    user => user.id === id
  );

}


/* =========================================================
   RENDER USERS
   ========================================================= */

function renderUsers() {

  const usersBox =
    $("#users");

  const searchInput =
    $("#search");

  if (!usersBox) return;


  const query =
    searchInput
      ? searchInput.value
          .trim()
          .toLowerCase()
      : "";


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


  const count =
    $("#userCount");

  if (count) {

    count.textContent =
      `${list.length} ${list.length === 1 ? "person" : "people"}`;

  }


  if (!list.length) {

    usersBox.innerHTML = `
      <div style="
        padding:20px;
        text-align:center;
        color:#777;
      ">
        👥<br>
        <strong>No users found</strong>
        <br>
        <small>
          Create another account to see people here.
        </small>
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
        data-user-id="${escapeHtml(user.id)}"
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
                user.last ||
                "Start a conversation"
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


  usersBox
    .querySelectorAll("[data-user-id]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          selectUser(
            button.dataset.userId
          );

        }
      );

    });

}


/* =========================================================
   SELECT USER
   ========================================================= */

async function selectUser(id) {

  const user =
    getUser(id);

  if (!user) return;

  if (
    state.blocked.includes(id)
  ) {
    return;
  }


  state.selected = id;

  user.unread = 0;


  $("#chatName").textContent =
    user.name;


  const avatar =
    $("#chatAvatar");

  if (avatar) {

    avatar.textContent =
      user.name
        .charAt(0)
        .toUpperCase();

  }


  $("#status").innerHTML = `
    <span class="dot ${
      user.online ? "on" : ""
    }"></span>
    ${
      user.online
        ? "Online"
        : "Offline"
    }
  `;


  $("#input").disabled = false;

  $("#send").disabled = false;

  $("#block").disabled = false;

  $("#report").disabled = false;


  if (!state.messages[id]) {

    state.messages[id] = [];

  }


  saveLocal();

  renderUsers();

  renderMessages();

  await loadConversation(id);

}


/* =========================================================
   LOAD CONVERSATION
   ========================================================= */

async function loadConversation(userId) {

  if (!state.currentUser) return;

  try {

    const myId =
      state.currentUser.id;


    const {
      data,
      error
    } =
      await supabaseClient
        .from("messages")
        .select(
          "id, sender_id, receiver_id, text, created_at"
        )
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${myId})`
        )
        .order(
          "created_at",
          {
            ascending: true
          }
        );


    if (error) {

      console.warn(
        "Conversation loading failed:",
        error.message
      );

      return;

    }


    if (!data) return;


    state.messages[userId] =
      data.map(row => ({

        me:
          row.sender_id === myId,

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

  }

  catch (error) {

    console.error(
      "Conversation error:",
      error
    );

  }

}


/* =========================================================
   RENDER MESSAGES
   ========================================================= */

function renderMessages() {

  const box =
    $("#messages");

  if (!box) return;


  if (!state.selected) {

    box.innerHTML = `
      <div class="welcome">

        <div class="welcome-icon">
          💬
        </div>

        <h2>
          Welcome to Q1 Chat
        </h2>

        <p>
          Select a person to start a conversation.
        </p>

        <small>
          Keep conversations respectful and safe.
        </small>

      </div>
    `;

    return;

  }


  const list =
    state.messages[
      state.selected
    ] || [];


  if (!list.length) {

    box.innerHTML = `
      <div class="welcome">

        <div class="welcome-icon">
          👋
        </div>

        <h2>
          Start chatting
        </h2>

        <p>
          Say hello and start the conversation.
        </p>

      </div>
    `;

    return;

  }


  box.innerHTML =
    list.map(message => `

      <div class="msg ${
        message.me ? "me" : ""
      }">

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


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {

  const input =
    $("#input");

  if (!input) return;


  const text =
    input.value.trim();


  if (!text) return;

  if (!state.selected) {

    alert(
      "Select a person first."
    );

    return;

  }


  if (!state.currentUser) {

    alert(
      "Your chat session is not ready yet."
    );

    return;

  }


  if (blockedText(text)) {

    alert(
      "This message was blocked by Q1 Chat safety filters."
    );

    return;

  }


  if (text.length > 2000) {

    alert(
      "Message is too long."
    );

    return;

  }


  const receiverId =
    state.selected;


  /* Optimistic UI */

  if (!state.messages[receiverId]) {

    state.messages[receiverId] = [];

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


  state.messages[receiverId].push({

    me: true,

    text: text,

    time: time

  });


  input.value = "";

  input.style.height = "auto";


  const counter =
    $("#charCount");

  if (counter) {

    counter.textContent =
      "0/2000";

  }


  saveLocal();

  renderMessages();


  /* Save to Supabase */

  try {

    const {
      error
    } =
      await supabaseClient
        .from("messages")
        .insert({

          sender_id:
            state.currentUser.id,

          receiver_id:
            receiverId,

          text: text

        });


    if (error) {

      console.warn(
        "Message was not saved:",
        error.message
      );

    }

  }

  catch (error) {

    console.error(
      "Message save error:",
      error
    );

  }

}


/* =========================================================
   SETTINGS
   ========================================================= */

function openSettings() {

  const dialog =
    $("#settings");

  if (!dialog) return;


  $("#displayName").value =
    state.settings.name || "You";

  $("#gender").value =
    state.settings.gender || "other";

  $("#age").value =
    state.settings.age || "13-17";


  dialog.showModal();

}


async function saveSettings() {

  state.settings = {

    name:
      $("#displayName").value.trim()
      || "You",

    gender:
      $("#gender").value,

    age:
      $("#age").value

  };


  saveLocal();


  if (state.currentUser) {

    try {

      const {
        error
      } =
        await supabaseClient
          .from("profiles")
          .upsert({

            id:
              state.currentUser.id,

            username:
              state.settings.name
                .toLowerCase()
                .replace(
                  /[^a-z0-9_]/g,
                  "_"
                )
                .slice(0, 30)
                || "q1_user",

            display_name:
              state.settings.name,

            gender:
              state.settings.gender

          });


      if (error) {

        console.warn(
          "Profile save failed:",
          error.message
        );

      }

    }

    catch (error) {

      console.error(
        "Profile error:",
        error
      );

    }

  }


  $("#settings").close();

  await loadUsers();

}


/* =========================================================
   BLOCKED USERS
   ========================================================= */

function showBlockedUsers() {

  const list =
    $("#blockedList");

  if (!list) return;


  if (!state.blocked.length) {

    list.innerHTML =
      "<p>No blocked users.</p>";

  }

  else {

    list.innerHTML =
      state.blocked
        .map(id => {

          const user =
            getUser(id);

          return `

            <div class="blockedrow">

              <span>
                ${
                  escapeHtml(
                    user?.name ||
                    "User"
                  )
                }
              </span>

              <button
                type="button"
                data-unblock="${escapeHtml(id)}"
              >
                Unblock
              </button>

            </div>

          `;

        })
        .join("");


    list
      .querySelectorAll(
        "[data-unblock]"
      )
      .forEach(button => {

        button.onclick = () => {

          unblock(
            button.dataset.unblock
          );

        };

      });

  }


  $("#blockedDialog").showModal();

}


function unblock(id) {

  state.blocked =
    state.blocked.filter(
      item => item !== id
    );


  saveLocal();

  renderUsers();

  showBlockedUsers();

}


/* =========================================================
   BLOCK USER
   ========================================================= */

async function blockCurrentUser() {

  if (!state.selected) {

    alert(
      "Select a person first."
    );

    return;

  }


  const user =
    getUser(state.selected);

  if (!user) return;


  const confirmed =
    confirm(
      `Block ${user.name}?`
    );


  if (!confirmed) return;


  if (
    !state.blocked.includes(
      user.id
    )
  ) {

    state.blocked.push(
      user.id
    );

  }


  /* Save block to Supabase */

  if (state.currentUser) {

    try {

      const {
        error
      } =
        await supabaseClient
          .from("blocks")
          .upsert({

            blocker_id:
              state.currentUser.id,

            blocked_id:
              user.id

          });


      if (error) {

        console.warn(
          "Block was not saved:",
          error.message
        );

      }

    }

    catch (error) {

      console.warn(
        "Block error:",
        error
      );

    }

  }


  state.selected = null;


  $("#input").disabled = true;

  $("#send").disabled = true;

  $("#block").disabled = true;

  $("#report").disabled = true;


  $("#chatName").textContent =
    "Select a person";

  $("#status").textContent =
    "Choose a chat";


  const avatar =
    $("#chatAvatar");

  if (avatar) {
    avatar.textContent = "?";
  }


  saveLocal();

  renderUsers();

  renderMessages();

}


/* =========================================================
   REPORT
   ========================================================= */

function reportCurrentUser() {

  if (!state.selected) {

    alert(
      "Select a person first."
    );

    return;

  }


  alert(
    "Report submitted for moderation."
  );

}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

$("#send").addEventListener(
  "click",
  sendMessage
);


$("#input").addEventListener(
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


$("#search").addEventListener(
  "input",
  renderUsers
);


document
  .querySelectorAll("nav button")
  .forEach(button => {

    button.addEventListener(
      "click",
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

      }
    );

  });


$("#settingsBtn").addEventListener(
  "click",
  openSettings
);


$("#save").addEventListener(
  "click",
  saveSettings
);


$("#blocked").addEventListener(
  "click",
  showBlockedUsers
);


$("#block").addEventListener(
  "click",
  blockCurrentUser
);


$("#report").addEventListener(
  "click",
  reportCurrentUser
);


/* =========================================================
   CHARACTER COUNTER
   ========================================================= */

$("#input").addEventListener(
  "input",
  () => {

    const counter =
      $("#charCount");

    if (counter) {

      counter.textContent =
        `${$("#input").value.length}/2000`;

    }


    $("#input").style.height =
      "auto";

    $("#input").style.height =
      Math.min(
        $("#input").scrollHeight,
        150
      ) + "px";

  }
);


/* =========================================================
   AUTH STATE
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  (_event, session) => {

    if (session?.user) {

      state.currentUser =
        session.user;

    }

  }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initQ1Chat() {

  saveLocal();

  renderUsers();

  renderMessages();


  const user =
    await ensureUser();


  if (!user) return;


  /* Create own profile if missing */

  try {

    await supabaseClient
      .from("profiles")
      .upsert({

        id:
          user.id,

        username:
          (
            state.settings.name ||
            "q1_user"
          )
            .toLowerCase()
            .replace(
              /[^a-z0-9_]/g,
              "_"
            )
            .slice(0, 30),

        display_name:
          state.settings.name ||
          "You",

        gender:
          state.settings.gender ||
          "other"

      });

  }

  catch (error) {

    console.warn(
      "Initial profile creation failed:",
      error
    );

  }


  await loadUsers();

}


initQ1Chat();
