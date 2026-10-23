const THEME_PRESETS = [
  {
    id: 'noir',
    name: 'Noir',
    icon: '◼',
    patch: {
      bg_type: 'color',
      bg_color: '#000000',
      bg_effect: 'none',
      name_color: '#ffffff',
      name_font: 'Inter',
      name_effect: 'none',
      card_opacity: 55,
      card_blur: 20,
      cursor_preset: 'default',
      hover_effect: 'glow',
      click_effect: 'ripple',
    },
  },
  {
    id: 'carbon',
    name: 'Carbon',
    icon: '▣',
    patch: {
      bg_type: 'gradient',
      bg_gradient_from: '#1a1a1a',
      bg_gradient_to: '#000000',
      bg_effect: 'none',
      name_color: '#ffffff',
      name_font: 'Inter',
      name_effect: 'none',
      card_opacity: 62,
      card_blur: 14,
      cursor_preset: 'dot',
      hover_effect: 'lift',
      click_effect: 'ripple',
    },
  },
  {
    id: 'frost',
    name: 'Frost',
    icon: '❄',
    patch: {
      bg_type: 'gradient',
      bg_gradient_from: '#2b3138',
      bg_gradient_to: '#0a0a0a',
      bg_effect: 'aurora',
      name_color: '#e8f4ff',
      name_font: 'Poppins',
      name_effect: 'shine',
      card_opacity: 38,
      card_blur: 28,
      cursor_preset: 'sparkle',
      hover_effect: 'glow',
      click_effect: 'spark',
    },
  },
  {
    id: 'silver',
    name: 'Silver',
    icon: '◎',
    patch: {
      bg_type: 'color',
      bg_color: '#171717',
      bg_effect: 'aurora',
      name_color: '#e5e5e5',
      name_font: 'Montserrat',
      name_effect: 'neon',
      card_opacity: 48,
      card_blur: 22,
      cursor_preset: 'ring',
      hover_effect: 'pulse',
      click_effect: 'spark',
    },
  },
  {
    id: 'ink',
    name: 'Ink',
    icon: '✦',
    patch: {
      bg_type: 'gradient',
      bg_gradient_from: '#0a0a0a',
      bg_gradient_to: '#171717',
      bg_effect: 'gradient-flow',
      name_color: '#ffffff',
      name_font: 'Oswald',
      name_effect: 'none',
      card_opacity: 60,
      card_blur: 18,
      cursor_preset: 'crosshair',
      hover_effect: 'tilt',
      click_effect: 'pixel',
    },
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    icon: '✧',
    patch: {
      bg_type: 'gradient',
      bg_gradient_from: '#101018',
      bg_gradient_to: '#000000',
      bg_effect: 'stars',
      name_color: '#ffffff',
      name_font: 'Montserrat',
      name_effect: 'flicker',
      card_opacity: 32,
      card_blur: 24,
      cursor_preset: 'sparkle',
      hover_effect: 'glow',
      click_effect: 'spark',
    },
  },
  {
    id: 'retro',
    name: 'Retro',
    icon: '▦',
    patch: {
      bg_type: 'gradient',
      bg_gradient_from: '#141414',
      bg_gradient_to: '#000000',
      bg_effect: 'grid',
      name_color: '#ffffff',
      name_font: 'Oswald',
      name_effect: 'typewriter',
      card_opacity: 50,
      card_blur: 12,
      cursor_preset: 'crosshair',
      hover_effect: 'tilt',
      click_effect: 'pixel',
    },
  },
  {
    id: 'spotlight',
    name: 'Spotlight',
    icon: '✳',
    patch: {
      bg_type: 'color',
      bg_color: '#0d0d0d',
      bg_effect: 'rays',
      name_color: '#ffffff',
      name_font: 'Playfair Display',
      name_effect: 'neon',
      card_opacity: 24,
      card_blur: 16,
      cursor_preset: 'ring',
      hover_effect: 'lift',
      click_effect: 'spark',
    },
  },
  {
    id: 'crt',
    name: 'CRT',
    icon: '≡',
    patch: {
      bg_type: 'color',
      bg_color: '#080a08',
      bg_effect: 'scanlines',
      name_color: '#7dffb2',
      name_font: 'JetBrains Mono',
      name_effect: 'glitch',
      card_opacity: 42,
      card_blur: 8,
      cursor_preset: 'crosshair',
      hover_effect: 'none',
      click_effect: 'pixel',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    icon: '✦',
    patch: {
      bg_type: 'gradient',
      bg_gradient_from: '#1a1010',
      bg_gradient_to: '#000000',
      bg_effect: 'aurora',
      name_color: '#ff5a4d',
      name_font: 'Oswald',
      name_effect: 'flicker',
      card_opacity: 52,
      card_blur: 18,
      cursor_preset: 'dot',
      hover_effect: 'glow',
      click_effect: 'spark',
    },
  },
  {
    id: 'pulse',
    name: 'Pulse',
    icon: '◎',
    patch: {
      bg_type: 'color',
      bg_color: '#0a0a0a',
      bg_effect: 'pulse',
      name_color: '#67e8f9',
      name_font: 'Poppins',
      name_effect: 'wave',
      card_opacity: 45,
      card_blur: 20,
      cursor_preset: 'ring',
      hover_effect: 'pulse',
      click_effect: 'ripple',
    },
  },
  {
    id: 'void',
    name: 'Void',
    icon: '○',
    patch: {
      bg_type: 'color',
      bg_color: '#000000',
      bg_effect: 'none',
      name_color: '#8a8a8a',
      name_font: 'JetBrains Mono',
      name_effect: 'typewriter',
      card_opacity: 0,
      card_blur: 0,
      cursor_preset: 'dot',
      hover_effect: 'none',
      click_effect: 'spark',
    },
  },
];

function getThemeSwatch(theme) {
  const p = theme.patch;
  if (p.bg_type === 'gradient') {
    return `linear-gradient(140deg, ${p.bg_gradient_from}, ${p.bg_gradient_to})`;
  }
  return p.bg_color || '#000000';
}

function applyThemePreset(store, themeId) {
  const theme = THEME_PRESETS.find((t) => t.id === themeId);
  if (!theme) return false;
  store.setFields(typeof Premium !== 'undefined' ? Premium.filterPatch({ ...theme.patch }) : { ...theme.patch });
  return true;
}

function getRandomThemeId(exceptId) {
  const pool = THEME_PRESETS.filter((t) => t.id !== exceptId);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

function renderThemePresets(containerId, onApply) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = THEME_PRESETS.map((theme) => `
    <button type="button" class="theme-preset-btn" data-theme="${theme.id}" title="${escapeHtml(theme.name)}">
      <span class="theme-preset-swatch" style="background:${getThemeSwatch(theme)}">
        <span class="theme-preset-dot" style="background:${theme.patch.name_color}"></span>
      </span>
      <span class="theme-preset-name">${escapeHtml(theme.name)}</span>
    </button>
  `).join('');

  container.querySelectorAll('.theme-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => onApply(btn.dataset.theme));
  });
}

function syncActiveTheme(containerId, state) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const match = THEME_PRESETS.find((theme) =>
    Object.entries(theme.patch).every(([key, value]) => state[key] === value)
  );

  container.querySelectorAll('.theme-preset-btn').forEach((btn) => {
    btn.classList.toggle('active', Boolean(match) && btn.dataset.theme === match.id);
  });
}

window.THEME_PRESETS = THEME_PRESETS;
window.applyThemePreset = applyThemePreset;
window.renderThemePresets = renderThemePresets;
window.getRandomThemeId = getRandomThemeId;
window.getThemeSwatch = getThemeSwatch;
window.syncActiveTheme = syncActiveTheme;
