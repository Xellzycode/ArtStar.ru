const SOCIAL_PLATFORMS = [
  { id: 'discord', name: 'Discord', icon: '💬', color: '#5865f2' },
  { id: 'telegram', name: 'Telegram', icon: '✈', color: '#26a5e4' },
  { id: 'vk', name: 'VK', icon: 'VK', color: '#0077ff' },
  { id: 'youtube', name: 'YouTube', icon: '▶', color: '#ff0000' },
  { id: 'twitch', name: 'Twitch', icon: '◉', color: '#9146ff' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: '#e1306c' },
  { id: 'twitter', name: 'X / Twitter', icon: '𝕏', color: '#e7e9ea' },
  { id: 'github', name: 'GitHub', icon: '⌘', color: '#f0f6fc' },
  { id: 'custom', name: 'Другое', icon: '🔗', color: '#94a3b8' },
];

const BADGE_SYMBOLS = ['', '★', '✦', '✧', '✶', '✹', '✪', '☆', '❖', '◆', '▲', '●', '■', '⬡'];
const BADGE_EMOJIS = ['🔥', '🎮', '🎵', '💎', '⚡', '🏆', '👑', '💀', '🌙', '🎧', '🚀', '💜'];
const BADGE_ICONS = [...BADGE_SYMBOLS, ...BADGE_EMOJIS];

const HOVER_EFFECTS = [
  { id: 'none', name: 'Нет', icon: '—' },
  { id: 'lift', name: 'Подъём', icon: '↑' },
  { id: 'glow', name: 'Свечение', icon: '✧' },
  { id: 'tilt', name: 'Наклон', icon: '⤡' },
  { id: 'pulse', name: 'Пульс', icon: '◉' },
];

function getPlatformMeta(platformId) {
  return SOCIAL_PLATFORMS.find((p) => p.id === platformId) || SOCIAL_PLATFORMS.find((p) => p.id === 'custom');
}

function renderVideoBgHTML(profile) {
  const p = normalizeProfile(profile);
  if (p.bg_type !== 'video' || !p.bg_video_url) return '';

  return `
    <div class="vcard-video-bg" aria-hidden="true">
      <video class="vcard-video" src="${escapeHtml(p.bg_video_url)}" muted loop playsinline autoplay></video>
      <div class="vcard-video-overlay"></div>
    </div>
  `;
}

function officialBadgeKind(badge) {
  if (badge.kind) return badge.kind;
  if (typeof isOfficialBadgeName !== 'function') return '';
  const key = typeof normalizeBadgeKey === 'function' ? normalizeBadgeKey(badge.text) : String(badge.text || '').toLowerCase();
  if (key === 'premium' || key === 'star') return 'premium';
  if (key === 'verified') return 'verified';
  if (key === 'developer') return 'developer';
  return '';
}

function renderBadgesHTML(badges = []) {
  if (!badges.length) return '';

  const items = badges.map((badge) => {
    const kind = badge.official ? officialBadgeKind(badge) : '';
    const extra = kind === 'premium'
      ? ' vcard-badge--premium'
      : kind === 'verified'
        ? ' vcard-badge--verified'
        : kind === 'developer'
          ? ' vcard-badge--developer'
          : '';
    const icon = kind === 'developer' && typeof developerGearHTML === 'function'
      ? developerGearHTML()
      : (badge.icon ? `<span class="vcard-badge-icon">${escapeHtml(badge.icon)}</span>` : '');
    return `
    <span class="vcard-badge${extra}" style="--badge-color:${escapeHtml(badge.color || '#ffffff')}">
      ${icon}
      ${escapeHtml(badge.text || 'Badge')}
    </span>`;
  }).join('');

  return `<div class="vcard-badges">${items}</div>`;
}

function renderSocialLinksHTML(links = []) {
  if (!links.length) return '';

  const items = links.filter((l) => l.url).map((link) => {
    const meta = getPlatformMeta(link.platform);
    const label = link.label || meta.name;
    const color = link.color || meta.color;
    return `
      <a href="${escapeHtml(link.url)}" class="vcard-social-link" target="_blank" rel="noopener noreferrer"
        style="--social-color:${escapeHtml(color)}" title="${escapeHtml(label)}">
        <span class="vcard-social-icon">${meta.icon}</span>
        <span class="vcard-social-label">${escapeHtml(label)}</span>
      </a>
    `;
  }).join('');

  if (!items) return '';
  return `<div class="vcard-socials">${items}</div>`;
}

