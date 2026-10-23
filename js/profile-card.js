const GOOGLE_FONTS = [
  { name: 'Inter', family: 'Inter' },
  { name: 'Roboto', family: 'Roboto' },
  { name: 'Montserrat', family: 'Montserrat' },
  { name: 'Poppins', family: 'Poppins' },
  { name: 'Oswald', family: 'Oswald' },
  { name: 'Playfair Display', family: 'Playfair Display' },
  { name: 'JetBrains Mono', family: 'JetBrains Mono' },
  { name: 'Space Grotesk', family: 'Space Grotesk' },
  { name: 'Bebas Neue', family: 'Bebas Neue' },
  { name: 'Unbounded', family: 'Unbounded' },
];

const CARD_CUSTOM_FONT = 'VibeCardCustom';

const DEFAULT_PROFILE = {
  username: '',
  display_name: '',
  bio: '',
  avatar_url: '',
  banner_url: '',
  bg_type: 'color',
  bg_color: '#0a0a0a',
  bg_gradient_from: '#1a1a1a',
  bg_gradient_to: '#000000',
  bg_image_url: '',
  bg_video_url: '',
  bg_effect: 'none',
  name_color: '#ffffff',
  name_font: 'Inter',
  custom_font_url: '',
  name_effect: 'none',
  card_opacity: 55,
  card_blur: 20,
  avatar_ring_color: '#ffffff',
  card_border_color: '#ffffff',
  cursor_preset: 'default',
  cursor_color: '#ffffff',
  cursor_image_url: '',
  bg_overlay_url: '',
  overlay_density: 'normal',
  overlay_speed: 'normal',
  overlay_size: 'md',
  hover_effect: 'none',
  click_effect: 'none',
  music_visualizer: true,
  visualizer_style: 'wave',
  visualizer_color: '#ffffff',
  visualizer_rainbow: false,
  share_bg_url: '',
  layout_split: 'none',
  gap_name: 16,
  gap_bio: 12,
  gap_status: 10,
  gap_badges: 12,
  gap_widgets: 12,
  gap_stats: 14,
  gap_socials: 20,
  gap_posts: 20,
  music_compact: false,
  widget_status: '',
  widget_clock: false,
  widget_clock_tz: 'Europe/Moscow',
  widget_countdown_date: '',
  widget_countdown_label: '',
  music_url: '',
  music_title: '',
  badges: [],
  social_links: [],
  posts: [],
  show_stats: true,
  hide_official_badges: false,
};

const MEDIA_URL_FIELDS = [
  'avatar_url', 'banner_url', 'bg_image_url', 'bg_video_url', 'music_url',
  'custom_font_url', 'cursor_image_url', 'bg_overlay_url',
];

const LAYOUT_SPLITS = [
  { id: 'none', name: 'Одна карточка', icon: '▭' },
  { id: 'socials', name: 'Ссылки ниже', icon: '▥' },
  { id: 'posts', name: 'Записи ниже', icon: '▤' },
  { id: 'both', name: 'Ссылки и записи ниже', icon: '▦' },
];

const CARD_GAPS = [
  { field: 'gap_name', label: 'Имя', cssVar: '--gap-name', def: 16 },
  { field: 'gap_bio', label: 'Описание', cssVar: '--gap-bio', def: 12 },
  { field: 'gap_status', label: 'Статус', cssVar: '--gap-status', def: 10 },
  { field: 'gap_badges', label: 'Бейджи', cssVar: '--gap-badges', def: 12 },
  { field: 'gap_widgets', label: 'Часы и отсчёт', cssVar: '--gap-widgets', def: 12 },
  { field: 'gap_stats', label: 'Счётчики', cssVar: '--gap-stats', def: 14 },
  { field: 'gap_socials', label: 'Соцсети', cssVar: '--gap-socials', def: 20 },
  { field: 'gap_posts', label: 'Посты', cssVar: '--gap-posts', def: 20 },
];

const CARD_GAP_MAX = 56;

