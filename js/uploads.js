const UPLOAD_LIMITS = {
  avatar: { maxSide: 512, quality: 0.86, maxInput: 8 * 1024 * 1024 },
  banner: { maxSide: 1280, quality: 0.84, maxInput: 12 * 1024 * 1024 },
  background: { maxSide: 1600, quality: 0.82, maxInput: 16 * 1024 * 1024 },
  post: { maxSide: 900, quality: 0.78, maxInput: 12 * 1024 * 1024 },
  cursor: { maxSide: 24, exact: 24, quality: 0.92, maxInput: 2 * 1024 * 1024 },
  overlay: { maxSide: 96, quality: 0.9, maxInput: 8 * 1024 * 1024 },
  audio: { maxInput: 30 * 1024 * 1024, label: 'Трек' },
  video: { maxInput: 200 * 1024 * 1024, label: 'Видео' },
  font: { maxInput: 4 * 1024 * 1024, label: 'Шрифт' },
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Файл не является изображением'));
    img.src = src;
  });
}

async function compressImageFile(file, kind = 'banner') {
  const cfg = UPLOAD_LIMITS[kind] || UPLOAD_LIMITS.banner;

  if (file.size > cfg.maxInput) {
    throw new Error(`Файл слишком большой (${formatBytes(file.size)}). Максимум ${formatBytes(cfg.maxInput)}`);
  }

  const original = await readFileAsDataUrl(file);

  if (file.type === 'image/gif') {
    return original;
  }

  const keepPng = kind === 'cursor' || kind === 'overlay' || file.type === 'image/png';

  const img = await loadImageElement(original);

  if (cfg.exact) {
    const canvas = document.createElement('canvas');
    canvas.width = cfg.exact;
    canvas.height = cfg.exact;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const scale = Math.min(cfg.exact / img.width, cfg.exact / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (cfg.exact - dw) / 2, (cfg.exact - dh) / 2, dw, dh);
    return canvas.toDataURL('image/png');
  }

  const scale = Math.min(1, cfg.maxSide / Math.max(img.width, img.height));

  if (scale === 1 && original.length < (keepPng ? 220 * 1024 : 400 * 1024)) {
    return original;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  if (keepPng) return canvas.toDataURL('image/png');

  const webp = canvas.toDataURL('image/webp', cfg.quality);
  if (webp.startsWith('data:image/webp')) return webp;

  return canvas.toDataURL('image/jpeg', cfg.quality);
}

function uploadLimitBytes(kind) {
  if (kind === 'audio' && typeof Premium !== 'undefined') {
    return Premium.audioLimit();
  }
  return (UPLOAD_LIMITS[kind] || UPLOAD_LIMITS.audio).maxInput;
}

async function storeMediaFile(file, kind = 'audio') {
  const cfg = UPLOAD_LIMITS[kind] || UPLOAD_LIMITS.audio;
  const maxInput = uploadLimitBytes(kind);

  if (file.size > maxInput) {
    const label = cfg.label || 'Файл';
    throw new Error(`${label} слишком большой (${formatBytes(file.size)}). Максимум ${formatBytes(maxInput)}`);
  }

  if (typeof Api !== 'undefined') {
    if (typeof Api.ensureSession === 'function') await Api.ensureSession();
    const remote = await Api.uploadMedia(file, kind);
    if (remote.ok && remote.ref) return remote.ref;
    if (!remote.offline && remote.error) throw new Error(remote.error);
  }

  if (typeof MediaStore === 'undefined') {
    return readFileAsDataUrl(file);
  }

  const key = MediaStore.makeKey(kind);
  await MediaStore.put(key, file);
  return key;
}

function initUploadField(options) {
  const { inputId, kind, onLoaded } = options;
  const input = document.getElementById(inputId);
  if (!input) return;

  const status = document.getElementById(`${inputId}-status`);
  const setStatus = (text, tone = '') => {
    if (!status) return;
    status.textContent = text;
    status.className = `upload-status${tone ? ` upload-status--${tone}` : ''}`;
  };

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;

    const gif = typeof Premium !== 'undefined' && Premium.isGifFile(file);

    if ((kind === 'avatar' || kind === 'background') && gif
      && typeof Premium !== 'undefined' && !Premium.require('GIF доступен в Star+')) {
      input.value = '';
      return;
    }

    if (kind === 'video' && typeof Premium !== 'undefined'
      && !Premium.require('Видео-фон доступен в Star+')) {
      input.value = '';
      return;
    }

    if ((kind === 'font' || kind === 'cursor' || kind === 'overlay')
      && typeof Premium !== 'undefined' && !Premium.require('Доступно в Star+')) {
      input.value = '';
      return;
    }

    if (kind === 'font' && !/\.ttf$/i.test(file.name || '') && file.type !== 'font/ttf') {
      const msg = 'Требуется файл .ttf';
      setStatus(msg, 'error');
      showToast(msg, 'error');
      input.value = '';
      return;
    }

    if ((kind === 'cursor' || kind === 'overlay') && file.type !== 'image/png'
      && !/\.png$/i.test(file.name || '')) {
      const msg = 'Требуется файл .png';
      setStatus(msg, 'error');
      showToast(msg, 'error');
      input.value = '';
      return;
    }

    if (kind === 'audio' && typeof Premium !== 'undefined'
      && file.size > Premium.AUDIO_FREE_MAX && !Premium.require('Аудиофайлы свыше 10 МБ доступны в Star+')) {
      input.value = '';
      return;
    }

    setStatus('Обработка…');

    try {
      const heavy = kind === 'audio' || kind === 'video' || kind === 'font' || gif;
      const value = heavy
        ? await storeMediaFile(file, kind)
        : await compressImageFile(file, kind);

      onLoaded(value, file);
      setStatus(`${file.name} · ${formatBytes(heavy ? file.size : value.length)}`, 'ok');
    } catch (err) {
      setStatus(err.message, 'error');
      showToast(err.message, 'error');
    } finally {
      input.value = '';
    }
  });
}

function describeSource(value) {
  if (!value) return '';

  if (typeof MediaStore !== 'undefined' && MediaStore.isRef(value)) {
    const meta = MediaStore.meta(value);
    return meta ? `${meta.name} · ${formatBytes(meta.size)}` : 'Загруженный файл';
  }

  if (value.startsWith('media:') || value.startsWith('/api/media/')) {
    return 'Файл на сервере';
  }

  if (value.startsWith('data:')) {
    const type = value.slice(5).split(/[;,]/)[0] || 'файл';
    return `Загруженный файл (${type}) · ${formatBytes(value.length)}`;
  }

  return value;
}

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:');
}

function isUploadedSource(value) {
  if (isDataUrl(value)) return true;
  return typeof MediaStore !== 'undefined' && MediaStore.isRef(value);
}

window.UPLOAD_LIMITS = UPLOAD_LIMITS;
window.uploadLimitBytes = uploadLimitBytes;
window.formatBytes = formatBytes;
window.compressImageFile = compressImageFile;
window.storeMediaFile = storeMediaFile;
window.initUploadField = initUploadField;
window.describeSource = describeSource;
window.isDataUrl = isDataUrl;
window.isUploadedSource = isUploadedSource;
