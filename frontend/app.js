const SUPABASE_URL = "https://ubkvpmwpvmozhbwlxhmx.supabase.co";
const SUPABASE_KEY = "sb_publishable_n8GM1QZs-3hM90160r--2A_sGrkvxtY";

if (!window.supabase) {
throw new Error("Supabase JS v2 was not loaded.");
}

const supabaseClient = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);

/* =========================================================
STATE
========================================================= */

const state = {
user: null,
profile: null,
users: [],
filteredUsers: [],
friends: [],
incomingRequests: [],
outgoingRequests: [],
blockedUsers: [],
selectedUser: null,
messages: [],
unreadCounts: {},
onlineUsers: new Set(),
activeFilter: "all",
searchTerm: "",
channels: {
presence: null,
messages: null
},
presenceStarted: false,
privateUnlocked: false,
currentTheme: "light",
loadingUsers: false,
loadingMessages: false,
sendingMessage: false,
uploadingMedia: false,
initialized: false
};

/* =========================================================
DOM
========================================================= */

const $ = (id) => document.getElementById(id);

const dom = {
authStatus: $("authStatus"),
settingsBtn: $("settingsBtn"),
userCount: $("userCount"),
search: $("search"),
users: $("users"),

```
chatAvatar: $("chatAvatar"),
chatName: $("chatName"),
status: $("status"),
addFriend: $("addFriend"),
block: $("block"),
report: $("report"),

messages: $("messages"),
input: $("input"),
charCount: $("charCount"),
send: $("send"),

photoBtn: $("photoBtn"),
videoBtn: $("videoBtn"),
linkBtn: $("linkBtn"),
photoInput: $("photoInput"),
videoInput: $("videoInput"),

settings: $("settings"),
closeSettings: $("closeSettings"),
myProfileAvatar: $("myProfileAvatar"),
profilePhotoBtn: $("profilePhotoBtn"),
profilePhotoInput: $("profilePhotoInput"),
displayName: $("displayName"),
gender: $("gender"),
privateChatSettings: $("privateChatSettings"),
blocked: $("blocked"),
themeToggle: $("themeToggle"),
save: $("save"),

privateChatDialog: $("privateChatDialog"),
closePrivateChat: $("closePrivateChat"),
privateChatPin: $("privateChatPin"),
unlockPrivateChat: $("unlockPrivateChat"),

blockedDialog: $("blockedDialog"),
closeBlocked: $("closeBlocked"),
blockedList: $("blockedList"),

profileDialog: $("profileDialog"),
closeProfile: $("closeProfile"),
profileContent: $("profileContent"),

privateChatStatus: $("privateChatStatus"),
privateChatBtn: $("privateChatBtn")
```

};

/* =========================================================
HELPERS
========================================================= */

