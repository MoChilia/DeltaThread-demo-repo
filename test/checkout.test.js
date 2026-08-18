import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateOrder } from '../src/checkout.js';

test('calculates subtotal and tax', () => {
  const order = calculateOrder([
    { sku: 'notebook', quantity: 2 },
    { sku: 'gift-card', quantity: 1 },
  ]);

  assert.equal(order.subtotal, 50);
  assert.equal(order.tax, 2);
  assert.equal(order.total, 52);
});

test('rejects an invalid quantity', () => {
  assert.throws(
    () => calculateOrder([{ sku: 'pen-set', quantity: 0 }]),
    /Invalid quantity/,
  );
});
