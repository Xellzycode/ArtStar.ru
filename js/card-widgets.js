const CLOCK_ZONES = [
  { id: 'Europe/Kaliningrad', name: 'Калининград' },
  { id: 'Europe/Moscow', name: 'Москва' },
  { id: 'Europe/Samara', name: 'Самара' },
  { id: 'Asia/Yekaterinburg', name: 'Екатеринбург' },
  { id: 'Asia/Omsk', name: 'Омск' },
  { id: 'Asia/Krasnoyarsk', name: 'Красноярск' },
  { id: 'Asia/Irkutsk', name: 'Иркутск' },
  { id: 'Asia/Vladivostok', name: 'Владивосток' },
  { id: 'Europe/Kyiv', name: 'Киев' },
  { id: 'Europe/Minsk', name: 'Минск' },
  { id: 'Asia/Almaty', name: 'Алматы' },
  { id: 'Europe/Berlin', name: 'Берлин' },
  { id: 'Europe/London', name: 'Лондон' },
  { id: 'America/New_York', name: 'Нью-Йорк' },
  { id: 'Asia/Tokyo', name: 'Токио' },
];

function getZoneName(tz) {
  return CLOCK_ZONES.find((z) => z.id === tz)?.name || '';
}

function formatZoneTime(tz) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz || undefined,
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  }
}

function formatCountdown(iso) {
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return '';

  const diff = target.getTime() - Date.now();
  if (diff <= 0) return 'уже началось';

  const minutes = Math.ceil(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `через ${days} дн ${hours % 24} ч`;
  if (hours > 0) return `через ${hours} ч ${minutes % 60} мин`;
  return `через ${minutes} мин`;
}

const CLOCK_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>`;
const COUNTDOWN_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h12M6 22h12M8 2v4a4 4 0 0 0 8 0V2M8 22v-4a4 4 0 0 1 8 0v4"/></svg>`;

function renderStatusHTML(profile) {
  if (!profile.widget_status) return '';

  return `
    <p class="vcard-status">
      <span class="vcard-status-dot" aria-hidden="true"></span>
      ${escapeHtml(profile.widget_status)}
    </p>
  `;
}

function renderCardWidgetsHTML(profile) {
  const chips = [];

  if (profile.widget_clock) {
    const tz = profile.widget_clock_tz || 'Europe/Moscow';
    const zoneName = getZoneName(tz);
    chips.push(`
      <span class="vcard-chip" data-clock-tz="${escapeHtml(tz)}" title="Местное время">
        ${CLOCK_ICON}
        <span data-clock-value>${escapeHtml(formatZoneTime(tz))}</span>
        ${zoneName ? `<span class="vcard-chip-muted">${escapeHtml(zoneName)}</span>` : ''}
      </span>
    `);
  }

  const countdown = profile.widget_countdown_date ? formatCountdown(profile.widget_countdown_date) : '';
  if (countdown) {
    const label = profile.widget_countdown_label || 'Событие';
    chips.push(`
      <span class="vcard-chip" data-countdown="${escapeHtml(profile.widget_countdown_date)}" title="${escapeHtml(label)}">
        ${COUNTDOWN_ICON}
        <span data-countdown-value>${escapeHtml(countdown)}</span>
        <span class="vcard-chip-muted">${escapeHtml(label)}</span>
      </span>
    `);
  }

  if (!chips.length) return '';
  return `<div class="vcard-widgets">${chips.join('')}</div>`;
}

function refreshCardWidgets() {
  document.querySelectorAll('[data-clock-tz]').forEach((chip) => {
    const value = chip.querySelector('[data-clock-value]');
    if (value) value.textContent = formatZoneTime(chip.dataset.clockTz);
  });

  document.querySelectorAll('[data-countdown]').forEach((chip) => {
    const value = chip.querySelector('[data-countdown-value]');
    if (value) value.textContent = formatCountdown(chip.dataset.countdown);
  });
}

function initCardWidgets() {
  if (window.__cardWidgetsTicker) return;
  window.__cardWidgetsTicker = setInterval(refreshCardWidgets, 1000);
}

window.CLOCK_ZONES = CLOCK_ZONES;
window.formatZoneTime = formatZoneTime;
window.formatCountdown = formatCountdown;
window.renderStatusHTML = renderStatusHTML;
window.renderCardWidgetsHTML = renderCardWidgetsHTML;
window.initCardWidgets = initCardWidgets;