function escapeHTML(value = "") {
return String(value)
.replace(/&/g, "&")
.replace(/</g, "<")
.replace(/>/g, ">")
.replace(/"/g, """)
.replace(/'/g, "'");
}

function escapeAttribute(value = "") {
return escapeHTML(value).replace(/`/g, "`");
}

function normalizeUsername(value = "") {
return String(value)
.trim()
.toLowerCase()
.replace(/[^a-z0-9_]/g, "");
}

function isValidUUID(value) {
return typeof value === "string" &&
/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function showError(message, error = null) {
console.error("[Q1 Chat]", message, error || "");

```
if (dom.authStatus) {
    dom.authStatus.textContent = message;
    dom.authStatus.classList.add("error");
}
```

}

function clearError() {
if (dom.authStatus) {
dom.authStatus.classList.remove("error");
}
}

function setStatus(message) {
if (dom.authStatus) {
dom.authStatus.textContent = message;
}
}

function formatTime(dateString) {
if (!dateString) return "";

```
const date = new Date(dateString);

if (Number.isNaN(date.getTime())) return "";

return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
});
```

}

function formatRecentTime(dateString) {
if (!dateString) return 0;

```
const time = new Date(dateString).getTime();

return Number.isNaN(time) ? 0 : time;
```

}

function getAvatar(profile, fallback = "Q") {
if (profile?.avatar_url) {
return profile.avatar_url;
}

```
const name =
    profile?.display_name ||
    profile?.username ||
    fallback;

return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
```

}

function setImageSource(element, profile) {
if (!element) return;

```
const avatar = getAvatar(profile);

if (element.tagName === "IMG") {
    element.src = avatar;
    element.alt =
        profile?.display_name ||
        profile?.username ||
        "Profile";
} else {
    element.style.backgroundImage = `url("${escapeAttribute(avatar)}")`;
}
```

}

function getDisplayName(profile) {
return profile?.display_name?.trim() ||
profile?.username ||
"User";
}

function getUsername(profile) {
return profile?.username || "";
}

function getInitial(profile) {
return getDisplayName(profile).charAt(0).toUpperCase() || "Q";
}

function isOnline(userId) {
return state.onlineUsers.has(userId);
}

function isFriend(userId) {
return state.friends.some(
(friend) => friend.user_id === userId
);
}

function hasOutgoingRequest(userId) {
return state.outgoingRequests.some(
(request) => request.user_id === userId
);
}

function hasIncomingRequest(userId) {
return state.incomingRequests.some(
(request) => request.user_id === userId
);
}

function isBlocked(userId) {
return state.blockedUsers.some(
(block) => block.user_id === userId
);
}

function isConversationBlocked(userId) {
return isBlocked(userId) || state.blockedUsers.some(
(block) => block.blocked_id === userId
);
}

function getUnreadCount(userId) {
return Number(state.unreadCounts[userId] || 0);
}

function setUnreadCount(userId, count) {
if (!userId) return;

```
const numericCount = Math.max(0, Number(count) || 0);

if (numericCount === 0) {
    delete state.unreadCounts[userId];
} else {
    state.unreadCounts[userId] = numericCount;
}
```

}

function incrementUnread(userId) {
if (!userId || userId === state.user?.id) return;

```
setUnreadCount(
    userId,
    getUnreadCount(userId) + 1
);
```

}

function isNearBottom(container, threshold = 120) {
if (!container) return true;

```
return (
    container.scrollHeight -
    container.scrollTop -
    container.clientHeight
) <= threshold;
```

}

function scrollMessagesToBottom(force = false) {
if (!dom.messages) return;

```
if (!force && !isNearBottom(dom.messages)) return;

requestAnimationFrame(() => {
    if (!dom.messages) return;

    dom.messages.scrollTop = dom.messages.scrollHeight;
});
```

}

function updateCharacterCount() {
if (!dom.input || !dom.charCount) return;

```
dom.charCount.textContent =
    `${dom.input.value.length}/2000`;
```

}

function closeDialog(dialog) {
if (!dialog) return;

```
if (typeof dialog.close === "function") {
    try {
        dialog.close();
        return;
    } catch (_) {}
}

dialog.removeAttribute("open");
dialog.classList.remove("open", "active");
```

}

function openDialog(dialog) {
if (!dialog) return;

```
if (typeof dialog.showModal === "function") {
    try {
        if (!dialog.open) {
            dialog.showModal();
        }
        return;
    } catch (_) {}
}

dialog.setAttribute("open", "");
dialog.classList.add("open", "active");
```

}

function setDialogText(element, text) {
if (!element) return;

```
element.textContent = text;
```

}

function debounce(fn, delay = 250) {
let timer = null;

```
return (...args) => {
    clearTimeout(timer);

    timer = setTimeout(() => {
        fn(...args);
    }, delay);
};
```

}

function generateReadableUsername() {
const adjectives = [
"Vivid",
"Neon",
"Quantum",
"Silent",
"Cosmic",
"Brave",
"Swift",
"Mystic",
"Lunar",
"Pixel",
"Nova",
"Clever"
];

```
const animals = [
    "Griffin",
    "Fox",
    "Panda",
    "Wolf",
    "Tiger",
    "Raven",
    "Falcon",
    "Otter",
    "Koala",
    "Hawk",
    "Dragon",
    "Rabbit"
];

const adjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];

const animal =
    animals[Math.floor(Math.random() * animals.length)];

return `${adjective}${animal}`;
```

}

async function generateUniqueUsername() {
for (let attempt = 0; attempt < 25; attempt++) {
const candidate = generateReadableUsername();

```
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("id")
        .eq("username", candidate)
        .maybeSingle();

    if (error && error.code !== "PGRST116") {
        console.warn("Username availability check failed:", error);
        continue;
    }

    if (!data) {
        return candidate;
    }
}

return `QUser${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
```

}

function normalizeProfile(profile) {
if (!profile) return null;

```
return {
    ...profile,
    display_name:
        profile.display_name?.trim() || "",
    username:
        profile.username?.trim() || ""
};
```

}

function normalizeMessage(message) {
if (!message) return null;

```
return {
    ...message,
    id: message.id,
    sender_id: message.sender_id,
    receiver_id: message.receiver_id,
    text: message.text || "",
    message_type: message.message_type || "text",
    media_path: message.media_path || null,
    created_at: message.created_at || new Date().toISOString()
};
```

}

/* =========================================================
THEME
========================================================= */

function loadTheme() {
const savedTheme =
localStorage.getItem("q1-theme") || "light";

```
state.currentTheme =
    savedTheme === "dark" ? "dark" : "light";

document.documentElement.dataset.theme =
    state.currentTheme;

document.body?.classList.toggle(
    "dark",
    state.currentTheme === "dark"
);

if (dom.themeToggle) {
    if (
        dom.themeToggle.type === "checkbox" ||
        dom.themeToggle.type === "radio"
    ) {
        dom.themeToggle.checked =
            state.currentTheme === "dark";
    }
}
```

}

function applyTheme(theme) {
state.currentTheme =
theme === "dark" ? "dark" : "light";

```
document.documentElement.dataset.theme =
    state.currentTheme;

document.body?.classList.toggle(
    "dark",
    state.currentTheme === "dark"
);

localStorage.setItem(
    "q1-theme",
    state.currentTheme
);

if (dom.themeToggle) {
    if (
        dom.themeToggle.type === "checkbox" ||
        dom.themeToggle.type === "radio"
    ) {
        dom.themeToggle.checked =
            state.currentTheme === "dark";
    }
}
```

}

/* =========================================================
AUTH
========================================================= */

async function ensureAnonymousAuth() {
try {
const {
data: sessionData,
error: sessionError
} = await supabaseClient.auth.getSession();

```
    if (sessionError) {
        throw sessionError;
    }

    if (sessionData?.session?.user) {
        state.user = sessionData.session.user;
        return state.user;
    }

    const {
        data,
        error
    } = await supabaseClient.auth.signInAnonymously();

    if (error) {
        throw error;
    }

    if (!data?.user) {
        throw new Error("Anonymous authentication did not return a user.");
    }

    state.user = data.user;

    return state.user;
} catch (error) {
    showError(
        "Authentication failed. Check Supabase Auth settings.",
        error
    );

    throw error;
}
```

}

function setupAuthListener() {
supabaseClient.auth.onAuthStateChange(
async (_event, session) => {
if (!session?.user) return;

```
        if (!state.user || state.user.id !== session.user.id) {
            state.user = session.user;

            try {
                await ensureProfile();
                await startApplicationData();
            } catch (error) {
                showError(
                    "Could not restore your Q1 Chat session.",
                    error
                );
            }
        }
    }
);
```

}

/* =========================================================
PROFILE
========================================================= */

async function ensureProfile() {
if (!state.user) {
throw new Error("No authenticated user.");
}

```
const {
    data: existing,
    error: fetchError
} = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .maybeSingle();

if (fetchError && fetchError.code !== "PGRST116") {
    throw fetchError;
}

if (existing) {
    state.profile = normalizeProfile(existing);

    if (!state.profile.username) {
        const username = await generateUniqueUsername();

        const {
            data: updated,
            error: updateError
        } = await supabaseClient
            .from("profiles")
            .update({
                username,
                updated_at: new Date().toISOString()
            })
            .eq("id", state.user.id)
            .select()
            .single();

        if (updateError) {
            console.warn(
                "Could not generate username:",
                updateError
            );
        } else {
            state.profile = normalizeProfile(updated);
        }
    }

    return state.profile;
}

const username = await generateUniqueUsername();

const newProfile = {
    id: state.user.id,
    username,
    display_name: "",
    gender: null,
    avatar_url: null
};

const {
    data,
    error
} = await supabaseClient
    .from("profiles")
    .insert(newProfile)
    .select()
    .single();

if (error) {
    if (error.code === "23505") {
        const retryUsername = await generateUniqueUsername();

        const retry = await supabaseClient
            .from("profiles")
            .insert({
                ...newProfile,
                username: retryUsername
            })
            .select()
            .single();

        if (retry.error) {
            throw retry.error;
        }

        state.profile = normalizeProfile(retry.data);

        return state.profile;
    }

    throw error;
}

state.profile = normalizeProfile(data);

return state.profile;
```

}

function renderOwnProfile() {
if (!state.profile) return;

```
setImageSource(
    dom.myProfileAvatar,
    state.profile
);

if (dom.displayName) {
    dom.displayName.value =
        state.profile.display_name || "";
}

if (dom.gender) {
    dom.gender.value =
        state.profile.gender || "";
}
```

}

async function saveProfile() {
if (!state.user) return;

```
const displayName =
    dom.displayName?.value.trim() || "";

const gender =
    dom.gender?.value || null;

try {
    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .update({
            display_name: displayName,
            gender,
            updated_at: new Date().toISOString()
        })
        .eq("id", state.user.id)
        .select()
        .single();

    if (error) throw error;

    state.profile = normalizeProfile(data);

    renderOwnProfile();
    renderUsers();

    if (state.selectedUser) {
        renderChatHeader();
    }

    setStatus("Profile saved.");
} catch (error) {
    showError(
        "Could not save your profile.",
        error
    );
}
```

}

async function uploadProfilePhoto(file) {
if (!file || !state.user) return;

```
const validation = validateImageFile(file);

if (!validation.valid) {
    showError(validation.message);
    return;
}

try {
    setStatus("Uploading profile photo...");

    const extension =
        getSafeExtension(file.name) || "jpg";

    const path =
        `${state.user.id}/profile-${crypto.randomUUID()}.${extension}`;

    const {
        error: uploadError
    } = await supabaseClient
        .storage
        .from("profile-photos")
        .upload(path, file, {
            upsert: false,
            contentType: file.type,
            cacheControl: "3600"
        });

    if (uploadError) {
        throw uploadError;
    }

    const {
        data: publicData
    } = supabaseClient
        .storage
        .from("profile-photos")
        .getPublicUrl(path);

    const avatarUrl =
        publicData?.publicUrl || null;

    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
        })
        .eq("id", state.user.id)
        .select()
        .single();

    if (error) {
        throw error;
    }

    state.profile = normalizeProfile(data);

    renderOwnProfile();
    renderUsers();

    if (state.selectedUser) {
        renderChatHeader();
    }

    setStatus("Profile photo updated.");
} catch (error) {
    showError(
        "Profile photo upload failed.",
        error
    );
}
```

}

/* =========================================================
FRIENDS
========================================================= */

async function loadFriends() {
if (!state.user) return;

```
try {
    const {
        data,
        error
    } = await supabaseClient
        .from("friends")
        .select("*")
        .or(
            `requester_id.eq.${state.user.id},receiver_id.eq.${state.user.id}`
        );

    if (error) {
        if (
            error.code === "42P01" ||
            error.code === "PGRST205"
        ) {
            console.warn(
                "Friends table is not available."
            );

            state.friends = [];
            state.incomingRequests = [];
            state.outgoingRequests = [];

            return;
        }

        throw error;
    }

    state.friends = [];
    state.incomingRequests = [];
    state.outgoingRequests = [];

    for (const row of data || []) {
        const otherId =
            row.requester_id === state.user.id
                ? row.receiver_id
                : row.requester_id;

        const normalized = {
            ...row,
            user_id: otherId
        };

        if (row.status === "accepted") {
            state.friends.push(normalized);
        } else if (
            row.status === "pending" &&
            row.receiver_id === state.user.id
        ) {
            state.incomingRequests.push(normalized);
        } else if (
            row.status === "pending" &&
            row.requester_id === state.user.id
        ) {
            state.outgoingRequests.push(normalized);
        }
    }

    renderUsers();

    if (state.selectedUser) {
        renderFriendButton();
    }
} catch (error) {
    showError(
        "Could not load friends.",
        error
    );
}
```

}

async function findFriendRow(userId) {
if (!state.user || !userId) return null;

```
const {
    data,
    error
} = await supabaseClient
    .from("friends")
    .select("*")
    .or(
        `and(requester_id.eq.${state.user.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${state.user.id})`
    )
    .maybeSingle();

if (error && error.code !== "PGRST116") {
    throw error;
}

return data || null;
```

}

async function sendFriendRequest(userId) {
if (!state.user || !userId) return;

```
try {
    const existing = await findFriendRow(userId);

    if (existing) {
        if (existing.status === "accepted") {
            setStatus("You are already friends.");
            return;
        }

        if (existing.status === "pending") {
            setStatus("Friend request already exists.");
            return;
        }
    }

    const {
        error
    } = await supabaseClient
        .from("friends")
        .insert({
            requester_id: state.user.id,
            receiver_id: userId,
            status: "pending"
        });

    if (error) throw error;

    await loadFriends();

    renderFriendButton();

    setStatus("Friend request sent.");
} catch (error) {
    showError(
        "Could not send friend request.",
        error
    );
}
```

}

async function acceptFriendRequest(userId) {
if (!state.user || !userId) return;

```
try {
    const row = await findFriendRow(userId);

    if (!row) {
        throw new Error("Friend request was not found.");
    }

    const {
        error
    } = await supabaseClient
        .from("friends")
        .update({
            status: "accepted",
            updated_at: new Date().toISOString()
        })
        .eq("id", row.id);

    if (error) throw error;

    await loadFriends();

    renderFriendButton();

    setStatus("Friend request accepted.");
} catch (error) {
    showError(
        "Could not accept friend request.",
        error
    );
}
```

}

async function rejectFriendRequest(userId) {
if (!state.user || !userId) return;

```
try {
    const row = await findFriendRow(userId);

    if (!row) return;

    const {
        error
    } = await supabaseClient
        .from("friends")
        .delete()
        .eq("id", row.id);

    if (error) throw error;

    await loadFriends();

    renderFriendButton();

    setStatus("Friend request rejected.");
} catch (error) {
    showError(
        "Could not reject friend request.",
        error
    );
}
```

}

async function removeFriend(userId) {
if (!state.user || !userId) return;

```
try {
    const row = await findFriendRow(userId);

    if (!row) return;

    const {
        error
    } = await supabaseClient
        .from("friends")
        .delete()
        .eq("id", row.id);

    if (error) throw error;

    await loadFriends();

    renderFriendButton();

    setStatus("Friend removed.");
} catch (error) {
    showError(
        "Could not remove friend.",
        error
    );
}
```

}

function renderFriendButton() {
if (!dom.addFriend || !state.selectedUser) return;

```
const userId = state.selectedUser.id;

dom.addFriend.disabled = false;
dom.addFriend.dataset.userId = userId;

if (isFriend(userId)) {
    dom.addFriend.textContent = "✓ Friends";
    dom.addFriend.classList.add("is-friend");
    return;
}

if (hasIncomingRequest(userId)) {
    dom.addFriend.textContent = "Accept Friend";
    dom.addFriend.classList.remove("is-friend");
    return;
}

if (hasOutgoingRequest(userId)) {
    dom.addFriend.textContent = "⏳ Request Sent";
    dom.addFriend.classList.remove("is-friend");
    return;
}

dom.addFriend.textContent = "❤️ Add Friend";
dom.addFriend.classList.remove("is-friend");
```

}

async function handleFriendButton() {
if (!state.selectedUser) return;

```
const userId = state.selectedUser.id;

if (isFriend(userId)) {
    await removeFriend(userId);
    return;
}

if (hasIncomingRequest(userId)) {
    await acceptFriendRequest(userId);
    return;
}

if (hasOutgoingRequest(userId)) {
    setStatus("Friend request is already pending.");
    return;
}

await sendFriendRequest(userId);
```

}

/* =========================================================
BLOCK SYSTEM
========================================================= */

async function loadBlockedUsers() {
if (!state.user) return;

```
try {
    const {
        data,
        error
    } = await supabaseClient
        .from("blocks")
        .select("*")
        .eq("blocker_id", state.user.id);

    if (error) {
        if (
            error.code === "42P01" ||
            error.code === "PGRST205"
        ) {
            state.blockedUsers = [];
            return;
        }

        throw error;
    }

    state.blockedUsers = data || [];

    renderUsers();

    if (state.selectedUser) {
        renderBlockButton();
    }
} catch (error) {
    showError(
        "Could not load blocked users.",
        error
    );
}
```

}

async function blockUser(userId) {
if (!state.user || !userId) return;

```
if (userId === state.user.id) return;

try {
    const {
        error
    } = await supabaseClient
        .from("blocks")
        .upsert(
            {
                blocker_id: state.user.id,
                blocked_id: userId
            },
            {
                onConflict: "blocker_id,blocked_id"
            }
        );

    if (error) throw error;

    state.blockedUsers.push({
        blocker_id: state.user.id,
        blocked_id: userId,
        user_id: userId
    });

    state.blockedUsers = [
        ...new Map(
            state.blockedUsers.map((row) => [
                `${row.blocker_id}:${row.blocked_id}`,
                row
            ])
        ).values()
    ];

    renderBlockButton();
    renderUsers();

    setStatus("User blocked.");
} catch (error) {
    showError(
        "Could not block this user.",
        error
    );
}
```

}

async function unblockUser(userId) {
if (!state.user || !userId) return;

```
try {
    const {
        error
    } = await supabaseClient
        .from("blocks")
        .delete()
        .eq("blocker_id", state.user.id)
        .eq("blocked_id", userId);

    if (error) throw error;

    state.blockedUsers =
        state.blockedUsers.filter(
            (row) =>
                row.blocked_id !== userId &&
                row.user_id !== userId
        );

    renderBlockButton();
    renderUsers();

    setStatus("User unblocked.");
} catch (error) {
    showError(
        "Could not unblock this user.",
        error
    );
}
```

}

function renderBlockButton() {
if (!dom.block || !state.selectedUser) return;

```
const blocked = isBlocked(
    state.selectedUser.id
);

dom.block.textContent =
    blocked ? "✓ Unblock" : "🚫 Block";
```

}

/* =========================================================
REPORT
========================================================= */

async function reportUser(userId) {
if (!state.user || !userId) return;

```
const reason = window.prompt(
    "Why are you reporting this user?",
    "Inappropriate or unsafe behavior"
);

if (!reason) return;

try {
    const payload = {
        reporter_id: state.user.id,
        reported_id: userId,
        reason: reason.trim()
    };

    const {
        error
    } = await supabaseClient
        .from("reports")
        .insert(payload);

    if (error) {
        if (
            error.code === "42P01" ||
            error.code === "PGRST205"
        ) {
            throw new Error(
                "Reports table is not configured in Supabase."
            );
        }

        throw error;
    }

    setStatus("Report submitted. Thank you.");
} catch (error) {
    showError(
        "Could not submit report.",
        error
    );
}
```

}

/* =========================================================
PRESENCE
========================================================= */

async function startPresence() {
if (!state.user || state.presenceStarted) {
return;
}

```
if (state.channels.presence) {
    try {
        await supabaseClient.removeChannel(
            state.channels.presence
        );
    } catch (_) {}

    state.channels.presence = null;
}

const channel =
    supabaseClient.channel(
        "q1-online-users",
        {
            config: {
                presence: {
                    key: state.user.id
                }
            }
        }
    );

channel
    .on(
        "presence",
        {
            event: "sync"
        },
        () => {
            const presenceState =
                channel.presenceState();

            const onlineIds =
                new Set();

            Object.keys(
                presenceState || {}
            ).forEach((key) => {
                if (isValidUUID(key)) {
                    onlineIds.add(key);
                }
            });

            state.onlineUsers =
                onlineIds;

            renderUsers();

            if (state.selectedUser) {
                renderChatHeader();
            }
        }
    )
    .on(
        "presence",
        {
            event: "join"
        },
        ({ key }) => {
            if (key) {
                state.onlineUsers.add(key);
                renderUsers();

                if (
                    state.selectedUser?.id === key
                ) {
                    renderChatHeader();
                }
            }
        }
    )
    .on(
        "presence",
        {
            event: "leave"
        },
        ({ key }) => {
            if (key) {
                state.onlineUsers.delete(key);
                renderUsers();

                if (
                    state.selectedUser?.id === key
                ) {
                    renderChatHeader();
                }
            }
        }
    );

const status =
    await new Promise((resolve) => {
        let finished = false;

        const timeout =
            setTimeout(() => {
                if (!finished) {
                    finished = true;
                    resolve("TIMED_OUT");
                }
            }, 10000);

        channel.subscribe(
            async (subscribeStatus) => {
                if (
                    subscribeStatus === "SUBSCRIBED"
                ) {
                    clearTimeout(timeout);

                    try {
                        await channel.track({
                            user_id: state.user.id,
                            online_at:
                                new Date().toISOString()
                        });
                    } catch (error) {
                        console.warn(
                            "Presence track failed:",
                            error
                        );
                    }

                    if (!finished) {
                        finished = true;
                        resolve("SUBSCRIBED");
                    }
                } else if (
                    subscribeStatus === "CHANNEL_ERROR" ||
                    subscribeStatus === "TIMED_OUT" ||
                    subscribeStatus === "CLOSED"
                ) {
                    clearTimeout(timeout);

                    if (!finished) {
                        finished = true;
                        resolve(subscribeStatus);
                    }
                }
            }
        );
    });

if (status === "SUBSCRIBED") {
    state.channels.presence = channel;
    state.presenceStarted = true;

    console.log("Q1 presence: SUBSCRIBED");
    return;
}

console.warn(
    "Q1 presence subscription:",
    status
);
```

}

async function stopPresence() {
state.presenceStarted = false;

```
if (state.channels.presence) {
    try {
        await supabaseClient.removeChannel(
            state.channels.presence
        );
    } catch (_) {}

    state.channels.presence = null;
}

state.onlineUsers.clear();
```

}

/* =========================================================
USERS
========================================================= */

async function loadUsers() {
if (!state.user || state.loadingUsers) return;

```
state.loadingUsers = true;

try {
    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select("*")
        .neq("id", state.user.id)
        .order("updated_at", {
            ascending: false,
            nullsFirst: false
        });

    if (error) throw error;

    state.users =
        (data || [])
            .map(normalizeProfile)
            .filter(Boolean);

    state.users.sort(
        (a, b) =>
            getDisplayName(a).localeCompare(
                getDisplayName(b)
            )
    );

    renderUsers();
} catch (error) {
    showError(
        "Could not load people.",
        error
    );
} finally {
    state.loadingUsers = false;
}
```

}

function userMatchesSearch(user) {
if (!state.searchTerm) return true;

```
const term =
    state.searchTerm.toLowerCase();

const displayName =
    getDisplayName(user).toLowerCase();

const username =
    getUsername(user).toLowerCase();

return (
    displayName.includes(term) ||
    username.includes(term)
);
```

}

function userMatchesFilter(user) {
switch (state.activeFilter) {
case "online":
return isOnline(user.id);

```
    case "unread":
        return getUnreadCount(user.id) > 0;

    case "friends":
        return isFriend(user.id);

    case "recent":
        return true;

    case "all":
    default:
        return true;
}
```

}

function getSortedFilteredUsers() {
let users =
state.users.filter(user =>
userMatchesSearch(user) &&
userMatchesFilter(user)
);

```
if (state.activeFilter === "recent") {
    users.sort((a, b) =>
        formatRecentTime(b.updated_at) -
        formatRecentTime(a.updated_at)
    );
} else {
    users.sort((a, b) => {
        const unreadDifference =
            getUnreadCount(b.id) -
            getUnreadCount(a.id);

        if (unreadDifference !== 0) {
            return unreadDifference;
        }

        const onlineDifference =
            Number(isOnline(b.id)) -
            Number(isOnline(a.id));

        if (onlineDifference !== 0) {
            return onlineDifference;
        }

        return getDisplayName(a)
            .localeCompare(
                getDisplayName(b)
            );
    });
}

