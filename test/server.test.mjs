import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dir = resolve('test-results', `api-${Date.now()}`);
mkdirSync(dir, { recursive: true });
let server, cookie;
const base = 'http://localhost:3101';
const token = 'a'.repeat(48);
async function request(path, body, authorized = false, headers = {}) {
  const response = await fetch(base + '/api/' + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(authorized ? { Cookie: cookie } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json(), headers: response.headers };
}
const action = body => request('admin/action', body, true);
async function start() {
  server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '3101', DATA_DIR: dir, ADMIN_PASSWORD: 'test-password-only' }, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { if ((await request('state')).status === 200) return; } catch {} await new Promise(r => setTimeout(r, 100)); }
  throw Error('Test server did not start');
}
async function stop() { const done = new Promise(r => server.once('exit', r)); server.kill(); await done; }
before(async () => { await start(); const login = await request('admin/login', { password: 'test-password-only' }); assert.equal(login.status, 200); cookie = login.headers.get('set-cookie').split(';')[0]; });
after(async () => { await stop(); });
test('backend authorization, durable voting, lifecycle and all outcome branches', async t => {
  await t.test('all admin mutations require authentication', async () => {
    assert.equal((await request('admin/action', { action: 'close' })).status, 401);
    assert.equal((await request('admin/photo', { personId: 'p1', image: null })).status, 401);
    assert.equal((await request('admin/url', { url: 'https://example.com' })).status, 401);
    assert.equal((await request('admin/login', { password: 'wrong' })).status, 401);
    assert.equal((await request('admin/action', { action: 'close' }, true, { Origin: 'https://untrusted.example' })).status, 403);
  });
  await t.test('invalid items and empty outcomes are rejected', async () => {
    assert.equal((await request('vote', { personId: 'p1', itemId: 'invalid', token })).status, 400);
    assert.equal((await action({ action: 'result', itemId: 'book' })).status, 409);
    assert.equal((await action({ action: 'start' })).status, 409);
  });
  await t.test('vote ownership prevents duplicate claims and allows changes', async () => {
    assert.equal((await request('vote', { personId: 'p1', itemId: 'book', token })).status, 200);
    assert.equal((await request('vote', { personId: 'p1', itemId: 'coin', token: 'b'.repeat(48) })).status, 409);
    assert.equal((await request('vote', { personId: 'p1', itemId: 'brush', token })).status, 200);
    const state = (await request('state')).data; assert.equal(state.votes.length, 1); assert.equal(state.votes[0].itemId, 'brush'); assert.equal(state.votes[0].tokenHash, undefined);
  });
  await t.test('votes and admin sessions survive restarting the server', async () => {
    await stop(); await start(); assert.equal((await request('state')).data.votes.length, 1);
    assert.equal((await request('admin/session', undefined, true)).data.authenticated, true);
  });
  await t.test('closed voting is enforced at the server and can reopen', async () => {
    assert.equal((await action({ action: 'close' })).status, 200);
    assert.equal((await request('vote', { personId: 'p2', itemId: 'book', token })).status, 409);
    assert.equal((await action({ action: 'reopen' })).status, 200);
    assert.equal((await request('vote', { personId: 'p2', itemId: 'book', token })).status, 200);
  });
  await t.test('only one correct answer immediately creates a stable winner', async () => {
    await action({ action: 'result', itemId: 'brush' }); await action({ action: 'start' });
    const state = (await request('state')).data; assert.equal(state.phase, 'finished'); assert.equal(state.race.winnerId, 'p1');
    assert.equal((await action({ action: 'start' })).status, 409); assert.equal((await action({ action: 'result', itemId: 'book' })).status, 409);
  });
  await t.test('reset requires the exact confirmation and creates a new round', async () => {
    const prior = (await request('state')).data.round;
    assert.equal((await action({ action: 'reset' })).status, 409);
    await action({ action: 'reset', confirm: '새로 시작' }); const state = (await request('state')).data;
    assert.equal(state.votes.length, 0); assert.equal(state.phase, 'voting'); assert.notEqual(state.round, prior);
  });
  await t.test('multiple winners race once and results persist through restart', async () => {
    await request('vote', { personId: 'p1', itemId: 'coin', token }); await request('vote', { personId: 'p2', itemId: 'coin', token });
    await action({ action: 'result', itemId: 'coin' });
    const results = await Promise.all([action({ action: 'start' }), action({ action: 'start' })]); assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    const during = (await request('state')).data; assert.equal(during.phase, 'racing'); assert.equal(during.race.winnerId, undefined); assert.equal(during.race.reason, 'correct');
    await stop(); await start(); assert.deepEqual((await request('state')).data.race.tracks, during.race.tracks);
    // Advance the persisted schedule to test recovery after the finish time without waiting 22 seconds.
    const db = new DatabaseSync(resolve(dir, 'party.sqlite')); const game = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='game'").get().value); game.race.startsAt = Date.now() - 30000;
    db.prepare("UPDATE settings SET value=? WHERE key='game'").run(JSON.stringify(game)); db.close();
    const done = (await request('state')).data; assert.equal(done.phase, 'finished'); assert.ok(['p1', 'p2'].includes(done.race.winnerId));
  });
  await t.test('no correct prediction admits every voter', async () => {
    await action({ action: 'reset', confirm: '새로 시작' });
    await request('vote', { personId: 'p1', itemId: 'coin', token }); await request('vote', { personId: 'p2', itemId: 'brush', token });
    await action({ action: 'result', itemId: 'gavel' }); await action({ action: 'start' }); const state = (await request('state')).data;
    assert.equal(state.race.reason, 'everyone'); assert.deepEqual(state.race.candidates, ['p1', 'p2']);
  });
  await t.test('QR renders locally and uses the configured public address', async () => {
    assert.equal((await request('admin/url', { url: 'javascript:alert(1)' }, true)).status, 400);
    await request('admin/url', { url: 'https://party.example' }, true);
    assert.equal((await request('state')).data.joinUrl, 'https://party.example/join');
    const qr = await fetch(base + '/api/qr'); assert.equal(qr.status, 200); assert.match(await qr.text(), /<svg/);
  });
  await t.test('logout invalidates the session', async () => {
    await request('admin/logout', {}, true); assert.equal((await request('admin/session', undefined, true)).data.authenticated, false);
  });
});
