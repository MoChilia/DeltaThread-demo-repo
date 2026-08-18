# Checkout Demo

A dependency-free order checkout service used to demonstrate DeltaThread.

## Baseline

The `main` branch calculates an order subtotal and tax.

## Feature branch

The `feature/checkout-upgrade` branch intentionally combines several concerns in one large commit:

- promotion rules;
- inventory reservations;
- audit events;
- a command-line checkout workflow.

Run the tests with:

```bash
npm test
```
