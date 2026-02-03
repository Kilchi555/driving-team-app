# Product Refund Policy System

## Overview

Products in the system can now be marked as **refundable** or **non-refundable**. This determines how they are handled when an appointment is cancelled.

## Product Categories

### Refundable Products (Default)
- **Vehicle Rental**: Should be refunded if cancelled early enough
- **Lesson Credits**: Should be refunded if not used
- **Service Add-ons**: Time-based services that weren't delivered
- **Custom Instructor Fees**: If appointment is cancelled

```sql
-- Example: Mark vehicle rental as refundable
UPDATE products SET is_refundable = true 
WHERE name LIKE '%Fahrzeugmiete%' OR name LIKE '%Vehicle Rental%';
```

### Non-Refundable Products
- **Books/Workbooks**: Physical items already provided
- **Exam Registration Fees**: Administrative fees that were processed
- **Theory Test Materials**: Learning materials already delivered
- **Vouchers**: Already consumed or expired

```sql
-- Example: Mark books as non-refundable
UPDATE products SET is_refundable = false 
WHERE name LIKE '%Heft%' OR name LIKE '%Book%' OR category = 'Materials';
```

## How Refunds Are Calculated

When an appointment is cancelled with paid products:

1. **System loads all products** from the appointment's `product_sales`
2. **Filters by `is_refundable`** flag:
   - If `is_refundable = true` → Amount can be refunded
   - If `is_refundable = false` → Amount stays charged (kept by business)
3. **Calculates refundable total** from eligible products
4. **Creates credit or invoice adjustment** based on cancellation policy

## Implementation in Code

### Example Calculation

```typescript
// Get all products from the appointment
const { data: productSales } = await supabase
  .from('product_sales')
  .select('products(*), quantity, total_amount_rappen')
  .eq('appointment_id', appointmentId);

// Calculate refundable amount
const refundableAmount = productSales
  .filter(ps => ps.products.is_refundable)
  .reduce((sum, ps) => sum + ps.total_amount_rappen, 0);

// Non-refundable products are kept as revenue
const nonRefundableAmount = productSales
  .filter(ps => !ps.products.is_refundable)
  .reduce((sum, ps) => sum + ps.total_amount_rappen, 0);
```

## Database Schema

```sql
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_refundable BOOLEAN DEFAULT true;

-- Example records
INSERT INTO products (name, is_refundable, category) VALUES
('Fahrzeugmiete', true, 'Services'),      -- Refundable
('Fahrschule Heft', false, 'Materials'),  -- Non-refundable
('Theory Test Fee', false, 'Fees'),       -- Non-refundable
('Exam Credit', true, 'Credits');         -- Refundable
```

## Admin Interface

When creating/editing products, staff can toggle:

- **☑️ Refundable** - Refund charges if cancelled early
- **☐ Non-Refundable** - Keep charges even if cancelled

## Best Practices

1. **Default to Refundable** - Most services should be refundable
2. **Mark Non-Refundable Clearly** - Physical items, fees, already-delivered services
3. **Review Regularly** - Ensure your product refund policies align with business rules
4. **Document Policy** - Show customers which products are/aren't refundable

## Example Business Logic

```
Vehicle Rental = 50 CHF (refundable)
Theory Book = 35 CHF (non-refundable)
Total = 85 CHF

Cancellation 12h before:
  → Full refund of vehicle rental (50 CHF)
  → Keep theory book charge (35 CHF)
  → Student receives 50 CHF credit/refund
```
