/* =========================================================
   Q1 CHAT — APP.JS
   Supabase + Anonymous Auth + Profiles + Messages
   Block / Report / Settings / Search / Filters
   ========================================================= */


/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://ubkvpmwpvmozhbwlxhmx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_n8GM1QZs-3hM90160r--2A_sGrkvxtY";


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

let supabaseClient = null;

try {

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {

    throw new Error(
      "Supabase library was not loaded."
    );

  }

  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );

}
catch (error) {

  console.error(
    "Supabase initialization failed:",
    error
  );

}


/* =========================================================
   STATE
   ========================================================= */

const state = {

  filter: "online",

  selected: null,

  currentUser: null,

  users: [],

  blocked: loadJSON(
    "q1blocked",
    []
  ),

  messages: loadJSON(
    "q1messages",
    {}
  ),

  settings: loadJSON(
    "q1settings",
    {
      name: "You",
      gender: "other",
      age: "13-17"
    }
  )

};


/* =========================================================
   HELPERS
   ========================================================= */

function $(selector) {

  return document.querySelector(selector);

}


function loadJSON(key, fallback) {

  try {

    const value =
      localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : fallback;

  }
  catch (error) {

    console.warn(
      `Could not read ${key}:`,
      error
    );

    return fallback;

  }

}


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


function getUser(id) {

  return state.users.find(
    user => user.id === id
  );

}


function getCurrentTime() {

  return new Date()
    .toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

}


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

