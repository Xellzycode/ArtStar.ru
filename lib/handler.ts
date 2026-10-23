import { extname, join } from 'path'
import { mkdirSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import JSZip from 'jszip'
import {
  ADMIN_LOGIN,
  ADMIN_PASSWORD,
  MEDIA_DIR,
  all,
  cleanUsername,
  connect,
  createSession,
  enqueueMail,
  findUser,
  get,
  hashSecret,
  logAdmin,
  nowIso,
  renameUser,
  run,
  sessionUser,
  setSetting,
  setting,
  token,
  userPublic,
  type Db,
} from './db'

type ApiResult =
  | { kind: 'json'; status: number; body: Record<string, unknown>; cookies?: string[] }
  | { kind: 'bin'; status: number; body: Buffer; type: string; filename?: string }

const ok = (body: Record<string, unknown> = { ok: true }, status = 200, cookies?: string[]): ApiResult => ({
  kind: 'json',
  status,
  body: { ok: true, ...body },
  cookies,
})

const fail = (error: string, status = 400): ApiResult => ({
  kind: 'json',
  status,
  body: { ok: false, error },
})

function cookie(req: Request, name: string) {
  const raw = req.headers.get('cookie') || ''
  const match = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ''
}

function isHttps(req: Request) {
  const forwarded = (req.headers.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase()
  if (forwarded) return forwarded === 'https'
  try {
    return new URL(req.url).protocol === 'https:'
  } catch {
    return false
  }
}

function sessionCookie(req: Request, value: string, clear = false) {
  const secure = isHttps(req) ? '; Secure' : ''
  if (clear) return `artstar_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`
  return `artstar_session=${value}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${secure}`
}

function adminCookie(req: Request, value: string, clear = false) {
  const secure = isHttps(req) ? '; Secure' : ''
  if (clear) return `artstar_admin=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`
  return `artstar_admin=${value}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax${secure}`
}

function current(db: Db, req: Request) {
  return sessionUser(db, cookie(req, 'artstar_session'))
}

function isAdmin(db: Db, req: Request) {
  return sessionUser(db, cookie(req, 'artstar_admin')).role === 'admin'
}

function adminName(db: Db, req: Request) {
  const { row } = sessionUser(db, cookie(req, 'artstar_admin'))
  return row ? String(row.username) : 'admin'
}

async function readJson(req: Request) {
  try {
    const text = await req.text()
    if (!text) return {} as Record<string, unknown>
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return {} as Record<string, unknown>
  }
}

function hideProfile(db: Db, username: string, hidden: boolean) {
  const name = username.trim().toLowerCase()
  const row = get(db, 'SELECT data FROM profiles WHERE username = ?', name)
  if (!row) throw new Error('Карточка не создана')
  let data: Record<string, unknown>
  try {
    data = JSON.parse(String(row.data || '{}')) as Record<string, unknown>
  } catch {
    data = { username: name }
  }
  data.hidden = hidden
  run(db, 'UPDATE profiles SET data = ?, updated_at = ? WHERE username = ?', JSON.stringify(data), nowIso(), name)
}

function premiumMap(db: Db) {
  const rows = all(db, 'SELECT * FROM premium WHERE active = 1')
  const data: Record<string, unknown> = {}
  for (const row of rows) {
    data[String(row.username)] = {
      active: true,
      plan: row.plan,
      price: row.price,
      boughtAt: row.bought_at,
    }
  }
  return data
}

export async function handleApi(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type, X-Media-Kind, X-Media-Name',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
      },
    })
  }

  const url = new URL(req.url)
  const parts = url.pathname.split('/').filter(Boolean)
  const method = req.method.toUpperCase()
  const db = connect()
  try {
    const result = await route(db, req, method, parts)
    return toResponse(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Сервер не смог обработать запрос'
    const status = err instanceof Error && message ? 400 : 500
    return toResponse(fail(message, status === 400 ? 400 : 500))
  }
}

function toResponse(result: ApiResult): Response {
  if (result.kind === 'bin') {
    const headers = new Headers({
      'Content-Type': result.type,
      'Content-Length': String(result.body.length),
    })
    if (result.filename) {
      headers.set('Content-Disposition', `attachment; filename="${result.filename}"`)
    }
    const bytes = Uint8Array.from(result.body)
    return new Response(bytes, { status: result.status, headers })
  }
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' })
  result.cookies?.forEach((item) => headers.append('Set-Cookie', item))
  return new Response(JSON.stringify(result.body), { status: result.status, headers })
}

