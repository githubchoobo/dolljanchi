import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

mkdirSync('test-results', { recursive: true });
const base = 'http://localhost:3104';
const server = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '3104', DATA_DIR: resolve('test-results', `yard-${Date.now()}`), ADMIN_PASSWORD: 'yard-test-only' }, stdio: 'ignore' });
let browser;
try {
  for (let i = 0; i < 80; i++) { try { await fetch(base + '/api/state'); break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  const initial = await (await fetch(base + '/api/state')).json();
  for (let i = 0; i < 17; i++) {
    const response = await fetch(base + '/api/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ personId: `p${i + 1}`, itemId: initial.items[Math.floor(i / 2) % 11].id, token: (i + 1).toString(16).padStart(48, '0') }) });
    assert.equal(response.status, 200);
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base); await page.locator('.yard-queue .character').first().waitFor();
  await page.evaluate(async () => {
    const { startYardActivities } = await import('/yard.js');
    const random = Math.random;
    try { Math.random = () => .1; startYardActivities(); } finally { Math.random = random; }
  });
  assert.match(await page.locator('[data-activity="buddy-left"] .buddy-arm-right').first().getAttribute('d'), /Q/);
  async function pose() {
    await page.locator('.yard-queue .character').evaluateAll(chars => {
      const poses = ['wave', 'pushup', 'buddy-left', 'buddy-right', 'jump', 'dance', 'bow', 'idle'];
      chars.forEach((char, i) => { char.dataset.activity = poses[i % poses.length]; });
    });
  }
  await pose();
  const hand = page.locator('[data-activity="wave"] .wave-hand').first();
  assert.equal(await hand.evaluate(el => getComputedStyle(el).display), 'block');
  const before = await hand.evaluate(el => getComputedStyle(el).transform);
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/yard-motion-paint.png' });
  assert.notEqual(await hand.evaluate(el => getComputedStyle(el).transform), before);
  assert.equal(await page.locator('[data-activity="buddy-left"] .buddy-arm-right').first().evaluate(el => getComputedStyle(el).display), 'block');
  assert.equal(await page.locator('[data-activity="pushup"] .char-pose').first().evaluate(el => getComputedStyle(el).animationName), 'yard-pushup-readable');
  assert.equal(await page.locator('[data-activity="jump"] .char-pose').first().evaluate(el => getComputedStyle(el).animationName), 'yard-jump');
  assert.equal(await page.locator('[data-activity="dance"] .char-pose').first().evaluate(el => getComputedStyle(el).animationName), 'yard-dance');
  await page.screenshot({ path: 'test-results/yard-motion-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 360, height: 800 });
  await pose(); await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const clippedFaces = await page.locator('.yard-queue .char-head').evaluateAll(heads => heads.map(h => { const r = h.getBoundingClientRect(); return { name: h.closest('.character')?.textContent?.trim(), left: r.left, right: r.right }; }).filter(r => r.left < 0 || r.right > innerWidth));
  assert.deepEqual(clippedFaces, []);
  await page.screenshot({ path: 'test-results/yard-motion-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 320, height: 700 });
  await pose(); await page.waitForTimeout(150);
  const narrowFaces = await page.locator('.yard-queue .char-head').evaluateAll(heads => heads.map(h => { const r = h.getBoundingClientRect(); return { name: h.closest('.character')?.textContent?.trim(), left: r.left, right: r.right }; }).filter(r => r.left < 0 || r.right > innerWidth));
  assert.deepEqual(narrowFaces, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'test-results/yard-motion-narrow.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('Yard motion passed: waving hand animates visibly, shoulder arms display, pushups animate, 17 large faces fit mobile width.');
} finally { await browser?.close(); server.kill(); }
