let activeModalClose = null;

function openModal({ title = '', subtitle = '', body = '', className = '', onMount } = {}) {
  activeModalClose?.();

  const opener = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${className}" role="dialog" aria-modal="true" tabindex="-1">
      <div class="modal-head">
        <div class="modal-titles">
          <h2 class="modal-title">${escapeHtml(title)}</h2>
          ${subtitle ? `<p class="modal-subtitle">${escapeHtml(subtitle)}</p>` : ''}
        </div>
        <button type="button" class="modal-close" aria-label="Закрыть">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">${body}</div>
    </div>
  `;

  const dialog = overlay.querySelector('.modal');

  document.body.style.overflow = 'hidden';

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    if (activeModalClose === close) activeModalClose = null;

    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeyDown);

    setTimeout(() => overlay.remove(), 200);
    if (opener instanceof HTMLElement) opener.focus();
  };

  activeModalClose = close;

  function onKeyDown(event) {
    if (event.key === 'Escape') close();
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelector('.modal-close').addEventListener('click', close);
  document.addEventListener('keydown', onKeyDown);

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('is-open'));
  dialog.focus();

  onMount?.(dialog, close);
  return { close, dialog };
}

window.openModal = openModal;
