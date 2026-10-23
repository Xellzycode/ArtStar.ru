const ADMIN_SESSION = 'vibecard_admin';
const ADMIN_LOGIN = 'mefadmin';
const ADMIN_PASSWORD = 'Mefloverxd48624862admin';
const NOTES_KEY = 'vibecard_admin_notes';
const LOG_KEY = 'vibecard_admin_log';
const MAINT_KEY = 'vibecard_maintenance';

let userFilter = 'all';
let userQuery = '';

const LOG_LABELS = {
  premium_on: 'выдан Star+',
  premium_off: 'снят Star+',
  verified_on: 'выдан Verified',
  verified_off: 'снят Verified',
  developer_grant: 'выдан Developer',
  developer_revoke: 'снят Developer',
  hide: 'карточка скрыта',
  show: 'карточка открыта',
  user_delete: 'аккаунт удалён',
  rename: 'смена имени',
  password_reset: 'сброс пароля',
  note: 'заметка',
  report_update: 'жалоба обновлена',
  report_hide: 'карточка скрыта из жалобы',
  report_delete: 'жалоба удалена',
  pay_confirm: 'оплата подтверждена',
  pay_reject: 'оплата отклонена',
  export: 'выгрузка',
  maintenance: 'режим техработ',
};

document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('.page-admin')) return;

  const canvas = document.getElementById('admin-canvas');
  const sky = document.querySelector('.admin-sky');
  if (canvas && sky && typeof createConstellation === 'function') {
    createConstellation(canvas, sky, {
      area: 18000,
      maxDots: 70,
      linkDist: 140,
      speed: 0.22,
      dotAlpha: 0.4,
      lineAlpha: 0.1,
      shape: 'star',
      interact: false,
      wrap: true,
      pointerLines: false,
      ripples: false,
    });
  }

  if (isAdmin()) showApp();
  else showLogin();

  document.getElementById('admin-login-form')?.addEventListener('submit', onLogin);
  document.getElementById('admin-logout')?.addEventListener('click', () => {
    if (typeof Api !== 'undefined') Api.adminLogout();
    sessionStorage.removeItem(ADMIN_SESSION);
    showLogin();
  });

  document.querySelectorAll('[data-admin-view]').forEach((btn) => {
    btn.addEventListener('click', () => openView(btn.dataset.adminView));
  });
});

function isAdmin() {
  return sessionStorage.getItem(ADMIN_SESSION) === '1';
}

async function onLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const error = document.getElementById('admin-login-error');
  const login = String(form.elements.login.value || '').trim().toLowerCase();
  const password = String(form.elements.password.value || '');
  if (typeof Api !== 'undefined') {
    const remote = await Api.adminLogin(login, password);
    if (remote.ok) {
      sessionStorage.setItem(ADMIN_SESSION, '1');
      showApp();
      return;
    }
    if (!remote.offline) {
      if (error) {
        error.hidden = false;
        error.textContent = remote.error || 'Неверный логин или пароль';
      }
      return;
    }
  }
  if (login !== ADMIN_LOGIN || password !== ADMIN_PASSWORD) {
    if (error) {
      error.hidden = false;
      error.textContent = 'Неверный логин или пароль';
    }
    return;
  }
  sessionStorage.setItem(ADMIN_SESSION, '1');
  showApp();
}

function showLogin() {
  document.getElementById('admin-login')?.classList.add('is-visible');
  document.getElementById('admin-app')?.classList.remove('is-visible');
}

function showApp() {
  document.getElementById('admin-login')?.classList.remove('is-visible');
  document.getElementById('admin-app')?.classList.add('is-visible');
  openView('overview');
}

function openView(name) {
  document.querySelectorAll('[data-admin-view]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.adminView === name);
  });
  document.querySelectorAll('.admin-view').forEach((view) => {
    view.classList.toggle('hidden', view.dataset.view !== name);
  });
  if (name === 'overview') renderOverview();
  if (name === 'users') renderUsers();
  if (name === 'reports') renderReports();
  if (name === 'payments') renderPayments();
  if (name === 'mail') renderMail();
  if (name === 'log') renderLog();
  syncReportBadge();
  refreshRemote(name);
}

