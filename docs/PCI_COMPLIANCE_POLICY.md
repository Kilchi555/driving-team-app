# PCI Compliance Policy — Simy IT Systems Kilchenmann

| | |
|---|---|
| **Company** | Simy IT Systems Kilchenmann |
| **Effective Date** | 2026-05-29 |
| **Review Date** | 2027-05-29 (reviewed at least annually) |
| **Approved By** | Pascal Kilchenmann, Owner / Managing Director |
| **Contact** | info@simy.ch |

---

## Purpose and Scope

This policy outlines how Simy IT Systems Kilchenmann ("we", "Simy") complies with the
Payment Card Industry Data Security Standard (PCI DSS) and ensures that all payments
processed through Wallee meet the fundamental security requirements.

Wallee Group AG is PCI DSS Level 1 certified and guarantees that no cardholder data is
stored, processed, or transmitted by us. **We do not store, process, or transmit
cardholder data (CHD) on our own systems.**

### Applicable PCI DSS validation level

Because card data is captured exclusively on Wallee's externally hosted payment page and
is never entered into, transmitted through, or stored on Simy systems, our environment
qualifies for **SAQ A** (fully outsourced card processing, redirect model).

## How payments work at Simy (technical scope)

1. Our server creates a payment transaction via the Wallee API, sending **only** the
   amount, currency, customer name and e-mail, and an order description — **never any
   card data**.
2. The customer is **redirected to Wallee's externally hosted payment page**
   (`app-wallee.com`). The full primary account number (PAN), expiry date and CVV are
   entered **there**, on Wallee's PCI-certified systems — never on a Simy page.
3. After payment, Wallee redirects the customer back to Simy. We store **only** a
   Wallee transaction reference and, where applicable, an **opaque Wallee payment-method
   token**. No PAN, no CVV, no expiry date is ever stored on our systems.
4. Our hosting (Vercel) and database (Supabase) therefore never receive cardholder data.

## Principles

- All card transactions are processed exclusively via the PCI-certified systems of
  Wallee Group AG.
- We do not store, process, or transmit any cardholder data on our own systems. Only
  non-sensitive Wallee references (transaction IDs and opaque tokens) are retained.
- No payment-input scripts from third parties are loaded on Simy pages; card entry
  happens entirely on Wallee's hosted page.
- PCI DSS compliance (SAQ A) is reviewed, completed and documented at least annually.
- All persons with access to payment-related systems follow PCI security awareness
  good practice and use strong, unique credentials with multi-factor / passkey
  authentication where available.

## Responsibilities

| Role | Responsibility |
|------|----------------|
| **PCI Compliance Owner** — Pascal Kilchenmann | Coordinates PCI activities, completes and verifies the annual SAQ A self-assessment, and documents compliance. |
| **IT / Technical Team** — Pascal Kilchenmann | Ensures that no cardholder data is processed or stored on own systems and that all card processing runs exclusively through Wallee. Maintains secure configuration of Supabase and Vercel. |
| **Management** — Pascal Kilchenmann | Approves this policy and provides the necessary resources. |
| **All personnel** | Understand and follow this PCI Compliance Policy. |

> Note: Simy IT Systems Kilchenmann is a small organisation in which the above roles are
> currently held by the owner, Pascal Kilchenmann. As the team grows, responsibilities
> will be delegated and this table updated accordingly.

## Review and Communication

This policy is reviewed at least annually, or whenever significant technological or
business changes occur (e.g. a change of payment processor or a change to how payments
are integrated). It is made available to all employees and shared with Wallee on request.

## Training and Review

All relevant employees receive annual training and awareness refreshers on PCI matters
(at minimum, re-confirming that they are aware of and follow this PCI Compliance Policy).
