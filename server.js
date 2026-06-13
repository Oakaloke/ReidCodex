// ReidCodex server — Express + JSON-file storage + signed-cookie auth.
// Loads .env (if present) without a dependency, then serves the public site,
// the admin pages, and a small JSON API.

const path = require('path');
const fs = require('fs');
const express = require('express');

const storage = require('./lib/storage');
const auth = require('./lib/auth');

// --- Minimal .env loader (no dotenv dependency) ----------------------------
(function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
})();

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API: public -----------------------------------------------------------
app.get('/api/categories', (req, res) => {
  res.json({ categories: storage.getCategories() });
});

app.get('/api/posts', (req, res) => {
  const { category } = req.query;
  res.json({ posts: storage.getPosts(category) });
});

app.get('/api/posts/:id', (req, res) => {
  const post = storage.getPost(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json({ post });
});

// --- API: auth -------------------------------------------------------------
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  let ok;
  try {
    ok = auth.checkCredentials(username, password);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
  if (!ok) return res.status(401).json({ error: 'Invalid username or password.' });
  auth.setSessionCookie(res, username);
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  const session = auth.getSession(req);
  if (!session) return res.status(401).json({ authenticated: false });
  res.json({ authenticated: true, user: session.user });
});

// --- API: admin (auth required) -------------------------------------------
app.post('/api/posts', auth.requireAuth, (req, res) => {
  const { title, category, body } = req.body || {};
  if (!title || !category || !body) {
    return res.status(400).json({ error: 'title, category, and body are required.' });
  }
  const post = storage.createPost({ title, category, body });
  res.status(201).json({ post });
});

app.put('/api/posts/:id', auth.requireAuth, (req, res) => {
  const { title, category, body } = req.body || {};
  const post = storage.updatePost(req.params.id, { title, category, body });
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json({ post });
});

app.delete('/api/posts/:id', auth.requireAuth, (req, res) => {
  const ok = storage.deletePost(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Post not found' });
  res.json({ ok: true });
});

// --- Page routes -----------------------------------------------------------
// /login is a friendly alias for the login page.
app.get('/login', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));

// Static assets + the public pages (index, about, contact).
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

// Fallback: anything else goes to the home page.
app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ReidCodex running at http://localhost:${PORT}`);
});
