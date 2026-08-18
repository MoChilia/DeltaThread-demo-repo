export const catalog = new Map([
  ['notebook', { name: 'Notebook', price: 12.5, taxable: true, category: 'stationery' }],
  ['pen-set', { name: 'Pen set', price: 8, taxable: true, category: 'stationery' }],
  ['gift-card', { name: 'Gift card', price: 25, taxable: false, category: 'gift' }],
]);

export function getProduct(sku) {
  const product = catalog.get(sku);
  if (!product) {
    throw new Error(`Unknown product: ${sku}`);
  }
  return product;
}
