const couponRules = new Map([
  ['WELCOME10', { kind: 'percent', value: 10, minimum: 20 }],
  ['SAVE5', { kind: 'fixed', value: 5, minimum: 40 }],
  ['STATIONERY15', { kind: 'category', value: 15, category: 'stationery', minimum: 30 }],
]);

export function evaluatePromotions({ items, subtotal, coupon, loyaltyTier = 'standard' }) {
  const adjustments = [];

  if (coupon) {
    adjustments.push(evaluateCoupon(coupon, items, subtotal));
  }

  const bulk = evaluateBulkDiscount(items);
  if (bulk) {
    adjustments.push(bulk);
  }

  const loyalty = evaluateLoyaltyDiscount(subtotal, loyaltyTier);
  if (loyalty) {
    adjustments.push(loyalty);
  }

  const accepted = adjustments.filter(Boolean);
  const discount = round(Math.min(
    subtotal,
    accepted.reduce((total, adjustment) => total + adjustment.amount, 0),
  ));

  return {
    adjustments: accepted,
    discount,
    discountedSubtotal: round(subtotal - discount),
  };
}

function evaluateCoupon(code, items, subtotal) {
  const rule = couponRules.get(code.toUpperCase());
  if (!rule) {
    throw new Error(`Unknown coupon: ${code}`);
  }
  if (subtotal < rule.minimum) {
    throw new Error(`Coupon ${code} requires a subtotal of ${rule.minimum}`);
  }

  if (rule.kind === 'percent') {
    return adjustment('coupon', code, subtotal * rule.value / 100);
  }
  if (rule.kind === 'fixed') {
    return adjustment('coupon', code, rule.value);
  }

  const eligible = items
    .filter(item => item.category === rule.category)
    .reduce((total, item) => total + item.lineTotal, 0);
  if (eligible === 0) {
    throw new Error(`Coupon ${code} has no eligible items`);
  }
  return adjustment('coupon', code, eligible * rule.value / 100);
}

function evaluateBulkDiscount(items) {
  const eligible = items.filter(item => item.quantity >= 5);
  if (eligible.length === 0) {
    return null;
  }
  const amount = eligible.reduce((total, item) => total + item.lineTotal * 0.05, 0);
  return adjustment('bulk', 'Five or more of one item', amount);
}

function evaluateLoyaltyDiscount(subtotal, tier) {
  const rates = { standard: 0, silver: 0.02, gold: 0.05 };
  if (!(tier in rates)) {
    throw new Error(`Unknown loyalty tier: ${tier}`);
  }
  return rates[tier] === 0
    ? null
    : adjustment('loyalty', `${tier} member`, subtotal * rates[tier]);
}

function adjustment(type, label, amount) {
  return { type, label, amount: round(amount) };
}

function round(value) {
  return Math.round(value * 100) / 100;
}
