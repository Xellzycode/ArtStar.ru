document.addEventListener('DOMContentLoaded', async () => {
  const authScreen = document.getElementById('auth-screen');
  const dashboardScreen = document.getElementById('dashboard-screen');

  if (!authScreen || !dashboardScreen) return;

  initDashboardAmbient();

  await MediaStore.init();
  if (typeof Api !== 'undefined' && Api.ready) await Api.ready;

  if (Auth.isLoggedIn()) {
    await showDashboard();
  } else {
    showAuth();
  }

  function showAuth() {
    authScreen.style.display = 'flex';
    dashboardScreen.style.display = 'none';

    initAuthUI('auth-ui', {
      redirectTo: 'dashboard.html',
      onSuccess: async () => {
        authScreen.style.display = 'none';
        await showDashboard();
        initNavbar();
      },
    });
  }

  async function showDashboard() {
    authScreen.style.display = 'none';

    const user = Auth.getUser();
    ProfileStore.ensureProfile(user.username, user.displayName);
    if (typeof ProfileStore.pull === 'function') {
      await ProfileStore.pull(user.username);
    }

    const saved = ProfileStore.get(user.username);
    ProfileEditorStore.init(saved);

    const greeting = document.getElementById('dashboard-greeting');
    if (greeting) {
      greeting.textContent = 'Конструктор карточки: оформление, бейджи, ссылки, записи и видео-фон.';
    }

    prepareConstructorEnter();
    dashboardScreen.style.display = 'block';
    initConstructor(user);
  }
});

function initDashboardAmbient() {
  const canvas = document.getElementById('dashboard-canvas');
  const host = document.querySelector('.dashboard-ambient');
  if (!canvas || !host || typeof createConstellation !== 'function') return;

  createConstellation(canvas, host, {
    area: 26000,
    maxDots: 60,
    linkDist: 150,
    pointerDist: 220,
    speed: 0.14,
    dotAlpha: 0.22,
    lineAlpha: 0.08,
    pointerLines: false,
    ripples: false,
    pointerTarget: window,
  });
}

