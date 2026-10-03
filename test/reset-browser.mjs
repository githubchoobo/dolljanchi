import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

mkdirSync('test-results', { recursive: true });
const base = 'http://localhost:3103';
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '3103', DATA_DIR: resolve('test-results', `reset-${Date.now()}`), ADMIN_PASSWORD: 'reset-test-only' }, stdio: 'ignore' });
let browser;
try {
  for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/state'); break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // Simulate a browser which silently blocks the old native confirmation popup.
  await context.addInitScript(() => { window.prompt = () => null; });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/admin');
  await page.locator('#password').fill('reset-test-only');
  await page.getByRole('button', { name: '관리자 입장' }).click();
  await page.locator('.admin-summary').waitFor();
  const post = async (path, data) => { const res = await context.request.post(base + '/api/' + path, { data }); assert.equal(res.status(), 200); };
  const state = async () => (await context.request.get(base + '/api/state')).json();
  await post('vote', { personId: 'p1', itemId: 'book', token: 'a'.repeat(48) });
  const photo = 'data:image/png;base64,' + (await page.locator('.brand-mark').screenshot()).toString('base64');
  await post('admin/photo', { personId: 'p1', image: photo });
  await post('admin/action', { action: 'result', itemId: 'book' });
  await post('admin/action', { action: 'start' });
  const before = await state(); assert.equal(before.phase, 'finished');
  await page.reload(); await page.locator('[data-action="reset"]').click();
  await expect(page.locator('#reset-dialog')).toBeVisible();
  await expect(page.locator('#reset-submit')).toBeDisabled();
  await page.locator('#reset-confirmation').fill('다시 시작');
  await expect(page.locator('#reset-submit')).toBeDisabled();
  await page.locator('#reset-cancel').click();
  assert.equal((await state()).round, before.round);
  assert.equal((await state()).votes.length, 1);
  await page.locator('[data-action="reset"]').click();
  await page.locator('#reset-confirmation').fill(' 새로 시작 ');
  await expect(page.locator('#reset-submit')).toBeEnabled();
  // Polling can update the page without replacing the open confirmation form.
  await post('admin/url', { url: 'https://party.example' });
  await page.waitForTimeout(2000);
  await expect(page.locator('#reset-confirmation')).toHaveValue(' 새로 시작 ');
  await page.screenshot({ path: 'test-results/reset-mobile.png' });
  await page.locator('#reset-submit').click();
  await expect(page.locator('#reset-dialog')).not.toBeVisible();
  await expect(page.locator('.admin-summary')).toContainText('0 / 17명 참여');
  const after = await state();
  assert.equal(after.phase, 'voting'); assert.equal(after.votes.length, 0);
  assert.equal(after.result, null); assert.equal(after.race, null); assert.notEqual(after.round, before.round);
  assert.equal(after.photos.p1, before.photos.p1); assert.equal(after.joinUrl, 'https://party.example/join');
  assert.equal((await context.request.get(base + after.photos.p1)).status(), 200);
  await post('vote', { personId: 'p1', itemId: 'coin', token: 'b'.repeat(48) });
  // A server error must stay visible inside the dialog and leave the vote intact.
  await page.locator('[data-action="reset"]').click();
  await page.locator('#reset-confirmation').fill('새로 시작');
  await post('admin/logout', {});
  await page.locator('#reset-submit').click();
  await expect(page.locator('#reset-error')).toContainText('관리자 로그인이 필요합니다.');
  await expect(page.locator('#reset-dialog')).toBeVisible();
  await expect(page.locator('#reset-submit')).toBeEnabled();
  assert.equal((await state()).votes.length, 1);
  await page.keyboard.press('Escape'); await expect(page.locator('#reset-dialog')).not.toBeVisible();
  assert.deepEqual(errors, []);
  console.log('Reset browser checks passed: blocked native prompts, cancel, invalid text, polling, mobile confirmation, reset/reopen, preserved photos/settings, re-vote and visible auth errors.');
} finally { await browser?.close(); server.kill(); }
