import { randomInt } from 'node:crypto';

export const people = Array.from({ length: 17 }, (_, i) => ({
  id: `p${i + 1}`,
  name: `참석자 ${i + 1}`,
  relation: '가족',
}));

export const items = [
  ['brush', '붓', '예술가', '마음을 그리는 예술가'], ['book', '서책', '학자', '지혜로운 배움의 길'],
  ['mapae', '마패', '리더', '세상을 이끄는 리더'], ['thread', '실', '건강', '오래오래 건강하게'],
  ['coin', '엽전', '부자', '풍요로운 행복 부자'], ['stethoscope', '청진기', '의사', '따뜻한 마음의 의사'],
  ['bow', '활', '도전가', '큰 꿈을 향한 도전'], ['arrow', '화살', '명사수', '목표를 향해 곧게'],
  ['needle', '바늘쌈지', '손재주', '야무진 솜씨의 장인'], ['ruler', '자', '건축가', '새로운 세상을 짓는 사람'],
  ['gavel', '판사봉', '법조인', '공정하고 올바른 마음'],
].map(([id, name, label, meaning]) => ({ id, name, label, meaning }));

export function decide(votes, selectedItem, pick = randomInt) {
  if (!votes.length) throw new Error('아직 참여한 가족이 없습니다.');
  const correct = votes.filter(v => v.itemId === selectedItem);
  const candidates = correct.length ? correct : votes;
  return { candidates: candidates.map(v => v.personId), winnerId: candidates[pick(candidates.length)].personId,
    reason: correct.length === 0 ? 'everyone' : correct.length === 1 ? 'single' : 'correct' };
}

export function makeTracks(ids, winnerId, pick = randomInt) {
  const tracks = Object.fromEntries(ids.map(id => [id, [0]]));
  // Each checkpoint advances every runner, while a rotating leader creates overtakes.
  let leader = pick(ids.length);
  for (let step = 1; step <= 32; step++) {
    if (step % 4 === 1) leader = (leader + 1 + pick(Math.max(1, ids.length - 1))) % ids.length;
    ids.forEach((id, index) => {
      const target = step * 2.35 + (index === leader ? 8 : pick(650) / 100);
      tracks[id].push(Math.min(86, Math.max(tracks[id].at(-1) + 0.2, target)));
    });
  }
  ids.forEach(id => {
    const start = tracks[id].at(-1);
    const finish = id === winnerId ? 100 : 90 + pick(650) / 100;
    for (let i = 1; i <= 4; i++) tracks[id].push(start + (finish - start) * i / 4);
  });
  return tracks;
}

export function makeRaceScene(ids, winnerId, pick = randomInt) {
  const tracks = makeTracks(ids, winnerId, pick);
  const kinds = ids.length > 1 ? ['bomb', 'trip', 'fall', 'net'] : ['fall'];
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = pick(i + 1); [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  const events = kinds.map((type, i) => {
    const at = 2200 + i * 3300;
    const targetId = ids[pick(ids.length)];
    const checkpoint = Math.round(at / 500);
    const others = ids.filter(id => id !== targetId).sort((a, b) => Math.abs(tracks[a][checkpoint] - tracks[targetId][checkpoint]) - Math.abs(tracks[b][checkpoint] - tracks[targetId][checkpoint]));
    return { id: `prank-${i}`, type, actorId: type === 'fall' ? null : others[0], targetId, at, hitAt: at + (type === 'fall' ? 0 : 650), duration: type === 'net' ? 2400 : 1600 };
  });
  // The same server-authored slowdowns and recovery play on every screen.
  for (const id of ids) {
    for (let step = 1; step < 36; step++) {
      const time = step * 500;
      let penalty = 0;
      for (const event of events.filter(e => e.targetId === id)) {
        const t = time - event.hitAt;
        if (t >= 0 && t < event.duration + 1000) {
          const strength = event.type === 'net' ? 8 : 6;
          penalty += t < event.duration ? strength * Math.min(1, t / 600) : strength * (1 - (t - event.duration) / 1000);
        }
      }
      tracks[id][step] = Math.max(tracks[id][step - 1], tracks[id][step] - penalty);
    }
  }
  return { tracks, events };
}
