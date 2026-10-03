const drawings = {
  bomb: '<svg viewBox="0 0 60 60"><path d="M34 15q-2-11 9-10" fill="none" stroke="#7e6245" stroke-width="4"/><path d="m46 2 3 5 6 1-5 4 1 6-5-4-5 2 1-6-4-4 6 1z" fill="#f5c664"/><circle cx="28" cy="35" r="20" fill="#5a6272"/><ellipse cx="22" cy="27" rx="6" ry="4" fill="#929bb0"/></svg>',
  net: '<svg viewBox="0 0 70 70"><path d="M8 12 57 5 65 59 11 65z" fill="#ddd8b65c" stroke="#968155" stroke-width="3"/><path d="m18 10 3 53m9-54 5 52m8-54 6 52m-39-35 50-7m-49 20 51-7m-50 19 52-6" fill="none" stroke="#ac996e" stroke-width="2"/></svg>',
  trip: '<svg viewBox="0 0 70 50"><path d="m4 8 29 4 1 19 28 2 3 10H24L19 22 4 23" fill="#88a478" stroke="#4e6349" stroke-width="4" stroke-linejoin="round"/><path d="m48 12 9-6m-8 14 15-1" stroke="#d3a749" stroke-width="3"/></svg>',
};
const burst = '<svg viewBox="0 0 90 90"><path d="m45 4 9 23 22-13-8 25 20 9-25 9 9 26-24-15-16 19-2-27-27-3 21-17L9 19l26 10z" fill="#f2cb66" stroke="#dca24c" stroke-width="2"/><circle cx="46" cy="46" r="15" fill="#fff3bf"/></svg>';

export function setupRaceEffects(race) {
  const track = document.querySelector('.racetrack');
  if (!track) return () => {};
  const runners = new Map([...track.querySelectorAll('[data-runner]')].map(el => [el.dataset.runner, el]));
  for (const runner of runners.values()) {
    runner.insertAdjacentHTML('beforeend', `<span class="runner-net">${drawings.net}</span><span class="runner-stars">✦ ✧ ✦</span><span class="runner-impact">${burst}</span>`);
  }
  const layer = document.createElement('div'); layer.className = 'race-effects-layer'; layer.setAttribute('aria-hidden', 'true');
  const flyers = new Map();
  for (const event of race.events || []) {
    if (event.type === 'fall') continue;
    const flyer = document.createElement('span'); flyer.className = `race-projectile projectile-${event.type}`; flyer.innerHTML = drawings[event.type]; flyer.hidden = true;
    layer.append(flyer); flyers.set(event.id, flyer);
  }
  track.append(layer);
  return elapsed => {
    const actions = new Map([...runners.keys()].map(id => [id, { name: '', angle: 0, opacity: 0 }]));
    for (const flyer of flyers.values()) flyer.hidden = true;
    const bounds = track.getBoundingClientRect();
    for (const event of race.events || []) {
      const target = runners.get(event.targetId), actor = runners.get(event.actorId);
      if (!target) continue;
      const flight = (elapsed - event.at) / (event.hitAt - event.at);
      if (actor && elapsed >= event.at - 200 && elapsed < event.hitAt) actions.get(event.actorId).name = event.type === 'trip' ? 'trip-attack' : 'throw';
      if (actor && flight >= 0 && flight < 1) {
        const from = actor.getBoundingClientRect(), to = target.getBoundingClientRect();
        const x0 = from.left + from.width / 2 - bounds.left, x1 = to.left + to.width / 2 - bounds.left;
        const low = event.type === 'trip';
        const y0 = from.top + from.height * (low ? .85 : .48) - bounds.top, y1 = to.top + to.height * (low ? .85 : .45) - bounds.top;
        const x = x0 + (x1 - x0) * flight;
        const y = y0 + (y1 - y0) * flight - Math.sin(flight * Math.PI) * (low ? 12 : Math.min(90, Math.abs(x1 - x0) * .25 + 45));
        const flyer = flyers.get(event.id); flyer.hidden = false;
        flyer.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${low ? 0 : flight * 220}deg)`;
      }
      const t = elapsed - event.hitAt;
      if (t >= 0 && t < event.duration) {
        const action = actions.get(event.targetId);
        action.name = event.type === 'net' ? 'trapped' : event.type === 'bomb' ? 'bombed' : 'fallen';
        const fall = Math.min(1, t / 250, (event.duration - t) / 350);
        action.angle = fall * 76;
        action.opacity = Math.max(0, 1 - t / 650);
      }
    }
    for (const [id, runner] of runners) {
      const action = actions.get(id);
      if (runner.dataset.raceAction !== action.name) runner.dataset.raceAction = action.name;
      runner.style.setProperty('--fall-angle', `${action.angle}deg`);
      runner.style.setProperty('--impact-opacity', action.opacity);
    }
  };
}
