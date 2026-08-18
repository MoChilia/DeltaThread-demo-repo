import assert from 'node:assert/strict';
import test from 'node:test';
import { parseArguments, runCli } from '../src/cli.js';

test('parses items, coupon, and loyalty options', () => {
  assert.deepEqual(
    parseArguments(['--item', 'notebook:2', '--item', 'pen-set:1', '--coupon', 'WELCOME10', '--loyalty', 'gold']),
    {
      lines: [
        { sku: 'notebook', quantity: 2 },
        { sku: 'pen-set', quantity: 1 },
      ],
      coupon: 'WELCOME10',
      loyaltyTier: 'gold',
    },
  );
});

test('rejects malformed item input', () => {
  assert.throws(() => parseArguments(['--item', 'notebook']), /sku:quantity/);
});

test('requires at least one item', () => {
  assert.throws(() => parseArguments(['--coupon', 'WELCOME10']), /at least one/);
});

test('prints a completed order', () => {
  const output = [];
  const errors = [];
  const exitCode = runCli(
    ['--item', 'notebook:2', '--coupon', 'WELCOME10'],
    { output: value => output.push(value), errorOutput: value => errors.push(value) },
  );

  assert.equal(exitCode, 0);
  assert.equal(errors.length, 0);
  const order = JSON.parse(output[0]);
  assert.equal(order.status, 'completed');
  assert.equal(order.subtotal, 25);
  assert.equal(order.discount, 2.5);
});

test('prints errors and returns a failure code', () => {
  const output = [];
  const errors = [];
  const exitCode = runCli(
    ['--item', 'missing:1'],
    { output: value => output.push(value), errorOutput: value => errors.push(value) },
  );

  assert.equal(exitCode, 1);
  assert.equal(output.length, 0);
  assert.match(errors[0], /Insufficient stock/);
});
