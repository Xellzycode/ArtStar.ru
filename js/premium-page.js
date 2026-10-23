document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('.page-premium')) return;

  const canvas = document.getElementById('premium-canvas');
  const host = document.querySelector('.premium-sky');
  if (canvas && host && typeof createConstellation === 'function') {
    createConstellation(canvas, host, {
      area: 16000,
      maxDots: 90,
      linkDist: 150,
      speed: 0.28,
      dotAlpha: 0.5,
      lineAlpha: 0.14,
      shape: 'star',
      starImage: 'images/artstar.png',
      interact: false,
      wrap: true,
      pointerLines: false,
      ripples: false,
    });
  }

  document.querySelectorAll('.premium-grid .reveal').forEach((el, i) => {
    el.dataset.revealDelay = String((i % 3) * 80);
  });

  renderPremiumCompareCards();

  if (typeof revealOnScroll === 'function') revealOnScroll('.reveal');
  if (typeof bindPointerGlow === 'function') {
    bindPointerGlow('.premium-card, .btn-primary, .btn-secondary, .pay-card');
  }

  if (typeof Premium !== 'undefined' && Premium.isActive()) {
    document.querySelectorAll('.premium-cta').forEach((buy) => {
      buy.textContent = 'Star+ оформлен';
      buy.classList.remove('btn-primary');
      buy.classList.add('btn-secondary');
      buy.setAttribute('href', 'dashboard.html');
    });
  }
});

function renderPremiumCompareCards() {
  if (typeof renderProfileCardHTML !== 'function' || typeof normalizeProfile !== 'function') return;

  const shared = {
    display_name: 'Art_star_user',
    bio: 'Ссылки в одном месте',
    bg_type: 'color',
    name_color: '#ffffff',
    name_font: 'Inter',
    card_opacity: 48,
    card_blur: 16,
    badges: [
      { text: 'LIVE', color: '#ff4d4d', icon: '🔥' },
      { text: 'Twitch', color: '#9146ff', icon: '◉' },
    ],
    show_stats: false,
  };

  const free = normalizeProfile({
    ...shared,
    username: 'username',
    bg_color: '#0a0a0a',
    bg_effect: 'none',
    name_effect: 'none',
    hover_effect: 'none',
    cursor_preset: 'default',
    click_effect: 'none',
  });

  const pro = normalizeProfile({
    ...shared,
    username: 'username',
    preview_premium: true,
    bg_color: '#000000',
    bg_effect: 'stars',
    name_effect: 'scramble',
    hover_effect: 'tilt',
    name_font: 'Inter',
    cursor_preset: 'sparkle',
    click_effect: 'spark',
    widget_status: 'В эфире',
  });

  mountDemoCard('premium-demo-free', free);
  mountDemoCard('premium-demo-pro', pro);
}

function mountDemoCard(id, profile) {
  const root = document.getElementById(id);
  if (!root) return;
  root.innerHTML = renderProfileCardHTML(profile);
  if (typeof ProfileEffects !== 'undefined') {
    ProfileEffects.apply(root, profile, { preview: true });
  }
}
