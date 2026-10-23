function templateDateIn(days, hour) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const CARD_TEMPLATES = [
  {
    id: 'streamer',
    name: 'Стример',
    tagline: 'Лучи, таймер до стрима и соцсети отдельной карточкой',
    tags: ['Twitch', 'Отсчёт'],
    badges: [
      { text: 'LIVE', color: '#ff4d4d', icon: '🔥' },
      { text: 'Twitch', color: '#9146ff', icon: '◉' },
    ],
    patch: {
      bg_type: 'color',
      bg_color: '#0b0b10',
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
      widget_status: 'В эфире',
      widget_clock: false,
      widget_countdown_date: () => templateDateIn(2, 20),
      widget_countdown_label: 'Стрим',
      music_compact: true,
      show_stats: true,
    },
  },
  {
    id: 'musician',
    name: 'Музыкант',
    tagline: 'Тёплый фон, крупный плеер и лента записей ниже',
    tags: ['Плеер', 'Посты'],
    badges: [
      { text: 'Новый трек', color: '#ff8a5c', icon: '🎵' },
      { text: 'Сведение', color: '#ffffff', icon: '✦' },
    ],
    patch: {
      bg_type: 'gradient',
      bg_gradient_from: '#1c1210',
      bg_gradient_to: '#000000',
      bg_effect: 'aurora',
      name_color: '#ffb199',
      name_font: 'Unbounded',
      name_effect: 'shine',
      card_opacity: 52,
      card_blur: 22,
      cursor_preset: 'sparkle',
      hover_effect: 'lift',
      click_effect: 'spark',
      layout_split: 'posts',
      gap_name: 16,
      gap_bio: 14,
      gap_status: 12,
      gap_badges: 14,
      gap_widgets: 12,
      gap_stats: 16,
      gap_socials: 22,
      gap_posts: 22,
      widget_status: 'Собираю новый релиз',
      widget_clock: false,
      widget_countdown_date: '',
      widget_countdown_label: '',
      music_compact: false,
      show_stats: true,
    },
  },
  {
    id: 'gamer',
    name: 'Геймер',
    tagline: 'Зелёный терминал, глитч в имени и прицел вместо курсора',
    tags: ['CRT', 'Глитч'],
    badges: [
      { text: 'Rank S', color: '#7dffb2', icon: '🏆' },
      { text: 'Соло-квин', color: '#ffffff', icon: '🎮' },
    ],
    patch: {
      bg_type: 'color',
      bg_color: '#070a08',
      bg_effect: 'scanlines',
      name_color: '#7dffb2',
      name_font: 'JetBrains Mono',
      name_effect: 'glitch',
      card_opacity: 46,
      card_blur: 8,
      cursor_preset: 'crosshair',
      hover_effect: 'none',
      click_effect: 'pixel',
      layout_split: 'none',
      gap_name: 14,
      gap_bio: 10,
      gap_status: 10,
      gap_badges: 12,
      gap_widgets: 12,
      gap_stats: 14,
      gap_socials: 18,
      gap_posts: 18,
      widget_status: 'В игре',
      widget_clock: true,
      widget_clock_tz: 'Europe/Moscow',
      widget_countdown_date: '',
      widget_countdown_label: '',
      music_compact: true,
      show_stats: true,
    },
  },
  {
    id: 'designer',
    name: 'Дизайнер',
    tagline: 'Много воздуха, крупная антиква и ничего лишнего',
    tags: ['Воздух', 'Антиква'],
    badges: [
      { text: 'Портфолио', color: '#ffffff', icon: '✦' },
    ],
    patch: {
      bg_type: 'gradient',
      bg_gradient_from: '#242424',
      bg_gradient_to: '#050505',
      bg_effect: 'none',
      name_color: '#ffffff',
      name_font: 'Playfair Display',
      name_effect: 'none',
      card_opacity: 58,
      card_blur: 26,
      cursor_preset: 'dot',
      hover_effect: 'lift',
      click_effect: 'ripple',
      layout_split: 'none',
      gap_name: 26,
      gap_bio: 20,
      gap_status: 18,
      gap_badges: 22,
      gap_widgets: 20,
      gap_stats: 24,
      gap_socials: 30,
      gap_posts: 30,
      widget_status: '',
      widget_clock: false,
      widget_countdown_date: '',
      widget_countdown_label: '',
      music_compact: true,
      show_stats: false,
    },
  },
  {
    id: 'developer',
    name: 'Разработчик',
    tagline: 'Сетка, моношрифт и печатная машинка в имени',
    tags: ['Моно', 'Сетка'],
    badges: [
      { text: 'open source', color: '#ffffff', icon: '⚡' },
      { text: 'ищу проект', color: '#67e8f9', icon: '' },
    ],
    patch: {
      bg_type: 'color',
      bg_color: '#0a0a0a',
      bg_effect: 'grid',
      name_color: '#ffffff',
      name_font: 'JetBrains Mono',
      name_effect: 'typewriter',
      card_opacity: 54,
      card_blur: 12,
      cursor_preset: 'crosshair',
      hover_effect: 'tilt',
      click_effect: 'ripple',
      layout_split: 'socials',
      gap_name: 16,
      gap_bio: 12,
      gap_status: 12,
      gap_badges: 12,
      gap_widgets: 14,
      gap_stats: 14,
      gap_socials: 20,
      gap_posts: 20,
      widget_status: 'Пишу код',
      widget_clock: true,
      widget_clock_tz: 'Europe/Moscow',
      widget_countdown_date: '',
      widget_countdown_label: '',
      music_compact: true,
      show_stats: true,
    },
  },
  {
    id: 'photographer',
    name: 'Фотограф',
    tagline: 'Почти прозрачная подложка — фон и баннер на первом плане',
    tags: ['Прозрачность', 'Посты'],
    badges: [
      { text: 'Съёмки', color: '#ffffff', icon: '📷' },
    ],
    patch: {
      bg_type: 'gradient',
      bg_gradient_from: '#2b2b2b',
      bg_gradient_to: '#000000',
      bg_effect: 'aurora',
      name_color: '#ffffff',
      name_font: 'Montserrat',
      name_effect: 'none',
      card_opacity: 18,
      card_blur: 14,
      cursor_preset: 'dot',
      hover_effect: 'glow',
      click_effect: 'spark',
      layout_split: 'both',
      gap_name: 20,
      gap_bio: 14,
      gap_status: 14,
      gap_badges: 16,
      gap_widgets: 16,
      gap_stats: 18,
      gap_socials: 24,
      gap_posts: 24,
      widget_status: 'Открыт к съёмкам',
      widget_clock: false,
      widget_countdown_date: '',
      widget_countdown_label: '',
      music_compact: true,
      show_stats: true,
    },
  },
  {
    id: 'cosmos',
    name: 'Космос',
    tagline: 'Звёздное поле, мерцающее имя и волна по буквам',
    tags: ['Звёзды', 'Волна'],
    badges: [
      { text: 'Ночная смена', color: '#a5b4fc', icon: '✧' },
    ],
    patch: {
      bg_type: 'gradient',
      bg_gradient_from: '#0d0d18',
      bg_gradient_to: '#000000',
      bg_effect: 'stars',
      name_color: '#e6e6ff',
      name_font: 'Space Grotesk',
      name_effect: 'wave',
      card_opacity: 34,
      card_blur: 24,
      cursor_preset: 'sparkle',
      hover_effect: 'glow',
      click_effect: 'spark',
      layout_split: 'posts',
      gap_name: 18,
      gap_bio: 14,
      gap_status: 12,
      gap_badges: 14,
      gap_widgets: 14,
      gap_stats: 16,
      gap_socials: 22,
      gap_posts: 22,
      widget_status: '',
      widget_clock: true,
      widget_clock_tz: 'Europe/Moscow',
      widget_countdown_date: '',
      widget_countdown_label: '',
      music_compact: false,
      show_stats: true,
    },
  },
  {
    id: 'minimal',
    name: 'Минимализм',
    tagline: 'Подложки нет вообще — только текст на чёрном',
    tags: ['Без подложки', 'Чёрный'],
    badges: [],
    patch: {
      bg_type: 'color',
      bg_color: '#000000',
      bg_effect: 'none',
      name_color: '#ffffff',
      name_font: 'Inter',
      name_effect: 'none',
      card_opacity: 0,
      card_blur: 0,
      cursor_preset: 'default',
      hover_effect: 'none',
      click_effect: 'none',
      layout_split: 'none',
      gap_name: 22,
      gap_bio: 16,
      gap_status: 14,
      gap_badges: 16,
      gap_widgets: 16,
      gap_stats: 20,
      gap_socials: 26,
      gap_posts: 26,
      widget_status: '',
      widget_clock: false,
      widget_countdown_date: '',
      widget_countdown_label: '',
      music_compact: true,
      show_stats: false,
    },
  },
];

