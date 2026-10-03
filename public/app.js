import { icon, baby, character } from './art.js';
import { yard, startYardActivities } from './yard.js';
import { setupRaceEffects } from './race-effects.js';

const app = document.querySelector('#app');
const resetDialog = document.querySelector('#reset-dialog');
const resetInput = document.querySelector('#reset-confirmation');
const resetSubmit = document.querySelector('#reset-submit');
const resetCancel = document.querySelector('#reset-cancel');
const resetError = document.querySelector('#reset-error');
const page = location.pathname === '/admin' ? 'admin' : location.pathname === '/join' ? 'join' : 'display';
let state, signature = '', auth = false, selectedPerson = '', selectedItem = '', busy = false, savedVote = null, frame, offset = 0;
let local = {};
try { local = JSON.parse(localStorage.getItem('baby-vote') || '{}'); } catch {}
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const person = id => state.people.find(p => p.id === id);
const item = id => state.items.find(i => i.id === id);
const phaseNames = { voting: '투표 진행 중', closed: '투표 마감', ready: '결과 발표 준비', racing: '두근두근 경주 중', finished: '우승자 탄생!' };
function toast(text, bad = false) { const t = document.querySelector('#toast'); t.textContent = text; t.className = `show ${bad ? 'bad' : ''}`; clearTimeout(toast.timer); toast.timer = setTimeout(() => t.className = '', 4500); }
async function api(path, body) {
  const res = await fetch(`/api/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const result = await res.json(); if (!res.ok) throw new Error(result.error || '연결을 확인해주세요.'); return result;
}
function header() {
  return `<header class="site-header"><a class="brand" href="/"><span class="brand-mark">유<span>담</span></span><div>아이의 첫 번째 생일<small>OUR LITTLE ONE, A BIG FIRST</small></div></a><nav aria-label="주 메뉴"><a class="${page === 'display' ? 'active' : ''}" href="/">돌잡이 함께 보기</a><a class="${page === 'join' ? 'active' : ''}" href="/join">예상 물품 고르기</a></nav><a class="admin-link ${page === 'admin' ? 'active' : ''}" href="/admin"><span>⚙</span> 진행자</a></header>`;
}
function footer() { return `<footer>작은 손으로 고르는, 커다란 내일 <span>아이의 모든 순간을 응원해요 ♡</span></footer>`; }
function status() { return `<span class="status ${state.phase === 'voting' ? '' : 'paused'}"><i></i>${phaseNames[state.phase]}</span>`; }
function display() {
  if (!['racing', 'finished'].includes(state.phase)) return yard(state, local);
  return '<main class="race-shell"><div class="yard-controls"><a href="/admin" aria-label="진행자 화면">⚙</a><button data-action="fullscreen" aria-label="행사 화면 전체 화면">⛶</button></div>' + raceView() + '</main>';
}
function raceView() {
  const race = state.race;
  if (state.phase === 'finished') {
    const winner = person(race.winnerId);
    return `<section class="winner-scene"><div class="confetti">${Array.from({ length: 24 }, (_, i) => `<i style="--x:${(i * 31 + 7) % 100}%;--r:${i * 43}deg;--d:${i % 5 * .3}s;--c:${['#c4ad60', '#d69a85', '#9bac85'][i % 3]}"></i>`).join('')}</div><div class="eyebrow">A LITTLE LUCK, A LOT OF LOVE</div><h2>오늘의 행운의 주인공!</h2><div class="winner-character"><span class="crown">♛</span>${character(winner, state.photos[winner.id])}</div><h3>${winner.name}<span>님, 축하해요!</span></h3><p>아이의 선택은 <b>${item(state.result).name}</b>${race.reason === 'everyone' ? ' · 모두 함께 달린 행운의 경주' : race.reason === 'single' ? ' · 유일한 정답자예요!' : ' · 정답자들의 두근두근 경주'}</p><div class="winner-note">아이의 첫 생일을 함께해주셔서 고맙습니다 ♡</div></section>`;
  }
  return `<section class="race-scene"><div class="race-heading"><div class="eyebrow">READY, SET, LITTLE STEPS!</div><h2>두근두근, 행운의 달리기</h2><p>${race.reason === 'everyone' ? '정답자가 없어 참여한 가족 모두 함께 달려요!' : `정답을 맞힌 ${race.candidates.length}명의 가족이 함께 달려요!`}</p><strong id="race-countdown">준비!</strong></div><div class="racetrack"><div class="finish-line"></div>${race.candidates.map(id => `<div class="race-lane"><span class="lane-name">${person(id).name}</span><div class="lane-course"><div class="runner" data-runner="${id}">${character(person(id), state.photos[id], true)}</div></div></div>`).join('')}</div><p class="race-caption">끝까지 알 수 없는 승부, 함께 응원해주세요!</p></section>`;
}
function startAnimation() {
  cancelAnimationFrame(frame);
  if (state.phase !== 'racing') return;
  const updateEffects = setupRaceEffects(state.race);
  function tick() {
    const elapsed = Date.now() + offset - state.race.startsAt;
    const progress = Math.max(0, Math.min(1, elapsed / state.race.duration));
    const step = progress * 36, low = Math.min(35, Math.floor(step)), t = step - low;
    document.querySelectorAll('[data-runner]').forEach(el => {
      const track = state.race.tracks[el.dataset.runner];
      const position = track[low] + (track[low + 1] - track[low]) * t;
      el.style.left = `${position}%`;
      el.classList.toggle('running', elapsed >= 0 && progress < 1);
    });
    const label = document.querySelector('#race-countdown');
    updateEffects(elapsed);
    if (label) label.textContent = elapsed < 0 ? `${Math.ceil(-elapsed / 1000)}` : progress >= 1 ? '결승선 도착!' : progress > .82 ? '마지막 스퍼트!' : '달려라, 우리 가족!';
    frame = requestAnimationFrame(tick);
  }
  tick();
}
function join() {
  const existing = state.votes.find(v => v.personId === local.personId);
  if (existing && local.round === state.round && !selectedPerson) {
    selectedPerson = existing.personId;
    selectedItem = existing.itemId;
  }
  if (state.phase !== 'voting') return `<main class="join-main"><section class="success-card"><div class="eyebrow">THANK YOU FOR BEING HERE</div>${baby(state.photos.baby)}<h1>투표가 마감되었어요</h1><p>이제 아이의 첫 선택과<br>행운의 우승자를 함께 지켜봐주세요.</p><a class="button primary" href="/">행사 화면 함께 보기 ↗</a></section></main>`;
  return `<main class="join-main"><div class="join-intro"><div class="eyebrow">A WISH FOR BABY</div><h1>아이의 내일에<br>한 표를 더해주세요 <em>♡</em></h1><p>이름을 고르고, 예상하는 물건을 딱 하나!</p></div><form id="vote-form"><section class="form-card"><h2><span class="step-number">1</span> 누가 응원하러 오셨나요?</h2><label for="person-select" class="field-label">참석자 이름</label><select id="person-select" required><option value="">내 이름을 선택해주세요</option>${state.people.map(p => { const voted = state.votes.some(v => v.personId === p.id); const mine = local.round === state.round && local.personId === p.id; return `<option value="${p.id}" ${selectedPerson === p.id ? 'selected' : ''} ${voted && !mine ? 'disabled' : ''}>${p.name} · ${p.relation}${voted ? ' (참여 완료)' : ''}</option>`; }).join('')}</select><p class="hint">본인 이름으로 한 번만 참여해주세요.</p></section><section class="form-card"><h2><span class="step-number">2</span> 아이는 무엇을 잡을까요?</h2><div class="choice-grid">${state.items.map(i => `<label class="choice ${selectedItem === i.id ? 'selected' : ''}"><input type="radio" name="item" value="${i.id}" ${selectedItem === i.id ? 'checked' : ''} required>${icon(i.id)}<b>${i.name}</b><span>${i.label}</span><i>✓</i></label>`).join('')}</div></section><div class="vote-submit"><p>선택한 물건 앞에 내 캐릭터가 줄을 서요.</p><button type="submit" class="button primary" ${busy ? 'disabled' : ''}>${busy ? '마음을 저장하고 있어요…' : '이 물건으로 정했어요 →'}</button><small>사진은 진행자가 나중에 등록해드려요. 창을 닫아도 참여가 유지됩니다.</small></div></form></main>`;
}
function adminView() {
  if (!auth) return `<main class="join-main"><section class="login-card"><span class="login-symbol">⚙</span><div class="eyebrow">PARTY CONTROL ROOM</div><h1>진행자 진행자님,<br>어서 오세요.</h1><p>오늘의 소중한 순간을 준비해주세요.</p><form id="login-form"><label for="password" class="field-label">관리자 비밀번호</label><input id="password" type="password" autocomplete="current-password" required placeholder="비밀번호를 입력해주세요"><button class="button primary">관리자 입장 →</button></form><p class="hint">처음 생성된 비밀번호는 서버의<br>data/admin-password.txt 파일에서 확인할 수 있어요.</p></section></main>`;
  return `<main class="admin-main"><section class="intro"><div><div class="eyebrow">PARTY CONTROL ROOM</div><h1>오늘의 진행자, <em>진행자</em></h1><p>투표를 확인하고 아이의 실제 선택을 알려주세요.</p></div><button class="text-button" data-action="logout">로그아웃 ↗</button></section><div class="admin-summary">${status()}<b>${state.votes.length} / ${state.people.length}명 참여</b><a href="/" target="_blank" rel="noopener">행사 화면 열기 ↗</a></div><div class="admin-grid"><section class="form-card"><h2><span class="step-number">1</span> 투표 진행</h2><p>가족들이 모두 참여했으면 투표를 마감해주세요.</p><div class="button-row"><button class="button primary" data-admin="close" ${state.phase !== 'voting' ? 'disabled' : ''}>투표 마감하기</button><button class="button secondary" data-admin="reopen" ${state.phase !== 'closed' ? 'disabled' : ''}>다시 열기</button></div></section><section class="form-card"><h2><span class="step-number">2</span> 아이가 고른 물품</h2><p>실제로 고른 물품을 누르면 결과가 저장되고 투표가 마감됩니다.</p><div class="admin-items">${state.items.map(i => `<button data-result="${i.id}" class="${state.result === i.id ? 'selected' : ''}" ${!['voting', 'closed', 'ready'].includes(state.phase) || !state.votes.length ? 'disabled' : ''}>${icon(i.id)}${i.name}</button>`).join('')}</div>${state.result ? `<p class="result-selection">✓ 아이의 선택: <b>${item(state.result).name}</b></p>` : ''}</section><section class="form-card"><h2><span class="step-number">3</span> 행운의 주인공 발표</h2><p>${state.result ? resultExplanation() : '실제 돌잡이 물품을 먼저 선택해주세요.'}</p><button class="button primary" data-admin="start" ${state.phase !== 'ready' ? 'disabled' : ''}>${state.result && state.votes.filter(v => v.itemId === state.result).length === 1 ? '우승자 발표하기 ✦' : '두근두근 경주 시작 🏁'}</button>${state.phase === 'finished' ? `<p class="result-selection">♛ 우승자: <b>${person(state.race.winnerId).name}</b></p>` : ''}</section><section class="form-card"><h2>QR 접속 주소</h2><p>같은 Wi-Fi에서는 현재 주소를 사용하세요. 외부 배포 후에는 공개 주소를 입력해주세요.</p><form id="url-form"><label for="public-url" class="field-label">서버 접속 주소</label><input id="public-url" type="url" value="${esc(state.joinUrl.replace(/\/join$/, ''))}" required><button class="button secondary">QR 주소 저장</button></form><a class="text-button" href="/api/qr" download="아이-돌잡이-QR.svg">QR 이미지 내려받기 ↓</a></section></div><section class="form-card photos-card"><div class="section-heading"><h2>가족 얼굴 사진</h2><span>사진을 누르면 등록 · 투명 배경 사진도 그대로 사용할 수 있어요</span></div><div class="photo-grid">${[{ id: 'baby', name: '주인공 아이' }, ...state.people].map(p => `<div class="photo-person"><label class="photo-label"><span>${state.photos[p.id] ? `<img src="${state.photos[p.id]}" alt="${p.name}">` : '＋'}</span><b>${p.name}</b><input type="file" accept="image/jpeg,image/png,image/webp" data-photo="${p.id}" aria-label="${p.name} 얼굴 사진 등록"></label>${state.photos[p.id] ? `<button class="text-button" data-remove-photo="${p.id}">사진 삭제</button>` : '<small>사진 추가</small>'}</div>`).join('')}</div></section><section class="form-card"><h2>참여 현황</h2><p>다른 사람이 이름을 잘못 선택했다면 해당 투표를 취소할 수 있어요.</p><div class="vote-list">${state.people.map(p => { const v = state.votes.find(v => v.personId === p.id); return `<div><b>${p.name}</b><span>${v ? item(v.itemId).name : '참여 대기'}</span>${v && ['voting', 'closed'].includes(state.phase) ? `<button class="text-button" data-release="${p.id}">투표 취소</button>` : ''}</div>`; }).join('')}</div></section><section class="reset-card"><div><h3>행사 새로 시작</h3><p>투표와 우승 결과를 모두 지웁니다. 등록한 얼굴 사진은 유지됩니다.</p></div><button class="button danger" data-action="reset">전체 투표 초기화</button></section></main>`;
}
function resultExplanation() { const n = state.votes.filter(v => v.itemId === state.result).length; return n === 0 ? `정답자가 없어 참여자 ${state.votes.length}명 모두 경주합니다.` : n === 1 ? '정답자가 한 명이에요! 경주 없이 바로 우승자를 발표합니다.' : `정답자 ${n}명이 경주합니다. 우승자는 무작위로 결정됩니다.`; }
function render() {
  document.body.classList.toggle('yard-page', page === 'display');
  app.innerHTML = page === 'display' ? display() : header() + (page === 'join' ? join() : adminView());
  const track = document.querySelector('.racetrack');
  if (track) {
    track.style.setProperty('--racers', state.race.candidates.length);
    track.style.setProperty('--race-rows', Math.ceil(state.race.candidates.length / 2));
    track.classList.toggle('dense', state.race.candidates.length > 8);
  }
  startAnimation();
  startYardActivities();
}
async function refresh(force = false) {
  try {
    const start = Date.now(); const next = await api('state'); offset = next.serverTime - (start + Date.now()) / 2;
    const { serverTime, ...stable } = next; const sig = JSON.stringify(stable);
    state = next;
    if (local.round !== state.round) { local = {}; savedVote = null; }
    if (force || sig !== signature) {
      // Preserve an in-progress admin form or photo picker while polling.
      const editing = page === 'admin' && ['INPUT', 'SELECT'].includes(document.activeElement?.tagName);
      if (force || !editing) { signature = sig; render(); }
    }
    const conn = document.querySelector('#connection'); if (conn) conn.textContent = '실시간';
    document.body.classList.remove('offline');
  } catch (error) {
    document.body.classList.add('offline');
    const conn = document.querySelector('#connection'); if (conn) conn.textContent = '재연결 중';
    if (!state) app.innerHTML = `<main class="error-screen"><h1>잠시 연결을 기다리고 있어요</h1><p>서버가 켜져 있는지, 같은 Wi-Fi에 연결했는지 확인해주세요.</p><button class="button primary" data-action="retry">다시 연결</button></main>`;
  }
}
app.addEventListener('change', async e => {
  if (e.target.id === 'person-select') selectedPerson = e.target.value;
  if (e.target.name === 'item') { selectedItem = e.target.value; document.querySelectorAll('.choice').forEach(c => c.classList.toggle('selected', c.querySelector('input').checked)); }
  if (e.target.matches('[data-photo]') && e.target.files[0]) {
    try {
      const file = e.target.files[0]; if (file.size > 15 * 1024 * 1024) throw new Error('15MB 이하의 사진을 선택해주세요.');
      const bitmap = await createImageBitmap(file); const canvas = document.createElement('canvas'); canvas.width = canvas.height = 320;
      const size = Math.min(bitmap.width, bitmap.height); canvas.getContext('2d').drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 320, 320); bitmap.close();
      const pixels = canvas.getContext('2d').getImageData(0, 0, 320, 320).data;
      let hasAlpha = false;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] < 240) { hasAlpha = true; break; }
      await api('admin/photo', { personId: e.target.dataset.photo, image: canvas.toDataURL(hasAlpha ? 'image/webp' : 'image/jpeg', .86) }); toast('얼굴 사진을 등록했어요.'); await refresh(true);
    } catch (error) { toast(error.message || '사진을 불러오지 못했어요.', true); }
  }
});
app.addEventListener('submit', async e => {
  e.preventDefault(); if (busy) return; busy = true;
  const submit = e.target.querySelector('button[type="submit"], button:not([type])'); if (submit) submit.disabled = true;
  try {
    if (e.target.id === 'login-form') { await api('admin/login', { password: document.querySelector('#password').value }); auth = true; await refresh(true); }
    if (e.target.id === 'url-form') { await api('admin/url', { url: document.querySelector('#public-url').value }); toast('QR 접속 주소가 저장되었습니다.'); await refresh(true); }
    if (e.target.id === 'vote-form') {
      if (!selectedPerson || !selectedItem) throw new Error('내 이름과 물품을 모두 선택해주세요.');
      const token = local.round === state.round && local.personId === selectedPerson ? local.token : Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('');
      local = { personId: selectedPerson, token, round: state.round };
      // Save ownership before sending, so retries remain possible after a lost response.
      try { localStorage.setItem('baby-vote', JSON.stringify(local)); } catch { throw new Error('투표 수정을 위해 브라우저 저장 공간을 허용해주세요.'); }
      await api('vote', { personId: selectedPerson, itemId: selectedItem, token });
      location.replace('/');
    }
  } catch (error) { toast(error.message, true); } finally { busy = false; if (submit) submit.disabled = false; }
});
app.addEventListener('click', async e => {
  const button = e.target.closest('button'); if (!button || busy) return;
  const action = button.dataset.action;
  if (!action && !['admin', 'result', 'release', 'removePhoto'].some(key => key in button.dataset)) return;
  try {
    if (action === 'retry') return await refresh(true);
    if (action === 'fullscreen') {
      const root = document.documentElement;
      if (root.classList.contains('presentation')) {
        root.classList.remove('presentation');
        if (document.fullscreenElement) await document.exitFullscreen();
      } else {
        root.classList.add('presentation');
        window.scrollTo(0, 0);
        // Embedded browsers can deny native fullscreen; the fitted event view still works.
        try { await root.requestFullscreen(); } catch {}
      }
      button.setAttribute('aria-label', root.classList.contains('presentation') ? '일반 화면으로 돌아가기' : '행사 화면 전체 화면');
      const label = button.querySelector('span'); if (label) label.textContent = root.classList.contains('presentation') ? '일반 화면' : '전체 화면';
      return;
    }
    if (action === 'copy') {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(state.joinUrl);
      else { const input = document.createElement('textarea'); input.value = state.joinUrl; document.body.append(input); input.select(); const ok = document.execCommand('copy'); input.remove(); if (!ok) { window.prompt('아래 참여 링크를 복사해주세요.', state.joinUrl); return; } }
      toast('참여 링크를 복사했어요.'); return;
    }
    if (action === 'edit-vote') { selectedPerson = local.personId; selectedItem = state.votes.find(v => v.personId === local.personId)?.itemId || ''; savedVote = null; render(); return; }
    if (action === 'reset') {
      document.querySelector('#reset-form').reset();
      resetSubmit.disabled = true;
      resetError.textContent = '';
      resetDialog.showModal();
      resetInput.focus();
      return;
    }
    busy = true; button.disabled = true;
    if (action === 'logout') { await api('admin/logout', {}); auth = false; }
    if (button.dataset.admin) await api('admin/action', { action: button.dataset.admin });
    if (button.dataset.result) await api('admin/action', { action: 'result', itemId: button.dataset.result });
    if (button.dataset.release) { if (!window.confirm(`${person(button.dataset.release).name}님의 투표를 취소할까요?`)) return; await api('admin/action', { action: 'release', personId: button.dataset.release }); }
    if (button.dataset.removePhoto) await api('admin/photo', { personId: button.dataset.removePhoto, image: null });
    await refresh(true);
  } catch (error) { toast(error.message, true); } finally { busy = false; button.disabled = false; }
});
resetInput.addEventListener('input', () => {
  resetSubmit.disabled = busy || resetInput.value.trim() !== '새로 시작';
  resetError.textContent = '';
});
resetCancel.addEventListener('click', () => { if (!busy) resetDialog.close(); });
resetDialog.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
document.querySelector('#reset-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (busy || resetInput.value.trim() !== '새로 시작') return;
  busy = true;
  resetSubmit.disabled = resetCancel.disabled = resetInput.disabled = true;
  resetSubmit.textContent = '초기화하고 있어요…';
  resetError.textContent = '';
  try {
    await api('admin/action', { action: 'reset', confirm: resetInput.value.trim() });
    selectedPerson = selectedItem = '';
    savedVote = null;
    local = {};
    try { localStorage.removeItem('baby-vote'); } catch {}
    resetDialog.close();
    await refresh(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('행사를 초기화했어요. 투표가 다시 열렸습니다.');
  } catch (error) {
    resetError.textContent = error.message;
  } finally {
    busy = false;
    resetCancel.disabled = resetInput.disabled = false;
    resetSubmit.disabled = resetInput.value.trim() !== '새로 시작';
    resetSubmit.textContent = '초기화하고 투표 열기';
  }
});
if (page === 'admin') { try { auth = (await api('admin/session')).authenticated; } catch {} }
await refresh();
setInterval(() => { if (!busy) refresh(); }, 1800);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.documentElement.classList.remove('presentation'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.fullscreenElement) document.documentElement.classList.remove('presentation'); });
