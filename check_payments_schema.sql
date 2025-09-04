-- Überprüfung der payments Tabelle nach der Migration
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable,
    CASE 
        WHEN column_name IN ('lesson_price_rappen', 'products_price_rappen', 'discount_amount_rappen', 'subtotal_rappen') 
        THEN '✅ NEU HINZUGEFÜGT' 
        ELSE '🔄 BESTEHEND' 
    END as status
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;
