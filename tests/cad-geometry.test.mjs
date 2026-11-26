import test from 'node:test';
import assert from 'node:assert/strict';
import { intersectSegments2D, selectTrimBounds, closedPathVertexIndices } from '../cad-geometry.mjs';

test('intersects two crossing segments and returns parameters', () => {
  const hit = intersectSegments2D({u:0,v:0},{u:10,v:0},{u:5,v:-2},{u:5,v:2});
  assert.ok(hit);
  assert.ok(Math.abs(hit.t - 0.5) < 1e-9);
  assert.ok(Math.abs(hit.u - 0.5) < 1e-9);
});

test('ignores parallel and endpoint-only contacts', () => {
  assert.equal(intersectSegments2D({u:0,v:0},{u:10,v:0},{u:0,v:1},{u:10,v:1}), null);
  assert.equal(intersectSegments2D({u:0,v:0},{u:10,v:0},{u:10,v:0},{u:10,v:5}), null);
});

test('selects the two intersections around a point on an open path', () => {
  const bounds = selectTrimBounds([{s:2,point:'A'},{s:8,point:'B'},{s:12,point:'C'}], 9, 15, false);
  assert.equal(bounds.previous.point, 'B');
  assert.equal(bounds.next.point, 'C');
});

test('wraps intersection bounds around a closed path seam', () => {
  const bounds = selectTrimBounds([{s:2,point:'A'},{s:8,point:'B'}], 1, 10, true);
  assert.equal(bounds.previous.point, 'B');
  assert.equal(bounds.previous.s, -2);
  assert.equal(bounds.next.point, 'A');
});

test('returns only the complementary vertices for a closed trim', () => {
  const indices = closedPathVertexIndices([0,2,4,6,8], 1, 7, 8);
  assert.deepEqual(indices, [1,2,3]);
  const wrapped = closedPathVertexIndices([0,2,4,6,8], 7, 11, 8);
  assert.deepEqual(wrapped, [0,1]);
});

test('does not produce trim bounds without a crossing on each side', () => {
  assert.equal(selectTrimBounds([{s:2,point:'A'},{s:8,point:'B'}], 1, 10, false), null);
  assert.equal(selectTrimBounds([{s:2,point:'A'}], 5, 10, true), null);
});

test('guards zero-length closed paths', () => {
  assert.deepEqual(closedPathVertexIndices([0,0,0], 0, 1, 0), []);
});
