const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

function shareVanityUrl(username) {
  if (typeof siteVanityLabel === 'function') return siteVanityLabel(username);
  return `${(window.location && window.location.host) || 'artstar'}/${username || 'username'}`;
}

function shareProfileUrl(username) {
  if (typeof siteProfileHref === 'function') return siteProfileHref(username);
  return new URL(`/${encodeURIComponent(username || '')}`, window.location.href).href;
}

const SHARE_TARGETS = [
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈',
    build: (url, text) => `https://t.me/share/url?url=${url}&text=${text}`,
  },
  {
    id: 'vk',
    name: 'VK',
    icon: 'VK',
    build: (url, text) => `https://vk.com/share.php?url=${url}&title=${text}`,
  },
  {
    id: 'twitter',
    name: 'X',
    icon: '𝕏',
    build: (url, text) => `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '◍',
    build: (url, text) => `https://wa.me/?text=${text}%20${url}`,
  },
];

function openShareModal(profile) {
  const p = normalizeProfile(profile);
  const url = shareProfileUrl(p.username);
  const name = p.display_name || p.username || 'Моя карточка';
  const shareText = `${name} — визитка на Art Star`;

  const qr = typeof qrToSvg === 'function' ? qrToSvg(url, { level: 'M', quiet: 2 }) : '';
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText);

  const socials = SHARE_TARGETS.map((target) => `
    <a class="share-social" href="${target.build(encodedUrl, encodedText)}"
      target="_blank" rel="noopener noreferrer">
      <span class="share-social-icon">${target.icon}</span>
      ${escapeHtml(target.name)}
    </a>
  `).join('');

  const body = `
    <div class="share-grid">
      <div class="share-qr-col">
        <div class="share-qr">${qr || '<p class="form-hint">Ссылка слишком длинная для QR</p>'}</div>
        <button type="button" class="btn btn-ghost btn-sm" id="share-qr-download">Скачать QR</button>
      </div>

      <div class="share-main">
        <label class="form-label" for="share-url">Ссылка на карточку</label>
        <div class="share-link-row">
          <input class="form-input" type="text" id="share-url" value="${escapeHtml(url)}" readonly>
          <button type="button" class="btn btn-secondary btn-sm" id="share-copy">Копировать</button>
        </div>
        <p class="form-hint">Короткая ссылка: <code class="inline-code">${escapeHtml(shareVanityUrl(p.username))}</code></p>

        <div class="share-actions">
          <button type="button" class="btn btn-primary btn-sm hidden" id="share-native">Поделиться</button>
          <button type="button" class="btn btn-secondary btn-sm" id="share-image-download" disabled>Готовим картинку…</button>
        </div>

        <p class="form-label share-socials-label">Отправить</p>
        <div class="share-socials">${socials}</div>
      </div>
    </div>

    <div class="share-preview">
      <p class="form-hint">Изображение для публикации: аватар, имя и QR-код</p>
      <div class="share-preview-holder" id="share-preview"></div>
      ${typeof Premium !== 'undefined' && Premium.isActive(p.username) ? `
      <div class="share-bg">
        <div class="share-bg-thumb" id="share-bg-thumb" aria-hidden="true"></div>
        <label class="btn btn-secondary btn-sm" for="share-bg-file">Фон картинки</label>
        <input class="share-bg-file" type="file" id="share-bg-file" accept="image/*">
        <button type="button" class="btn btn-ghost btn-sm hidden" id="share-bg-clear">Убрать фон</button>
      </div>` : `
      <div class="share-bg share-bg--locked">
        <p class="share-bg-lock">Собственный фон изображения доступен в Star+</p>
        <a href="premium.html" class="btn btn-primary btn-sm">Оформить Star+</a>
      </div>`}
    </div>
  `;

  openModal({
    title: 'Поделиться карточкой',
    subtitle: 'QR-код, ссылка и изображение для публикации',
    className: 'modal--share',
    body,
    onMount: (dialog) => initShareModal(dialog, p, url, shareText),
  });
}

