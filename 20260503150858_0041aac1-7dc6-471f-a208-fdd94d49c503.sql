ALTER TABLE public.profiles ADD COLUMN is_bot boolean NOT NULL DEFAULT false;
CREATE INDEX idx_profiles_is_bot ON public.profiles(is_bot);