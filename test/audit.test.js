import assert from 'node:assert/strict';
import test from 'node:test';
import { AuditLog, recordCheckoutFailure } from '../src/audit.js';

const fixedClock = () => new Date('2026-08-18T10:00:00.000Z');

test('records immutable sequenced events', () => {
  const audit = new AuditLog({ clock: fixedClock });
  const details = { orderId: 'order-1' };
  const event = audit.record('checkout.started', details);
  details.orderId = 'changed';

  assert.deepEqual(event, {
    sequence: 1,
    timestamp: '2026-08-18T10:00:00.000Z',
    type: 'checkout.started',
    details: { orderId: 'order-1' },
  });
  assert.equal(audit.events()[0].details.orderId, 'order-1');
});

test('filters events by type', () => {
  const audit = new AuditLog({ clock: fixedClock });
  audit.record('checkout.started');
  audit.record('checkout.completed');
  audit.record('checkout.completed');
  assert.equal(audit.events({ type: 'checkout.completed' }).length, 2);
});

test('summarizes event counts and timestamps', () => {
  const audit = new AuditLog({ clock: fixedClock });
  audit.record('checkout.started');
  audit.record('checkout.completed');
  assert.deepEqual(audit.summary(), {
    total: 2,
    byType: { 'checkout.started': 1, 'checkout.completed': 1 },
    firstTimestamp: '2026-08-18T10:00:00.000Z',
    lastTimestamp: '2026-08-18T10:00:00.000Z',
  });
});

test('records checkout failures consistently', () => {
  const audit = new AuditLog({ clock: fixedClock });
  recordCheckoutFailure(audit, new Error('out of stock'), { sku: 'notebook' });
  assert.deepEqual(audit.events()[0].details, {
    message: 'out of stock',
    sku: 'notebook',
  });
});

test('serializes events as formatted JSON', () => {
  const audit = new AuditLog({ clock: fixedClock });
  audit.record('checkout.started', { orderId: 'order-2' });
  assert.deepEqual(JSON.parse(audit.toJSON()), audit.events());
});
