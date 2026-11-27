import test from 'node:test';
import assert from 'node:assert/strict';
import { ParametricSketch, solveParametricSketch } from '../parametric-sketch.mjs';

const near=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<=t,`${a} is not within ${t} of ${b}`);

test('solves horizontal and vertical line constraints in local sketch coordinates',()=>{
  const sketch=new ParametricSketch({plane:'YZ'});
  const horizontal=sketch.addLine({u:0,v:2},{u:5,v:4});
  const vertical=sketch.addLine({u:3,v:0},{u:4,v:6});
  sketch.addConstraint('horizontal',[horizontal]);
  sketch.addConstraint('vertical',[vertical]);
  const result=solveParametricSketch(sketch);
  assert.notEqual(result.status,'conflict');
  const h=sketch.entities[horizontal],v=sketch.entities[vertical];
  near(sketch.entities[h.a].v,sketch.entities[h.b].v);
  near(sketch.entities[v.a].u,sketch.entities[v.b].u);
});

test('coincident constraint joins two points and reports remaining degrees of freedom',()=>{
  const sketch=new ParametricSketch();
  const a=sketch.addPoint(0,0),b=sketch.addPoint(4,3);
  sketch.addConstraint('coincident',[a,b]);
  const result=solveParametricSketch(sketch);
  near(sketch.entities[a].u,sketch.entities[b].u);
  near(sketch.entities[a].v,sketch.entities[b].v);
  assert.equal(result.status,'underconstrained');
  assert.equal(result.dof,2);
});

test('distance dimension is solved as a persistent scalar constraint',()=>{
  const sketch=new ParametricSketch();
  const a=sketch.addPoint(0,0),b=sketch.addPoint(8,1);
  sketch.addConstraint('distance',[a,b],{value:5});
  const result=solveParametricSketch(sketch);
  near(Math.hypot(sketch.entities[a].u-sketch.entities[b].u,sketch.entities[a].v-sketch.entities[b].v),5);
  assert.equal(result.status,'underconstrained');
});

test('fixed point constraints anchor geometry and detect a fully constrained point',()=>{
  const sketch=new ParametricSketch();
  const p=sketch.addPoint(2,7);
  sketch.addConstraint('fixed',[p]);
  const result=solveParametricSketch(sketch);
  assert.equal(result.status,'fully-constrained');
  assert.equal(result.dof,0);
  near(sketch.entities[p].u,2); near(sketch.entities[p].v,7);
});

test('detects incompatible constraints instead of silently accepting them',()=>{
  const sketch=new ParametricSketch();
  const a=sketch.addPoint(0,0),b=sketch.addPoint(4,0);
  sketch.addConstraint('fixed',[a]); sketch.addConstraint('fixed',[b]);
  sketch.addConstraint('distance',[a,b],{value:10});
  const result=solveParametricSketch(sketch);
  assert.equal(result.status,'conflict');
  assert.ok(result.residual>1);
});

test('persists entity ids, constraints, plane and solver state through JSON',()=>{
  const sketch=new ParametricSketch({id:'main-sketch',plane:'XY',units:'mm'});
  const line=sketch.addLine({u:0,v:0},{u:2,v:3});
  sketch.addConstraint('horizontal',[line]);
  const restored=ParametricSketch.fromJSON(sketch.toJSON());
  assert.equal(restored.id,'main-sketch');
  assert.equal(restored.plane,'XY');
  assert.equal(restored.entities[line].type,'line');
  assert.equal(restored.constraints[0].type,'horizontal');
  const result=solveParametricSketch(restored);
  assert.notEqual(result.status,'conflict');
});

test('rejects invalid references, duplicate ids and degenerate circles',()=>{
  const sketch=new ParametricSketch();
  assert.throws(()=>sketch.addLine('missing','missing'),/Expected point/);
  assert.throws(()=>sketch.addCircle({u:0,v:0},0),/positive/);
  const p=sketch.addPoint(0,0,{id:'stable'});
  assert.throws(()=>sketch.addPoint(1,1,{id:'stable'}),/Duplicate/);
  assert.throws(()=>sketch.addConstraint('horizontal',[p]),/Expected line/);
});
