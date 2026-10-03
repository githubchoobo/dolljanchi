import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, makeTracks, makeRaceScene, people, items } from '../lib/game.mjs';

test('17 family members and all 11 distinct items are configured', () => {
  assert.equal(people.length, 17); assert.equal(items.length, 11);
  assert.equal(new Set(people.map(p => p.id)).size, 17);
  assert.ok(items.some(i => i.name === '활')); assert.ok(items.some(i => i.name === '화살'));
});
test('a single correct participant wins immediately', () => {
  const result = decide([{ personId: 'p1', itemId: 'book' }, { personId: 'p2', itemId: 'brush' }], 'book', () => 0);
  assert.equal(result.winnerId, 'p1'); assert.equal(result.reason, 'single'); assert.deepEqual(result.candidates, ['p1']);
});
test('multiple correct participants race without incorrect participants', () => {
  const result = decide([{ personId: 'p1', itemId: 'book' }, { personId: 'p2', itemId: 'book' }, { personId: 'p3', itemId: 'brush' }], 'book', () => 1);
  assert.equal(result.winnerId, 'p2'); assert.deepEqual(result.candidates, ['p1', 'p2']); assert.equal(result.reason, 'correct');
});
test('no correct answers admits all voters, including an offline participant', () => {
  const result = decide([{ personId: 'p1', itemId: 'book' }, { personId: 'p2', itemId: 'brush' }], 'coin', () => 1);
  assert.deepEqual(result.candidates, ['p1', 'p2']); assert.equal(result.reason, 'everyone'); assert.equal(result.winnerId, 'p2');
});
test('empty participation cannot produce a fictitious winner', () => assert.throws(() => decide([], 'book')));
test('race tracks overtake, move forward and only the elected winner reaches the line', () => {
  const ids = ['p1', 'p2', 'p3']; const tracks = makeTracks(ids, 'p2', () => 0);
  for (const id of ids) { assert.equal(tracks[id].length, 37); for (let i = 1; i < 37; i++) assert.ok(tracks[id][i] >= tracks[id][i - 1]); }
  assert.equal(tracks.p2.at(-1), 100); assert.ok(tracks.p1.at(-1) < 100); assert.ok(tracks.p3.at(-1) < 100);
  const leaders = new Set(Array.from({ length: 32 }, (_, i) => ids.toSorted((a, b) => tracks[b][i + 1] - tracks[a][i + 1])[0]));
  assert.ok(leaders.size > 1);
});
test('all four pranks slow participants without changing the elected winner', () => {
  const ids = ['p1', 'p2', 'p3'];
  const scene = makeRaceScene(ids, 'p2', () => 0);
  assert.deepEqual(scene.events.map(e => e.type).sort(), ['bomb', 'fall', 'net', 'trip']);
  const plain = makeTracks(ids, 'p2', () => 0);
  assert.ok(scene.tracks.p1.some((x, i) => x < plain.p1[i]));
  for (const e of scene.events) {
    assert.ok(ids.includes(e.targetId));
    if (e.type !== 'fall') { assert.ok(ids.includes(e.actorId)); assert.notEqual(e.actorId, e.targetId); }
    assert.ok(e.hitAt + e.duration < 18000);
  }
  for (const track of Object.values(scene.tracks)) for (let i = 1; i < track.length; i++) assert.ok(track[i] >= track[i - 1]);
  assert.equal(scene.tracks.p2.at(-1), 100); assert.ok(scene.tracks.p1.at(-1) < 100); assert.ok(scene.tracks.p3.at(-1) < 100);
});
test('one runner only falls by themselves instead of attacking an imaginary opponent', () => {
  const scene = makeRaceScene(['p1'], 'p1', () => 0);
  assert.equal(scene.events.length, 1); assert.equal(scene.events[0].type, 'fall'); assert.equal(scene.events[0].actorId, null);
});
