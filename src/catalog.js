export const catalog = new Map([
  ['notebook', { name: 'Notebook', price: 12.5, taxable: true }],
  ['pen-set', { name: 'Pen set', price: 8, taxable: true }],
  ['gift-card', { name: 'Gift card', price: 25, taxable: false }],
]);

export function getProduct(sku) {
  const product = catalog.get(sku);
  if (!product) {
    throw new Error(`Unknown product: ${sku}`);
  }
  return product;
}
