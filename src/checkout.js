import { getProduct } from './catalog.js';

const TAX_RATE = 0.08;

export function calculateOrder(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('An order requires at least one line');
  }

  let subtotal = 0;
  let taxableSubtotal = 0;
  const items = lines.map(({ sku, quantity }) => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for ${sku}`);
    }
    const product = getProduct(sku);
    const lineTotal = round(product.price * quantity);
    subtotal += lineTotal;
    if (product.taxable) {
      taxableSubtotal += lineTotal;
    }
    return { sku, name: product.name, quantity, lineTotal };
  });

  const tax = round(taxableSubtotal * TAX_RATE);
  return {
    items,
    subtotal: round(subtotal),
    tax,
    total: round(subtotal + tax),
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}
