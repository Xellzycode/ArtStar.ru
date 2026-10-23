import { mkdirSync } from 'fs'
import { join } from 'path'
import { createHash, randomBytes } from 'crypto'
import { DatabaseSync } from 'node:sqlite'

export const ROOT = process.cwd()
export const DATA_DIR = join(ROOT, 'data')
export const DB_PATH = join(DATA_DIR, 'artstar.db')
export const MEDIA_DIR = join(DATA_DIR, 'media')
export const HASH_PREFIX = 'artstar-v1:'
export const ADMIN_LOGIN = process.env.ARTSTAR_ADMIN_LOGIN || 'mefadmin'
export const ADMIN_PASSWORD = process.env.ARTSTAR_ADMIN_PASSWORD || 'Mefloverxd48624862admin'

let ready = false

export type Db = DatabaseSync

export function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function hashSecret(value: string) {
  return createHash('sha256').update(`${HASH_PREFIX}${value}`).digest('hex')
}

export function token(bytes = 16) {
  return randomBytes(bytes).toString('hex')
}

export function connect(): Db {
  mkdirSync(DATA_DIR, { recursive: true })
  mkdirSync(MEDIA_DIR, { recursive: true })
  const db = new DatabaseSync(DB_PATH)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA journal_mode = WAL')
  if (!ready) {
    init(db)
    ready = true
  }
  return db
}

export function all(db: Db, sql: string, ...params: unknown[]) {
  return db.prepare(sql).all(...params)
}

export function get(db: Db, sql: string, ...params: unknown[]) {
  return db.prepare(sql).get(...params)
}

export function run(db: Db, sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...params)
}

