/* =========================================================
   Q1 CHAT — APP.JS
   Supabase + Anonymous Auth + Profiles + Messages
   CSP SAFE — NO INLINE JAVASCRIPT
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

if (
  window.supabase &&
  typeof window.supabase.createClient === "function"
) {

  supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );

} else {

  console.error(
    "Supabase library could not be loaded."
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
  ),

  initialized: false,

  loadingUsers: false,

  sending: false

};


/* =========================================================
   SHORTCUT
   ========================================================= */

function $(selector) {

  return document.querySelector(
    selector
  );

}


/* =========================================================
   SAFE JSON LOADER
   ========================================================= */

function loadJSON(
  key,
  fallback
) {

  try {

    const value =
      localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    const parsed =
      JSON.parse(value);

    return parsed ?? fallback;

  }

  catch (error) {

    console.warn(
      `Could not load ${key}:`,
      error
    );

    return fallback;

  }

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

  return String(
    value ?? ""
  ).replace(
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
   LOCAL STORAGE
   ========================================================= */

function saveLocal() {

  try {

    localStorage.setItem(
      "q1blocked",
      JSON.stringify(
        state.blocked
      )
    );

    localStorage.setItem(
      "q1messages",
      JSON.stringify(
        state.messages
      )
    );

    localStorage.setItem(
      "q1settings",
      JSON.stringify(
        state.settings
      )
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


  const urlPattern =
    /https?:\/\/\S+/i;


  const wwwPattern =
    /www\.\S+/i;


  const contactPattern =
    /\b(
      instagram|
      snapchat|
      onlyfans|
      telegram|
      discord
    )\b/ix;


  const promotionPattern =
    /\b(
      dm\s+me|
      link\s+in\s+bio|
      follow\s+me|
      add\s+me
    )\b/ix;


  return (

    urlPattern.test(value) ||

    wwwPattern.test(value) ||

    contactPattern.test(value) ||

    promotionPattern.test(value)

  );

}


/* =========================================================
   UI ERROR
   ========================================================= */

function showAppError(message) {

  const usersBox =
    $("#users");

  if (!usersBox) {
    return;
  }


  usersBox.innerHTML = `

    <div
      style="
        padding:18px;
        margin:12px;
        border-radius:14px;
        background:#fff3f3;
        color:#b42318;
        line-height:1.5;
      "
    >

      ⚠️

      <strong>
        Q1 Chat
      </strong>

      <br>

      ${escapeHtml(message)}

    </div>

  `;

}


/* =========================================================
   AUTH STATUS
   ========================================================= */

function setAuthStatus(
  text
) {

  const status =
    $("#authStatus");

  if (status) {

    status.textContent =
      text;

  }

}


/* =========================================================
   ENSURE USER
   ========================================================= */

async function ensureUser() {

  if (!supabaseClient) {

    showAppError(
      "Supabase could not be loaded."
    );

    return null;

  }


  try {

    const {
      data: sessionData,
      error: sessionError
    } =
      await supabaseClient
        .auth
        .getSession();


    if (sessionError) {

      console.warn(
        "Session error:",
        sessionError.message
      );

    }


    if (
      sessionData &&
      sessionData.session &&
      sessionData.session.user
    ) {

      state.currentUser =
        sessionData.session.user;

      setAuthStatus(
        "Connected"
      );

      return state.currentUser;

    }


    setAuthStatus(
      "Creating session..."
    );


    const {
      data,
      error
    } =
      await supabaseClient
        .auth
        .signInAnonymously();


    if (error) {

      console.error(
        "Anonymous sign-in failed:",
        error.message
      );

      setAuthStatus(
        "Not connected"
      );

      showAppError(
        "Anonymous sign-in failed. Make sure Anonymous Sign-Ins are enabled in Supabase."
      );

      return null;

    }


    if (!data || !data.user) {

      showAppError(
        "Supabase did not return a user session."
      );

      return null;

    }


    state.currentUser =
      data.user;


    setAuthStatus(
      "Connected"
    );


    return state.currentUser;

  }

  catch (error) {

    console.error(
      "Authentication error:",
      error
    );

    setAuthStatus(
      "Not connected"
    );

    showAppError(
      "Authentication could not be completed."
    );

    return null;

  }

}


/* =========================================================
   CREATE / UPDATE OWN PROFILE
   ========================================================= */

async function saveOwnProfile() {

  if (
    !state.currentUser ||
    !supabaseClient
  ) {

    return false;

  }


  try {

    const displayName =
      String(
        state.settings.name ||
        "You"
      )
        .trim()
        .slice(0, 40)
        || "You";


    /*
      Username is generated from the
      anonymous user's UUID.

      This avoids username collisions
      when multiple people use "You".
    */

    const username =
      "q1_" +
      state.currentUser.id
        .replace(
          /-/g,
          ""
        )
        .slice(0, 20);


    const profile = {

      id:
        state.currentUser.id,

      username:
        username,

      display_name:
        displayName,

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
   LOAD OWN PROFILE
   ========================================================= */

async function loadOwnProfile() {

  if (
    !state.currentUser ||
    !supabaseClient
  ) {

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
          "id, username, display_name, gender"
        )
        .eq(
          "id",
          state.currentUser.id
        )
        .maybeSingle();


    if (error) {

      console.warn(
        "Own profile could not be loaded:",
        error.message
      );

      return;

    }


    if (!data) {

      await saveOwnProfile();

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

  }

  catch (error) {

    console.warn(
      "Own profile load error:",
      error
    );

  }

}


/* =========================================================
   LOAD USERS
   ========================================================= */

async function loadUsers() {

  if (
    !supabaseClient ||
    !state.currentUser
  ) {

    return;

  }


  if (state.loadingUsers) {
    return;
  }


  state.loadingUsers = true;


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
            state.currentUser.id
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

            online:
              true,

            friends:
              false,

            unread:
              0,

            last:
              getLastLocalMessage(
                profile.id
              )

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

  finally {

    state.loadingUsers = false;

  }

}


/* =========================================================
   GET USER
   ========================================================= */

function getUser(id) {

  return state.users.find(
    user =>
      user.id === id
  );

}


/* =========================================================
   GET LAST LOCAL MESSAGE
   ========================================================= */

function getLastLocalMessage(id) {

  const list =
    state.messages[id];


  if (
    !Array.isArray(list) ||
    !list.length
  ) {

    return "";

  }


  const last =
    list[list.length - 1];


  return last?.text || "";

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

      <div
        style="
          padding:24px;
          text-align:center;
          color:#777;
        "
      >

        <div
          style="
            font-size:30px;
            margin-bottom:8px;
          "
        >
          👥
        </div>

        <strong>
          No users found
        </strong>

        <br>

        <small>
          Create another Q1 Chat account
          to see people here.
        </small>

      </div>

    `;

    return;

  }


  /* USERS */

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

        `
      )
      .join("");


  /*
    Attach listeners without inline onclick.
  */

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


  /* CHAT NAME */

  const chatName =
    $("#chatName");


  if (chatName) {

    chatName.textContent =
      user.name;

  }


  /* AVATAR */

  const avatar =
    $("#chatAvatar");


  if (avatar) {

    avatar.textContent =
      user.name
        .charAt(0)
        .toUpperCase();

  }


  /* STATUS */

  const status =
    $("#status");


  if (status) {

    status.innerHTML = `

      <span
        class="dot ${
          user.online
            ? "on"
            : ""
        }"
      ></span>

      ${
        user.online
          ? "Online"
          : "Offline"
      }

    `;

  }


  /* ENABLE COMPOSER */

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


  /* LOCAL MESSAGE ARRAY */

  if (
    !state.messages[id]
  ) {

    state.messages[id] = [];

  }


  saveLocal();

  renderUsers();

  renderMessages();


  /* LOAD REAL MESSAGES */

  await loadConversation(id);

}


/* =========================================================
   LOAD CONVERSATION
   ========================================================= */

async function loadConversation(
  userId
) {

  if (
    !state.currentUser ||
    !supabaseClient
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


    if (!Array.isArray(data)) {
      return;
    }


    state.messages[userId] =
      data.map(
        row => ({

          me:
            row.sender_id ===
            myId,

          text:
            row.text ||
            "",

          time:
            row.created_at
              ? formatTime(
                  row.created_at
                )
              : ""

        })
      );


    saveLocal();


    /*
      Make sure user is still selected
      before rendering.
    */

    if (
      state.selected === userId
    ) {

      renderMessages();

    }


  }

  catch (error) {

    console.error(
      "Conversation error:",
      error
    );

  }

}


/* =========================================================
   FORMAT TIME
   ========================================================= */

function formatTime(
  value
) {

  try {

    return new Date(
      value
    ).toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  }

  catch {

    return "";

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


  /* NO CHAT */

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


  /* EMPTY CHAT */

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


  /* MESSAGE LIST */

  box.innerHTML =
    list
      .map(
        message => `

          <div
            class="msg ${
              message.me
                ? "me"
                : ""
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

  if (state.sending) {
    return;
  }


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


  state.sending = true;


  const now =
    new Date();


  const localMessage = {

    me: true,

    text: text,

    time:
      now.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      )

  };


  /* OPTIMISTIC UI */

  if (
    !state.messages[receiverId]
  ) {

    state.messages[receiverId] =
      [];

  }


  state.messages[
    receiverId
  ].push(
    localMessage
  );


  input.value = "";

  input.style.height =
    "auto";


  updateCharacterCount();


  saveLocal();

  renderMessages();


  /* SUPABASE */

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


    if (error) {

      console.error(
        "Message was not saved:",
        error.message
      );


      /*
        Remove optimistic message
        if Supabase rejected it.
      */

      const messages =
        state.messages[
          receiverId
        ];


      if (
        Array.isArray(messages) &&
        messages.length
      ) {

        messages.pop();

      }


      saveLocal();

      renderMessages();


      alert(
        "Message could not be sent. Please check your Supabase messages RLS policy."
      );

    }

  }

  catch (error) {

    console.error(
      "Message save error:",
      error
    );


    alert(
      "Message could not be sent."
    );

  }

  finally {

    state.sending = false;

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


  if (!dialog.open) {

    dialog.showModal();

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
      displayName
        ? (
            displayName.value
              .trim()
              .slice(0, 40)
            || "You"
          )
        : "You",

    gender:
      gender
        ? gender.value
        : "other",

    age:
      age
        ? age.value
        : "13-17"

  };


  saveLocal();


  const saved =
    await saveOwnProfile();


  const dialog =
    $("#settings");


  if (dialog) {

    dialog.close();

  }


  await loadUsers();


  if (!saved) {

    console.warn(
      "Settings saved locally, but Supabase profile update failed."
    );

  }

}


/* =========================================================
   BLOCKED USERS — OPEN
   ========================================================= */

function showBlockedUsers() {

  const list =
    $("#blockedList");


  const dialog =
    $("#blockedDialog");


  if (!list || !dialog) {
    return;
  }


  renderBlockedList();


  if (!dialog.open) {

    dialog.showModal();

  }

}


/* =========================================================
   RENDER BLOCKED LIST
   ========================================================= */

function renderBlockedList() {

  const list =
    $("#blockedList");


  if (!list) {
    return;
  }


  if (!state.blocked.length) {

    list.innerHTML = `

      <p>
        No blocked users.
      </p>

    `;

    return;

  }


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


  /*
    Remove block from Supabase.
  */

  if (
    state.currentUser &&
    supabaseClient
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


  renderUsers();

  renderBlockedList();

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
    window.confirm(
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
    state.currentUser &&
    supabaseClient
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


  state.selected =
    null;


  resetChat();


  renderUsers();

  renderMessages();

}


/* =========================================================
   RESET CHAT
   ========================================================= */

function resetChat() {

  const input =
    $("#input");

  const send =
    $("#send");

  const block =
    $("#block");

  const report =
    $("#report");

  const chatName =
    $("#chatName");

  const status =
    $("#status");

  const avatar =
    $("#chatAvatar");


  if (input) {

    input.disabled =
      true;

    input.value =
      "";

    input.style.height =
      "auto";

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


  if (chatName) {

    chatName.textContent =
      "Select a person";

  }


  if (status) {

    status.textContent =
      "Choose a chat";

  }


  if (avatar) {

    avatar.textContent =
      "?";

  }


  updateCharacterCount();

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


  alert(
    `Report submitted for ${user.name}.`
  );

}


/* =========================================================
   CHARACTER COUNTER
   ========================================================= */

function updateCharacterCount() {

  const input =
    $("#input");

  const counter =
    $("#charCount");


  if (!input || !counter) {
    return;
  }


  counter.textContent =
    `${input.value.length}/2000`;


  input.style.height =
    "auto";


  input.style.height =
    Math.min(
      input.scrollHeight,
      150
    ) + "px";

}


/* =========================================================
   NAV FILTERS
   ========================================================= */

function setupNavigation() {

  document
    .querySelectorAll(
      "nav button"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(
                "nav button"
              )
              .forEach(
                item => {

                  item.classList.remove(
                    "active"
                  );

                }
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
    () => {

      renderUsers();

    }
  );

}


/* =========================================================
   KEYBOARD MESSAGE SEND
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
    updateCharacterCount
  );

}


/* =========================================================
   BUTTON EVENTS
   ========================================================= */

function setupButtons() {

  const send =
    $("#send");

  const settingsBtn =
    $("#settingsBtn");

  const closeSettings =
    $("#closeSettings");

  const save =
    $("#save");

  const blocked =
    $("#blocked");

  const closeBlocked =
    $("#closeBlocked");

  const block =
    $("#block");

  const report =
    $("#report");


  /* SEND */

  if (send) {

    send.addEventListener(
      "click",
      sendMessage
    );

  }


  /* SETTINGS */

  if (settingsBtn) {

    settingsBtn.addEventListener(
      "click",
      openSettings
    );

  }


  /* CLOSE SETTINGS */

  if (closeSettings) {

    closeSettings.addEventListener(
      "click",
      () => {

        const dialog =
          $("#settings");

        if (dialog) {
          dialog.close();
        }

      }
    );

  }


  /* SAVE SETTINGS */

  if (save) {

    save.addEventListener(
      "click",
      saveSettings
    );

  }


  /* BLOCKED USERS */

  if (blocked) {

    blocked.addEventListener(
      "click",
      showBlockedUsers
    );

  }


  /* CLOSE BLOCKED */

  if (closeBlocked) {

    closeBlocked.addEventListener(
      "click",
      () => {

        const dialog =
          $("#blockedDialog");

        if (dialog) {
          dialog.close();
        }

      }
    );

  }


  /* BLOCK */

  if (block) {

    block.addEventListener(
      "click",
      blockCurrentUser
    );

  }


  /* REPORT */

  if (report) {

    report.addEventListener(
      "click",
      reportCurrentUser
    );

  }

}


/* =========================================================
   DIALOG BACKDROP CLOSE
   ========================================================= */

function setupDialogs() {

  const dialogs =
    document.querySelectorAll(
      "dialog"
    );


  dialogs.forEach(
    dialog => {

      dialog.addEventListener(
        "click",
        event => {

          if (
            event.target === dialog
          ) {

            dialog.close();

          }

        }
      );

    }
  );

}


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

function setupAuthListener() {

  if (!supabaseClient) {
    return;
  }


  supabaseClient
    .auth
    .onAuthStateChange(
      (
        event,
        session
      ) => {

        console.log(
          "Auth event:",
          event
        );


        if (
          session &&
          session.user
        ) {

          state.currentUser =
            session.user;

          setAuthStatus(
            "Connected"
          );

        }

      }
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initQ1Chat() {

  if (state.initialized) {
    return;
  }


  state.initialized =
    true;


  /* LOCAL */

  saveLocal();


  /* BASIC UI */

  renderUsers();

  renderMessages();

  updateCharacterCount();


  /* AUTH */

  const user =
    await ensureUser();


  if (!user) {
    return;
  }


  /*
    Create profile first.
  */

  await saveOwnProfile();


  /*
    Load profile from Supabase.
  */

  await loadOwnProfile();


  /*
    Load other users.
  */

  await loadUsers();


  /*
    Final UI refresh.
  */

  renderUsers();

  renderMessages();


  console.log(
    "Q1 Chat initialized successfully.",
    {
      userId:
        state.currentUser?.id
    }
  );

}


/* =========================================================
   START APP
   ========================================================= */

function startQ1Chat() {

  setupNavigation();

  setupSearch();

  setupMessageInput();

  setupButtons();

  setupDialogs();

  setupAuthListener();

  initQ1Chat();

}


/* =========================================================
   DOM READY
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startQ1Chat
  );

} else {

  startQ1Chat();

}
