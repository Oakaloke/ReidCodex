// Public site: hero + category sidebar + searchable card grid.
// Category filter is server-side (/api/posts?category=); search is client-side
// over the currently loaded set (matches title + body).

const state = {
  category: null,   // null = all
  categoryLabel: 'All posts',
  query: '',
  posts: [],        // posts currently loaded for the active category
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return '';
  }
}

function excerpt(body, max = 150) {
  const clean = String(body).replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max).trimEnd() + '…' : clean;
}

// Deterministic, muted color per category so placeholder thumbs feel varied
// but cohesive.
function hueFromString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
function thumbStyle(category) {
  const hue = hueFromString(category || 'ReidCodex');
  const c1 = `hsl(${hue} 24% 91%)`;
  const c2 = `hsl(${(hue + 28) % 360} 22% 83%)`;
  return { bg: `linear-gradient(135deg, ${c1}, ${c2})`, fg: `hsl(${hue} 26% 44%)` };
}

// ---------- Categories (sidebar) ----------
async function loadCategories() {
  const res = await fetch('/api/categories');
  const { categories } = await res.json();
  const list = document.getElementById('categoryList');

  const makeButton = (label, value) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.dataset.category = value || '';
    btn.innerHTML = `<span>${escapeHtml(label)}</span><span class="cat-dot"></span>`;
    btn.addEventListener('click', () => selectCategory(value, label));
    li.appendChild(btn);
    return li;
  };

  list.innerHTML = '';
  list.appendChild(makeButton('All posts', null));
  categories.forEach((c) => list.appendChild(makeButton(c, c)));
  highlightActive();
}

function highlightActive() {
  document.querySelectorAll('.category-list button').forEach((btn) => {
    const val = btn.dataset.category || null;
    btn.classList.toggle('active', val === state.category);
  });
}

// ---------- Posts ----------
async function loadPosts() {
  const url = state.category
    ? `/api/posts?category=${encodeURIComponent(state.category)}`
    : '/api/posts';
  const res = await fetch(url);
  const { posts } = await res.json();
  state.posts = posts;
  renderPosts();
}

// Apply the search query to the loaded posts, then render the grid.
function renderPosts() {
  const container = document.getElementById('posts');
  const q = state.query.trim().toLowerCase();
  const posts = q
    ? state.posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.body.toLowerCase().includes(q)
      )
    : state.posts;

  if (!posts.length) {
    container.innerHTML = `<div class="empty">${
      q
        ? `No posts match “${escapeHtml(state.query)}”.`
        : 'No posts in this category yet.'
    }</div>`;
    return;
  }

  container.innerHTML = posts.map((p) => {
    const t = thumbStyle(p.category);
    // Prefer a per-post glyph (e.g. the Hebrew letter) for the monogram.
    const initial = p.glyph || (p.category || '?').trim().charAt(0).toUpperCase();
    return `
      <article class="post-card">
        <div class="post-thumb" style="background:${t.bg}">
          <span class="post-monogram" style="color:${t.fg}">${escapeHtml(initial)}</span>
        </div>
        <div class="post-card-body">
          <span class="post-chip">${escapeHtml(p.category)}</span>
          <h3 class="post-card-title">${escapeHtml(p.title)}</h3>
          <div class="post-date">${formatDate(p.createdAt)}</div>
          <p class="post-excerpt">${escapeHtml(excerpt(p.body))}</p>
        </div>
      </article>
    `;
  }).join('');
}

function selectCategory(value, label) {
  state.category = value;
  state.categoryLabel = value ? label : 'All posts';
  document.getElementById('contentTitle').textContent = state.categoryLabel;
  document.getElementById('contentSubtitle').textContent = value
    ? `Posts filed under ${label}.`
    : 'Browse everything published on ReidCodex.';
  highlightActive();
  loadPosts();
  // Close the mobile sidebar after choosing.
  document.getElementById('sidebar').classList.remove('open');
}

// ---------- Search ----------
const searchInput = document.getElementById('searchInput');
searchInput?.addEventListener('input', (e) => {
  state.query = e.target.value;
  renderPosts();
});

// ---------- Mobile sidebar toggle ----------
document.getElementById('navToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ---------- Init ----------
(async function init() {
  await loadCategories();
  await loadPosts();
})();