function resolveTemplatePatch(template) {
  return Object.fromEntries(
    Object.entries(template.patch).map(([key, value]) => [key, typeof value === 'function' ? value() : value])
  );
}

function getTemplateBackground(patch) {
  if (patch.bg_type === 'gradient') {
    return `linear-gradient(160deg, ${patch.bg_gradient_from}, ${patch.bg_gradient_to})`;
  }
  return patch.bg_color || '#000000';
}

function renderTemplateThumb(template) {
  const patch = template.patch;
  const opacity = ((patch.card_opacity ?? 55) / 100).toFixed(2);
  const pills = (template.badges || []).slice(0, 2).map((badge) => `
    <span class="tpl-pill" style="border-color:${escapeHtml(badge.color || '#ffffff')}"></span>
  `).join('') || '<span class="tpl-pill"></span>';

  return `
    <div class="tpl-thumb" style="background:${getTemplateBackground(patch)}">
      <div class="tpl-thumb-fx tpl-thumb-fx--${escapeHtml(patch.bg_effect || 'none')}"></div>
      <div class="tpl-thumb-card" style="background:rgba(10,10,10,${opacity})">
        <span class="tpl-thumb-avatar"></span>
        <span class="tpl-thumb-name" style="color:${escapeHtml(patch.name_color)};font-family:'${escapeHtml(patch.name_font)}',sans-serif">Имя</span>
        <span class="tpl-thumb-line"></span>
        <span class="tpl-thumb-line tpl-thumb-line--short"></span>
        <span class="tpl-thumb-pills">${pills}</span>
      </div>
      ${patch.layout_split && patch.layout_split !== 'none'
        ? '<div class="tpl-thumb-card tpl-thumb-card--split" style="background:rgba(10,10,10,' + opacity + ')"></div>'
        : ''}
    </div>
  `;
}