async function refreshRemote(name) {
  if (typeof Api === 'undefined') return;
  const reports = await Api.listReports();
  if (reports.ok && Array.isArray(reports.reports) && typeof ReportStore !== 'undefined') {
    ReportStore.write(reports.reports);
  }
  if (name === 'overview') renderOverview();
  if (name === 'users') renderUsers();
  if (name === 'reports') renderReports();
  if (name === 'payments') renderPayments();
  if (name === 'mail') renderMail();
  if (name === 'log') renderLog();
  syncReportBadge();
}

function notesMap() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function saveNoteLocal(username, note) {
  const map = notesMap();
  if (note) map[username] = note;
  else delete map[username];
  localStorage.setItem(NOTES_KEY, JSON.stringify(map));
}

function localLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]') || [];
  } catch {
    return [];
  }
}

function addLocalLog(action, target, detail) {
  const list = localLog();
  list.unshift({
    id: crypto.randomUUID(),
    actor: 'admin',
    action,
    target: target || '',
    detail: detail || '',
    created_at: new Date().toISOString(),
  });
  localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0, 200)));
}

function collectUsers() {
  const profiles = typeof ProfileStore !== 'undefined' ? ProfileStore.list() : [];
  const accounts = typeof AccountStore !== 'undefined' ? AccountStore.list() : [];
  const notes = notesMap();
  const map = new Map();

  profiles.forEach((profile) => {
    map.set(profile.username, {
      username: profile.username,
      displayName: profile.display_name || profile.username,
      email: '',
      createdAt: profile.created_at || profile.updated_at || '',
      hidden: Boolean(profile.hidden),
      hasCard: true,
      note: notes[profile.username] || '',
    });
  });

  accounts.forEach((account) => {
    const row = map.get(account.username) || {
      username: account.username,
      displayName: account.displayName || account.username,
      email: account.email,
      createdAt: account.createdAt || '',
      hidden: false,
      hasCard: false,
      note: notes[account.username] || '',
    };
    row.email = account.email || row.email;
    row.displayName = account.displayName || row.displayName;
    if (!row.createdAt) row.createdAt = account.createdAt || '';
    if (!row.note) row.note = notes[account.username] || '';
    map.set(account.username, row);
  });

  return [...map.values()].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function formatWhen(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function reportedNames() {
  if (typeof ReportStore === 'undefined') return new Set();
  return new Set(ReportStore.list().filter((row) => (row.status || 'open') !== 'closed').map((row) => row.username));
}

async function renderOverview() {
  const root = document.querySelector('[data-view="overview"]');
  if (!root) return;
  const users = collectUsers();
  const premium = typeof Premium !== 'undefined' ? Premium.list() : [];
  const verified = typeof Verified !== 'undefined' ? Verified.list() : [];
  const reports = typeof ReportStore !== 'undefined' ? ReportStore.list() : [];
  const views = users.reduce((sum, user) => {
    const stats = typeof ProfileStats !== 'undefined' ? ProfileStats.get(user.username) : { views: 0 };
    return sum + (stats.views || 0);
  }, 0);
  let maintenanceOn = localStorage.getItem(MAINT_KEY) === '1';
  if (typeof Api !== 'undefined') {
    const state = await Api.adminMaintenanceState();
    if (state.ok) {
      maintenanceOn = Boolean(state.on);
      localStorage.setItem(MAINT_KEY, maintenanceOn ? '1' : '0');
    }
  }

  root.innerHTML = `
    <div class="admin-head">
      <div>
        <h1>Обзор</h1>
        <p>Карточки, Star+, жалобы и выгрузка.</p>
      </div>
      <div class="admin-head-acts">
        <button type="button" class="btn btn-secondary btn-sm" id="admin-export">Скачать выгрузку</button>
      </div>
    </div>
    <div class="admin-stats">
      <article class="admin-stat">
        <div class="admin-stat-ico">◎</div>
        <div class="admin-stat-value">${users.length}</div>
        <div class="admin-stat-label">пользователей</div>
      </article>
      <article class="admin-stat">
        <div class="admin-stat-ico">✦</div>
        <div class="admin-stat-value">${premium.length}</div>
        <div class="admin-stat-label">со Star+</div>
      </article>
      <article class="admin-stat">
        <div class="admin-stat-ico">✓</div>
        <div class="admin-stat-value">${verified.length}</div>
        <div class="admin-stat-label">Verified</div>
      </article>
      <article class="admin-stat">
        <div class="admin-stat-ico">⚑</div>
        <div class="admin-stat-value">${reports.length}</div>
        <div class="admin-stat-label">жалоб</div>
      </article>
      <article class="admin-stat">
        <div class="admin-stat-ico">◈</div>
        <div class="admin-stat-value">${views}</div>
        <div class="admin-stat-label">просмотров</div>
      </article>
    </div>
    <div class="admin-toolbar">
      <p class="form-hint">Технические работы скрывают сайт для посетителей. Администрирование остаётся доступным.</p>
      <button type="button" class="btn ${maintenanceOn ? 'btn-primary' : 'btn-secondary'} btn-sm" id="admin-maintenance">
        ${maintenanceOn ? 'Снять техработы' : 'Включить техработы'}
      </button>
    </div>
  `;

  root.querySelector('#admin-export')?.addEventListener('click', downloadAdminExport);
  root.querySelector('#admin-maintenance')?.addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    const next = !maintenanceOn;
    btn.disabled = true;
    localStorage.setItem(MAINT_KEY, next ? '1' : '0');
    addLocalLog('maintenance', '', next ? 'on' : 'off');
    if (typeof Api !== 'undefined') {
      const res = await Api.adminMaintenance(next);
      if (res.ok) {
        localStorage.setItem(MAINT_KEY, res.on ? '1' : '0');
        showToast(res.on ? 'Техработы включены' : 'Техработы сняты');
      } else if (res.offline || res.status === 404) {
        showToast(next ? 'Техработы включены' : 'Техработы сняты');
      } else {
        localStorage.setItem(MAINT_KEY, next ? '0' : '1');
        showToast(res.error || 'Не удалось переключить техработы', 'error');
      }
    } else {
      showToast(next ? 'Техработы включены' : 'Техработы сняты');
    }
    renderOverview();
  });
}