return users;
```

}

function renderUsers() {
if (!dom.users) return;

```
const users =
    getSortedFilteredUsers();

state.filteredUsers = users;

if (dom.userCount) {
    dom.userCount.textContent =
        String(state.users.length);
}

if (!users.length) {
    dom.users.innerHTML = `
        <div class="empty-users">
            No people found.
        </div>
    `;
    return;
}

dom.users.innerHTML =
    users.map(user => {
        const selected =
            state.selectedUser?.id === user.id;

        const online =
            isOnline(user.id);

        const unread =
            getUnreadCount(user.id);

        const friend =
            isFriend(user.id);

        return `
            <button
                type="button"
                class="user-item ${selected ? "selected" : ""}"
                data-user-id="${escapeAttribute(user.id)}"
            >
                <span class="user-avatar-wrap">
                    <img
                        class="user-avatar"
                        src="${escapeAttribute(getAvatar(user))}"
                        alt="${escapeAttribute(getDisplayName(user))}"
                        loading="lazy"
                    >
                    <span
                        class="presence-dot ${online ? "online" : "offline"}"
                        aria-label="${online ? "Online" : "Offline"}"
                    ></span>
                </span>

                <span class="user-item-content">
                    <span class="user-item-top">
                        <strong>
                            ${escapeHTML(getDisplayName(user))}
                        </strong>

                        ${
                            unread > 0
                                ? `<span class="unread-count">${unread}</span>`
                                : ""
                        }
                    </span>

                    <span class="user-username">
                        @${escapeHTML(getUsername(user))}
                    </span>

                    <span class="user-meta">
                        ${
                            online
                                ? "Online"
                                : "Offline"
                        }

                        ${
                            friend
                                ? " • Friends"
                                : ""
                        }
                    </span>
                </span>
            </button>
        `;
    }).join("");