function initShareModal(dialog, profile, url, shareText) {
  const urlInput = dialog.querySelector('#share-url');

  dialog.querySelector('#share-copy')?.addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    try {
      await navigator.clipboard.writeText(url);
    } catch {

      urlInput?.select();
      showToast('Необходимо скопировать ссылку вручную', 'error');
      return;
    }
    btn.textContent = 'Скопировано';
    btn.classList.add('is-copied');
    setTimeout(() => {
      btn.textContent = 'Копировать';
      btn.classList.remove('is-copied');
    }, 1600);
  });

  const nativeBtn = dialog.querySelector('#share-native');
  if (navigator.share && nativeBtn) {
    nativeBtn.classList.remove('hidden');
    nativeBtn.addEventListener('click', () => {
      navigator.share({ title: shareText, text: shareText, url }).catch(() => {});
    });
  }

  dialog.querySelector('#share-qr-download')?.addEventListener('click', () => {
    const canvas = typeof qrToCanvas === 'function'
      ? qrToCanvas(url, { level: 'M', scale: 12, quiet: 3 })
      : null;
    if (!canvas) {
      showToast('Не удалось сформировать QR-код: ссылка слишком длинная', 'error');
      return;
    }
    downloadCanvas(canvas, `vibecard-qr-${profile.username || 'card'}.png`);
  });

  const holder = dialog.querySelector('#share-preview');
  const imageBtn = dialog.querySelector('#share-image-download');
  const bgThumb = dialog.querySelector('#share-bg-thumb');
  const bgClear = dialog.querySelector('#share-bg-clear');
  const bgFile = dialog.querySelector('#share-bg-file');
  let downloadHandler = null;

  const syncBgUi = () => {
    const hasBg = Boolean(profile.share_bg_url);
    bgThumb?.classList.toggle('is-filled', hasBg);
    if (bgThumb) {
      bgThumb.style.backgroundImage = hasBg ? `url(${JSON.stringify(profile.share_bg_url)})` : '';
    }
    bgClear?.classList.toggle('hidden', !hasBg);
  };

  const paintShare = () => {
    if (imageBtn) {
      imageBtn.disabled = true;
      imageBtn.textContent = 'Готовим картинку…';
    }
    drawShareImage(profile, url).then((canvas) => {
      if (!canvas || !imageBtn) return;
      canvas.className = 'share-preview-canvas';
      holder?.replaceChildren(canvas);
      imageBtn.disabled = false;
      imageBtn.textContent = 'Скачать картинку';
      if (downloadHandler) imageBtn.removeEventListener('click', downloadHandler);
      downloadHandler = () => downloadCanvas(canvas, `vibecard-${profile.username || 'card'}.png`);
      imageBtn.addEventListener('click', downloadHandler);
    });
  };

  const persistShareBg = (value) => {
    if (typeof Premium !== 'undefined' && !Premium.require('Собственный фон изображения доступен в Star+')) return;
    profile.share_bg_url = value;
    if (typeof ProfileEditorStore !== 'undefined') {
      ProfileEditorStore.setField('share_bg_url', value);
    } else if (typeof ProfileStore !== 'undefined' && profile.username) {
      const saved = ProfileStore.get(profile.username);
      if (saved) ProfileStore.save(profile.username, { ...saved, share_bg_url: value });
    }
    syncBgUi();
    paintShare();
  };

  bgFile?.addEventListener('change', async () => {
    const file = bgFile.files?.[0];
    bgFile.value = '';
    if (!file) return;
    try {
      persistShareBg(await readShareBgFile(file));
    } catch (err) {
      showToast(err.message || 'Не удалось загрузить фон', 'error');
    }
  });

  bgClear?.addEventListener('click', () => persistShareBg(''));

  syncBgUi();
  paintShare();
}

function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) {
      showToast('Не удалось сохранить картинку', 'error');
      return;
    }

    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(href);
    }, 1000);

    showToast('Картинка скачана');
  }, 'image/png');
}

