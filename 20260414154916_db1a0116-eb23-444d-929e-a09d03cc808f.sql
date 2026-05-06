
-- Create a security definer function to check club membership
CREATE OR REPLACE FUNCTION public.is_club_member(_user_id uuid, _club_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_memberships
    WHERE user_id = _user_id AND club_id = _club_id
  )
$$;

-- Drop old owner-only update policy
DROP POLICY IF EXISTS "Owners can update their club" ON public.investment_clubs;

-- Create new policy allowing any member to update
CREATE POLICY "Members can update their club"
ON public.investment_clubs
FOR UPDATE
TO authenticated
USING (public.is_club_member(auth.uid(), id));
