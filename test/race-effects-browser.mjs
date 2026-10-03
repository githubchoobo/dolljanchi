import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { makeRaceScene, people, items } from '../lib/game.mjs';
import assert from 'node:assert/strict';

const dir = resolve('test-results', `effects-${Date.now()}`); mkdirSync(dir, { recursive: true });
const base = 'http://localhost:3105';
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '3105', DATA_DIR: dir, ADMIN_PASSWORD: 'effects-test-only' }, stdio: 'ignore' });
let browser;
try {
  for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/state'); break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  const source = new DatabaseSync('data/party.sqlite', { readOnly: true });
  const db = new DatabaseSync(resolve(dir, 'party.sqlite'));
  for (const p of source.prepare('SELECT * FROM photos').all()) db.prepare('INSERT OR REPLACE INTO photos VALUES (?,?)').run(p.personId, p.image);
  source.close(); db.close();
  const initial = await (await fetch(base + '/api/state')).json();
  const ids = ['p1', 'p2', 'p3', 'p4'];
  const scene = makeRaceScene(ids, 'p2', () => 0);
  const fixture = { ...initial, phase: 'racing', people, items, result: 'book', votes: ids.map(personId => ({ personId, itemId: 'book' })), race: { ...scene, candidates: ids, reason: 'correct', duration: 18000 } };
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let elapsed = 1000;
  await page.route('**/api/state', route => route.fulfill({ json: { ...fixture, serverTime: Date.now(), race: { ...fixture.race, startsAt: Date.now() - elapsed } } }));
  await page.goto(base); await page.locator('.runner.running').first().waitFor();
  const leg = page.locator('.runner .leg-left').first();
  assert.equal(await leg.evaluate(el => getComputedStyle(el).animationName), 'runner-leg');
  const face = page.locator('.runner .char-head').first();
  assert.equal(await face.evaluate(el => getComputedStyle(el).animationName), 'none');
  for (const event of scene.events) {
    if (event.type !== 'fall') {
      elapsed = event.at + 150;
      await page.reload(); await page.locator(`.projectile-${event.type}:not([hidden])`).waitFor();
      await page.screenshot({ path: `test-results/race-${event.type}-throw.png` });
    }
    elapsed = event.hitAt + 180;
    await page.reload();
    const expected = event.type === 'net' ? 'trapped' : event.type === 'bomb' ? 'bombed' : 'fallen';
    await expect(page.locator(`[data-runner="${event.targetId}"]`)).toHaveAttribute('data-race-action', expected);
    if (event.type === 'net') await expect(page.locator(`[data-runner="${event.targetId}"] .runner-net`)).toBeVisible();
    await page.screenshot({ path: `test-results/race-${event.type}-hit.png` });
  }
  elapsed = 17100; await page.reload(); await page.locator('.runner.running').first().waitFor();
  assert.equal(await page.locator('[data-race-action="trapped"], [data-race-action="fallen"], [data-race-action="bombed"]').count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  elapsed = scene.events.find(e => e.type === 'net').hitAt + 180; await page.reload(); await page.locator('[data-race-action="trapped"]').waitFor();
  await page.screenshot({ path: 'test-results/race-pranks-mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log('Race effects passed: running limbs, fixed face, bomb/net/trip flights, hit reactions, solo fall, recovery, mobile layout.');
} finally { await browser?.close(); server.kill(); }
