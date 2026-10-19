import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { materializePieces, IMPORT_MODEL } from './literal.ts';

test('copies ideas and full body word for word in order', () => {
  const lines = ['1. ¿Mia es para vos?', 'Te lo digo en un minuto. Sin cambiar NADA.', '2. Cicatriz y gym', 'Tres preguntas que más nos hacen.'];
  const shots = materializePieces(lines, [[0, 1, 0, 'reel', 'instagram'], [2, 3, 2, 'reel', 'instagram']], 40);
  assert.deepEqual(shots.map(s => [s.concept, s.description]), [[lines[0], lines[1]], [lines[2], lines[3]]]);
});
test('does not create a script when the idea has none', () => {
  const [shot] = materializePieces(['Manchas, poros y acné', 'Mostrá el láser y explicá el tratamiento.'], [[0, 1, 0, 'reel', 'instagram']], 40);
  assert.equal(shot.script, '');
  assert.equal(shot.hook, '');
  assert.equal(shot.cta, '');
  assert.equal(shot.duration_estimate, '');
});
test('copies an explicit script without rewriting or shortening', () => {
  const [shot] = materializePieces(['Video 1', 'Guión: ¡Hola!', 'Primera escena, tal cual.', 'Segunda escena.', 'CTA: Visitá peptiva.life'], [[0, 4, 0, 'reel', 'instagram']], 40);
  assert.equal(shot.script, '¡Hola!\nPrimera escena, tal cual.\nSegunda escena.');
  assert.equal(shot.cta, 'Visitá peptiva.life');
});
test('preserves per-piece references', () => {
  const shots = materializePieces(['Video 1', 'https://www.instagram.com/reel/ABC/', 'Video 2', 'https://www.tiktok.com/@brand/video/123'], [[0, 1, 0, 'reel', 'instagram'], [2, 3, 2, 'tiktok', 'tiktok']], 40);
  assert.deepEqual(shots[0].references, ['https://www.instagram.com/reel/ABC/']);
  assert.deepEqual(shots[1].references, ['https://www.tiktok.com/@brand/video/123']);
});
test('rejects truncation and overlapping pieces rather than losing data', () => {
  assert.throws(() => materializePieces(['a', 'b'], [[0, 1, 0, 'reel', 'instagram'], [1, 1, 1, 'reel', 'instagram']], 40));
  assert.throws(() => materializePieces(['a', 'b'], [[0, 0, 0, 'reel', 'instagram'], [1, 1, 1, 'reel', 'instagram']], 1));
});
test('uses the selected economical Lovable model', () => {
  assert.equal(IMPORT_MODEL, 'google/gemini-3.1-flash-lite');
});