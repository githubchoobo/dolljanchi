import express from 'express';
import QRCode from 'qrcode';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { people, items, decide, makeRaceScene } from './lib/game.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(process.env.DATA_DIR || resolve(root, 'data'));
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(resolve(dataDir, 'party.sqlite'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS votes (personId TEXT PRIMARY KEY, itemId TEXT NOT NULL, tokenHash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS photos (personId TEXT PRIMARY KEY, image TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (tokenHash TEXT PRIMARY KEY, expires INTEGER NOT NULL);`);
const get = key => { const row = db.prepare('SELECT value FROM settings WHERE key=?').get(key); return row ? JSON.parse(row.value) : null; };
const set = (key, value) => db.prepare('INSERT OR REPLACE INTO settings VALUES (?,?)').run(key, JSON.stringify(value));
const hash = str => createHash('sha256').update(str).digest('hex');
const initial = () => ({ phase: 'voting', result: null, race: null, round: randomBytes(8).toString('hex') });
if (!get('game')) set('game', initial());
if (!get('password')) {
  const password = process.env.ADMIN_PASSWORD || randomBytes(9).toString('base64url');
  const salt = randomBytes(16).toString('hex');
  set('password', { salt, digest: scryptSync(password, salt, 64).toString('hex') });
  if (!process.env.ADMIN_PASSWORD) writeFileSync(resolve(dataDir, 'admin-password.txt'), `진행자 관리자 비밀번호: ${password}\n관리자 주소: /admin\n외부에 공유하지 마세요.\n`, { mode: 0o600 });
}
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" });
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({ error: '같은 사이트에서 다시 시도해주세요.' });
  next();
});
app.use(express.json({ limit: '600kb' }));
const fail = (res, status, error) => res.status(status).json({ error });
function session(req) {
  const token = /(?:^|; )party_admin=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  return token && db.prepare('SELECT 1 FROM sessions WHERE tokenHash=? AND expires>?').get(hash(token), Date.now());
}
const admin = (req, res, next) => session(req) ? next() : fail(res, 401, '관리자 로그인이 필요합니다.');
function currentGame() {
  const game = get('game');
  if (game.phase === 'racing' && Date.now() >= game.race.startsAt + game.race.duration) { game.phase = 'finished'; set('game', game); }
  return game;
}
const votes = () => db.prepare('SELECT personId,itemId FROM votes').all();
const port = Number(process.env.PORT || 3000);
const lan = Object.values(networkInterfaces()).flat().find(n => n.family === 'IPv4' && !n.internal)?.address || 'localhost';
const joinUrl = () => `${(process.env.PUBLIC_URL || get('publicUrl') || `http://${lan}:${port}`).replace(/\/$/, '')}/join`;
function photoVersion(image) { return hash(image).slice(0, 16) + (image.startsWith('data:image/webp;') ? '.webp' : image.startsWith('data:image/png;') ? '.png' : '.jpg'); }
function snapshot() {
  const game = currentGame();
  const safe = structuredClone(game);
  if (safe.phase !== 'finished' && safe.race) delete safe.race.winnerId;
  return { ...safe, people, items, votes: votes(), photos: Object.fromEntries(db.prepare('SELECT * FROM photos').all().map(p => [p.personId, `/api/photos/${p.personId}/${photoVersion(p.image)}`])), serverTime: Date.now(), joinUrl: joinUrl() };
}
app.get('/api/photos/:personId/:version', (req, res) => {
  const photo = db.prepare('SELECT image FROM photos WHERE personId=?').get(req.params.personId);
  if (!photo || req.params.version !== photoVersion(photo.image)) return res.sendStatus(404);
  const [metadata, encoded] = photo.image.split(',');
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.type(metadata.slice(5).split(';')[0]).send(Buffer.from(encoded, 'base64'));
});
app.get('/api/state', (req, res) => res.json(snapshot()));
app.get('/api/qr', async (req, res, next) => { try { res.type('svg').send(await QRCode.toString(joinUrl(), { type: 'svg', margin: 2, color: { dark: '#254E44', light: '#FFFFFF' } })); } catch (e) { next(e); } });
app.post('/api/vote', (req, res) => {
  const { personId, itemId, token } = req.body || {};
  if (currentGame().phase !== 'voting') return fail(res, 409, '투표가 마감되었습니다. 행사 화면을 확인해주세요.');
  if (!people.some(p => p.id === personId) || !items.some(i => i.id === itemId) || typeof token !== 'string' || !/^[a-f0-9]{48}$/.test(token)) return fail(res, 400, '이름과 물품을 다시 선택해주세요.');
  const existing = db.prepare('SELECT tokenHash FROM votes WHERE personId=?').get(personId);
  if (existing && existing.tokenHash !== hash(token)) return fail(res, 409, '이미 참여한 이름입니다. 처음 투표한 기기에서 변경하거나 진행자 관리자에게 문의해주세요.');
  db.prepare('INSERT OR REPLACE INTO votes VALUES (?,?,?)').run(personId, itemId, hash(token));
  res.json({ ok: true });
});
const attempts = new Map();
setInterval(() => { for (const [ip, entry] of attempts) if (entry.until < Date.now()) attempts.delete(ip); db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now()); }, 60000).unref();
app.post('/api/admin/login', (req, res) => {
  const ip = req.socket.remoteAddress;
  const entry = attempts.get(ip) || { count: 0, until: Date.now() + 600000 };
  if (entry.count >= 10 && entry.until > Date.now()) return fail(res, 429, '로그인 시도가 많습니다. 10분 후 다시 시도해주세요.');
  const password = req.body?.password;
  if (typeof password !== 'string' || password.length > 256) return fail(res, 400, '비밀번호를 확인해주세요.');
  const saved = get('password');
  if (!timingSafeEqual(scryptSync(password, saved.salt, 64), Buffer.from(saved.digest, 'hex'))) { entry.count++; attempts.set(ip, entry); return fail(res, 401, '비밀번호가 맞지 않습니다.'); }
  attempts.delete(ip);
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions VALUES (?,?)').run(hash(token), Date.now() + 43200000);
  res.cookie('party_admin', token, { httpOnly: true, sameSite: 'strict', secure: req.secure || process.env.PUBLIC_URL?.startsWith('https://'), maxAge: 43200000 });
  res.json({ ok: true });
});
app.get('/api/admin/session', (req, res) => res.json({ authenticated: !!session(req) }));
app.post('/api/admin/logout', admin, (req, res) => { const token = /(?:^|; )party_admin=([^;]+)/.exec(req.headers.cookie || '')?.[1]; if (token) db.prepare('DELETE FROM sessions WHERE tokenHash=?').run(hash(token)); res.clearCookie('party_admin'); res.json({ ok: true }); });
app.post('/api/admin/action', admin, (req, res) => {
  const { action, itemId, personId } = req.body || {};
  const game = currentGame();
  if (action === 'close' && game.phase === 'voting') game.phase = 'closed';
  else if (action === 'reopen' && game.phase === 'closed') game.phase = 'voting';
  else if (action === 'result' && ['voting', 'closed', 'ready'].includes(game.phase)) {
    if (!items.some(i => i.id === itemId)) return fail(res, 400, '물품을 선택해주세요.');
    if (!votes().length) return fail(res, 409, '최소 한 명이 투표한 후 결과를 입력해주세요.');
    game.result = itemId; game.phase = 'ready';
  } else if (action === 'start' && game.phase === 'ready') {
    const result = decide(votes(), game.result);
    game.race = { ...result, startsAt: Date.now() + 3500, duration: 18000, ...makeRaceScene(result.candidates, result.winnerId) };
    game.phase = result.reason === 'single' ? 'finished' : 'racing';
  } else if (action === 'reset' && req.body.confirm === '새로 시작') {
    db.exec('BEGIN IMMEDIATE');
    try { db.exec('DELETE FROM votes'); set('game', initial()); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
    return res.json({ ok: true });
  } else if (action === 'release' && ['voting', 'closed'].includes(game.phase)) {
    db.prepare('DELETE FROM votes WHERE personId=?').run(personId || ''); return res.json({ ok: true });
  } else return fail(res, 409, '현재 진행 단계에서는 사용할 수 없는 기능입니다.');
  set('game', game); res.json({ ok: true });
});
app.post('/api/admin/photo', admin, (req, res) => {
  const { personId, image } = req.body || {};
  if (personId !== 'baby' && !people.some(p => p.id === personId)) return fail(res, 400, '등록되지 않은 이름입니다.');
  if (image === null) db.prepare('DELETE FROM photos WHERE personId=?').run(personId);
  else {
    if (typeof image !== 'string' || image.length > 500000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) return fail(res, 400, '작은 JPG, PNG, WebP 사진을 선택해주세요.');
    db.prepare('INSERT OR REPLACE INTO photos VALUES (?,?)').run(personId, image);
  }
  res.json({ ok: true });
});
app.post('/api/admin/url', admin, (req, res) => {
  try { const url = new URL(req.body.url); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error(); set('publicUrl', url.origin); res.json({ ok: true }); }
  catch { fail(res, 400, 'http:// 또는 https://로 시작하는 접속 주소를 입력해주세요.'); }
});
app.use(express.static(resolve(root, 'public')));
app.get(['/', '/join', '/admin'], (req, res) => res.sendFile(resolve(root, 'public/index.html')));
app.use((err, req, res, next) => { console.error(err.message); fail(res, err.status || 500, err.status === 413 ? '사진 용량이 너무 큽니다.' : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'); });
app.listen(port, '0.0.0.0', () => { console.log(`Baby birthday: http://localhost:${port}\nGuest QR: ${joinUrl()}\nAdmin: http://localhost:${port}/admin\nPassword: data/admin-password.txt (or your ADMIN_PASSWORD)`); });
