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
