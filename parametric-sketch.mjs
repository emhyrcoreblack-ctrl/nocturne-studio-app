// Parametric 2D sketch model and damped least-squares constraint solver.
// Coordinates are local to the active sketch plane (u,v); rendering stays downstream.
const EPS = 1e-9;
const DEFAULTS = { tolerance: 1e-7, maxIterations: 80, damping: 1e-3 };

const finite = value => Number.isFinite(value);
const clone = value => JSON.parse(JSON.stringify(value));
const point = (model, id) => {
  const value = model.entities[id];
  if (!value || value.type !== 'point') throw new Error(`Expected point entity "${id}"`);
  return value;
};
const line = (model, id) => {
  const value = model.entities[id];
  if (!value || value.type !== 'line') throw new Error(`Expected line entity "${id}"`);
  return value;
};
const circle = (model, id) => {
  const value = model.entities[id];
  if (!value || value.type !== 'circle') throw new Error(`Expected circle entity "${id}"`);
  return value;
};
const distance = (a,b) => Math.hypot(a.u-b.u,a.v-b.v);
const cross = (a,b) => a.u*b.v-a.v*b.u;
const dot = (a,b) => a.u*b.u+a.v*b.v;
const direction = value => {
  const a=point(value.model,value.entity.a), b=point(value.model,value.entity.b);
  return {u:b.u-a.u,v:b.v-a.v};
};

