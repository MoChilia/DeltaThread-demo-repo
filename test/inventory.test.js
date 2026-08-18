import assert from 'node:assert/strict';
import test from 'node:test';
import { InventoryLedger } from '../src/inventory.js';

test('reserves stock and commits a reservation', () => {
  const inventory = new InventoryLedger({ notebook: 5, 'pen-set': 2 });
  const reservation = inventory.reserve([
    { sku: 'notebook', quantity: 2 },
    { sku: 'pen-set', quantity: 1 },
  ]);

  assert.equal(reservation.status, 'active');
  assert.deepEqual(inventory.snapshot(), { notebook: 3, 'pen-set': 1 });
  assert.equal(inventory.commit(reservation.id).status, 'committed');
  assert.deepEqual(inventory.snapshot(), { notebook: 3, 'pen-set': 1 });
});

test('collapses duplicate lines before reserving', () => {
  const inventory = new InventoryLedger({ notebook: 5 });
  const reservation = inventory.reserve([
    { sku: 'notebook', quantity: 1 },
    { sku: 'notebook', quantity: 2 },
  ]);

  assert.deepEqual(reservation.lines, [{ sku: 'notebook', quantity: 3 }]);
  assert.equal(inventory.available('notebook'), 2);
});

test('releases reserved stock', () => {
  const inventory = new InventoryLedger({ notebook: 3 });
  const reservation = inventory.reserve([{ sku: 'notebook', quantity: 2 }]);
  const released = inventory.release(reservation.id);

  assert.equal(released.status, 'released');
  assert.equal(inventory.available('notebook'), 3);
});

test('rejects a reservation with insufficient stock', () => {
  const inventory = new InventoryLedger({ notebook: 1 });
  assert.throws(
    () => inventory.reserve([{ sku: 'notebook', quantity: 2 }]),
    /Insufficient stock/,
  );
  assert.equal(inventory.available('notebook'), 1);
});

test('rejects repeated finalization', () => {
  const inventory = new InventoryLedger({ notebook: 2 });
  const reservation = inventory.reserve([{ sku: 'notebook', quantity: 1 }]);
  inventory.commit(reservation.id);
  assert.throws(() => inventory.release(reservation.id), /already committed/);
});

test('returns null for an unknown reservation', () => {
  const inventory = new InventoryLedger();
  assert.equal(inventory.reservation('missing'), null);
});
