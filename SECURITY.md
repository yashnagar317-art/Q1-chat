# Q1 Chat — Security Guidelines

## Supabase Keys

Q1 Chat uses **two types** of Supabase keys. Keep them separate:

### 1. Publishable Key (`sb_publishable_...`)
- **Location:** `frontend/app.js`
- **Safe to commit:** ✅ Yes
- **Used by:** Frontend browser client
- **Protection:** Supabase Row-Level Security (RLS) policies protect the database
- **Example:** `sb_publishable_n8GM1QZs-3hM90160r--2A_sGrkvxtY`

### 2. Service Role Key (`sb_service_role_...`)
- **Location:** Backend environment variables only (`backend/.env`)
- **Safe to commit:** ❌ **Never**
- **Used by:** Node.js backend server
- **Purpose:** Full access for server-side operations
- **Must be private:** Keep in `.env` file, never share

---

## Environment Variables

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env` and fill in real values:

```env
SUPABASE_URL=https://ubkvpmwpvmozhbwlxhmx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<paste-your-service-role-key-here>
PORT=3000
```

**Never commit `backend/.env`** — it is ignored by `.gitignore`.

### Frontend

The frontend loads the Supabase URL and publishable key directly in `frontend/app.js`:
- `SUPABASE_URL` — public project URL ✅
- `SUPABASE_KEY` — publishable anon key ✅

These are safe to commit because RLS policies control access.

---

## What NOT to Do

1. ❌ **Never put `SUPABASE_SERVICE_ROLE_KEY` in `frontend/` code or HTML**
2. ❌ **Never commit `.env` or `.env.local` files**
3. ❌ **Never share your service role key via GitHub, email, or chat**
4. ❌ **Never disable RLS on your database tables**
5. ❌ **Never hardcode credentials in source files**

---

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yashnagar317-art/Q1-chat.git
   cd Q1-chat
   ```

2. Create backend environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```

3. Edit `backend/.env` and add your real service role key from Supabase:
   ```bash
   # Edit with your text editor
   nano backend/.env
   # or
   code backend/.env
   ```

4. Install backend dependencies:
   ```bash
   cd backend
   npm install
   cd ..
   ```

5. Start the backend:
   ```bash
   cd backend
   npm start
   ```

6. Open `frontend/index.html` in your browser or serve via GitHub Pages.

---

## RLS (Row-Level Security)

Q1 Chat relies on Supabase RLS policies to protect data:

- **Profiles table:** Users can only read all profiles (for search), but only edit their own.
- **Messages table:** Users can only read/write messages where they are sender or receiver.
- **Blocks table:** Users can only read/write blocks they created.

**Do not disable RLS** — it is your primary defense against unauthorized access.

---

## Questions?

For more on Supabase security, see:
- [Supabase Row-Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase API Keys](https://supabase.com/docs/guides/self-hosting/auth#api-keys)
