const REDUCED_MOTION = AMBIENT_REDUCED_MOTION;

const HERO_WORDS = ['геймеров', 'дизайнеров', 'артистов', 'музыкантов', 'стримеров'];

const HERO_VIBES = [
  {
    name: 'Vibe User',
    username: '@vibeuser',
    bio: 'Дизайнер · Геймер · Creator',
    chips: ['✦ Creator', '★ Pro'],
    bg: 'linear-gradient(180deg, #141414 0%, #000000 100%)',
    avatar: '#ffffff',
    nameFx: 'shine',
  },
  {
    name: 'Nova',
    username: '@nova',
    bio: 'Электронная музыка · Live-сеты',
    chips: ['🎵 Artist', '◉ Live'],
    bg: 'linear-gradient(180deg, #1f1f1f 0%, #050505 100%)',
    avatar: '#e5e5e5',
    nameFx: 'neon',
  },
  {
    name: 'Kiro',
    username: '@kiro',
    bio: 'CS2 · Valorant · Twitch',
    chips: ['🎮 Gamer', '⚡ Top-1'],
    bg: 'linear-gradient(180deg, #0d0d0d 0%, #000000 100%)',
    avatar: '#d4d4d4',
    nameFx: 'glitch',
  },
  {
    name: 'Mira',
    username: '@mira',
    bio: 'Иллюстрации · Motion · 3D',
    chips: ['💎 Design', '👑 Pro'],
    bg: 'linear-gradient(180deg, #191919 0%, #030303 100%)',
    avatar: '#fafafa',
    nameFx: 'typewriter',
  },
];

const MARQUEE_NAMES = [
  'nova', 'kiro', 'mira', 'zephyr', 'lumen', 'aster', 'onyx',
  'vega', 'echo', 'rune', 'flux', 'nyx', 'sable', 'quartz',
];

document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('.hero')) return;

  createConstellation(
    document.getElementById('hero-canvas'),
    document.querySelector('.hero')
  );

  document.querySelectorAll('.features-grid .reveal').forEach((el, i) => {
    el.dataset.revealDelay = String(i * 90);
  });

  revealOnScroll('.reveal');
  bindPointerGlow('.btn-primary, .btn-secondary, .feature-card');

  initSpotlight();
  initScrollProgress();
  initCardTilt();
  initWordRotator();
  initUrlTyper();
  initHeroVibes();
  initMarquee();
});

function initSpotlight() {
  const spot = document.getElementById('hero-spotlight');
  const hero = document.querySelector('.hero');
  if (!spot || !hero || REDUCED_MOTION) return;

  const target = { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
  const current = { ...target };
  let running = false;

  hero.addEventListener('pointermove', (e) => {
    const rect = hero.getBoundingClientRect();
    target.x = e.clientX - rect.left;
    target.y = e.clientY - rect.top;
    spot.classList.add('is-active');
    if (!running) {
      running = true;
      requestAnimationFrame(follow);
    }
  });

  hero.addEventListener('pointerleave', () => spot.classList.remove('is-active'));

  function follow() {
    current.x += (target.x - current.x) * 0.09;
    current.y += (target.y - current.y) * 0.09;
    spot.style.setProperty('--sx', `${current.x}px`);
    spot.style.setProperty('--sy', `${current.y}px`);
    requestAnimationFrame(follow);
  }
}

function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    bar.style.transform = `scaleX(${Math.min(ratio, 1)})`;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initCardTilt() {
  if (REDUCED_MOTION) return;

  document.querySelectorAll('.feature-card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-py * 6}deg) rotateY(${px * 6}deg) translateY(-4px)`;
    });

    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
    });
  });
}

