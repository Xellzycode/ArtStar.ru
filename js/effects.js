const CURSOR_PRESETS = [
  { id: 'default', name: 'Обычный', icon: '↖' },
  { id: 'dot', name: 'Точка', icon: '●' },
  { id: 'crosshair', name: 'Прицел', icon: '⊕' },
  { id: 'sparkle', name: 'Искра', icon: '✦' },
  { id: 'ring', name: 'Кольцо', icon: '○' },
];

const BG_EFFECTS = [
  { id: 'none', name: 'Без эффекта', icon: '—' },
  { id: 'gradient-flow', name: 'Градиент', icon: '◈' },
  { id: 'aurora', name: 'Аврора', icon: '☁' },
  { id: 'leaves', name: 'Листопад', icon: '❧' },
  { id: 'snow', name: 'Снежинки', icon: '❄' },
  { id: 'stars', name: 'Созвездия', icon: '✧' },
  { id: 'grid', name: 'Сетка', icon: '▦' },
  { id: 'rays', name: 'Лучи', icon: '✳' },
  { id: 'scanlines', name: 'Сканлайны', icon: '≡' },
  { id: 'pulse', name: 'Пульс', icon: '◎' },
];

const VISUALIZER_STYLES = [
  { id: 'mirror', name: 'Зеркало', icon: '↕' },
  { id: 'wave', name: 'Волна', icon: '∿' },
  { id: 'ring', name: 'Кольцо', icon: '◎' },
];

const OVERLAY_DENSITY = [
  { id: 'sparse', name: 'Редко', icon: '·' },
  { id: 'normal', name: 'Обычно', icon: '⋯' },
  { id: 'dense', name: 'Часто', icon: '∷' },
];

const OVERLAY_SPEED = [
  { id: 'slow', name: 'Медленно', icon: '˜' },
  { id: 'normal', name: 'Обычно', icon: '∼' },
  { id: 'fast', name: 'Быстро', icon: '≈' },
];

const OVERLAY_SIZE = [
  { id: 'sm', name: 'Мелкий', icon: '◦' },
  { id: 'md', name: 'Обычный', icon: '●' },
  { id: 'lg', name: 'Крупный', icon: '◉' },
];

const CURSOR_PIXEL_SIZE = 24;

const NAME_EFFECTS = [
  { id: 'none', name: 'Нет', icon: '—' },
  { id: 'glitch', name: 'Глитч', icon: '⧉' },
  { id: 'flicker', name: 'Мерцание', icon: '✦' },
  { id: 'typewriter', name: 'Печатная машинка', icon: '⌨' },
  { id: 'shine', name: 'Перелив', icon: '◐' },
  { id: 'neon', name: 'Неон', icon: '☀' },
  { id: 'wave', name: 'Волна', icon: '∿' },
  { id: 'chromatic', name: 'Хромо', icon: '⧉' },
  { id: 'ghost', name: 'Призрак', icon: '◌' },
  { id: 'scramble', name: 'Шифр', icon: '#' },
];

const CLICK_EFFECTS = [
  { id: 'none', name: 'Нет', icon: '—' },
  { id: 'ripple', name: 'Волна', icon: '◎' },
  { id: 'spark', name: 'Искры', icon: '✦' },
  { id: 'pixel', name: 'Пиксели', icon: '▦' },
];

const BG_TYPES = [
  { id: 'color', name: 'Цвет' },
  { id: 'gradient', name: 'Градиент' },
  { id: 'image', name: 'Картинка' },
  { id: 'video', name: 'Видео' },
];

const MUSIC_VOLUME_DEFAULT = 0.25;
const MUSIC_VOLUME_KEY = 'vibecard_music_volume';

function readMusicVolume() {
  try {
    const raw = sessionStorage.getItem(MUSIC_VOLUME_KEY);
    if (raw == null || raw === '') return MUSIC_VOLUME_DEFAULT;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0 && value <= 1) return value;
  } catch {

  }
  return MUSIC_VOLUME_DEFAULT;
}

function writeMusicVolume(value) {
  try {
    sessionStorage.setItem(MUSIC_VOLUME_KEY, String(value));
  } catch {

  }
}

