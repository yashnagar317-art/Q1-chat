/* =========================================================
   Q1 CHAT
   app.js
   Matches the supplied index.html + Supabase database
   ========================================================= */


/* =========================================================
   1. SUPABASE CONFIG
   ========================================================= */

// NOTE: Do NOT commit your anon/publishable key to source control.
// Set SUPABASE_KEY to your project's anon (publishable) key locally.
// Use the Supabase Project API URL (from Project Settings → API), not the raw DB host.
const SUPABASE_URL = "https://ubkvpmwpvmozhbwlxhmx.supabase.co";

const SUPABASE_KEY = "sb_publishable_n8GM1QZs-3hM90160r--2A_sGrkvxtY";


/* =========================================================
   2. CREATE SUPABASE CLIENT
   ========================================================= */

// When using the UMD bundle from the CDN, the global is `window.supabase`
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* =========================================================
   3. GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;
let selectedUser = null;

let allUsers = [];

let messageChannel = null;


/* =========================================================
   4. DOM ELEMENTS
   ========================================================= */

const authStatus = document.getElementById("authStatus");

const usersContainer = document.getElementById("users");

const userCount = document.getElementById("userCount");

const searchInput = document.getElementById("search");

const chatAvatar = document.getElementById("chatAvatar");

const chatName = document.getElementById("chatName");

const chatStatus = document.getElementById("status");

const messagesContainer = document.getElementById("messages");

const messageInput = document.getElementById("input");

const sendButton = document.getElementById("send");

const charCount = document.getElementById("charCount");

const blockButton = document.getElementById("block");

const reportButton = document.getElementById("report");

const settingsButton = document.getElementById("settingsBtn");

const settingsDialog = document.getElementById("settings");

const closeSettingsButton =
  document.getElementById("closeSettings");

const displayNameInput =
  document.getElementById("displayName");

const genderInput =
  document.getElementById("gender");

const ageInput =
  document.getElementById("age");

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


/* =========================================================
   5. SAFETY / HTML ESCAPING
   ========================================================= */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   6. STATUS
   ========================================================= */

function setAuthStatus(text) {

  if (authStatus) {
    authStatus.textContent = text;
  }
}


/* =========================================================
   7. START APP
   ========================================================= */

async function startQ1Chat() {

  try {

    if (
      SUPABASE_URL.includes("PASTE_") ||
      SUPABASE_KEY.includes("PASTE_")
    ) {

      setAuthStatus("Add Supabase keys");

      console.error(
        "Q1 Chat: Supabase URL/key has not been configured."
      );

      return;
    }


    setAuthStatus("Connecting...");


    /* -----------------------------------------------
       Check existing session
       ----------------------------------------------- */

    const {
      data: sessionData,
      error: sessionError
    } = await supabaseClient.auth.getSession();


    if (sessionError) {
      throw sessionError;
    }


    if (sessionData.session?.user) {

      currentUser = sessionData.session.user;

    } else {

      /* ---------------------------------------------
         Anonymous login
         --------------------------------------------- */

      // Use signInAnonymously if available, otherwise attempt the older fallback.
      let anonResult;

      if (typeof supabaseClient.auth.signInAnonymously === 'function') {
        anonResult = await supabaseClient.auth.signInAnonymously();
      } else if (typeof supabaseClient.auth.signUp === 'function') {
        // Some older/newer SDKs may not expose an explicit anonymous method.
        // This fallback will try to create an "anonymous" user by calling signUp with no credentials —
        // typically this will fail for projects that don't allow it, so the preferred path is
        // to supply the publishable anon key and use signInAnonymously.
        try {
          anonResult = await supabaseClient.auth.signUp({});
        } catch (e) {
          anonResult = { error: e };
        }
      } else {
        throw new Error('Anonymous auth is not supported by the loaded Supabase client.');
      }


      if (anonResult.error) {
        throw anonResult.error;
      }


      currentUser = anonResult.data?.user || anonResult.user;
    }


    if (!currentUser) {
      throw new Error("No authenticated user found.");
    }


    setAuthStatus("Connected");


    /* -----------------------------------------------
       Profile
       ----------------------------------------------- */

    await loadOrCreateProfile();


    /* -----------------------------------------------
       Users
       ----------------------------------------------- */

    await loadUsers();


    /* -----------------------------------------------
       UI
       ----------------------------------------------- */

    setupUI();

  } catch (error) {

    console.error(
      "Q1 Chat startup error:",
      error
    );

    setAuthStatus("Connection failed");

    showError(
      "Q1 Chat could not connect to Supabase."
    );
  }
}


