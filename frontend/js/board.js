if (!requireAuth()) throw new Error('Not authenticated');

const user      = getUser();
const projectId = new URLSearchParams(window.location.search).get('id');

if (!projectId) window.location.href = 'dashboard.html';

let project    = null;
let allTasks   = [];
let allMembers = [];
let currentTask = null;
let socket     = null;

const COLUMNS = [
  { id: 'todo',       label: '📋 To Do',      color: '#6366f1' },
  { id: 'inprogress', label: '🔄 In Progress', color: '#f59e0b' },
  { id: 'review',     label: '👀 Review',      color: '#8b5cf6' },
  { id: 'done',       label: '✅ Done',         color: '#10b981' },
];

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Sidebar user info
  document.getElementById('sidebar-username').textContent = user.name;
  document.getElementById('sidebar-email').textContent    = user.email;
  document.getElementById('user-avatar-initial').textContent = user.name[0].toUpperCase();

  await loadProject();
  await loadTasks();
  initSocket();
});

// ─── Load Project ─────────────────────────────────────────────────────────────
async function loadProject() {
  try {
    const data = await projectsAPI.getOne(projectId);
    project = data.project;

    document.getElementById('board-title').textContent       = project.title;
    document.getElementById('board-description').textContent = project.description || '';
    document.getElementById('board-project-name').textContent = project.title;
    document.title = `TaskFlow — ${project.title}`;

    allMembers = [project.owner, ...project.members];
    renderMemberAvatars();
    populateAssigneeSelect('task-assignee');
  } catch {
    window.location.href = 'dashboard.html';
  }
}

function renderMemberAvatars() {
  const container = document.getElementById('members-avatars');
  container.innerHTML = '';
  allMembers.slice(0, 5).forEach(m => {
    const av = document.createElement('div');
    av.className = 'user-avatar';
    av.title     = m.name;
    av.textContent = m.name[0].toUpperCase();
    av.style.background = stringToColor(m.name);
    container.appendChild(av);
  });
}

function populateAssigneeSelect(selectId) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">— Unassigned —</option>';
  allMembers.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m._id || m.id;
    opt.textContent = m.name;
    sel.appendChild(opt);
  });
}

// ─── Load & Render Tasks ──────────────────────────────────────────────────────
async function loadTasks() {
  const data = await tasksAPI.getAll(projectId);
  allTasks = data.tasks;
  renderBoard();
}

function renderBoard() {
  const board = document.getElementById('kanban-board');
  board.innerHTML = '';

  COLUMNS.forEach(col => {
    const tasks = allTasks.filter(t => t.status === col.id);

    const colEl = document.createElement('div');
    colEl.className  = 'kanban-col';
    colEl.dataset.status = col.id;
    colEl.innerHTML = `
      <div class="col-header">
        <div class="col-title" style="color:${col.color}">${col.label}</div>
        <span class="col-count">${tasks.length}</span>
      </div>
      <div class="col-tasks" id="col-${col.id}"></div>`;
    board.appendChild(colEl);

    const tasksContainer = colEl.querySelector('.col-tasks');
    tasks.forEach(task => tasksContainer.appendChild(buildTaskCard(task)));
  });
}

function buildTaskCard(task) {
  const card = document.createElement('div');
  card.className   = 'task-card';
  card.dataset.id  = task._id;

  const due = task.dueDate
    ? `<span class="due-date ${isOverdue(task.dueDate) && task.status !== 'done' ? 'due-overdue' : ''}">${formatDate(task.dueDate)}</span>`
    : '';

  const assignee = task.assignedTo
    ? `<span class="assignee-chip">${task.assignedTo.name}</span>` : '';

  card.innerHTML = `
    <div class="task-card-title">${escapeHtml(task.title)}</div>
    <div class="task-card-meta">
      <span class="priority-badge priority-${task.priority}">${task.priority}</span>
      ${assignee || due}
    </div>`;

  card.addEventListener('click', () => openTaskDetail(task));
  return card;
}

// ─── New Task Modal ───────────────────────────────────────────────────────────
function openNewTaskModal() { openModal('task-modal'); }

