import test from 'node:test';
import assert from 'node:assert/strict';
import { ParametricSketch, solveParametricSketch } from '../parametric-sketch.mjs';

const closeTo=(actual,expected,tolerance=1e-4)=>assert.ok(Math.abs(actual-expected)<=tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);

test('driving linear dimension changes line endpoints to requested length',()=>{
  const model=new ParametricSketch({units:'cm'});
  const a=model.addPoint(0,0,{id:'a'}), b=model.addPoint(10,0,{id:'b'});
  model.addLine(a,b,{id:'edge'});
  model.addConstraint('distance',[a,b],{id:'length-25',value:25});
  const result=solveParametricSketch(model);
  assert.notEqual(result.status,'conflict');
  closeTo(Math.hypot(model.entities.b.u-model.entities.a.u,model.entities.b.v-model.entities.a.v),25);
});

test('driving radius dimension updates a circle radius',()=>{
  const model=new ParametricSketch({units:'cm'});
  const center=model.addPoint(2,-3,{id:'center'});
  const circle=model.addCircle(center,5,{id:'circle'});
  model.addConstraint('radius',[circle],{id:'radius-12',value:12});
  const result=solveParametricSketch(model);
  assert.notEqual(result.status,'conflict');
  closeTo(model.entities.circle.radius,12);
});

test('driving diameter dimension sets the circle radius to half the diameter',()=>{
  const model=new ParametricSketch({units:'cm'});
  const circle=model.addCircle({u:0,v:0},4,{id:'circle'});
  model.addConstraint('diameter',[circle],{id:'diameter-30',value:30});
  const result=solveParametricSketch(model);
  assert.notEqual(result.status,'conflict');
  closeTo(model.entities.circle.radius,15);
});

test('incompatible driving dimensions are reported as a conflict',()=>{
  const model=new ParametricSketch({units:'cm'});
  const a=model.addPoint(0,0,{id:'a'}), b=model.addPoint(10,0,{id:'b'});
  model.addLine(a,b,{id:'edge'});
  model.addConstraint('distance',[a,b],{id:'length-10',value:10});
  model.addConstraint('distance',[a,b],{id:'length-20',value:20});
  assert.equal(solveParametricSketch(model).status,'conflict');
});