```

}

async function selectUser(userId) {
if (!userId || !state.user) return;

```
const user =
    state.users.find(
        item => item.id === userId
    );

if (!user) return;

state.selectedUser = user;

setUnreadCount(userId, 0);

renderUsers();
renderChatHeader();
renderFriendButton();
renderBlockButton();

await loadMessages(userId);

if (dom.input) {
    dom.input.focus();
}

document.body.classList.add(
    "chat-open"
);

scrollMessagesToBottom(true);
```

}

/* =========================================================
MESSAGES
========================================================= */

function isOwnMessage(message) {
return (
message.sender_id ===
state.user?.id
);
}

function messagesForSelectedUser() {
if (!state.selectedUser) return [];

```
const otherId =
    state.selectedUser.id;

return state.messages.filter(
    message =>
        (
            message.sender_id === state.user.id &&
            message.receiver_id === otherId
        ) ||
        (
            message.sender_id === otherId &&
            message.receiver_id === state.user.id
        )
);
```

}

async function loadMessages(userId) {
if (!state.user || !userId) return;

```
state.loadingMessages = true;

try {
    const {
        data,
        error
    } = await supabaseClient
        .from("messages")
        .select("*")
        .or(
            `and(sender_id.eq.${state.user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${state.user.id})`
        )
        .order("created_at", {
            ascending: true
        });

    if (error) throw error;

    state.messages =
        (data || [])
            .map(normalizeMessage)
            .filter(Boolean);

    renderMessages();
    scrollMessagesToBottom(true);
} catch (error) {
    showError(
        "Could not load messages.",
        error
    );

    if (dom.messages) {
        dom.messages.innerHTML = `
            <div class="message-error">
                Could not load messages.
            </div>
        `;
    }
} finally {
    state.loadingMessages = false;
}
```

}

function messageExists(messageId) {
return state.messages.some(
message => message.id === messageId
);
}

function addMessageToState(message) {
if (!message?.id) return false;

```
if (messageExists(message.id)) {
    return false;
}

