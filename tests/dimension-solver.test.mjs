import test from 'node:test';
import assert from 'node:assert/strict';
import { ParametricSketch, solveParametricSketch } from '../parametric-sketch.mjs';

test('la cota lineal modifica la distancia entre puntos del croquis',()=>{
 const model=new ParametricSketch({id:'dimension-line',units:'cm'});
 const a=model.addPoint(0,0,{id:'a'}),b=model.addPoint(2,0,{id:'b'});
 model.addLine(a,b,{id:'edge'});
 model.addConstraint('distance',[a,b],{id:'dimension-length',value:5});
 const result=solveParametricSketch(model);
 assert.notEqual(result.status,'conflict');
 assert.ok(Math.abs(Math.hypot(model.entities.b.u-model.entities.a.u,model.entities.b.v-model.entities.a.v)-5)<1e-4);
});

test('la cota de diámetro resuelve el radio de un círculo',()=>{
 const model=new ParametricSketch({id:'dimension-circle',units:'cm'});
 model.addCircle({u:1,v:2},2,{id:'circle'});
 model.addConstraint('diameter',['circle'],{id:'dimension-diameter',value:10});
 const result=solveParametricSketch(model);
 assert.notEqual(result.status,'conflict');
 assert.ok(Math.abs(model.entities.circle.radius-5)<1e-4);
});
