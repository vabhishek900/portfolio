const API = window.location.protocol === 'file:'
  ? 'http://localhost:5164/api/portfolio'
  : '/api/portfolio';
const FALLBACK_PASSWORD = '1234';
let adminPassword  = '';
let currentFilter  = 'All';
let unreadOnly     = false;
let offlineMode    = false;

// ── Login ─────────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  attemptLogin(document.getElementById('admin-password').value);
});

async function attemptLogin(password) {
  const btn = document.getElementById('login-btn');
  btn.textContent = 'Verifying...';
  btn.disabled    = true;

  try {
    const resp = await fetch(`${API}/admin/leads`, {
      headers: { 'X-Admin-Password': password }
    });
    if (resp.status === 401) {
      showLoginError('Invalid password. Please try again.');
    } else if (resp.ok) {
      adminPassword = password;
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('admin-screen').style.display = '';
      loadLeads();
      loadSummary();
    } else {
      showLoginError('Connection failed. Is the API running on localhost:5164?');
    }
  } catch {
    if (password === FALLBACK_PASSWORD) {
      offlineMode   = true;
      adminPassword = password;
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('admin-screen').style.display = '';
      showOfflineBanner();
      loadLeads();
      loadSummary();
    } else {
      showLoginError('Cannot connect to API. Use password "1234" to enter offline mode.');
    }
  } finally {
    btn.textContent = 'Login';
    btn.disabled    = false;
  }
}

function showLoginError(msg) {
  const el = document.getElementById('login-error');
  el.textContent    = msg;
  el.style.display  = '';
}

function showOfflineBanner() {
  if (document.getElementById('offline-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.style.cssText = 'background:#92400e;color:#fef3c7;text-align:center;padding:8px 16px;font-size:13px;letter-spacing:.02em;';
  banner.textContent = 'Offline Mode — API unavailable. Leads cannot be loaded.';
  document.querySelector('.admin-header').insertAdjacentElement('afterend', banner);
}

// ── Logout ────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', function() {
  adminPassword = '';
  offlineMode   = false;
  const banner  = document.getElementById('offline-banner');
  if (banner) banner.remove();
  document.getElementById('admin-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = '';
  document.getElementById('admin-password').value = '';
  document.getElementById('login-error').style.display = 'none';
});

// ── Filters ───────────────────────────────────────────────────
document.getElementById('filter-tabs').addEventListener('click', function(e) {
  if (!e.target.classList.contains('filter-tab')) return;
  document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  currentFilter = e.target.dataset.filter;
  loadLeads();
});

document.getElementById('unread-toggle').addEventListener('change', function() {
  unreadOnly = this.checked;
  loadLeads();
});

// ── Load leads ────────────────────────────────────────────────
async function loadLeads() {
  const grid    = document.getElementById('leads-grid');
  const loading = document.getElementById('leads-loading');
  const empty   = document.getElementById('leads-empty');
  const errEl   = document.getElementById('leads-error');

  grid.innerHTML         = '';
  loading.style.display  = '';
  empty.style.display    = 'none';
  errEl.style.display    = 'none';

  let url = `${API}/admin/leads?`;
  if (currentFilter !== 'All')  url += `leadType=${encodeURIComponent(currentFilter)}&`;
  if (unreadOnly)               url += 'unreadOnly=true';

  try {
    const resp  = await fetch(url, { headers: { 'X-Admin-Password': adminPassword } });
    loading.style.display = 'none';

    if (!resp.ok) {
      errEl.style.display = '';
      return;
    }

    const leads = await resp.json();
    if (!leads.length) {
      empty.style.display = '';
      return;
    }

    grid.innerHTML = leads.map(renderLeadCard).join('');

    grid.querySelectorAll('.mark-read-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        markAsRead(parseInt(this.dataset.id), this);
      });
    });
  } catch {
    loading.style.display = 'none';
    errEl.style.display   = '';
  }
}

