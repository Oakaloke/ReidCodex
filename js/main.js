// Static ReidCodex (GitHub Pages build): hero + category sidebar + searchable
// card grid, rendered entirely client-side from window.REIDCODEX_DATA.
// No server, no /api calls.

const DATA = window.REIDCODEX_DATA || { categories: [], posts: [] };

const state = {
  category: null,          // null = all
  categoryLabel: 'All posts',
  query: '',
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

// Deterministic, muted color per category for the placeholder thumbs.
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

// Newest first, matching the server's ordering.
function sortedPosts(list) {
  return [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// ---------- Categories (sidebar) ----------
function loadCategories() {
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
  DATA.categories.forEach((c) => list.appendChild(makeButton(c, c)));
  highlightActive();
}

function highlightActive() {
  document.querySelectorAll('.category-list button').forEach((btn) => {
    const val = btn.dataset.category || null;
    btn.classList.toggle('active', val === state.category);
  });
}

// ---------- Posts ----------
// Filter the baked posts by the active category, then by the search query.
function currentPosts() {
  let posts = state.category
    ? DATA.posts.filter(
        (p) => p.category.toLowerCase() === state.category.toLowerCase()
      )
    : DATA.posts;
  const q = state.query.trim().toLowerCase();
  if (q) {
    posts = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q)
    );
  }
  return sortedPosts(posts);
}

function renderPosts() {
  const container = document.getElementById('posts');
  const posts = currentPosts();
  const q = state.query.trim();

  if (!posts.length) {
    container.innerHTML = `<div class="empty">${
      q
        ? `No posts match “${escapeHtml(q)}”.`
        : 'No posts in this category yet.'
    }</div>`;
    return;
  }

  container.innerHTML = posts.map((p) => {
    const t = thumbStyle(p.category);
    const initial = (p.category || '?').trim().charAt(0).toUpperCase();
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
  renderPosts();
  document.getElementById('sidebar').classList.remove('open');
}

// ---------- Search ----------
document.getElementById('searchInput')?.addEventListener('input', (e) => {
  state.query = e.target.value;
  renderPosts();
});

// ---------- Mobile sidebar toggle ----------
document.getElementById('navToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ---------- Init ----------
loadCategories();
renderPosts();