export class ParametricSketch {
  constructor({ id = 'sketch-1', plane = 'XZ', units = 'mm' } = {}) {
    this.id=id; this.plane=plane; this.units=units;
    this.entities={}; this.constraints=[]; this.nextId=1; this.revision=0;
    this.status='underconstrained'; this.dof=null; this.lastSolve=null;
  }
  _id(prefix) { return `${prefix}-${this.nextId++}`; }
  addPoint(u,v,{id}={}) {
    if (!finite(u)||!finite(v)) throw new TypeError('Point coordinates must be finite');
    const key=id||this._id('point');
    if(this.entities[key]) throw new Error(`Duplicate entity id "${key}"`);
    this.entities[key]={id:key,type:'point',u,v}; this.revision++; return key;
  }
  addLine(a,b,{id}={}) {
    const pa=typeof a==='string'?a:this.addPoint(a.u,a.v);
    const pb=typeof b==='string'?b:this.addPoint(b.u,b.v);
    point(this,pa); point(this,pb);
    if(pa===pb) throw new Error('A line requires two distinct point references');
    const key=id||this._id('line');
    if(this.entities[key]) throw new Error(`Duplicate entity id "${key}"`);
    this.entities[key]={id:key,type:'line',a:pa,b:pb}; this.revision++; return key;
  }
  addCircle(center,radius,{id}={}) {
    const centerId=typeof center==='string'?center:this.addPoint(center.u,center.v);
    point(this,centerId);
    if(!finite(radius)||radius<=EPS) throw new RangeError('Circle radius must be positive');
    const key=id||this._id('circle');
    if(this.entities[key]) throw new Error(`Duplicate entity id "${key}"`);
    this.entities[key]={id:key,type:'circle',center:centerId,radius}; this.revision++; return key;
  }
  addConstraint(type,refs,options={}) {
    const allowed=new Set(['coincident','horizontal','vertical','parallel','perpendicular','equal','concentric','midpoint','fixed','distance','radius','diameter','horizontalDistance','verticalDistance','angle','pointOnLine','tangentLineCircle']);
    if(!allowed.has(type)) throw new Error(`Unsupported constraint "${type}"`);
    if(!Array.isArray(refs)) throw new TypeError('Constraint refs must be an array');
    const constraint={id:options.id||this._id('constraint'),type,refs:[...refs]};
    if(this.constraints.some(item=>item.id===constraint.id)) throw new Error(`Duplicate constraint id "${constraint.id}"`);
    if(type==='fixed') {
      const target=point(this,refs[0]); constraint.target={u:target.u,v:target.v};
    }
    if(['distance','radius','diameter','horizontalDistance','verticalDistance','angle'].includes(type)) {
      if(!finite(options.value)) throw new TypeError('Constraint value must be finite');
      if(['distance','radius','diameter'].includes(type)&&options.value<0) throw new RangeError('Dimension value must be non-negative');
      if(['radius','diameter'].includes(type)&&options.value<=EPS) throw new RangeError('Circle dimension must be positive');
      if(type==='angle'&&(options.value < -Math.PI || options.value > Math.PI)) throw new RangeError('Angle must be in radians between -pi and pi');
      constraint.value=options.value;
    }
    if(type==='tangentLineCircle') constraint.side=options.side===-1?-1:1;
    this._validateConstraint(constraint);
    this.constraints.push(constraint); this.revision++; return constraint.id;
  }
  _validateConstraint(c) {
    const r=c.refs;
    if(c.type==='coincident'||c.type==='midpoint'||c.type==='fixed') {
      if(c.type==='coincident') { if(r.length!==2) throw new Error('coincident expects two points'); r.forEach(id=>point(this,id)); }
      else if(c.type==='fixed') { if(r.length!==1) throw new Error('fixed expects one point'); point(this,r[0]); }
      else if(c.type==='midpoint') { if(r.length!==3) throw new Error('midpoint expects [point, line]'); point(this,r[0]); line(this,r[1]); }
      else { if(r.length!==1 && r.length!==2) throw new Error(`${c.type} expects point references`); r.forEach(id=>point(this,id)); }
    } else if(c.type==='horizontal'||c.type==='vertical') {
      if(r.length!==1) throw new Error(`${c.type} expects one line`); line(this,r[0]);
    } else if(c.type==='parallel'||c.type==='perpendicular'||c.type==='equal') {
      if(r.length!==2) throw new Error(`${c.type} expects two lines`); r.forEach(id=>line(this,id));
    } else if(c.type==='concentric') {
      if(r.length!==2) throw new Error('concentric expects two circles'); r.forEach(id=>circle(this,id));
    } else if(['distance','horizontalDistance','verticalDistance'].includes(c.type)) {
      if(r.length!==2) throw new Error(c.type+' expects two points'); r.forEach(id=>point(this,id));
    } else if(c.type==='radius'||c.type==='diameter') {
      if(r.length!==1) throw new Error(c.type+' expects one circle'); circle(this,r[0]);
    } else if(c.type==='angle') {
      if(r.length!==2) throw new Error('angle expects two lines'); r.forEach(id=>line(this,id));
    } else if(c.type==='pointOnLine') {
      if(r.length!==2) throw new Error('pointOnLine expects [point, line]'); point(this,r[0]); line(this,r[1]);
    } else if(c.type==='tangentLineCircle') {
      if(r.length!==2) throw new Error('tangentLineCircle expects [line, circle]'); line(this,r[0]); circle(this,r[1]);
    }
  }
  removeConstraint(id) {
    const before=this.constraints.length;
    this.constraints=this.constraints.filter(item=>item.id!==id);
    if(this.constraints.length!==before) this.revision++;
    return this.constraints.length!==before;
  }
  toJSON() { return clone({schemaVersion:1,id:this.id,plane:this.plane,units:this.units,entities:this.entities,constraints:this.constraints,nextId:this.nextId,status:this.status,dof:this.dof}); }
  static fromJSON(data) {
    if(!data||data.schemaVersion!==1||!data.entities||!Array.isArray(data.constraints)) throw new Error('Unsupported sketch schema');
    const model=new ParametricSketch({id:data.id,plane:data.plane,units:data.units});
    model.entities=clone(data.entities); model.constraints=clone(data.constraints);
    model.nextId=data.nextId||1; model.status=data.status||'underconstrained'; model.dof=data.dof??null;
    for(const c of model.constraints) model._validateConstraint(c);
    return model;
  }
}

