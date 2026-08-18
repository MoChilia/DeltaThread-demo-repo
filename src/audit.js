export class AuditLog {
  #events = [];
  #clock;

  constructor({ clock = () => new Date() } = {}) {
    this.#clock = clock;
  }

  record(type, details = {}) {
    if (!type || typeof type !== 'string') {
      throw new Error('Audit event type is required');
    }
    const event = Object.freeze({
      sequence: this.#events.length + 1,
      timestamp: this.#clock().toISOString(),
      type,
      details: structuredClone(details),
    });
    this.#events.push(event);
    return structuredClone(event);
  }

  events({ type } = {}) {
    const values = type
      ? this.#events.filter(event => event.type === type)
      : this.#events;
    return structuredClone(values);
  }

  summary() {
    const byType = {};
    for (const event of this.#events) {
      byType[event.type] = (byType[event.type] ?? 0) + 1;
    }
    return {
      total: this.#events.length,
      byType,
      firstTimestamp: this.#events[0]?.timestamp ?? null,
      lastTimestamp: this.#events.at(-1)?.timestamp ?? null,
    };
  }

  toJSON() {
    return JSON.stringify(this.#events, null, 2);
  }
}

export function recordCheckoutFailure(audit, error, context = {}) {
  return audit.record('checkout.failed', {
    message: error instanceof Error ? error.message : String(error),
    ...context,
  });
}
