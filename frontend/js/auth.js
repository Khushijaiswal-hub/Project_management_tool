// Redirect if already logged in
if (getToken()) window.location.href = 'dashboard.html';

function showTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
}

async function login() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.textContent = '';

  if (!email || !password) { errEl.textContent = 'Please fill in all fields'; return; }

  try {
    const data = await authAPI.login(email, password);
    setAuth(data.token, data.user);
    window.location.href = 'dashboard.html';
  } catch (err) {
    errEl.textContent = err.message;
  }
}

async function register() {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('reg-error');
  errEl.textContent = '';

  if (!name || !email || !password) { errEl.textContent = 'Please fill in all fields'; return; }

  try {
    const data = await authAPI.register(name, email, password);
    setAuth(data.token, data.user);
    window.location.href = 'dashboard.html';
  } catch (err) {
    errEl.textContent = err.message;
  }
}

// Allow Enter key to submit
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const loginHidden = document.getElementById('login-form').classList.contains('hidden');
    if (loginHidden) register(); else login();
  }
});