state.messages.push(
    normalizeMessage(message)
);

state.messages.sort(
    (a, b) =>
        new Date(a.created_at) -
        new Date(b.created_at)
);

return true;
```

}

function renderMessages() {
if (!dom.messages) return;

```
const conversation =
    messagesForSelectedUser();

if (!state.selectedUser) {
    dom.messages.innerHTML = `
        <div class="empty-chat">
            Select someone to start chatting.
        </div>
    `;
    return;
}

if (!conversation.length) {
    dom.messages.innerHTML = `
        <div class="empty-chat">
            <strong>Start a conversation</strong>
            <span>Send a message to ${escapeHTML(getDisplayName(state.selectedUser))}.</span>
        </div>
    `;
    return;
}

dom.messages.innerHTML =
    conversation.map(renderMessageHTML).join("");
```

}

function renderMessageHTML(message) {
const own = isOwnMessage(message);

```
let body = "";

if (message.message_type === "image") {
    body = `
        <div class="message-media">
            <img
                class="chat-image"
                data-media-path="${escapeAttribute(message.media_path || "")}"
                alt="Shared image"
                loading="lazy"
            >
        </div>
    `;
} else if (message.message_type === "video") {
    body = `
        <div class="message-media">
            <video
                class="chat-video"
                data-media-path="${escapeAttribute(message.media_path || "")}"
                controls
                preload="metadata"
            ></video>
        </div>
    `;
} else if (message.message_type === "link") {
    const url =
        sanitizeUrl(message.text);

    body = url
        ? `
            <a
                class="chat-link"
                href="${escapeAttribute(url)}"
                target="_blank"
                rel="noopener noreferrer"
            >
                ${escapeHTML(message.text)}
            </a>
        `
        : escapeHTML(message.text);
} else {
    body =
        escapeHTML(message.text)
            .replace(/\n/g, "<br>");
}

return `
    <div
        class="message-row ${own ? "own" : "other"}"
        data-message-id="${escapeAttribute(message.id)}"
    >
        <div class="message-bubble">
            ${body}
            <time class="message-time">
                ${escapeHTML(formatTime(message.created_at))}
            </time>
        </div>
    </div>
`;
```

}

function sanitizeUrl(value) {
if (!value) return null;

```
let candidate =
    String(value).trim();

if (
    !candidate.startsWith("http://") &&
    !candidate.startsWith("https://")
) {
    candidate =
        `https://${candidate}`;
}

try {
    const url =
        new URL(candidate);

    if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
    ) {
        return null;
    }

    return url.href;
} catch (_) {
    return null;
}
```

}

async function resolveMediaUrl(path) {
if (!path) return null;

```
if (
    path.startsWith("http://") ||
    path.startsWith("https://")
) {
    return path;
}

const {
    data,
    error
} = await supabaseClient
    .storage
    .from("chat-media")
    .createSignedUrl(
        path,
        60 * 60
    );

if (error) {
    console.warn(
        "Signed URL creation failed:",
        error
    );

    return null;
}

return data?.signedUrl || null;
```

}

async function hydrateMediaMessages() {
if (!dom.messages) return;

```
const images =
    dom.messages.querySelectorAll(
        "img[data-media-path]"
    );

const videos =
    dom.messages.querySelectorAll(
        "video[data-media-path]"
    );

for (const image of images) {
    const path =
        image.dataset.mediaPath;

    const url =
        await resolveMediaUrl(path);

    if (url) {
        image.src = url;
    } else {
        image.alt =
            "Media unavailable";
    }
}

for (const video of videos) {
    const path =
        video.dataset.mediaPath;

    const url =
        await resolveMediaUrl(path);

    if (url) {
        video.src = url;
    }
}
```

}

async function sendTextMessage() {
if (!state.user || !state.selectedUser) return;

```
const text =
    dom.input?.value.trim() || "";

if (!text) return;

if (text.length > 2000) {
    showError(
        "Message is too long. Maximum 2000 characters."
    );
    return;
}

if (
    isConversationBlocked(
        state.selectedUser.id
    )
) {
    showError(
        "You cannot message this user while blocked."
    );
    return;
}

if (state.sendingMessage) return;

state.sendingMessage = true;

try {
    const {
        data,
        error
    } = await supabaseClient
        .from("messages")
        .insert({
            sender_id: state.user.id,
            receiver_id: state.selectedUser.id,
            text,
            message_type: "text"
        })
        .select()
        .single();

    if (error) throw error;

    addMessageToState(
        normalizeMessage(data)
    );

    renderMessages();
    scrollMessagesToBottom(true);

    dom.input.value = "";
    updateCharacterCount();
} catch (error) {
    showError(
        "Message could not be sent.",
        error
    );
} finally {
    state.sendingMessage = false;
}
```

}

/* =========================================================
MEDIA
========================================================= */

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
"image/jpeg",
"image/png",
"image/webp",
"image/gif"
];

const ALLOWED_VIDEO_TYPES = [
"video/mp4",
"video/webm",
"video/quicktime"
];

function getSafeExtension(filename = "") {
const match =
filename.toLowerCase().match(
/.([a-z0-9]+)$/
);

```
if (!match) return "";

