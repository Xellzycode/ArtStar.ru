document.addEventListener('DOMContentLoaded', async () => {
  if (!document.querySelector('.page-pay')) return;
  if (typeof Api !== 'undefined' && Api.ready) await Api.ready;
  if (typeof Api !== 'undefined' && Auth.isLoggedIn()) {
    await Api.ensureSession();
  }

  const box = document.getElementById('pay-card');
  if (!box) return;

  const user = typeof Auth !== 'undefined' ? Auth.getUser() : null;
  const alreadyOn = typeof Premium !== 'undefined' && Premium.isActive();

  if (alreadyOn) {
    box.innerHTML = renderPayDone({
      title: 'Уже оплачено',
      text: 'Star+ на этом аккаунте активен без ограничения по сроку.',
    });
    return;
  }

  if (!user) {
    renderPayGate(box);
    return;
  }

  if (typeof Api !== 'undefined') {
    const status = await Api.payStatus();
    if (status.ok && status.premium) {
      Premium.activate(user.username, { skipRemote: true });
      box.innerHTML = renderPayDone({
        title: 'Уже оплачено',
        text: 'Star+ на этом аккаунте активен без ограничения по сроку.',
      });
      return;
    }
    if (status.ok && status.payment?.status === 'pending') {
      box.innerHTML = renderPayPending(user);
      return;
    }
  }

  bindPayCheckout(box, user);
});

function renderPayDone({ title, text }) {
  return `
    <div class="pay-done">
      <span class="pay-kicker">
        <span class="pay-kicker-star">✦</span>
        Art Star · Star+
      </span>
      <h1>${title}</h1>
      <p class="pay-lead">${text}</p>
      <a href="dashboard.html" class="btn btn-primary pay-done-btn">В конструктор</a>
    </div>`;
}

function renderPayPending(user) {
  return `
    <div class="pay-done">
      <span class="pay-kicker">
        <span class="pay-kicker-star">✦</span>
        Art Star · Star+
      </span>
      <h1>Заявка принята</h1>
      <p class="pay-lead">Перевод проверяется. Star+ на аккаунте @${escapeHtml(user.username)} активируется после подтверждения.</p>
      <a href="dashboard.html" class="btn btn-primary pay-done-btn">В конструктор</a>
    </div>`;
}

function renderPayGate(box) {
  box.innerHTML = `
    <span class="pay-kicker">
      <span class="pay-kicker-star">✦</span>
      Art Star · Star+
    </span>
    <h1>Оплата Star+</h1>
    <p class="pay-lead">Для оплаты необходима авторизация. Платёж привязывается к аккаунту.</p>
    <form id="pay-gate-form">
      <label class="form-label" for="pay-gate-login">Почта или имя пользователя</label>
      <input class="form-input" id="pay-gate-login" name="login" type="text" autocomplete="username" required>
      <label class="form-label" for="pay-gate-password">Пароль</label>
      <input class="form-input" id="pay-gate-password" name="password" type="password" autocomplete="current-password">
      <p class="form-hint">Регистрация доступна в конструкторе.</p>
      <p class="auth-error" id="pay-gate-error" hidden></p>
      <button type="submit" class="btn btn-primary pay-submit">Войти и оплатить</button>
      <a href="dashboard.html" class="auth-forgot">Регистрация или восстановление пароля</a>
    </form>
  `;

  box.querySelector('#pay-gate-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = box.querySelector('#pay-gate-error');
    const btn = box.querySelector('[type="submit"]');
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }
    btn.disabled = true;
    const result = await Auth.signIn(
      box.querySelector('#pay-gate-login').value,
      box.querySelector('#pay-gate-password').value,
    );
    btn.disabled = false;
    if (!result.ok) {
      if (error) {
        error.hidden = false;
        error.textContent = result.error;
      }
      return;
    }
    if (Premium.isActive(result.user.username)) {
      box.innerHTML = renderPayDone({
        title: 'Уже оплачено',
        text: 'Star+ на этом аккаунте активен без ограничения по сроку.',
      });
      return;
    }
    box.innerHTML = payCheckoutMarkup(result.user);
    bindPayCheckout(box, result.user);
  });
}

