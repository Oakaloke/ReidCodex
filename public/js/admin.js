// Admin dashboard: guard the page, create/edit/delete posts.

const notice = document.getElementById('notice');
const postForm = document.getElementById('postForm');
const editorTitle = document.getElementById('editorTitle');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function flash(msg, type = 'success') {
  notice.textContent = msg;
  notice.className = `notice show ${type}`;
  setTimeout(() => notice.classList.remove('show'), 3000);
}

// --- Auth guard ------------------------------------------------------------
async function requireSession() {
  const res = await fetch('/api/me');
  if (!res.ok) {
    window.location.href = '/login';
    return null;
  }
  const data = await res.json();
  document.getElementById('whoami').textContent = `Signed in as ${data.user}`;
  return data;
}

// --- Categories (for the datalist) ----------------------------------------
async function loadCategoryOptions() {
  const res = await fetch('/api/categories');
  const { categories } = await res.json();
  document.getElementById('categoryOptions').innerHTML =
    categories.map((c) => `<option value="${escapeHtml(c)}"></option>`).join('');
}

// --- Post list -------------------------------------------------------------
async function loadPosts() {
  const res = await fetch('/api/posts');
  const { posts } = await res.json();
  const container = document.getElementById('adminPosts');
  if (!posts.length) {
    container.innerHTML = '<div class="empty">No posts yet. Create your first one.</div>';
    return;
  }
  container.innerHTML = posts.map((p) => `
    <div class="admin-post">
      <h4>${escapeHtml(p.title)}</h4>
      <div class="post-meta"><span class="post-badge">${escapeHtml(p.category)}</span></div>
      <div class="row">
        <button class="btn secondary small" data-edit="${p.id}">Edit</button>
        <button class="btn danger small" data-delete="${p.id}">Delete</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-edit]').forEach((btn) =>
    btn.addEventListener('click', () => startEdit(btn.dataset.edit)));
  container.querySelectorAll('[data-delete]').forEach((btn) =>
    btn.addEventListener('click', () => deletePost(btn.dataset.delete)));
}

// --- Editor ----------------------------------------------------------------
function resetEditor() {
  postForm.reset();
  document.getElementById('postId').value = '';
  editorTitle.textContent = 'New post';
  saveBtn.textContent = 'Create post';
  resetBtn.style.display = 'none';
}

async function startEdit(id) {
  const res = await fetch(`/api/posts/${id}`);
  if (!res.ok) return flash('Could not load that post.', 'error');
  const { post } = await res.json();
  document.getElementById('postId').value = post.id;
  document.getElementById('title').value = post.title;
  document.getElementById('category').value = post.category;
  document.getElementById('body').value = post.body;
  editorTitle.textContent = 'Edit post';
  saveBtn.textContent = 'Save changes';
  resetBtn.style.display = 'inline-block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deletePost(id) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
  if (res.status === 401) return (window.location.href = '/login');
  if (!res.ok) return flash('Delete failed.', 'error');
  flash('Post deleted.');
  await loadPosts();
}

postForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('postId').value;
  const payload = {
    title: document.getElementById('title').value,
    category: document.getElementById('category').value,
    body: document.getElementById('body').value,
  };
  const res = await fetch(id ? `/api/posts/${id}` : '/api/posts', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.status === 401) return (window.location.href = '/login');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return flash(data.error || 'Save failed.', 'error');
  }
  flash(id ? 'Post updated.' : 'Post created.');
  resetEditor();
  await Promise.all([loadPosts(), loadCategoryOptions()]);
});

resetBtn.addEventListener('click', resetEditor);

document.getElementById('logoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
});

// --- Init ------------------------------------------------------------------
(async function init() {
  const session = await requireSession();
  if (!session) return;
  await Promise.all([loadCategoryOptions(), loadPosts()]);
})();