// ── Load summary stats ────────────────────────────────────────
async function loadSummary() {
  try {
    const resp = await fetch(`${API}/admin/leads/summary`, {
      headers: { 'X-Admin-Password': adminPassword }
    });
    if (!resp.ok) return;

    const data    = await resp.json();
    const statsEl = document.getElementById('admin-stats');

    const unreadBadge = data.totalUnread > 0
      ? `<div class="stat-pill unread-pill">
           <span class="stat-pill-value">${data.totalUnread}</span>
           <span class="stat-pill-label">Unread</span>
         </div>`
      : '';

    const typePills = data.summary.map(s => `
      <div class="stat-pill">
        <span class="stat-pill-value">${s.TotalLeads}</span>
        <span class="stat-pill-label">${escapeHtml(s.LeadType)}</span>
      </div>`).join('');

    statsEl.innerHTML = unreadBadge + typePills || '<span class="no-stats">No leads yet</span>';
  } catch {
    // summary is optional — ignore failures
  }
}

// ── Mark as read ──────────────────────────────────────────────
async function markAsRead(id, btn) {
  btn.disabled    = true;
  btn.textContent = '...';
  try {
    await fetch(`${API}/admin/leads/${id}/read`, {
      method:  'PUT',
      headers: { 'X-Admin-Password': adminPassword }
    });
    const card = document.querySelector(`[data-lead-id="${id}"]`);
    if (card) {
      card.classList.remove('unread');
      btn.replaceWith(Object.assign(document.createElement('span'), {
        className:   'read-indicator',
        textContent: '✓ Read'
      }));
    }
    loadSummary();
  } catch {
    btn.disabled    = false;
    btn.textContent = 'Mark as Read';
  }
}

// ── Render a lead card ────────────────────────────────────────
function renderLeadCard(lead) {
  const date = new Date(lead.SubmittedOn).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const badgeClass = {
    'Full-Time Role':  'badge-blue',
    'Contract':        'badge-purple',
    'Consulting':      'badge-teal',
    'Just Networking': 'badge-slate'
  }[lead.LeadType] || 'badge-slate';

  const isUnread      = !lead.IsRead;
  const unreadDot     = isUnread ? '<span class="unread-dot" title="Unread"></span>' : '';
  const actionBtn     = isUnread
    ? `<button class="mark-read-btn" data-id="${lead.LeadId}">Mark as Read</button>`
    : '<span class="read-indicator">✓ Read</span>';

  const companyLine   = lead.Company ? `<span class="lead-detail"><strong>Company:</strong> ${escapeHtml(lead.Company)}</span>` : '';
  const phoneLine     = lead.Phone   ? `<span class="lead-detail"><strong>Phone:</strong> ${escapeHtml(lead.Phone)}</span>`     : '';
  const detailsHtml   = (companyLine || phoneLine)
    ? `<div class="lead-details">${companyLine}${phoneLine}</div>` : '';

  const replySubject  = encodeURIComponent(`Re: ${lead.LeadType} inquiry`);

  return `
    <div class="lead-card${isUnread ? ' unread' : ''}" data-lead-id="${lead.LeadId}">
      <div class="lead-card-header">
        <div class="lead-identity">
          ${unreadDot}
          <span class="lead-name">${escapeHtml(lead.Name)}</span>
          <span class="lead-email">
            <a href="mailto:${escapeHtml(lead.Email)}">${escapeHtml(lead.Email)}</a>
          </span>
        </div>
        <div class="lead-meta-right">
          <span class="lead-badge ${badgeClass}">${escapeHtml(lead.LeadType)}</span>
          <span class="lead-date">${date}</span>
        </div>
      </div>
      ${detailsHtml}
      <p class="lead-message">${escapeHtml(lead.Message)}</p>
      <div class="lead-card-footer">
        <a class="reply-btn" href="mailto:${escapeHtml(lead.Email)}?subject=${replySubject}">Reply via Email</a>
        ${actionBtn}
      </div>
    </div>`;
}

// ── Utility ───────────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}