function initWordRotator() {
  const rotator = document.getElementById('hero-rotator');
  if (!rotator) return;

  rotator.innerHTML = HERO_WORDS.map(
    (word, i) => `<span class="rotator-item${i === 0 ? ' is-active' : ''}">${word}</span>`
  ).join('');

  const items = [...rotator.children];
  let index = 0;

  const fit = (el) => {
    rotator.style.width = `${Math.ceil(el.getBoundingClientRect().width)}px`;
  };

  fit(items[0]);
  window.addEventListener('resize', ambientDebounce(() => fit(items[index]), 200));

  if (REDUCED_MOTION) return;

  setInterval(() => {
    const current = items[index];
    index = (index + 1) % items.length;
    const next = items[index];

    current.classList.remove('is-active');
    current.classList.add('is-leaving');
    next.classList.remove('is-leaving');
    next.classList.add('is-active');
    fit(next);

    setTimeout(() => current.classList.remove('is-leaving'), 500);
  }, 2600);
}

function initUrlTyper() {
  const host = document.getElementById('hero-url-host');
  if (host && typeof siteHost === 'function') host.textContent = siteHost();
  const out = document.getElementById('hero-url-name');
  if (!out || REDUCED_MOTION) return;

  const names = ['username', 'nova', 'kiro', 'mira', 'atlas'];
  let nameIndex = 0;
  let charIndex = names[0].length;
  let deleting = true;

  function tick() {
    const word = names[nameIndex];
    charIndex += deleting ? -1 : 1;
    out.textContent = word.slice(0, charIndex);

    if (!deleting && charIndex === word.length) {
      deleting = true;
      setTimeout(tick, 1800);
      return;
    }

    if (deleting && charIndex === 0) {
      deleting = false;
      nameIndex = (nameIndex + 1) % names.length;
      setTimeout(tick, 320);
      return;
    }

    setTimeout(tick, deleting ? 55 : 105);
  }

  setTimeout(tick, 2200);
}

function initHeroVibes() {
  const screen = document.querySelector('.hero-preview .phone-screen');
  const vibe = document.getElementById('phone-vibe');
  const dots = document.getElementById('phone-dots');
  if (!screen || !vibe) return;

  if (dots) {
    dots.innerHTML = HERO_VIBES.map(
      (_, i) => `<span class="phone-dot${i === 0 ? ' is-active' : ''}"></span>`
    ).join('');
  }

  let index = 0;
  paint(HERO_VIBES[0]);

  function paint(data) {
    screen.style.background = data.bg;
    const fxClass = data.nameFx ? ` nfx nfx-${data.nameFx}` : '';
    const nameHtml = data.nameFx === 'typewriter'
      ? [...data.name].map((ch, i) => `<span class="nfx-letter" style="--nfx-i:${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')
      : data.name;
    const fxVars = [
      data.nameFx === 'neon' || data.nameFx === 'flicker'
        ? '--nfx-glow:color-mix(in srgb, #ffffff 58%, white 42%)'
        : '',
      data.nameFx === 'shine'
        ? '--nfx-shine-base:#ffffff;--nfx-shine-dim:color-mix(in srgb, #ffffff 72%, black 28%)'
        : '',
    ].filter(Boolean).join(';');
    vibe.innerHTML = `
      <div class="phone-avatar" style="background:${data.avatar}"></div>
      <div class="phone-name${fxClass}" style="${fxVars}" data-text="${data.name}">${nameHtml}</div>
      <div class="phone-username">${data.username}</div>
      <div class="phone-bio">${data.bio}</div>
      <div class="phone-chips">
        ${data.chips.map((chip) => `<span class="phone-chip">${chip}</span>`).join('')}
      </div>
    `;
  }

  if (REDUCED_MOTION) return;

  setInterval(() => {
    index = (index + 1) % HERO_VIBES.length;
    vibe.classList.add('is-swapping');

    if (dots) {
      [...dots.children].forEach((dot, i) => dot.classList.toggle('is-active', i === index));
    }

    setTimeout(() => {
      paint(HERO_VIBES[index]);
      vibe.classList.remove('is-swapping');
    }, 350);
  }, 4200);
}

function initMarquee() {
  const track = document.getElementById('marquee-track');
  if (!track) return;

  const items = MARQUEE_NAMES.map(
    (name) => `<a class="marquee-item" href="/mefloverxd">${(typeof siteHost === 'function' ? siteHost() : (window.location.host || 'artstar'))}/${name}</a>`
  ).join('');

  track.innerHTML = items + items;
}
