# usePricing.ts - QUICK REFACTORING PLAN

## FUNCTIONS WITH DIRECT QUERIES (8 total)

1. `getEventTypeByCode()` - SELECT event_types
2. `createFallbackPricingRules()` - Data construction only
3. `loadPricingRules()` - SELECT pricing_rules
4. `hasAdminFeeBeenPaid()` - Complex logic (might be API)
5. `shouldApplyAdminFee()` - Logic check
6. `getAppointmentCount()` - Count query
7. `calculatePrice()` - Pure calculation (no queries!)
8. `updateDynamicPricing()- Reactive update

## REQUIRED ENDPOINTS (Consolidated)

**POST /api/pricing/calculate** - Single endpoint handling:
- GET event types
- GET pricing rules
- GET appointment count
- VALIDATE admin fees
- CALCULATE prices

## STRATEGY

Instead of 5-6 separate endpoints, create ONE consolidated endpoint that:
1. Returns all pricing data needed
2. Validates business logic on server
3. Handles caching intelligently
4. Provides atomic pricing calculations

**Estimated Time**: 1.5-2 hours
- Endpoint: 45 mins
- Migration: 60 mins