/* =========================================================
   8. AUTH STATE
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (_event, session) => {

    if (!session?.user) {
      return;
    }

    if (
      currentUser &&
      currentUser.id === session.user.id
    ) {
      return;
    }

    currentUser = session.user;

    setAuthStatus("Connected");

    await loadOrCreateProfile();

    await loadUsers();
  }
);


/* =========================================================
   9. PROFILE
   ========================================================= */

async function loadOrCreateProfile() {

  if (!currentUser) {
    return;
  }


  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();


  if (error) {
    throw error;
  }


  if (data) {

    currentProfile = data;

    fillSettings();

    return;
  }


  /* -----------------------------------------------
     Create first profile
     ----------------------------------------------- */

  const username =
    "user_" +
    currentUser.id
      .replace(/-/g, "")
      .substring(0, 8);


  const newProfile = {

    id: currentUser.id,

    username: username,

    display_name: "Q1 User",

    gender: "other"
  };


  const {
    data: createdProfile,
    error: createError
  } = await supabaseClient
    .from("profiles")
    .insert(newProfile)
    .select()
    .single();


  if (createError) {
    throw createError;
  }


  currentProfile = createdProfile;

  fillSettings();
}


/* =========================================================
   10. SETTINGS
   ========================================================= */

function fillSettings() {

  if (!currentProfile) {
    return;
  }


  if (displayNameInput) {

    displayNameInput.value =
      currentProfile.display_name || "";
  }


  if (genderInput) {

    genderInput.value =
      currentProfile.gender || "other";
  }


  /*
     Age is currently UI-only.

     Your profiles table does NOT have an age column,
     so we intentionally do not store age in the database.
  */

}


/* =========================================================
   11. SAVE SETTINGS
   ========================================================= */

async function saveSettings() {

  if (!currentUser) {
    return;
  }


  const displayName =
    displayNameInput.value.trim() ||
    "Q1 User";


  const gender =
    genderInput.value;


  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .update({

      display_name: displayName,

      gender: gender

    })
    .eq("id", currentUser.id)
    .select()
    .single();


  if (error) {

    console.error(
      "Profile update error:",
      error
    );

    showError(
      "Could not save settings."
    );

    return;
  }


  currentProfile = data;

  closeDialog(settingsDialog);

  await loadUsers();
}


/* =========================================================
   12. LOAD USERS
   ========================================================= */

async function loadUsers() {

  if (!currentUser) {
    return;
  }


  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select(
      "id,username,display_name,gender,created_at"
    )
    .neq("id", currentUser.id)
    .order(
      "created_at",
      {
        ascending: false
      }
    );


  if (error) {

    console.error(
      "Users load error:",
      error
    );

    showError(
      "Could not load people."
    );

    return;
  }


  allUsers = data || [];

  renderUsers(allUsers);
}


/* =========================================================
   13. RENDER USERS
   ========================================================= */

