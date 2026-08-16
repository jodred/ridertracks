ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fleet_partner_name text;

-- Preserve existing fleet partners' visible business name when upgrading.
UPDATE public.profiles
SET fleet_partner_name = display_name
WHERE account_type = 'fleet'
  AND NULLIF(TRIM(fleet_partner_name), '') IS NULL
  AND NULLIF(TRIM(display_name), '') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, account_type, fleet_partner_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'account_type', 'driver'),
    NULLIF(TRIM(COALESCE(new.raw_user_meta_data->>'fleet_partner_name', new.raw_user_meta_data->>'fleet_name', '')), '')
  )
  ON CONFLICT (id) DO NOTHING;

  IF LOWER(new.email) = 'dcola86@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END;
$$;