function initVideoBackgrounds(root) {
  root.querySelectorAll('.vcard-video').forEach((video) => {
    video.play().catch(() => {});
  });
}

function createBadge(id = crypto.randomUUID()) {
  return { id, text: 'New', color: '#ffffff', icon: '★' };
}

function createSocialLink(id = crypto.randomUUID()) {
  const platform = SOCIAL_PLATFORMS[0];
  return { id, platform: platform.id, url: '', label: '', color: platform.color };
}

function bindDynamicItemFields(container, key, getItems, onChange) {
  const indexOf = (el) => {
    const holder = el.closest(`[data-${key}-index]`);
    return holder ? Number(holder.dataset[`${key}Index`]) : -1;
  };

  container.querySelectorAll('[data-field]').forEach((el) => {
    const index = indexOf(el);
    const field = el.dataset.field;
    if (index < 0 || !field) return;

    const event = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(event, () => {
      onChange(getItems().map((item, i) => (i === index ? { ...item, [field]: el.value } : item)));
    });
  });

  container.querySelectorAll('[data-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = indexOf(btn);
      if (index < 0) return;
      onChange(getItems().filter((_, i) => i !== index));
    });
  });
}

function renderBadgeIconPicker(selected) {
  const cell = (icon) => `
    <button type="button" class="badge-icon-btn${selected === icon ? ' active' : ''}"
      data-icon-pick="${escapeHtml(icon)}" title="${icon || 'Без значка'}">
      ${icon || '—'}
    </button>`;

  return `
    <div class="badge-icon-groups">
      <div class="badge-icon-toggles">
        <button type="button" class="badge-icon-toggle" data-icon-panel="symbols" aria-expanded="false">
          Символы <span class="badge-icon-chevron" aria-hidden="true"></span>
        </button>
        <button type="button" class="badge-icon-toggle" data-icon-panel="emoji" aria-expanded="false">
          Эмоджи <span class="badge-icon-chevron" aria-hidden="true"></span>
        </button>
      </div>
      <div class="badge-icon-group" data-icon-list="symbols" hidden>
        <div class="badge-icon-grid">${BADGE_SYMBOLS.map((icon) => cell(icon)).join('')}</div>
      </div>
      <div class="badge-icon-group" data-icon-list="emoji" hidden>
        <div class="badge-icon-grid badge-icon-grid--emoji">${BADGE_EMOJIS.map((icon) => cell(icon)).join('')}</div>
      </div>
    </div>`;
}

function renderBadgesEditor(container, getBadges, onChange) {
  if (!container) return;

  const badges = getBadges();

  container.innerHTML = badges.map((badge, index) => `
    <div class="dynamic-item" data-badge-index="${index}">
      <div class="dynamic-item-row">
        <input class="form-input" type="text" data-field="text" value="${escapeHtml(badge.text || '')}" placeholder="Текст бейджа">
        <input class="form-color form-color-sm" type="color" data-field="color" value="${badge.color || '#ffffff'}">
        <button type="button" class="btn btn-ghost btn-sm dynamic-remove" data-remove aria-label="Удалить">✕</button>
      </div>
      <div class="dynamic-item-row">
        ${renderBadgeIconPicker(badge.icon || '')}
      </div>
    </div>
  `).join('') || '<p class="form-hint dynamic-empty">Бейджи не добавлены</p>';

  bindDynamicItemFields(container, 'badge', getBadges, onChange);

  container.querySelectorAll('[data-icon-panel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const holder = btn.closest('[data-badge-index]');
      if (!holder) return;
      const panel = btn.dataset.iconPanel;
      const list = holder.querySelector(`[data-icon-list="${panel}"]`);
      if (!list) return;
      const open = list.hasAttribute('hidden');

      holder.querySelectorAll('[data-icon-list]').forEach((el) => {
        el.toggleAttribute('hidden', el !== list || !open);
      });
      holder.querySelectorAll('[data-icon-panel]').forEach((el) => {
        const expanded = el === btn && open;
        el.classList.toggle('is-open', expanded);
        el.setAttribute('aria-expanded', String(expanded));
      });
    });
  });

  container.querySelectorAll('[data-icon-pick]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const holder = btn.closest('[data-badge-index]');
      const index = holder ? Number(holder.dataset.badgeIndex) : -1;
      if (index < 0) return;
      holder.querySelectorAll('[data-icon-pick]').forEach((el) => {
        el.classList.toggle('active', el === btn);
      });
      onChange(getBadges().map((item, i) => (i === index ? { ...item, icon: btn.dataset.iconPick } : item)));
    });
  });
}