function renderUsers(users) {

  if (!usersContainer) {
    return;
  }


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
          padding:25px;
          text-align:center;
          color:#69737e;
          font-size:13px;
        "
      >

        No other users yet.

      </div>

    `;

    return;
  }


  users.forEach(user => {

    const button =
      document.createElement("button");


    button.type = "button";

    button.className = "user";

    button.dataset.userId = user.id;


    const name =
      user.display_name ||
      user.username ||
      "Q1 User";


    const firstLetter =
      name
        .trim()
        .charAt(0)
        .toUpperCase() ||
      "Q";


    const gender =
      ["boy", "girl", "other"].includes(
        user.gender
      )
        ? user.gender
        : "other";


    button.innerHTML = `

      <div class="avatar ${gender}">
        ${escapeHTML(firstLetter)}
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

      </div>

      <span class="dot on"></span>

    `;


    button.addEventListener(
      "click",
      () => selectUser(user)
    );


    usersContainer.appendChild(button);
  });
}


/* =========================================================
   14. SEARCH
   ========================================================= */

function searchUsers() {

  const query =
    searchInput.value
      .trim()
      .toLowerCase();


  if (!query) {

    renderUsers(allUsers);

    return;
  }


  const filtered =
    allUsers.filter(user => {

      const name =
        (
          user.display_name || ""
        ).toLowerCase();


      const username =
        (
          user.username || ""
        ).toLowerCase();


      return (
        name.includes(query) ||
        username.includes(query)
      );
    });


  renderUsers(filtered);
}


/* =========================================================
   15. SELECT USER
   ========================================================= */

async function selectUser(user) {

  if (!user) {
    return;
  }


  selectedUser = user;


  /* -----------------------------------------------
     Highlight selected user
     ----------------------------------------------- */

  document
    .querySelectorAll(".user")
    .forEach(element => {

      element.classList.toggle(
        "selected",
        element.dataset.userId === user.id
      );
    });


  const name =
    user.display_name ||
    user.username ||
    "Q1 User";


  const firstLetter =
    name
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "?";


  const gender =
    ["boy", "girl", "other"].includes(
      user.gender
    )
      ? user.gender
      : "other";


  if (chatName) {
    chatName.textContent = name;
  }


  if (chatAvatar) {

    chatAvatar.textContent =
      firstLetter;

    chatAvatar.className =
      `chat-avatar ${gender}`;
  }


  if (chatStatus) {
    chatStatus.textContent =
      "Connected";
  }


  messageInput.disabled = false;

  sendButton.disabled = false;

  blockButton.disabled = false;

  reportButton.disabled = false;


  await loadMessages();

  subscribeToMessages();

  messageInput.focus();
}


/* =========================================================
   16. LOAD MESSAGES
   ========================================================= */

async function loadMessages() {

  if (
    !currentUser ||
    !selectedUser
  ) {
    return;
  }


  const currentId =
    currentUser.id;


  const selectedId =
    selectedUser.id;


  const {
    data,
    error
  } = await supabaseClient
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
      "Messages load error:",
      error
    );

    showError(
      "Could not load messages."
    );

    return;
  }


  renderMessages(data || []);
}


/* =========================================================
   17. RENDER MESSAGES
   ========================================================= */

function renderMessages(messages) {

  if (!messagesContainer) {
    return;
  }


  messagesContainer.innerHTML = "";


  if (!messages.length) {

    messagesContainer.innerHTML = `

      <div class="welcome">

        <div class="welcome-icon">
          💬
        </div>

        <h2>
          Start chatting
        </h2>

        <p>
          Send a respectful message to
          ${escapeHTML(
            selectedUser?.display_name ||
            "this person"
          )}.
        </p>

        <small>
          Never share passwords, addresses,
          phone numbers or private contact details.
        </small>

      </div>

    `;

    return;
  }


  messages.forEach(message => {

    const wrapper =
      document.createElement("div");


    wrapper.className =
      message.sender_id === currentUser.id
        ? "msg me"
        : "msg";


    const messageText =
      document.createElement("div");


    messageText.textContent =
      message.text;


    wrapper.appendChild(
      messageText
    );


    const meta =
      document.createElement("div");


    meta.className = "meta";

    meta.textContent =
      formatTime(message.created_at);


    wrapper.appendChild(
      meta
    );


    messagesContainer.appendChild(
      wrapper
    );
  });


  scrollMessagesToBottom();
}


/* =========================================================
   18. SEND MESSAGE
   ========================================================= */

async function sendMessage() {

  if (
    !currentUser ||
    !selectedUser
  ) {
    return;
  }


  const text =
    messageInput.value.trim();


  if (!text) {
    return;
  }


  if (text.length > 2000) {

    showError(
      "Message cannot exceed 2000 characters."
    );

    return;
  }


  sendButton.disabled = true;


  const {
    error
  } = await supabaseClient
    .from("messages")
    .insert({

      sender_id:
        currentUser.id,

      receiver_id:
        selectedUser.id,

      text:
        text

    });


  sendButton.disabled = false;


  if (error) {

    console.error(
      "Send message error:",
      error
    );

    showError(
      "Message could not be sent."
    );

    return;
  }


  messageInput.value = "";

  updateCharCount();

  await loadMessages();

  messageInput.focus();
}


/* =========================================================
   19. REALTIME
   ========================================================= */

function subscribeToMessages() {

  if (
    !currentUser ||
    !selectedUser
  ) {
    return;
  }


  if (messageChannel) {

    supabaseClient.removeChannel(
      messageChannel
    );

    messageChannel = null;
  }


  messageChannel =
    supabaseClient
      .channel(
        `q1-chat-${currentUser.id}-${selectedUser.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        async payload => {

          const message =
            payload.new;


          const relevant =
            (
              message.sender_id ===
              currentUser.id &&
              message.receiver_id ===
              selectedUser.id
            ) ||
            (
              message.sender_id ===
              selectedUser.id &&
              message.receiver_id ===
              currentUser.id
            );


          if (relevant) {
            await loadMessages();
          }
        }
      )
      .subscribe(status => {

        console.log(
          "Realtime:",
          status
        );
      });
}


/* =========================================================
   20. BLOCK USER
   ========================================================= */

async function blockSelectedUser() {

  if (
    !currentUser ||
    !selectedUser
  ) {
    return;
  }


  const confirmed =
    window.confirm(
      `Block ${
        selectedUser.display_name ||
        selectedUser.username ||
        "this user"
      }?`
    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } = await supabaseClient
    .from("blocks")
    .insert({

      blocker_id:
        currentUser.id,

      blocked_id:
        selectedUser.id

    });


  if (error) {

    if (error.code === "23505") {

      showError(
        "This user is already blocked."
      );

    } else {

      console.error(
        "Block error:",
        error
      );

      showError(
        "Could not block this user."
      );
    }

    return;
  }


  showSuccess(
    "User blocked."
  );


  await loadBlockedUsers();
}