function readShareBgFile(file) {
  if (typeof compressImageFile === 'function') return compressImageFile(file, 'background');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

function loadImageSafe(src) {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
}

async function drawShareImage(profile, url) {
  const p = normalizeProfile(profile);
  const { width, height } = SHARE_IMAGE_SIZE;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (p.bg_type === 'gradient') {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, p.bg_gradient_from || '#1a1a1a');
    gradient.addColorStop(1, p.bg_gradient_to || '#000000');
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = p.bg_color || '#000000';
  }
  ctx.fillRect(0, 0, width, height);

  const shareBg = await loadImageSafe(p.share_bg_url);
  if (shareBg) {
    const scale = Math.max(width / shareBg.width, height / shareBg.height);
    const w = shareBg.width * scale;
    const h = shareBg.height * scale;
    ctx.drawImage(shareBg, (width - w) / 2, (height - h) / 2, w, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(0, 0, width, height);
  } else if (p.bg_type === 'image') {
    const bg = await loadImageSafe(p.bg_image_url || p.banner_url);
    if (bg) {
      const scale = Math.max(width / bg.width, height / bg.height);
      const w = bg.width * scale;
      const h = bg.height * scale;
      ctx.drawImage(bg, (width - w) / 2, (height - h) / 2, w, h);
    }
  }

  const panel = { x: 64, y: 64, w: width - 128, h: height - 128 };
  const opacity = Math.max(0.35, (p.card_opacity ?? 55) / 100);
  ctx.fillStyle = `rgba(10, 10, 10, ${opacity.toFixed(3)})`;
  roundedRectPath(ctx, panel.x, panel.y, panel.w, panel.h, 36);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const left = panel.x + 56;
  const avatarSize = 148;
  const avatarY = panel.y + 64;

  const avatar = await loadImageSafe(p.avatar_url);
  ctx.save();
  ctx.beginPath();
  ctx.arc(left + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (avatar) {
    const scale = Math.max(avatarSize / avatar.width, avatarSize / avatar.height);
    const w = avatar.width * scale;
    const h = avatar.height * scale;
    ctx.drawImage(avatar, left + (avatarSize - w) / 2, avatarY + (avatarSize - h) / 2, w, h);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(left, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = '#000000';
    ctx.font = '700 72px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const letter = (p.display_name || p.username || '?').charAt(0).toUpperCase();
    ctx.fillText(letter, left + avatarSize / 2, avatarY + avatarSize / 2 + 4);
  }
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const textWidth = panel.w - 112 - 260;
  const name = p.display_name || p.username || 'Имя';

  const fontName = typeof profileFontFamily === 'function'
    ? profileFontFamily(p)
    : (p.name_font || 'Inter');
  if (p.custom_font_url && typeof loadCustomFont === 'function') {
    await loadCustomFont(p.custom_font_url);
  }
  const nameFont = `700 64px "${fontName}", Inter, sans-serif`;
  if (document.fonts?.load) {
    await document.fonts.load(nameFont).catch(() => {});
  }

  let cursorY = avatarY + avatarSize + 78;
  ctx.font = nameFont;
  ctx.fillStyle = p.name_color || '#ffffff';
  ctx.fillText(fitText(ctx, name, textWidth), left, cursorY);

  cursorY += 44;
  ctx.font = '500 30px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  const uname = `@${p.username || 'username'}`;
  const isPro = typeof Premium !== 'undefined' && Premium.isActive(p.username);
  const isVerified = typeof Verified !== 'undefined' && Verified.isActive(p.username);
  const isDeveloper = typeof Developer !== 'undefined' && Developer.isActive(p.username);
  let nameX = left;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  if (isPro) {
    const star = 36;
    const starY = cursorY - 26;
    ctx.fillStyle = '#ffffff';
    roundedRectPath(ctx, nameX, starY, star, star, 8);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = '700 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', nameX + star / 2, starY + star / 2 + 1);
    nameX += star + 12;
  }
  if (isVerified) {
    const mark = 36;
    const markY = cursorY - 26;
    ctx.fillStyle = '#ffffff';
    roundedRectPath(ctx, nameX, markY, mark, mark, 8);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(nameX + 10.2, markY + 18.1);
    ctx.lineTo(nameX + 16.1, markY + 23.8);
    ctx.lineTo(nameX + 25.9, markY + 12);
    ctx.stroke();
    nameX += mark + 12;
  }
  if (isDeveloper) {
    const gear = 36;
    const gearY = cursorY - 26;
    ctx.fillStyle = '#111111';
    roundedRectPath(ctx, nameX, gearY, gear, gear, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.save();
    ctx.translate(nameX + gear / 2, gearY + gear / 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.arc(0, 0, 5.2, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 7.2, Math.sin(a) * 7.2);
      ctx.lineTo(Math.cos(a) * 11.2, Math.sin(a) * 11.2);
      ctx.stroke();
    }
    ctx.restore();
    nameX += gear + 12;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '500 30px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillText(fitText(ctx, uname, textWidth - (nameX - left)), nameX, cursorY);

  if (p.bio) {
    cursorY += 50;
    ctx.font = '400 28px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.fillText(fitText(ctx, p.bio, textWidth), left, cursorY);
  }

  const badges = (typeof decorateProfileBadges === 'function'
    ? decorateProfileBadges(p, p.badges)
    : (typeof Premium !== 'undefined' ? Premium.decorateBadges(p, p.badges) : (p.badges || [])))
    .filter((badge) => badge.text)
    .slice(0, 6);
  if (badges.length) {
    let badgeX = left;
    let badgeY = cursorY + 56;
    const rowHeight = 56;
    const maxBadgeX = left + textWidth;
    ctx.font = '600 24px Inter, sans-serif';

    badges.forEach((badge) => {
      const label = `${badge.icon ? `${badge.icon} ` : ''}${badge.text}`;
      const pillWidth = Math.min(ctx.measureText(label).width + 40, textWidth);

      if (badgeX > left && badgeX + pillWidth > maxBadgeX) {
        badgeX = left;
        badgeY += rowHeight;
      }

      const official = Boolean(badge.official);
      const kind = badge.kind || '';
      ctx.save();
      if (official && kind === 'developer') {
        ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#161616';
        roundedRectPath(ctx, badgeX, badgeY - 26, pillWidth, 44, 22);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
        ctx.lineWidth = 1.4;
        roundedRectPath(ctx, badgeX, badgeY - 26, pillWidth, 44, 22);
        ctx.stroke();
        ctx.fillStyle = '#f3f3f3';
      } else if (official) {
        ctx.shadowColor = 'rgba(255, 255, 255, 0.72)';
        ctx.shadowBlur = 22;
        ctx.fillStyle = '#ffffff';
        roundedRectPath(ctx, badgeX, badgeY - 26, pillWidth, 44, 22);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#000000';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        roundedRectPath(ctx, badgeX, badgeY - 26, pillWidth, 44, 22);
        ctx.fill();
        ctx.strokeStyle = badge.color || 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = badge.color || '#ffffff';
      }

      ctx.fillText(label, badgeX + 20, badgeY + 2);
      badgeX += pillWidth + 12;
    });
  }

  const qrCanvas = typeof qrToCanvas === 'function'
    ? qrToCanvas(url, { level: 'M', scale: 6, quiet: 2 })
    : null;

  if (qrCanvas) {
    const box = 210;
    const boxX = panel.x + panel.w - box - 56;
    const boxY = panel.y + panel.h - box - 56;

    ctx.fillStyle = '#ffffff';
    roundedRectPath(ctx, boxX, boxY, box, box, 20);
    ctx.fill();
    ctx.drawImage(qrCanvas, boxX + 10, boxY + 10, box - 20, box - 20);

    ctx.font = '600 24px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'right';
    ctx.fillText(fitText(ctx, shareVanityUrl(p.username), box + 180), boxX + box, boxY - 22);
    ctx.textAlign = 'left';
  }

  ctx.font = '700 26px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.textAlign = 'right';
  ctx.fillText('Art Star', panel.x + panel.w - 56, panel.y + 52);
  ctx.textAlign = 'left';

  return canvas;
}

window.openShareModal = openShareModal;
window.shareProfileUrl = shareProfileUrl;
window.shareVanityUrl = shareVanityUrl;
