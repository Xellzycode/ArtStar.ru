const Api = {
  online: null,

  async request(method, path, body) {
    try {
      const opts = {
        method,
        credentials: 'include',
        headers: {},
      };
      if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
      const res = await fetch(path, opts);
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = { ok: false, error: 'Ответ сервера повреждён' };
      }
      this.online = true;
      return { ok: Boolean(data.ok), ...data, status: res.status };
    } catch {
      this.online = false;
      return { ok: false, offline: true, error: 'Сервер недоступен' };
    }
  },

  health() {
    return this.request('GET', '/api/health');
  },

  sync() {
    return this.request('GET', '/api/sync');
  },

  me() {
    return this.request('GET', '/api/auth/me');
  },

  register(payload) {
    return this.request('POST', '/api/auth/register', payload);
  },

  login(login, password) {
    return this.request('POST', '/api/auth/login', { login, password });
  },

  logout() {
    return this.request('POST', '/api/auth/logout');
  },

  requestReset(login) {
    return this.request('POST', '/api/auth/reset/request', { login });
  },

  resetPassword(login, code, password) {
    return this.request('POST', '/api/auth/reset/confirm', { login, code, password });
  },

  resume(username) {
    return this.request('POST', '/api/auth/resume', { username });
  },

  async ensureSession() {
    const local = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    if (!local?.username) return { ok: false };
    const me = await this.me();
    if (me.ok && me.user) {
      Auth.setSession(me.user);
      return me;
    }
    const resumed = await this.resume(local.username);
    if (resumed.ok && resumed.user && typeof Auth !== 'undefined') {
      Auth.setSession(resumed.user);
      return resumed;
    }
    if (resumed.offline) return resumed;
    return { ok: Boolean(local.username), user: local, local: true };
  },

  payStatus() {
    return this.request('GET', '/api/pay');
  },

  async uploadMedia(file, kind = 'file') {
    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-Media-Kind': kind,
          'X-Media-Name': file.name || 'file',
        },
        body: file,
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = { ok: false, error: 'Ответ сервера повреждён' };
      }
      this.online = true;
      return { ok: Boolean(data.ok), ...data, status: res.status };
    } catch {
      this.online = false;
      return { ok: false, offline: true, error: 'Сервер недоступен' };
    }
  },

  setDeveloper(username, active) {
    return this.request(active ? 'POST' : 'DELETE', '/api/developer', { username });
  },

  patchReport(id, payload) {
    return this.request('PATCH', `/api/reports/${encodeURIComponent(id)}`, payload);
  },

  adminUserAction(username, action, payload) {
    return this.request('POST', `/api/admin/users/${encodeURIComponent(username)}/${action}`, payload);
  },

  adminLog() {
    return this.request('GET', '/api/admin/log');
  },

  adminMail() {
    return this.request('GET', '/api/admin/mail');
  },

  adminPayments() {
    return this.request('GET', '/api/admin/payments');
  },

  adminPaymentAction(id, action) {
    return this.request('POST', `/api/admin/payments/${encodeURIComponent(id)}/${action}`, {});
  },

  adminMaintenance(on) {
    return this.request('POST', '/api/admin/maintenance', { on: Boolean(on) });
  },

  adminMaintenanceState() {
    return this.request('GET', '/api/admin/maintenance');
  },

  adminExportUrl() {
    return '/api/admin/export';
  },

  async adminExport() {
    try {
      const res = await fetch('/api/admin/export', { credentials: 'include' });
      this.online = true;
      const type = res.headers.get('Content-Type') || '';
      if (!res.ok || type.includes('application/json')) {
        let data = {};
        try {
          data = await res.json();
        } catch {
          data = { ok: false, error: 'Не удалось скачать выгрузку' };
        }
        return { ok: false, status: res.status, error: data.error || 'Не удалось скачать выгрузку' };
      }
      const blob = await res.blob();
      return { ok: true, blob };
    } catch {
      this.online = false;
      return { ok: false, offline: true, error: 'Сервер недоступен' };
    }
  },

  listProfiles() {
    return this.request('GET', '/api/profiles');
  },

  getProfile(username) {
    return this.request('GET', `/api/profiles/${encodeURIComponent(username)}`);
  },

  putProfile(username, profile) {
    return this.request('PUT', `/api/profiles/${encodeURIComponent(username)}`, { profile });
  },

  deleteProfile(username) {
    return this.request('DELETE', `/api/profiles/${encodeURIComponent(username)}`);
  },

  getPremium() {
    return this.request('GET', '/api/premium');
  },

  setPremium(username, active) {
    return this.request(active ? 'POST' : 'DELETE', '/api/premium', { username });
  },

  getVerified() {
    return this.request('GET', '/api/verified');
  },

  setVerified(username, active) {
    return this.request(active ? 'POST' : 'DELETE', '/api/verified', { username });
  },

  pay(method, note) {
    return this.request('POST', '/api/pay', { method, note: note || '' });
  },

  addReport(payload) {
    return this.request('POST', '/api/reports', payload);
  },

  listReports() {
    return this.request('GET', '/api/reports');
  },

  deleteReport(id) {
    return this.request('DELETE', `/api/reports/${encodeURIComponent(id)}`);
  },

  adminLogin(login, password) {
    return this.request('POST', '/api/admin/login', { login, password });
  },

  adminLogout() {
    return this.request('POST', '/api/admin/logout');
  },

  adminUsers() {
    return this.request('GET', '/api/admin/users');
  },

  async hydrate() {
    try {
      const data = await this.sync();
      if (!data.ok) return data;
      if (data.user && typeof Auth !== 'undefined') {
        Auth.setSession(data.user);
      } else if (typeof Auth !== 'undefined' && Auth.getUser()?.username) {
        const resumed = await this.resume(Auth.getUser().username);
        if (resumed.ok && resumed.user) {
          Auth.setSession(resumed.user);
          data.user = resumed.user;
        }
      }
      if (data.premium && typeof Premium !== 'undefined') {
        Premium.write(data.premium);
      }
      if (data.verified && typeof Verified !== 'undefined') {
        Verified.write(data.verified);
      }
      if (data.developers && typeof Developer !== 'undefined' && Developer.write) {
        Developer.write(data.developers);
      }
      const list = await this.listProfiles();
      if (list.ok && Array.isArray(list.profiles) && typeof ProfileStore !== 'undefined') {
        list.profiles.forEach((profile) => {
          if (!profile?.username) return;
          const local = ProfileStore.get(profile.username);
          const chosen = typeof preferNewerProfile === 'function'
            ? preferNewerProfile(local, profile)
            : (local || profile);
          ProfileStore.save(profile.username, chosen, { skipRemote: true, keepTimestamp: true });
        });
      }
      if (typeof syncPremiumNav === 'function') syncPremiumNav();
      return data;
    } catch {
      this.online = false;
      return { ok: false, offline: true, error: 'Сервер недоступен' };
    }
  },
};

Api.ready = Api.hydrate();

window.Api = Api;
