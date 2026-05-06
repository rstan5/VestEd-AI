
-- Restrict club updates to owner only
DROP POLICY IF EXISTS "Members can update their club" ON public.investment_clubs;

CREATE POLICY "Owners can update their club"
ON public.investment_clubs
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Require auth to view profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
