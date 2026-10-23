const CONTACT_DISCORD = 'https://discord.gg/X48pqFt84';
const CONTACT_TELEGRAM = 'https://t.me/vibecardoff';
const CONTACT_EMAIL = 'yurka_voron@mail.ru';
const CONTACT_REPORT_URL = `https://formsubmit.co/ajax/${CONTACT_EMAIL}`;

const REPORTS_KEY = 'vibecard_reports';

const ReportStore = {
  list() {
    try {
      return (JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]') || [])
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    } catch {
      return [];
    }
  },

  write(list) {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(list));
  },

  add(report) {
    const list = this.list();
    list.unshift(report);
    this.write(list);
  },

  markRead(id) {
    this.write(this.list().map((row) => (row.id === id ? { ...row, unread: false } : row)));
  },

  markAllRead() {
    this.write(this.list().map((row) => ({ ...row, unread: false })));
  },

  remove(id) {
    this.write(this.list().filter((row) => row.id !== id));
  },

  unreadCount() {
    return this.list().filter((row) => row.unread).length;
  },
};

const REPORT_CODES = [
  { id: 'VC-SAVE', name: 'Не сохраняется карточка' },
  { id: 'VC-UPLOAD', name: 'Не загружается файл' },
  { id: 'VC-MEDIA', name: 'Не играет музыка или видео' },
  { id: 'VC-PROFILE', name: 'Профиль не открывается' },
  { id: 'VC-EFFECT', name: 'Эффект не работает' },
  { id: 'VC-UI', name: 'Баг в интерфейсе' },
  { id: 'VC-OTHER', name: 'Другое' },
];

function currentContactUsername() {
  const authName = typeof Auth !== 'undefined' ? Auth.getUser()?.username : '';
  const fromUrl = typeof getUsernameFromUrl === 'function' ? getUsernameFromUrl() : '';
  return String(authName || fromUrl || '').replace(/[^a-z0-9_-]/gi, '');
}

function openContactsModal() {
  if (typeof openModal !== 'function') return;

  const username = currentContactUsername();
  const codes = REPORT_CODES.map((code) =>
    `<option value="${code.id}">${code.id} — ${code.name}</option>`
  ).join('');

  openModal({
    title: 'Контакты',
    subtitle: 'Discord и Telegram. Сообщение об ошибке отправляется здесь же.',
    className: 'modal--contacts',
    body: `
      <div class="contact-links">
        <a class="contact-link" href="${CONTACT_DISCORD}" target="_blank" rel="noopener noreferrer">
          <span class="contact-link-icon">◈</span>
          <span>
            <strong>Discord</strong>
            <span class="contact-link-meta">сервер сообщества</span>
          </span>
        </a>
        <a class="contact-link" href="${CONTACT_TELEGRAM}" target="_blank" rel="noopener noreferrer">
          <span class="contact-link-icon">✈</span>
          <span>
            <strong>Telegram</strong>
            <span class="contact-link-meta">@vibecardoff</span>
          </span>
        </a>
      </div>

      <form class="contact-report" id="contact-report-form">
        <h3 class="contact-report-title">Сообщить об ошибке</h3>
        <p class="form-hint">В обращение входят имя пользователя, код ошибки и текст, если он указан.</p>

        <label class="form-label" for="report-username">Имя пользователя</label>
        <input class="form-input" id="report-username" name="username" type="text"
          value="${typeof escapeHtml === 'function' ? escapeHtml(username) : username}"
          placeholder="mefloverxd" autocomplete="username" required>

        <label class="form-label" for="report-code">Код ошибки</label>
        <select class="form-input" id="report-code" name="error_code" required>
          <option value="" disabled selected>Код ошибки</option>
          ${codes}
        </select>

        <label class="form-label" for="report-text">Что случилось <span class="form-optional">(необязательно)</span></label>
        <textarea class="form-input form-textarea contact-report-text" id="report-text" name="message" rows="4"
          placeholder="Краткое описание: действие и результат"></textarea>

        <button type="submit" class="btn btn-primary" id="report-submit">Отправить</button>
        <p class="form-hint" id="report-status"></p>
      </form>
    `,
    onMount(dialog) {
      const form = dialog.querySelector('#contact-report-form');
      form?.addEventListener('submit', (event) => {
        event.preventDefault();
        sendErrorReport(form);
      });
    },
  });
}

async function sendErrorReport(form) {
  const submit = form.querySelector('#report-submit');
  const status = form.querySelector('#report-status');
  const username = String(form.username.value || '').trim().toLowerCase();
  const code = String(form.error_code.value || '').trim();
  const message = String(form.message.value || '').trim();

  if (!username || !code) {
    if (status) status.textContent = 'Необходимо указать имя пользователя и код ошибки';
    return;
  }

  submit.disabled = true;
  if (status) status.textContent = 'Отправляем…';

  const localReport = {
    id: crypto.randomUUID(),
    username,
    code,
    message: message || '—',
    page: window.location.href,
    created_at: new Date().toISOString(),
    unread: true,
    status: 'open',
  };
  ReportStore.add(localReport);
  if (typeof Api !== 'undefined') {
    Api.addReport({ username, code, message: message || '—' });
  }

  const payload = {
    _subject: `[Art Star] ${code} — @${username}`,
    _template: 'table',
    _captcha: 'false',
    nickname: username,
    error_code: code,
    message: message || '—',
    page: window.location.href,
  };

  try {
    const response = await fetch(CONTACT_REPORT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error('network');

    if (typeof showToast === 'function') showToast('Сообщение отправлено');
    if (status) status.textContent = 'Отправлено.';
    form.message.value = '';
  } catch {
    if (status) status.textContent = 'Не удалось отправить. Повтор или обращение в Discord / Telegram.';
    if (typeof showToast === 'function') showToast('Не удалось отправить', 'error');
  } finally {
    submit.disabled = false;
  }
}

function initContacts() {
  document.querySelectorAll('[data-open-contacts]').forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      openContactsModal();
    });
  });
}

document.addEventListener('DOMContentLoaded', initContacts);

window.ReportStore = ReportStore;
window.openContactsModal = openContactsModal;
window.initContacts = initContacts;