function saveLocal() {

  try {

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
  catch (error) {

    console.warn(
      "Local storage save failed:",
      error
    );

  }

}


/* =========================================================
   SAFETY FILTER
   ========================================================= */

function blockedText(text) {

  const value =
    String(text || "");

  return (

    /https?:\/\/\S+/i.test(value) ||

    /www\.\S+/i.test(value) ||

    /\b(
      instagram|
      snapchat|
      onlyfans|
      telegram|
      discord
    )\b/ix.test(value) ||

    /\b(
      dm\s+me|
      link\s+in\s+bio|
      follow\s+me|
      add\s+me
    )\b/ix.test(value)

  );

}


/* =========================================================
   APP ERROR
   ========================================================= */

function showAppError(message) {

  const usersBox =
    $("#users");

  if (!usersBox) return;

  usersBox.innerHTML = `

    <div style="
      padding:16px;
      margin:10px;
      border-radius:12px;
      background:#fff3f3;
      color:#b42318;
      font-size:14px;
      line-height:1.5;
    ">

      ⚠️ ${escapeHtml(message)}

    </div>

  `;

}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function ensureUser() {

  if (!supabaseClient) {

    showAppError(
      "Supabase could not be loaded. Check your HTML CDN script."
    );

    return null;

  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {

      console.warn(
        "Session check failed:",
        error.message
      );

    }


    if (data?.session?.user) {

      state.currentUser =
        data.session.user;

      return state.currentUser;

    }


    /*
      Anonymous sign-in.

      Anonymous Sign-Ins must be enabled
      inside Supabase Authentication.
    */

    const {
      data: anonymousData,
      error: anonymousError
    } =
      await supabaseClient.auth
        .signInAnonymously();


    if (anonymousError) {

      console.error(
        "Anonymous sign-in failed:",
        anonymousError
      );

      showAppError(
        "Anonymous sign-in failed. Make sure Anonymous Sign-Ins are enabled in Supabase."
      );

      return null;

    }


    state.currentUser =
      anonymousData?.user || null;


    return state.currentUser;

  }
  catch (error) {

    console.error(
      "Authentication error:",
      error
    );

    showAppError(
      "Could not connect to your Q1 Chat account."
    );

    return null;

  }

}


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

if (supabaseClient) {

  supabaseClient.auth.onAuthStateChange(
    (_event, session) => {

      if (session?.user) {

        state.currentUser =
          session.user;

      }
      else {

        state.currentUser =
          null;

      }

    }
  );

}


/* =========================================================
   CREATE / SAVE PROFILE
   ========================================================= */

async function saveOwnProfile() {

  if (!state.currentUser) {
    return false;
  }


  try {

    const username =
      (
        state.settings.name ||
        "q1_user"
      )
        .toLowerCase()
        .trim()
        .replace(
          /[^a-z0-9_]/g,
          "_"
        )
        .replace(
          /_+/g,
          "_"
        )
        .slice(0, 30)
        || "q1_user";


    const profile = {

      id:
        state.currentUser.id,

      username:
        username,

      display_name:
        state.settings.name ||
        "You",

      gender:
        state.settings.gender ||
        "other"

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

      console.warn(
        "Profile save failed:",
        error.message
      );

      return false;

    }


    return true;

  }
  catch (error) {

    console.error(
      "Profile save error:",
      error
    );

    return false;

  }

}


/* =========================================================
   LOAD USERS / PROFILES
   ========================================================= */

async function loadUsers() {

  if (!supabaseClient) {
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
            profile.id !==
            state.currentUser?.id
        )
        .map(
          profile => ({

            id:
              profile.id,

            name:
              profile.display_name ||
              profile.username ||
              "Q1 User",

            gender:
              profile.gender ||
              "other",

            /*
              Supabase does not automatically
              tell us real online presence here.
              We keep this as a UI status for now.
            */

            online:
              true,

            friends:
              false,

            unread:
              0,

            last:
              ""

          })
        );


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
   RENDER USERS
   ========================================================= */

function renderUsers() {

  const usersBox =
    $("#users");

  if (!usersBox) {
    return;
  }


  const searchInput =
    $("#search");


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
          !state.blocked.includes(
            user.id
          )
      )
      .filter(
        user =>
          user.name
            .toLowerCase()
            .includes(query)
      );


  /* ONLINE */

  if (
    state.filter === "online"
  ) {

    list =
      list.filter(
        user =>
          user.online
      );

  }


  /* UNREAD */

  else if (
    state.filter === "unread"
  ) {

    list =
      list.filter(
        user =>
          user.unread > 0
      );

  }


  /* RECENT */

  else if (
    state.filter === "recent"
  ) {

    list =
      list.filter(
        user =>
          Boolean(
            user.last
          )
      );

  }


  /* FRIENDS */

  else if (
    state.filter === "friends"
  ) {

    list =
      list.filter(
        user =>
          user.friends
      );

  }


  /* COUNT */

  const count =
    $("#userCount");


  if (count) {

    count.textContent =
      `${list.length} ${
        list.length === 1
          ? "person"
          : "people"
      }`;

  }


  /* EMPTY */

  if (!list.length) {

    usersBox.innerHTML = `

      <div style="
        padding:24px 16px;
        text-align:center;
        color:#777;
      ">

        <div style="
          font-size:30px;
          margin-bottom:8px;
        ">
          👥
        </div>

        <strong>
          No users found
        </strong>

        <br>

        <small>
          Create another Q1 account to see people here.
        </small>

      </div>

    `;

    return;

  }


  /* USER LIST */

  usersBox.innerHTML =
    list
      .map(
        user => `

          <button
            class="user ${
              state.selected === user.id
                ? "selected"
                : ""
            }"
            type="button"
            data-user-id="${escapeHtml(
              user.id
            )}"
          >

            <span
              class="avatar ${escapeHtml(
                user.gender
              )}"
            >

              ${escapeHtml(
                user.name
                  .charAt(0)
                  .toUpperCase()
              )}

            </span>


            <span class="info">

              <b>

                ${escapeHtml(
                  user.name
                )}

                <i
                  class="dot ${
                    user.online
                      ? "on"
                      : ""
                  }"
                ></i>

              </b>


              <span class="preview">

                ${escapeHtml(
                  user.last ||
                  "Start a conversation"
                )}

              </span>

            </span>


            ${
              user.unread
                ? `<small>${user.unread}</small>`
                : ""
            }

          </button>

        `
      )
      .join("");


  usersBox
    .querySelectorAll(
      "[data-user-id]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            selectUser(
              button.dataset.userId
            );

          }
        );

      }
    );

}


