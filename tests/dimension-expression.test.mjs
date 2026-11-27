import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDimensionExpression as evaluate } from '../dimension-expression.mjs';

test('evaluates arithmetic expressions with normal precedence', () => {
  assert.equal(evaluate('10+5'), 15);
  assert.equal(evaluate('40/2'), 20);
  assert.equal(evaluate('12.5*2'), 25);
  assert.equal(evaluate('(8+4)/3'), 4);
  assert.equal(evaluate('2+3*4'), 14);
  assert.equal(evaluate('2^3^2'), 512);
});

test('accepts decimal comma and unary signs', () => {
  assert.equal(evaluate('12,5 + 2,5'), 15);
  assert.equal(evaluate('-2+5'), 3);
  assert.equal(evaluate('-(2+3)'), -5);
});

test('supports length units and normalizes to centimetres', () => {
  assert.equal(evaluate('5mm'), 0.5);
  assert.equal(evaluate('2.5cm'), 2.5);
  assert.equal(evaluate('1m'), 100);
  assert.equal(evaluate('1in'), 2.54);
  assert.equal(evaluate('3ft'), 91.44);
  assert.equal(evaluate('3mm+2.5mm'), 0.55);
  assert.ok(Math.abs(evaluate('3in+2.5in') - 13.97) < 1e-10);
});

test('supports trigonometric and numeric functions', () => {
  assert.ok(Math.abs(evaluate('sin(30)') - 0.5) < 1e-10);
  assert.ok(Math.abs(evaluate('cos(60deg)') - 0.5) < 1e-10);
  assert.equal(evaluate('sqrt(16)'), 4);
  assert.equal(evaluate('ceil(5.667)'), 6);
  assert.equal(evaluate('floor(5.667)'), 5);
  assert.equal(evaluate('max(2,3)'), 3);
  assert.ok(Math.abs(evaluate('atan(1)') - 45) < 1e-10);
  assert.equal(evaluate('pi'), Math.PI);
});

test('supports variables supplied by the sketch parameter scope', () => {
  assert.equal(evaluate('#width*2', { variables: { width: 12 } }), 24);
  assert.equal(evaluate('#width+2cm', { variables: { width: { value: 3, unit: 'length' } } }), 5);
  assert.throws(() => evaluate('#missing'));
});

test('rejects incompatible units, malformed expressions and division by zero', () => {
  for (const value of ['', '2+', '1/0', '(2+3', '2**3', '1;alert(1)', 'Infinity', '3mm+2deg', '3+2cm', '3cm*2cm']) {
    assert.throws(() => evaluate(value), value);
  }
});
