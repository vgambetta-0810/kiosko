import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isNonNegativeInteger,
  isPositiveInteger,
  isUnsignedIntegerInput
} from '../src/utils/quantity.js';

test('acepta únicamente cantidades enteras positivas', () => {
  for (const value of ['1', 2, '100']) assert.equal(isPositiveInteger(value), true);
  for (const value of ['1.5', '2,01', 0, -1, '']) assert.equal(isPositiveInteger(value), false);
});

test('el stock admite cero pero no decimales', () => {
  assert.equal(isNonNegativeInteger('0'), true);
  assert.equal(isNonNegativeInteger('5'), true);
  assert.equal(isNonNegativeInteger('0.75'), false);
});

test('rechaza puntos, comas y signos en el texto del input', () => {
  assert.equal(isUnsignedIntegerInput('25'), true);
  assert.equal(isUnsignedIntegerInput(''), true);
  assert.equal(isUnsignedIntegerInput('2.01'), false);
  assert.equal(isUnsignedIntegerInput('2,01'), false);
  assert.equal(isUnsignedIntegerInput('-2'), false);
});