const ProfileEffects = {

  apply(root, profile, options = {}) {
    if (!root) return;
    const vcard = root.querySelector('.vcard');
    if (!vcard) return;

    const p = normalizeProfile(profile);
    this.applyCursor(vcard, p.cursor_preset, p.cursor_color, p.cursor_image_url);
    this.applyClickEffect(vcard, p.click_effect);
    this.initMusicWidgets(root, options.autoplay === true);
    this.initMusicVisualizer(root, p);
    this.initNameScramble(root);
    this.initHoverTilt(root);
    this.initGridSpotlight(root);
    this.initConstellation(root);
    if (typeof initCardWidgets === 'function') {
      initCardWidgets();
    }
    if (typeof initVideoBackgrounds === 'function') {
      initVideoBackgrounds(root);
    }
    if (typeof initSocialUI === 'function') {
      initSocialUI(root, p, { readOnly: options.preview === true });
    }
  },

  applyCursor(vcard, preset, color, imageUrl) {
    CURSOR_PRESETS.forEach(({ id }) => vcard.classList.remove(`vcard-cursor-${id}`));
    vcard.classList.remove('vcard-cursor-custom');
    vcard.style.removeProperty('--vcard-cursor');

    if (imageUrl) {
      vcard.classList.add('vcard-cursor-custom');
      fitCursorImage(imageUrl, CURSOR_PIXEL_SIZE).then((url) => {
        if (!vcard.isConnected) return;
        const hot = Math.round(CURSOR_PIXEL_SIZE / 2);
        vcard.style.setProperty('--vcard-cursor', `url("${url}") ${hot} ${hot}, auto`);
      });
      return;
    }

    if (!preset || preset === 'default') return;

    vcard.classList.add(`vcard-cursor-${preset}`);
    const tint = typeof sanitizeHexColor === 'function' ? sanitizeHexColor(color, '#ffffff') : (color || '#ffffff');
    const cursor = buildCursorImage(preset, tint);
    if (cursor) vcard.style.setProperty('--vcard-cursor', cursor);
  },

  applyClickEffect(vcard, preset) {
    vcard.dataset.clickEffect = preset && preset !== 'none' ? preset : '';

    if (vcard.dataset.clickFxBound) return;
    vcard.dataset.clickFxBound = '1';

    vcard.addEventListener('pointerdown', (event) => {
      const effect = vcard.dataset.clickEffect;
      if (!effect || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      spawnClickEffect(vcard, effect, event);
    });
  },

  initMusicWidgets(root, autoplay = false) {
    root.querySelectorAll('.vcard-music-widget').forEach((widget) => {
      if (widget.dataset.bound) return;
      widget.dataset.bound = '1';

      const audio = widget.querySelector('.music-widget-audio');
      const btn = widget.querySelector('.music-widget-btn');
      const bar = widget.querySelector('.music-widget-bar');
      const iconOn = widget.querySelector('.music-icon-on');
      const iconOff = widget.querySelector('.music-icon-off');
      const volumeInput = widget.querySelector('.music-widget-volume-input');
      if (!audio || !btn) return;

      audio.volume = readMusicVolume();
      if (volumeInput) {
        volumeInput.value = String(Math.round(audio.volume * 100));
        widget.style.setProperty('--music-vol', `${volumeInput.value}%`);
      }

      const syncIcons = () => {
        const playing = !audio.paused;
        iconOn?.classList.toggle('hidden', !playing);
        iconOff?.classList.toggle('hidden', playing);
        widget.classList.toggle('is-playing', playing);
        btn.setAttribute('aria-label', playing ? 'Выключить звук' : 'Включить звук');
      };

      btn.addEventListener('click', () => {
        if (audio.paused) {
          audio.play().catch(() => showToast('Не удалось воспроизвести', 'error'));
        } else {
          audio.pause();
        }
      });

      volumeInput?.addEventListener('pointerdown', (event) => event.stopPropagation());
      volumeInput?.addEventListener('input', () => {
        const volume = Math.min(1, Math.max(0, Number(volumeInput.value) / 100));
        audio.volume = volume;
        widget.style.setProperty('--music-vol', `${volumeInput.value}%`);
        writeMusicVolume(volume);
      });

      audio.addEventListener('play', syncIcons);
      audio.addEventListener('pause', syncIcons);

      audio.addEventListener('timeupdate', () => {
        if (!bar || !audio.duration) return;
        bar.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
      });

      if (autoplay) {
        audio.play().catch(() => {});
      }

      syncIcons();
    });
  },

  initMusicVisualizer(root, profile) {
    if (!profile.music_visualizer || !profile.music_url) {
      root.querySelectorAll('.vcard-visualizer').forEach((el) => el.remove());
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const style = migrateVisualizerStyle(profile.visualizer_style);
    const color = typeof sanitizeHexColor === 'function'
      ? sanitizeHexColor(profile.visualizer_color, '#ffffff')
      : (profile.visualizer_color || '#ffffff');
    root.querySelectorAll('.vcard-music-widget').forEach((widget) => {
      const audio = widget.querySelector('.music-widget-audio');
      const vcard = widget.closest('.vcard');
      if (!audio || !vcard) return;

      let canvas = vcard.querySelector('.vcard-visualizer');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'vcard-visualizer';
        canvas.setAttribute('aria-hidden', 'true');
        const fx = vcard.querySelector('.vcard-fx-layer');
        if (fx && fx.nextSibling) vcard.insertBefore(canvas, fx.nextSibling);
        else vcard.insertBefore(canvas, vcard.firstChild);
      }

      canvas.dataset.vizStyle = style;
      canvas.dataset.vizColor = color;
      canvas.dataset.vizRainbow = profile.visualizer_rainbow ? '1' : '0';
      bindMusicVisualizer(audio, canvas, widget);
    });
  },

  initNameScramble(root) {
    root.querySelectorAll('.nfx-scramble').forEach((el) => {
      if (el.dataset.scrambleBound) return;
      el.dataset.scrambleBound = '1';
      startNameScramble(el);
    });
  },

  initHoverTilt(root) {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!finePointer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    root.querySelectorAll('.vcard-hover-tilt').forEach((card) => {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = '1';

      const host = card.closest('.vcard') || card;
      const max = 12;

      const tiltTo = (event) => {
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const px = Math.max(-0.5, Math.min(0.5, (event.clientX - rect.left) / rect.width - 0.5));
        const py = Math.max(-0.5, Math.min(0.5, (event.clientY - rect.top) / rect.height - 0.5));
        card.classList.add('is-tilting');
        card.style.transform = `perspective(900px) rotateX(${(-py * max * 2).toFixed(2)}deg) rotateY(${(px * max * 2).toFixed(2)}deg)`;
      };

      host.addEventListener('pointermove', tiltTo);
      host.addEventListener('pointerleave', () => {
        card.classList.remove('is-tilting');
        card.style.transform = '';
      });
    });
  },

  initGridSpotlight(root) {
    const vcard = root.querySelector('.vcard');
    const spot = root.querySelector('.fx-grid-spot');
    if (!vcard || !spot || vcard.dataset.gridSpotBound) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    vcard.dataset.gridSpotBound = '1';

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let running = false;

    const place = (x, y) => {
      target.x = x;
      target.y = y;
      if (!running) {
        running = true;
        requestAnimationFrame(follow);
      }
    };

    const follow = () => {
      if (!vcard.isConnected) return;
      current.x += (target.x - current.x) * 0.09;
      current.y += (target.y - current.y) * 0.09;
      spot.style.setProperty('--sx', `${current.x}px`);
      spot.style.setProperty('--sy', `${current.y}px`);
      if (Math.hypot(target.x - current.x, target.y - current.y) > 0.5) {
        requestAnimationFrame(follow);
      } else {
        running = false;
      }
    };

    const rect = vcard.getBoundingClientRect();
    current.x = target.x = rect.width / 2;
    current.y = target.y = rect.height * 0.38;
    spot.style.setProperty('--sx', `${current.x}px`);
    spot.style.setProperty('--sy', `${current.y}px`);

    vcard.addEventListener('pointermove', (event) => {
      const box = vcard.getBoundingClientRect();
      place(event.clientX - box.left, event.clientY - box.top);
      spot.classList.add('is-active');
    });

    vcard.addEventListener('pointerleave', () => {
      spot.classList.remove('is-active');
    });
  },

  initConstellation(root) {
    if (typeof createConstellation !== 'function') return;
    root.querySelectorAll('.fx-constellation-canvas').forEach((canvas) => {
      if (canvas.dataset.constellationBound) return;
      canvas.dataset.constellationBound = '1';
      const host = canvas.closest('.fx-constellation') || canvas.parentElement;
      createConstellation(canvas, host, {
        area: 7800,
        maxDots: 34,
        linkDist: 72,
        pointerDist: 96,
        speed: 0.15,
        dotAlpha: 0.42,
        lineAlpha: 0.16,
        pointerLines: false,
        ripples: false,
        interact: true,
        wrap: true,
        pointerTarget: canvas.closest('.vcard') || host,
      });
    });
  },
};

const CLICK_FX_PARTICLES = { spark: 6, pixel: 16 };
const CLICK_FX_LIFETIME = { spark: 900, pixel: 2200, ripple: 900 };
let visualizerAudioCtx = null;

function getVisualizerContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!visualizerAudioCtx) visualizerAudioCtx = new Ctx();
  return visualizerAudioCtx;
}