function payCheckoutMarkup(user) {
  return `
    <span class="pay-kicker">
      <span class="pay-kicker-star">✦</span>
      Art Star · Star+
    </span>
    <h1>Оплата Star+</h1>
    <p class="pay-lead">Разовый перевод 499 ₽. Доступ без ограничения по сроку. После перевода заявка подтверждается вручную.</p>
    <p class="pay-account">Аккаунт · @${escapeHtml(user.username)}</p>
    <div class="pay-perks">
      <span class="pay-perk">звезда у имени</span>
      <span class="pay-perk">бейдж Star+</span>
      <span class="pay-perk">видео и GIF</span>
      <span class="pay-perk">собственный шрифт</span>
    </div>
    <div class="pay-summary">
      <span>Итого</span>
      <strong>499 ₽</strong>
    </div>
    <div class="pay-methods" role="tablist">
      <button type="button" class="pay-method active" data-pay-method="transfer">Перевод</button>
      <button type="button" class="pay-method" data-pay-method="qr">QR / СБП</button>
    </div>
    <form id="pay-form">
      <div id="pay-card-fields">
        <p class="pay-lead">Перевод 499 ₽ на реквизиты Art Star. В комментарии к платежу указывается имя пользователя.</p>
        <label class="form-label" for="pay-note">Комментарий к заявке <span class="form-optional">(необязательно)</span></label>
        <input class="form-input" id="pay-note" name="note" maxlength="200" placeholder="Номер перевода или банк">
      </div>
      <div id="pay-qr-fields" class="hidden">
        <div class="pay-qr-box" id="pay-qr-box"></div>
        <p class="pay-lead">QR-код для перевода 499 ₽. После оплаты заявка отправляется кнопкой ниже.</p>
      </div>
      <p class="form-hint" id="pay-status"></p>
      <button type="submit" class="btn btn-primary pay-submit" id="pay-submit">Отметить перевод</button>
    </form>
  `;
}

function bindPayCheckout(box, user) {
  if (!box.querySelector('#pay-form')) {
    box.innerHTML = payCheckoutMarkup(user);
  }

  const form = box.querySelector('#pay-form');
  const cardFields = box.querySelector('#pay-card-fields');
  const qrFields = box.querySelector('#pay-qr-fields');
  const status = box.querySelector('#pay-status');
  const submit = box.querySelector('#pay-submit');
  let method = 'transfer';

  paintPayQr(box.querySelector('#pay-qr-box'), user);

  box.querySelectorAll('[data-pay-method]').forEach((btn) => {
    btn.addEventListener('click', () => {
      method = btn.dataset.payMethod;
      box.querySelectorAll('[data-pay-method]').forEach((el) => {
        el.classList.toggle('active', el === btn);
      });
      cardFields.classList.toggle('hidden', method !== 'transfer');
      qrFields.classList.toggle('hidden', method !== 'qr');
      if (submit) submit.textContent = 'Отметить перевод';
      if (status) status.textContent = '';
    });
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!Auth.isLoggedIn()) {
      showToast('Необходима авторизация', 'error');
      renderPayGate(box);
      return;
    }
    if (typeof Api !== 'undefined') {
      await Api.ensureSession();
    }

    const note = box.querySelector('#pay-note')?.value || '';
    submit.disabled = true;
    if (status) status.textContent = 'Отправляем заявку…';

    if (typeof Api === 'undefined') {
      Premium.activate(user.username);
      box.innerHTML = renderPayDone({
        title: 'Star+ активирован',
        text: 'Сервер недоступен. Доступ выдан в этом браузере.',
      });
      return;
    }

    let paid = await Api.pay(method, note);
    if (!paid.ok && paid.status === 401) {
      const resumed = await Api.ensureSession();
      if (resumed.ok) paid = await Api.pay(method, note);
    }
    if (paid.ok && (paid.already || paid.status === 'paid')) {
      Premium.activate(user.username, { skipRemote: true });
      box.innerHTML = renderPayDone({
        title: 'Star+ активирован',
        text: 'Разовый платёж. Доступ без ограничения по сроку.',
      });
      showToast('Star+ активирован');
      return;
    }
    if (paid.ok) {
      box.innerHTML = renderPayPending(user);
      showToast('Заявка на оплату отправлена');
      return;
    }
    if (paid.offline) {
      Premium.activate(user.username, { skipRemote: true });
      box.innerHTML = renderPayDone({
        title: 'Star+ активирован',
        text: 'Сервер недоступен. Доступ выдан в этом браузере.',
      });
      return;
    }
    submit.disabled = false;
    if (status) status.textContent = paid.error || 'Не удалось отправить заявку';
  });
}

function paintPayQr(holder, user) {
  if (!holder || typeof qrToSvg !== 'function') return;
  const payload = `ARTSTAR|PREMIUM|499|${user.username}|${Date.now()}`;
  holder.innerHTML = qrToSvg(payload, { level: 'M', quiet: 2 });
}

window.renderPayDone = renderPayDone;