async function route(db: Db, req: Request, method: string, parts: string[]): Promise<ApiResult> {
  if (parts[0] !== 'api') return fail('Маршрут не найден', 404)
  const rest = parts.slice(1)

  if (eq(rest, ['health']) && method === 'GET') return ok({ name: 'Art Star', db: 'sqlite' })
  if (eq(rest, ['sync']) && method === 'GET') return sync(db, req)

  if (eq(rest, ['auth', 'register']) && method === 'POST') return authRegister(db, req)
  if (eq(rest, ['auth', 'login']) && method === 'POST') return authLogin(db, req)
  if (eq(rest, ['auth', 'logout']) && method === 'POST') {
    const value = cookie(req, 'artstar_session')
    if (value) run(db, 'DELETE FROM sessions WHERE token = ?', value)
    return ok({}, 200, [sessionCookie(req, '', true)])
  }
  if (eq(rest, ['auth', 'me']) && method === 'GET') {
    const { row } = current(db, req)
    if (!row) return { kind: 'json', status: 401, body: { ok: false, user: null } }
    return ok({ user: userPublic(row) })
  }
  if (eq(rest, ['auth', 'reset', 'request']) && method === 'POST') return authResetRequest(db, req)
  if (eq(rest, ['auth', 'reset', 'confirm']) && method === 'POST') return authResetConfirm(db, req)
  if (eq(rest, ['auth', 'resume']) && method === 'POST') return authResume(db, req)

  if (eq(rest, ['profiles']) && method === 'GET') return profilesList(db)
  if (rest[0] === 'profiles' && rest.length === 2 && method === 'GET') return profileGet(db, rest[1])
  if (rest[0] === 'profiles' && rest.length === 2 && method === 'PUT') return profilePut(db, req, rest[1])
  if (rest[0] === 'profiles' && rest.length === 2 && method === 'DELETE') return profileDelete(db, req, rest[1])

  if (eq(rest, ['premium']) && method === 'GET') return ok({ premium: premiumMap(db) })
  if (eq(rest, ['premium']) && method === 'POST') return premiumSet(db, req, true)
  if (eq(rest, ['premium']) && method === 'DELETE') return premiumSet(db, req, false)

  if (eq(rest, ['verified']) && method === 'GET') {
    const data: Record<string, unknown> = {}
    for (const row of all(db, 'SELECT username, granted_at FROM verified')) {
      data[String(row.username)] = { active: true, grantedAt: row.granted_at }
    }
    return ok({ verified: data })
  }
  if (eq(rest, ['verified']) && method === 'POST') return verifiedSet(db, req, true)
  if (eq(rest, ['verified']) && method === 'DELETE') return verifiedSet(db, req, false)

  if (eq(rest, ['pay']) && method === 'POST') return pay(db, req)
  if (eq(rest, ['pay']) && method === 'GET') return payStatus(db, req)

  if (eq(rest, ['media']) && method === 'POST') return mediaUpload(db, req)
  if (rest[0] === 'media' && rest.length === 2 && method === 'GET') return mediaGet(db, rest[1])

  if (eq(rest, ['reports']) && method === 'GET') return reportsList(db, req)
  if (eq(rest, ['reports']) && method === 'POST') return reportsAdd(db, req)
  if (rest[0] === 'reports' && rest.length === 2 && method === 'PATCH') return reportPatch(db, req, rest[1])
  if (rest[0] === 'reports' && rest.length === 2 && method === 'DELETE') {
    if (!isAdmin(db, req)) return fail('Нет доступа', 403)
    run(db, 'DELETE FROM reports WHERE id = ?', rest[1])
    logAdmin(db, adminName(db, req), 'report_delete', rest[1])
    return ok()
  }

  if (eq(rest, ['developer']) && method === 'GET') {
    const data: Record<string, unknown> = {}
    for (const row of all(db, 'SELECT username, granted_at FROM developers')) {
      data[String(row.username)] = { active: true, grantedAt: row.granted_at }
    }
    return ok({ developers: data })
  }
  if (eq(rest, ['developer']) && method === 'POST') return developerSet(db, req, true)
  if (eq(rest, ['developer']) && method === 'DELETE') return developerSet(db, req, false)

  if (eq(rest, ['admin', 'login']) && method === 'POST') return adminLogin(db, req)
  if (eq(rest, ['admin', 'logout']) && method === 'POST') return ok({}, 200, [adminCookie(req, '', true)])
  if (eq(rest, ['admin', 'users']) && method === 'GET') return adminUsers(db, req)
  if (rest[0] === 'admin' && rest[1] === 'users' && rest.length === 4 && method === 'POST') {
    return adminUserAction(db, req, rest[2], rest[3])
  }
  if (eq(rest, ['admin', 'log']) && method === 'GET') return adminLog(db, req)
  if (eq(rest, ['admin', 'mail']) && method === 'GET') return adminMail(db, req)
  if (eq(rest, ['admin', 'payments']) && method === 'GET') return adminPayments(db, req)
  if (rest[0] === 'admin' && rest[1] === 'payments' && rest.length === 4 && method === 'POST') {
    return adminPaymentAction(db, req, rest[2], rest[3])
  }
  if (eq(rest, ['admin', 'export']) && method === 'GET') return adminExport(db, req)
  if (eq(rest, ['admin', 'maintenance']) && method === 'POST') return adminMaintenance(db, req)
  if (eq(rest, ['admin', 'maintenance']) && method === 'GET') {
    if (!isAdmin(db, req)) return fail('Нет доступа', 403)
    return ok({ on: setting(db, 'maintenance', '') === '1' })
  }

  return fail('Маршрут не найден', 404)
}