function applyCardTemplate(store, templateId) {
  const template = CARD_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const patch = resolveTemplatePatch(template);
  const current = store.getState();
  const takeBadges = Boolean(template.badges?.length) && !(current.badges || []).length;

  if (takeBadges) {
    patch.badges = template.badges.map((badge) => ({ ...createBadge(), ...badge }));
  }

  store.setFields(typeof Premium !== 'undefined' ? Premium.filterPatch(patch) : patch);
  return { template, badgesAdded: takeBadges };
}

let lastAppliedTemplateId = null;

function applyRandomCardTemplate(store) {
  const pool = CARD_TEMPLATES.filter((template) => template.id !== lastAppliedTemplateId);
  const pick = pool[Math.floor(Math.random() * pool.length)] || CARD_TEMPLATES[0];
  lastAppliedTemplateId = pick.id;
  return applyCardTemplate(store, pick.id);
}

function openTemplatesModal(store) {
  const cards = CARD_TEMPLATES.map((template) => `
    <button type="button" class="tpl-card" data-template="${template.id}">
      ${renderTemplateThumb(template)}
      <span class="tpl-info">
        <span class="tpl-name">${escapeHtml(template.name)}</span>
        <span class="tpl-tagline">${escapeHtml(template.tagline)}</span>
        <span class="tpl-tags">
          ${(template.tags || []).map((tag) => `<span class="tpl-tag">${escapeHtml(tag)}</span>`).join('')}
        </span>
      </span>
      <span class="tpl-apply">Применить</span>
    </button>
  `).join('');

  openModal({
    title: 'Шаблоны карточек',
    subtitle: 'Стиль, раскладка и виджеты применяются целиком. Имя, ссылки и записи не изменяются',
    className: 'modal--templates',
    body: `<div class="tpl-grid">${cards}</div>`,
    onMount: (dialog, close) => {
        dialog.querySelectorAll('.tpl-card').forEach((card) => {
          card.addEventListener('click', () => {
            const result = applyCardTemplate(store, card.dataset.template);
            if (!result) return;

            lastAppliedTemplateId = result.template.id;
            showToast(result.badgesAdded
              ? `Шаблон «${result.template.name}» применён. Бейджи можно изменить`
              : `Шаблон «${result.template.name}» применён`);
            close();
          });
        });
    },
  });
}

window.CARD_TEMPLATES = CARD_TEMPLATES;
window.applyCardTemplate = applyCardTemplate;
window.applyRandomCardTemplate = applyRandomCardTemplate;
window.openTemplatesModal = openTemplatesModal;
