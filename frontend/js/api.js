// ─── API Configuration ───────────────────────────────────────────────────────
const API_URL = 'http://localhost:5000/api';

// ─── Token Helpers ────────────────────────────────────────────────────────────
const getToken = () => localStorage.getItem('tf_token');
const getUser  = () => JSON.parse(localStorage.getItem('tf_user') || 'null');
const setAuth  = (token, user) => {
  localStorage.setItem('tf_token', token);
  localStorage.setItem('tf_user', JSON.stringify(user));
};
const clearAuth = () => {
  localStorage.removeItem('tf_token');
  localStorage.removeItem('tf_user');
};

// ─── Generic Fetch Wrapper ────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { headers, ...options });
  const data = await res.json();

  if (!res.ok) throw new Error(data.message || 'API Error');
  return data;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
const authAPI = {
  login:    (email, password) => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name, email, password) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  me:       () => apiFetch('/auth/me'),
  users:    () => apiFetch('/auth/users'),
};

// ─── Projects API ─────────────────────────────────────────────────────────────
const projectsAPI = {
  getAll:  ()       => apiFetch('/projects'),
  getOne:  (id)     => apiFetch(`/projects/${id}`),
  create:  (data)   => apiFetch('/projects',    { method: 'POST',   body: JSON.stringify(data) }),
  update:  (id, d)  => apiFetch(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  delete:  (id)     => apiFetch(`/projects/${id}`, { method: 'DELETE' }),
};

// ─── Tasks API ────────────────────────────────────────────────────────────────
const tasksAPI = {
  getAll:  (projectId) => apiFetch(`/tasks/${projectId}`),
  create:  (data)      => apiFetch('/tasks',    { method: 'POST',   body: JSON.stringify(data) }),
  update:  (id, data)  => apiFetch(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete:  (id)        => apiFetch(`/tasks/${id}`, { method: 'DELETE' }),
};

// ─── Comments API ─────────────────────────────────────────────────────────────
const commentsAPI = {
  getAll: (taskId) => apiFetch(`/comments/${taskId}`),
  create: (text, taskId) => apiFetch('/comments', { method: 'POST', body: JSON.stringify({ text, taskId }) }),
  delete: (id) => apiFetch(`/comments/${id}`, { method: 'DELETE' }),
};

// ─── Guard: redirect to login if not authenticated ────────────────────────────
function requireAuth() {
  if (!getToken()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ─── Logout ───────────────────────────────────────────────────────────────────
function logout() {
  clearAuth();
  window.location.href = 'index.html';
}

// ─── Modal Helpers ────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ─── Format Date ─────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}
