#!/usr/bin/env bash
set -euo pipefail

VERSION="0.160.0"
BASE="https://cdn.jsdelivr.net/npm/three@${VERSION}"
ROOT="app/src/main/assets/vendor/three"

mkdir -p "${ROOT}/build" "${ROOT}/examples/jsm/controls" "${ROOT}/examples/jsm/lines"

fetch() {
  local source="$1"
  local target="$2"
  echo "Fetching Three.js ${source}"
  curl --fail --location --silent --show-error "${BASE}/${source}" -o "${target}"
  test -s "${target}"
}

fetch "build/three.module.js" "${ROOT}/build/three.module.js"
fetch "examples/jsm/controls/OrbitControls.js" "${ROOT}/examples/jsm/controls/OrbitControls.js"
fetch "examples/jsm/lines/Line2.js" "${ROOT}/examples/jsm/lines/Line2.js"
fetch "examples/jsm/lines/LineSegments2.js" "${ROOT}/examples/jsm/lines/LineSegments2.js"
fetch "examples/jsm/lines/LineGeometry.js" "${ROOT}/examples/jsm/lines/LineGeometry.js"
fetch "examples/jsm/lines/LineMaterial.js" "${ROOT}/examples/jsm/lines/LineMaterial.js"
fetch "examples/jsm/lines/LineSegmentsGeometry.js" "${ROOT}/examples/jsm/lines/LineSegmentsGeometry.js"
fetch "LICENSE" "${ROOT}/LICENSE"

echo "Three.js ${VERSION} vendored successfully."