/* =========================================================
   21. LOAD BLOCKED USERS
   ========================================================= */

async function loadBlockedUsers() {

  if (!currentUser) {
    return;
  }


  const {
    data,
    error
  } = await supabaseClient
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


  blockedList.innerHTML = "";


  if (!data || !data.length) {

    blockedList.innerHTML =
      "<p>No blocked users.</p>";

    return;
  }


  for (const block of data) {

    const {
      data: user
    } = await supabaseClient
      .from("profiles")
      .select(
        "id,username,display_name"
      )
      .eq(
        "id",
        block.blocked_id
      )
      .maybeSingle();


    if (!user) {
      continue;
    }


    const row =
      document.createElement("div");


    row.className =
      "blockedrow";


    row.innerHTML = `

      <span>
        ${escapeHTML(
          user.display_name ||
          user.username ||
          "Q1 User"
        )}
      </span>

      <button
        type="button"
        data-user-id="${escapeHTML(user.id)}"
      >
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


    blockedList.appendChild(row);
  }
}


/* =========================================================
   22. UNBLOCK USER
   ========================================================= */

async function unblockUser(userId) {

  if (!currentUser) {
    return;
  }


  const {
    error
  } = await supabaseClient
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

    console.error(
      "Unblock error:",
      error
    );

    showError(
      "Could not unblock user."
    );

    return;
  }


  showSuccess(
    "User unblocked."
  );
}


/* =========================================================
   23. CHARACTER COUNT
   ========================================================= */

function updateCharCount() {

  if (!messageInput || !charCount) {
    return;
  }


  charCount.textContent =
    `${messageInput.value.length}/2000`;
}


/* =========================================================
   24. TIME
   ========================================================= */

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


/* =========================================================
   25. SCROLL
   ========================================================= */

function scrollMessagesToBottom() {

  if (!messagesContainer) {
    return;
  }


  messagesContainer.scrollTop =
    messagesContainer.scrollHeight;
}


/* =========================================================
   26. DIALOG HELPERS
   ========================================================= */

function openDialog(dialog) {

  if (!dialog) {
    return;
  }


  if (
    typeof dialog.showModal ===
    "function"
  ) {

    dialog.showModal();

  } else {

    dialog.setAttribute(
      "open",
      ""
    );
  }
}


function closeDialog(dialog) {

  if (!dialog) {
    return;
  }


  if (
    typeof dialog.close ===
    "function"
  ) {

    dialog.close();

  } else {

    dialog.removeAttribute(
      "open"
    );
  }
}


/* =========================================================
   27. UI
   ========================================================= */

function setupUI() {

  /* Search */

  searchInput?.addEventListener(
    "input",
    searchUsers
  );


  /* Send */

  sendButton?.addEventListener(
    "click",
    sendMessage
  );


  /* Enter to send */

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


  /* Character count */

  messageInput?.addEventListener(
    "input",
    updateCharCount
  );


  /* Settings */

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


  /* Save settings */

  saveButton?.addEventListener(
    "click",
    saveSettings
  );


  /* Block */

  blockButton?.addEventListener(
    "click",
    blockSelectedUser
  );


  /* Blocked users */

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


  /* Navigation filters */

  document
    .querySelectorAll(
      "nav button[data-filter]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              "nav button[data-filter]"
            )
            .forEach(btn =>
              btn.classList.remove(
                "active"
              )
            );


          button.classList.add(
            "active"
          );


          /*
             At the moment Online/Unread/
             Recent/Friends are visual filters.

             We can build the full unread/
             friends system later.
          */

          if (
            button.dataset.filter ===
            "online"
          ) {

            renderUsers(allUsers);

          } else {

            renderUsers(allUsers);
          }
        }
      );
    });
}


/* =========================================================
   28. ERROR / SUCCESS
   ========================================================= */

function showError(message) {

  console.error(message);

  if (chatStatus) {
    chatStatus.textContent =
      message;
  }
}


function showSuccess(message) {

  console.log(message);

  if (chatStatus) {
    chatStatus.textContent =
      message;
  }
}


/* =========================================================
   29. CLEANUP
   ========================================================= */

window.addEventListener(
  "beforeunload",
  () => {

    if (messageChannel) {

      supabaseClient.removeChannel(
        messageChannel
      );
    }
  }
);


/* =========================================================
   30. START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  startQ1Chat
);
