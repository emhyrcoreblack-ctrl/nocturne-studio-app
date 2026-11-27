// Safe CAD expression parser. Supports arithmetic, units, trig and named variables.
// Length results are normalized to centimetres; angle results are normalized to degrees.
// No eval(), Function(), or dynamic code execution is used.
const LENGTH_UNITS = new Map([
  ['mm', 0.1], ['millimeter', 0.1], ['millimeters', 0.1],
  ['cm', 1], ['centimeter', 1], ['centimeters', 1],
  ['m', 100], ['meter', 100], ['meters', 100],
  ['in', 2.54], ['inch', 2.54], ['inches', 2.54],
  ['ft', 30.48], ['foot', 30.48], ['feet', 30.48],
  ['yd', 91.44], ['yard', 91.44], ['yards', 91.44]
]);
const ANGLE_UNITS = new Map([
  ['deg', 1], ['degree', 1], ['degrees', 1],
  ['rad', 180 / Math.PI], ['radian', 180 / Math.PI], ['radians', 180 / Math.PI]
]);
const FUNCTIONS = new Set([
  'ceil','floor','round','exp','sqrt','abs','max','min','log','log10',
  'sin','cos','tan','acos','asin','atan','atan2','cosh','sinh','tanh','asinh','acosh','atanh'
]);
const finite = value => {
  if (!Number.isFinite(value)) throw new Error('El resultado no es finito.');
  return value;
};
const scalar = value => ({ value: finite(value), unit: 'scalar' });
const compatible = (a, b) => {
  if (a.unit !== b.unit) throw new Error('No mezcles unidades diferentes en una suma o resta.');
};

