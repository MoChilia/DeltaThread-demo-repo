export class InventoryLedger {
  #stock;
  #reservations = new Map();
  #sequence = 0;

  constructor(initialStock = {}) {
    this.#stock = new Map(Object.entries(initialStock));
    for (const [sku, quantity] of this.#stock) {
      assertQuantity(quantity, `stock for ${sku}`, true);
    }
  }

  available(sku) {
    return this.#stock.get(sku) ?? 0;
  }

  reserve(lines) {
    validateLines(lines);
    const requested = collapseLines(lines);

    for (const [sku, quantity] of requested) {
      const available = this.available(sku);
      if (quantity > available) {
        throw new Error(`Insufficient stock for ${sku}: requested ${quantity}, available ${available}`);
      }
    }

    const id = `reservation-${++this.#sequence}`;
    for (const [sku, quantity] of requested) {
      this.#stock.set(sku, this.available(sku) - quantity);
    }
    this.#reservations.set(id, {
      id,
      status: 'active',
      lines: [...requested].map(([sku, quantity]) => ({ sku, quantity })),
    });
    return structuredClone(this.#reservations.get(id));
  }

  commit(id) {
    const reservation = this.#requireActive(id);
    reservation.status = 'committed';
    return structuredClone(reservation);
  }

  release(id) {
    const reservation = this.#requireActive(id);
    for (const { sku, quantity } of reservation.lines) {
      this.#stock.set(sku, this.available(sku) + quantity);
    }
    reservation.status = 'released';
    return structuredClone(reservation);
  }

  reservation(id) {
    const value = this.#reservations.get(id);
    return value ? structuredClone(value) : null;
  }

  snapshot() {
    return Object.fromEntries([...this.#stock].sort(([left], [right]) => left.localeCompare(right)));
  }

  #requireActive(id) {
    const reservation = this.#reservations.get(id);
    if (!reservation) {
      throw new Error(`Unknown reservation: ${id}`);
    }
    if (reservation.status !== 'active') {
      throw new Error(`Reservation ${id} is already ${reservation.status}`);
    }
    return reservation;
  }
}

function validateLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('A reservation requires at least one line');
  }
  for (const { sku, quantity } of lines) {
    if (!sku) {
      throw new Error('A reservation line requires a sku');
    }
    assertQuantity(quantity, `quantity for ${sku}`);
  }
}

function collapseLines(lines) {
  const result = new Map();
  for (const { sku, quantity } of lines) {
    result.set(sku, (result.get(sku) ?? 0) + quantity);
  }
  return result;
}

function assertQuantity(quantity, label, allowZero = false) {
  const minimum = allowZero ? 0 : 1;
  if (!Number.isInteger(quantity) || quantity < minimum) {
    throw new Error(`Invalid ${label}: ${quantity}`);
  }
}