/* =========================================================
   SELECT USER
   ========================================================= */

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


  const chatName =
    $("#chatName");

  if (chatName) {

    chatName.textContent =
      user.name;

  }


  const avatar =
    $("#chatAvatar");


  if (avatar) {

    avatar.textContent =
      user.name
        .charAt(0)
        .toUpperCase();

  }


  const status =
    $("#status");


  if (status) {

    status.innerHTML = `

      <span class="dot ${
        user.online
          ? "on"
          : ""
      }"></span>

      ${
        user.online
          ? "Online"
          : "Offline"
      }

    `;

  }


  const input =
    $("#input");

  const send =
    $("#send");

  const block =
    $("#block");

  const report =
    $("#report");


  if (input) {
    input.disabled = false;
  }

  if (send) {
    send.disabled = false;
  }

  if (block) {
    block.disabled = false;
  }

  if (report) {
    report.disabled = false;
  }


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

  if (
    !supabaseClient ||
    !state.currentUser
  ) {

    return;

  }


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
          "id, sender_id, receiver_id, text, content, created_at"
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

      /*
        If your table has only `content`
        and not `text`, retry with content.
      */

      if (
        /column.*text.*does not exist/i
          .test(error.message)
      ) {

        await loadConversationUsingContent(
          userId
        );

        return;

      }


      console.warn(
        "Conversation loading failed:",
        error.message
      );

      return;

    }


    if (!data) {
      return;
    }


    state.messages[userId] =
      data.map(
        row => ({

          me:
            row.sender_id === myId,

          text:
            row.text ??
            row.content ??
            "",

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

        })
      );


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
   LOAD CONVERSATION — CONTENT FALLBACK
   ========================================================= */

async function loadConversationUsingContent(
  userId
) {

  if (
    !supabaseClient ||
    !state.currentUser
  ) {

    return;

  }


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
          "id, sender_id, receiver_id, content, created_at"
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
        "Content conversation loading failed:",
        error.message
      );

      return;

    }


    state.messages[userId] =
      (data || [])
        .map(
          row => ({

            me:
              row.sender_id === myId,

            text:
              row.content || "",

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

          })
        );


    saveLocal();

    renderMessages();

  }
  catch (error) {

    console.error(
      "Content conversation error:",
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

  if (!box) {
    return;
  }


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
    list
      .map(
        message => `

          <div class="msg ${
            message.me
              ? "me"
              : ""
          }">

            ${escapeHtml(
              message.text
            )}

            <div class="meta">

              ${escapeHtml(
                message.time || ""
              )}

            </div>

          </div>

        `
      )
      .join("");


  box.scrollTop =
    box.scrollHeight;

}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

async function sendMessage() {

  const input =
    $("#input");


  if (!input) {
    return;
  }


  const text =
    input.value.trim();


  if (!text) {
    return;
  }


  if (!state.selected) {

    alert(
      "Select a person first."
    );

    return;

  }


  if (!state.currentUser) {

    alert(
      "Your Q1 Chat session is not ready yet."
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


  const time =
    getCurrentTime();


  /*
    Optimistic UI
  */

  if (!state.messages[receiverId]) {

    state.messages[receiverId] =
      [];

  }


  state.messages[receiverId].push({

    me: true,

    text: text,

    time: time

  });


  input.value = "";

  input.style.height =
    "auto";


  const counter =
    $("#charCount");


  if (counter) {

    counter.textContent =
      "0/2000";

  }


  saveLocal();

  renderMessages();


  /*
    Save to Supabase
  */

  await saveMessageToSupabase(
    receiverId,
    text
  );

}


/* =========================================================
   SAVE MESSAGE — TEXT COLUMN
   ========================================================= */

async function saveMessageToSupabase(
  receiverId,
  text
) {

  if (
    !supabaseClient ||
    !state.currentUser
  ) {

    return;

  }


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

          text:
            text

        });


    if (!error) {
      return;
    }


    /*
      If `text` does not exist,
      retry using `content`.
    */

    if (
      /column.*text.*does not exist/i
        .test(error.message)
    ) {

      await saveMessageUsingContent(
        receiverId,
        text
      );

      return;

    }


    console.warn(
      "Message was not saved:",
      error.message
    );

  }
  catch (error) {

    console.error(
      "Message save error:",
      error
    );

  }

}