function eq(parts: string[], expected: string[]) {
  return parts.length === expected.length && parts.every((item, i) => item === expected[i])
}

async function authRegister(db: Db, req: Request) {
  const body = await readJson(req)
  const email = String(body.email || '').trim().toLowerCase()
  const username = cleanUsername(body.username)
  const password = String(body.password || '')
  const display = String(body.displayName || '').trim() || username
  if (!email.includes('@') || !email.includes('.')) throw new Error('Некорректная почта')
  if (username.length < 3) throw new Error('Ник — от 3 символов, латиница')
  if (password.length < 6) throw new Error('Пароль — от 6 символов')
  if (get(db, 'SELECT 1 AS ok FROM users WHERE email = ?', email)) throw new Error('Эта почта уже занята')
  const taken = get(db, 'SELECT * FROM users WHERE username = ?', username)
  if (taken && (taken.email || taken.password_hash)) throw new Error('Этот ник уже занят')
  if (taken) {
    run(
      db,
      'UPDATE users SET email = ?, display_name = ?, password_hash = ?, provider = ? WHERE id = ?',
      email,
      display,
      hashSecret(password),
      'email',
      taken.id,
    )
    const sess = createSession(db, String(taken.id))
    const user = get(db, 'SELECT * FROM users WHERE id = ?', taken.id)
    return ok({ user: userPublic(user) }, 200, [sessionCookie(req, sess)])
  }
  const uid = token(16)
  run(
    db,
    `INSERT INTO users (id, email, username, display_name, password_hash, provider, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    uid,
    email,
    username,
    display,
    hashSecret(password),
    'email',
    nowIso(),
  )
  if (!get(db, 'SELECT 1 AS ok FROM profiles WHERE username = ?', username)) {
    const profile = {
      username,
      display_name: display,
      bio: '',
      bg_type: 'color',
      bg_color: '#000000',
      name_color: '#ffffff',
      created_at: nowIso(),
    }
    run(db, 'INSERT INTO profiles (username, data, updated_at) VALUES (?, ?, ?)', username, JSON.stringify(profile), nowIso())
  }
  const sess = createSession(db, uid)
  const user = get(db, 'SELECT * FROM users WHERE id = ?', uid)
  return ok({ user: userPublic(user) }, 200, [sessionCookie(req, sess)])
}

async function authLogin(db: Db, req: Request) {
  const body = await readJson(req)
  const login = String(body.login || '')
  const password = String(body.password || '')
  const row = findUser(db, login)
  if (row) {
    if (!password) throw new Error('Введи пароль')
    if (String(row.password_hash) !== hashSecret(password)) throw new Error('Неверная почта или пароль')
    const sess = createSession(db, String(row.id))
    return ok({ user: userPublic(row) }, 200, [sessionCookie(req, sess)])
  }
  const name = cleanUsername(login)
  const profile = get(db, 'SELECT data FROM profiles WHERE username = ?', name)
  if (profile && !get(db, 'SELECT 1 AS ok FROM users WHERE username = ?', name)) {
    let data: Record<string, unknown> = {}
    try {
      data = JSON.parse(String(profile.data || '{}')) as Record<string, unknown>
    } catch {
      data = {}
    }
    const uid = token(16)
    run(
      db,
      `INSERT INTO users (id, email, username, display_name, password_hash, provider, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      uid,
      null,
      name,
      data.display_name || name,
      null,
      'local',
      nowIso(),
    )
    const sess = createSession(db, uid)
    const user = get(db, 'SELECT * FROM users WHERE id = ?', uid)
    return ok({ user: userPublic(user) }, 200, [sessionCookie(req, sess)])
  }
  throw new Error('Карточка не найдена. Проверь ник или создай аккаунт')
}

