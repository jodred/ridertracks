-- Polish fleet reporting profiles and immutable generated-document snapshots.

CREATE TABLE public.fleet_tax_profiles (
  fleet_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_name text NOT NULL DEFAULT '' CHECK (char_length(legal_name) <= 200),
  nip text NOT NULL DEFAULT '' CHECK (nip = '' OR nip ~ '^[0-9]{10}$'),
  regon text NOT NULL DEFAULT '' CHECK (regon = '' OR regon ~ '^[0-9]{9}([0-9]{5})?$'),
  address_line text NOT NULL DEFAULT '' CHECK (char_length(address_line) <= 200),
  postal_code text NOT NULL DEFAULT '' CHECK (postal_code = '' OR postal_code ~ '^[0-9]{2}-[0-9]{3}$'),
  city text NOT NULL DEFAULT '' CHECK (char_length(city) <= 100),
  tax_office text NOT NULL DEFAULT '' CHECK (char_length(tax_office) <= 200),
  bank_account text NOT NULL DEFAULT '' CHECK (char_length(bank_account) <= 40),
  document_prefix text NOT NULL DEFAULT 'RT' CHECK (document_prefix ~ '^[A-Za-z0-9-]{1,12}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fleet_driver_tax_profiles (
  driver_id uuid PRIMARY KEY,
  fleet_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  arrangement text NOT NULL DEFAULT 'mandate'
    CHECK (arrangement IN ('employment', 'mandate', 'b2b')),
  pesel text NOT NULL DEFAULT '' CHECK (pesel = '' OR pesel ~ '^[0-9]{11}$'),
  nip text NOT NULL DEFAULT '' CHECK (nip = '' OR nip ~ '^[0-9]{10}$'),
  address_line text NOT NULL DEFAULT '' CHECK (char_length(address_line) <= 200),
  postal_code text NOT NULL DEFAULT '' CHECK (postal_code = '' OR postal_code ~ '^[0-9]{2}-[0-9]{3}$'),
  city text NOT NULL DEFAULT '' CHECK (char_length(city) <= 100),
  tax_resident boolean NOT NULL DEFAULT true,
  under_26 boolean NOT NULL DEFAULT false,
  apply_social_insurance boolean NOT NULL DEFAULT true,
  apply_sickness_insurance boolean NOT NULL DEFAULT true,
  pension_rate numeric(5,2) NOT NULL DEFAULT 9.76 CHECK (pension_rate BETWEEN 0 AND 100),
  disability_rate numeric(5,2) NOT NULL DEFAULT 1.50 CHECK (disability_rate BETWEEN 0 AND 100),
  sickness_rate numeric(5,2) NOT NULL DEFAULT 2.45 CHECK (sickness_rate BETWEEN 0 AND 100),
  health_rate numeric(5,2) NOT NULL DEFAULT 9.00 CHECK (health_rate BETWEEN 0 AND 100),
  income_cost_type text NOT NULL DEFAULT 'percent20'
    CHECK (income_cost_type IN ('standard250', 'commuter300', 'percent20', 'custom')),
  custom_income_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (custom_income_cost >= 0),
  pit_rate numeric(5,2) NOT NULL DEFAULT 12 CHECK (pit_rate BETWEEN 0 AND 100),
  pit2_reduction numeric(14,2) NOT NULL DEFAULT 0 CHECK (pit2_reduction BETWEEN 0 AND 300),
  ppk_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (ppk_rate BETWEEN 0 AND 100),
  vat_rate numeric(5,2) NOT NULL DEFAULT 23 CHECK (vat_rate BETWEEN 0 AND 100),
  vat_exempt boolean NOT NULL DEFAULT false,
  self_billing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (driver_id, fleet_user_id),
  FOREIGN KEY (driver_id, fleet_user_id)
    REFERENCES public.fleet_drivers(id, fleet_user_id) ON DELETE CASCADE
);

CREATE TABLE public.fleet_generated_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL,
  document_number text NOT NULL CHECK (char_length(document_number) BETWEEN 1 AND 80),
  document_type text NOT NULL CHECK (document_type IN ('payroll', 'mandate_statement', 'b2b_statement')),
  period_from date NOT NULL,
  period_to date NOT NULL CHECK (period_to >= period_from),
  snapshot jsonb NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fleet_user_id, document_number),
  FOREIGN KEY (driver_id, fleet_user_id)
    REFERENCES public.fleet_drivers(id, fleet_user_id) ON DELETE RESTRICT
);

CREATE INDEX fleet_driver_tax_profiles_owner_idx
  ON public.fleet_driver_tax_profiles (fleet_user_id, driver_id);
CREATE INDEX fleet_generated_documents_owner_period_idx
  ON public.fleet_generated_documents (fleet_user_id, period_to DESC);
CREATE INDEX fleet_generated_documents_driver_owner_idx
  ON public.fleet_generated_documents (driver_id, fleet_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_tax_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fleet_driver_tax_profiles TO authenticated;
GRANT SELECT, INSERT ON public.fleet_generated_documents TO authenticated;
GRANT ALL ON public.fleet_tax_profiles TO service_role;
GRANT ALL ON public.fleet_driver_tax_profiles TO service_role;
GRANT ALL ON public.fleet_generated_documents TO service_role;

ALTER TABLE public.fleet_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_driver_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_generated_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fleet partners manage own tax profile"
  ON public.fleet_tax_profiles FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = fleet_user_id)
  WITH CHECK ((SELECT auth.uid()) = fleet_user_id);

CREATE POLICY "Fleet partners manage own driver tax profiles"
  ON public.fleet_driver_tax_profiles FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = fleet_user_id)
  WITH CHECK ((SELECT auth.uid()) = fleet_user_id);

CREATE POLICY "Fleet partners create and view own generated documents"
  ON public.fleet_generated_documents FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = fleet_user_id);

CREATE POLICY "Fleet partners create own generated documents"
  ON public.fleet_generated_documents FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = fleet_user_id);

CREATE TRIGGER trg_fleet_tax_profiles_updated_at
BEFORE UPDATE ON public.fleet_tax_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_updated_at();

CREATE TRIGGER trg_fleet_driver_tax_profiles_updated_at
BEFORE UPDATE ON public.fleet_driver_tax_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_user_data_updated_at();