function initConstructor(user) {
  const form = document.getElementById('profile-form');
  const previewEl = document.getElementById('profile-preview');
  const fontSelect = document.getElementById('name_font');
  const bgTypeSelect = document.getElementById('bg_type');
  const profileLink = document.getElementById('profile-link');
  const openProfileBtn = document.getElementById('open-profile-btn');
  const gradientFields = document.getElementById('bg-gradient-fields');
  const colorFields = document.getElementById('bg-color-fields');
  const videoFields = document.getElementById('bg-video-fields');
  const imageFields = document.getElementById('bg-image-fields');
  const badgesEditor = document.getElementById('badges-editor');
  const socialEditor = document.getElementById('social-editor');
  const postsEditor = document.getElementById('posts-editor');
  const statsSummary = document.getElementById('stats-summary');
  const saveState = document.getElementById('save-state');
  const saveStateLabel = document.getElementById('save-state-label');
  const saveBtn = form.querySelector('button[type="submit"]');
  const dockSaveBtn = document.getElementById('dock-save');
  const dockOpenBtn = document.getElementById('dock-open-profile');

  let originalUsername = user.username;

  let savedSnapshot = '';
  let isDirty = false;

  function updateSaveState(state) {
    isDirty = JSON.stringify(state) !== savedSnapshot;
    saveState?.classList.toggle('is-dirty', isDirty);
    saveBtn?.classList.toggle('is-dirty', isDirty);
    dockSaveBtn?.classList.toggle('is-dirty', isDirty);
    if (saveStateLabel) {
      saveStateLabel.textContent = isDirty ? 'Не сохранено' : 'Сохранено';
    }
    if (saveState) {
      saveState.title = isDirty
        ? 'Есть несохранённые изменения'
        : 'Изменения сохранены';
    }
  }

  fontSelect.innerHTML = GOOGLE_FONTS.map(
    (f) => `<option value="${f.family}">${f.name}</option>`
  ).join('') + `<option value="${typeof CARD_CUSTOM_FONT !== 'undefined' ? CARD_CUSTOM_FONT : 'VibeCardCustom'}">Собственный шрифт</option>`;

  const premiumOn = typeof Premium !== 'undefined' && Premium.isActive();
  bgTypeSelect.innerHTML = BG_TYPES.map((t) => {
    const mark = t.id === 'video' && !premiumOn ? ' · Star+' : '';
    return `<option value="${t.id}">${t.name}${mark}</option>`;
  }).join('');

  function updateProfileLinks(username) {
    const u = username || 'username';
    const url = typeof siteProfileHref === 'function' ? siteProfileHref(u) : `/${encodeURIComponent(u)}`;
    profileLink.href = url;
    profileLink.textContent = typeof siteVanityLabel === 'function' ? siteVanityLabel(u) : `${u}`;
    openProfileBtn.href = url;
    dockOpenBtn?.setAttribute('href', url);
  }

  document.getElementById('templates-btn')?.addEventListener('click', () => {
    openTemplatesModal(ProfileEditorStore);
  });

  document.getElementById('shuffle-template-btn')?.addEventListener('click', () => {
    const result = applyRandomCardTemplate(ProfileEditorStore);
    if (!result) return;
    showToast(result.badgesAdded
      ? `Шаблон «${result.template.name}» применён. Бейджи можно изменить`
      : `Шаблон «${result.template.name}» применён`);
  });

  document.getElementById('share-btn')?.addEventListener('click', () => {
    const state = ProfileEditorStore.getState();
    if (!state.username) {
      showToast('Необходимо указать имя пользователя', 'error');
      form.username.focus();
      return;
    }
    if (isDirty) showToast('Есть несохранённые изменения. По ссылке открывается последняя сохранённая версия');
    openShareModal(state);
  });

  renderPresetGrid('cursor-preset-grid', CURSOR_PRESETS, ProfileEditorStore.getState().cursor_preset || 'default', (value) => {
    ProfileEditorStore.setField('cursor_preset', value);
  });

  renderPresetGrid('bg-effect-grid', BG_EFFECTS, ProfileEditorStore.getState().bg_effect || 'none', (value) => {
    ProfileEditorStore.setField('bg_effect', value);
  }, 'bg_effect');

  renderPresetGrid('hover-effect-grid', HOVER_EFFECTS, ProfileEditorStore.getState().hover_effect || 'none', (value) => {
    ProfileEditorStore.setField('hover_effect', value);
  }, 'hover_effect');

  renderPresetGrid('name-effect-grid', NAME_EFFECTS, ProfileEditorStore.getState().name_effect || 'none', (value) => {
    ProfileEditorStore.setField('name_effect', value);
  }, 'name_effect');

  renderPresetGrid('click-effect-grid', CLICK_EFFECTS, ProfileEditorStore.getState().click_effect || 'none', (value) => {
    ProfileEditorStore.setField('click_effect', value);
  });

  renderPresetGrid('layout-split-grid', LAYOUT_SPLITS, ProfileEditorStore.getState().layout_split || 'none', (value) => {
    ProfileEditorStore.setField('layout_split', value);
  });

  renderPresetGrid('visualizer-style-grid', VISUALIZER_STYLES, ProfileEditorStore.getState().visualizer_style || 'wave', (value) => {
    ProfileEditorStore.setField('visualizer_style', value);
  }, 'visualizer_style');
  renderPresetGrid('overlay-density-grid', OVERLAY_DENSITY, ProfileEditorStore.getState().overlay_density || 'normal', (value) => {
    ProfileEditorStore.setField('overlay_density', value);
  });
  renderPresetGrid('overlay-speed-grid', OVERLAY_SPEED, ProfileEditorStore.getState().overlay_speed || 'normal', (value) => {
    ProfileEditorStore.setField('overlay_speed', value);
  });
  renderPresetGrid('overlay-size-grid', OVERLAY_SIZE, ProfileEditorStore.getState().overlay_size || 'md', (value) => {
    ProfileEditorStore.setField('overlay_size', value);
  });

  initGapEditor();

  const clockTzSelect = document.getElementById('widget_clock_tz');
  clockTzSelect.innerHTML = CLOCK_ZONES.map(
    (z) => `<option value="${z.id}">${z.name}</option>`
  ).join('');

  function toggleBgFields(bgType) {
    gradientFields?.classList.toggle('hidden', bgType !== 'gradient');
    colorFields?.classList.toggle('hidden', bgType === 'gradient' || bgType === 'video');
    videoFields?.classList.toggle('hidden', bgType !== 'video');
    imageFields?.classList.toggle('hidden', bgType !== 'image');
  }

  function syncPresetGrids(state) {
    const sync = (selector, value) => {
      document.querySelectorAll(`${selector} .preset-option`).forEach((btn) => {
        const active = btn.dataset.value === value;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
      });
    };
    sync('#cursor-preset-grid', state.cursor_preset || 'default');
    sync('#bg-effect-grid', state.bg_effect || 'none');
    sync('#hover-effect-grid', state.hover_effect || 'none');
    sync('#name-effect-grid', state.name_effect || 'none');
    sync('#click-effect-grid', state.click_effect || 'none');
    sync('#layout-split-grid', state.layout_split || 'none');
    sync('#visualizer-style-grid', state.visualizer_style || 'wave');
    sync('#overlay-density-grid', state.overlay_density || 'normal');
    sync('#overlay-speed-grid', state.overlay_speed || 'normal');
    sync('#overlay-size-grid', state.overlay_size || 'md');
    document.getElementById('overlay-presets')?.classList.toggle('hidden', !state.bg_overlay_url);
  }

  function initGapEditor() {
    const host = document.getElementById('gap-editor');
    if (!host) return;

    host.innerHTML = CARD_GAPS.map(({ field, label, def }) => `
      <div class="gap-row">
        <label class="gap-label" for="${field}">${escapeHtml(label)}</label>
        <input class="form-range" type="range" id="${field}" name="${field}"
          min="0" max="${CARD_GAP_MAX}" step="2" value="${def}">
        <span class="form-range-value" data-gap-value="${field}">${def}px</span>
      </div>
    `).join('');

    host.querySelectorAll('.form-range').forEach((input) => {
      input.addEventListener('input', (e) => {
        ProfileEditorStore.setField(e.target.name, Number(e.target.value));
      });
    });

    document.getElementById('gap-reset-btn')?.addEventListener('click', () => {
      const defaults = {};
      CARD_GAPS.forEach(({ field, def }) => { defaults[field] = def; });
      ProfileEditorStore.setFields(defaults);
      showToast('Отступы сброшены');
    });
  }

  function syncGapEditor(state) {
    CARD_GAPS.forEach(({ field, def }) => {
      const value = state[field] ?? def;
      const input = document.getElementById(field);
      if (input) input.value = value;

      const label = document.querySelector(`[data-gap-value="${field}"]`);
      if (label) label.textContent = `${value}px`;
    });
  }

  const getBadges = () => ProfileEditorStore.getState().badges || [];
  const getSocialLinks = () => ProfileEditorStore.getState().social_links || [];
  const getPosts = () => ProfileEditorStore.getState().posts || [];

  let lastBadgesLen = -1;
  let lastSocialLen = -1;
  let lastPostsKey = '';

  function refreshDynamicEditors(state) {
    const badgesLen = (state.badges || []).length;
    const socialLen = (state.social_links || []).length;

    if (badgesLen !== lastBadgesLen) {
      lastBadgesLen = badgesLen;
      renderBadgesEditor(badgesEditor, getBadges, (next) => {
        ProfileEditorStore.setField('badges', next);
      });
    }

    if (socialLen !== lastSocialLen) {
      lastSocialLen = socialLen;
      renderSocialEditor(socialEditor, getSocialLinks, (next) => {
        ProfileEditorStore.setField('social_links', next);
      });
    }

    const posts = state.posts || [];
    const postsKey = `${posts.length}|${posts.map((p) => (p.image || '').length).join(',')}`;

    if (postsKey !== lastPostsKey) {
      lastPostsKey = postsKey;
      renderPostsEditor(postsEditor, getPosts, (next) => {
        ProfileEditorStore.setField('posts', next);
      });
    }
  }

  function syncStatsSummary(state) {
    if (!statsSummary) return;

    const { views, likes } = ProfileStats.get(state.username);
    statsSummary.innerHTML = `
      <div class="stats-summary-item">
        <span class="stats-summary-value">${views}</span>
        <span class="stats-summary-label">Просмотры</span>
      </div>
      <div class="stats-summary-item">
        <span class="stats-summary-value">${likes}</span>
        <span class="stats-summary-label">Лайки</span>
      </div>
    `;
  }

  const MEDIA_FIELDS = [
    { field: 'avatar_url', inputId: 'avatar_file', kind: 'avatar', preview: 'image' },
    { field: 'banner_url', inputId: 'banner_file', kind: 'banner', preview: 'image' },
    { field: 'bg_image_url', inputId: 'bg_image_file', kind: 'background', preview: 'image' },
    { field: 'bg_video_url', inputId: 'bg_video_file', kind: 'video', preview: 'video' },
    { field: 'music_url', inputId: 'music_file', kind: 'audio', preview: 'audio' },
    { field: 'custom_font_url', inputId: 'custom_font_file', kind: 'font', preview: 'font' },
    { field: 'cursor_image_url', inputId: 'cursor_image_file', kind: 'cursor', preview: 'image' },
    { field: 'bg_overlay_url', inputId: 'bg_overlay_file', kind: 'overlay', preview: 'image' },
  ];

  const THUMB_ICONS = {
    video: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
    audio: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V5l12-2v13"/></svg>',
    image: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    font: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h4M6 20V8m0 0h8.5a3.5 3.5 0 0 1 0 7H6"/><path d="M14 20V4h6"/></svg>',
  };

  MEDIA_FIELDS.forEach(({ field, inputId, kind }) => {
    const input = form[field];
    if (input) input.dataset.basePlaceholder = input.placeholder;

    initUploadField({
      inputId,
      kind,
      onLoaded: (dataUrl) => {
        if (field === 'custom_font_url') {
          ProfileEditorStore.setFields({
            custom_font_url: dataUrl,
            name_font: typeof CARD_CUSTOM_FONT !== 'undefined' ? CARD_CUSTOM_FONT : 'VibeCardCustom',
          });
          return;
        }
        ProfileEditorStore.setField(field, dataUrl);
      },
    });
  });

  document.querySelectorAll('.upload-clear').forEach((btn) => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.clear;
      const custom = typeof CARD_CUSTOM_FONT !== 'undefined' ? CARD_CUSTOM_FONT : 'VibeCardCustom';
      if (field === 'custom_font_url' && ProfileEditorStore.getState().name_font === custom) {
        ProfileEditorStore.setFields({ custom_font_url: '', name_font: 'Inter' });
      } else {
        ProfileEditorStore.setField(field, '');
      }
      const meta = MEDIA_FIELDS.find((m) => m.field === field);
      const status = meta && document.getElementById(`${meta.inputId}-status`);
      if (status) status.textContent = '';
    });
  });

  function syncMediaFields(state) {
    MEDIA_FIELDS.forEach(({ field, inputId, preview }) => {
      const value = state[field] || '';
      const uploaded = isUploadedSource(value);
      const input = form[field];

      if (input) {
        input.value = uploaded ? '' : value;
        input.placeholder = uploaded
          ? 'Файл загружен — вставь ссылку, чтобы заменить'
          : input.dataset.basePlaceholder || '';
      }

      const thumb = document.getElementById(`${field}-thumb`);
      if (thumb) {
        const isImage = preview === 'image' && value;
        thumb.classList.toggle('is-filled', Boolean(value));
        const shown = typeof MediaStore !== 'undefined' ? MediaStore.resolve(value) : value;
        thumb.style.backgroundImage = isImage ? `url("${shown}")` : '';
        thumb.innerHTML = isImage ? '' : THUMB_ICONS[preview] || '';
      }

      document.querySelector(`.upload-clear[data-clear="${field}"]`)
        ?.classList.toggle('hidden', !value);

      const status = document.getElementById(`${inputId}-status`);
      if (status && uploaded && !status.textContent) {
        status.textContent = describeSource(value);
        status.className = 'upload-status upload-status--ok';
      }
    });
  }

  function syncFormFromStore(state) {
    form.username.value = state.username || '';
    form.display_name.value = state.display_name || '';
    form.bio.value = state.bio || '';
    form.name_color.value = state.name_color || '#ffffff';
    form.cursor_color.value = state.cursor_color || '#ffffff';
    form.avatar_ring_color.value = state.avatar_ring_color || '#ffffff';
    form.card_border_color.value = state.card_border_color || '#ffffff';
    form.bg_color.value = state.bg_color || '#000000';
    form.bg_type.value = state.bg_type || 'color';
    form.bg_gradient_from.value = state.bg_gradient_from || '#262626';
    form.bg_gradient_to.value = state.bg_gradient_to || '#000000';
    form.name_font.value = state.name_font || 'Inter';
    form.music_title.value = state.music_title || '';
    form.show_stats.checked = state.show_stats !== false;
    if (form.hide_official_badges) {
      form.hide_official_badges.checked = state.hide_official_badges === true;
    }
    form.music_compact.checked = state.music_compact === true;
    form.music_visualizer.checked = state.music_visualizer !== false;
    document.getElementById('visualizer-options')?.classList.toggle('hidden', state.music_visualizer === false);
    if (form.visualizer_color) {
      form.visualizer_color.value = state.visualizer_color || '#ffffff';
    }
    if (form.visualizer_rainbow) {
      form.visualizer_rainbow.checked = state.visualizer_rainbow === true;
    }
    document.getElementById('visualizer_color_val').textContent = state.visualizer_color || '#ffffff';
    document.getElementById('visualizer-color-field')?.classList.toggle('hidden', state.visualizer_rainbow === true);
    form.widget_status.value = state.widget_status || '';
    form.widget_clock.checked = state.widget_clock === true;
    form.widget_clock_tz.value = state.widget_clock_tz || 'Europe/Moscow';
    form.widget_countdown_date.value = state.widget_countdown_date || '';
    form.widget_countdown_label.value = state.widget_countdown_label || '';
    document.getElementById('clock-tz-field')?.classList.toggle('hidden', state.widget_clock !== true);
    syncMediaFields(state);

    const opacity = state.card_opacity ?? 55;
    const blur = state.card_blur ?? 20;
    form.card_opacity.value = opacity;
    form.card_blur.value = blur;
    document.getElementById('card_opacity_val').textContent = `${opacity}%`;
    document.getElementById('card_blur_val').textContent = `${blur}px`;

    document.getElementById('name_color_val').textContent = state.name_color || '#ffffff';
    document.getElementById('cursor_color_val').textContent = state.cursor_color || '#ffffff';
    document.getElementById('avatar_ring_color_val').textContent = state.avatar_ring_color || '#ffffff';
    document.getElementById('card_border_color_val').textContent = state.card_border_color || '#ffffff';
    document.getElementById('bg_color_val').textContent = state.bg_color || '#000000';
    document.getElementById('bg_gradient_from_val').textContent = state.bg_gradient_from || '#262626';
    document.getElementById('bg_gradient_to_val').textContent = state.bg_gradient_to || '#000000';
    document.getElementById('bio-count').textContent = (state.bio || '').length;

    toggleBgFields(state.bg_type || 'color');
    syncPresetGrids(state);
    syncGapEditor(state);
    updateCompleteness(state);
    updateSaveState(state);
    updateProfileLinks(state.username);
    refreshDynamicEditors(state);
    syncStatsSummary(state);
    renderPhonePreview(state, previewEl);
  }

  function syncPremiumLocks() {
    const on = typeof Premium !== 'undefined' && Premium.isActive();
    document.getElementById('posts-section')?.classList.toggle('is-premium-locked', !on);
    document.getElementById('posts-lock')?.classList.toggle('hidden', on);
  }

  savedSnapshot = JSON.stringify(ProfileEditorStore.getState());
  ProfileEditorStore.subscribe(syncFormFromStore);
  syncPremiumLocks();
  syncFormFromStore(ProfileEditorStore.getState());
  initConstructorFX();

  saveState?.addEventListener('click', () => {
    if (isDirty) form.requestSubmit();
  });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (!isDirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  document.getElementById('add-badge-btn')?.addEventListener('click', () => {
    ProfileEditorStore.setField('badges', [...getBadges(), createBadge()]);
  });

  document.getElementById('add-social-btn')?.addEventListener('click', () => {
    ProfileEditorStore.setField('social_links', [...getSocialLinks(), createSocialLink()]);
  });

  document.getElementById('add-post-btn')?.addEventListener('click', () => {
    if (typeof Premium !== 'undefined' && !Premium.require('Публикация записей доступна в Star+')) return;
    ProfileEditorStore.setField('posts', [createPost(), ...getPosts()]);
  });

  form.show_stats.addEventListener('change', (e) => {
    ProfileEditorStore.setField('show_stats', e.target.checked);
  });

  form.hide_official_badges?.addEventListener('change', (e) => {
    ProfileEditorStore.setField('hide_official_badges', e.target.checked);
  });

  form.music_compact.addEventListener('change', (e) => {
    ProfileEditorStore.setField('music_compact', e.target.checked);
  });

  form.music_visualizer.addEventListener('change', (e) => {
    ProfileEditorStore.setField('music_visualizer', e.target.checked);
    document.getElementById('visualizer-options')?.classList.toggle('hidden', !e.target.checked);
  });

  form.visualizer_rainbow?.addEventListener('change', (e) => {
    ProfileEditorStore.setField('visualizer_rainbow', e.target.checked);
  });

  form.widget_clock.addEventListener('change', (e) => {
    ProfileEditorStore.setField('widget_clock', e.target.checked);
  });

  form.widget_clock_tz.addEventListener('change', (e) => {
    ProfileEditorStore.setField('widget_clock_tz', e.target.value);
  });

  const textFields = ['username', 'display_name', 'bio', 'avatar_url', 'banner_url', 'bg_image_url',
    'music_url', 'music_title', 'bg_video_url', 'widget_status', 'widget_countdown_date', 'widget_countdown_label'];
  textFields.forEach((field) => {
    form[field].addEventListener('input', (e) => {
      const value = e.target.value;
      if ((field === 'avatar_url' || field === 'bg_image_url')
        && typeof Premium !== 'undefined'
        && Premium.isGifSource(value)
        && !Premium.require('GIF доступен в Star+')) {
        e.target.value = '';
        ProfileEditorStore.setField(field, '');
        return;
      }
      ProfileEditorStore.setField(field, value);
      if (field === 'bio') {
        document.getElementById('bio-count').textContent = value.length;
      }
    });
  });

  form.name_color.addEventListener('input', (e) => {
    ProfileEditorStore.setField('name_color', e.target.value);
    document.getElementById('name_color_val').textContent = e.target.value;
  });

  ['cursor_color', 'avatar_ring_color', 'card_border_color', 'visualizer_color'].forEach((field) => {
    form[field].addEventListener('input', (e) => {
      ProfileEditorStore.setField(field, e.target.value);
      const val = document.getElementById(`${field}_val`);
      if (val) val.textContent = e.target.value;
    });
  });

  form.bg_color.addEventListener('input', (e) => {
    ProfileEditorStore.setField('bg_color', e.target.value);
    document.getElementById('bg_color_val').textContent = e.target.value;
  });

  form.bg_gradient_from.addEventListener('input', (e) => {
    ProfileEditorStore.setField('bg_gradient_from', e.target.value);
    document.getElementById('bg_gradient_from_val').textContent = e.target.value;
  });

  form.bg_gradient_to.addEventListener('input', (e) => {
    ProfileEditorStore.setField('bg_gradient_to', e.target.value);
    document.getElementById('bg_gradient_to_val').textContent = e.target.value;
  });

  form.card_opacity.addEventListener('input', (e) => {
    const value = Number(e.target.value);
    ProfileEditorStore.setField('card_opacity', value);
    document.getElementById('card_opacity_val').textContent = `${value}%`;
  });

  form.card_blur.addEventListener('input', (e) => {
    const value = Number(e.target.value);
    ProfileEditorStore.setField('card_blur', value);
    document.getElementById('card_blur_val').textContent = `${value}px`;
  });

  form.bg_type.addEventListener('change', (e) => {
    if (e.target.value === 'video' && typeof Premium !== 'undefined'
      && !Premium.require('Видео-фон доступен в Star+')) {
      const prev = ProfileEditorStore.getState().bg_type || 'color';
      e.target.value = prev === 'video' ? 'color' : prev;
      return;
    }
    ProfileEditorStore.setField('bg_type', e.target.value);
    toggleBgFields(e.target.value);
  });

  form.name_font.addEventListener('change', (e) => {
    const custom = typeof CARD_CUSTOM_FONT !== 'undefined' ? CARD_CUSTOM_FONT : 'VibeCardCustom';
    if (e.target.value === custom) {
      if (typeof Premium !== 'undefined' && !Premium.require('Собственный шрифт доступен в Star+')) {
        e.target.value = ProfileEditorStore.getState().name_font || 'Inter';
        return;
      }
      if (!ProfileEditorStore.getState().custom_font_url) {
        showToast('Необходимо загрузить файл .ttf', 'error');
        e.target.value = ProfileEditorStore.getState().name_font || 'Inter';
        return;
      }
    }
    ProfileEditorStore.setField('name_font', e.target.value);
  });

  document.getElementById('copy-link-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const url = typeof siteProfileHref === 'function'
      ? siteProfileHref(ProfileEditorStore.getState().username || 'username')
      : `/${ProfileEditorStore.getState().username || 'username'}`;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      showToast('Не удалось скопировать', 'error');
      return;
    }

    const original = btn.textContent;
    btn.textContent = 'Скопировано';
    btn.classList.add('is-copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('is-copied');
    }, 1600);
  });

  initProfileTransfer();
  initStickyToolbar();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const state = ProfileEditorStore.getState();

    if (!state.username) {
      showToast('Необходимо указать имя пользователя', 'error');
      form.username.focus();
      return;
    }

    if (state.username !== originalUsername) {
      if (ProfileStore.exists(state.username)) {
        const existing = ProfileStore.get(state.username);
        const name = existing?.display_name || state.username;
        const open = window.confirm(
          `Имя пользователя @${state.username} уже используется в этом браузере (${name}).\nОткрыть эту карточку?`
        );
        if (!open) return;
        Auth.enterProfile(state.username);
        window.location.reload();
        return;
      }

      if (!await persistProfile(state.username, state)) return;
      if (ProfileStore.get(originalUsername)) {
        localStorage.removeItem(ProfileStore.PREFIX + originalUsername);
      }

      const authUser = Auth.getUser();
      if (typeof AccountStore !== 'undefined') {
        AccountStore.rename(originalUsername, state.username);
      }
      if (typeof Premium !== 'undefined' && Premium.isActive(originalUsername)) {
        Premium.deactivate(originalUsername);
        Premium.activate(state.username);
      }
      if (typeof Verified !== 'undefined') {
        Verified.rename(originalUsername, state.username);
      }
      authUser.username = state.username;
      if (!state.display_name) authUser.displayName = state.username;
      localStorage.setItem('vibecard_auth', JSON.stringify(authUser));
      localStorage.setItem('vibecard_last_username', state.username);
      originalUsername = state.username;
      initNavbar();
    } else if (!await persistProfile(state.username, state)) {
      return;
    }

    showToast('Профиль сохранён');
    MediaStore.collectGarbage();
    updateProfileLinks(state.username);
    savedSnapshot = JSON.stringify(state);
    updateSaveState(state);

    saveBtn?.classList.add('is-saved');
    dockSaveBtn?.classList.add('is-saved');
    setTimeout(() => {
      saveBtn?.classList.remove('is-saved');
      dockSaveBtn?.classList.remove('is-saved');
    }, 500);
  });

  initCollapsibleSections();
  initBuilderPeek();
}

