
-- Create investment clubs table
CREATE TABLE public.investment_clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  join_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create club memberships table
CREATE TABLE public.club_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.investment_clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- Enable RLS
ALTER TABLE public.investment_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;

-- Clubs policies
CREATE POLICY "Anyone authenticated can view clubs"
  ON public.investment_clubs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create clubs"
  ON public.investment_clubs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their club"
  ON public.investment_clubs FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their club"
  ON public.investment_clubs FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Memberships policies
CREATE POLICY "Anyone authenticated can view memberships"
  ON public.club_memberships FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can join clubs"
  ON public.club_memberships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave clubs"
  ON public.club_memberships FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Auto-add owner as member when club is created
CREATE OR REPLACE FUNCTION public.handle_new_club()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.club_memberships (club_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_club_created
  AFTER INSERT ON public.investment_clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_club();

-- Updated at trigger for clubs
CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON public.investment_clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
