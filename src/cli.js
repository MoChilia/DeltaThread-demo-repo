import { pathToFileURL } from 'node:url';
import { AuditLog } from './audit.js';
import { checkout } from './checkout.js';
import { InventoryLedger } from './inventory.js';

export function parseArguments(argv) {
  const result = { lines: [], loyaltyTier: 'standard' };
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--item') {
      const value = argv[++index];
      const [sku, rawQuantity] = String(value ?? '').split(':');
      const quantity = Number(rawQuantity);
      if (!sku || !Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('--item must use sku:quantity');
      }
      result.lines.push({ sku, quantity });
    } else if (argument === '--coupon') {
      result.coupon = requireValue(argv, ++index, '--coupon');
    } else if (argument === '--loyalty') {
      result.loyaltyTier = requireValue(argv, ++index, '--loyalty');
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (result.lines.length === 0) {
    throw new Error('Provide at least one --item sku:quantity');
  }
  return result;
}

export function runCli(argv, { output = console.log, errorOutput = console.error } = {}) {
  try {
    const request = parseArguments(argv);
    const inventory = new InventoryLedger({ notebook: 100, 'pen-set': 100, 'gift-card': 100 });
    const audit = new AuditLog();
    const order = checkout(request, { inventory, audit });
    output(JSON.stringify(order, null, 2));
    return 0;
  } catch (error) {
    errorOutput(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli(process.argv.slice(2));
}
