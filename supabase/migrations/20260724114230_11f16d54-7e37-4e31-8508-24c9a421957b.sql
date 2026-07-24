ALTER TABLE public.user_data ADD COLUMN IF NOT EXISTS workspace text NOT NULL DEFAULT 'rides';
ALTER TABLE public.user_data DROP CONSTRAINT IF EXISTS user_data_workspace_check;
ALTER TABLE public.user_data ADD CONSTRAINT user_data_workspace_check CHECK (workspace IN ('rides','foods'));
ALTER TABLE public.user_data DROP CONSTRAINT IF EXISTS user_data_pkey;
ALTER TABLE public.user_data DROP CONSTRAINT IF EXISTS user_data_user_id_key;
ALTER TABLE public.user_data ADD CONSTRAINT user_data_user_workspace_key UNIQUE (user_id, workspace);