function initStickyToolbar() {
  const toolbar = document.querySelector('.builder-toolbar');
  const sentinel = document.querySelector('.builder-toolbar-sentinel');
  if (!toolbar || !sentinel || typeof IntersectionObserver === 'undefined') return;

  const navbar = document.querySelector('.navbar');
  const desktop = window.matchMedia('(min-width: 901px)');
  let observer = null;

  const syncDockTop = () => {
    if (!navbar) return;
    document.documentElement.style.setProperty('--dock-top', `${Math.round(navbar.offsetHeight) + 9}px`);
  };

  const syncDockHeight = () => {
    document.documentElement.style.setProperty('--dock-h', `${Math.round(toolbar.offsetHeight)}px`);
  };

  const setStuck = (stuck) => {
    if (toolbar.classList.contains('is-stuck') === stuck) return;
    toolbar.classList.toggle('is-stuck', stuck);
    syncDockHeight();
  };

  const connect = () => {
    observer?.disconnect();
    observer = null;
    syncDockTop();

    if (!desktop.matches) {
      toolbar.classList.remove('is-stuck');
      syncDockHeight();
      return;
    }

    const dockTop = Math.round(parseFloat(getComputedStyle(toolbar).top) || 0);
    observer = new IntersectionObserver(([entry]) => {
      setStuck(!entry.isIntersecting);
    }, { threshold: 0, rootMargin: `-${dockTop}px 0px 0px 0px` });
    observer.observe(sentinel);
    syncDockHeight();
  };

  requestAnimationFrame(() => requestAnimationFrame(connect));
  desktop.addEventListener('change', connect);
  toolbar.addEventListener('transitionend', syncDockHeight);
  window.addEventListener('resize', ambientDebounce(connect, 150));
}

