-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add columns for auto-generated status tracking
ALTER TABLE public.status_logs
  ADD COLUMN IF NOT EXISTS is_auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reference_date date;