async function submitTask() {
  const title    = document.getElementById('task-title').value.trim();
  const desc     = document.getElementById('task-desc').value.trim();
  const status   = document.getElementById('task-status').value;
  const priority = document.getElementById('task-priority').value;
  const assignee = document.getElementById('task-assignee').value;
  const due      = document.getElementById('task-due').value;
  const errEl    = document.getElementById('task-error');
  errEl.textContent = '';

  if (!title) { errEl.textContent = 'Task title is required'; return; }

  try {
    const data = await tasksAPI.create({
      title, description: desc, project: projectId,
      status, priority,
      assignedTo: assignee || null,
      dueDate: due || null
    });
    allTasks.push(data.task);
    renderBoard();
    closeModal('task-modal');
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value  = '';
  } catch (err) {
    errEl.textContent = err.message;
  }
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────
async function openTaskDetail(task) {
  currentTask = task;

  document.getElementById('detail-title').textContent       = task.title;
  document.getElementById('detail-description').textContent = task.description || 'No description provided.';
  document.getElementById('detail-status').value            = task.status;
  document.getElementById('detail-assignee').textContent    = task.assignedTo?.name || '— Unassigned';
  document.getElementById('detail-due').textContent         = formatDate(task.dueDate);
  document.getElementById('detail-creator').textContent     = task.createdBy?.name || '—';

  const badge = document.getElementById('detail-priority-badge');
  badge.className   = `priority-badge priority-${task.priority}`;
  badge.textContent = task.priority;

  // Load comments
  await loadComments(task._id);

  openModal('task-detail-modal');
}

async function updateTaskStatus() {
  if (!currentTask) return;
  const newStatus = document.getElementById('detail-status').value;
  try {
    const data = await tasksAPI.update(currentTask._id, { status: newStatus });
    const idx  = allTasks.findIndex(t => t._id === currentTask._id);
    if (idx > -1) allTasks[idx] = data.task;
    currentTask = data.task;
    renderBoard();
  } catch (err) {
    alert('Failed to update status: ' + err.message);
  }
}

async function deleteCurrentTask() {
  if (!currentTask || !confirm('Delete this task? This cannot be undone.')) return;
  try {
    await tasksAPI.delete(currentTask._id);
    allTasks = allTasks.filter(t => t._id !== currentTask._id);
    renderBoard();
    closeModal('task-detail-modal');
    currentTask = null;
  } catch (err) {
    alert('Failed to delete: ' + err.message);
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────
async function loadComments(taskId) {
  const list = document.getElementById('comments-list');
  list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">Loading...</p>';
  try {
    const data     = await commentsAPI.getAll(taskId);
    const comments = data.comments;
    list.innerHTML = '';
    if (comments.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">No comments yet. Be the first!</p>';
      return;
    }
    comments.forEach(c => list.appendChild(buildCommentEl(c)));
  } catch {
    list.innerHTML = '<p class="error-msg">Failed to load comments</p>';
  }
}

function buildCommentEl(c) {
  const el = document.createElement('div');
  el.className = 'comment-item';
  el.innerHTML = `
    <div class="comment-author">${escapeHtml(c.author.name)}</div>
    <div class="comment-text">${escapeHtml(c.text)}</div>
    <div class="comment-time">${formatDate(c.createdAt)}</div>`;
  return el;
}

async function addComment() {
  const text = document.getElementById('new-comment').value.trim();
  if (!text || !currentTask) return;
  try {
    const data = await commentsAPI.create(text, currentTask._id);
    document.getElementById('new-comment').value = '';
    const list = document.getElementById('comments-list');
    // Remove empty state if present
    const emptyMsg = list.querySelector('p');
    if (emptyMsg) emptyMsg.remove();
    list.appendChild(buildCommentEl(data.comment));
    list.scrollTop = list.scrollHeight;
  } catch (err) {
    alert('Failed to post comment: ' + err.message);
  }
}

// ─── Socket.io Real-Time ──────────────────────────────────────────────────────
function initSocket() {
  socket = io('http://localhost:5000');
  socket.emit('joinProject', projectId);

  socket.on('taskCreated', (task) => {
    if (!allTasks.find(t => t._id === task._id)) {
      allTasks.push(task);
      renderBoard();
    }
  });

  socket.on('taskUpdated', (task) => {
    const idx = allTasks.findIndex(t => t._id === task._id);
    if (idx > -1) {
      allTasks[idx] = task;
      renderBoard();
    }
  });

  socket.on('taskDeleted', ({ taskId }) => {
    allTasks = allTasks.filter(t => t._id !== taskId);
    renderBoard();
  });

  socket.on('commentAdded', ({ comment, taskId }) => {
    if (currentTask && currentTask._id === taskId) {
      const list = document.getElementById('comments-list');
      const empty = list.querySelector('p');
      if (empty) empty.remove();
      list.appendChild(buildCommentEl(comment));
      list.scrollTop = list.scrollHeight;
    }
  });
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 45%)`;
}
