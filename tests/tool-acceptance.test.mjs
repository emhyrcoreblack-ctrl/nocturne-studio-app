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
  assert.match(app, /getElementById\('dockSketch'\)\.addEventListener\('click',\(\)=>window\.dispatchEvent\(new Event\('nocturne-toggle-sketch-mode'\)\)\)/);
  assert.match(app, /addEventListener\('nocturne-toggle-sketch-mode',\(\)=>setSketchMode\(!sketchMode\)\)/);
  assert.doesNotMatch(app, /dockSketchButton\.addEventListener\('click',\(\)=>setSketchMode\(!sketchMode\)\)/);
});

test('Tools palette toggles independently and closes after choosing a drawing tool', () => {
  assert.match(app, /getElementById\('dockTools'\)\.addEventListener\('click',\(\)=>window\.dispatchEvent\(new Event\('nocturne-toggle-sketch-tools'\)\)\)/);
  assert.match(app, /addEventListener\('nocturne-open-sketch-tools',\(\)=>setDrawPaletteOpen\(true\)\)/);
  assert.match(app, /addEventListener\('nocturne-toggle-sketch-tools',\(\)=>setDrawPaletteOpen\(!drawPaletteOpen\)\)/);
  assert.match(app, /function chooseTool\(tool\)[\s\S]*?setTool\(activeTool===tool\?'select':tool\);[\s\S]*?if\(tool!=='select'\)closeDrawPalette\(\)/);
  assert.match(app, /activeToggle\.hidden=!lastDrawingTool/);
  assert.match(app, /activeToggle\.setAttribute\('aria-pressed',String\(!!lastDrawingTool&&activeTool===shownTool\)\)/);
});

test('Selecting a sketch tool does not reset it during same-plane synchronization', () => {
  assert.match(app, /const planeChanged=requestedPlane!==sketchPlane/);
  assert.match(app, /if\(hasGeometry&&planeChanged\)/);
  assert.match(app, /if\(planeChanged\){[\s\S]*?if\(activeTool!=='select'\)setTool\('select'\)/);
  assert.match(app, /function setTool\(tool\)[\s\S]*?setWorkPlane\(activePlane,activePlane!=='VIEW'\)/);
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


test('Dock options restore hover, focus and touch feedback with a green status dot', () => {
  assert.match(app, /#onshapeDock button:hover:not\(:disabled\)::after/);
  assert.match(app, /#onshapeDock button:active:not\(:disabled\)::after/);
  assert.match(app, /background:#9fe0b0/);
});

test('Orientation cube opens a compact view and work-plane menu', () => {
  assert.match(app, /id='orientationMenu'/);
  assert.match(app, /cube\.addEventListener\('click'/);
  assert.match(app, /data-orient="top"/);
  assert.match(app, /top:'XZ',bottom:'XZ',front:'XY',back:'XY',right:'YZ',left:'YZ'/);
  assert.match(app, /#workPlaneSwitcher\{display:none!important\}/);
  assert.match(app, /function setIsometricView\(\)/);
});
