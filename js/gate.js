const ENTRY_GATE_MEDIA_KEYS = ['music_url', 'bg_video_url'];

function profileNeedsEntryGate(profile) {
  if (!profile) return false;

  const p = normalizeProfile(profile);
  return ENTRY_GATE_MEDIA_KEYS.some((key) => Boolean(p[key]));
}

function renderEntryGateHTML(profile) {
  const name = profile.display_name || profile.username || 'Art Star';
  const initial = (name.trim()[0] || 'V').toUpperCase();
  const avatar = profile.avatar_url
    ? `<img src="${escapeHtml(profile.avatar_url)}" alt="">`
    : `<span>${escapeHtml(initial)}</span>`;

  return `
    <div class="gate" id="entry-gate" role="dialog" aria-modal="true" aria-label="Подтверждение перед входом">
      <div class="gate-aura" aria-hidden="true"></div>
      <div class="gate-panel">
        <div class="gate-avatar" aria-hidden="true">${avatar}</div>
        <p class="gate-eyebrow">Карточка Art Star</p>
        <h1 class="gate-name">@${escapeHtml(profile.username || 'profile')}</h1>
        <p class="gate-text">После подтверждения карточка откроется с музыкой, видео и эффектами.</p>

        <button type="button" class="gate-check" id="gate-check" aria-pressed="false">
          <span class="gate-checkbox" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
          <span class="gate-check-label">Я не робот</span>
        </button>

        <p class="gate-hint">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/>
            <path d="M15.5 8.5a5 5 0 0 1 0 7"/>
          </svg>
          Воспроизведение отключается кнопкой на карточке
        </p>
      </div>
    </div>
  `;
}

function mountEntryGate(profile, onConfirm) {
  const host = document.createElement('div');
  host.innerHTML = renderEntryGateHTML(profile);
  const gate = host.firstElementChild;
  document.body.appendChild(gate);
  document.body.classList.add('gate-open');

  const button = gate.querySelector('#gate-check');
  let confirmed = false;

  const confirm = () => {
    if (confirmed) return;
    confirmed = true;

    button.setAttribute('aria-pressed', 'true');
    button.classList.add('is-checked');
    button.disabled = true;

    onConfirm();

    gate.classList.add('is-leaving');
    document.body.classList.remove('gate-open');
    setTimeout(() => gate.remove(), 620);
  };

  button.addEventListener('click', confirm);
  requestAnimationFrame(() => button.focus());
}

window.profileNeedsEntryGate = profileNeedsEntryGate;
window.mountEntryGate = mountEntryGate;
