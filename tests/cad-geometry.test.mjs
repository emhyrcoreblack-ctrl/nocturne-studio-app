import test from 'node:test';
import assert from 'node:assert/strict';
import { intersectSegments2D, intersectRaySegment2D, selectTrimBounds, closedPathVertexIndices, isWithinSnapTolerance } from '../cad-geometry.mjs';

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

test('extends a ray to the nearest forward segment intersection', () => {
  const hit = intersectRaySegment2D(
    {u:0,v:0}, {u:1,v:0}, {u:5,v:-2}, {u:5,v:2}
  );
  assert.ok(hit);
  assert.ok(Math.abs(hit.t - 5) < 1e-9);
  assert.ok(Math.abs(hit.u - 0.5) < 1e-9);
});

test('ray intersection rejects behind, parallel, and out-of-segment targets', () => {
  const origin = {u:0,v:0}, direction = {u:1,v:0};
  assert.equal(intersectRaySegment2D(origin,direction,{u:-5,v:-1},{u:-5,v:1}), null);
  assert.equal(intersectRaySegment2D(origin,direction,{u:2,v:1},{u:8,v:1}), null);
  assert.equal(intersectRaySegment2D(origin,direction,{u:5,v:2},{u:5,v:4}), null);
});

test('ray intersection accepts a target segment endpoint', () => {
  const hit = intersectRaySegment2D(
    {u:0,v:0}, {u:1,v:0}, {u:5,v:0}, {u:5,v:3}
  );
  assert.ok(hit);
  assert.ok(Math.abs(hit.t - 5) < 1e-9);
  assert.ok(Math.abs(hit.u) < 1e-9);
});


test('origin snap accepts points inside the pixel tolerance', () => {
  assert.equal(isWithinSnapTolerance(0), true);
  assert.equal(isWithinSnapTolerance(14), true);
  assert.equal(isWithinSnapTolerance(14.01), false);
});

test('origin snap rejects invalid distances and invalid tolerances', () => {
  assert.equal(isWithinSnapTolerance(Number.NaN), false);
  assert.equal(isWithinSnapTolerance(Infinity), false);
  assert.equal(isWithinSnapTolerance(1, -1), false);
});


import {
  circleThroughThreePoints, sampleBezier, sampleCatmullRom, createSlotPath,
  splitPolylineAt, offsetPolyline, transformPolyline, mirrorPolyline,
  linearPattern, circularPattern, regularPolygon, rectangleFromCenter
} from '../cad-geometry.mjs';

test('constructs a circle through three non-collinear points', () => {
  const circle = circleThroughThreePoints({u:1,v:0},{u:0,v:1},{u:-1,v:0});
  assert.ok(circle);
  assert.ok(Math.abs(circle.center.u) < 1e-9);
  assert.ok(Math.abs(circle.center.v) < 1e-9);
  assert.ok(Math.abs(circle.radius - 1) < 1e-9);
  assert.equal(circleThroughThreePoints({u:0,v:0},{u:1,v:1},{u:2,v:2}), null);
});

test('samples quadratic and cubic Bezier curves with exact endpoints', () => {
  const quadratic = sampleBezier([{u:0,v:0},{u:1,v:2},{u:2,v:0}], 10);
  assert.equal(quadratic.length, 11);
  assert.deepEqual(quadratic[0], {u:0,v:0});
  assert.deepEqual(quadratic.at(-1), {u:2,v:0});
  const cubic = sampleBezier([{u:0,v:0},{u:1,v:3},{u:3,v:3},{u:4,v:0}], 20);
  assert.equal(cubic.length, 21);
  assert.deepEqual(cubic.at(-1), {u:4,v:0});
});

test('samples an interpolating Catmull-Rom spline through every control point', () => {
  const controls = [{u:0,v:0},{u:1,v:2},{u:3,v:1}];
  const spline = sampleCatmullRom(controls, 8);
  assert.equal(spline.length, 17);
  assert.deepEqual(spline[0], controls[0]);
  assert.deepEqual(spline.at(-1), controls.at(-1));
  assert.ok(spline.some(p => Math.abs(p.u-1)<1e-9 && Math.abs(p.v-2)<1e-9));
});

