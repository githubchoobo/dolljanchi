import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

mkdirSync('test-results', { recursive: true });
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '3102', DATA_DIR: resolve('test-results', `browser-${Date.now()}`), ADMIN_PASSWORD: 'browser-test-only' }, stdio: 'ignore' });
let browser;
try {
  for (let i = 0; i < 80; i++) { try { await fetch('http://localhost:3102/api/state'); break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const display = await context.newPage(); display.on('pageerror', e => errors.push(e.message));
  await display.goto('http://localhost:3102'); await display.locator('.yard-station').first().waitFor();
  assert.equal(await display.locator('.yard-station').count(), 11);
  await display.screenshot({ path: 'test-results/display-desktop.png', fullPage: true });
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const guest = await mobile.newPage(); guest.on('pageerror', e => errors.push(e.message));
  await guest.goto('http://localhost:3102/join'); await guest.locator('#person-select').selectOption('p2');
  await guest.locator('input[value="book"]').check();
  await guest.screenshot({ path: 'test-results/vote-mobile.png', fullPage: true });
  await guest.getByRole('button', { name: '이 물건으로 정했어요' }).click(); await guest.waitForURL('http://localhost:3102/'); await guest.locator('.courtyard').waitFor();
  assert.match(await guest.locator('.cast-slot.is-me .char-name').innerText(), /참석자 2/);
  await guest.reload(); await guest.locator('.courtyard').waitFor();
  await guest.getByRole('link', { name: '선택 바꾸기' }).click();
  assert.equal(await guest.locator('#person-select').inputValue(), 'p2');
  await guest.locator('input[value="coin"]').check(); await guest.getByRole('button', { name: '이 물건으로 정했어요' }).click(); await guest.waitForURL('http://localhost:3102/'); await guest.locator('.courtyard').waitFor();
  await guest.screenshot({ path: 'test-results/saved-mobile.png', fullPage: true });
  await guest.close(); // An offline guest remains eligible.
  const admin = await context.newPage(); admin.on('pageerror', e => errors.push(e.message));
  await admin.goto('http://localhost:3102/admin'); await admin.locator('#password').fill('browser-test-only'); await admin.getByRole('button', { name: '관리자 입장' }).click(); await admin.locator('.admin-summary').waitFor();
  const testPhoto = await admin.locator('.brand-mark').screenshot();
  await admin.locator('[data-photo="p2"]').setInputFiles({ name: 'test-face.png', mimeType: 'image/png', buffer: testPhoto });
  await admin.locator('[data-remove-photo="p2"]').waitFor();
  assert.match((await (await context.request.get('http://localhost:3102/api/state')).json()).photos.p2, /^\/api\/photos\/p2\/.+\.jpg$/);
  await admin.locator('[data-remove-photo="p2"]').click();
  await admin.locator('[data-remove-photo="p2"]').waitFor({ state: 'detached' });
  for (let i = 1; i <= 17; i++) if (i !== 2) {
    const res = await context.request.post('http://localhost:3102/api/vote', { data: { personId: `p${i}`, itemId: ['coin','book','brush','thread','bow'][i % 5], token: i.toString(16).padStart(48, '0') } }); assert.equal(res.status(), 200);
  }
  await display.reload(); await display.locator('.yard-queue .character').first().waitFor();
  await display.screenshot({ path: 'test-results/display-family.png', fullPage: true });
  const phoneDisplay = await mobile.newPage(); await phoneDisplay.goto('http://localhost:3102'); await phoneDisplay.locator('.yard-queue .character').first().waitFor();
  for (const target of [display, phoneDisplay]) {
    const rows = await target.locator('.yard-station').evaluateAll(elements => {
      const counts = new Map(); for (const el of elements) { const y = Math.round(el.getBoundingClientRect().top); counts.set(y, (counts.get(y) || 0) + 1); } return [...counts.values()];
    });
    assert.deepEqual(rows, [6, 5]);
    assert.equal(await target.locator('.site-header, .family-section, .rule-strip, footer, .qr-card').count(), 0);
    const faceWidth = await target.locator('.yard-queue .char-head').first().evaluate(el => el.offsetWidth);
    assert.ok(faceWidth >= 55);
  }
  const activities = new Set();
  for (let i = 0; i < 4; i++) {
    if (i) await display.evaluate(async () => { const { startYardActivities } = await import('/yard.js'); startYardActivities(); });
    (await display.locator('.yard-queue .character').evaluateAll(chars => chars.map(el => el.dataset.activity))).forEach(a => activities.add(a));
  }
  assert.ok(activities.has('wave')); assert.ok(activities.has('pushup'));
  assert.equal(await phoneDisplay.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await phoneDisplay.screenshot({ path: 'test-results/display-mobile.png', fullPage: true });
  await admin.reload(); await admin.locator('.admin-summary').waitFor(); await admin.screenshot({ path: 'test-results/admin-desktop.png', fullPage: true });
  await admin.locator('[data-admin="close"]').click(); await admin.locator('[data-result="coin"]').click();
  await admin.locator('[data-admin="start"]').click();
  await display.locator('.race-scene').waitFor({ timeout: 7000 }); await display.waitForTimeout(7500);
  await display.screenshot({ path: 'test-results/race-desktop.png', fullPage: true });
  await display.reload(); await display.locator('.race-scene').waitFor();
  await display.locator('.winner-scene').waitFor({ timeout: 25000 }); await display.screenshot({ path: 'test-results/winner-desktop.png', fullPage: true });
  const result = await (await context.request.get('http://localhost:3102/api/state')).json(); assert.equal(result.phase, 'finished');
  const allCoinVotes = result.votes.filter(v => v.itemId === 'coin').map(v => v.personId); assert.ok(allCoinVotes.includes(result.race.winnerId));
  // A full-family race must fit the projector screen, not hide the lower runners.
  await context.request.post('http://localhost:3102/api/admin/action', { data: { action: 'reset', confirm: '새로 시작' } });
  for (let i = 1; i <= 17; i++) await context.request.post('http://localhost:3102/api/vote', { data: { personId: `p${i}`, itemId: 'book', token: i.toString(16).padStart(48, '0') } });
  await context.request.post('http://localhost:3102/api/admin/action', { data: { action: 'result', itemId: 'coin' } });
  await context.request.post('http://localhost:3102/api/admin/action', { data: { action: 'start' } });
  await display.setViewportSize({ width: 1920, height: 1080 }); await display.reload(); await display.locator('.race-lane').last().waitFor();
  await display.locator('[data-action="fullscreen"]').click();
  await display.waitForTimeout(1200);
  assert.equal(await display.locator('.race-lane').count(), 17);
  await display.screenshot({ path: 'test-results/race-all-fullscreen.png' });
  assert.equal(await display.evaluate(() => document.querySelector('.racetrack').getBoundingClientRect().bottom <= innerHeight), true);
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: desktop/mobile, 17 family members, guest save/edit/offline, admin login, voting close, result, race/reload/winner, no JS errors.');
} finally { await browser?.close(); server.kill(); }
