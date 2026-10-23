const LOCAL_MAIL_KEY = 'vibecard_mail';

const LocalMail = {
  list() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_MAIL_KEY) || '[]') || [];
    } catch {
      return [];
    }
  },

  add(row) {
    const list = this.list();
    list.unshift({
      id: crypto.randomUUID(),
      recipient: row.recipient || '',
      subject: row.subject || '',
      body: row.body || '',
      kind: row.kind || 'message',
      sent: false,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(LOCAL_MAIL_KEY, JSON.stringify(list.slice(0, 80)));
  },
};

const AUTH_KEY = 'vibecard_auth';
const LAST_USER_KEY = 'vibecard_last_username';
const ACCOUNTS_KEY = 'vibecard_accounts';

async function hashSecret(value) {
  const data = new TextEncoder().encode(`vibecard-v1:${String(value)}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

const AccountStore = {
  read() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]') || [];
    } catch {
      return [];
    }
  },

  write(list) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  },

  list() {
    return this.read();
  },

  findByEmail(email) {
    const n = String(email || '').trim().toLowerCase();
    return this.read().find((a) => a.email === n) || null;
  },

  findByUsername(username) {
    const n = normalizeUsername(username);
    return this.read().find((a) => a.username === n) || null;
  },

  findByLogin(login) {
    const n = String(login || '').trim().toLowerCase();
    if (n.includes('@')) return this.findByEmail(n);
    return this.findByUsername(n) || this.findByEmail(n);
  },

  save(account) {
    const list = this.read().filter((a) => a.id !== account.id && a.username !== account.username);
    list.push(account);
    this.write(list);
  },

  remove(username) {
    const n = normalizeUsername(username);
    this.write(this.read().filter((a) => a.username !== n));
  },

  rename(oldName, newName) {
    const from = normalizeUsername(oldName);
    const to = normalizeUsername(newName);
    const list = this.read();
    const acc = list.find((a) => a.username === from);
    if (!acc) return;
    acc.username = to;
    this.write(list);
  },
};

const Auth = {

  getUser() {
    try {
      const data = localStorage.getItem(AUTH_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return this.getUser() !== null;
  },

  setSession(account) {
    const user = {
      id: account.id,
      username: account.username,
      displayName: account.displayName || account.username,
      email: account.email || '',
      provider: account.provider || 'email',
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    localStorage.setItem(LAST_USER_KEY, user.username);
    return user;
  },

  async register({ email, username, password, displayName }) {
    const mail = String(email || '').trim().toLowerCase();
    const name = normalizeUsername(username);
    const pass = String(password || '');
    const shown = String(displayName || '').trim() || name;

    if (!isValidEmail(mail)) return { ok: false, error: 'Некорректная почта' };
    if (name.length < 3) return { ok: false, error: 'Имя пользователя — от 3 символов, латиница' };
    if (pass.length < 6) return { ok: false, error: 'Пароль — от 6 символов' };

    if (typeof Api !== 'undefined') {
      const remote = await Api.register({ email: mail, username: name, password: pass, displayName: shown });
      if (remote.ok && remote.user) {
        AccountStore.save({
          id: remote.user.id,
          email: remote.user.email,
          username: remote.user.username,
          displayName: remote.user.displayName,
          provider: remote.user.provider || 'email',
          createdAt: new Date().toISOString(),
        });
        if (!ProfileStore.exists(remote.user.username)) {
          ProfileStore.ensureProfile(remote.user.username, remote.user.displayName);
        }
        return { ok: true, user: this.setSession(remote.user) };
      }
      if (!remote.offline) return { ok: false, error: remote.error || 'Не удалось создать аккаунт' };
    }

    if (AccountStore.findByEmail(mail)) return { ok: false, error: 'Эта почта уже занята' };
    if (AccountStore.findByUsername(name)) return { ok: false, error: 'Это имя пользователя уже занято' };

    const account = {
      id: crypto.randomUUID(),
      email: mail,
      username: name,
      displayName: shown,
      passwordHash: await hashSecret(pass),
      provider: 'email',
      createdAt: new Date().toISOString(),
    };
    AccountStore.save(account);
    if (!ProfileStore.exists(name)) {
      ProfileStore.ensureProfile(name, shown);
    }
    return { ok: true, user: this.setSession(account) };
  },

  async signIn(login, password) {
    if (typeof Api !== 'undefined') {
      const remote = await Api.login(login, password);
      if (remote.ok && remote.user) {
        AccountStore.save({
          id: remote.user.id,
          email: remote.user.email,
          username: remote.user.username,
          displayName: remote.user.displayName,
          provider: remote.user.provider || 'email',
          createdAt: new Date().toISOString(),
        });
        ProfileStore.ensureProfile(remote.user.username, remote.user.displayName);
        if (typeof ProfileStore.pull === 'function') {
          await ProfileStore.pull(remote.user.username);
        }
        return { ok: true, user: this.setSession(remote.user) };
      }
      if (!remote.offline) return { ok: false, error: remote.error || 'Неверная почта или пароль' };
    }

    const account = AccountStore.findByLogin(login);
    if (account) {
      if (!String(password || '')) return { ok: false, error: 'Необходимо ввести пароль' };
      const hash = await hashSecret(password);
      if (hash !== account.passwordHash) return { ok: false, error: 'Неверная почта или пароль' };
      ProfileStore.ensureProfile(account.username, account.displayName);
      return { ok: true, user: this.setSession(account) };
    }

    const raw = String(login || '').trim();
    if (raw.includes('@')) return { ok: false, error: 'Аккаунта с этой почтой нет' };

    const name = normalizeUsername(raw);
    if (ProfileStore.get(name)) {
      const user = this.enterProfile(name);
      return user ? { ok: true, user } : { ok: false, error: 'Необходима почта и пароль' };
    }
    return { ok: false, error: 'Карточка не найдена. Требуется регистрация или другое имя пользователя' };
  },

  enterProfile(username) {
    const profile = ProfileStore.get(username);
    if (!profile) return null;
    if (AccountStore.findByUsername(username)) return null;
    return this.setSession({
      id: crypto.randomUUID(),
      username: profile.username,
      displayName: profile.display_name || profile.username,
      email: '',
      provider: 'local',
    });
  },

  signOut() {
    if (typeof Api !== 'undefined') Api.logout();
    localStorage.removeItem(AUTH_KEY);
    window.location.href = 'index.html';
  },

  maskEmail(email) {
    const value = String(email || '').trim();
    const at = value.indexOf('@');
    if (at < 1) return value;
    const name = value.slice(0, at);
    const domain = value.slice(at);
    const keep = name.slice(0, 2);
    return `${keep}${'•'.repeat(Math.max(name.length - 2, 1))}${domain}`;
  },

  async requestReset(login) {
    if (typeof Api !== 'undefined') {
      const remote = await Api.requestReset(login);
      if (remote.ok) return remote;
      if (!remote.offline) return { ok: false, error: remote.error || 'Не удалось выслать код' };
    }

    const account = AccountStore.findByLogin(login);
    if (!account) return { ok: false, error: 'Аккаунт с такой почтой или именем пользователя не найден' };
    if (!account.email) return { ok: false, error: 'К этой карточке почта не привязана. Вход по имени пользователя' };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    account.resetHash = await hashSecret(code);
    account.resetUntil = Date.now() + 15 * 60 * 1000;
    AccountStore.save(account);
    if (typeof LocalMail !== 'undefined') {
      LocalMail.add({
        recipient: account.email,
        subject: 'Восстановление доступа — Art Star',
        body: `Код восстановления доступа Art Star: ${code}\nИмя пользователя: @${account.username}\nСрок действия — 15 минут.\n`,
        kind: 'reset',
      });
    }
    return {
      ok: true,
      email: this.maskEmail(account.email),
      username: account.username,
    };
  },

  async resetPassword(login, code, password) {
    if (typeof Api !== 'undefined') {
      const remote = await Api.resetPassword(login, code, password);
      if (remote.ok) return remote;
      if (!remote.offline) return { ok: false, error: remote.error || 'Не удалось сменить пароль' };
    }

    const account = AccountStore.findByLogin(login);
    if (!account?.resetHash) return { ok: false, error: 'Сначала необходимо запросить код' };
    if (Date.now() > Number(account.resetUntil || 0)) {
      return { ok: false, error: 'Срок действия кода истёк. Необходимо запросить новый' };
    }
    const pass = String(password || '');
    if (pass.length < 6) return { ok: false, error: 'Пароль — от 6 символов' };
    if (await hashSecret(code) !== account.resetHash) {
      return { ok: false, error: 'Неверный код' };
    }
    account.passwordHash = await hashSecret(pass);
    delete account.resetHash;
    delete account.resetUntil;
    AccountStore.save(account);
    return { ok: true, username: account.username };
  },

  requireAuth(redirectTo = 'dashboard.html') {
    if (!this.isLoggedIn()) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  },

  redirectIfLoggedIn(redirectTo = 'dashboard.html') {
    if (this.isLoggedIn()) {
      window.location.href = redirectTo;
      return true;
    }
    return false;
  },
};

function profileStamp(profile) {
  const raw = profile?.updated_at || profile?.created_at || '';
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : 0;
}

function preferNewerProfile(local, remote) {
  if (!local) return remote;
  if (!remote) return local;
  return profileStamp(local) >= profileStamp(remote) ? local : remote;
}

const ProfileStore = {
  PREFIX: 'vibecard_profile_',

  get(username) {
    try {
      const data = localStorage.getItem(this.PREFIX + username);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  save(username, profile, options = {}) {
    try {
      const saved = {
        ...profile,
        updated_at: options.keepTimestamp && profile.updated_at
          ? profile.updated_at
          : new Date().toISOString(),
      };
      localStorage.setItem(this.PREFIX + username, JSON.stringify(saved));
      if (!options.skipRemote && typeof Api !== 'undefined') {
        Api.putProfile(username, saved);
      }
      return { ok: true };
    } catch (err) {
      const quotaExceeded = err instanceof DOMException
        && (err.name === 'QuotaExceededError' || err.code === 22);
      return { ok: false, quotaExceeded };
    }
  },

  ensureProfile(username, displayName) {
    if (!this.get(username)) {
      this.save(username, {
        username,
        display_name: displayName,
        bio: '',
        avatar_url: '',
        banner_url: '',
        bg_type: 'color',
        bg_color: '#000000',
        bg_gradient_from: '#262626',
        bg_gradient_to: '#000000',
        bg_video_url: '',
        bg_effect: 'none',
        name_color: '#ffffff',
        name_font: 'Inter',
        name_effect: 'none',
        card_opacity: 55,
        card_blur: 20,
        cursor_preset: 'default',
        hover_effect: 'none',
        music_url: '',
        music_title: '',
        badges: [],
        social_links: [],
        posts: [],
        show_stats: true,
        created_at: new Date().toISOString(),
      });
    }
  },

  exists(username) {
    return this.get(username) !== null;
  },

  async pull(username) {
    const name = normalizeUsername(username);
    if (!name) return null;
    const local = this.get(name);
    if (typeof Api === 'undefined') return local;
    const remote = await Api.getProfile(name);
    if (!remote.ok || !remote.profile) return local;
    const chosen = preferNewerProfile(local, remote.profile);
    this.save(name, chosen, { skipRemote: true, keepTimestamp: true });
    if (local && chosen === local && local.updated_at !== remote.profile.updated_at) {
      Api.putProfile(name, local);
    }
    if (remote.premium && typeof Premium !== 'undefined') Premium.activate(name, { skipRemote: true });
    if (remote.verified && typeof Verified !== 'undefined') Verified.grant(name, { skipRemote: true });
    return this.get(name);
  },

  remove(username) {
    const name = normalizeUsername(username);
    if (!name) return;
    localStorage.removeItem(this.PREFIX + name);
    AccountStore.remove(name);
    if (typeof Api !== 'undefined') Api.deleteProfile(name);
    if (typeof Premium !== 'undefined') Premium.deactivate(name);
    if (typeof Verified !== 'undefined') Verified.revoke(name);
    localStorage.removeItem(`vibecard_stats_${name}`);
    localStorage.removeItem(`vibecard_liked_${name}`);
    localStorage.removeItem(`vibecard_viewed_${name}`);
  },

  list() {
    const profiles = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(this.PREFIX)) continue;
      const profile = this.get(key.slice(this.PREFIX.length));
      if (profile?.username) profiles.push(profile);
    }
    return profiles.sort((a, b) => String(b.updated_at || b.created_at || '')
      .localeCompare(String(a.updated_at || a.created_at || '')));
  },
};

function seedDemoProfile() {
  const existing = ProfileStore.get('demo');
  const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

  const demoProfile = {
    username: 'demo',
    display_name: 'Demo User',
    bio: 'Дизайнер · Геймер · Creator ✦',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
    banner_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    bg_type: 'gradient',
    bg_color: '#0a0a0a',
    bg_gradient_from: '#262626',
    bg_gradient_to: '#000000',
    bg_video_url: '',
    bg_effect: 'aurora',
    name_color: '#ffffff',
    name_font: 'Inter',
    name_effect: 'shine',
    card_opacity: 45,
    card_blur: 22,
    cursor_preset: 'dot',
    hover_effect: 'glow',
    click_effect: 'spark',
    layout_split: 'posts',
    music_compact: false,
    widget_status: 'Собираю новый плейлист',
    widget_clock: true,
    widget_clock_tz: 'Europe/Moscow',
    widget_countdown_date: '',
    widget_countdown_label: 'Стрим',
    music_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    music_title: 'Vibe Track',
    badges: [
      { id: '1', text: 'Creator', color: '#ffffff', icon: '✦' },
      { id: '2', text: 'Pro', color: '#a3a3a3', icon: '★' },
    ],
    social_links: [
      { id: '1', platform: 'discord', url: 'https://discord.com', label: 'Discord' },
      { id: '2', platform: 'telegram', url: 'https://telegram.org', label: 'Telegram' },
      { id: '3', platform: 'github', url: 'https://github.com', label: 'GitHub' },
    ],
    posts: [
      { id: '1', text: 'Обновил карточку: новый фон и эффект имени. Залетай посмотреть ✦', image: '', created_at: hoursAgo(3) },
      { id: '2', text: 'Стримлю сегодня в 20:00 — ссылка в соцсетях', image: '', created_at: hoursAgo(30) },
      { id: '3', text: 'Собрал плейлист под работу. Трек играет прямо тут', image: '', created_at: hoursAgo(96) },
    ],
    show_stats: true,
    created_at: new Date().toISOString(),
  };

  if (!existing) {
    ProfileStore.save('demo', demoProfile, { skipRemote: true });
  } else if (existing.layout_split === undefined) {
    ProfileStore.save('demo', { ...demoProfile, ...existing, created_at: existing.created_at }, { skipRemote: true, keepTimestamp: true });
  }
}

function seedCreatorExample() {
  if (ProfileStore.get('mefloverxd')) return;
  ProfileStore.save('mefloverxd', {
    username: 'mefloverxd',
    display_name: 'Meflover',
    bio: '',
    avatar_url: '',
    banner_url: '',
    bg_type: 'color',
    bg_color: '#0b0b10',
    bg_gradient_from: '#262626',
    bg_gradient_to: '#000000',
    bg_image_url: '',
    bg_video_url: '',
    bg_effect: 'rays',
    name_color: '#ffffff',
    name_font: 'Bebas Neue',
    name_effect: 'neon',
    card_opacity: 44,
    card_blur: 18,
    cursor_preset: 'ring',
    hover_effect: 'glow',
    click_effect: 'spark',
    layout_split: 'socials',
    gap_name: 18,
    gap_bio: 12,
    gap_status: 12,
    gap_badges: 14,
    gap_widgets: 14,
    gap_stats: 16,
    gap_socials: 20,
    gap_posts: 20,
    music_compact: true,
    widget_status: 'В эфире',
    widget_clock: false,
    widget_clock_tz: 'Europe/Moscow',
    widget_countdown_date: '2026-08-28T20:00',
    widget_countdown_label: 'Стрим',
    music_url: '',
    music_title: '',
    badges: [
      { id: '1', text: 'LIVE', color: '#ff4d4d', icon: '🔥' },
      { id: '2', text: 'Twitch', color: '#9146ff', icon: '◉' },
    ],
    social_links: [],
    posts: [],
    show_stats: true,
    created_at: '2026-08-26T16:32:17.013Z',
  });
}

seedDemoProfile();
seedCreatorExample();

function initAuthUI(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { onSuccess, redirectTo = 'dashboard.html' } = options;

  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    container.innerHTML = `
      <div class="auth-card card card-glow">
        <h2>Вы уже вошли</h2>
        <p>Добро пожаловать, ${escapeHtml(user.displayName)}!</p>
        <a href="dashboard.html" class="btn btn-primary" style="width:100%;margin-bottom:12px;">
          Перейти в конструктор
        </a>
        <button class="btn btn-secondary" style="width:100%;" id="auth-signout">
          Выйти
        </button>
      </div>
    `;
    document.getElementById('auth-signout')?.addEventListener('click', () => Auth.signOut());
    return;
  }

  const localProfiles = ProfileStore.list().filter((p) => (
    p.username !== 'demo' && !AccountStore.findByUsername(p.username)
  ));
  const resumeHtml = localProfiles.length
    ? `
      <div class="auth-resume">
        <p class="auth-resume-label">Открыть без пароля</p>
        ${localProfiles.map((p) => `
          <button type="button" class="auth-resume-btn" data-username="${escapeHtml(p.username)}">
            <span class="auth-resume-avatar">${escapeHtml((p.display_name || p.username).charAt(0).toUpperCase())}</span>
            <span class="auth-resume-copy">
              <span class="auth-resume-name">${escapeHtml(p.display_name || p.username)}</span>
              <span class="auth-resume-user">@${escapeHtml(p.username)}</span>
            </span>
          </button>
        `).join('')}
      </div>
    `
    : '';

  container.innerHTML = `
    <div class="auth-card card card-glow">
      <h2>Art Star</h2>
      <p class="auth-lead">Вход по почте и паролю. Ранее созданная карточка открывается по имени пользователя без пароля.</p>
      <div class="auth-tabs" role="tablist">
        <button type="button" class="auth-tab is-active" data-auth-tab="login">Вход</button>
        <button type="button" class="auth-tab" data-auth-tab="register">Регистрация</button>
      </div>

      <form class="auth-form" id="auth-login-form">
        <label class="form-label" for="auth-login">Почта или имя пользователя</label>
        <input class="form-input" id="auth-login" name="login" type="text" autocomplete="username" required>
        <label class="form-label" for="auth-password">Пароль</label>
        <input class="form-input" id="auth-password" name="password" type="password" autocomplete="current-password">
        <p class="form-hint">Для карточки без аккаунта поле пароля оставляется пустым.</p>
        <p class="auth-error" id="auth-login-error" hidden></p>
        <button type="submit" class="btn btn-primary auth-submit">Войти</button>
        <button type="button" class="auth-forgot" id="auth-forgot-open">Восстановление пароля</button>
      </form>

      <form class="auth-form hidden" id="auth-reset-form">
        <label class="form-label" for="auth-reset-login">Почта или имя пользователя</label>
        <input class="form-input" id="auth-reset-login" name="login" type="text" autocomplete="username" required>
        <div id="auth-reset-code-box" class="hidden">
          <p class="form-hint" id="auth-reset-mail-hint"></p>
          <p class="auth-reset-code" id="auth-reset-code-show" hidden></p>
          <label class="form-label" for="auth-reset-code">Код из письма</label>
          <input class="form-input" id="auth-reset-code" name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code">
          <label class="form-label" for="auth-reset-password">Новый пароль</label>
          <input class="form-input" id="auth-reset-password" name="password" type="password" autocomplete="new-password">
          <label class="form-label" for="auth-reset-password2">Повтор пароля</label>
          <input class="form-input" id="auth-reset-password2" name="password2" type="password" autocomplete="new-password">
        </div>
        <p class="auth-error" id="auth-reset-error" hidden></p>
        <button type="submit" class="btn btn-primary auth-submit" id="auth-reset-submit">Выслать код</button>
        <button type="button" class="auth-forgot" id="auth-reset-back">Назад ко входу</button>
      </form>

      <form class="auth-form hidden" id="auth-register-form">
        <label class="form-label" for="auth-reg-email">Почта</label>
        <input class="form-input" id="auth-reg-email" name="email" type="email" autocomplete="email" required>
        <label class="form-label" for="auth-reg-username">Имя пользователя</label>
        <input class="form-input" id="auth-reg-username" name="username" type="text" autocomplete="username" required>
        <p class="form-hint">Латиница, цифры, _ и - · от 3 символов. Если имя уже занято, карточка привязывается к почте.</p>
        <label class="form-label" for="auth-reg-password">Пароль</label>
        <input class="form-input" id="auth-reg-password" name="password" type="password" autocomplete="new-password" required>
        <label class="form-label" for="auth-reg-password2">Повтор пароля</label>
        <input class="form-input" id="auth-reg-password2" name="password2" type="password" autocomplete="new-password" required>
        <p class="auth-error" id="auth-register-error" hidden></p>
        <button type="submit" class="btn btn-primary auth-submit">Создать аккаунт</button>
      </form>
      ${resumeHtml}
    </div>
  `;

  const loginForm = container.querySelector('#auth-login-form');
  const registerForm = container.querySelector('#auth-register-form');
  const resetForm = container.querySelector('#auth-reset-form');
  const loginError = container.querySelector('#auth-login-error');
  const registerError = container.querySelector('#auth-register-error');
  const resetError = container.querySelector('#auth-reset-error');
  const resetCodeBox = container.querySelector('#auth-reset-code-box');
  const resetSubmit = container.querySelector('#auth-reset-submit');
  const tabs = container.querySelector('.auth-tabs');
  const resume = container.querySelector('.auth-resume');
  let resetReady = false;

  const showError = (el, text) => {
    if (!el) return;
    el.hidden = !text;
    el.textContent = text || '';
  };

  const finish = (user, hello) => {
    showToast(hello || 'Вход выполнен');
    if (onSuccess) onSuccess(user);
    else window.location.href = redirectTo;
  };

  const showAuthView = (mode) => {
    loginForm?.classList.toggle('hidden', mode !== 'login');
    registerForm?.classList.toggle('hidden', mode !== 'register');
    resetForm?.classList.toggle('hidden', mode !== 'reset');
    tabs?.classList.toggle('hidden', mode === 'reset');
    resume?.classList.toggle('hidden', mode === 'reset');
    if (mode !== 'reset') {
      resetReady = false;
      resetCodeBox?.classList.add('hidden');
      if (resetSubmit) resetSubmit.textContent = 'Выслать код';
    }
  };

  container.querySelectorAll('[data-auth-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('[data-auth-tab]').forEach((el) => {
        el.classList.toggle('is-active', el === tab);
      });
      showAuthView(tab.dataset.authTab);
    });
  });

  container.querySelector('#auth-forgot-open')?.addEventListener('click', () => {
    const login = loginForm?.login?.value || '';
    if (resetForm?.login) resetForm.login.value = login;
    showError(resetError, '');
    showAuthView('reset');
  });

  container.querySelector('#auth-reset-back')?.addEventListener('click', () => {
    container.querySelectorAll('[data-auth-tab]').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.authTab === 'login');
    });
    showAuthView('login');
  });

  resetForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError(resetError, '');
    const login = resetForm.login.value;
    if (!resetReady) {
      resetSubmit.disabled = true;
      const result = await Auth.requestReset(login);
      resetSubmit.disabled = false;
      if (!result.ok) {
        showError(resetError, result.error);
        return;
      }
      resetReady = true;
      resetCodeBox?.classList.remove('hidden');
      const hint = container.querySelector('#auth-reset-mail-hint');
      const show = container.querySelector('#auth-reset-code-show');
      if (hint) hint.textContent = `Если почта ${result.email} привязана к аккаунту, письмо с кодом уже отправлено. Срок действия — 15 минут.`;
      if (show) show.textContent = '';
      if (resetSubmit) resetSubmit.textContent = 'Сменить пароль';
      return;
    }
    if (resetForm.password.value !== resetForm.password2.value) {
      showError(resetError, 'Пароли не совпадают');
      return;
    }
    resetSubmit.disabled = true;
    const result = await Auth.resetPassword(login, resetForm.code.value, resetForm.password.value);
    resetSubmit.disabled = false;
    if (!result.ok) {
      showError(resetError, result.error);
      return;
    }
    const signed = await Auth.signIn(result.username, resetForm.password.value);
    if (!signed.ok) {
      showError(resetError, 'Пароль изменён. Необходим вход с новым паролем');
      showAuthView('login');
      return;
    }
    finish(signed.user, 'Пароль обновлён');
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError(loginError, '');
    const btn = loginForm.querySelector('[type="submit"]');
    btn.disabled = true;
    const result = await Auth.signIn(loginForm.login.value, loginForm.password.value);
    btn.disabled = false;
    if (!result.ok) {
      showError(loginError, result.error);
      return;
    }
    finish(result.user);
  });

  registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showError(registerError, '');
    if (registerForm.password.value !== registerForm.password2.value) {
      showError(registerError, 'Пароли не совпадают');
      return;
    }
    const btn = registerForm.querySelector('[type="submit"]');
    btn.disabled = true;
    const result = await Auth.register({
      email: registerForm.email.value,
      username: registerForm.username.value,
      password: registerForm.password.value,
    });
    btn.disabled = false;
    if (!result.ok) {
      showError(registerError, result.error);
      return;
    }
    finish(result.user, 'Аккаунт создан');
  });

  container.querySelectorAll('.auth-resume-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const user = Auth.enterProfile(btn.dataset.username);
      if (!user) {
        showToast('Необходимы почта и пароль', 'error');
        return;
      }
      finish(user, 'Вход выполнен');
    });
  });
}

function isDashboardPage() {
  const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
  return path.endsWith('dashboard.html') || path.endsWith('/dashboard');
}

function initNavbar() {
  const navAuth = document.getElementById('nav-auth');
  if (!navAuth) return;

  const navLinks = document.getElementById('nav-links');
  const onDashboard = isDashboardPage();

  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    navAuth.innerHTML = `
      <div class="user-badge">
        <div class="user-badge-avatar">${user.displayName.charAt(0).toUpperCase()}</div>
        <span class="user-badge-name">${escapeHtml(user.displayName)}</span>
      </div>
      ${onDashboard ? '' : '<a href="dashboard.html" class="btn btn-primary btn-sm">Конструктор</a>'}
      <button class="btn btn-ghost btn-sm nav-auth-extra" id="nav-signout">Выйти</button>
    `;
    navLinks?.insertAdjacentHTML('beforeend',
      `${onDashboard ? '' : '<a class="nav-links-extra" href="dashboard.html">Конструктор</a>'}`
      + '<button type="button" class="nav-links-extra" id="nav-signout-menu">Выйти</button>');

    const signOut = () => Auth.signOut();
    document.getElementById('nav-signout')?.addEventListener('click', signOut);
    document.getElementById('nav-signout-menu')?.addEventListener('click', signOut);
  } else {
    navAuth.innerHTML = `
      <a href="dashboard.html" class="btn btn-ghost btn-sm nav-auth-extra">Войти</a>
      <a href="dashboard.html" class="btn btn-primary btn-sm">Создать карточку</a>
    `;
    navLinks?.insertAdjacentHTML('beforeend',
      '<a class="nav-links-extra" href="dashboard.html">Войти</a>'
      + '<a class="nav-links-extra" href="dashboard.html">Создать карточку</a>');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');
  if (!toggle || !navLinks) return;

  toggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
}

window.LocalMail = LocalMail;
window.preferNewerProfile = preferNewerProfile;
window.Auth = Auth;
window.AccountStore = AccountStore;
window.hashSecret = hashSecret;
window.ProfileStore = ProfileStore;
window.initAuthUI = initAuthUI;
window.initNavbar = initNavbar;
window.showToast = showToast;
window.escapeHtml = escapeHtml;
