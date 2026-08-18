import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluatePromotions } from '../src/promotions.js';

const stationery = [
  { sku: 'notebook', category: 'stationery', quantity: 2, lineTotal: 25 },
  { sku: 'pen-set', category: 'stationery', quantity: 1, lineTotal: 8 },
];

test('applies a percentage coupon', () => {
  const result = evaluatePromotions({ items: stationery, subtotal: 33, coupon: 'WELCOME10' });
  assert.equal(result.discount, 3.3);
  assert.equal(result.discountedSubtotal, 29.7);
  assert.deepEqual(result.adjustments, [
    { type: 'coupon', label: 'WELCOME10', amount: 3.3 },
  ]);
});

test('combines coupon, bulk, and loyalty adjustments', () => {
  const items = [{ sku: 'notebook', category: 'stationery', quantity: 5, lineTotal: 62.5 }];
  const result = evaluatePromotions({
    items,
    subtotal: 62.5,
    coupon: 'SAVE5',
    loyaltyTier: 'gold',
  });

  assert.equal(result.discount, 11.26);
  assert.equal(result.discountedSubtotal, 51.24);
  assert.deepEqual(result.adjustments.map(item => item.type), ['coupon', 'bulk', 'loyalty']);
});

test('applies a category coupon only to eligible products', () => {
  const items = [
    ...stationery,
    { sku: 'gift-card', category: 'gift', quantity: 2, lineTotal: 50 },
  ];
  const result = evaluatePromotions({ items, subtotal: 83, coupon: 'STATIONERY15' });
  assert.equal(result.discount, 4.95);
});

test('rejects an unknown coupon', () => {
  assert.throws(
    () => evaluatePromotions({ items: stationery, subtotal: 33, coupon: 'NOPE' }),
    /Unknown coupon/,
  );
});

test('rejects a coupon below its minimum', () => {
  assert.throws(
    () => evaluatePromotions({ items: stationery.slice(1), subtotal: 8, coupon: 'WELCOME10' }),
    /requires a subtotal/,
  );
});

test('rejects an unknown loyalty tier', () => {
  assert.throws(
    () => evaluatePromotions({ items: stationery, subtotal: 33, loyaltyTier: 'platinum' }),
    /Unknown loyalty tier/,
  );
});