function initProfileTransfer() {
  const HEAVY_FIELDS = ['bg_video_url', 'music_url', 'custom_font_url'];

  document.getElementById('export-btn')?.addEventListener('click', () => {
    const state = { ...ProfileEditorStore.getState() };
    const skipped = HEAVY_FIELDS.filter((field) => isUploadedSource(state[field]));
    skipped.forEach((field) => { state[field] = ''; });

    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vibecard-${state.username || 'card'}.json`;

    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 1000);

    showToast(skipped.length
      ? 'Файл скачан. Загруженные видео и музыку необходимо добавить повторно'
      : 'Настройки карточки скачаны');
  });

  const input = document.getElementById('import-input');
  input?.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;

    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('Файл не соответствует формату карточки Art Star');
      }

      const { username, ...rest } = data;
      const next = sanitizeProfileForEditing({
        ...rest,
        username: ProfileEditorStore.getState().username,
      });

      let droppedMedia = false;
      HEAVY_FIELDS.forEach((field) => {
        if (typeof MediaStore !== 'undefined' && MediaStore.isRef(next[field])) {
          next[field] = '';
          droppedMedia = true;
        }
      });

      ProfileEditorStore.setFields(next);
      showToast(droppedMedia
        ? 'Карточка загружена. Видео и музыку необходимо добавить повторно: файлы не переносятся'
        : 'Карточка загружена. Требуется сохранить изменения');
    } catch (err) {
      showToast(err instanceof SyntaxError ? 'Не удалось прочитать JSON' : err.message, 'error');
    } finally {
      input.value = '';
    }
  });
}

async function persistProfile(username, state) {
  const result = ProfileStore.save(username, state, { skipRemote: true });
  if (!result.ok) {
    showToast(
      result.quotaExceeded
        ? 'Недостаточно места в браузере. Требуются файлы меньшего размера или ссылки вместо загрузки'
        : 'Не удалось сохранить профиль',
      'error'
    );
    return false;
  }

  if (typeof Api === 'undefined') return true;
  if (typeof Api.ensureSession === 'function') await Api.ensureSession();
  const remote = await Api.putProfile(username, ProfileStore.get(username) || state);
  if (!remote.ok && !remote.offline) {
    showToast(remote.error || 'Карточка сохранена в браузере. Сервер не принял изменения', 'error');
  }
  return true;
}

function updateCompleteness(state) {
  const arc = document.getElementById('completeness-arc');
  const text = document.getElementById('completeness-text');
  if (!arc || !text) return;

  const checks = [
    Boolean(state.username),
    Boolean(state.display_name),
    Boolean(state.bio),
    Boolean(state.avatar_url),
    state.bg_type !== 'color' || state.bg_color !== '#000000',
    state.bg_effect !== 'none',
    state.name_font !== 'Inter' || state.name_color !== '#ffffff',
    state.cursor_preset !== 'default',
    state.hover_effect !== 'none',
    Boolean(state.badges?.length),
    Boolean(state.social_links?.some((l) => l.url)),
    Boolean(state.music_url),
    Boolean(state.posts?.some((p) => p.text || p.image)),
    state.click_effect !== 'none',
    Boolean(state.widget_status || state.widget_clock || state.widget_countdown_date),
  ];

  const done = checks.filter(Boolean).length;
  const ratio = done / checks.length;
  const circumference = 2 * Math.PI * 16;

  arc.style.strokeDasharray = String(circumference);
  arc.style.strokeDashoffset = String(circumference * (1 - ratio));
  text.textContent = `${Math.round(ratio * 100)}%`;

  const wrap = document.getElementById('completeness');
  if (wrap) wrap.title = `Заполнено ${done} из ${checks.length} блоков`;
}

function prepareConstructorEnter() {
  const desktop = window.matchMedia('(min-width: 901px)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!desktop.matches || reduce.matches) return;

  const header = document.querySelector('.dashboard-header');
  const preview = document.querySelector('.builder-preview-wrap');
  const sections = [...document.querySelectorAll('.builder-form .form-section')];

  const sequence = [
    [header, 0],
    ...sections.map((el, i) => [el, 90 + i * 65]),
    [preview, 120],
  ];

  sequence.forEach(([el, delay]) => {
    if (!el) return;
    el.classList.add('builder-enter');
    el.style.setProperty('--enter-delay', `${delay}ms`);
  });
}

function initConstructorFX() {
  if (typeof bindPointerGlow === 'function') {
    bindPointerGlow('.form-section, .builder-toolbar, .btn-primary, .btn-secondary');
  }

  if (!document.querySelector('.builder-enter') || typeof revealOnScroll !== 'function') return;

  requestAnimationFrame(() => revealOnScroll('.builder-enter'));
}

function initBuilderPeek() {
  const peekBtn = document.getElementById('dock-peek');
  const closeBtn = document.getElementById('builder-peek-close');
  const previewWrap = document.getElementById('builder-preview-wrap');
  const peekLabel = document.getElementById('dock-peek-label');
  if (!peekBtn || !previewWrap) return;

  const eyeIcon = peekBtn.querySelector('.builder-dock-peek-icon--eye');
  const closeIcon = peekBtn.querySelector('.builder-dock-peek-icon--close');

  const setPeek = (open) => {
    document.body.classList.toggle('is-peeking', open);
    peekBtn.classList.toggle('is-active', open);
    peekBtn.setAttribute('aria-pressed', String(open));
    if (peekLabel) peekLabel.textContent = open ? 'Закрыть' : 'Превью';
    eyeIcon?.classList.toggle('hidden', open);
    closeIcon?.classList.toggle('hidden', !open);

    if (open) {
      const previewEl = document.getElementById('profile-preview');
      if (previewEl && typeof ProfileEditorStore !== 'undefined') {
        renderPhonePreview(ProfileEditorStore.getState(), previewEl);
      }
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    }
  };

  peekBtn.addEventListener('click', () => {
    setPeek(!document.body.classList.contains('is-peeking'));
  });
  document.getElementById('builder-preview-chip')?.addEventListener('click', () => {
    setPeek(true);
  });
  closeBtn?.addEventListener('click', () => setPeek(false));

  previewWrap.addEventListener('click', (event) => {
    if (event.target === previewWrap) setPeek(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('is-peeking')) {
      setPeek(false);
    }
  });
}

function initCollapsibleSections() {
  document.querySelectorAll('.builder-form .form-section').forEach((section, index) => {
    const title = section.querySelector('.form-section-title');
    if (!title) return;

    const body = document.createElement('div');
    body.className = 'form-section-body';
    while (title.nextSibling) body.appendChild(title.nextSibling);
    section.appendChild(body);

    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'form-section-head';
    section.insertBefore(head, title);
    head.appendChild(title);
    head.insertAdjacentHTML('beforeend', '<span class="form-section-chevron" aria-hidden="true"></span>');

    let startCollapsed;
    if (section.hasAttribute('data-start-open')) startCollapsed = false;
    else if (section.hasAttribute('data-start-collapsed')) startCollapsed = true;
    else startCollapsed = index > 0;

    if (startCollapsed) section.classList.add('is-collapsed');
    head.setAttribute('aria-expanded', String(!startCollapsed));

    head.addEventListener('click', () => {
      const collapsed = section.classList.toggle('is-collapsed');
      head.setAttribute('aria-expanded', String(!collapsed));
    });
  });
}