function parameterLayout(model) {
  const values=[], descriptors=[];
  for(const entity of Object.values(model.entities)) {
    if(entity.type==='point') for(const key of ['u','v']) { values.push(entity[key]); descriptors.push({id:entity.id,key}); }
    if(entity.type==='circle') { values.push(entity.radius); descriptors.push({id:entity.id,key:'radius'}); }
  }
  return {values,descriptors};
}
function applyParameters(model,values,descriptors) {
  descriptors.forEach((item,index)=>{model.entities[item.id][item.key]=values[index];});
}
function residuals(model) {
  const result=[];
  for(const c of model.constraints) {
    const r=c.refs;
    if(c.type==='coincident') {
      const a=point(model,r[0]),b=point(model,r[1]);
      result.push(a.u-b.u,a.v-b.v);
    } else if(c.type==='horizontal'||c.type==='vertical') {
      const d=direction({model,entity:line(model,r[0])});
      result.push(c.type==='horizontal'?d.v:d.u);
    } else if(c.type==='parallel'||c.type==='perpendicular'||c.type==='equal') {
      const a=direction({model,entity:line(model,r[0])}),b=direction({model,entity:line(model,r[1])});
      if(c.type==='parallel') result.push(cross(a,b));
      if(c.type==='perpendicular') result.push(dot(a,b));
      if(c.type==='equal') result.push(Math.hypot(a.u,a.v)-Math.hypot(b.u,b.v));
    } else if(c.type==='concentric') {
      const a=point(model,circle(model,r[0]).center),b=point(model,circle(model,r[1]).center);
      result.push(a.u-b.u,a.v-b.v);
    } else if(c.type==='midpoint') {
      const p=point(model,r[0]),l=line(model,r[1]),a=point(model,l.a),b=point(model,l.b);
      result.push(p.u-(a.u+b.u)/2,p.v-(a.v+b.v)/2);
    } else if(c.type==='fixed') {
      const p=point(model,r[0]); result.push(p.u-c.target.u,p.v-c.target.v);
    } else if(c.type==='distance') {
      result.push(distance(point(model,r[0]),point(model,r[1]))-c.value);
    } else if(c.type==='horizontalDistance') {
      result.push(point(model,r[1]).u-point(model,r[0]).u-c.value);
    } else if(c.type==='verticalDistance') {
      result.push(point(model,r[1]).v-point(model,r[0]).v-c.value);
    } else if(c.type==='radius'||c.type==='diameter') {
      const target=c.type==='diameter'?c.value/2:c.value;
      result.push(circle(model,r[0]).radius-target);
    } else if(c.type==='angle') {
      const a=direction({model,entity:line(model,r[0])}),b=direction({model,entity:line(model,r[1])});
      let delta=Math.atan2(cross(a,b),dot(a,b))-c.value;
      delta=Math.atan2(Math.sin(delta),Math.cos(delta)); result.push(delta);
    } else if(c.type==='pointOnLine') {
      const p=point(model,r[0]),l=line(model,r[1]),a=point(model,l.a),b=point(model,l.b),d={u:b.u-a.u,v:b.v-a.v};
      const length=Math.hypot(d.u,d.v)||1; result.push(cross(d,{u:p.u-a.u,v:p.v-a.v})/length);
    } else if(c.type==='tangentLineCircle') {
      const l=line(model,r[0]),a=point(model,l.a),b=point(model,l.b),center=point(model,circle(model,r[1]).center),d={u:b.u-a.u,v:b.v-a.v};
      const length=Math.hypot(d.u,d.v)||1;
      result.push(cross(d,{u:center.u-a.u,v:center.v-a.v})/length-c.side*circle(model,r[1]).radius);
    }
  }
  return result;
}
function norm(values) { return Math.sqrt(values.reduce((sum,value)=>sum+value*value,0)); }
function solveLinear(matrix,vector) {
  const n=vector.length, a=matrix.map((row,i)=>[...row,vector[i]]);
  for(let col=0;col<n;col++) {
    let pivot=col;
    for(let row=col+1;row<n;row++) if(Math.abs(a[row][col])>Math.abs(a[pivot][col])) pivot=row;
    if(Math.abs(a[pivot][col])<1e-14) return null;
    [a[col],a[pivot]]=[a[pivot],a[col]];
    const divisor=a[col][col];
    for(let j=col;j<=n;j++) a[col][j]/=divisor;
    for(let row=0;row<n;row++) if(row!==col) {
      const factor=a[row][col];
      for(let j=col;j<=n;j++) a[row][j]-=factor*a[col][j];
    }
  }
  return a.map(row=>row[n]);
}
function jacobianAt(model,values,descriptors,baseResiduals) {
  const columns=values.map((value,index)=>{
    const h=1e-6*Math.max(1,Math.abs(value)), plus=[...values],minus=[...values];
    plus[index]+=h; minus[index]-=h;
    applyParameters(model,plus,descriptors); const rp=residuals(model);
    applyParameters(model,minus,descriptors); const rm=residuals(model);
    return baseResiduals.map((_,row)=>(rp[row]-rm[row])/(2*h));
  });
  applyParameters(model,values,descriptors);
  return baseResiduals.map((_,row)=>columns.map(column=>column[row]));
}
function matrixRank(matrix,epsilon=1e-8) {
  if(!matrix.length||!matrix[0]?.length) return 0;
  const a=matrix.map(row=>[...row]); let rank=0;
  for(let col=0;col<a[0].length&&rank<a.length;col++) {
    let pivot=rank;
    for(let row=rank+1;row<a.length;row++) if(Math.abs(a[row][col])>Math.abs(a[pivot][col])) pivot=row;
    if(Math.abs(a[pivot][col])<=epsilon) continue;
    [a[rank],a[pivot]]=[a[pivot],a[rank]];
    const value=a[rank][col];
    for(let j=col;j<a[0].length;j++) a[rank][j]/=value;
    for(let row=0;row<a.length;row++) if(row!==rank) {
      const factor=a[row][col];
      for(let j=col;j<a[0].length;j++) a[row][j]-=factor*a[rank][j];
    }
    rank++;
  }
  return rank;
}

