import { getProduct } from './catalog.js';
import { recordCheckoutFailure } from './audit.js';
import { evaluatePromotions } from './promotions.js';

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
    return { sku, name: product.name, category: product.category, quantity, lineTotal };
  });

  const tax = round(taxableSubtotal * TAX_RATE);
  return {
    items,
    subtotal: round(subtotal),
    tax,
    total: round(subtotal + tax),
  };
}

export function checkout(request, { inventory, audit }) {
  if (!inventory || !audit) {
    throw new Error('Checkout requires inventory and audit services');
  }

  audit.record('checkout.started', {
    lineCount: request.lines?.length ?? 0,
    coupon: request.coupon ?? null,
    loyaltyTier: request.loyaltyTier ?? 'standard',
  });

  let reservation;
  try {
    reservation = inventory.reserve(request.lines);
    audit.record('inventory.reserved', {
      reservationId: reservation.id,
      lines: reservation.lines,
    });

    const calculated = calculateOrder(request.lines);
    const promotion = evaluatePromotions({
      items: calculated.items,
      subtotal: calculated.subtotal,
      coupon: request.coupon,
      loyaltyTier: request.loyaltyTier,
    });
    const taxableRatio = calculated.subtotal === 0
      ? 0
      : calculated.tax / calculated.subtotal;
    const adjustedTax = round(promotion.discountedSubtotal * taxableRatio);
    const committed = inventory.commit(reservation.id);
    const result = {
      ...calculated,
      adjustments: promotion.adjustments,
      discount: promotion.discount,
      discountedSubtotal: promotion.discountedSubtotal,
      tax: adjustedTax,
      total: round(promotion.discountedSubtotal + adjustedTax),
      reservationId: committed.id,
      status: 'completed',
    };

    audit.record('checkout.completed', {
      reservationId: committed.id,
      subtotal: result.subtotal,
      discount: result.discount,
      total: result.total,
    });
    return result;
  } catch (error) {
    if (reservation?.status === 'active' || inventory.reservation(reservation?.id)?.status === 'active') {
      inventory.release(reservation.id);
    }
    recordCheckoutFailure(audit, error, {
      reservationId: reservation?.id ?? null,
    });
    throw error;
  }
}

function round(value) {
  return Math.round(value * 100) / 100;
}
