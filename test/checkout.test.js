import assert from 'node:assert/strict';
import test from 'node:test';
import { AuditLog } from '../src/audit.js';
import { calculateOrder, checkout } from '../src/checkout.js';
import { InventoryLedger } from '../src/inventory.js';

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

test('completes checkout with promotion, inventory, and audit records', () => {
  const inventory = new InventoryLedger({ notebook: 5 });
  const audit = new AuditLog({ clock: () => new Date('2026-08-18T10:00:00.000Z') });

  const order = checkout({
    lines: [{ sku: 'notebook', quantity: 2 }],
    coupon: 'WELCOME10',
    loyaltyTier: 'standard',
  }, { inventory, audit });

  assert.equal(order.status, 'completed');
  assert.equal(order.subtotal, 25);
  assert.equal(order.discount, 2.5);
  assert.equal(order.discountedSubtotal, 22.5);
  assert.equal(order.tax, 1.8);
  assert.equal(order.total, 24.3);
  assert.equal(inventory.available('notebook'), 3);
  assert.deepEqual(audit.events().map(event => event.type), [
    'checkout.started',
    'inventory.reserved',
    'checkout.completed',
  ]);
});

test('releases inventory and records failures', () => {
  const inventory = new InventoryLedger({ notebook: 2 });
  const audit = new AuditLog();

  assert.throws(
    () => checkout({
      lines: [{ sku: 'notebook', quantity: 1 }],
      coupon: 'UNKNOWN',
    }, { inventory, audit }),
    /Unknown coupon/,
  );

  assert.equal(inventory.available('notebook'), 2);
  assert.equal(audit.events().at(-1).type, 'checkout.failed');
});
