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


test('solves radius and diameter dimensions on circles',()=>{
  const sketch=new ParametricSketch();
  const circle=sketch.addCircle({u:1,v:2},2);
  sketch.addConstraint('diameter',[circle],{value:10});
  const result=solveParametricSketch(sketch);
  near(sketch.entities[circle].radius,5);
  assert.equal(result.status,'fully-constrained');
});

test('solves horizontal and vertical distance dimensions',()=>{
  const sketch=new ParametricSketch();
  const a=sketch.addPoint(0,0),b=sketch.addPoint(2,3);
  sketch.addConstraint('horizontalDistance',[a,b],{value:7});
  sketch.addConstraint('verticalDistance',[a,b],{value:4});
  solveParametricSketch(sketch);
  near(sketch.entities[b].u-sketch.entities[a].u,7);
  near(sketch.entities[b].v-sketch.entities[a].v,4);
});

test('solves a target angle between two lines',()=>{
  const sketch=new ParametricSketch();
  const first=sketch.addLine({u:0,v:0},{u:3,v:0});
  const second=sketch.addLine({u:0,v:1},{u:1,v:2});
  sketch.addConstraint('angle',[first,second],{value:Math.PI/2});
  solveParametricSketch(sketch);
  const a=sketch.entities[first],b=sketch.entities[second];
  const p=sketch.entities[a.a],q=sketch.entities[a.b],r=sketch.entities[b.a],s=sketch.entities[b.b];
  const da={u:q.u-p.u,v:q.v-p.v},db={u:s.u-r.u,v:s.v-r.v};
  near(Math.atan2(da.u*db.v-da.v*db.u,da.u*db.u+da.v*db.v),Math.PI/2);
});

test('keeps a point on a line and supports tangent line-circle contact',()=>{
  const sketch=new ParametricSketch();
  const base=sketch.addLine({u:-3,v:0},{u:3,v:0});
  const p=sketch.addPoint(1,2);
  sketch.addConstraint('pointOnLine',[p,base]);
  solveParametricSketch(sketch);
  near(sketch.entities[p].v,0);

  const tangentSketch=new ParametricSketch();
  const tangent=tangentSketch.addLine({u:-3,v:2},{u:3,v:2});
  const circle=tangentSketch.addCircle({u:0,v:0},1);
  tangentSketch.addConstraint('tangentLineCircle',[tangent,circle]);
  solveParametricSketch(tangentSketch);
  const l=tangentSketch.entities[tangent],a=tangentSketch.entities[l.a],b=tangentSketch.entities[l.b],center=tangentSketch.entities[tangentSketch.entities[circle].center];
  const signedDistance=Math.abs((b.u-a.u)*(center.v-a.v)-(b.v-a.v)*(center.u-a.u))/Math.hypot(b.u-a.u,b.v-a.v);
  near(signedDistance,tangentSketch.entities[circle].radius);
});


test('stores arcs with center, radius, start angle and signed sweep',()=>{
  const sketch=new ParametricSketch({plane:'YZ'});
  const arc=sketch.addArc({u:2,v:3},4,Math.PI/4,-Math.PI/2);
  const restored=ParametricSketch.fromJSON(sketch.toJSON());
  const entity=restored.entities[arc];
  assert.equal(entity.type,'arc');
  near(entity.radius,4);
  near(entity.startAngle,Math.PI/4);
  near(entity.sweep,-Math.PI/2);
  const result=solveParametricSketch(restored);
  assert.equal(result.dof,5);
});