async function authResetRequest(db: Db, req: Request) {
  const body = await readJson(req)
  const row = findUser(db, body.login)
  if (!row) throw new Error('Аккаунт с такой почтой или ником не найден')
  if (!row.email) throw new Error('К этой карточке почта не привязана — войди по нику')
  if (!row.password_hash) throw new Error('У этой карточки нет пароля')
  const code = String(100000 + Math.floor(Math.random() * 900000))
  const until = Date.now() + 15 * 60 * 1000
  run(db, 'UPDATE users SET reset_hash = ?, reset_until = ? WHERE id = ?', hashSecret(code), until, row.id)
  const email = String(row.email)
  const [name, domain] = email.split('@')
  const masked = `${name.slice(0, 2)}${'•'.repeat(Math.max(name.length - 2, 1))}@${domain}`
  const text = `Код восстановления доступа Art Star: ${code}\nИмя пользователя: @${row.username}\nСрок действия — 15 минут.\n`
  enqueueMail(db, email, 'Восстановление доступа — Art Star', text, 'reset')
  return ok({ email: masked, username: row.username })
}

async function authResetConfirm(db: Db, req: Request) {
  const body = await readJson(req)
  const row = findUser(db, body.login)
  if (!row || !row.reset_hash) throw new Error('Сначала запроси код')
  if (Date.now() > Number(row.reset_until || 0)) throw new Error('Код истёк. Запроси новый')
  const password = String(body.password || '')
  if (password.length < 6) throw new Error('Пароль — от 6 символов')
  if (hashSecret(String(body.code || '')) !== String(row.reset_hash)) throw new Error('Неверный код')
  run(db, 'UPDATE users SET password_hash = ?, reset_hash = NULL, reset_until = NULL WHERE id = ?', hashSecret(password), row.id)
  return ok({ username: row.username })
}

