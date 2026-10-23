const AMBIENT_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const AMBIENT_DEFAULTS = {
  area: 13000,
  maxDots: 110,
  linkDist: 130,
  pointerDist: 190,
  speed: 0.22,
  dotAlpha: 0.35,
  lineAlpha: 0.13,
  pointerLines: true,
  ripples: true,
  pointerTarget: null,
  shape: 'dot',
  interact: true,
  wrap: false,
};

function createConstellation(canvas, host, options = {}) {
  if (!canvas || !host) return;

  const cfg = { ...AMBIENT_DEFAULTS, ...options };
  const ctx = canvas.getContext('2d');
  const pointer = { x: -9999, y: -9999, active: false };
  const ripples = [];
  let dots = [];
  let width = 0;
  let height = 0;
  let starImg = null;

  if (cfg.starImage) {
    starImg = new Image();
    starImg.src = cfg.starImage;
  }

  function resize() {
    if (!canvas.isConnected) return;
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    const count = Math.min(cfg.maxDots, Math.round((width * height) / cfg.area));
    const star = cfg.shape === 'star';
    dots = Array.from({ length: Math.max(count, 0) }, () => {
      const speed = cfg.speed * (star ? 0.45 + Math.random() * 1.7 : 1);
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: star ? Math.cos(angle) * speed : (Math.random() - 0.5) * cfg.speed,
        vy: star ? Math.sin(angle) * speed : (Math.random() - 0.5) * cfg.speed,
        r: star ? Math.random() * 6.5 + 5 : Math.random() * 1.4 + 0.6,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.025,
      };
    });
  }

  function drawSpark(dot, alpha) {
    ctx.save();
    ctx.translate(dot.x, dot.y);
    ctx.rotate(dot.rot || 0);
    if (starImg && starImg.complete && starImg.naturalWidth) {
      const size = dot.r * 2.4;
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(starImg, -size / 2, -size / 2, size, size);
      ctx.restore();
      return;
    }
    const inner = dot.r * 0.36;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const ang = (Math.PI / 4) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? dot.r : inner;
      const px = Math.cos(ang) * rad;
      const py = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMarker(dot, alpha) {
    if (cfg.shape === 'star') {
      drawSpark(dot, alpha);
      return;
    }
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDots(alpha) {
    dots.forEach((dot) => drawMarker(dot, alpha));
  }

  function step() {
    if (!canvas.isConnected) return;
    ctx.clearRect(0, 0, width, height);

    dots.forEach((dot) => {
      dot.x += dot.vx;
      dot.y += dot.vy;
      dot.rot += dot.vr || 0;

      if (cfg.wrap) {
        if (dot.x < -8) dot.x = width + 8;
        if (dot.x > width + 8) dot.x = -8;
        if (dot.y < -8) dot.y = height + 8;
        if (dot.y > height + 8) dot.y = -8;
      } else {
        if (dot.x < 0 || dot.x > width) dot.vx *= -1;
        if (dot.y < 0 || dot.y > height) dot.vy *= -1;
      }

      if (!cfg.interact || !pointer.active) return;
      const dx = pointer.x - dot.x;
      const dy = pointer.y - dot.y;
      const dist = Math.hypot(dx, dy);
      if (dist < cfg.pointerDist && dist > 1) {
        const pull = (1 - dist / cfg.pointerDist) * 0.35;
        dot.x += (dx / dist) * pull;
        dot.y += (dy / dist) * pull;
      }
    });

    for (let i = 0; i < dots.length; i += 1) {
      for (let j = i + 1; j < dots.length; j += 1) {
        const dist = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y);
        if (dist > cfg.linkDist) continue;
        ctx.strokeStyle = `rgba(255,255,255,${(1 - dist / cfg.linkDist) * cfg.lineAlpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dots[i].x, dots[i].y);
        ctx.lineTo(dots[j].x, dots[j].y);
        ctx.stroke();
      }
    }

    dots.forEach((dot) => {
      let alpha = cfg.dotAlpha;
      if (cfg.interact && pointer.active) {
        const dist = Math.hypot(pointer.x - dot.x, pointer.y - dot.y);
        if (dist < cfg.pointerDist) {
          const near = 1 - dist / cfg.pointerDist;
          alpha = cfg.dotAlpha + near * 0.6;
          if (cfg.pointerLines) {
            ctx.strokeStyle = `rgba(255,255,255,${near * 0.22})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(dot.x, dot.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }
      drawMarker(dot, alpha);
    });

    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      const ring = ripples[i];
      ring.r += 4.5;
      ring.alpha -= 0.014;
      if (ring.alpha <= 0) {
        ripples.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = `rgba(255,255,255,${ring.alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    requestAnimationFrame(step);
  }

  if (cfg.interact) {
    const events = cfg.pointerTarget || host;

    const localPoint = (e) => {
      const rect = host.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    events.addEventListener('pointermove', (e) => {
      const { x, y } = localPoint(e);
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
    });

    events.addEventListener('pointerleave', () => {
      pointer.active = false;
    });

    if (cfg.ripples) {
      events.addEventListener('pointerdown', (e) => {
        const { x, y } = localPoint(e);
        ripples.push({ x, y, r: 0, alpha: 0.45 });
      });
    }
  }

  window.addEventListener('resize', ambientDebounce(resize, 200));
  resize();

  if (AMBIENT_REDUCED_MOTION) {
    ctx.clearRect(0, 0, width, height);
    drawDots(cfg.dotAlpha);
    return;
  }

  requestAnimationFrame(step);
}

function bindPointerGlow(selector, root = document) {
  root.querySelectorAll(selector).forEach((el) => {
    if (el.dataset.glowBound) return;
    el.dataset.glowBound = '1';
    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      el.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
  });
}

function revealOnScroll(selector, root = document) {
  const items = [...root.querySelectorAll(selector)];
  if (!items.length) return;

  if (AMBIENT_REDUCED_MOTION || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const delay = Number(entry.target.dataset.revealDelay || 0);
      setTimeout(() => entry.target.classList.add('is-visible'), delay);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });

  items.forEach((el) => observer.observe(el));
}

function ambientDebounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

window.AMBIENT_REDUCED_MOTION = AMBIENT_REDUCED_MOTION;
window.createConstellation = createConstellation;
window.bindPointerGlow = bindPointerGlow;
window.revealOnScroll = revealOnScroll;
window.ambientDebounce = ambientDebounce;
