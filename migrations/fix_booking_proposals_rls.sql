-- Migration: Fix overly permissive RLS policy on booking_proposals
-- anon_select_booking_proposals allowed anonymous users to read ALL proposals
-- (including names, emails, phone numbers of all customers)
-- Fix: Remove the overly open anon SELECT policy entirely.
-- Staff and admins can still read via staff_view_proposals policy.

DROP POLICY IF EXISTS anon_select_booking_proposals ON booking_proposals;
