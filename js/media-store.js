const MediaStore = {
  DB_NAME: 'vibecard-media',
  DB_VERSION: 1,
  STORE: 'files',
  PREFIX: 'idb:',

  _db: null,
  _ready: null,
  _records: new Map(),
  _urls: new Map(),

  SERVER_PREFIX: 'media:',

  isRef(value) {
    return typeof value === 'string' && (value.startsWith(this.PREFIX) || value.startsWith(this.SERVER_PREFIX));
  },

  isServerRef(value) {
    return typeof value === 'string' && value.startsWith(this.SERVER_PREFIX);
  },

  makeKey(field = 'media') {
    const rand = Math.random().toString(36).slice(2, 8);
    return `${this.PREFIX}${field}_${Date.now().toString(36)}${rand}`;
  },

  _open() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB недоступен'));
        return;
      }

      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.STORE)) {
          db.createObjectStore(this.STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Не удалось открыть хранилище'));
    });
  },

  _tx(mode) {
    return this._db.transaction(this.STORE, mode).objectStore(this.STORE);
  },

  _request(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Ошибка хранилища'));
    });
  },

  init() {
    if (this._ready) return this._ready;

    this._ready = (async () => {
      try {
        this._db = await this._open();
        const all = await this._request(this._tx('readonly').getAll());
        all.forEach((rec) => this._records.set(rec.key, rec));
      } catch (err) {
        console.warn('[Art Star] Медиа-хранилище недоступно:', err);
      }
      return this;
    })();

    return this._ready;
  },

  async put(key, file) {
    await this.init();
    if (!this._db) throw new Error('Хранилище файлов недоступно');

    const record = {
      key,
      blob: file,
      name: file.name || 'файл',
      size: file.size,
      type: file.type || '',
      updated_at: new Date().toISOString(),
    };

    await this._request(this._tx('readwrite').put(record));
    this._revoke(key);
    this._records.set(key, record);
    return key;
  },

  async remove(key) {
    await this.init();
    if (!this._db) return;

    await this._request(this._tx('readwrite').delete(key));
    this._revoke(key);
    this._records.delete(key);
  },

  _revoke(key) {
    const url = this._urls.get(key);
    if (url) {
      URL.revokeObjectURL(url);
      this._urls.delete(key);
    }
  },

  url(key) {
    if (this._urls.has(key)) return this._urls.get(key);

    const record = this._records.get(key);
    if (!record?.blob) {

      console.warn(`[Art Star] Файл ${key} не найден в этом браузере`);
      return '';
    }

    const url = URL.createObjectURL(record.blob);
    this._urls.set(key, url);
    return url;
  },

  resolve(value) {
    if (this.isServerRef(value)) return `/api/media/${value.slice(this.SERVER_PREFIX.length)}`;
    if (typeof value === 'string' && value.startsWith('/api/media/')) return value;
    return this.isRef(value) ? this.url(value) : value;
  },

  meta(key) {
    return this._records.get(key) || null;
  },

  async collectGarbage() {
    await this.init();
    if (!this._db) return;

    const used = new Set();
    Object.keys(localStorage)
      .filter((k) => k.startsWith(ProfileStore.PREFIX))
      .forEach((k) => {
        const raw = localStorage.getItem(k) || '';
        [...raw.matchAll(/idb:[a-z_]+_[a-z0-9]+/gi)].forEach((m) => used.add(m[0]));
      });

    const orphans = [...this._records.keys()].filter((key) => !used.has(key));
    await Promise.all(orphans.map((key) => this.remove(key)));
  },
};

window.MediaStore = MediaStore;
