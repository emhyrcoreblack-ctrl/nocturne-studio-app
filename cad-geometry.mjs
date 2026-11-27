// Pure 2D path geometry shared by the CAD tools and Node regression tests.
const EPSILON = 1e-6;

export function intersectSegments2D(a, b, p, q) {
  const rx = b.u - a.u;
  const ry = b.v - a.v;
  const sx = q.u - p.u;
  const sy = q.v - p.v;
  const denominator = rx * sy - ry * sx;
  if (Math.abs(denominator) < 1e-9) return null;
  const dx = p.u - a.u;
  const dy = p.v - a.v;
  const t = (dx * sy - dy * sx) / denominator;
  const u = (dx * ry - dy * rx) / denominator;
  if (t <= EPSILON || t >= 1 - EPSILON || u < -EPSILON || u > 1 + EPSILON) return null;
  return { t, u };
}

export function selectTrimBounds(hits, targetS, totalLength, closed, epsilon = 1e-5) {
  const sorted = [...hits].sort((a, b) => a.s - b.s);
  const unique = [];
  for (const hit of sorted) {
    if (!unique.length || Math.abs(hit.s - unique[unique.length - 1].s) > epsilon) unique.push(hit);
  }
  if (unique.length < 2 || (closed && !(totalLength > 0))) return null;
  if (!closed) {
    const previous = [...unique].reverse().find(hit => hit.s < targetS - epsilon);
    const next = unique.find(hit => hit.s > targetS + epsilon);
    return previous && next ? { previous, next } : null;
  }
  const before = [...unique].reverse().find(hit => hit.s < targetS - epsilon);
  const after = unique.find(hit => hit.s > targetS + epsilon);
  const previous = before || { ...unique[unique.length - 1], s: unique[unique.length - 1].s - totalLength };
  const next = after || { ...unique[0], s: unique[0].s + totalLength };
  return next.s - previous.s > epsilon ? { previous, next } : null;
}

export function closedPathVertexIndices(cumulative, startS, endS, totalLength, epsilon = 1e-5) {
  if (!(totalLength > 0) || !(endS > startS)) return [];
  const indices = [];
  for (let index = 0; index < cumulative.length - 1; index++) {
    let s = cumulative[index];
    while (s <= startS + epsilon) s += totalLength;
    if (s < endS - epsilon) indices.push({ index, s });
  }
  indices.sort((a, b) => a.s - b.s);
  return indices.map(item => item.index);
}
export function intersectRaySegment2D(origin, direction, p, q, rayEpsilon = 1e-4, segmentEpsilon = 1e-5) {
  const rx = direction.u;
  const ry = direction.v;
  const sx = q.u - p.u;
  const sy = q.v - p.v;
  const denominator = rx * sy - ry * sx;
  if (Math.abs(denominator) < 1e-9) return null;
  const dx = p.u - origin.u;
  const dy = p.v - origin.v;
  const t = (dx * sy - dy * sx) / denominator;
  const u = (dx * ry - dy * rx) / denominator;
  if (t <= rayEpsilon || u < -segmentEpsilon || u > 1 + segmentEpsilon) return null;
  return { t, u };
}

// Pixel-space snap gate shared by CAD interaction and regression tests.
export function isWithinSnapTolerance(distancePx, tolerancePx = 14) {
  return Number.isFinite(distancePx) && Number.isFinite(tolerancePx) && tolerancePx >= 0 && distancePx <= tolerancePx;
}


// Construction primitives used by the extended sketch palette. All functions are
// pure 2D operations; the viewport maps their (u,v) coordinates onto the active plane.
export function circleThroughThreePoints(a, b, c, epsilon = 1e-8) {
  const determinant = 2 * (a.u * (b.v - c.v) + b.u * (c.v - a.v) + c.u * (a.v - b.v));
  if (Math.abs(determinant) <= epsilon) return null;
  const aa = a.u * a.u + a.v * a.v;
  const bb = b.u * b.u + b.v * b.v;
  const cc = c.u * c.u + c.v * c.v;
  const u = (aa * (b.v - c.v) + bb * (c.v - a.v) + cc * (a.v - b.v)) / determinant;
  const v = (aa * (c.u - b.u) + bb * (a.u - c.u) + cc * (b.u - a.u)) / determinant;
  const radius = Math.hypot(a.u - u, a.v - v);
  return Number.isFinite(radius) && radius > epsilon ? { center: { u, v }, radius } : null;
}

