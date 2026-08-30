const SUPABASE_URL = "https://ubkvpmwpvmozhbwlxhmx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_n8GM1QZs-3hM90160r--2A_sGrkvxtY";
const BACKEND_URL = "";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

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

const state = {
  filter: "online",
  selected: null,
  blocked: JSON.parse(localStorage.q1blocked || "[]"),
  messages: JSON.parse(localStorage.q1messages || "{}"),
  settings: JSON.parse(
    localStorage.q1settings ||
      '{"name":"You","gender":"boy","age":"13-17"}'
  )
};

const $ = x => document.querySelector(x);
const u = id => users.find(x => x.id === id);

const save = () => {
  localStorage.q1blocked = JSON.stringify(state.blocked);
  localStorage.q1messages = JSON.stringify(state.messages);
  localStorage.q1settings = JSON.stringify(state.settings);
};

function renderUsers() {
  const searchBox = $("#search");
  const usersBox = $("#users");

  if (!searchBox || !usersBox) return;

  const q = searchBox.value.toLowerCase();

  const arr = users
    .filter(x => !state.blocked.includes(x.id))
    .filter(x => x.name.toLowerCase().includes(q))
    .filter(
      x =>
        state.filter === "online"
          ? x.online
          : state.filter === "unread"
          ? x.unread
          : state.filter === "friends"
          ? x.friends
          : true
    );

  usersBox.innerHTML =
    arr
      .map(
        x => `
        <button class="user ${
          state.selected === x.id ? "selected" : ""
        }" onclick="selectUser('${x.id}')">
          <span class="avatar ${x.gender}">${x.name[0]}</span>
          <span class="info">
            <b>
              ${x.name}
              <i class="dot ${x.online ? "on" : ""}"></i>
            </b>
            <span class="preview">${x.last || ""}</span>
          </span>
          ${x.unread ? `<small>${x.unread}</small>` : ""}
        </button>
      `
      )
      .join("") || '<p style="padding:15px;color:#777">No users found.</p>';
}

function selectUser(id) {
  const person = u(id);

  if (!person) return;

  state.selected = id;
  person.unread = 0;

  if (!state.messages[id]) {
    state.messages[id] = [
      {
        me: false,
        text: `Hi! I'm ${person.name}. 👋`
      }
    ];
  }

  save();

  if ($("#chatName")) {
    $("#chatName").textContent = person.name;
  }

  if ($("#status")) {
    $("#status").innerHTML = `
      <span class="dot ${person.online ? "on" : ""}"></span>
      ${person.online ? "Online" : "Offline"}
    `;
  }

  if ($("#input")) {
    $("#input").disabled = false;
  }

  if ($("#send")) {
    $("#send").disabled = false;
  }

  renderUsers();
  renderMessages();
}

function renderMessages() {
  const box = $("#messages");

  if (!box) return;

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

  const messages = state.messages[state.selected] || [];

  box.innerHTML = messages
    .map(
      m => `
      <div class="msg ${m.me ? "me" : ""}">
        ${escapeHtml(m.text)}
        <div class="meta">${m.time || ""}</div>
      </div>
    `
    )
    .join("");

  box.scrollTop = box.scrollHeight;
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>'"]/g,
    c =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      }[c])
  );
}

function blockedText(t) {
  return /https?:\/\/\S+|www\.\S+|\b(instagram|snapchat|onlyfans|telegram|discord)\b|\b(dm me|link in bio|follow me|add me)\b/i.test(
    t
  );
}

if ($("#send")) {
  $("#send").onclick = () => {
    const input = $("#input");

    if (!input || !state.selected) return;

    const t = input.value.trim();

    if (!t) return;

    if (blockedText(t)) {
      alert("This message was blocked by Q1 Chat safety filters.");
      return;
    }

    if (!state.messages[state.selected]) {
      state.messages[state.selected] = [];
    }

    state.messages[state.selected].push({
      me: true,
      text: t,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    });

    input.value = "";

    save();
    renderMessages();
  };
}

if ($("#input")) {
  $("#input").onkeydown = e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      if ($("#send")) {
        $("#send").click();
      }
    }
  };
}

document.querySelectorAll("nav button").forEach(b => {
  b.onclick = () => {
    document
      .querySelectorAll("nav button")
      .forEach(x => x.classList.remove("active"));

    b.classList.add("active");

    state.filter = b.dataset.filter;

    renderUsers();
  };
});

if ($("#search")) {
  $("#search").oninput = renderUsers;
}

if ($("#settingsBtn")) {
  $("#settingsBtn").onclick = () => {
    if ($("#displayName")) {
      $("#displayName").value = state.settings.name;
    }

    if ($("#gender")) {
      $("#gender").value = state.settings.gender;
    }

    if ($("#age")) {
      $("#age").value = state.settings.age;
    }

    if (typeof settings !== "undefined") {
      settings.showModal();
    }
  };
}

if ($("#save")) {
  $("#save").onclick = () => {
    state.settings = {
      name: $("#displayName")?.value.trim() || "You",
      gender: $("#gender")?.value || "boy",
      age: $("#age")?.value || "13-17"
    };

    save();

    if (typeof settings !== "undefined") {
      settings.close();
    }
  };
}

if ($("#blocked")) {
  $("#blocked").onclick = () => {
    const list = $("#blockedList");

    if (!list) return;

    list.innerHTML =
      state.blocked
        .map(id => {
          const person = u(id);

          return person
            ? `
              <div class="blockedrow">
                <span>${person.name}</span>
                <button onclick="unblock('${id}')">
                  Unblock
                </button>
              </div>
            `
            : "";
        })
        .join("") || "<p>No blocked users.</p>";

    if (typeof blockedDialog !== "undefined") {
      blockedDialog.showModal();
    }
  };
}

function unblock(id) {
  state.blocked = state.blocked.filter(x => x !== id);

  save();
  renderUsers();

  if (typeof blockedDialog !== "undefined") {
    blockedDialog.close();
  }
}

if ($("#block")) {
  $("#block").onclick = () => {
    if (!state.selected) return;

    const id = state.selected;
    const person = u(id);

    if (!person) return;

    if (confirm(`Block ${person.name}?`)) {
      state.blocked.push(id);
      state.selected = null;

      if ($("#input")) {
        $("#input").disabled = true;
      }

      if ($("#send")) {
        $("#send").disabled = true;
      }

      save();
      renderUsers();
      renderMessages();
    }
  };
}

if ($("#report")) {
  $("#report").onclick = () => {
    if (state.selected) {
      alert("Report submitted for moderation.");
    }
  };
}

renderUsers();
renderMessages();
```
