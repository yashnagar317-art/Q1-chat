import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {createClient} from '@supabase/supabase-js';

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const unsafe = (t) =>
  /https?:\/\/\S+|www\.\S+|\b(instagram|snapchat|onlyfans|telegram|discord)\b|\b(dm me|link in bio|follow me|add me)\b|\b(porn|nude|nudes|explicit)\b/i.test(
    t || ''
  );

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'q1-chat-backend' }));

app.post('/api/moderate', (req, res) =>
  res.json({ allowed: !unsafe(req.body?.text), reason: unsafe(req.body?.text) ? 'Message blocked by safety filter.' : undefined })
);

app.listen(port, () => console.log(`Q1 Chat backend on ${port}`));