const extension =
    match[1];

const allowed = [
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "mp4",
    "webm",
    "mov"
];

return allowed.includes(extension)
    ? extension
    : "";
```

}

function validateImageFile(file) {
if (!file) {
return {
valid: false,
message: "No image selected."
};
}

```
if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
        valid: false,
        message: "Only JPG, PNG, WEBP or GIF images are allowed."
    };
}

if (file.size > MAX_IMAGE_SIZE) {
    return {
        valid: false,
        message: "Image must be 10 MB or smaller."
    };
}

return {
    valid: true
};
```

}

function validateVideoFile(file) {
if (!file) {
return {
valid: false,
message: "No video selected."
};
}

```
if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return {
        valid: false,
        message: "Only MP4, WebM or MOV videos are allowed."
    };
}

if (file.size > MAX_VIDEO_SIZE) {
    return {
        valid: false,
        message: "Video must be 50 MB or smaller."
    };
}

return {
    valid: true
};
```

}

async function canShareMedia() {
if (!state.selectedUser) {
showError(
"Select a person first."
);
return false;
}

```
if (
    !isFriend(
        state.selectedUser.id
    )
) {
    showError(
        "Only accepted friends can share images and videos."
    );
    return false;
}

if (
    isConversationBlocked(
        state.selectedUser.id
    )
) {
    showError(
        "You cannot share media while this user is blocked."
    );
    return false;
}

return true;
```

}

async function uploadChatMedia(file, type) {
if (!state.user || !state.selectedUser) return;

```
if (!(await canShareMedia())) {
    return;
}

const validation =
    type === "image"
        ? validateImageFile(file)
        : validateVideoFile(file);

if (!validation.valid) {
    showError(validation.message);
    return;
}

if (state.uploadingMedia) return;

state.uploadingMedia = true;

try {
    setStatus(
        `Uploading ${type}...`
    );

    const extension =
        getSafeExtension(file.name);

    if (!extension) {
        throw new Error(
            "Unsupported file extension."
        );
    }

    const path =
        `${state.user.id}/${state.selectedUser.id}/${crypto.randomUUID()}.${extension}`;

    const {
        error: uploadError
    } = await supabaseClient
        .storage
        .from("chat-media")
        .upload(
            path,
            file,
            {
                upsert: false,
                contentType: file.type,
                cacheControl: "3600"
            }
        );

    if (uploadError) {
        throw uploadError;
    }

    const {
        data,
        error
    } = await supabaseClient
        .from("messages")
        .insert({
            sender_id: state.user.id,
            receiver_id: state.selectedUser.id,
            text: "",
            message_type: type,
            media_path: path
        })
        .select()
        .single();

    if (error) {
        try {
            await supabaseClient
                .storage
                .from("chat-media")
                .remove([path]);
        } catch (_) {}

        throw error;
    }

    addMessageToState(
        normalizeMessage(data)
    );

    renderMessages();
    await hydrateMediaMessages();

    scrollMessagesToBottom(true);

    setStatus(
        `${type === "image" ? "Image" : "Video"} sent.`
    );
} catch (error) {
    showError(
        `Could not upload ${type}.`,
        error
    );
} finally {
    state.uploadingMedia = false;
}
```

}

async function sendLinkMessage() {
if (!state.user || !state.selectedUser) return;

```
const input =
    window.prompt(
        "Paste a link to send:"
    );

if (!input) return;

const url =
    sanitizeUrl(input);

if (!url) {
    showError(
        "Please enter a valid HTTP or HTTPS link."
    );
    return;
}

if (
    isConversationBlocked(
        state.selectedUser.id
    )
) {
    showError(
        "You cannot message this user while blocked."
    );
    return;
}

try {
    const {
        data,
        error
    } = await supabaseClient
        .from("messages")
        .insert({
            sender_id: state.user.id,
            receiver_id: state.selectedUser.id,
            text: url,
            message_type: "link"
        })
        .select()
        .single();

    if (error) throw error;

    addMessageToState(
        normalizeMessage(data)
    );

    renderMessages();
    scrollMessagesToBottom(true);
} catch (error) {
    showError(
        "Could not send link.",
        error
    );
}
```

}

/* =========================================================
PRIVATE CHAT
========================================================= */

async function hashPIN(pin) {
const encoder =
new TextEncoder();

```
const data =
    encoder.encode(pin);

const hash =
    await crypto.subtle.digest(
        "SHA-256",
        data
    );

return Array.from(
    new Uint8Array(hash)
)
    .map(
        byte =>
            byte.toString(16).padStart(2, "0")
    )
    .join("");
```

}

async function setupPrivateChatPin() {
if (!state.user || !dom.privateChatPin) return;

```
const pin =
    dom.privateChatPin.value.trim();

if (!/^\d{4,12}$/.test(pin)) {
    showError(
        "PIN must contain 4 to 12 digits."
    );
    return;
}

try {
    const pinHash =
        await hashPIN(pin);

    /*
     * The preferred schema stores only the hash:
     * private_chat_pin_hash
     *
     * If the column/table is not installed yet,
     * this operation will fail rather than pretending
     * that a PIN was saved.
     */

    const {
        error
    } = await supabaseClient
        .from("profiles")
        .update({
            private_chat_pin_hash: pinHash,
            updated_at: new Date().toISOString()
        })
        .eq("id", state.user.id);

    if (error) {
        throw error;
    }

    state.privateUnlocked = true;

    if (dom.privateChatStatus) {
        dom.privateChatStatus.textContent =
            "Private Chat PIN is configured.";
    }

    setStatus(
        "Private Chat PIN saved."
    );

    dom.privateChatPin.value = "";
} catch (error) {
    showError(
        "Could not save Private Chat PIN. Make sure the private chat SQL migration is installed.",
        error
    );
}
```

}

async function unlockPrivateChat() {
if (!state.user || !dom.privateChatPin) return;

```
const pin =
    dom.privateChatPin.value.trim();

if (!/^\d{4,12}$/.test(pin)) {
    showError(
        "Enter your 4–12 digit PIN."
    );
    return;
}

try {
    const pinHash =
        await hashPIN(pin);

    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select("private_chat_pin_hash")
        .eq("id", state.user.id)
        .maybeSingle();

    if (error) throw error;

    if (!data?.private_chat_pin_hash) {
        showError(
            "No Private Chat PIN has been configured yet."
        );
        return;
    }

    if (
        data.private_chat_pin_hash !==
        pinHash
    ) {
        showError(
            "Incorrect Private Chat PIN."
        );
        return;
    }

    state.privateUnlocked = true;

    closeDialog(
        dom.privateChatDialog
    );

    if (dom.privateChatStatus) {
        dom.privateChatStatus.textContent =
            "Private Chat unlocked for this session.";
    }

    setStatus(
        "Private Chat unlocked."
    );

    openPrivateChat();
} catch (error) {
    showError(
        "Could not unlock Private Chat.",
        error
    );
}
```

}

function openPrivateChat() {
if (!state.privateUnlocked) {
openDialog(
dom.privateChatDialog
);
return;
}

```
/*
 * The actual private-chat data should be loaded
 * only through RLS-protected private tables.
 *
 * This function intentionally does not expose
 * another user's private data.
 */

setStatus(
    "Private Chat is unlocked for this session."
);

