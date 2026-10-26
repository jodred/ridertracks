-- Attach cash collections to each app earning and preserve unfinished inputs
-- separately from confirmed settlement values.

ALTER TABLE public.fleet_entry_earnings
  ADD COLUMN cash_amount numeric(14,2) NOT NULL DEFAULT 0
  CHECK (cash_amount >= 0);

CREATE TABLE public.fleet_entry_earning_drafts (
  fleet_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL,
  source_id uuid NOT NULL,
  period_from date NOT NULL,
  period_to date NOT NULL CHECK (period_to >= period_from),
  gross_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  cash_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (cash_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (driver_id, source_id, period_from, period_to),
  FOREIGN KEY (driver_id, fleet_user_id)
    REFERENCES public.fleet_drivers(id, fleet_user_id) ON DELETE CASCADE,
  FOREIGN KEY (source_id, fleet_user_id)
    REFERENCES public.fleet_earning_sources(id, fleet_user_id) ON DELETE RESTRICT
);

CREATE INDEX fleet_entry_earning_drafts_owner_period_idx
  ON public.fleet_entry_earning_drafts
  (fleet_user_id, driver_id, period_from, period_to);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.fleet_entry_earning_drafts TO authenticated;
GRANT ALL ON public.fleet_entry_earning_drafts TO service_role;

ALTER TABLE public.fleet_entry_earning_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fleet partners manage own earning drafts"
  ON public.fleet_entry_earning_drafts FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = fleet_user_id)
  WITH CHECK ((SELECT auth.uid()) = fleet_user_id);

CREATE TRIGGER trg_fleet_entry_earning_drafts_updated_at
BEFORE UPDATE ON public.fleet_entry_earning_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_updated_at();

DROP TRIGGER trg_sync_fleet_entry_gross_from_sources
  ON public.fleet_entry_earnings;

CREATE OR REPLACE FUNCTION public.sync_fleet_entry_gross_from_sources()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  affected_entry_id uuid := COALESCE(NEW.entry_id, OLD.entry_id);
  affected_owner_id uuid := COALESCE(NEW.fleet_user_id, OLD.fleet_user_id);
BEGIN
  UPDATE public.fleet_driver_entries entry
  SET gross = COALESCE((
        SELECT SUM(source_amount.amount)
        FROM public.fleet_entry_earnings source_amount
        WHERE source_amount.entry_id = affected_entry_id
          AND source_amount.fleet_user_id = affected_owner_id
      ), 0),
      cash = COALESCE((
        SELECT SUM(source_amount.cash_amount)
        FROM public.fleet_entry_earnings source_amount
        WHERE source_amount.entry_id = affected_entry_id
          AND source_amount.fleet_user_id = affected_owner_id
      ), 0),
      updated_at = now()
  WHERE entry.id = affected_entry_id
    AND entry.fleet_user_id = affected_owner_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_fleet_entry_gross_from_sources()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_sync_fleet_entry_gross_from_sources
AFTER INSERT OR UPDATE OF amount, cash_amount OR DELETE
ON public.fleet_entry_earnings
FOR EACH ROW EXECUTE FUNCTION public.sync_fleet_entry_gross_from_sources();
