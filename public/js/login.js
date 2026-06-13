// Login page: POST credentials, redirect to /admin on success.

const form = document.getElementById('loginForm');
const notice = document.getElementById('notice');

function showError(msg) {
  notice.textContent = msg;
  notice.classList.add('show');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  notice.classList.remove('show');

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || 'Login failed.');
      return;
    }
    window.location.href = '/admin';
  } catch (err) {
    showError('Network error — is the server running?');
  }
});