function migrateVisualizerStyle(value) {
  if (value === 'wave' || value === 'mirror' || value === 'ring') return value;
  return 'wave';
}

function vizRgb(hex) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#ffffff';
  const n = parseInt(safe.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function vizRgba(rgb, alpha, rainbow, hue) {
  if (rainbow) return `hsla(${((hue % 360) + 360) % 360}, 92%, 64%, ${alpha})`;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

function vizEnergy(freqData, from, to) {
  const start = Math.max(0, from);
  const end = Math.min(freqData.length, to);
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i += 1) sum += freqData[i];
  return sum / (end - start) / 255;
}

function drawVisualizerFrame(ctx2d, analyser, freqData, timeData, canvas, style, options = {}) {
  const w = canvas.width;
  const h = canvas.height;
  const rgb = vizRgb(options.color || '#ffffff');
  const rainbow = options.rainbow === true;
  const hueBase = (options.now || 0) * 0.045;
  const minSide = Math.min(w, h);

  if (style === 'wave' && timeData) {
    analyser.getByteTimeDomainData(timeData);
    const mid = h * 0.5;
    const amp = h * 0.28;
    const step = Math.max(1, Math.floor(timeData.length / Math.max(80, w / 3)));
    ctx2d.lineJoin = 'round';
    ctx2d.lineCap = 'round';

    const points = [];
    for (let i = 0; i < timeData.length; i += step) {
      points.push({
        x: (i / (timeData.length - 1)) * w,
        y: mid + ((timeData[i] - 128) / 128) * amp,
      });
    }

    const trace = (offsetY, widthScale, alpha) => {
      ctx2d.beginPath();
      points.forEach((pt, i) => {
        const y = pt.y + offsetY;
        if (i === 0) ctx2d.moveTo(pt.x, y);
        else ctx2d.lineTo(pt.x, y);
      });
      ctx2d.strokeStyle = vizRgba(rgb, alpha, rainbow, hueBase + offsetY * 0.2);
      ctx2d.lineWidth = Math.max(2.2, minSide * 0.006 * widthScale);
      ctx2d.stroke();
    };

    const fill = ctx2d.createLinearGradient(0, mid - amp, 0, mid + amp);
    fill.addColorStop(0, vizRgba(rgb, 0, rainbow, hueBase));
    fill.addColorStop(0.5, vizRgba(rgb, 0.22, rainbow, hueBase + 40));
    fill.addColorStop(1, vizRgba(rgb, 0, rainbow, hueBase + 80));
    ctx2d.beginPath();
    ctx2d.moveTo(0, mid);
    points.forEach((pt) => ctx2d.lineTo(pt.x, pt.y));
    ctx2d.lineTo(w, mid);
    ctx2d.closePath();
    ctx2d.fillStyle = fill;
    ctx2d.fill();

    ctx2d.shadowColor = vizRgba(rgb, 0.55, rainbow, hueBase);
    ctx2d.shadowBlur = Math.max(12, minSide * 0.035);
    trace(0, 1, 0.92);
    ctx2d.shadowBlur = 0;
    trace(0, 0.42, 0.35);
    ctx2d.globalAlpha = 0.38;
    trace(h * 0.08, 0.7, 0.45);
    ctx2d.globalAlpha = 1;
    return;
  }

  analyser.getByteFrequencyData(freqData);

  if (style === 'ring') {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const bass = vizEnergy(freqData, 0, 8);
    const mid = vizEnergy(freqData, 8, 28);
    const high = vizEnergy(freqData, 28, 72);
    const baseR = minSide * (0.16 + bass * 0.05);
    const spikes = 96;
    const inner = baseR * 0.62;
    const outerMax = baseR + minSide * 0.22;

    const glow = ctx2d.createRadialGradient(cx, cy, inner * 0.2, cx, cy, outerMax);
    glow.addColorStop(0, vizRgba(rgb, 0.18 + bass * 0.22, rainbow, hueBase));
    glow.addColorStop(0.55, vizRgba(rgb, 0.06, rainbow, hueBase + 80));
    glow.addColorStop(1, vizRgba(rgb, 0, rainbow, hueBase + 140));
    ctx2d.fillStyle = glow;
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, outerMax, 0, Math.PI * 2);
    ctx2d.fill();

    ctx2d.save();
    ctx2d.translate(cx, cy);
    for (let i = 0; i < spikes; i += 1) {
      const t = i / spikes;
      const idx = Math.floor(Math.pow(t, 0.72) * (freqData.length - 1));
      const sample = (freqData[idx] || 0) / 255;
      const len = inner + sample * (outerMax - inner);
      const a0 = t * Math.PI * 2;
      const a1 = a0 + (Math.PI * 2) / spikes * 0.62;
      ctx2d.beginPath();
      ctx2d.moveTo(Math.cos(a0) * inner, Math.sin(a0) * inner);
      ctx2d.lineTo(Math.cos(a0) * len, Math.sin(a0) * len);
      ctx2d.lineTo(Math.cos(a1) * len, Math.sin(a1) * len);
      ctx2d.lineTo(Math.cos(a1) * inner, Math.sin(a1) * inner);
      ctx2d.closePath();
      ctx2d.fillStyle = vizRgba(rgb, 0.18 + sample * 0.72, rainbow, hueBase + t * 360);
      ctx2d.fill();
    }
    ctx2d.restore();

    const rings = [
      { r: baseR * (0.92 + mid * 0.08), w: 2.4 + mid * 6, a: 0.55 + mid * 0.3, hue: 0 },
      { r: baseR * (1.18 + high * 0.12), w: 1.4 + high * 4, a: 0.28 + high * 0.35, hue: 90 },
      { r: inner * (0.7 + bass * 0.2), w: 3 + bass * 8, a: 0.4 + bass * 0.4, hue: 180 },
    ];
    rings.forEach((ring) => {
      ctx2d.beginPath();
      ctx2d.strokeStyle = vizRgba(rgb, ring.a, rainbow, hueBase + ring.hue);
      ctx2d.lineWidth = ring.w;
      ctx2d.shadowColor = vizRgba(rgb, 0.45, rainbow, hueBase + ring.hue);
      ctx2d.shadowBlur = 18;
      ctx2d.arc(cx, cy, ring.r, 0, Math.PI * 2);
      ctx2d.stroke();
    });
    ctx2d.shadowBlur = 0;

    ctx2d.beginPath();
    ctx2d.fillStyle = vizRgba(rgb, 0.12 + bass * 0.35, rainbow, hueBase + 40);
    ctx2d.arc(cx, cy, inner * 0.45 * (0.85 + bass * 0.4), 0, Math.PI * 2);
    ctx2d.fill();
    return;
  }

  const bars = 56;
  const pad = w * 0.04;
  const gap = (w - pad * 2) * 0.008;
  const barW = ((w - pad * 2) - gap * (bars - 1)) / bars;
  const mid = h * 0.5;
  const maxH = h * 0.38;
  for (let i = 0; i < bars; i += 1) {
    const t = i / (bars - 1);
    const idx = Math.floor(Math.pow(t, 0.78) * (freqData.length - 1));
    const sample = (freqData[idx] || 0) / 255;
    const hgt = Math.max(4, sample * maxH);
    const x = pad + i * (barW + gap);
    const hue = hueBase + t * 320;
    ctx2d.fillStyle = vizRgba(rgb, 0.22 + sample * 0.7, rainbow, hue);
    ctx2d.shadowColor = vizRgba(rgb, 0.4, rainbow, hue);
    ctx2d.shadowBlur = 10;
    const radius = Math.min(barW * 0.45, 8);
    const top = mid - hgt;
    const height = hgt * 1.72;
    ctx2d.beginPath();
    if (typeof ctx2d.roundRect === 'function') {
      ctx2d.roundRect(x, top, Math.max(1.5, barW), height, radius);
    } else {
      ctx2d.rect(x, top, Math.max(1.5, barW), height);
    }
    ctx2d.fill();
  }
  ctx2d.shadowBlur = 0;
}

