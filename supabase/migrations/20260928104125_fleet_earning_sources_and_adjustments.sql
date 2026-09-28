-- Fleet-configured earning sources and settlement adjustments.
-- Existing fleet_driver_entries.gross values remain valid. Once a source
-- breakdown is saved, a trigger keeps gross equal to the source total.

ALTER TABLE public.fleet_drivers
  ADD CONSTRAINT fleet_drivers_id_fleet_user_id_key UNIQUE (id, fleet_user_id);

ALTER TABLE public.fleet_driver_entries
  ADD CONSTRAINT fleet_driver_entries_id_fleet_user_id_key UNIQUE (id, fleet_user_id);

CREATE TABLE public.fleet_earning_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_key text NOT NULL DEFAULT 'custom' CHECK (logo_key IN ('uber', 'bolt', 'free-now', 'custom')),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fleet_user_id, slug),
  UNIQUE (id, fleet_user_id)
);

CREATE TABLE public.fleet_driver_sources (
  fleet_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL,
  source_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (driver_id, source_id),
  FOREIGN KEY (driver_id, fleet_user_id)
    REFERENCES public.fleet_drivers(id, fleet_user_id) ON DELETE CASCADE,
  FOREIGN KEY (source_id, fleet_user_id)
    REFERENCES public.fleet_earning_sources(id, fleet_user_id) ON DELETE CASCADE
);

CREATE TABLE public.fleet_entry_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL,
  source_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, source_id),
  FOREIGN KEY (entry_id, fleet_user_id)
    REFERENCES public.fleet_driver_entries(id, fleet_user_id) ON DELETE CASCADE,
  FOREIGN KEY (source_id, fleet_user_id)
    REFERENCES public.fleet_earning_sources(id, fleet_user_id) ON DELETE RESTRICT
);

CREATE TABLE public.fleet_adjustment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  direction text NOT NULL CHECK (direction IN ('addition', 'deduction')),
  frequency text NOT NULL DEFAULT 'one_time' CHECK (frequency IN ('one_time', 'weekly')),
  default_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (default_amount >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, fleet_user_id)
);

CREATE TABLE public.fleet_entry_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id uuid NOT NULL,
  adjustment_type_id uuid NOT NULL,
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 100),
  direction text NOT NULL CHECK (direction IN ('addition', 'deduction')),
  frequency text NOT NULL DEFAULT 'one_time' CHECK (frequency IN ('one_time', 'weekly')),
  unit_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_amount >= 0),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 366),
  note text CHECK (note IS NULL OR char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (entry_id, fleet_user_id)
    REFERENCES public.fleet_driver_entries(id, fleet_user_id) ON DELETE CASCADE,
  FOREIGN KEY (adjustment_type_id, fleet_user_id)
    REFERENCES public.fleet_adjustment_types(id, fleet_user_id) ON DELETE RESTRICT
);

CREATE INDEX fleet_earning_sources_owner_active_idx
  ON public.fleet_earning_sources (fleet_user_id, is_active, sort_order);
CREATE INDEX fleet_driver_sources_owner_source_idx
  ON public.fleet_driver_sources (fleet_user_id, source_id);
CREATE INDEX fleet_entry_earnings_owner_entry_idx
  ON public.fleet_entry_earnings (fleet_user_id, entry_id);
CREATE INDEX fleet_entry_earnings_source_idx
  ON public.fleet_entry_earnings (source_id);
CREATE INDEX fleet_adjustment_types_owner_active_idx
  ON public.fleet_adjustment_types (fleet_user_id, is_active, direction);
CREATE INDEX fleet_entry_adjustments_owner_entry_idx
  ON public.fleet_entry_adjustments (fleet_user_id, entry_id);
CREATE INDEX fleet_entry_adjustments_type_idx
  ON public.fleet_entry_adjustments (adjustment_type_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_earning_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_driver_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_entry_earnings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_adjustment_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_entry_adjustments TO authenticated;
GRANT ALL ON public.fleet_earning_sources TO service_role;
GRANT ALL ON public.fleet_driver_sources TO service_role;
GRANT ALL ON public.fleet_entry_earnings TO service_role;
GRANT ALL ON public.fleet_adjustment_types TO service_role;
GRANT ALL ON public.fleet_entry_adjustments TO service_role;

ALTER TABLE public.fleet_earning_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_driver_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_entry_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_adjustment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_entry_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fleet partners manage own earning sources"
  ON public.fleet_earning_sources FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = fleet_user_id)
  WITH CHECK ((SELECT auth.uid()) = fleet_user_id);

CREATE POLICY "Fleet partners manage own driver source assignments"
  ON public.fleet_driver_sources FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = fleet_user_id)
  WITH CHECK ((SELECT auth.uid()) = fleet_user_id);

CREATE POLICY "Fleet partners manage own source earnings"
  ON public.fleet_entry_earnings FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = fleet_user_id)
  WITH CHECK ((SELECT auth.uid()) = fleet_user_id);

CREATE POLICY "Fleet partners manage own adjustment types"
  ON public.fleet_adjustment_types FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = fleet_user_id)
  WITH CHECK ((SELECT auth.uid()) = fleet_user_id);

CREATE POLICY "Fleet partners manage own entry adjustments"
  ON public.fleet_entry_adjustments FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = fleet_user_id)
  WITH CHECK (
    (SELECT auth.uid()) = fleet_user_id
    AND EXISTS (
      SELECT 1
      FROM public.fleet_adjustment_types adjustment_type
      WHERE adjustment_type.id = adjustment_type_id
        AND adjustment_type.fleet_user_id = (SELECT auth.uid())
    )
  );

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
      updated_at = now()
  WHERE entry.id = affected_entry_id
    AND entry.fleet_user_id = affected_owner_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_fleet_entry_gross_from_sources() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_sync_fleet_entry_gross_from_sources
AFTER INSERT OR UPDATE OF amount OR DELETE ON public.fleet_entry_earnings
FOR EACH ROW EXECUTE FUNCTION public.sync_fleet_entry_gross_from_sources();

CREATE TRIGGER trg_fleet_earning_sources_updated_at
BEFORE UPDATE ON public.fleet_earning_sources
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_updated_at();

CREATE TRIGGER trg_fleet_entry_earnings_updated_at
BEFORE UPDATE ON public.fleet_entry_earnings
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_updated_at();

CREATE TRIGGER trg_fleet_adjustment_types_updated_at
BEFORE UPDATE ON public.fleet_adjustment_types
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_updated_at();

CREATE TRIGGER trg_fleet_entry_adjustments_updated_at
BEFORE UPDATE ON public.fleet_entry_adjustments
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_updated_at();

-- Seed the approved default apps for existing fleet partners. New accounts are
-- seeded idempotently by the application on first fleet settings/driver use.
INSERT INTO public.fleet_earning_sources
  (fleet_user_id, name, slug, logo_key, is_default, sort_order)
SELECT profile.id, defaults.name, defaults.slug, defaults.logo_key, true, defaults.sort_order
FROM public.profiles profile
CROSS JOIN (
  VALUES
    ('Uber', 'uber', 'uber', 10),
    ('Bolt', 'bolt', 'bolt', 20),
    ('Free Now', 'free-now', 'free-now', 30)
) AS defaults(name, slug, logo_key, sort_order)
WHERE profile.account_type = 'fleet'
ON CONFLICT (fleet_user_id, slug) DO NOTHING;
