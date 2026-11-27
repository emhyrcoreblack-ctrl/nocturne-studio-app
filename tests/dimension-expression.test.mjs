import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDimensionExpression as evaluate } from '../dimension-expression.mjs';

test('evaluates arithmetic expressions with normal precedence', () => {
  assert.equal(evaluate('10+5'), 15);
  assert.equal(evaluate('40/2'), 20);
  assert.equal(evaluate('12.5*2'), 25);
  assert.equal(evaluate('(8+4)/3'), 4);
  assert.equal(evaluate('2+3*4'), 14);
});

test('accepts decimal comma and unary signs', () => {
  assert.equal(evaluate('12,5 + 2,5'), 15);
  assert.equal(evaluate('-2+5'), 3);
  assert.equal(evaluate('-(2+3)'), -5);
});

test('rejects malformed expressions and division by zero', () => {
  for (const value of ['', '2+', '1/0', '(2+3', '2**3', '1;alert(1)', 'Infinity']) {
    assert.throws(() => evaluate(value));
  }
});