/* =========================================================
   SAVE MESSAGE — CONTENT FALLBACK
   ========================================================= */

async function saveMessageUsingContent(
  receiverId,
  text
) {

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

          content:
            text

        });


    if (error) {

      console.warn(
        "Message content fallback failed:",
        error.message
      );

    }

  }
  catch (error) {

    console.error(
      "Content message error:",
      error
    );

  }

}


/* =========================================================
   SETTINGS — OPEN
   ========================================================= */

function openSettings() {

  const dialog =
    $("#settings");

  if (!dialog) {
    return;
  }


  const displayName =
    $("#displayName");

  const gender =
    $("#gender");

  const age =
    $("#age");


  if (displayName) {

    displayName.value =
      state.settings.name ||
      "You";

  }


  if (gender) {

    gender.value =
      state.settings.gender ||
      "other";

  }


  if (age) {

    age.value =
      state.settings.age ||
      "13-17";

  }


  if (
    typeof dialog.showModal ===
    "function"
  ) {

    dialog.showModal();

  }
  else {

    dialog.setAttribute(
      "open",
      ""
    );

  }

}


/* =========================================================
   SETTINGS — SAVE
   ========================================================= */

async function saveSettings() {

  const displayName =
    $("#displayName");

  const gender =
    $("#gender");

  const age =
    $("#age");


  state.settings = {

    name:
      displayName?.value
        ?.trim()
        ?.slice(0, 40)
        || "You",

    gender:
      gender?.value ||
      "other",

    age:
      age?.value ||
      "13-17"

  };


  saveLocal();


  if (state.currentUser) {

    await saveOwnProfile();

  }


  const dialog =
    $("#settings");


  if (dialog?.open) {

    dialog.close();

  }


  await loadUsers();

}


/* =========================================================
   BLOCKED USERS
   ========================================================= */

function showBlockedUsers() {

  const list =
    $("#blockedList");

  const dialog =
    $("#blockedDialog");


  if (!list || !dialog) {
    return;
  }


  if (!state.blocked.length) {

    list.innerHTML = `

      <p>
        No blocked users.
      </p>

    `;

  }
  else {

    list.innerHTML =
      state.blocked
        .map(
          id => {

            const user =
              getUser(id);


            return `

              <div class="blockedrow">

                <span>

                  ${escapeHtml(
                    user?.name ||
                    "User"
                  )}

                </span>


                <button
                  type="button"
                  data-unblock="${escapeHtml(
                    id
                  )}"
                >
                  Unblock
                </button>

              </div>

            `;

          }
        )
        .join("");


    list
      .querySelectorAll(
        "[data-unblock]"
      )
      .forEach(
        button => {

          button.addEventListener(
            "click",
            () => {

              unblock(
                button.dataset.unblock
              );

            }
          );

        }
      );

  }


  if (
    typeof dialog.showModal ===
    "function"
  ) {

    dialog.showModal();

  }

}


/* =========================================================
   UNBLOCK
   ========================================================= */

async function unblock(id) {

  state.blocked =
    state.blocked.filter(
      item =>
        item !== id
    );


  saveLocal();

  renderUsers();


  /*
    Remove block from Supabase.
  */

  if (
    supabaseClient &&
    state.currentUser
  ) {

    try {

      const {
        error
      } =
        await supabaseClient
          .from("blocks")
          .delete()
          .eq(
            "blocker_id",
            state.currentUser.id
          )
          .eq(
            "blocked_id",
            id
          );


      if (error) {

        console.warn(
          "Supabase unblock failed:",
          error.message
        );

      }

    }
    catch (error) {

      console.warn(
        "Unblock error:",
        error
      );

    }

  }


  showBlockedUsers();

}


/* =========================================================
   BLOCK CURRENT USER
   ========================================================= */