export function sampleBezier(points, segments = 32) {
  if (!Array.isArray(points) || (points.length !== 3 && points.length !== 4)) return [];
  const count = Math.max(2, Math.floor(segments));
  const result = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count, s = 1 - t;
    const weights = points.length === 3
      ? [s * s, 2 * s * t, t * t]
      : [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t];
    result.push(points.reduce((p, point, index) => ({
      u: p.u + point.u * weights[index], v: p.v + point.v * weights[index]
    }), { u: 0, v: 0 }));
  }
  return result;
}

export function sampleCatmullRom(points, samplesPerSegment = 12, closed = false) {
  if (!Array.isArray(points) || points.length < 2) return [];
  const count = Math.max(2, Math.floor(samplesPerSegment));
  const source = closed ? [...points, points[0], points[1]] : points;
  const result = [];
  const segments = closed ? points.length : points.length - 1;
  for (let i = 0; i < segments; i++) {
    const p0 = source[Math.max(0, i - 1)];
    const p1 = source[i];
    const p2 = source[i + 1];
    const p3 = source[Math.min(source.length - 1, i + 2)];
    for (let j = 0; j < count; j++) {
      const t = j / count, t2 = t * t, t3 = t2 * t;
      const blend = (key) => 0.5 * (
        2 * p1[key] + (-p0[key] + p2[key]) * t +
        (2*p0[key] - 5*p1[key] + 4*p2[key] - p3[key]) * t2 +
        (-p0[key] + 3*p1[key] - 3*p2[key] + p3[key]) * t3
      );
      result.push({ u: blend('u'), v: blend('v') });
    }
  }
  if (!closed) result.push({ ...points[points.length - 1] });
  return result;
}

export function createSlotPath(a, b, radius, arcSegments = 16) {
  if (!(radius > EPSILON) || Math.hypot(b.u - a.u, b.v - a.v) <= EPSILON) return [];
  const angle = Math.atan2(b.v - a.v, b.u - a.u);
  const count = Math.max(4, Math.floor(arcSegments));
  const points = [];
  for (let i = 0; i <= count; i++) {
    const t = angle + Math.PI / 2 - Math.PI * i / count;
    points.push({ u: b.u + Math.cos(t) * radius, v: b.v + Math.sin(t) * radius });
  }
  for (let i = 0; i <= count; i++) {
    const t = angle - Math.PI / 2 - Math.PI * i / count;
    points.push({ u: a.u + Math.cos(t) * radius, v: a.v + Math.sin(t) * radius });
  }
  return points;
}

export function splitPolylineAt(points, segmentIndex, t) {
  if (!Array.isArray(points) || points.length < 2 || segmentIndex < 0 || segmentIndex >= points.length - 1) return null;
  const ratio = Math.max(0, Math.min(1, t));
  const a = points[segmentIndex], b = points[segmentIndex + 1];
  const split = { u: a.u + (b.u - a.u) * ratio, v: a.v + (b.v - a.v) * ratio };
  return {
    first: [...points.slice(0, segmentIndex + 1).map(p => ({ ...p })), split],
    second: [split, ...points.slice(segmentIndex + 1).map(p => ({ ...p }))]
  };
}

