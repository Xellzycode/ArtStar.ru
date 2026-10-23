const ProfileEditorStore = {
  state: typeof DEFAULT_PROFILE !== 'undefined' ? { ...DEFAULT_PROFILE } : {},
  listeners: new Set(),

  init(profile) {

    this.state = sanitizeProfileForEditing(profile);
    this.notify();
  },

  getState() {
    return { ...this.state };
  },

  setField(key, value) {
    if (key === 'username') {
      value = String(value).toLowerCase().replace(/[^a-z0-9_-]/g, '');
    }
    this.state = { ...this.state, [key]: value };
    this.notify();
  },

  setFields(partial) {
    const next = { ...partial };
    if (next.username !== undefined) {
      next.username = String(next.username).toLowerCase().replace(/[^a-z0-9_-]/g, '');
    }
    this.state = { ...this.state, ...next };
    this.notify();
  },

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  notify() {
    const snapshot = this.getState();
    this.listeners.forEach((fn) => fn(snapshot));
  },
};

window.ProfileEditorStore = ProfileEditorStore;