async function blockCurrentUser() {

  if (!state.selected) {

    alert(
      "Select a person first."
    );

    return;

  }


  const user =
    getUser(
      state.selected
    );


  if (!user) {
    return;
  }


  const confirmed =
    confirm(
      `Block ${user.name}?`
    );


  if (!confirmed) {
    return;
  }


  if (
    !state.blocked.includes(
      user.id
    )
  ) {

    state.blocked.push(
      user.id
    );

  }


  saveLocal();


  /*
    Save block in Supabase.
  */

  if (
    supabaseClient &&
    state.currentUser
  ) {

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
          "Block was not saved to Supabase:",
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


  /*
    Close current chat.
  */

  state.selected =
    null;


  const input =
    $("#input");

  const send =
    $("#send");

  const block =
    $("#block");

  const report =
    $("#report");


  if (input) {
    input.disabled = true;
    input.value = "";
  }

  if (send) {
    send.disabled = true;
  }

  if (block) {
    block.disabled = true;
  }

  if (report) {
    report.disabled = true;
  }


  const chatName =
    $("#chatName");

  if (chatName) {

    chatName.textContent =
      "Select a person";

  }


  const status =
    $("#status");

  if (status) {

    status.textContent =
      "Choose a chat";

  }


  const avatar =
    $("#chatAvatar");

  if (avatar) {

    avatar.textContent =
      "?";

  }


  const counter =
    $("#charCount");

  if (counter) {

    counter.textContent =
      "0/2000";

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


  const user =
    getUser(
      state.selected
    );


  if (!user) {
    return;
  }


  /*
    For now report is handled locally.
    A real moderation/report table can be
    connected later.
  */

  alert(
    `Report submitted for ${user.name}.`
  );

}


/* =========================================================
   FILTER BUTTONS
   ========================================================= */

function setupFilters() {

  document
    .querySelectorAll(
      "nav button[data-filter]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                "nav button[data-filter]"
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


            state.filter =
              button.dataset.filter ||
              "online";


            renderUsers();

          }
        );

      }
    );

}


/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {

  const search =
    $("#search");


  if (!search) {
    return;
  }


  search.addEventListener(
    "input",
    renderUsers
  );

}


/* =========================================================
   MESSAGE INPUT
   ========================================================= */

function setupMessageInput() {

  const input =
    $("#input");


  if (!input) {
    return;
  }


  input.addEventListener(
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


  input.addEventListener(
    "input",
    () => {

      const counter =
        $("#charCount");


      if (counter) {

        counter.textContent =
          `${input.value.length}/2000`;

      }


      input.style.height =
        "auto";


      input.style.height =
        Math.min(
          input.scrollHeight,
          150
        ) + "px";

    }
  );

}


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

function setupButtons() {

  const send =
    $("#send");

  if (send) {

    send.addEventListener(
      "click",
      sendMessage
    );

  }


  const settingsBtn =
    $("#settingsBtn");

  if (settingsBtn) {

    settingsBtn.addEventListener(
      "click",
      openSettings
    );

  }


  const save =
    $("#save");

  if (save) {

    save.addEventListener(
      "click",
      saveSettings
    );

  }


  const blocked =
    $("#blocked");

  if (blocked) {

    blocked.addEventListener(
      "click",
      showBlockedUsers
    );

  }


  const block =
    $("#block");

  if (block) {

    block.addEventListener(
      "click",
      blockCurrentUser
    );

  }


  const report =
    $("#report");

  if (report) {

    report.addEventListener(
      "click",
      reportCurrentUser
    );

  }

}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initQ1Chat() {

  console.log(
    "Q1 Chat starting..."
  );


  /*
    Local UI first
  */

  saveLocal();

  renderUsers();

  renderMessages();


  /*
    Setup buttons
  */

  setupFilters();

  setupSearch();

  setupMessageInput();

  setupButtons();


  /*
    Supabase auth
  */

  if (!supabaseClient) {

    showAppError(
      "Supabase library is not available."
    );

    return;

  }


  const user =
    await ensureUser();


  if (!user) {

    return;

  }


  console.log(
    "Q1 user authenticated:",
    user.id
  );


  /*
    Create / update own profile
  */

  await saveOwnProfile();


  /*
    Load all other users
  */

  await loadUsers();


  console.log(
    "Q1 Chat ready."
  );

}


/* =========================================================
   START APP
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initQ1Chat
  );

}
else {

  initQ1Chat();

}