function init(db: Db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT,
      password_hash TEXT,
      provider TEXT DEFAULT 'email',
      reset_hash TEXT,
      reset_until INTEGER,
      created_at TEXT NOT NULL,
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS profiles (
      username TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS premium (
      username TEXT PRIMARY KEY,
      active INTEGER DEFAULT 1,
      plan TEXT,
      price INTEGER,
      bought_at TEXT
    );
    CREATE TABLE IF NOT EXISTS verified (
      username TEXT PRIMARY KEY,
      granted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      username TEXT,
      code TEXT,
      message TEXT,
      unread INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      resolution TEXT,
      reply TEXT
    );
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      username TEXT,
      amount INTEGER,
      method TEXT,
      status TEXT,
      created_at TEXT NOT NULL,
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS developers (
      username TEXT PRIMARY KEY,
      granted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS admin_log (
      id TEXT PRIMARY KEY,
      actor TEXT,
      action TEXT,
      target TEXT,
      detail TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mail_outbox (
      id TEXT PRIMARY KEY,
      recipient TEXT,
      subject TEXT,
      body TEXT,
      kind TEXT,
      sent INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      username TEXT,
      kind TEXT,
      name TEXT,
      mime TEXT,
      path TEXT,
      size INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS user_notes (
      username TEXT PRIMARY KEY,
      note TEXT,
      updated_at TEXT
    );
  `)
  migrate(db)
  seed(db)
}

function hasColumn(db: Db, table: string, column: string) {
  return all(db, `PRAGMA table_info(${table})`).some((row) => String(row.name) === column)
}

function migrate(db: Db) {
  if (!hasColumn(db, 'reports', 'status')) run(db, "ALTER TABLE reports ADD COLUMN status TEXT DEFAULT 'open'")
  if (!hasColumn(db, 'reports', 'resolution')) run(db, 'ALTER TABLE reports ADD COLUMN resolution TEXT')
  if (!hasColumn(db, 'reports', 'reply')) run(db, 'ALTER TABLE reports ADD COLUMN reply TEXT')
  if (!hasColumn(db, 'payments', 'note')) run(db, 'ALTER TABLE payments ADD COLUMN note TEXT')
  if (!hasColumn(db, 'users', 'note')) run(db, 'ALTER TABLE users ADD COLUMN note TEXT')
  if (!get(db, 'SELECT 1 AS ok FROM developers WHERE username = ?', 'mefloverxd')) {
    run(db, 'INSERT INTO developers (username, granted_at) VALUES (?, ?)', 'mefloverxd', nowIso())
  }
}

function seed(db: Db) {
  if (!get(db, 'SELECT 1 AS ok FROM users WHERE username = ?', 'demo')) {
    const uid = token(16)
    run(
      db,
      `INSERT INTO users (id, email, username, display_name, password_hash, provider, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      uid,
      'demo@artstar.local',
      'demo',
      'Demo User',
      hashSecret('demo123'),
      'email',
      nowIso(),
    )
    const profile = {
      username: 'demo',
      display_name: 'Demo User',
      bio: 'Дизайнер · Геймер · Creator',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
      bg_type: 'gradient',
      bg_color: '#0a0a0a',
      bg_gradient_from: '#262626',
      bg_gradient_to: '#000000',
      bg_effect: 'aurora',
      name_color: '#ffffff',
      name_font: 'Inter',
      name_effect: 'shine',
      card_opacity: 45,
      card_blur: 22,
      show_stats: true,
      created_at: nowIso(),
    }
    run(
      db,
      'INSERT INTO profiles (username, data, updated_at) VALUES (?, ?, ?)',
      'demo',
      JSON.stringify(profile),
      nowIso(),
    )
    run(
      db,
      'INSERT INTO premium (username, active, plan, price, bought_at) VALUES (?, 1, ?, ?, ?)',
      'demo',
      'lifetime',
      499,
      nowIso(),
    )
  }
  if (!get(db, 'SELECT 1 AS ok FROM users WHERE username = ?', 'mefadmin')) {
    run(
      db,
      `INSERT INTO users (id, email, username, display_name, password_hash, provider, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      token(16),
      'admin@artstar.local',
      'mefadmin',
      'Admin',
      hashSecret(ADMIN_PASSWORD),
      'email',
      nowIso(),
    )
  }
  if (!get(db, 'SELECT 1 AS ok FROM profiles WHERE username = ?', 'mefloverxd')) {
    const card = {
      username: 'mefloverxd',
      display_name: 'Meflover',
      bio: '',
      bg_type: 'color',
      bg_color: '#0b0b10',
      bg_effect: 'rays',
      name_color: '#ffffff',
      name_font: 'Bebas Neue',
      name_effect: 'neon',
      show_stats: true,
      created_at: nowIso(),
    }
    run(db, 'INSERT INTO profiles (username, data, updated_at) VALUES (?, ?, ?)', 'mefloverxd', JSON.stringify(card), nowIso())
  }
}

export function userPublic(row?: Record<string, unknown> | null) {
  if (!row) return null
  return {
    id: String(row.id),
    email: String(row.email || ''),
    username: String(row.username),
    displayName: String(row.display_name || row.username),
    provider: String(row.provider || 'email'),
  }
}

export function findUser(db: Db, login: unknown) {
  const value = String(login || '').trim().toLowerCase()
  if (!value) return undefined
  if (value.includes('@')) return get(db, 'SELECT * FROM users WHERE email = ?', value)
  return get(db, 'SELECT * FROM users WHERE username = ? OR email = ?', value, value)
}

export function createSession(db: Db, userId: string, role = 'user') {
  const value = token(24)
  run(db, 'INSERT INTO sessions (token, user_id, role, created_at) VALUES (?, ?, ?, ?)', value, userId, role, nowIso())
  return value
}

export function sessionUser(db: Db, tokenValue: string) {
  if (!tokenValue) return { row: undefined as Record<string, unknown> | undefined, role: '' }
  const row = get(
    db,
    `SELECT users.*, sessions.role AS session_role
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ?`,
    tokenValue,
  )
  if (!row) return { row: undefined, role: '' }
  return { row, role: String(row.session_role || '') }
}

export function setting(db: Db, key: string, fallback = '') {
  const row = get(db, 'SELECT value FROM settings WHERE key = ?', key)
  return row ? String(row.value ?? fallback) : fallback
}

export function setSetting(db: Db, key: string, value: string) {
  run(db, 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value)
}

export function logAdmin(db: Db, actor: string, action: string, target = '', detail = '') {
  run(
    db,
    'INSERT INTO admin_log (id, actor, action, target, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    token(10),
    actor || '',
    action,
    target || '',
    detail || '',
    nowIso(),
  )
}

export function enqueueMail(db: Db, recipient: string, subject: string, body: string, kind = 'message') {
  const id = token(10)
  run(
    db,
    `INSERT INTO mail_outbox (id, recipient, subject, body, kind, sent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    recipient || '',
    subject,
    body,
    kind,
    0,
    nowIso(),
  )
  return id
}

export function renameUser(db: Db, oldName: string, newNameRaw: unknown) {
  const old = String(oldName || '').trim().toLowerCase()
  const next = String(newNameRaw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
  if (next.length < 3) throw new Error('Имя пользователя — от 3 символов, латиница')
  if (old === next) return next
  if (get(db, 'SELECT 1 AS ok FROM users WHERE username = ?', next)) throw new Error('Это имя пользователя уже занято')
  if (get(db, 'SELECT 1 AS ok FROM profiles WHERE username = ?', next)) throw new Error('Это имя пользователя уже занято')
  const tables = ['premium', 'verified', 'developers', 'payments', 'reports', 'user_notes', 'media'] as const
  for (const table of tables) {
    run(db, `UPDATE ${table} SET username = ? WHERE username = ?`, next, old)
  }
  const row = get(db, 'SELECT data FROM profiles WHERE username = ?', old)
  if (row) {
    let data: Record<string, unknown>
    try {
      data = JSON.parse(String(row.data || '{}')) as Record<string, unknown>
    } catch {
      data = { username: next }
    }
    data.username = next
    run(db, 'UPDATE profiles SET username = ?, data = ?, updated_at = ? WHERE username = ?', next, JSON.stringify(data), nowIso(), old)
  }
  run(db, 'UPDATE users SET username = ? WHERE username = ?', next, old)
  return next
}

export function cleanUsername(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
}