function fitCursorImage(src, size) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(src);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const scale = Math.min(size / img.width, size / img.height, 1);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

function bindMusicVisualizer(audio, canvas, widget) {
  if (canvas.dataset.vizBound) return;
  canvas.dataset.vizBound = '1';

  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) return;

  let analyser = null;
  let freqData = null;
  let timeData = null;
  let raf = 0;

  const sizeCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nextW = Math.max(1, Math.floor(rect.width * dpr));
    const nextH = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== nextW || canvas.height !== nextH) {
      canvas.width = nextW;
      canvas.height = nextH;
    }
  };

  const connect = () => {
    if (analyser || audio.dataset.vizNode) return analyser;
    const audioCtx = getVisualizerContext();
    if (!audioCtx) return null;
    if (/^https?:/i.test(audio.src)) audio.crossOrigin = 'anonymous';
    try {
      const source = audioCtx.createMediaElementSource(audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.74;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      audio.dataset.vizNode = '1';
      freqData = new Uint8Array(analyser.frequencyBinCount);
      timeData = new Uint8Array(analyser.fftSize);
    } catch {
      analyser = null;
    }
    return analyser;
  };

  const draw = () => {
    if (!canvas.isConnected) {
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(draw);
    sizeCanvas();
    const playing = !audio.paused && !audio.ended;
    widget.classList.toggle('has-viz', playing);
    canvas.classList.toggle('is-on', playing);
    if (!playing || !analyser || !freqData) {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    drawVisualizerFrame(ctx2d, analyser, freqData, timeData, canvas, canvas.dataset.vizStyle || 'wave', {
      color: canvas.dataset.vizColor || '#ffffff',
      rainbow: canvas.dataset.vizRainbow === '1',
      now: performance.now(),
    });
  };

  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  const kick = () => {
    const audioCtx = getVisualizerContext();
    audioCtx?.resume?.();
    connect();
    if (!raf) draw();
  };

  audio.addEventListener('play', kick);
  if (!audio.paused) kick();
}

function fitNameToCard(el) {
  el.style.transform = 'none';
  const box = el.closest('.vcard-glass') || el.parentElement;
  if (!box) return;
  const max = box.clientWidth - 40;
  const width = el.scrollWidth;
  if (max > 0 && width > max) {
    el.style.transform = `scale(${max / width})`;
    el.style.transformOrigin = 'center top';
  }
}

function startNameScramble(el) {
  const letters = [...el.querySelectorAll('.nfx-letter')];
  if (!letters.length) return;
  const original = letters.map((node) => node.textContent);
  const pool = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let frame = 0;

  const glyph = (i) => (original[i] === ' ' ? '\u00a0' : original[i]);

  const fitGlyph = (node) => {
    node.style.transform = 'none';
    const slot = node.offsetWidth;
    if (!slot) return;
    const need = node.scrollWidth;
    node.style.transform = need > slot + 0.5 ? `scale(${slot / need})` : '';
  };

  const lockLetterSlots = () => {
    el.style.transform = '';
    letters.forEach((node, i) => {
      node.style.width = 'auto';
      node.style.transform = 'none';
      node.textContent = glyph(i);
    });
    void el.offsetWidth;
    letters.forEach((node, i) => {
      node.textContent = glyph(i);
      node.style.width = `${node.offsetWidth}px`;
    });
    fitNameToCard(el);
  };

  const tick = () => {
    if (!el.isConnected) return;
    letters.forEach((node, i) => {
      const lockAt = 18 + i * 4;
      if (frame < lockAt) {
        node.textContent = pool[Math.floor(Math.random() * pool.length)];
        fitGlyph(node);
      } else {
        node.textContent = glyph(i);
        node.style.transform = 'none';
      }
    });
    frame += 1;
    if (frame < 18 + letters.length * 4 + 8) {
      setTimeout(tick, 42);
    } else {
      setTimeout(() => {
        frame = 0;
        tick();
      }, 2600);
    }
  };

  lockLetterSlots();
  requestAnimationFrame(() => {
    if (!el.isConnected) return;
    lockLetterSlots();
    tick();
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (el.isConnected) lockLetterSlots();
    });
  }
}

function buildCursorImage(preset, color) {
  const fill = color || '#ffffff';
  const svgs = {
    dot: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="5" fill="${fill}"/></svg>`,
    crosshair: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="${fill}" stroke-width="1.6"><circle cx="12" cy="12" r="5.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>`,
    sparkle: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path fill="${fill}" d="M12 2l1.6 7.4L21 11l-7.4 1.6L12 20l-1.6-7.4L3 11l7.4-1.6z"/></svg>`,
    ring: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"><circle cx="12" cy="12" r="8" stroke="${fill}" stroke-width="1.6"/></svg>`,
  };
  const svg = svgs[preset];
  if (!svg) return '';
  const hotspot = preset === 'dot' ? '10 10' : '12 12';
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot}, auto`;
}

function spawnClickEffect(vcard, effect, event) {
  const rect = vcard.getBoundingClientRect();
  const fx = document.createElement('span');
  fx.className = `clickfx clickfx-${effect}`;
  fx.style.left = `${event.clientX - rect.left}px`;
  fx.style.top = `${event.clientY - rect.top}px`;

  if (effect === 'pixel') {
    const count = CLICK_FX_PARTICLES.pixel;
    for (let i = 0; i < count; i += 1) {
      const particle = document.createElement('span');
      const size = 3 + Math.floor(Math.random() * 4);
      particle.className = 'clickfx-pixel';
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
      particle.style.setProperty('--fx-angle', `${Math.random() * 360}deg`);
      particle.style.setProperty('--fx-dist', `${24 + Math.random() * 52}px`);
      particle.style.animationDuration = `${1.15 + Math.random() * 0.75}s`;
      particle.style.animationDelay = `${Math.random() * 0.08}s`;
      fx.appendChild(particle);
    }
  } else {
    const count = CLICK_FX_PARTICLES[effect] || 0;
    for (let i = 0; i < count; i += 1) {
      const particle = document.createElement('span');
      particle.className = 'clickfx-particle';
      particle.style.setProperty('--fx-angle', `${(360 / count) * i + (i % 2) * 12}deg`);
      particle.style.setProperty('--fx-dist', `${16 + (i % 4) * 10}px`);
      fx.appendChild(particle);
    }
  }

  vcard.appendChild(fx);
  setTimeout(() => fx.remove(), CLICK_FX_LIFETIME[effect] || 900);
}

function renderBgEffectHTML(profile) {
  const p = normalizeProfile(profile);
  const from = p.bg_gradient_from || '#262626';
  const to = p.bg_gradient_to || p.bg_color || '#000000';

  if (p.bg_effect === 'gradient-flow') {
    return `<div class="fx-gradient-flow" style="--fx-from:${escapeHtml(from)};--fx-to:${escapeHtml(to)}"></div>`;
  }

  if (p.bg_effect === 'aurora') {
    return `<div class="fx-aurora" style="--fx-from:${escapeHtml(from)};--fx-to:${escapeHtml(to)}"></div>`;
  }

  if (p.bg_effect === 'leaves') {
    const leaves = Array.from({ length: 20 }, (_, i) => {
      const left = (i * 47 + 9) % 100;
      const delay = (i * 0.71) % 11;
      const duration = 7.5 + (i % 6);
      const size = 9 + (i % 5) * 2;
      const sway = 16 + (i % 7) * 5;
      const rot = 140 + (i % 5) * 50;
      return `<span class="fx-leaf" style="left:${left}%;width:${size}px;height:${Math.round(size * 1.4)}px;--fx-sway:${sway}px;--fx-spin:${rot}deg;animation-duration:${duration}s;animation-delay:-${delay}s"></span>`;
    }).join('');
    return `<div class="fx-leaves">${leaves}</div>`;
  }

  if (p.bg_effect === 'snow') {
    const flakes = Array.from({ length: 38 }, (_, i) => {
      const left = (i * 29 + 4) % 100;
      const delay = (i * 0.43) % 10;
      const duration = 6 + (i % 8) * 0.7;
      const size = 2 + (i % 4);
      const sway = 10 + (i % 6) * 4;
      return `<span class="fx-flake" style="left:${left}%;width:${size}px;height:${size}px;--fx-sway:${sway}px;animation-duration:${duration}s;animation-delay:-${delay}s"></span>`;
    }).join('');
    return `<div class="fx-snow">${flakes}</div>`;
  }

  if (p.bg_effect === 'stars') {
    return '<div class="fx-constellation"><canvas class="fx-constellation-canvas"></canvas></div>';
  }

  if (p.bg_effect === 'grid') {
    return '<div class="fx-grid"><span class="fx-grid-lines" aria-hidden="true"></span><span class="fx-grid-spot"></span></div>';
  }

  if (p.bg_effect === 'rays') {
    return '<div class="fx-rays"></div>';
  }

  if (p.bg_effect === 'scanlines') {
    return '<div class="fx-scanlines"></div>';
  }

  if (p.bg_effect === 'pulse') {
    const rings = [0, 1.5, 3, 4.5]
      .map((delay) => `<span class="fx-pulse-ring" style="animation-delay:-${delay}s"></span>`)
      .join('');
    return `<div class="fx-pulse">${rings}</div>`;
  }

  return '';
}

function overlayParticleCount(density) {
  if (density === 'sparse') return 10;
  if (density === 'dense') return 36;
  return 20;
}

function overlayDurationScale(speed) {
  if (speed === 'slow') return 1.65;
  if (speed === 'fast') return 0.55;
  return 1;
}

function overlaySizeRange(size) {
  if (size === 'sm') return [10, 4];
  if (size === 'lg') return [22, 8];
  return [14, 5];
}

function renderCustomOverlayHTML(url, profile) {
  if (!url) return '';
  const safe = escapeHtml(url);
  const count = overlayParticleCount(profile?.overlay_density);
  const scale = overlayDurationScale(profile?.overlay_speed);
  const [base, step] = overlaySizeRange(profile?.overlay_size);
  const items = Array.from({ length: count }, (_, i) => {
    const left = (i * 37 + 5) % 100;
    const delay = (i * 0.63) % 9;
    const duration = (8 + (i % 6)) * scale;
    const size = base + (i % 5) * step;
    const drift = ((i % 5) - 2) * 14;
    return `<span class="fx-custom-dot" style="left:${left}%;width:${size}px;height:${size}px;--fx-drift:${drift}px;animation-duration:${duration}s;animation-delay:-${delay}s;background-image:url('${safe}')"></span>`;
  }).join('');
  return `<div class="fx-custom-particles">${items}</div>`;
}

function renderMusicWidgetHTML(profile) {
  const p = normalizeProfile(profile);
  if (!p.music_url) return '';

  const title = p.music_title || 'Моя музыка';
  const compact = p.music_compact === true;
  const volumePct = Math.round(readMusicVolume() * 100);

  const volume = `
      <label class="music-widget-volume">
        <input class="music-widget-volume-input" type="range" min="0" max="100" step="1"
          value="${volumePct}" aria-label="Громкость">
      </label>`;

  const info = compact ? '' : `
      <div class="music-widget-info">
        <span class="music-widget-title">${escapeHtml(title)}</span>
        <div class="music-widget-progress"><div class="music-widget-bar"></div></div>
        ${volume}
      </div>`;

  return `
    <div class="vcard-music-widget${compact ? ' is-compact' : ''}" style="--music-vol:${volumePct}%">
      <button type="button" class="music-widget-btn" aria-label="Выключить звук"
        title="${escapeHtml(title)}">
        <svg class="music-icon-on" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/>
          <path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>
        </svg>
        <svg class="music-icon-off hidden" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/>
          <line x1="16" y1="9" x2="22" y2="15"/><line x1="22" y1="9" x2="16" y2="15"/>
        </svg>
      </button>${info}${compact ? volume : ''}
      <audio class="music-widget-audio" src="${escapeHtml(p.music_url)}" preload="metadata" loop></audio>
    </div>
  `;
}

function setProfileMeta(profile) {
  const p = normalizeProfile(profile);
  const displayName = p.display_name || p.username || 'Art Star';
  const title = `${displayName} (@${p.username}) — Art Star`;
  const description = p.bio || `Персональная визитка ${displayName} на Art Star`;
  const image = p.avatar_url || p.banner_url || '';

  document.title = title;
  setMetaTag('description', description);
  setMetaTag('og:title', title, 'property');
  setMetaTag('og:description', description, 'property');
  setMetaTag('og:type', 'profile', 'property');
  setMetaTag('og:site_name', 'Art Star', 'property');
  if (image) setMetaTag('og:image', image, 'property');
  setMetaTag('twitter:card', 'summary_large_image');
  setMetaTag('twitter:title', title);
  setMetaTag('twitter:description', description);
  if (image) setMetaTag('twitter:image', image);
}

function setMetaTag(name, content, attr = 'name') {
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function renderPresetGrid(containerId, presets, selectedId, onSelect, lockKind) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = presets.map((preset) => {
    const locked = lockKind && typeof Premium !== 'undefined' && Premium.isLocked(lockKind, preset.id);
    return `
    <button type="button" class="preset-option${preset.id === selectedId ? ' active' : ''}${locked ? ' preset-option--locked' : ''}"
      data-value="${preset.id}" aria-pressed="${preset.id === selectedId}">
      ${preset.icon ? `<span class="preset-option-icon">${preset.icon}</span>` : ''}
      ${escapeHtml(preset.name)}
      ${locked ? '<span class="preset-option-lock">Star+</span>' : ''}
    </button>`;
  }).join('');

  container.querySelectorAll('.preset-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (lockKind && typeof Premium !== 'undefined' && Premium.isLocked(lockKind, btn.dataset.value)) {
        Premium.require('Доступно в Star+');
        return;
      }
      container.querySelectorAll('.preset-option').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      onSelect(btn.dataset.value);
    });
  });
}

window.CURSOR_PRESETS = CURSOR_PRESETS;
window.CLICK_EFFECTS = CLICK_EFFECTS;
window.BG_EFFECTS = BG_EFFECTS;
window.BG_TYPES = BG_TYPES;
window.NAME_EFFECTS = NAME_EFFECTS;
window.VISUALIZER_STYLES = VISUALIZER_STYLES;
window.OVERLAY_DENSITY = OVERLAY_DENSITY;
window.OVERLAY_SPEED = OVERLAY_SPEED;
window.OVERLAY_SIZE = OVERLAY_SIZE;
window.ProfileEffects = ProfileEffects;
window.renderBgEffectHTML = renderBgEffectHTML;
window.renderCustomOverlayHTML = renderCustomOverlayHTML;
window.renderMusicWidgetHTML = renderMusicWidgetHTML;
window.setProfileMeta = setProfileMeta;
window.renderPresetGrid = renderPresetGrid;
