-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    staff_id UUID NOT NULL REFERENCES public.users(id),
    amount_rappen INTEGER NOT NULL,
    admin_fee_rappen INTEGER NOT NULL DEFAULT 0,
    total_amount_rappen INTEGER NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    currency TEXT NOT NULL DEFAULT 'CHF',
    description TEXT,
    wallee_transaction_id TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON public.payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_staff_id ON public.payments(staff_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON public.payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Admin can see all payments
CREATE POLICY "Admin can view all payments" ON public.payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Staff can see their own payments
CREATE POLICY "Staff can view own payments" ON public.payments
    FOR SELECT
    USING (
        staff_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Users can see their own payments
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Admin and staff can create payments
CREATE POLICY "Admin and staff can create payments" ON public.payments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'staff')
        )
    );

-- Admin can update all payments, staff can update their own
CREATE POLICY "Admin can update all payments, staff own" ON public.payments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
        OR (
            staff_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.users
                WHERE users.id = auth.uid()
                AND users.role = 'staff'
            )
        )
    );

-- Only admin can delete payments
CREATE POLICY "Only admin can delete payments" ON public.payments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Add comment to table
COMMENT ON TABLE public.payments IS 'Stores payment information for appointments';