function downloadBlobFile(name, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildLocalExport() {
  return {
    exported_at: new Date().toISOString(),
    profiles: typeof ProfileStore !== 'undefined' ? ProfileStore.list() : [],
    accounts: typeof AccountStore !== 'undefined'
      ? AccountStore.list().map((row) => ({
        id: row.id,
        email: row.email,
        username: row.username,
        displayName: row.displayName,
        provider: row.provider,
        createdAt: row.createdAt,
      }))
      : [],
    premium: typeof Premium !== 'undefined' ? Premium.read() : {},
    verified: typeof Verified !== 'undefined' ? Verified.read() : {},
    developers: typeof Developer !== 'undefined' && Developer.read ? Developer.read() : {},
    reports: typeof ReportStore !== 'undefined' ? ReportStore.list() : [],
  };
}

async function downloadAdminExport() {
  addLocalLog('export', '', 'download');
  if (typeof Api !== 'undefined' && typeof Api.adminExport === 'function') {
    const remote = await Api.adminExport();
    if (remote.ok && remote.blob) {
      downloadBlobFile('artstar-export.zip', remote.blob);
      showToast('Выгрузка скачана');
      return;
    }
  }
  const payload = JSON.stringify(buildLocalExport(), null, 2);
  downloadBlobFile('artstar-export.json', new Blob([payload], { type: 'application/json' }));
  showToast('Выгрузка карточек скачана');
}

function renderUsers() {
  const root = document.querySelector('[data-view="users"]');
  if (!root) return;
  const needle = String(userQuery || '').trim().toLowerCase();
  const flagged = reportedNames();
  const users = collectUsers().filter((user) => {
    const premiumOn = typeof Premium !== 'undefined' && Premium.isActive(user.username);
    const verifiedOn = typeof Verified !== 'undefined' && Verified.isActive(user.username);
    if (userFilter === 'free' && premiumOn) return false;
    if (userFilter === 'star' && !premiumOn) return false;
    if (userFilter === 'verified' && !verifiedOn) return false;
    if (userFilter === 'hidden' && !user.hidden) return false;
    if (userFilter === 'reports' && !flagged.has(user.username)) return false;
    if (!needle) return true;
    return [user.username, user.displayName, user.email, user.note].join(' ').toLowerCase().includes(needle);
  });

  const filters = [
    ['all', 'Все'],
    ['free', 'Free'],
    ['star', 'Star+'],
    ['verified', 'Verified'],
    ['hidden', 'Скрытые'],
    ['reports', 'С жалобой'],
  ].map(([id, label]) => `
    <button type="button" class="admin-filter${userFilter === id ? ' is-on' : ''}" data-filter="${id}">${label}</button>
  `).join('');

  const cards = users.map((user) => {
    const premiumOn = typeof Premium !== 'undefined' && Premium.isActive(user.username);
    const verifiedOn = typeof Verified !== 'undefined' && Verified.isActive(user.username);
    const developerOn = typeof Developer !== 'undefined' && Developer.isActive(user.username);
    const stats = typeof ProfileStats !== 'undefined' ? ProfileStats.get(user.username) : { views: 0, likes: 0 };
    const mail = user.email ? escapeHtml(user.email) : 'не привязана';
    return `
      <article class="admin-person" data-user="${escapeHtml(user.username)}">
        <div class="admin-user">
          <div class="admin-user-nick">
            <strong>@${escapeHtml(user.username)}</strong>
            ${verifiedOn ? (typeof verifiedMarkHTML === 'function' ? verifiedMarkHTML() : '') : ''}
          </div>
          <div class="admin-user-name">${escapeHtml(user.displayName)}</div>
          <div class="admin-user-mail${user.email ? '' : ' is-empty'}">почта · ${mail}</div>
          <div class="admin-user-meta">
            <span class="admin-chip ${premiumOn ? 'admin-chip--on' : 'admin-chip--off'}">${premiumOn ? '✦ Star+' : 'Free'}</span>
            ${verifiedOn ? '<span class="admin-chip admin-chip--on">✓ Verified</span>' : ''}
            ${developerOn ? '<span class="admin-chip admin-chip--on">⚙ Developer</span>' : ''}
            ${user.hidden ? '<span class="admin-chip admin-chip--hide">скрыта</span>' : ''}
            ${flagged.has(user.username) ? '<span class="admin-chip admin-chip--hide">жалоба</span>' : ''}
            <span class="admin-chip admin-chip--mail">${stats.views || 0} просм. · ${formatWhen(user.createdAt)}</span>
          </div>
          ${user.note ? `<p class="admin-note-preview">${escapeHtml(user.note)}</p>` : ''}
        </div>
        <div class="admin-actions">
          <div class="admin-act-group">
            <a class="admin-act" href="/${encodeURIComponent(user.username)}" target="_blank">
              <span class="admin-act-ico">↗</span>
              <span class="admin-act-txt">Карточка</span>
            </a>
          </div>
          <div class="admin-act-group">
            <button type="button" class="admin-act${premiumOn ? ' is-on' : ''}" data-admin-premium="${escapeHtml(user.username)}">
              <span class="admin-act-ico">✦</span>
              <span class="admin-act-txt">${premiumOn ? 'Снять' : 'Star+'}</span>
            </button>
            <button type="button" class="admin-act${verifiedOn ? ' is-on' : ''}" data-admin-verified="${escapeHtml(user.username)}">
              <span class="admin-act-ico">✓</span>
              <span class="admin-act-txt">${verifiedOn ? 'Снять' : 'Verified'}</span>
            </button>
            <button type="button" class="admin-act${developerOn ? ' is-on' : ''}" data-admin-developer="${escapeHtml(user.username)}">
              <span class="admin-act-ico">⚙</span>
              <span class="admin-act-txt">${developerOn ? 'Снять' : 'Dev'}</span>
            </button>
          </div>
          <div class="admin-act-group">
            <button type="button" class="admin-act" data-admin-hide="${escapeHtml(user.username)}">
              <span class="admin-act-ico">${user.hidden ? '◉' : '○'}</span>
              <span class="admin-act-txt">${user.hidden ? 'Показать' : 'Скрыть'}</span>
            </button>
            <button type="button" class="admin-act" data-admin-rename="${escapeHtml(user.username)}">
              <span class="admin-act-ico">✎</span>
              <span class="admin-act-txt">Ник</span>
            </button>
            <button type="button" class="admin-act" data-admin-password="${escapeHtml(user.username)}">
              <span class="admin-act-ico">∗</span>
              <span class="admin-act-txt">Пароль</span>
            </button>
            <button type="button" class="admin-act" data-admin-note="${escapeHtml(user.username)}">
              <span class="admin-act-ico">≡</span>
              <span class="admin-act-txt">Заметка</span>
            </button>
            <button type="button" class="admin-act is-danger" data-admin-delete="${escapeHtml(user.username)}">
              <span class="admin-act-ico">×</span>
              <span class="admin-act-txt">Удалить</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  root.innerHTML = `
    <div class="admin-head">
      <div>
        <h1>Пользователи</h1>
        <p>Фильтры, заметки, смена ника и сброс пароля.</p>
      </div>
    </div>
    <div class="admin-filters">${filters}</div>
    <input class="form-input admin-search" id="admin-user-search" type="search" placeholder="Поиск по имени, почте или заметке" value="${escapeHtml(userQuery)}">
    ${users.length ? `<div class="admin-people">${cards}</div>` : '<p class="admin-empty">Никого нет</p>'}
  `;

  root.querySelector('#admin-user-search')?.addEventListener('input', (event) => {
    userQuery = event.target.value;
    renderUsers();
  });
  root.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      userFilter = btn.dataset.filter;
      renderUsers();
    });
  });
  root.querySelectorAll('[data-admin-premium]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.adminPremium;
      if (Premium.isActive(name)) {
        Premium.deactivate(name);
        addLocalLog('premium_off', name);
      } else {
        Premium.activate(name);
        addLocalLog('premium_on', name);
      }
      renderUsers();
    });
  });
  root.querySelectorAll('[data-admin-verified]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.adminVerified;
      if (Verified.isActive(name)) {
        Verified.revoke(name);
        addLocalLog('verified_off', name);
      } else {
        Verified.grant(name);
        addLocalLog('verified_on', name);
      }
      renderUsers();
    });
  });
  root.querySelectorAll('[data-admin-developer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.adminDeveloper;
      if (Developer.isActive(name)) {
        Developer.revoke(name);
        addLocalLog('developer_revoke', name);
      } else {
        Developer.grant(name);
        addLocalLog('developer_grant', name);
      }
      renderUsers();
    });
  });
  root.querySelectorAll('[data-admin-hide]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.adminHide;
      const profile = ProfileStore.get(name);
      if (!profile) {
        showToast('Карточка не создана', 'error');
        return;
      }
      const next = !profile.hidden;
      if (next && !window.confirm(`Скрыть карточку @${name}?`)) return;
      ProfileStore.save(name, { ...profile, hidden: next });
      if (typeof Api !== 'undefined') await Api.adminUserAction(name, 'hide', { hidden: next });
      addLocalLog(next ? 'hide' : 'show', name);
      renderUsers();
    });
  });
  root.querySelectorAll('[data-admin-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.adminDelete;
      if (!window.confirm(`Удалить @${name} и карточку?`)) return;
      ProfileStore.remove(name);
      addLocalLog('user_delete', name);
      renderUsers();
      showToast(`@${name} удалён`);
    });
  });
  root.querySelectorAll('[data-admin-rename]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.adminRename;
      const next = String(window.prompt(`Новое имя пользователя для @${name}`, name) || '').trim().toLowerCase();
      if (!next || next === name) return;
      if (typeof Api !== 'undefined') {
        const res = await Api.adminUserAction(name, 'rename', { username: next });
        if (!res.ok && !res.offline) {
          showToast(res.error || 'Не удалось сменить имя', 'error');
          return;
        }
      }
      applyLocalRename(name, next);
      addLocalLog('rename', name, next);
      renderUsers();
      showToast(`@${name} → @${next}`);
    });
  });
  root.querySelectorAll('[data-admin-password]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.adminPassword;
      const typed = window.prompt(`Новый пароль для @${name}. Пустое поле — сгенерировать.`);
      if (typed === null) return;
      if (typeof Api !== 'undefined') {
        const res = await Api.adminUserAction(name, 'password', { password: typed });
        if (res.ok) {
          addLocalLog('password_reset', name);
          window.alert(`Новый пароль @${name}: ${res.password}`);
          return;
        }
        if (!res.offline) {
          showToast(res.error || 'Не удалось сменить пароль', 'error');
          return;
        }
      }
      showToast('Сброс пароля доступен при работающем сервере', 'error');
    });
  });
  root.querySelectorAll('[data-admin-note]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.adminNote;
      const current = notesMap()[name] || collectUsers().find((row) => row.username === name)?.note || '';
      const note = window.prompt(`Заметка для @${name}`, current);
      if (note === null) return;
      saveNoteLocal(name, note);
      if (typeof Api !== 'undefined') await Api.adminUserAction(name, 'note', { note });
      addLocalLog('note', name);
      renderUsers();
    });
  });
}

function applyLocalRename(from, to) {
  const profile = ProfileStore.get(from);
  if (profile) {
    ProfileStore.save(to, { ...profile, username: to }, { skipRemote: true });
    localStorage.removeItem(ProfileStore.PREFIX + from);
  }
  if (typeof AccountStore !== 'undefined') AccountStore.rename(from, to);
  if (typeof Premium !== 'undefined' && Premium.rename) Premium.rename(from, to);
  if (typeof Verified !== 'undefined') Verified.rename(from, to);
  if (typeof Developer !== 'undefined' && Developer.rename) Developer.rename(from, to);
  const notes = notesMap();
  if (notes[from]) {
    notes[to] = notes[from];
    delete notes[from];
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }
  const session = typeof Auth !== 'undefined' ? Auth.getUser() : null;
  if (session?.username === from) {
    Auth.setSession({ ...session, username: to });
  }
}

function renderReports() {
  const root = document.querySelector('[data-view="reports"]');
  if (!root || typeof ReportStore === 'undefined') return;
  const reports = ReportStore.list();

  root.innerHTML = `
    <div class="admin-head">
      <div>
        <h1>Жалобы</h1>
        <p>Открыть карточку, скрыть, закрыть с причиной.</p>
      </div>
      ${reports.length ? '<button type="button" class="btn btn-secondary btn-sm" id="admin-reports-read">Прочитать все</button>' : ''}
    </div>
    ${reports.length ? reports.map((row) => `
      <article class="admin-report${row.unread ? ' is-unread' : ''}" data-report="${escapeHtml(row.id)}">
        <div class="admin-report-top">
          <strong>${escapeHtml(row.code)} · @${escapeHtml(row.username)}</strong>
          <span class="admin-chip ${row.status === 'closed' ? 'admin-chip--off' : 'admin-chip--on'}">${row.status === 'closed' ? 'закрыта' : 'открыта'}</span>
        </div>
        <p class="admin-report-meta">${formatWhen(row.created_at)}</p>
        <p class="admin-report-text">${escapeHtml(row.message || '—')}</p>
        ${row.resolution ? `<p class="admin-report-text">Решение: ${escapeHtml(row.resolution)}</p>` : ''}
        ${row.reply ? `<p class="admin-report-text">Ответ: ${escapeHtml(row.reply)}</p>` : ''}
        <div class="admin-report-acts">
          <a class="btn btn-ghost btn-sm" href="/${encodeURIComponent(row.username)}" target="_blank">Карточка</a>
          <button type="button" class="btn btn-ghost btn-sm" data-report-hide="${escapeHtml(row.username)}" data-report="${escapeHtml(row.id)}">Скрыть карточку</button>
          ${row.status !== 'closed' ? `<button type="button" class="btn btn-ghost btn-sm" data-report-close="${escapeHtml(row.id)}">Закрыть</button>` : ''}
          ${row.unread ? `<button type="button" class="btn btn-ghost btn-sm" data-report-read="${escapeHtml(row.id)}">Прочитано</button>` : ''}
          <button type="button" class="btn btn-ghost btn-sm" data-report-delete="${escapeHtml(row.id)}">Удалить</button>
        </div>
      </article>
    `).join('') : '<p class="admin-empty">Жалоб нет</p>'}
  `;

  root.querySelector('#admin-reports-read')?.addEventListener('click', () => {
    ReportStore.markAllRead();
    renderReports();
  });
  root.querySelectorAll('[data-report-read]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      ReportStore.markRead(btn.dataset.reportRead);
      if (typeof Api !== 'undefined') await Api.patchReport(btn.dataset.reportRead, { unread: false });
      renderReports();
    });
  });
  root.querySelectorAll('[data-report-close]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.reportClose;
      const resolution = window.prompt('Причина закрытия', 'проверено') || 'закрыта';
      const reply = window.prompt('Ответ (необязательно)', '') || '';
      const list = ReportStore.list().map((row) => (row.id === id ? { ...row, unread: false, status: 'closed', resolution, reply } : row));
      ReportStore.write(list);
      if (typeof Api !== 'undefined') await Api.patchReport(id, { unread: false, status: 'closed', resolution, reply });
      addLocalLog('report_update', id, 'closed');
      renderReports();
    });
  });
  root.querySelectorAll('[data-report-hide]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const name = btn.dataset.reportHide;
      const profile = ProfileStore.get(name);
      if (!profile) {
        showToast('Карточка не создана', 'error');
        return;
      }
      if (!window.confirm(`Скрыть карточку @${name}?`)) return;
      ProfileStore.save(name, { ...profile, hidden: true });
      if (typeof Api !== 'undefined') {
        await Api.adminUserAction(name, 'hide', { hidden: true });
        await Api.patchReport(btn.dataset.report, { hide_profile: true, status: 'closed', resolution: 'карточка скрыта' });
      }
      addLocalLog('report_hide', name);
      renderReports();
    });
  });
  root.querySelectorAll('[data-report-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.reportDelete;
      ReportStore.remove(id);
      if (typeof Api !== 'undefined') Api.deleteReport(id);
      addLocalLog('report_delete', id);
      renderReports();
    });
  });

  syncReportBadge();
}

async function renderPayments() {
  const root = document.querySelector('[data-view="payments"]');
  if (!root) return;
  let rows = [];
  if (typeof Api !== 'undefined') {
    const res = await Api.adminPayments();
    if (res.ok && Array.isArray(res.payments)) rows = res.payments;
  }
  root.innerHTML = `
    <div class="admin-head">
      <div>
        <h1>Оплаты</h1>
        <p>Заявки на Star+. Подтверждение активирует доступ.</p>
      </div>
    </div>
    ${rows.length ? rows.map((row) => `
      <article class="admin-report">
        <div class="admin-report-top">
          <strong>@${escapeHtml(row.username)} · ${row.amount} ₽ · ${escapeHtml(row.method || 'transfer')}</strong>
          <span class="admin-chip ${row.status === 'paid' ? 'admin-chip--on' : 'admin-chip--off'}">${escapeHtml(row.status)}</span>
        </div>
        <p class="admin-report-meta">${formatWhen(row.created_at)}</p>
        ${row.note ? `<p class="admin-report-text">${escapeHtml(row.note)}</p>` : ''}
        ${row.status === 'pending' ? `
          <div class="admin-report-acts">
            <button type="button" class="btn btn-primary btn-sm" data-pay-confirm="${escapeHtml(row.id)}">Подтвердить</button>
            <button type="button" class="btn btn-ghost btn-sm" data-pay-reject="${escapeHtml(row.id)}">Отклонить</button>
          </div>` : ''}
      </article>
    `).join('') : '<p class="admin-empty">Заявок нет</p>'}
  `;
  root.querySelectorAll('[data-pay-confirm]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const res = await Api.adminPaymentAction(btn.dataset.payConfirm, 'confirm');
      if (res.ok) {
        const row = rows.find((item) => item.id === btn.dataset.payConfirm);
        if (row) Premium.activate(row.username, { skipRemote: true });
        addLocalLog('pay_confirm', row?.username || '', btn.dataset.payConfirm);
      }
      renderPayments();
    });
  });
  root.querySelectorAll('[data-pay-reject]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await Api.adminPaymentAction(btn.dataset.payReject, 'reject');
      addLocalLog('pay_reject', '', btn.dataset.payReject);
      renderPayments();
    });
  });
}

async function renderMail() {
  const root = document.querySelector('[data-view="mail"]');
  if (!root) return;
  let rows = typeof LocalMail !== 'undefined' ? LocalMail.list() : [];
  if (typeof Api !== 'undefined') {
    const res = await Api.adminMail();
    if (res.ok && Array.isArray(res.mail)) rows = res.mail;
  }
  root.innerHTML = `
    <div class="admin-head">
      <div>
        <h1>Письма</h1>
        <p>Исходящие письма. Код восстановления не показывается пользователю.</p>
      </div>
    </div>
    ${rows.length ? rows.map((row) => `
      <article class="admin-report">
        <div class="admin-report-top">
          <strong>${escapeHtml(row.subject || 'Письмо')}</strong>
          <span class="admin-chip ${row.sent ? 'admin-chip--on' : 'admin-chip--off'}">${row.sent ? 'отправлено' : 'в очереди'}</span>
        </div>
        <p class="admin-report-meta">${escapeHtml(row.recipient || '—')} · ${formatWhen(row.created_at)}</p>
        <pre class="admin-mail-body">${escapeHtml(row.body || '')}</pre>
      </article>
    `).join('') : '<p class="admin-empty">Писем нет</p>'}
  `;
}

async function renderLog() {
  const root = document.querySelector('[data-view="log"]');
  if (!root) return;
  let rows = localLog();
  if (typeof Api !== 'undefined') {
    const res = await Api.adminLog();
    if (res.ok && Array.isArray(res.log)) rows = res.log;
  }
  root.innerHTML = `
    <div class="admin-head">
      <div>
        <h1>Журнал</h1>
        <p>Действия администрирования.</p>
      </div>
    </div>
    ${rows.length ? `<div class="admin-log">${rows.map((row) => `
      <div class="admin-log-row">
        <span>${formatWhen(row.created_at)}</span>
        <strong>@${escapeHtml(row.actor || 'admin')}</strong>
        <span>${escapeHtml(LOG_LABELS[row.action] || row.action)}</span>
        <span>${row.target ? `@${escapeHtml(row.target)}` : ''}</span>
        <span class="admin-log-detail">${escapeHtml(row.detail || '')}</span>
      </div>
    `).join('')}</div>` : '<p class="admin-empty">Записей нет</p>'}
  `;
}

function syncReportBadge() {
  const badge = document.getElementById('admin-report-count');
  if (!badge || typeof ReportStore === 'undefined') return;
  const count = ReportStore.unreadCount();
  badge.hidden = count === 0;
  badge.textContent = String(count);
}
