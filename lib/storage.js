// Tiny JSON-file storage. Reads/writes data/posts.json synchronously.
// Fine for a single-admin site; swap for SQLite later if needed.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'posts.json');

const DEFAULT_DATA = {
  categories: ['News', 'Guides', 'Updates', 'Resources'],
  posts: [],
};

function read() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories : DEFAULT_DATA.categories,
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      write(DEFAULT_DATA);
      return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    throw err;
  }
}

function write(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getCategories() {
  return read().categories;
}

function getPosts(category) {
  const { posts } = read();
  const list = category
    ? posts.filter((p) => p.category.toLowerCase() === String(category).toLowerCase())
    : posts;
  // Newest first.
  return [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function getPost(id) {
  return read().posts.find((p) => p.id === id) || null;
}

function createPost({ title, category, body }) {
  const data = read();
  const now = new Date().toISOString();
  const post = {
    id: crypto.randomUUID(),
    title: String(title).trim(),
    category: String(category).trim(),
    body: String(body),
    createdAt: now,
    updatedAt: now,
  };
  data.posts.push(post);
  // Track categories that don't exist yet so the sidebar stays in sync.
  if (!data.categories.some((c) => c.toLowerCase() === post.category.toLowerCase())) {
    data.categories.push(post.category);
  }
  write(data);
  return post;
}

function updatePost(id, { title, category, body }) {
  const data = read();
  const post = data.posts.find((p) => p.id === id);
  if (!post) return null;
  if (title !== undefined) post.title = String(title).trim();
  if (category !== undefined) post.category = String(category).trim();
  if (body !== undefined) post.body = String(body);
  post.updatedAt = new Date().toISOString();
  if (post.category && !data.categories.some((c) => c.toLowerCase() === post.category.toLowerCase())) {
    data.categories.push(post.category);
  }
  write(data);
  return post;
}

function deletePost(id) {
  const data = read();
  const before = data.posts.length;
  data.posts = data.posts.filter((p) => p.id !== id);
  if (data.posts.length === before) return false;
  write(data);
  return true;
}

module.exports = {
  getCategories,
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
};