async function authResume(db: Db, req: Request) {
  const { row } = current(db, req)
  if (row) return ok({ user: userPublic(row) })
  const body = await readJson(req)
  const name = cleanUsername(body.username)
  if (name.length < 3) return fail('Необходима авторизация', 401)
  let user = findUser(db, name)
  if (!user) {
    const profile = get(db, 'SELECT data FROM profiles WHERE username = ?', name)
    if (!profile) return fail('Необходима авторизация', 401)
    let data: Record<string, unknown> = {}
    try {
      data = JSON.parse(String(profile.data || '{}')) as Record<string, unknown>
    } catch {
      data = {}
    }
    const uid = token(16)
    run(
      db,
      `INSERT INTO users (id, email, username, display_name, password_hash, provider, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      uid,
      null,
      name,
      data.display_name || name,
      null,
      'local',
      nowIso(),
    )
    user = get(db, 'SELECT * FROM users WHERE id = ?', uid)
  }
  const sess = createSession(db, String(user?.id))
  return ok({ user: userPublic(user) }, 200, [sessionCookie(req, sess)])
}

function profilesList(db: Db) {
  const items: unknown[] = []
  for (const row of all(db, 'SELECT username, data, updated_at FROM profiles')) {
    let data: Record<string, unknown>
    try {
      data = JSON.parse(String(row.data || '{}')) as Record<string, unknown>
    } catch {
      data = { username: row.username }
    }
    data.updated_at = row.updated_at
    items.push(data)
  }
  return ok({ profiles: items })
}

function profileGet(db: Db, username: string) {
  const name = username.trim().toLowerCase()
  const row = get(db, 'SELECT data FROM profiles WHERE username = ?', name)
  if (!row) return fail('Профиль не найден', 404)
  const premium = get(db, 'SELECT 1 AS ok FROM premium WHERE username = ? AND active = 1', name)
  const verified = get(db, 'SELECT 1 AS ok FROM verified WHERE username = ?', name)
  return ok({
    profile: JSON.parse(String(row.data)),
    premium: Boolean(premium),
    verified: Boolean(verified),
  })
}

async function profilePut(db: Db, req: Request, username: string) {
  const name = username.trim().toLowerCase()
  const { row } = current(db, req)
  if (!row || String(row.username) !== name) {
    if (!isAdmin(db, req)) {
      if (!(row && !get(db, 'SELECT 1 AS ok FROM users WHERE username = ?', name))) {
        return fail('Нет доступа', 403)
      }
      const old = String(row.username)
      run(db, 'UPDATE users SET username = ? WHERE id = ?', name, row.id)
      run(db, 'UPDATE premium SET username = ? WHERE username = ?', name, old)
      run(db, 'UPDATE verified SET username = ? WHERE username = ?', name, old)
      run(db, 'DELETE FROM profiles WHERE username = ?', old)
    }
  }
  const body = await readJson(req)
  const profile = (body.profile && typeof body.profile === 'object' ? body.profile : body) as Record<string, unknown>
  profile.username = name
  if (row) {
    const shown = String(profile.display_name || row.display_name || name)
    run(db, 'UPDATE users SET display_name = ? WHERE id = ?', shown, row.id)
  }
  const payload = JSON.stringify(profile)
  if (get(db, 'SELECT 1 AS ok FROM profiles WHERE username = ?', name)) {
    run(db, 'UPDATE profiles SET data = ?, updated_at = ? WHERE username = ?', payload, nowIso(), name)
  } else {
    run(db, 'INSERT INTO profiles (username, data, updated_at) VALUES (?, ?, ?)', name, payload, nowIso())
  }
  return ok({ profile })
}

function profileDelete(db: Db, req: Request, username: string) {
  if (!isAdmin(db, req)) return fail('Нет доступа', 403)
  const name = username.trim().toLowerCase()
  const actor = adminName(db, req)
  const uid = get(db, 'SELECT id FROM users WHERE username = ?', name)
  if (uid) run(db, 'DELETE FROM sessions WHERE user_id = ?', uid.id)
  run(db, 'DELETE FROM profiles WHERE username = ?', name)
  run(db, 'DELETE FROM premium WHERE username = ?', name)
  run(db, 'DELETE FROM verified WHERE username = ?', name)
  run(db, 'DELETE FROM developers WHERE username = ?', name)
  run(db, 'DELETE FROM user_notes WHERE username = ?', name)
  run(db, 'DELETE FROM users WHERE username = ?', name)
  logAdmin(db, actor, 'user_delete', name)
  return ok()
}

async function premiumSet(db: Db, req: Request, active: boolean) {
  const body = await readJson(req)
  const { row } = current(db, req)
  let name = String(body.username || '').trim().toLowerCase()
  if (!name) name = row ? String(row.username) : ''
  if (!name) throw new Error('Нужен аккаунт')
  const allowed = isAdmin(db, req) || (row && String(row.username) === name && active)
  if (!allowed) return fail('Нет доступа', 403)
  if (active) {
    run(
      db,
      `INSERT INTO premium (username, active, plan, price, bought_at)
       VALUES (?, 1, ?, ?, ?)
       ON CONFLICT(username) DO UPDATE SET active = 1, plan = excluded.plan, price = excluded.price, bought_at = excluded.bought_at`,
      name,
      'lifetime',
      499,
      nowIso(),
    )
  } else {
    run(db, 'DELETE FROM premium WHERE username = ?', name)
  }
  if (isAdmin(db, req)) logAdmin(db, adminName(db, req), active ? 'premium_on' : 'premium_off', name)
  return ok({ active, username: name })
}

async function verifiedSet(db: Db, req: Request, active: boolean) {
  if (!isAdmin(db, req)) return fail('Нет доступа', 403)
  const body = await readJson(req)
  const name = String(body.username || '').trim().toLowerCase()
  if (!name) throw new Error('Нужен ник')
  if (active) {
    run(
      db,
      'INSERT INTO verified (username, granted_at) VALUES (?, ?) ON CONFLICT(username) DO UPDATE SET granted_at = excluded.granted_at',
      name,
      nowIso(),
    )
  } else {
    run(db, 'DELETE FROM verified WHERE username = ?', name)
  }
  logAdmin(db, adminName(db, req), active ? 'verified_on' : 'verified_off', name)
  return ok({ active, username: name })
}

async function pay(db: Db, req: Request) {
  const { row } = current(db, req)
  if (!row) return fail('Необходима авторизация', 401)
  const username = String(row.username)
  if (get(db, 'SELECT 1 AS ok FROM premium WHERE username = ? AND active = 1', username)) {
    return ok({ already: true, username })
  }
  const pending = get(
    db,
    "SELECT id FROM payments WHERE username = ? AND status = 'pending' ORDER BY created_at DESC",
    username,
  )
  if (pending) return ok({ paymentId: pending.id, status: 'pending', username })
  const body = await readJson(req)
  const method = String(body.method || 'transfer')
  const note = String(body.note || '').slice(0, 500)
  const pid = token(12)
  run(
    db,
    'INSERT INTO payments (id, username, amount, method, status, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    pid,
    username,
    499,
    method,
    'pending',
    note,
    nowIso(),
  )
  return ok({ paymentId: pid, status: 'pending', username })
}

function payStatus(db: Db, req: Request) {
  const { row } = current(db, req)
  if (!row) return fail('Необходима авторизация', 401)
  const username = String(row.username)
  const premium = get(db, 'SELECT 1 AS ok FROM premium WHERE username = ? AND active = 1', username)
  const payRow = get(db, 'SELECT * FROM payments WHERE username = ? ORDER BY created_at DESC', username)
  return ok({
    premium: Boolean(premium),
    payment: payRow
      ? {
        id: payRow.id,
        status: payRow.status,
        method: payRow.method,
        created_at: payRow.created_at,
      }
      : null,
  })
}

async function mediaUpload(db: Db, req: Request) {
  const { row } = current(db, req)
  if (!row) return fail('Необходима авторизация', 401)
  const buf = Buffer.from(await req.arrayBuffer())
  if (!buf.length || buf.length > 220 * 1024 * 1024) throw new Error('Файл слишком большой или пуст')
  const kind = String(req.headers.get('x-media-kind') || 'file').replace(/[^a-zA-Z0-9]/g, '') || 'file'
  const name = String(req.headers.get('x-media-name') || 'file').replace(/[\\/]/g, '').slice(0, 120) || 'file'
  const mime = (req.headers.get('content-type') || 'application/octet-stream').split(';')[0]
  const mid = token(16)
  const ext = (extname(name) || '').slice(0, 8)
  mkdirSync(MEDIA_DIR, { recursive: true })
  const rel = `${mid}${ext}`
  writeFileSync(join(MEDIA_DIR, rel), buf)
  run(
    db,
    `INSERT INTO media (id, username, kind, name, mime, path, size, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    mid,
    row.username,
    kind,
    name,
    mime,
    rel,
    buf.length,
    nowIso(),
  )
  return ok({
    id: mid,
    url: `/api/media/${mid}`,
    ref: `media:${mid}`,
    name,
    size: buf.length,
    type: mime,
  })
}

function mediaGet(db: Db, mid: string) {
  const row = get(db, 'SELECT * FROM media WHERE id = ?', mid)
  if (!row) return fail('Файл не найден', 404)
  const path = join(MEDIA_DIR, String(row.path))
  if (!existsSync(path)) return fail('Файл не найден', 404)
  const body = readFileSync(path)
  const type = String(row.mime || 'application/octet-stream')
  return { kind: 'bin' as const, status: 200, body, type }
}

async function reportsList(db: Db, req: Request) {
  if (!isAdmin(db, req)) return fail('Нет доступа', 403)
  const items = all(db, 'SELECT * FROM reports ORDER BY created_at DESC').map((row) => ({
    id: row.id,
    username: row.username,
    code: row.code,
    message: row.message,
    unread: Boolean(row.unread),
    status: row.status || 'open',
    resolution: row.resolution || '',
    reply: row.reply || '',
    created_at: row.created_at,
  }))
  return ok({ reports: items })
}

async function reportsAdd(db: Db, req: Request) {
  const body = await readJson(req)
  const { row } = current(db, req)
  const username = (row ? String(row.username) : '') || String(body.username || '')
  const rid = token(10)
  run(
    db,
    'INSERT INTO reports (id, username, code, message, unread, created_at) VALUES (?, ?, ?, ?, 1, ?)',
    rid,
    username,
    String(body.code || ''),
    String(body.message || ''),
    nowIso(),
  )
  return ok({ id: rid })
}

async function reportPatch(db: Db, req: Request, rid: string) {
  if (!isAdmin(db, req)) return fail('Нет доступа', 403)
  const body = await readJson(req)
  const row = get(db, 'SELECT * FROM reports WHERE id = ?', rid)
  if (!row) return fail('Жалоба не найдена', 404)
  const actor = adminName(db, req)
  const unread = body.unread === false || body.status === 'closed' ? 0 : row.unread
  const status = String(body.status || row.status || 'open')
  const resolution = String('resolution' in body ? body.resolution : row.resolution || '')
  const reply = String('reply' in body ? body.reply : row.reply || '')
  run(db, 'UPDATE reports SET unread = ?, status = ?, resolution = ?, reply = ? WHERE id = ?', unread, status, resolution, reply, rid)
  if (body.hide_profile && row.username) {
    hideProfile(db, String(row.username), true)
    logAdmin(db, actor, 'report_hide', String(row.username), rid)
  }
  logAdmin(db, actor, 'report_update', rid, status)
  return ok()
}

async function developerSet(db: Db, req: Request, active: boolean) {
  if (!isAdmin(db, req)) return fail('Нет доступа', 403)
  const body = await readJson(req)
  const name = String(body.username || '').trim().toLowerCase()
  if (!name) throw new Error('Нужен ник')
  const actor = adminName(db, req)
  if (active) {
    run(
      db,
      'INSERT INTO developers (username, granted_at) VALUES (?, ?) ON CONFLICT(username) DO UPDATE SET granted_at = excluded.granted_at',
      name,
      nowIso(),
    )
    logAdmin(db, actor, 'developer_grant', name)
  } else {
    run(db, 'DELETE FROM developers WHERE username = ?', name)
    logAdmin(db, actor, 'developer_revoke', name)
  }
  return ok({ active, username: name })
}

async function adminLogin(db: Db, req: Request) {
  const body = await readJson(req)
  const login = String(body.login || '').trim().toLowerCase()
  const password = String(body.password || '')
  if (login !== ADMIN_LOGIN || password !== ADMIN_PASSWORD) return fail('Неверный логин или пароль', 403)
  const admin = get(db, 'SELECT id FROM users WHERE username = ?', 'mefadmin')
  if (!admin) throw new Error('Админ не настроен')
  const sess = createSession(db, String(admin.id), 'admin')
  return ok({}, 200, [adminCookie(req, sess)])
}

function sync(db: Db, req: Request) {
  const { row } = current(db, req)
  const developers: Record<string, unknown> = {}
  for (const item of all(db, 'SELECT username, granted_at FROM developers')) {
    developers[String(item.username)] = { active: true, grantedAt: item.granted_at }
  }
  const verified: Record<string, unknown> = {}
  for (const item of all(db, 'SELECT username, granted_at FROM verified')) {
    verified[String(item.username)] = { active: true, grantedAt: item.granted_at }
  }
  return ok({
    user: userPublic(row),
    premium: premiumMap(db),
    verified,
    developers,
  })
}

function adminUsers(db: Db, req: Request) {
  if (!isAdmin(db, req)) return fail('Нет доступа', 403)
  const items = []
  for (const row of all(db, 'SELECT * FROM users ORDER BY created_at DESC')) {
    const prem = get(db, 'SELECT 1 AS ok FROM premium WHERE username = ? AND active = 1', row.username)
    const ver = get(db, 'SELECT 1 AS ok FROM verified WHERE username = ?', row.username)
    const dev = get(db, 'SELECT 1 AS ok FROM developers WHERE username = ?', row.username)
    const card = get(db, 'SELECT data FROM profiles WHERE username = ?', row.username)
    let hidden = false
    if (card) {
      try {
        hidden = Boolean((JSON.parse(String(card.data)) as { hidden?: boolean }).hidden)
      } catch {
        hidden = false
      }
    }
    items.push({
      ...userPublic(row),
      premium: Boolean(prem),
      verified: Boolean(ver),
      developer: Boolean(dev),
      note: row.note || '',
      hidden,
    })
  }
  return ok({ users: items })
}

async function adminUserAction(db: Db, req: Request, username: string, action: string) {
  if (!isAdmin(db, req)) return fail('Нет доступа', 403)
  const name = username.trim().toLowerCase()
  const body = await readJson(req)
  const actor = adminName(db, req)
  const user = get(db, 'SELECT * FROM users WHERE username = ?', name)
  if (action === 'password') {
    if (!user) throw new Error('Аккаунт не найден')
    let password = String(body.password || '')
    if (password.length < 6) password = token(8)
    run(db, 'UPDATE users SET password_hash = ? WHERE username = ?', hashSecret(password), name)
    logAdmin(db, actor, 'password_reset', name)
    return ok({ password, username: name })
  }
  if (action === 'rename') {
    const next = renameUser(db, name, body.username)
    logAdmin(db, actor, 'rename', name, next)
    return ok({ username: next, from: name })
  }
  if (action === 'note') {
    const note = String(body.note || '').slice(0, 2000)
    if (user) run(db, 'UPDATE users SET note = ? WHERE username = ?', note, name)
    run(
      db,
      'INSERT INTO user_notes (username, note, updated_at) VALUES (?, ?, ?) ON CONFLICT(username) DO UPDATE SET note = excluded.note, updated_at = excluded.updated_at',
      name,
      note,
      nowIso(),
    )
    logAdmin(db, actor, 'note', name)
    return ok()
  }
  if (action === 'hide') {
    const hidden = Boolean(body.hidden)
    hideProfile(db, name, hidden)
    logAdmin(db, actor, hidden ? 'hide' : 'show', name)
    return ok({ hidden })
  }
  return fail('Неизвестное действие', 400)
}

function adminLog(db: Db, req: Request) {
  if (!isAdmin(db, req)) return fail('Нет доступа', 403)
  const log = all(db, 'SELECT * FROM admin_log ORDER BY created_at DESC LIMIT 200')
  return ok({ log })
}

function adminMail(db: Db, req: Request) {
  if (!isAdmin(db, req)) return fail('Нет доступа', 403)
  const mail = all(db, 'SELECT * FROM mail_outbox ORDER BY created_at DESC LIMIT 100').map((row) => ({
    ...row,
    sent: Boolean(row.sent),
  }))
  return ok({ mail })
}

function adminPayments(db: Db, req: Request) {
  if (!isAdmin(db, req)) return fail('Нет доступа', 403)
  const payments = all(db, 'SELECT * FROM payments ORDER BY created_at DESC LIMIT 200')
  return ok({ payments })
}

function adminPaymentAction(db: Db, req: Request, pid: string, action: string) {
  if (!isAdmin(db, req)) return fail('Нет доступа', 403)
  const row = get(db, 'SELECT * FROM payments WHERE id = ?', pid)
  if (!row) return fail('Платёж не найден', 404)
  const actor = adminName(db, req)
  if (action === 'confirm') {
    run(db, "UPDATE payments SET status = 'paid' WHERE id = ?", pid)
    run(
      db,
      `INSERT INTO premium (username, active, plan, price, bought_at)
       VALUES (?, 1, ?, ?, ?)
       ON CONFLICT(username) DO UPDATE SET active = 1, plan = excluded.plan, price = excluded.price, bought_at = excluded.bought_at`,
      row.username,
      'lifetime',
      499,
      nowIso(),
    )
    logAdmin(db, actor, 'pay_confirm', String(row.username), pid)
    return ok({ status: 'paid' })
  }
  if (action === 'reject') {
    run(db, "UPDATE payments SET status = 'rejected' WHERE id = ?", pid)
    logAdmin(db, actor, 'pay_reject', String(row.username), pid)
    return ok({ status: 'rejected' })
  }
  return fail('Неизвестное действие', 400)
}

async function adminExport(db: Db, req: Request) {
  if (!isAdmin(db, req)) return fail('Нет доступа', 403)
  const zip = new JSZip()
  const profiles: unknown[] = []
  for (const row of all(db, 'SELECT username, data, updated_at FROM profiles')) {
    let data: Record<string, unknown>
    try {
      data = JSON.parse(String(row.data || '{}')) as Record<string, unknown>
    } catch {
      data = { username: row.username }
    }
    data.updated_at = row.updated_at
    profiles.push(data)
  }
  const users = all(db, 'SELECT * FROM users').map((row) => userPublic(row))
  zip.file('profiles.json', JSON.stringify(profiles, null, 2))
  zip.file('users.json', JSON.stringify(users, null, 2))
  mkdirSync(MEDIA_DIR, { recursive: true })
  for (const name of readdirSync(MEDIA_DIR)) {
    const path = join(MEDIA_DIR, name)
    zip.file(`media/${name}`, readFileSync(path))
  }
  const body = Buffer.from(await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
  logAdmin(db, adminName(db, req), 'export', '', String(body.length))
  return { kind: 'bin' as const, status: 200, body, type: 'application/zip', filename: 'artstar-export.zip' }
}

async function adminMaintenance(db: Db, req: Request) {
  if (!isAdmin(db, req)) return fail('Нет доступа', 403)
  const body = await readJson(req)
  const on = Boolean(body.on)
  setSetting(db, 'maintenance', on ? '1' : '0')
  logAdmin(db, adminName(db, req), 'maintenance', '', on ? 'on' : 'off')
  return ok({ on })
}
