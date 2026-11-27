import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const matrix = JSON.parse(await readFile(new URL('./tool-acceptance.json', import.meta.url), 'utf8'));
const app = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('acceptance matrix covers every active CAD tool button', () => {
  const expected = ['select', 'line', 'rect', 'rectCenter', 'circle', 'circle3', 'polygon', 'ellipse', 'arc', 'trim', 'extend'];
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
  assert.match(app, /activeToggle\.setAttribute\('aria-pressed',String\(!!lastDrawingTool&&activeTool===lastDrawingTool\)\)/);
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
  assert.match(app, /sketches:sketchLayers\.map\(layer=>\(\{\.\.\.layer\}\)\)/);
  assert.match(app, /sketchLayers=data&&Array\.isArray\(data\.sketches\)/);
  assert.match(app, /className='tree-row tree-sketch'/);
  assert.match(app, /members=drawnObjects\.filter\(obj=>sketchMetaForObject\(obj\)\.sketchId===layer\.id\)/);
  assert.match(app, /sketches:sketchLayers\.map\(layer=>\(\{\.\.\.layer\}\)\)/);
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

test('Modelado stays unavailable until 3D modeling operations are implemented', () => {
  assert.match(app, /id="dockModeling"[^>]*aria-disabled="true" disabled[^>]*title="Modelado · próximamente"/);
  assert.doesNotMatch(app, /getElementById\('dockModeling'\)\.addEventListener\('click'/);
});

test('Croquis autosaves active sessions, partial line and arc input, and restores them', () => {
  assert.match(app, /activeSketchId,sketchMode,sketchPlane,activeLine:[\s\S]*?activeArc:/);
  assert.match(app, /if\(arcPoints\.length<2\)[\s\S]*?saveViewportProject\(\);recordDrawingHistory\(\)/);
  assert.match(app, /activeSketchId=data&&typeof data\.activeSketchId==='string'/);
  assert.match(app, /arcPoints=data&&Array\.isArray\(data\.activeArc\)/);
  assert.match(app, /visibilitychange[\s\S]*?saveViewportProject\(\)/);
  assert.match(app, /pagehide',saveViewportProject/);
});

test('Capas controla visibilidad de croquis y entidades y conserva el estado', () => {
  assert.match(app, /className='tree-visibility'/);
  assert.match(app, /className='tree-visibility tree-visibility-object'/);
  assert.match(app, /layer\.visible=layer\.visible===false/);
  assert.match(app, /obj\.userData\.layerVisible=obj\.userData\.layerVisible===false/);
  assert.match(app, /visible:obj\.userData\.layerVisible!==false/);
  assert.match(app, /obj\.visible=obj\.userData\.layerVisible&&\(!owningLayer\|\|owningLayer\.visible!==false\)/);
});


test('Polyline and rectangle constraints use the parametric solver and update rendered geometry',()=>{
  assert.match(app,/import \{ ParametricSketch \} from '\.\/parametric-sketch\.mjs'/);
  assert.match(app,/meta\.parametricModel=buildParametricSketchModel\(meta,obj\.userData\.controlPoints\|\|\[\]\)/);
  assert.match(app,/function solveSketchConstraints\(obj\)[\s\S]*?ParametricSketch\.fromJSON\(meta\.parametricModel\)[\s\S]*?solveParametricSketch\(model\)[\s\S]*?updateFatStroke\(obj,next\)/);
  assert.match(app,/model\.addConstraint\(c\.type,refs/);
});


test('equal-length relation is exposed and connected for two-segment polylines',()=>{
  assert.match(app,/data-sketch-constraint="equal"/);
  assert.match(app,/c\.type==='parallel'\|\|c\.type==='perpendicular'\|\|c\.type==='equal'/);
  assert.match(app,/else if\(type==='parallel'\|\|type==='perpendicular'\)/);
  assert.match(app,/else if\(type==='equal'\)/);
});


test('equal-length relation is available on rectangles but not other unsupported relation types',()=>{
  assert.match(app,/type==='equal'&&\(!\['polyline','rect'\]\.includes\(meta\.type\)\|\|n<3\)/);
});

test('Circle and arc dimensions are connected to the parametric solver and rendered curve',()=>{
  assert.match(app,/function applySketchDimension\(type\)/);
  assert.match(app,/meta\.dimensions\.push\(dimension\)/);
  assert.match(app,/const entityId=meta\.type==='circle'\?meta\.id\+'-circle':meta\.id\+'-arc'/);
  assert.match(app,/model\.addConstraint\(dimension\.type,\[entityId\],\{id:constraintId,value:dimension\.value\}\)/);
  assert.match(app,/meta\.type==='circle'\|\|meta\.type==='arc'[\s\S]*?solveParametricSketch\(model\)[\s\S]*?updateFatStroke\(obj,next\)/);
  assert.match(app,/radiusDimensionTool/);
  assert.match(app,/diameterDimensionTool/);
});

test('Radius and diameter controls are disabled for unsupported or fixed selections',()=>{
  assert.match(app,/!obj\|\|!\['circle','arc'\]\.includes\(meta\.type\)\|\|meta\.fixed/);
  assert.match(app,/window\.prompt\(type==='radius'\?/);
  assert.match(app,/saveViewportProject\(\);recordDrawingHistory\(\);refreshWorkspacePanels\(\)/);
});

test('Android touch selection toggles multiple entities without keyboard modifiers',()=>{
  assert.match(app,/const selectionTouchPointers=new Set\(\);let selectionTouchMulti=false/);
  assert.match(app,/if\(activeTool==='select'&&event\.pointerType==='touch'\)[\s\S]*?selectionTouchPointers\.add\(event\.pointerId\)/);
  assert.match(app,/event\.pointerType==='touch'\|\|event\.shiftKey\|\|event\.ctrlKey\|\|event\.metaKey/);
  assert.match(app,/if\(!canceledSelectionTouch&&down&&down\.pointerId===event\.pointerId/);
  assert.match(app,/selectedObjects\.includes\(obj\)/);
  assert.match(app,/function setSelectedObject\(obj,additive=false\)/);
  assert.match(app,/Toca dos círculos para seleccionarlos y aplicar Concéntrico/);
});

test('Concentric relation is exposed only for exactly two selected circles',()=>{
  assert.match(app,/data-sketch-constraint="concentric"/);
  assert.match(app,/selectedObjects=\[\]/);
  assert.match(app,/selectedObjects\.length!==2\|\|pair\.length!==2/);
  assert.match(app,/modelA\.addConstraint\('concentric',\[circleA,circleB\]/);
  assert.match(app,/meta\.parametricModel=model\.toJSON\(\)/);
  assert.match(app,/updateCircle\(a,ma,modelA,circleA,mb\.id\)/);
  assert.match(app,/updateCircle\(b,mb,modelA,circleB,ma\.id\)/);
});

test('Concentric relation rejects different planes and fixed circles',()=>{
  assert.match(app,/ma\.plane!==mb\.plane/);
  assert.match(app,/ma\.fixed\|\|mb\.fixed/);
  assert.match(app,/type==='concentric'\?\(selectedObjects\.length!==2/);
});

test('Three-point circle is wired to mouse and Android touch input with preview and autosave', () => {
  assert.match(app, /data-palette-tool="circle3"/);
  assert.match(app, /getElementById\('circle3Tool'\)\.addEventListener\('click'/);
  assert.match(app, /if\(activeTool==='circle3'\)\{addCircleThreePoint\(p\);return;\}/);
  assert.match(app, /activeTool==='circle3'\?makeCircleThreePointShape/);
  assert.match(app, /function addCircleThreePoint\(point\)/);
  assert.match(app, /circleThroughThreePoints\(planeCoords\(first\),planeCoords\(second\),planeCoords\(third\)\)/);
  assert.match(app, /Círculo: segundo punto fijado · marca el tercero/);
  assert.match(app, /saveViewportProject\(\);recordDrawingHistory\(\);return true;/);
});

test('Centered rectangle is wired to the active-plane touch and pointer drawing flow', () => {
  assert.match(app, /data-palette-tool="rectCenter"/);
  assert.match(app, /getElementById\('rectCenterTool'\)\.addEventListener\('click'/);
  assert.match(app, /function makeShape\(type,a,b,preview\)[\s\S]*?type==='rectCenter'[\s\S]*?rectangleFromCenter/);
  assert.match(app, /type==='rectCenter'\?'rect':type/);
  assert.match(app, /type==='rect'\|\|type==='rectCenter'\)\{meta\.constraints=/);
  assert.match(app, /rectCenter:'Marca el centro y arrastra hasta una esquina'/);
});