if (dom.privateChatStatus) {
    dom.privateChatStatus.textContent =
        "Unlocked for this session.";
}
```

}

/* =========================================================
BLOCKED USERS UI
========================================================= */

async function renderBlockedUsers() {
if (!dom.blockedList) return;

```
if (!state.blockedUsers.length) {
    dom.blockedList.innerHTML = `
        <div class="empty-blocked">
            No blocked users.
        </div>
    `;
    return;
}

const ids =
    state.blockedUsers
        .map(
            row =>
                row.blocked_id ||
                row.user_id
        )
        .filter(Boolean);

let profiles = [];

try {
    const {
        data,
        error
    } = await supabaseClient
        .from("profiles")
        .select("*")
        .in("id", ids);

    if (error) throw error;

    profiles = data || [];
} catch (error) {
    console.warn(
        "Could not load blocked profiles:",
        error
    );
}

dom.blockedList.innerHTML =
    state.blockedUsers.map(row => {
        const id =
            row.blocked_id ||
            row.user_id;

        const profile =
            profiles.find(
                item => item.id === id
            );

        return `
            <div class="blocked-item">
                <div class="blocked-user-info">
                    <img
                        src="${escapeAttribute(getAvatar(profile))}"
                        alt="${escapeAttribute(getDisplayName(profile))}"
                    >

                    <span>
                        <strong>
                            ${escapeHTML(getDisplayName(profile))}
                        </strong>

                        <small>
                            @${escapeHTML(getUsername(profile))}
                        </small>
                    </span>
                </div>

                <button
                    type="button"
                    class="unblock-user"
                    data-user-id="${escapeAttribute(id)}"
                >
                    Unblock
                </button>
            </div>
        `;
    }).join("");
```

}

/* =========================================================
CHAT HEADER
========================================================= */

function renderChatHeader() {
if (!state.selectedUser) {
if (dom.chatName) {
dom.chatName.textContent =
"Select a person";
}

```
    if (dom.status) {
        dom.status.textContent = "";
    }

    return;
}

const user =
    state.selectedUser;

setImageSource(
    dom.chatAvatar,
    user
);

if (dom.chatName) {
    dom.chatName.textContent =
        getDisplayName(user);
}

if (dom.status) {
    dom.status.textContent =
        isOnline(user.id)
            ? "Online"
            : "Offline";
}

renderFriendButton();
renderBlockButton();
```

}

/* =========================================================
PROFILE DIALOG
========================================================= */

function openProfile(userId) {
const user =
state.users.find(
item => item.id === userId
);

```
if (!user || !dom.profileContent) return;

dom.profileContent.innerHTML = `
    <div class="profile-view">
        <img
            class="profile-view-avatar"
            src="${escapeAttribute(getAvatar(user))}"
            alt="${escapeAttribute(getDisplayName(user))}"
        >

        <h2>
            ${escapeHTML(getDisplayName(user))}
        </h2>

        <p>
            @${escapeHTML(getUsername(user))}
        </p>

        <p>
            ${isOnline(user.id) ? "🟢 Online" : "⚪ Offline"}
        </p>

        ${
            isFriend(user.id)
                ? `<p>❤️ Friends</p>`
                : ""
        }
    </div>
`;

openDialog(
    dom.profileDialog
);
```

}

/* =========================================================
FILTERS
========================================================= */

function setFilter(filter) {
const validFilters = [
"all",
"online",
"unread",
"recent",
"friends"
];

```
if (!validFilters.includes(filter)) {
    filter = "all";
}

state.activeFilter = filter;

document
    .querySelectorAll(
        "[data-filter]"
    )
    .forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.filter === filter
        );

        button.setAttribute(
            "aria-pressed",
            button.dataset.filter === filter
                ? "true"
                : "false"
        );
    });

renderUsers();
```

}

/* =========================================================
SETTINGS UI
========================================================= */

function openSettings() {
renderOwnProfile();

```
if (dom.privateChatStatus) {
    dom.privateChatStatus.textContent =
        state.privateUnlocked
            ? "Unlocked for this session."
            : "Locked.";
}

openDialog(
    dom.settings
);
```

}

function closeSettingsDialog() {
closeDialog(
dom.settings
);
}

/* =========================================================
REALTIME
========================================================= */

async function removeMessageChannel() {
if (!state.channels.messages) return;

```
try {
    await supabaseClient.removeChannel(
        state.channels.messages
    );
} catch (error) {
    console.warn(
        "Could not remove old message channel:",
        error
    );
}

state.channels.messages = null;
```

}

async function startMessageRealtime() {
if (!state.user) return;

```
await removeMessageChannel();

const channelName =
    `q1-global-messages-${state.user.id}`;

const channel =
    supabaseClient.channel(
        channelName
    );

channel.on(
    "postgres_changes",
    {
        event: "INSERT",
        schema: "public",
        table: "messages"
    },
    async (payload) => {
        const message =
            normalizeMessage(payload.new);

        if (!message?.id) return;

        const relevant =
            message.sender_id === state.user.id ||
            message.receiver_id === state.user.id;

        if (!relevant) return;

        const inserted =
            addMessageToState(message);

        if (!inserted) return;

        const otherUserId =
            message.sender_id === state.user.id
                ? message.receiver_id
                : message.sender_id;

        const currentlyOpen =
            state.selectedUser?.id ===
            otherUserId;

        if (
            message.sender_id !== state.user.id &&
            !currentlyOpen
        ) {
            incrementUnread(
                message.sender_id
            );
        }

        if (currentlyOpen) {
            const shouldScroll =
                isNearBottom(
                    dom.messages
                );

            renderMessages();

            await hydrateMediaMessages();

            if (shouldScroll) {
                scrollMessagesToBottom(true);
            }
        } else {
            renderUsers();
        }
    }
);

const status =
    await new Promise(resolve => {
        let finished = false;

        const timeout =
            setTimeout(() => {
                if (!finished) {
                    finished = true;
                    resolve("TIMED_OUT");
                }
            }, 10000);

        channel.subscribe(
            subscribeStatus => {
                if (
                    subscribeStatus ===
                    "SUBSCRIBED"
                ) {
                    clearTimeout(timeout);

                    if (!finished) {
                        finished = true;
                        resolve("SUBSCRIBED");
                    }
                }

                if (
                    subscribeStatus ===
                        "CHANNEL_ERROR" ||
                    subscribeStatus ===
                        "TIMED_OUT" ||
                    subscribeStatus ===
                        "CLOSED"
                ) {
                    clearTimeout(timeout);

                    if (!finished) {
                        finished = true;
                        resolve(
                            subscribeStatus
                        );
                    }
                }
            }
        );
    });

if (status === "SUBSCRIBED") {
    state.channels.messages =
        channel;

    console.log(
        "Q1 message realtime: SUBSCRIBED"
    );
    console.log(
        "Q1 realtime connected"
    );
} else {
    console.warn(
        "Q1 message realtime subscription:",
        status
    );
}
```

}

/* =========================================================
UNREAD
========================================================= */

async function loadUnreadCounts() {
if (!state.user) return;

```
/*
 * We calculate unread counts from message timestamps
 * only when a read-state table exists.
 *
 * Without a server-side read-state table, there is no
 * secure persistent unread/read marker. We therefore
 * preserve realtime-session counts in memory.
 *
 * This avoids falsely claiming persistent unread
 * functionality that the database does not provide.
 */

state.unreadCounts = {};
renderUsers();
```

}

/* =========================================================
EVENT LISTENERS
========================================================= */

function setupEventListeners() {
dom.settingsBtn?.addEventListener(
"click",
openSettings
);

```
dom.closeSettings?.addEventListener(
    "click",
    closeSettingsDialog
);

