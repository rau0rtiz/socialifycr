-- Add preferred_region column to clients table
ALTER TABLE public.clients 
ADD COLUMN preferred_region text DEFAULT 'CR';