function renderSocialEditor(container, getLinks, onChange) {
  if (!container) return;

  const links = getLinks();

  container.innerHTML = links.map((link, index) => `
    <div class="dynamic-item" data-social-index="${index}">
      <div class="dynamic-item-row">
        <select class="form-select" data-field="platform">
          ${SOCIAL_PLATFORMS.map((p) => `
            <option value="${p.id}"${link.platform === p.id ? ' selected' : ''}>${p.icon} ${escapeHtml(p.name)}</option>
          `).join('')}
        </select>
        <button type="button" class="btn btn-ghost btn-sm dynamic-remove" data-remove aria-label="Удалить">✕</button>
      </div>
      <div class="dynamic-item-row">
        <input class="form-input" type="url" data-field="url" value="${escapeHtml(link.url || '')}" placeholder="https://...">
      </div>
      <div class="dynamic-item-row">
        <input class="form-input" type="text" data-field="label" value="${escapeHtml(link.label || '')}" placeholder="Подпись (необязательно)">
        <input class="form-color form-color-sm" type="color" data-field="color"
          value="${link.color || getPlatformMeta(link.platform).color}" title="Цвет кнопки">
      </div>
    </div>
  `).join('') || '<p class="form-hint dynamic-empty">Ссылки не добавлены</p>';

  bindDynamicItemFields(container, 'social', getLinks, onChange);
}

function renderPostsEditor(container, getPosts, onChange) {
  if (!container) return;

  const posts = getPosts();

  container.innerHTML = posts.map((post, index) => `
    <div class="dynamic-item" data-post-index="${index}">
      <div class="dynamic-item-row">
        <textarea class="form-textarea post-text" data-field="text" rows="3"
          maxlength="${POST_TEXT_LIMIT}" placeholder="Текст записи">${escapeHtml(post.text || '')}</textarea>
        <button type="button" class="btn btn-ghost btn-sm dynamic-remove" data-remove aria-label="Удалить">✕</button>
      </div>
      <div class="dynamic-item-row post-media-row">
        <div class="post-thumb${post.image ? ' is-filled' : ''}"
          style="${post.image ? `background-image:url('${escapeHtml(post.image)}')` : ''}"></div>
        <label class="btn btn-secondary btn-sm post-image-btn">
          ${post.image ? 'Заменить картинку' : 'Добавить картинку'}
          <input type="file" accept="image/*" data-post-file hidden>
        </label>
        ${post.image ? '<button type="button" class="btn btn-ghost btn-sm" data-post-image-clear>Убрать</button>' : ''}
        <span class="post-date">${escapeHtml(formatPostDate(post.created_at))}</span>
      </div>
    </div>
  `).join('') || '<p class="form-hint dynamic-empty">Записи не добавлены</p>';

  bindDynamicItemFields(container, 'post', getPosts, onChange);

  const indexOf = (el) => Number(el.closest('[data-post-index]')?.dataset.postIndex ?? -1);
  const patch = (index, changes) => {
    onChange(getPosts().map((item, i) => (i === index ? { ...item, ...changes } : item)));
  };

  container.querySelectorAll('[data-post-file]').forEach((input) => {
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      const index = indexOf(input);
      if (!file || index < 0) return;

      try {
        patch(index, { image: await compressImageFile(file, 'post') });
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        input.value = '';
      }
    });
  });

  container.querySelectorAll('[data-post-image-clear]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = indexOf(btn);
      if (index >= 0) patch(index, { image: '' });
    });
  });
}

window.SOCIAL_PLATFORMS = SOCIAL_PLATFORMS;
window.BADGE_ICONS = BADGE_ICONS;
window.BADGE_SYMBOLS = BADGE_SYMBOLS;
window.BADGE_EMOJIS = BADGE_EMOJIS;
window.HOVER_EFFECTS = HOVER_EFFECTS;
window.renderVideoBgHTML = renderVideoBgHTML;
window.renderBadgesHTML = renderBadgesHTML;
window.renderSocialLinksHTML = renderSocialLinksHTML;
window.initVideoBackgrounds = initVideoBackgrounds;
window.createBadge = createBadge;
window.createSocialLink = createSocialLink;
window.renderBadgesEditor = renderBadgesEditor;
window.renderSocialEditor = renderSocialEditor;
window.renderPostsEditor = renderPostsEditor;