function normalizeProfileData(data = {}) {
  return {
    ...DEFAULT_PROFILE,
    ...data,
    badges: Array.isArray(data.badges) ? data.badges : [],
    social_links: Array.isArray(data.social_links) ? data.social_links : [],
    posts: Array.isArray(data.posts) ? data.posts : [],
    show_stats: data.show_stats !== false,
    hide_official_badges: data.hide_official_badges === true,
    music_visualizer: data.music_visualizer !== false,
    visualizer_style: migrateVisualizerStyle(data.visualizer_style),
    visualizer_color: sanitizeHexColor(data.visualizer_color, '#ffffff'),
    visualizer_rainbow: data.visualizer_rainbow === true,
    overlay_density: data.overlay_density || 'normal',
    overlay_speed: data.overlay_speed || 'normal',
    overlay_size: data.overlay_size || 'md',
    click_effect: migrateClickEffect(data.click_effect),
    bg_effect: migrateBgEffect(data.bg_effect),
    avatar_ring_color: sanitizeHexColor(data.avatar_ring_color, '#ffffff'),
    card_border_color: sanitizeHexColor(data.card_border_color, '#ffffff'),
    cursor_color: sanitizeHexColor(data.cursor_color, '#ffffff'),
  };
}

function normalizeProfile(data = {}) {
  const profile = normalizeProfileData(data);

  if (typeof Premium !== 'undefined') {
    Premium.stripForDisplay(profile);
  }

  if (typeof MediaStore !== 'undefined') {
    MEDIA_URL_FIELDS.forEach((field) => {
      profile[field] = MediaStore.resolve(profile[field]);
    });
  }

  if (profile.custom_font_url && typeof loadCustomFont === 'function') {
    loadCustomFont(profile.custom_font_url);
  }

  return profile;
}

function sanitizeProfileForEditing(data = {}) {
  const profile = normalizeProfileData(data);

  MEDIA_URL_FIELDS.forEach((field) => {
    if (typeof profile[field] === 'string' && profile[field].startsWith('blob:')) {
      profile[field] = '';
    }
  });

  return profile;
}

function loadGoogleFont(fontFamily) {
  if (!fontFamily || fontFamily === 'Inter' || fontFamily === CARD_CUSTOM_FONT) return;
  const id = `gfont-${fontFamily.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;600;700&display=swap`;
  document.head.appendChild(link);
}

const customFontLoads = new Map();

function loadCustomFont(url) {
  if (!url || typeof FontFace === 'undefined') return Promise.resolve();
  if (customFontLoads.has(url)) return customFontLoads.get(url);

  const job = (async () => {
    try {
      const face = new FontFace(CARD_CUSTOM_FONT, `url(${JSON.stringify(url)})`);
      const loaded = await face.load();
      document.fonts.add(loaded);
    } catch {

    }
  })();

  customFontLoads.set(url, job);
  return job;
}

function profileFontFamily(profile) {
  if (profile.name_font === CARD_CUSTOM_FONT && profile.custom_font_url) {
    return CARD_CUSTOM_FONT;
  }
  return profile.name_font || 'Inter';
}

