if (!requireAuth()) throw new Error('Not authenticated');

let selectedColor = '#6366f1';
const user = getUser();

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Populate user info in sidebar
  document.getElementById('sidebar-username').textContent = user.name;
  document.getElementById('sidebar-email').textContent    = user.email;
  document.getElementById('user-avatar-initial').textContent = user.name[0].toUpperCase();

  loadProjects();
});

// ─── Load Projects ────────────────────────────────────────────────────────────
async function loadProjects() {
  const grid = document.getElementById('projects-grid');
  try {
    const data = await projectsAPI.getAll();
    const projects = data.projects;

    document.getElementById('projects-count').textContent =
      projects.length === 0 ? 'No projects yet' : `${projects.length} project${projects.length > 1 ? 's' : ''}`;

    if (projects.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div style="font-size:3rem;margin-bottom:12px">📋</div>
          <h3>No Projects Yet</h3>
          <p>Click "New Project" to create your first project board.</p>
        </div>`;
      return;
    }

    // Load task counts for each project
    grid.innerHTML = '';
    for (const proj of projects) {
      let taskCount = 0;
      try {
        const td = await tasksAPI.getAll(proj._id);
        taskCount = td.tasks.length;
      } catch {}

      const card = document.createElement('div');
      card.className = 'project-card';
      card.style.setProperty('--card-color', proj.color || '#6366f1');
      card.onclick = () => window.location.href = `board.html?id=${proj._id}`;
      card.innerHTML = `
        <h3>${escapeHtml(proj.title)}</h3>
        <p>${escapeHtml(proj.description || 'No description')}</p>
        <div class="card-footer">
          <span>${formatDate(proj.createdAt)}</span>
          <span class="task-count">${taskCount} task${taskCount !== 1 ? 's' : ''}</span>
        </div>`;
      grid.appendChild(card);
    }
  } catch (err) {
    grid.innerHTML = `<p class="error-msg">Failed to load projects: ${err.message}</p>`;
  }
}

// ─── New Project Modal ────────────────────────────────────────────────────────
function openNewProjectModal() { openModal('project-modal'); }

function selectColor(el) {
  document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
  el.classList.add('selected');
  selectedColor = el.dataset.color;
}

async function createProject() {
  const title = document.getElementById('proj-title').value.trim();
  const desc  = document.getElementById('proj-desc').value.trim();
  const errEl = document.getElementById('proj-error');
  errEl.textContent = '';

  if (!title) { errEl.textContent = 'Project title is required'; return; }

  try {
    await projectsAPI.create({ title, description: desc, color: selectedColor });
    closeModal('project-modal');
    document.getElementById('proj-title').value = '';
    document.getElementById('proj-desc').value  = '';
    loadProjects();
  } catch (err) {
    errEl.textContent = err.message;
  }
}

// ─── Escape HTML ──────────────────────────────────────────────────────────────
function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}
