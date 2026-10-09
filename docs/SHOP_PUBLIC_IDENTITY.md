# Public shop checkout identity

Verified from `main` after merge of `f14ead1e` (#240).

## Intent

Public shop checkout must not trust browser-supplied `user_id` / email / phone as authorization. Identity binding comes only from a same-tenant customer session (or stays guest).

## Contract

Helper: `publicShopSessionPrincipalId(sessionUser, shopTenantId)` in `server/utils/shop-public-identity.ts`.

Returns a principal id only when **all** hold:

- Session user has an id
- `sessionUser.tenant_id === shopTenantId`
- Role is `client` or `student`

Otherwise returns `null` (guest). **Staff / admin / foreign-tenant sessions are treated as anonymous** on this path.

## Affected routes

| Route | Behavior |
|---|---|
| `POST /api/shop/create-payment` | Payment `user_id` = session principal or `null`; body `user_id` ignored |
| `POST /api/shop/resolve-customer` | Resolves only under session / server rules; no forged body identity |
| `POST /api/shop/find-or-create-guest-user` | Guest creation without elevating via client-supplied ids |

## Pitfalls

1. Sending `user_id` of another customer in the JSON body must not attach the payment to that user.
2. A staff session browsing the shop must not bind payments to arbitrary clients via body fields.
3. Do not reintroduce `const userId = body.user_id` as the payment owner.
4. Separate from Staff POS admin sale (`staff_product_sale`) and from registration upload grants.

## Codepaths

- `server/utils/shop-public-identity.ts`
- `server/api/shop/create-payment.post.ts`
- `server/api/shop/resolve-customer.post.ts`
- `server/api/shop/find-or-create-guest-user.post.ts`
- `server/utils/__tests__/shop-identity-authorization.test.ts`
