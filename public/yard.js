import { icon, baby, character } from './art.js';

export function yard(state, local) {
  const mine = local.round === state.round ? local.personId : null;
  return `<main class="courtyard" aria-label="아이 돌잡이 마당">
    <div class="yard-controls"><a href="/admin" aria-label="진행자 화면">⚙</a><button data-action="fullscreen" aria-label="행사 화면 전체 화면">⛶</button></div>
    <section class="yard-host" aria-label="웃는 아이와 참여 QR">
      <div class="yard-baby">${baby(state.photos.baby)}</div>
      <div class="yard-invite"><img src="/api/qr?v=${encodeURIComponent(state.joinUrl)}" alt="돌잡이 참여 QR 코드"><a class="button primary" href="/join">${mine && state.votes.some(v => v.personId === mine) ? '선택 바꾸기' : '참여하러 가기'} ↗</a></div>
    </section>
    <section class="yard-items" aria-label="돌잡이 물품과 가족들의 줄서기">
      ${state.items.map(i => {
        const voters = state.votes.filter(v => v.itemId === i.id);
        return `<div class="yard-station ${state.result === i.id ? 'chosen' : ''}" data-item="${i.id}">
          <div class="yard-object"><div class="woven-mat">${icon(i.id)}</div><h2>${i.name}</h2></div>
          <div class="yard-queue" style="--cast-cols:${Math.max(1, Math.min(4, voters.length))}" aria-label="${i.name} 선택자 ${voters.length}명">${voters.map((v, index) => `<div class="cast-slot ${v.personId === mine ? 'is-me' : ''}" style="--cast-index:${index}" data-person="${v.personId}">${character(state.people.find(p => p.id === v.personId), state.photos[v.personId])}</div>`).join('')}</div>
        </div>`;
      }).join('')}
    </section>
    <div class="yard-offline" role="status">연결을 다시 확인하고 있어요.</div>
  </main>`;
}

let playTimer;
export function startYardActivities() {
  clearInterval(playTimer);
  const queues = [...document.querySelectorAll('.yard-queue')];
  if (!queues.length) return;
  function play() {
    for (const queue of queues) {
      const cast = [...queue.querySelectorAll('.character')];
      for (let i = 0; i < cast.length; i++) {
        const char = cast[i];
        char.style.setProperty('--play-delay', `${Math.random() * -.8}s`);
        const roll = Math.random();
        const neighbor = cast[i + 1];
        const sameRow = neighbor && Math.abs(char.getBoundingClientRect().top - neighbor.getBoundingClientRect().top) < 25;
        if (sameRow && Math.random() < .25) {
          char.dataset.activity = 'buddy-left';
          neighbor.dataset.activity = 'buddy-right';
          // Reach the actual neighbor's shoulder at every screen size.
          const scale = parseFloat(getComputedStyle(char.querySelector('.char-body')).width) / 50;
          const a = char.getBoundingClientRect(), b = neighbor.getBoundingClientRect();
          const dx = (b.left - a.left) / scale, dy = (b.top - a.top) / scale;
          char.querySelector('.buddy-arm-right').setAttribute('d', `M25 11 Q${25 + dx / 2} ${Math.min(11, 11 + dy) - 9} ${25 + dx} ${11 + dy}`);
          neighbor.querySelector('.buddy-arm-left').setAttribute('d', `M25 11 Q${25 - dx / 2} ${Math.min(11, 11 - dy) - 9} ${25 - dx} ${11 - dy}`);
          char.style.setProperty('--play-delay', '0s');
          neighbor.style.setProperty('--play-delay', '0s');
          i++;
        } else {
          char.dataset.activity = roll < .17 ? 'pushup' : roll < .35 ? 'wave' : roll < .52 ? 'jump' : roll < .7 ? 'dance' : roll < .86 ? 'bow' : 'idle';
        }
      }
    }
  }
  play();
  playTimer = setInterval(play, 6800);
}