dom.save?.addEventListener(
    "click",
    async () => {
        await saveProfile();
        closeSettingsDialog();
    }
);

dom.search?.addEventListener(
    "input",
    debounce(() => {
        state.searchTerm =
            dom.search.value.trim();

        renderUsers();
    }, 150)
);

dom.users?.addEventListener(
    "click",
    async event => {
        const item =
            event.target.closest(
                "[data-user-id]"
            );

        if (!item) return;

        const userId =
            item.dataset.userId;

        if (!userId) return;

        await selectUser(userId);
    }
);

document.addEventListener(
    "click",
    event => {
        const filterButton =
            event.target.closest(
                "[data-filter]"
            );

        if (
            filterButton &&
            filterButton.dataset.filter
        ) {
            setFilter(
                filterButton.dataset.filter
            );
        }
    }
);

dom.addFriend?.addEventListener(
    "click",
    handleFriendButton
);

dom.block?.addEventListener(
    "click",
    async () => {
        if (!state.selectedUser) return;

        const userId =
            state.selectedUser.id;

        if (isBlocked(userId)) {
            await unblockUser(userId);
        } else {
            const confirmed =
                window.confirm(
                    "Block this user? You will not be able to continue normal chat with them."
                );

            if (confirmed) {
                await blockUser(userId);
            }
        }
    }
);

dom.report?.addEventListener(
    "click",
    async () => {
        if (!state.selectedUser) return;

        await reportUser(
            state.selectedUser.id
        );
    }
);

dom.input?.addEventListener(
    "input",
    updateCharacterCount
);

dom.input?.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();

            sendTextMessage();
        }
    }
);

dom.send?.addEventListener(
    "click",
    sendTextMessage
);

dom.photoBtn?.addEventListener(
    "click",
    async () => {
        if (!(await canShareMedia())) return;

        dom.photoInput?.click();
    }
);

dom.videoBtn?.addEventListener(
    "click",
    async () => {
        if (!(await canShareMedia())) return;

        dom.videoInput?.click();
    }
);

dom.linkBtn?.addEventListener(
    "click",
    sendLinkMessage
);

dom.photoInput?.addEventListener(
    "change",
    async () => {
        const file =
            dom.photoInput.files?.[0];

        if (file) {
            await uploadChatMedia(
                file,
                "image"
            );
        }

        dom.photoInput.value = "";
    }
);

dom.videoInput?.addEventListener(
    "change",
    async () => {
        const file =
            dom.videoInput.files?.[0];

        if (file) {
            await uploadChatMedia(
                file,
                "video"
            );
        }

        dom.videoInput.value = "";
    }
);

dom.profilePhotoBtn?.addEventListener(
    "click",
    () => {
        dom.profilePhotoInput?.click();
    }
);

dom.profilePhotoInput?.addEventListener(
    "change",
    async () => {
        const file =
            dom.profilePhotoInput.files?.[0];

        if (file) {
            await uploadProfilePhoto(file);
        }

        dom.profilePhotoInput.value = "";
    }
);

dom.themeToggle?.addEventListener(
    "change",
    () => {
        applyTheme(
            dom.themeToggle.checked
                ? "dark"
                : "light"
        );
    }
);

dom.blocked?.addEventListener(
    "click",
    async () => {
        await renderBlockedUsers();

        openDialog(
            dom.blockedDialog
        );
    }
);

dom.closeBlocked?.addEventListener(
    "click",
    () => {
        closeDialog(
            dom.blockedDialog
        );
    }
);

dom.blockedList?.addEventListener(
    "click",
    async event => {
        const button =
            event.target.closest(
                ".unblock-user"
            );

        if (!button) return;

        const userId =
            button.dataset.userId;

        if (!userId) return;

        await unblockUser(userId);

        await renderBlockedUsers();
    }
);

dom.privateChatSettings?.addEventListener(
    "click",
    () => {
        openDialog(
            dom.privateChatDialog
        );
    }
);

dom.privateChatBtn?.addEventListener(
    "click",
    () => {
        if (state.privateUnlocked) {
            openPrivateChat();
        } else {
            openDialog(
                dom.privateChatDialog
            );
        }
    }
);

dom.closePrivateChat?.addEventListener(
    "click",
    () => {
        closeDialog(
            dom.privateChatDialog
        );
    }
);

dom.unlockPrivateChat?.addEventListener(
    "click",
    unlockPrivateChat
);

dom.privateChatPin?.addEventListener(
    "keydown",
    event => {
        if (
            event.key === "Enter"
        ) {
            event.preventDefault();

            unlockPrivateChat();
        }
    }
);

dom.profileContent?.addEventListener(
    "click",
    event => {
        const userButton =
            event.target.closest(
                "[data-profile-user-id]"
            );

        if (!userButton) return;

        openProfile(
            userButton.dataset.profileUserId
        );
    }
);

dom.closeProfile?.addEventListener(
    "click",
    () => {
        closeDialog(
            dom.profileDialog
        );
    }
);

document.addEventListener(
    "keydown",
    event => {
        if (event.key !== "Escape") return;

        closeDialog(dom.settings);
        closeDialog(dom.blockedDialog);
        closeDialog(dom.profileDialog);
        closeDialog(dom.privateChatDialog);
    }
);

window.addEventListener(
    "beforeunload",
    () => {
        stopPresence();
        removeMessageChannel();
    }
);

window.addEventListener(
    "online",
    async () => {
        setStatus(
            "Connection restored."
        );

        if (state.user) {
            await startPresence();
            await startMessageRealtime();
        }
    }
);

window.addEventListener(
    "offline",
    () => {
        setStatus(
            "You are offline."
        );
    }
);
```

}

/* =========================================================
MOBILE
========================================================= */

function setupMobileBehavior() {
document.addEventListener(
"click",
event => {
const backButton =
event.target.closest(
"[data-chat-back]"
);

```
        if (!backButton) return;

        document.body.classList.remove(
            "chat-open"
        );

        state.selectedUser = null;

        renderUsers();
        renderChatHeader();
        renderMessages();
    }
);

/*
 * Prevent body-level touch/scroll hacks.
 * The .messages element should remain the primary
 * scroll container and CSS should provide:
 *
 * .messages {
 *     overflow-y: auto;
 *     min-height: 0;
 * }
 */
```

}

/* =========================================================
STARTUP
========================================================= */

async function startApplicationData() {
await ensureProfile();

```
renderOwnProfile();

await Promise.all([
    loadFriends(),
    loadBlockedUsers(),
    loadUsers(),
    loadUnreadCounts()
]);

await startPresence();
await startMessageRealtime();

renderUsers();
renderChatHeader();
renderMessages();

clearError();

setStatus(
    "Connected"
);

console.log(
    "Q1 Chat started successfully"
);
```

}

async function init() {
if (state.initialized) return;

```
state.initialized = true;

try {
    loadTheme();

    updateCharacterCount();

    setupEventListeners();
    setupMobileBehavior();
    setupAuthListener();

    setStatus(
        "Connecting..."
    );

    await ensureAnonymousAuth();

    await startApplicationData();
} catch (error) {
    console.error(
        "Q1 Chat startup failed:",
        error
    );

    showError(
        "Q1 Chat could not start. Check the browser console and Supabase configuration.",
        error
    );
}
```

}

if (
document.readyState ===
"loading"
) {
document.addEventListener(
"DOMContentLoaded",
init,
{
once: true
}
);
} else {
init();
}