test('creates a closed slot outline with two semicircular ends', () => {
  const slot = createSlotPath({u:0,v:0},{u:4,v:0},1,12);
  assert.equal(slot.length, 26);
  assert.ok(Math.abs(slot[0].u-4)<1e-9);
  assert.ok(Math.abs(slot[0].v-1)<1e-9);
  assert.deepEqual(createSlotPath({u:0,v:0},{u:0,v:0},1), []);
});

test('splits a polyline at an interior segment parameter', () => {
  const result = splitPolylineAt([{u:0,v:0},{u:4,v:0},{u:4,v:4}], 0, .25);
  assert.deepEqual(result.first, [{u:0,v:0},{u:1,v:0}]);
  assert.deepEqual(result.second, [{u:1,v:0},{u:4,v:0},{u:4,v:4}]);
  assert.equal(splitPolylineAt([{u:0,v:0}],0,.5), null);
});

test('offsets an open polyline and preserves its vertex count', () => {
  const offset = offsetPolyline([{u:0,v:0},{u:4,v:0},{u:4,v:4}], 1);
  assert.equal(offset.length, 3);
  assert.ok(Math.abs(offset[0].v-1)<1e-9);
  assert.ok(Math.abs(offset[2].u-3)<1e-9);
});

test('transforms and mirrors points without mutating the source geometry', () => {
  const source = [{u:1,v:0}];
  const rotated = transformPolyline(source,{rotation:Math.PI/2});
  assert.ok(Math.abs(rotated[0].u)<1e-9);
  assert.ok(Math.abs(rotated[0].v-1)<1e-9);
  const mirrored = mirrorPolyline(source,{u:0,v:-1},{u:0,v:1});
  assert.deepEqual(mirrored,[{u:-1,v:0}]);
  assert.deepEqual(source,[{u:1,v:0}]);
});

test('generates bounded linear and circular pattern copies', () => {
  const source = [{u:1,v:0}];
  const linear = linearPattern(source,3,2,0);
  assert.deepEqual(linear.map(copy=>copy[0]),[{u:1,v:0},{u:3,v:0},{u:5,v:0}]);
  const circular = circularPattern(source,{u:0,v:0},4);
  assert.equal(circular.length,4);
  assert.ok(Math.abs(circular[1][0].u)<1e-9);
  assert.ok(Math.abs(circular[1][0].v-1)<1e-9);
  assert.equal(linearPattern(source,500,1,1).length,200);
});

test('creates regular polygons and centered rectangles with validated dimensions', () => {
  const hex = regularPolygon({u:0,v:0},2,6);
  assert.equal(hex.length,6);
  assert.ok(Math.abs(Math.hypot(hex[0].u,hex[0].v)-2)<1e-9);
  const rect = rectangleFromCenter({u:0,v:0},{u:2,v:1});
  assert.deepEqual(rect,[{u:-2,v:-1},{u:2,v:-1},{u:2,v:1},{u:-2,v:1}]);
  assert.deepEqual(rectangleFromCenter({u:0,v:0},{u:0,v:1}),[]);
});

test('constructs a circle through three non-collinear points', () => {
  const circle = circleThroughThreePoints({u:1,v:0},{u:0,v:1},{u:-1,v:0});
  assert.ok(circle);
  assert.ok(Math.abs(circle.center.u) < 1e-9);
  assert.ok(Math.abs(circle.center.v) < 1e-9);
  assert.ok(Math.abs(circle.radius - 1) < 1e-9);
});

test('rejects a three-point circle when points are collinear', () => {
  assert.equal(circleThroughThreePoints({u:0,v:0},{u:1,v:1},{u:2,v:2}), null);
});

test('offsets a closed profile inward and outward without mutating its source',()=>{
  const square=[{u:0,v:0},{u:4,v:0},{u:4,v:4},{u:0,v:4}];
  const inward=offsetPolyline(square,1,true),outward=offsetPolyline(square,-1,true);
  assert.equal(inward.length,4);assert.equal(outward.length,4);
  assert.deepEqual(inward,[{u:1,v:1},{u:3,v:1},{u:3,v:3},{u:1,v:3}]);
  assert.deepEqual(outward,[{u:-1,v:-1},{u:5,v:-1},{u:5,v:5},{u:-1,v:5}]);
  assert.deepEqual(square,[{u:0,v:0},{u:4,v:0},{u:4,v:4},{u:0,v:4}]);
});
