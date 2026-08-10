ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'driver';

CREATE TABLE public.fleet_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  app_fee_override numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fleet_user_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_drivers TO authenticated;
GRANT ALL ON public.fleet_drivers TO service_role;
ALTER TABLE public.fleet_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fleet partners manage own drivers" ON public.fleet_drivers
  FOR ALL TO authenticated
  USING (auth.uid() = fleet_user_id) WITH CHECK (auth.uid() = fleet_user_id);

CREATE TABLE public.fleet_driver_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.fleet_drivers(id) ON DELETE CASCADE,
  date date NOT NULL,
  gross numeric NOT NULL DEFAULT 0,
  cash numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id, date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_driver_entries TO authenticated;
GRANT ALL ON public.fleet_driver_entries TO service_role;
ALTER TABLE public.fleet_driver_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fleet partners manage own driver entries" ON public.fleet_driver_entries
  FOR ALL TO authenticated
  USING (auth.uid() = fleet_user_id) WITH CHECK (auth.uid() = fleet_user_id);

CREATE TRIGGER trg_fleet_drivers_updated_at BEFORE UPDATE ON public.fleet_drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_user_data_updated_at();
CREATE TRIGGER trg_fleet_driver_entries_updated_at BEFORE UPDATE ON public.fleet_driver_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_user_data_updated_at();