-- Copy default data to new tenant
-- This function copies all default data (products, categories, etc.) to a new tenant

CREATE OR REPLACE FUNCTION copy_default_data_to_tenant(target_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
  category_record RECORD;
  criteria_record RECORD;
  scale_record RECORD;
  product_record RECORD;
  discount_record RECORD;
  location_record RECORD;
  event_type_record RECORD;
  new_category_id UUID;
  new_criteria_id UUID;
  new_scale_id UUID;
  new_product_id UUID;
  new_discount_id UUID;
  new_location_id UUID;
  new_event_type_id UUID;
BEGIN
  RAISE NOTICE 'Starting to copy default data to tenant: %', target_tenant_id;
  
  -- 1. Copy evaluation_categories (global defaults)
  RAISE NOTICE 'Copying evaluation categories...';
  FOR category_record IN 
    SELECT * FROM evaluation_categories WHERE tenant_id IS NULL
  LOOP
    INSERT INTO evaluation_categories (
      name, description, color, display_order, driving_categories, is_active, tenant_id
    ) VALUES (
      category_record.name,
      category_record.description,
      category_record.color,
      category_record.display_order,
      category_record.driving_categories,
      category_record.is_active,
      target_tenant_id
    ) RETURNING id INTO new_category_id;
    
    -- Copy evaluation_criteria for this category
    FOR criteria_record IN 
      SELECT * FROM evaluation_criteria 
      WHERE category_id = category_record.id AND tenant_id IS NULL
    LOOP
      INSERT INTO evaluation_criteria (
        category_id, name, description, display_order, is_required, is_active, tenant_id
      ) VALUES (
        new_category_id,
        criteria_record.name,
        criteria_record.description,
        criteria_record.display_order,
        criteria_record.is_required,
        criteria_record.is_active,
        target_tenant_id
      );
    END LOOP;
  END LOOP;
  
  -- 2. Copy evaluation_scale (global defaults)
  RAISE NOTICE 'Copying evaluation scale...';
  FOR scale_record IN 
    SELECT * FROM evaluation_scale WHERE tenant_id IS NULL
  LOOP
    INSERT INTO evaluation_scale (
      rating, label, description, color, is_active, tenant_id
    ) VALUES (
      scale_record.rating,
      scale_record.label,
      scale_record.description,
      scale_record.color,
      scale_record.is_active,
      target_tenant_id
    );
  END LOOP;
  
  -- 3. Copy products (global defaults)
  RAISE NOTICE 'Copying products...';
  FOR product_record IN 
    SELECT * FROM products WHERE tenant_id IS NULL
  LOOP
    INSERT INTO products (
      name, description, price_rappen, category, is_active, 
      stock_quantity, track_stock, image_url, display_order, tenant_id
    ) VALUES (
      product_record.name,
      product_record.description,
      product_record.price_rappen,
      product_record.category,
      product_record.is_active,
      product_record.stock_quantity,
      product_record.track_stock,
      product_record.image_url,
      product_record.display_order,
      target_tenant_id
    );
  END LOOP;
  
  -- 4. Copy discounts (global defaults)
  RAISE NOTICE 'Copying discounts...';
  FOR discount_record IN 
    SELECT * FROM discounts WHERE tenant_id IS NULL
  LOOP
    INSERT INTO discounts (
      name, description, discount_type, discount_value_rappen, 
      discount_percentage, is_active, valid_from, valid_until, tenant_id
    ) VALUES (
      discount_record.name,
      discount_record.description,
      discount_record.discount_type,
      discount_record.discount_value_rappen,
      discount_record.discount_percentage,
      discount_record.is_active,
      discount_record.valid_from,
      discount_record.valid_until,
      target_tenant_id
    );
  END LOOP;
  
  -- 5. Copy locations (global defaults)
  RAISE NOTICE 'Copying locations...';
  FOR location_record IN 
    SELECT * FROM locations WHERE tenant_id IS NULL
  LOOP
    INSERT INTO locations (
      name, address, city, postal_code, phone, email, is_active, tenant_id
    ) VALUES (
      location_record.name,
      location_record.address,
      location_record.city,
      location_record.postal_code,
      location_record.phone,
      location_record.email,
      location_record.is_active,
      target_tenant_id
    );
  END LOOP;
  
  -- 6. Copy event_types (global defaults)
  RAISE NOTICE 'Copying event types...';
  FOR event_type_record IN 
    SELECT * FROM event_types WHERE tenant_id IS NULL
  LOOP
    INSERT INTO event_types (
      code, name, description, duration_minutes, color, is_active, tenant_id
    ) VALUES (
      event_type_record.code,
      event_type_record.name,
      event_type_record.description,
      event_type_record.duration_minutes,
      event_type_record.color,
      event_type_record.is_active,
      target_tenant_id
    );
  END LOOP;
  
  -- 7. Copy categories (global defaults)
  RAISE NOTICE 'Copying categories...';
  INSERT INTO categories (name, description, color, is_active, tenant_id)
  SELECT name, description, color, is_active, target_tenant_id
  FROM categories 
  WHERE tenant_id IS NULL;
  
  -- 8. Copy payment_methods (global defaults)
  RAISE NOTICE 'Copying payment methods...';
  INSERT INTO payment_methods (name, description, is_active, tenant_id)
  SELECT name, description, is_active, target_tenant_id
  FROM payment_methods 
  WHERE tenant_id IS NULL;
  
  -- 9. Copy cancellation_policies (global defaults)
  RAISE NOTICE 'Copying cancellation policies...';
  INSERT INTO cancellation_policies (name, description, hours_before, refund_percentage, is_active, tenant_id)
  SELECT name, description, hours_before, refund_percentage, is_active, target_tenant_id
  FROM cancellation_policies 
  WHERE tenant_id IS NULL;
  
  -- 10. Copy cancellation_reasons (global defaults)
  RAISE NOTICE 'Copying cancellation reasons...';
  INSERT INTO cancellation_reasons (name, description, is_active, tenant_id)
  SELECT name, description, is_active, target_tenant_id
  FROM cancellation_reasons 
  WHERE tenant_id IS NULL;
  
  RAISE NOTICE 'Default data copied successfully to tenant: %', target_tenant_id;
END;
$$ LANGUAGE plpgsql;