export function offsetPolyline(points, distance, closed = false, miterLimit = 8) {
  if (!Array.isArray(points) || points.length < (closed ? 3 : 2) || !Number.isFinite(distance)) return [];
  const source = points.map(p => ({ u: p.u, v: p.v }));
  const count = source.length;
  const lineAt = (index) => {
    const prev = source[(index - 1 + count) % count], current = source[index], next = source[(index + 1) % count];
    const before = index > 0 || closed, after = index < count - 1 || closed;
    const n1 = before ? (() => { const d = Math.hypot(current.u-prev.u,current.v-prev.v)||1; return {u:-(current.v-prev.v)/d,v:(current.u-prev.u)/d}; })() : null;
    const n2 = after ? (() => { const d = Math.hypot(next.u-current.u,next.v-current.v)||1; return {u:-(next.v-current.v)/d,v:(next.u-current.u)/d}; })() : null;
    if (!n1) return { u: current.u + n2.u*distance, v: current.v + n2.v*distance };
    if (!n2) return { u: current.u + n1.u*distance, v: current.v + n1.v*distance };
    const mx=n1.u+n2.u,my=n1.v+n2.v,ml=Math.hypot(mx,my);
    if (ml < 1e-8) return { u: current.u+n2.u*distance, v: current.v+n2.v*distance };
    const dot=(mx/ml)*n2.u+(my/ml)*n2.v;
    const scale=Math.abs(dot)>1e-6?distance/dot:distance;
    const limit=Math.abs(distance)*miterLimit;
    const clamped=Math.max(-limit,Math.min(limit,scale));
    return { u: current.u+(mx/ml)*clamped, v: current.v+(my/ml)*clamped };
  };
  return source.map((_, index) => lineAt(index));
}

export function transformPolyline(points, options = {}) {
  const sx = Number.isFinite(options.scaleX) ? options.scaleX : 1;
  const sy = Number.isFinite(options.scaleY) ? options.scaleY : 1;
  const angle = Number.isFinite(options.rotation) ? options.rotation : 0;
  const tx = Number.isFinite(options.translateU) ? options.translateU : 0;
  const ty = Number.isFinite(options.translateV) ? options.translateV : 0;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const origin = options.origin || { u: 0, v: 0 };
  return points.map(point => {
    const x=(point.u-origin.u)*sx, y=(point.v-origin.v)*sy;
    return { ...point, u: origin.u+x*cos-y*sin+tx, v: origin.v+x*sin+y*cos+ty };
  });
}

export function mirrorPolyline(points, a, b) {
  const dx=b.u-a.u, dy=b.v-a.v, length2=dx*dx+dy*dy;
  if (length2 <= EPSILON*EPSILON) return [];
  return points.map(point => {
    const t=((point.u-a.u)*dx+(point.v-a.v)*dy)/length2;
    const q={u:a.u+t*dx,v:a.v+t*dy};
    return {...point,u:2*q.u-point.u,v:2*q.v-point.v};
  });
}

export function linearPattern(points, count, deltaU, deltaV) {
  const n=Math.max(1,Math.min(200,Math.floor(count)));
  if (!Array.isArray(points) || !points.length || !Number.isFinite(deltaU) || !Number.isFinite(deltaV)) return [];
  return Array.from({length:n},(_,index)=>points.map(p=>({...p,u:p.u+deltaU*index,v:p.v+deltaV*index})));
}

export function circularPattern(points, center, count, totalAngle = Math.PI*2) {
  const n=Math.max(1,Math.min(200,Math.floor(count)));
  if (!Array.isArray(points) || !points.length || !Number.isFinite(totalAngle)) return [];
  return Array.from({length:n},(_,index)=>{
    const angle=totalAngle*index/n,cos=Math.cos(angle),sin=Math.sin(angle);
    return points.map(p=>{const x=p.u-center.u,y=p.v-center.v;return {...p,u:center.u+x*cos-y*sin,v:center.v+x*sin+y*cos};});
  });
}

export function regularPolygon(center, radius, sides = 6, rotation = -Math.PI/2) {
  const n=Math.max(3,Math.min(128,Math.floor(sides)));
  if (!(radius > EPSILON) || !Number.isFinite(rotation)) return [];
  return Array.from({length:n},(_,index)=>{const angle=rotation+index*Math.PI*2/n;return {u:center.u+Math.cos(angle)*radius,v:center.v+Math.sin(angle)*radius};});
}

export function rectangleFromCenter(center, corner) {
  const dx=Math.abs(corner.u-center.u),dy=Math.abs(corner.v-center.v);
  if (dx <= EPSILON || dy <= EPSILON) return [];
  return [
    {u:center.u-dx,v:center.v-dy},{u:center.u+dx,v:center.v-dy},
    {u:center.u+dx,v:center.v+dy},{u:center.u-dx,v:center.v+dy}
  ];
}