export function solveParametricSketch(model,options={}) {
  if(!(model instanceof ParametricSketch)) throw new TypeError('Expected a ParametricSketch');
  const config={...DEFAULTS,...options};
  const {descriptors}=parameterLayout(model);
  let {values}=parameterLayout(model), damping=config.damping, iterations=0;
  let current;
  applyParameters(model,values,descriptors); current=residuals(model);
  let error=norm(current), converged=error<=config.tolerance;
  for(;iterations<config.maxIterations&&!converged;iterations++) {
    const jacobian=jacobianAt(model,values,descriptors,current);
    const columns=values.length, rows=current.length;
    if(!columns||!rows) break;
    const normal=Array.from({length:columns},()=>Array(columns).fill(0));
    const gradient=Array(columns).fill(0);
    for(let i=0;i<columns;i++) {
      for(let row=0;row<rows;row++) gradient[i]+=jacobian[row][i]*current[row];
      for(let j=0;j<columns;j++) for(let row=0;row<rows;row++) normal[i][j]+=jacobian[row][i]*jacobian[row][j];
      normal[i][i]+=damping*Math.max(1,normal[i][i]);
    }
    const step=solveLinear(normal,gradient.map(value=>-value));
    if(!step) break;
    const candidate=values.map((value,index)=>value+step[index]);
    applyParameters(model,candidate,descriptors);
    const candidateResiduals=residuals(model), candidateError=norm(candidateResiduals);
    if(candidateError<error) {
      values=candidate; current=candidateResiduals; error=candidateError;
      damping=Math.max(1e-12,damping/3);
      converged=error<=config.tolerance||norm(step)<=config.tolerance;
    } else {
      applyParameters(model,values,descriptors);
      damping=Math.min(1e12,damping*10);
      if(damping>=1e12) break;
    }
  }
  applyParameters(model,values,descriptors);
  const finalResiduals=residuals(model), finalError=norm(finalResiduals);
  const jacobian=jacobianAt(model,values,descriptors,finalResiduals);
  const rank=matrixRank(jacobian), dof=Math.max(0,descriptors.length-rank);
  const consistent=finalError<=Math.max(config.tolerance,1e-6);
  model.status=consistent?(dof===0?'fully-constrained':'underconstrained'):'conflict';
  model.dof=dof;
  model.lastSolve={status:model.status,dof,rank,variableCount:descriptors.length,residual:finalError,iterations};
  return {...model.lastSolve};
}
