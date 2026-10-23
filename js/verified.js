const VERIFIED_KEY = 'vibecard_verified';
const DEVELOPER_KEY = 'vibecard_developer';
const DEVELOPER_SEED = ['mefloverxd'];

const Verified = {
  read() {
    try {
      return JSON.parse(localStorage.getItem(VERIFIED_KEY) || '{}') || {};
    } catch {
      return {};
    }
  },

  write(map) {
    localStorage.setItem(VERIFIED_KEY, JSON.stringify(map));
  },

  isActive(username) {
    const name = String(username || '').trim().toLowerCase();
    if (!name) return false;
    return Boolean(this.read()[name]);
  },

  grant(username, options = {}) {
    const name = String(username || '').trim().toLowerCase();
    if (!name) return false;
    const map = this.read();
    map[name] = { active: true, grantedAt: new Date().toISOString() };
    this.write(map);
    if (!options.skipRemote && typeof Api !== 'undefined') {
      Api.setVerified(name, true);
    }
    return true;
  },

  revoke(username, options = {}) {
    const name = String(username || '').trim().toLowerCase();
    if (!name) return false;
    const map = this.read();
    if (!map[name]) return false;
    delete map[name];
    this.write(map);
    if (!options.skipRemote && typeof Api !== 'undefined') {
      Api.setVerified(name, false);
    }
    return true;
  },

  rename(oldName, newName) {
    const from = String(oldName || '').trim().toLowerCase();
    const to = String(newName || '').trim().toLowerCase();
    if (!from || !to || !this.isActive(from)) return;
    const map = this.read();
    map[to] = map[from] || { active: true, grantedAt: new Date().toISOString() };
    delete map[from];
    this.write(map);
  },

  list() {
    return Object.keys(this.read());
  },

  decorateBadges(profile, badges) {
    const list = (Array.isArray(badges) ? badges : []).filter((badge) => (
      typeof isReservedBadgeText === 'function'
        ? !isReservedBadgeText(badge.text, 'verified')
        : String(badge.text || '').trim().toLowerCase() !== 'verified'
    ));
    if (profile?.hide_official_badges) return list;
    if (!this.isActive(profile?.username)) return list;
    return [{ text: 'Verified', color: '#ffffff', icon: '✓', official: true, kind: 'verified' }, ...list];
  },
};

const Developer = {
  read() {
    try {
      return JSON.parse(localStorage.getItem(DEVELOPER_KEY) || '{}') || {};
    } catch {
      return {};
    }
  },

  write(map) {
    localStorage.setItem(DEVELOPER_KEY, JSON.stringify(map));
  },

  isActive(username) {
    const name = String(username || '').trim().toLowerCase();
    if (!name) return false;
    if (DEVELOPER_SEED.includes(name)) return true;
    return Boolean(this.read()[name]?.active);
  },

  grant(username, options = {}) {
    const name = String(username || '').trim().toLowerCase();
    if (!name) return false;
    const map = this.read();
    map[name] = { active: true, grantedAt: new Date().toISOString() };
    this.write(map);
    if (!options.skipRemote && typeof Api !== 'undefined') {
      Api.setDeveloper(name, true);
    }
    return true;
  },

  revoke(username, options = {}) {
    const name = String(username || '').trim().toLowerCase();
    if (!name) return false;
    const map = this.read();
    delete map[name];
    this.write(map);
    if (!options.skipRemote && typeof Api !== 'undefined') {
      Api.setDeveloper(name, false);
    }
    return true;
  },

  rename(oldName, newName) {
    const from = String(oldName || '').trim().toLowerCase();
    const to = String(newName || '').trim().toLowerCase();
    if (!from || !to || !this.isActive(from)) return;
    const map = this.read();
    map[to] = map[from] || { active: true, grantedAt: new Date().toISOString() };
    delete map[from];
    this.write(map);
  },

  list() {
    const names = new Set([...DEVELOPER_SEED, ...Object.keys(this.read())]);
    return [...names].filter((name) => this.isActive(name));
  },

  decorateBadges(profile, badges) {
    const list = (Array.isArray(badges) ? badges : []).filter((badge) => (
      typeof isReservedBadgeText === 'function'
        ? !isReservedBadgeText(badge.text, 'developer')
        : String(badge.text || '').trim().toLowerCase() !== 'developer'
    ));
    if (profile?.hide_official_badges) return list;
    if (!this.isActive(profile?.username)) return list;
    const official = list.filter((badge) => badge.official);
    const custom = list.filter((badge) => !badge.official);
    return [...official, {
      text: 'Developer',
      color: '#f5f5f5',
      icon: '⚙',
      official: true,
      kind: 'developer',
    }, ...custom];
  },
};

function decorateProfileBadges(profile, badges) {
  let list = Array.isArray(badges) ? badges : [];
  if (typeof Premium !== 'undefined') list = Premium.decorateBadges(profile, list);
  if (typeof Verified !== 'undefined') list = Verified.decorateBadges(profile, list);
  if (typeof Developer !== 'undefined') list = Developer.decorateBadges(profile, list);
  return list;
}

function verifiedMarkHTML() {
  return '<span class="vcard-verified" title="Verified"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.2 16.6L4.7 12.1l1.4-1.4 3.1 3.1 8.7-8.7 1.4 1.4z"/></svg></span>';
}

function developerMarkHTML() {
  return '<span class="vcard-developer" title="Developer"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.8 8.48a.49.49 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.64l1.92 3.32c.14.24.4.34.61.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.42.5.42h3.8c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.12-.56 1.62-.94l2.39.96c.21.12.47.02.61-.22l1.92-3.32a.49.49 0 0 0-.12-.64l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg></span>';
}

function developerGearHTML() {
  return '<span class="vcard-badge-gear" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.8 8.48a.49.49 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.64l1.92 3.32c.14.24.4.34.61.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.42.5.42h3.8c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.12-.56 1.62-.94l2.39.96c.21.12.47.02.61-.22l1.92-3.32a.49.49 0 0 0-.12-.64l-2.03-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg></span>';
}

window.Verified = Verified;
window.Developer = Developer;
window.decorateProfileBadges = decorateProfileBadges;
window.verifiedMarkHTML = verifiedMarkHTML;
window.developerMarkHTML = developerMarkHTML;
window.developerGearHTML = developerGearHTML;