// Replaces one polyline corner with a tangent circular arc. Coordinates are
// local 2D sketch coordinates; closed paths are supported without duplicating
// the seam vertex. Returns null for degenerate or over-sized radii.
export function filletPolylineVertex(points, vertexIndex, radius, closed = false, arcSegments = 8) {
  if (!Array.isArray(points) || points.length < (closed ? 3 : 3) ||
      !Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= points.length ||
      !(Number.isFinite(radius) && radius > EPSILON)) return null;
  if (!closed && (vertexIndex === 0 || vertexIndex === points.length - 1)) return null;
  const count = points.length;
  const prev = points[(vertexIndex - 1 + count) % count];
  const vertex = points[vertexIndex];
  const next = points[(vertexIndex + 1) % count];
  const ax = prev.u - vertex.u, ay = prev.v - vertex.v;
  const bx = next.u - vertex.u, by = next.v - vertex.v;
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  if (la <= EPSILON || lb <= EPSILON) return null;
  const a = { u: ax / la, v: ay / la }, b = { u: bx / lb, v: by / lb };
  const dot = Math.max(-1, Math.min(1, a.u * b.u + a.v * b.v));
  const angle = Math.acos(dot);
  if (angle <= 1e-5 || Math.PI - angle <= 1e-5) return null;
  const tangentDistance = radius / Math.tan(angle / 2);
  if (!Number.isFinite(tangentDistance) || tangentDistance >= Math.min(la, lb) - EPSILON) return null;
  const start = { u: vertex.u + a.u * tangentDistance, v: vertex.v + a.v * tangentDistance };
  const end = { u: vertex.u + b.u * tangentDistance, v: vertex.v + b.v * tangentDistance };
  const turn = (vertex.u - prev.u) * (next.v - vertex.v) - (vertex.v - prev.v) * (next.u - vertex.u);
  if (Math.abs(turn) <= EPSILON) return null;
  const sign = Math.sign(turn);
  const incoming = { u: (vertex.u - prev.u) / la, v: (vertex.v - prev.v) / la };
  const center = { u: start.u - sign * incoming.v * radius, v: start.v + sign * incoming.u * radius };
  const startAngle = Math.atan2(start.v - center.v, start.u - center.u);
  const endAngle = Math.atan2(end.v - center.v, end.u - center.u);
  let sweep = endAngle - startAngle;
  if (sign > 0) while (sweep <= 0) sweep += Math.PI * 2;
  else while (sweep >= 0) sweep -= Math.PI * 2;
  if (Math.abs(sweep) > Math.PI + 1e-5) return null;
  const segments = Math.max(2, Math.min(64, Math.floor(arcSegments)));
  const arc = Array.from({ length: segments + 1 }, (_, i) => {
    const t = startAngle + sweep * i / segments;
    return { u: center.u + Math.cos(t) * radius, v: center.v + Math.sin(t) * radius };
  });
  const result = [];
  for (let i = 0; i < count; i++) {
    if (i === vertexIndex) result.push(...arc);
    else result.push({ ...points[i] });
  }
  return result;
}

// Replaces one corner with two equal-distance bevel points.
export function chamferPolylineVertex(points, vertexIndex, distance, closed = false) {
  if (!Array.isArray(points) || points.length < 3 ||
      !Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= points.length ||
      !(Number.isFinite(distance) && distance > EPSILON)) return null;
  if (!closed && (vertexIndex === 0 || vertexIndex === points.length - 1)) return null;
  const count = points.length, vertex = points[vertexIndex];
  const prev = points[(vertexIndex - 1 + count) % count], next = points[(vertexIndex + 1) % count];
  const la = Math.hypot(prev.u - vertex.u, prev.v - vertex.v);
  const lb = Math.hypot(next.u - vertex.u, next.v - vertex.v);
  if (la <= EPSILON || lb <= EPSILON || distance >= Math.min(la, lb) - EPSILON) return null;
  const first = { u: vertex.u + (prev.u - vertex.u) * distance / la, v: vertex.v + (prev.v - vertex.v) * distance / la };
  const second = { u: vertex.u + (next.u - vertex.u) * distance / lb, v: vertex.v + (next.v - vertex.v) * distance / lb };
  const result = points.map((point, index) => index === vertexIndex ? [first, second] : [{ ...point }]).flat();
  return result;
}