export function evaluateDimensionExpression(source, options = {}) {
  const rawInput = String(source ?? '').trim();
  let input = '';
  const functionParen = [];
  for (let i = 0; i < rawInput.length; i++) {
    const char = rawInput[i];
    if (char === '(') {
      const prefix = rawInput.slice(0, i).match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*$/);
      functionParen.push(!!(prefix && FUNCTIONS.has(prefix[1].toLowerCase())));
    } else if (char === ')') {
      functionParen.pop();
    }
    if (char === ',' && !functionParen.some(Boolean) && /[0-9]/.test(rawInput[i - 1] || '') && /[0-9]/.test(rawInput[i + 1] || '')) input += '.';
    else input += char;
  }
  if (!input) throw new Error('Escribe una medida.');
  input = input.replace(/^\s*=\s*/, '');
  let index = 0;
  const variables = options.variables || {};
  const skip = () => { while (/\s/.test(input[index] || '')) index++; };
  const consume = char => { skip(); if (input[index] === char) { index++; return true; } return false; };
  const identifier = () => {
    skip();
    const match = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(input.slice(index));
    if (!match) return null;
    index += match[0].length;
    return match[0].toLowerCase();
  };
  const parseExpression = () => {
    let left = parseTerm();
    while (true) {
      if (consume('+')) {
        const right = parseTerm(); compatible(left, right);
        left = { value: finite(left.value + right.value), unit: left.unit };
      } else if (consume('-')) {
        const right = parseTerm(); compatible(left, right);
        left = { value: finite(left.value - right.value), unit: left.unit };
      } else break;
    }
    return left;
  };
  const parseTerm = () => {
    let left = parsePower();
    while (true) {
      if (consume('*')) {
        const right = parsePower();
        if (left.unit !== 'scalar' && right.unit !== 'scalar') throw new Error('No se admite multiplicar dos medidas con unidades.');
        left = { value: finite(left.value * right.value), unit: left.unit === 'scalar' ? right.unit : left.unit };
      } else if (consume('/')) {
        const right = parsePower();
        if (Math.abs(right.value) < Number.EPSILON) throw new Error('No se puede dividir entre cero.');
        if (right.unit !== 'scalar' && left.unit !== right.unit) throw new Error('Las unidades de la división no son compatibles.');
        left = { value: finite(left.value / right.value), unit: right.unit === left.unit ? 'scalar' : left.unit };
      } else if (consume('%')) {
        const right = parsePower(); compatible(left, right);
        if (Math.abs(right.value) < Number.EPSILON) throw new Error('No se puede dividir entre cero.');
        left = { value: finite(left.value % right.value), unit: left.unit };
      } else break;
    }
    return left;
  };
  const parsePower = () => {
    let left = parseUnary();
    if (consume('^')) {
      const right = parsePower();
      if (left.unit !== 'scalar' || right.unit !== 'scalar') throw new Error('La potencia requiere valores sin unidades.');
      left = scalar(Math.pow(left.value, right.value));
    }
    return left;
  };
  const parseUnary = () => {
    if (consume('+')) return parseUnary();
    if (consume('-')) { const value = parseUnary(); return { value: -value.value, unit: value.unit }; }
    return parsePrimary();
  };
  const parsePrimary = () => {
    skip();
    if (consume('(')) {
      const value = parseExpression();
      if (!consume(')')) throw new Error('Falta cerrar el paréntesis.');
      return parseUnitSuffix(value);
    }
    if (consume('#')) {
      const name = identifier();
      if (!name) throw new Error('Falta el nombre de la variable.');
      const raw = variables[name] ?? variables['#' + name];
      if (raw === undefined) throw new Error('Variable no definida: #' + name);
      const value = typeof raw === 'number' ? scalar(raw) : raw;
      if (!value || !Number.isFinite(value.value) || !['scalar','length','angle'].includes(value.unit)) throw new Error('Valor de variable no válido: #' + name);
      return parseUnitSuffix({ value: value.value, unit: value.unit });
    }
    const start = index;
    while (/[0-9.]/.test(input[index] || '')) index++;
    if (start !== index) {
      const raw = Number(input.slice(start, index));
      if (!Number.isFinite(raw)) throw new Error('Número no válido.');
      return parseUnitSuffix(scalar(raw));
    }
    const name = identifier();
    if (!name) throw new Error('Se esperaba un número, variable o función.');
    if (name === 'pi') return parseUnitSuffix(scalar(Math.PI));
    if (FUNCTIONS.has(name)) {
      if (!consume('(')) throw new Error('La función ' + name + ' requiere paréntesis.');
      const args = [];
      if (!consume(')')) {
        do { args.push(parseExpression()); } while (consume(','));
        if (!consume(')')) throw new Error('Falta cerrar el paréntesis de ' + name + '.');
      }
      return parseUnitSuffix(applyFunction(name, args));
    }
    throw new Error('Nombre o función desconocida: ' + name);
  };
  const parseUnitSuffix = value => {
    const saved = index;
    const unit = identifier();
    if (!unit) return value;
    if (LENGTH_UNITS.has(unit)) {
      if (value.unit !== 'scalar') throw new Error('No se puede aplicar una unidad dos veces.');
      return { value: finite(value.value * LENGTH_UNITS.get(unit)), unit: 'length' };
    }
    if (ANGLE_UNITS.has(unit)) {
      if (value.unit !== 'scalar') throw new Error('No se puede aplicar una unidad dos veces.');
      return { value: finite(value.value * ANGLE_UNITS.get(unit)), unit: 'angle' };
    }
    index = saved;
    return value;
  };
  const applyFunction = (name, args) => {
    const unary = fn => {
      if (args.length !== 1) throw new Error(name + ' requiere un argumento.');
      const a = args[0];
      if (a.unit !== 'scalar' && !(['sin','cos','tan'].includes(name) && a.unit === 'angle')) throw new Error('La función ' + name + ' requiere un valor sin unidades.');
      return fn(a.value);
    };
    const angleInput = a => a.unit === 'angle' ? a.value : a.value;
    switch (name) {
      case 'ceil': return scalar(unary(Math.ceil));
      case 'floor': return scalar(unary(Math.floor));
      case 'round': return scalar(unary(Math.round));
      case 'exp': return scalar(unary(Math.exp));
      case 'sqrt': return scalar(unary(Math.sqrt));
      case 'abs': { const a = args[0]; if (args.length !== 1) throw new Error('abs requiere un argumento.'); return {value:Math.abs(a.value),unit:a.unit}; }
      case 'log': return scalar(unary(Math.log));
      case 'log10': return scalar(unary(Math.log10));
      case 'sin': return scalar(unary(v => Math.sin(v * Math.PI / 180)));
      case 'cos': return scalar(unary(v => Math.cos(v * Math.PI / 180)));
      case 'tan': return scalar(unary(v => Math.tan(v * Math.PI / 180)));
      case 'asin': return {value:unary(Math.asin) * 180 / Math.PI,unit:'angle'};
      case 'acos': return {value:unary(Math.acos) * 180 / Math.PI,unit:'angle'};
      case 'atan': return {value:unary(Math.atan) * 180 / Math.PI,unit:'angle'};
      case 'atan2': {
        if (args.length !== 2 || args.some(a => a.unit !== 'scalar')) throw new Error('atan2 requiere dos valores sin unidades.');
        return {value:Math.atan2(args[0].value,args[1].value)*180/Math.PI,unit:'angle'};
      }
      case 'cosh': return scalar(unary(Math.cosh));
      case 'sinh': return scalar(unary(Math.sinh));
      case 'tanh': return scalar(unary(Math.tanh));
      case 'asinh': return scalar(unary(Math.asinh));
      case 'acosh': return scalar(unary(Math.acosh));
      case 'atanh': return scalar(unary(Math.atanh));
      case 'max': case 'min': {
        if (!args.length) throw new Error(name + ' requiere al menos un argumento.');
        args.slice(1).forEach(a => compatible(args[0], a));
        return {value:Math[name](...args.map(a=>a.value)),unit:args[0].unit};
      }
      default: throw new Error('Función no compatible.');
    }
  };
  const result = parseExpression();
  skip();
  if (index !== input.length) throw new Error('Expresión no válida cerca de "' + input.slice(index) + '".');
  if (result.unit === 'angle' && options.expectedUnit === 'length') throw new Error('Se esperaba una longitud, no un ángulo.');
  if (result.unit === 'length' && options.expectedUnit === 'angle') throw new Error('Se esperaba un ángulo, no una longitud.');
  return result.value;
}
