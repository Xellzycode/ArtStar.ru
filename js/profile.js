const PHONE_VIEW_MQ = window.matchMedia('(max-width: 768px)');

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('profile-content');
  if (!container) return;

  await MediaStore.init();
  if (typeof Api !== 'undefined' && Api.ready) await Api.ready;

  const username = getUsernameFromUrl();

  if (!username) {
    renderEmpty(container);
    return;
  }

  const profile = typeof ProfileStore.pull === 'function'
    ? await ProfileStore.pull(username)
    : ProfileStore.get(username);

  if (!profile) {
    renderNotFound(container, username);
    setProfileMeta({ username, display_name: username, bio: 'Профиль не найден' });
    return;
  }

  if (profile.hidden) {
    renderHidden(container, username);
    setProfileMeta({ username, display_name: profile.display_name || username, bio: 'Карточка скрыта' });
    return;
  }

  ProfileStats.registerView(username);

  setProfileMeta(profile);
  renderPublicProfile(profile, container);
});

function renderPublicProfile(profile, container) {
  let phonePreview = false;
  let mediaUnlocked = !profileNeedsEntryGate(profile);

  container.innerHTML = `
    <div class="profile-view-wrapper">
      <div class="profile-view-actions">
        <button type="button" class="profile-view-action" id="profile-share-btn" title="QR-код и ссылка на карточку">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>
          </svg>
          <span class="profile-view-action-label">Поделиться</span>
        </button>
        <button type="button" class="profile-view-toggle" id="profile-view-toggle" aria-pressed="false">
          <svg class="profile-view-toggle-icon profile-view-toggle-icon--phone" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
          <svg class="profile-view-toggle-icon profile-view-toggle-icon--desktop hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          <span class="profile-view-toggle-label">Вид на телефоне</span>
        </button>
      </div>
      <div id="profile-viewport" class="profile-viewport profile-viewport--desktop"></div>
    </div>
  `;

  const viewport = document.getElementById('profile-viewport');
  const toggle = document.getElementById('profile-view-toggle');
  const page = document.getElementById('profile-page');

  function updateView({ autoplay = false } = {}) {
    const onMobile = PHONE_VIEW_MQ.matches;
    const showPhone = !onMobile && phonePreview;

    page?.classList.toggle('profile-page--phone-preview', showPhone);

    if (showPhone) {
      viewport.className = 'profile-viewport profile-viewport--phone';
      viewport.innerHTML = renderPhoneFrameHTML(profile);
    } else {
      viewport.className = 'profile-viewport profile-viewport--desktop';
      viewport.innerHTML = renderProfileCardHTML(profile, { fullpage: true });
    }

    ProfileEffects.apply(viewport, profile, { autoplay });

    toggle.setAttribute('aria-pressed', String(showPhone));
    toggle.querySelector('.profile-view-toggle-label').textContent = showPhone ? 'Полный экран' : 'Вид на телефоне';
    toggle.querySelector('.profile-view-toggle-icon--phone')?.classList.toggle('hidden', showPhone);
    toggle.querySelector('.profile-view-toggle-icon--desktop')?.classList.toggle('hidden', !showPhone);
    toggle.style.display = onMobile ? 'none' : '';
  }

  toggle.addEventListener('click', () => {
    phonePreview = !phonePreview;
    updateView({ autoplay: mediaUnlocked });
  });

  document.getElementById('profile-share-btn')?.addEventListener('click', () => {
    openShareModal(profile);
  });

  PHONE_VIEW_MQ.addEventListener('change', () => {
    if (PHONE_VIEW_MQ.matches) phonePreview = false;
    updateView({ autoplay: mediaUnlocked });
  });

  if (mediaUnlocked) {
    updateView();
    return;
  }

  mountEntryGate(profile, () => {
    mediaUnlocked = true;
    updateView({ autoplay: true });
    viewport.classList.add('is-revealing');
    viewport.addEventListener('animationend', () => {
      viewport.classList.remove('is-revealing');
    }, { once: true });
  });
}

function renderNotFound(container, username) {
  container.innerHTML = `
    <div class="page-status">
      <p class="page-status-kicker">404</p>
      <h1>Карточка @${escapeHtml(username)} не найдена</h1>
      <p>Страница с таким именем пользователя отсутствует. Карточка создаётся в конструкторе.</p>
      <div class="profile-stub-actions">
        <a href="/mefloverxd" class="btn btn-secondary">Пример</a>
        <a href="dashboard.html" class="btn btn-primary">Конструктор</a>
        <a href="index.html" class="btn btn-secondary">На главную</a>
      </div>
    </div>
  `;
}

function renderHidden(container, username) {
  container.innerHTML = `
    <div class="page-status">
      <p class="page-status-kicker">Скрыто</p>
      <h1>Карточка @${escapeHtml(username)} недоступна</h1>
      <p>Страница скрыта владельцем или администратором.</p>
      <div class="profile-stub-actions">
        <a href="index.html" class="btn btn-primary">На главную</a>
      </div>
    </div>
  `;
}

function renderEmpty(container) {
  container.innerHTML = `
    <div class="profile-not-found-card">
      <h1>Не указано имя пользователя</h1>
      <p>Страница открывается по короткой ссылке <code class="inline-code">/username</code></p>
      <div class="profile-stub-actions">
        <a href="/mefloverxd" class="btn btn-secondary">Пример: mefloverxd</a>
        <a href="index.html" class="btn btn-primary">На главную</a>
      </div>
    </div>
  `;
}