function getProfileBackgroundStyle(profile) {
  const p = normalizeProfile(profile);

  if (p.bg_type === 'video') {
    return { background: p.bg_color || '#000000' };
  }

  if (p.bg_type === 'gradient') {
    return {
      background: `linear-gradient(180deg, ${p.bg_gradient_from} 0%, ${p.bg_gradient_to} 100%)`,
    };
  }

  if (p.bg_type === 'image') {
    const image = p.bg_image_url || p.banner_url;
    if (image) {
      return {
        backgroundImage: `url(${image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: p.bg_color || '#000000',
      };
    }
  }

  return { background: p.bg_color || '#000000' };
}

function getAvatarContent(profile) {
  if (profile.avatar_url) {
    return `<img src="${escapeHtml(profile.avatar_url)}" alt="" class="vcard-avatar-img">`;
  }
  const letter = (profile.display_name || profile.username || '?').charAt(0).toUpperCase();
  return `<span class="vcard-avatar-letter">${escapeHtml(letter)}</span>`;
}

function getHoverClass(hoverEffect) {
  if (!hoverEffect || hoverEffect === 'none') return '';
  return ` vcard-hover-${hoverEffect}`;
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function sanitizeHexColor(value, fallback = '#ffffff') {
  const hex = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(hex) ? hex : fallback;
}

function hexToRgba(hex, alpha) {
  const safe = sanitizeHexColor(hex);
  const n = parseInt(safe.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function migrateClickEffect(value) {
  if (value === 'flash' || value === 'ink') return 'spark';
  if (value === 'burst') return 'pixel';
  if (value === 'orbit') return 'pixel';
  return value || 'none';
}

function migrateBgEffect(value) {
  if (value === 'orbit' || value === 'haze' || value === 'particles') return 'none';
  return value || 'none';
}

function migrateVisualizerStyle(value) {
  if (value === 'wave' || value === 'mirror' || value === 'ring') return value;
  return 'wave';
}

function getGlassStyle(profile) {
  const opacity = clampNumber(profile.card_opacity, 0, 100, 55);
  const blur = clampNumber(profile.card_blur, 0, 40, 20);
  const bare = opacity === 0 && blur === 0;
  const alpha = opacity / 100;

  const ring = sanitizeHexColor(profile.avatar_ring_color, '#ffffff');
  const border = sanitizeHexColor(profile.card_border_color, '#ffffff');
  const vars = [
    `--glass-bg:rgba(22,22,22,${alpha.toFixed(3)})`,
    `--glass-blur:${blur}px`,
    `--glass-border:${hexToRgba(border, 0.42)}`,
    `--avatar-ring:${ring}`,
    `--cursor-color:${sanitizeHexColor(profile.cursor_color, '#ffffff')}`,
  ].join(';');

  let className = '';
  if (bare) className = ' vcard-glass--bare';
  else if (blur === 0) className = ' vcard-glass--sharp';

  return { style: vars, className };
}

function getGapStyle(profile) {
  return CARD_GAPS
    .map(({ field, cssVar, def }) => `${cssVar}:${clampNumber(profile[field], 0, CARD_GAP_MAX, def)}px`)
    .join(';');
}

function renderNameLettersHTML(name) {
  return [...name]
    .map((ch, i) => `<span class="nfx-letter" style="--nfx-i:${i}">${ch === ' ' ? '&nbsp;' : escapeHtml(ch)}</span>`)
    .join('');
}

function renderProfileNameHTML(profile) {
  const name = profile.display_name || profile.username || 'Имя';
  const effect = profile.name_effect && profile.name_effect !== 'none' ? profile.name_effect : '';
  const color = escapeHtml(profile.name_color);
  const family = escapeHtml(profileFontFamily(profile));
  const style = `color:${color};font-family:'${family}',sans-serif;`;

  if (!effect) {
    return `<h2 class="vcard-name" style="${style}">${escapeHtml(name)}</h2>`;
  }

  const chars = [...name].length;
  const glow = `color-mix(in srgb, ${color} 58%, white 42%)`;
  const shineDim = `color-mix(in srgb, ${color} 72%, black 28%)`;
  const effectStyle = `${style}--nfx-chars:${chars};--nfx-duration:${(chars * 0.09 + 0.4).toFixed(2)}s;--nfx-glow:${glow};--nfx-shine-base:${color};--nfx-shine-dim:${shineDim};`;

  const content = (effect === 'wave' || effect === 'typewriter' || effect === 'scramble')
    ? renderNameLettersHTML(name)
    : escapeHtml(name);

  return `<h2 class="vcard-name nfx nfx-${escapeHtml(effect)}" style="${effectStyle}" data-text="${escapeHtml(name)}">${content}</h2>`;
}

function renderUsernameHTML(profile) {
  if (!profile.username) return '';
  const premium = (typeof Premium !== 'undefined' && Premium.isActive(profile.username)) || profile.preview_premium
    ? '<span class="vcard-premium-star" title="Star+"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/></svg></span>'
    : '';
  const verified = typeof Verified !== 'undefined' && Verified.isActive(profile.username)
    ? (typeof verifiedMarkHTML === 'function' ? verifiedMarkHTML() : '<span class="vcard-verified" title="Verified"></span>')
    : '';
  const developer = typeof Developer !== 'undefined' && Developer.isActive(profile.username)
    ? (typeof developerMarkHTML === 'function' ? developerMarkHTML() : '<span class="vcard-developer" title="Developer"></span>')
    : '';
  return `<p class="vcard-username">${premium}${verified}${developer}<span>@${escapeHtml(profile.username)}</span></p>`;
}

function renderProfileCardHTML(profile, options = {}) {
  const p = normalizeProfile(profile);
  loadGoogleFont(profileFontFamily(p));

  const bgStyle = getProfileBackgroundStyle(p);
  const styleAttr = Object.entries(bgStyle)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
    .join(';');

  const bannerHtml = p.banner_url
    ? `<div class="vcard-banner"><img src="${escapeHtml(p.banner_url)}" alt=""></div>`
    : '';

  const glass = getGlassStyle(p);
  const fullpageClass = options.fullpage ? ' vcard--fullpage' : '';
  const phoneClass = options.phone ? ' vcard--phone' : '';
  const hoverClass = getHoverClass(p.hover_effect);
  const overlayHtml = typeof renderCustomOverlayHTML === 'function'
    ? renderCustomOverlayHTML(p.bg_overlay_url, p)
    : '';
  const fxHtml = `${overlayHtml}${typeof renderBgEffectHTML === 'function' ? renderBgEffectHTML(p) : ''}`;
  const videoHtml = typeof renderVideoBgHTML === 'function' ? renderVideoBgHTML(p) : '';
  const musicHtml = typeof renderMusicWidgetHTML === 'function' ? renderMusicWidgetHTML(p) : '';
  const badgeList = typeof decorateProfileBadges === 'function'
    ? decorateProfileBadges(p, p.badges)
    : (typeof Premium !== 'undefined' ? Premium.decorateBadges(p, p.badges) : (p.badges || []));
  const badgesHtml = typeof renderBadgesHTML === 'function' ? renderBadgesHTML(badgeList) : '';
  const socialsHtml = typeof renderSocialLinksHTML === 'function' ? renderSocialLinksHTML(p.social_links) : '';
  const statusHtml = typeof renderStatusHTML === 'function' ? renderStatusHTML(p) : '';
  const cardWidgetsHtml = typeof renderCardWidgetsHTML === 'function' ? renderCardWidgetsHTML(p) : '';
  const statsHtml = typeof renderStatsHTML === 'function'
    ? renderStatsHTML(p, ProfileStats.get(p.username))
    : '';
  const postsHtml = typeof renderPostsHTML === 'function' ? renderPostsHTML(p.posts) : '';

  const splitSocials = p.layout_split === 'socials' || p.layout_split === 'both';
  const splitPosts = p.layout_split === 'posts' || p.layout_split === 'both';
  const movedDown = [splitSocials ? socialsHtml : '', splitPosts ? postsHtml : ''].filter(Boolean);

  const secondCardHtml = movedDown.length
    ? `<div class="vcard-glass vcard-glass--split${glass.className}" style="${glass.style}">
        <div class="vcard-body vcard-body--split">${movedDown.join('')}</div>
      </div>`
    : '';

  return `
    <div class="vcard${fullpageClass}${phoneClass}" style="${styleAttr}">
      ${videoHtml}
      <div class="vcard-fx-layer" aria-hidden="true">${fxHtml}</div>
      <div class="vcard-stack${hoverClass}" style="${glass.style};${getGapStyle(p)}">
        <div class="vcard-glass${glass.className}" style="${glass.style}">
          ${bannerHtml}
          <div class="vcard-body">
            <div class="vcard-avatar">${getAvatarContent(p)}</div>
            ${renderProfileNameHTML(p)}
            ${renderUsernameHTML(p)}
            ${statusHtml}
            ${p.bio ? `<p class="vcard-bio">${escapeHtml(p.bio)}</p>` : ''}
            ${badgesHtml}
            ${cardWidgetsHtml}
            ${statsHtml}
            ${splitSocials ? '' : socialsHtml}
            ${splitPosts ? '' : postsHtml}
          </div>
        </div>
        ${secondCardHtml}
      </div>
      ${musicHtml}
    </div>
  `;
}

function renderPhoneFrameHTML(profile) {
  return `
    <div class="phone-frame phone-frame--iphone17 preview-phone">
      <div class="phone-screen preview-screen">
        <div class="phone-dynamic-island" aria-hidden="true"></div>
        ${renderProfileCardHTML(profile, { phone: true })}
      </div>
    </div>
  `;
}

function renderPhonePreview(profile, container) {
  if (!container) return;
  container.innerHTML = renderPhoneFrameHTML(profile);
  if (typeof ProfileEffects !== 'undefined') {
    ProfileEffects.apply(container, profile, { preview: true });
  }
}

window.GOOGLE_FONTS = GOOGLE_FONTS;
window.DEFAULT_PROFILE = DEFAULT_PROFILE;
window.LAYOUT_SPLITS = LAYOUT_SPLITS;
window.CARD_GAPS = CARD_GAPS;
window.CARD_GAP_MAX = CARD_GAP_MAX;
window.sanitizeHexColor = sanitizeHexColor;
window.hexToRgba = hexToRgba;
window.migrateVisualizerStyle = migrateVisualizerStyle;
window.normalizeProfile = normalizeProfile;
window.normalizeProfileData = normalizeProfileData;
window.sanitizeProfileForEditing = sanitizeProfileForEditing;
window.loadGoogleFont = loadGoogleFont;
window.loadCustomFont = loadCustomFont;
window.profileFontFamily = profileFontFamily;
window.CARD_CUSTOM_FONT = CARD_CUSTOM_FONT;
window.getProfileBackgroundStyle = getProfileBackgroundStyle;
window.renderProfileCardHTML = renderProfileCardHTML;
window.renderPhoneFrameHTML = renderPhoneFrameHTML;
window.renderPhonePreview = renderPhonePreview;
