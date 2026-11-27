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

test('Croquis starts and finishes independent sketch sessions on the selected plane', () => {
  assert.match(app, /let activeTool='select',lastDrawingTool=null,sketchMode=false,sketchPlane='XZ'/);
  assert.match(app, /const setSketchMode=enabled=>/);
  assert.match(app, /const layer=createSketchLayerRecord\(planeName\)/);
  assert.match(app, /layer\.status='active';sketchLayers\.push\(layer\);activeSketchId=layer\.id/);
  assert.match(app, /finished\.status='completed'/);
  assert.match(app, /dockSketchButton\.addEventListener\('click',\(\)=>setSketchMode\(!sketchMode\)\)/);
});

test('Tools palette remains independent from the Croquis session button', () => {
  assert.match(app, /getElementById\('dockTools'\)\.addEventListener\('click',toggleDrawPalette\)/);
  assert.match(app, /function chooseTool\(tool\)\{setTool\(activeTool===tool\?'select':tool\)/);
  assert.match(app, /activeToggle\.hidden=!lastDrawingTool/);
  assert.match(app, /activeToggle\.setAttribute\('aria-pressed',String\(!!lastDrawingTool&&activeTool===lastDrawingTool\)\)/);
});

test('Each sketch is persisted as a feature-tree group with its geometry', () => {
  assert.match(app, /sketchLayers=\[\],activeSketchId=null/);
  assert.match(app, /sketchId:activeSketchId\|\|null/);
  assert.match(app, /sketches:sketchLayers\.map\(layer=>\(\.\.\.layer\)\)/);
  assert.match(app, /sketchLayers=data&&Array\.isArray\(data\.sketches\)/);
  assert.match(app, /className='tree-row tree-sketch'/);
  assert.match(app, /members=drawnObjects\.filter\(obj=>sketchMetaForObject\(obj\)\.sketchId===layer\.id\)/);
  assert.match(app, /sketches:sketchLayers\.map\(layer=>\(\.\.\.layer\)\)/);
});
