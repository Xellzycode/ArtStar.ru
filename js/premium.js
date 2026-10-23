const PREMIUM_KEY = 'vibecard_premium';
const PREMIUM_PRICE = 499;
const CUSTOM_FONT_FAMILY = 'VibeCardCustom';

const BADGE_LOOKALIKES = {
  а: 'a', А: 'a',
  е: 'e', Е: 'e', ё: 'e', Ё: 'e',
  о: 'o', О: 'o',
  р: 'p', Р: 'p',
  с: 'c', С: 'c',
  у: 'y', У: 'y',
  х: 'x', Х: 'x',
  і: 'i', І: 'i', ї: 'i', Ї: 'i',
  к: 'k', К: 'k',
  м: 'm', М: 'm',
  н: 'h', Н: 'h',
  т: 't', Т: 't',
  в: 'b', В: 'b',
  α: 'a', ε: 'e', ο: 'o', ρ: 'p', υ: 'y', χ: 'x', ι: 'i', ν: 'v', μ: 'm', κ: 'k', τ: 't',
};

function normalizeBadgeKey(value) {
  return Array.from(String(value || '').normalize('NFKC'))
    .map((ch) => BADGE_LOOKALIKES[ch] || ch)
    .join('')
    .replace(/[\u0300-\u036f\u200b-\u200d\ufeff]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isReservedBadgeText(text, reserved) {
  return normalizeBadgeKey(text) === normalizeBadgeKey(reserved);
}

function isOfficialBadgeName(text) {
  const key = normalizeBadgeKey(text);
  return key === 'premium' || key === 'star' || key === 'verified' || key === 'developer';
}

const Premium = {
  price: PREMIUM_PRICE,
  CUSTOM_FONT: CUSTOM_FONT_FAMILY,
  AUDIO_FREE_MAX: 10 * 1024 * 1024,
  AUDIO_PREMIUM_MAX: 30 * 1024 * 1024,

  label: 'Star+',

  LOCKED: {
    bg_effect: ['grid', 'scanlines', 'stars'],
    name_effect: ['typewriter', 'shine', 'scramble'],
    hover_effect: ['tilt'],
    visualizer_style: [],
  },

  priceLabel() {
    return `${PREMIUM_PRICE} ₽`;
  },

  read() {
    try {
      return JSON.parse(localStorage.getItem(PREMIUM_KEY) || '{}') || {};
    } catch {
      return {};
    }
  },

  write(map) {
    localStorage.setItem(PREMIUM_KEY, JSON.stringify(map));
  },

  username() {
    return Auth.getUser()?.username || '';
  },

  isActive(username = this.username()) {
    if (!username) return false;
    return Boolean(this.read()[username]?.active);
  },

  activate(username = this.username(), options = {}) {
    if (!username) return false;
    const map = this.read();
    map[username] = {
      active: true,
      plan: 'lifetime',
      price: PREMIUM_PRICE,
      boughtAt: new Date().toISOString(),
    };
    this.write(map);
    if (!options.skipRemote && typeof Api !== 'undefined') {
      Api.setPremium(username, true);
    }
    return true;
  },

  deactivate(username, options = {}) {
    if (!username) return false;
    const map = this.read();
    if (!map[username]) return false;
    delete map[username];
    this.write(map);
    if (!options.skipRemote && typeof Api !== 'undefined') {
      Api.setPremium(username, false);
    }
    return true;
  },

  rename(oldName, newName) {
    const from = String(oldName || '').trim().toLowerCase();
    const to = String(newName || '').trim().toLowerCase();
    if (!from || !to || !this.isActive(from)) return;
    const map = this.read();
    map[to] = map[from] || { active: true, plan: 'lifetime', price: PREMIUM_PRICE, boughtAt: new Date().toISOString() };
    delete map[from];
    this.write(map);
  },

  list() {
    return Object.entries(this.read())
      .filter(([, row]) => row?.active)
      .map(([username, row]) => ({ username, ...row }));
  },

  isLocked(kind, id) {
    if (!id || id === 'none' || this.isActive()) return false;
    return (this.LOCKED[kind] || []).includes(id);
  },

  require(message) {
    if (this.isActive()) return true;
    if (typeof showToast === 'function') {
      showToast(message || 'Доступно в Star+', 'error');
    }
    return false;
  },

  audioLimit() {
    return this.isActive() ? this.AUDIO_PREMIUM_MAX : this.AUDIO_FREE_MAX;
  },

  isGifSource(value) {
    if (!value || typeof value !== 'string') return false;
    if (value.startsWith('data:image/gif')) return true;
    if (/\.gif(?:$|[?#])/i.test(value)) return true;
    if (typeof MediaStore !== 'undefined' && MediaStore.isRef(value)) {
      const meta = MediaStore.meta(value);
      if (!meta) return false;
      return meta.type === 'image/gif' || /\.gif$/i.test(meta.name || '');
    }
    return false;
  },

  isGifFile(file) {
    if (!file) return false;
    return file.type === 'image/gif' || /\.gif$/i.test(file.name || '');
  },

  filterPatch(patch) {
    if (this.isActive() || !patch) return patch;
    const next = { ...patch };
    Object.entries(this.LOCKED).forEach(([kind, ids]) => {
      if (ids.includes(next[kind])) delete next[kind];
    });
    if (next.bg_type === 'video') delete next.bg_type;
    if (next.name_font === this.CUSTOM_FONT) delete next.name_font;
    return next;
  },

  stripForDisplay(profile) {
    if (!profile || profile.preview_premium || this.isActive(profile.username)) return profile;

    if (this.LOCKED.bg_effect.includes(profile.bg_effect)) profile.bg_effect = 'none';
    if (this.LOCKED.name_effect.includes(profile.name_effect)) profile.name_effect = 'none';
    if (this.LOCKED.hover_effect.includes(profile.hover_effect)) profile.hover_effect = 'none';
    if (this.LOCKED.visualizer_style.includes(profile.visualizer_style)) profile.visualizer_style = 'wave';

    if (profile.bg_type === 'video') {
      profile.bg_video_url = '';
      profile.bg_type = profile.bg_image_url && !this.isGifSource(profile.bg_image_url)
        ? 'image'
        : 'color';
    }

    if (this.isGifSource(profile.bg_image_url)) {
      profile.bg_image_url = '';
      if (profile.bg_type === 'image') profile.bg_type = 'color';
    }

    if (this.isGifSource(profile.avatar_url)) profile.avatar_url = '';

    profile.posts = [];
    profile.custom_font_url = '';
    if (profile.name_font === this.CUSTOM_FONT) profile.name_font = 'Inter';
    profile.cursor_image_url = '';
    profile.bg_overlay_url = '';
    profile.share_bg_url = '';

    if (profile.music_url && typeof MediaStore !== 'undefined' && MediaStore.isRef(profile.music_url)) {
      const meta = MediaStore.meta(profile.music_url);
      if (meta && meta.size > this.AUDIO_FREE_MAX) profile.music_url = '';
    }

    return profile;
  },

  buyUrl() {
    return 'pay.html';
  },

  landingUrl() {
    return 'premium.html';
  },

  decorateBadges(profile, badges) {
    const list = (Array.isArray(badges) ? badges : []).filter((badge) => !isOfficialBadgeName(badge.text));
    if (profile?.hide_official_badges) return list;
    if (!this.isActive(profile?.username) && !profile?.preview_premium) return list;
    return [{ text: 'Star+', color: '#ffffff', icon: '✦', official: true, kind: 'premium' }, ...list];
  },
};

function syncPremiumNav() {
  document.querySelectorAll('[data-premium-cta]').forEach((el) => {
    if (Premium.isActive()) {
      el.textContent = 'Star+';
      el.setAttribute('href', 'premium.html');
      el.classList.add('is-premium');
    } else {
      el.textContent = el.dataset.premiumCta || 'Оформить Star+';
      el.setAttribute('href', 'premium.html');
      el.classList.remove('is-premium');
    }
  });
}

function ensureDemoPremium() {
  if (!Premium.isActive('demo')) Premium.activate('demo', { skipRemote: true });
}

window.Premium = Premium;
window.CUSTOM_FONT_FAMILY = CUSTOM_FONT_FAMILY;
window.normalizeBadgeKey = normalizeBadgeKey;
window.isReservedBadgeText = isReservedBadgeText;
window.isOfficialBadgeName = isOfficialBadgeName;
window.syncPremiumNav = syncPremiumNav;
document.addEventListener('DOMContentLoaded', () => {
  ensureDemoPremium();
  syncPremiumNav();
});
