import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const matrix = JSON.parse(await readFile(new URL('./tool-acceptance.json', import.meta.url), 'utf8'));
const app = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('acceptance matrix covers every active CAD tool button', () => {
  const expected = ['select', 'line', 'rect', 'circle', 'polygon', 'ellipse', 'arc', 'trim', 'extend'];
  assert.deepEqual(matrix.tools.map(tool => tool.id), expected);
  for (const tool of matrix.tools) {
    assert.match(app, new RegExp('id="' + tool.buttonId + '"'));
    assert.match(app, new RegExp("getElementById\\('" + tool.buttonId + "'\\)\\.addEventListener\\('click'"));
    assert.ok(tool.manualScenarios.length >= 3, tool.id + ' needs manual acceptance scenarios');
    assert.ok(['not_verified', 'in_progress', 'approved'].includes(tool.status), tool.id + ' has an unknown acceptance status');
  }
});

test('approval status requires reproducible evidence fields', () => {
  for (const tool of matrix.tools) {
    if (tool.status === 'approved') {
      assert.ok(tool.evidence, tool.id + ' is approved without evidence');
      assert.ok(tool.evidence.commit, tool.id + ' evidence is missing the tested commit');
      assert.ok(tool.evidence.browser, tool.id + ' evidence is missing browser validation');
      assert.ok(tool.evidence.android, tool.id + ' evidence is missing Android validation');
    }
  }
});

test('global acceptance criteria are defined', () => {
  assert.ok(matrix.globalAcceptance.length >= 8);
});

test('Croquis is a dedicated mode with plane-aware entry and finish control', () => {
  assert.match(app, /let activeTool='select',lastDrawingTool=null,sketchMode=false,sketchPlane='XZ'/);
  assert.match(app, /nocturne-toggle-sketch-mode/);
  assert.match(app, /nocturne-open-sketch-tools/);
  assert.match(app, /const setSketchMode=enabled=>/);
  assert.match(app, /setWorkPlane\(initialPlane,true\)/);
  assert.match(app, /dockSketchButton\.setAttribute\('aria-pressed','true'\)/);
  assert.match(app, /dockSketchButton\.setAttribute\('aria-pressed','false'\)/);
  assert.match(app, /activeToggle\.hidden=!sketchMode/);
  assert.match(app, /glyphs\[lastDrawingTool\]:glyphs\.select/);
  assert.match(app, /Herramienta de selección activa/);
});
