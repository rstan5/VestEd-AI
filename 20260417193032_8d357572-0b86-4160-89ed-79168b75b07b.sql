
-- 1. Restrict direct SELECT on investment_clubs so non-owners can't read join_code
DROP POLICY IF EXISTS "Anyone authenticated can view clubs" ON public.investment_clubs;

-- Public-safe view excluding join_code
CREATE OR REPLACE VIEW public.investment_clubs_public
WITH (security_invoker = on) AS
SELECT id, name, description, image_url, owner_id, created_at, updated_at
FROM public.investment_clubs;

GRANT SELECT ON public.investment_clubs_public TO authenticated, anon;

-- Only owners can SELECT directly from base table (which exposes join_code)
CREATE POLICY "Owners can view full club row"
ON public.investment_clubs
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Allow authenticated users to read non-sensitive columns via the view's underlying access.
-- The view uses security_invoker, so we need a permissive SELECT that the view can use.
-- We add a column-level approach via a second policy that allows SELECT but the view simply
-- doesn't expose join_code. To make the view work for non-owners, add a permissive SELECT
-- and rely on the view to filter columns.
CREATE POLICY "Authenticated can read club basics"
ON public.investment_clubs
FOR SELECT
TO authenticated
USING (true);

-- NOTE: The policy above re-allows reading all columns. To truly hide join_code we must
-- drop it and instead use a SECURITY DEFINER RPC for joining. Replace with stricter policy:
DROP POLICY "Authenticated can read club basics" ON public.investment_clubs;

-- Final state: only owner can SELECT base table. Everyone else uses the view.
-- The view with security_invoker=on will fail for non-owners because RLS blocks it.
-- Switch view to security_definer style by recreating without security_invoker:
DROP VIEW public.investment_clubs_public;

CREATE VIEW public.investment_clubs_public AS
SELECT id, name, description, image_url, owner_id, created_at, updated_at
FROM public.investment_clubs;

ALTER VIEW public.investment_clubs_public SET (security_invoker = off);
GRANT SELECT ON public.investment_clubs_public TO authenticated, anon;

-- 2. Update get_club_leaderboard to hide join_code from non-owners
CREATE OR REPLACE FUNCTION public.get_club_leaderboard(p_prices jsonb)
 RETURNS TABLE(club_id uuid, club_name text, club_description text, join_code text, owner_id uuid, member_count bigint, avg_return numeric, image_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH member_positions AS (
    SELECT
      cm.club_id,
      cm.user_id,
      COALESCE(p.cash_balance, 100000) as cash,
      COALESCE(
        (SELECT SUM(
          pos.shares * COALESCE((p_prices->>pos.ticker)::numeric, pos.average_cost)
        ) FROM public.positions pos WHERE pos.user_id = cm.user_id),
        0
      ) as positions_value
    FROM public.club_memberships cm
    LEFT JOIN public.portfolios p ON p.user_id = cm.user_id
  ),
  member_returns AS (
    SELECT
      mp.club_id,
      mp.user_id,
      ((mp.cash + mp.positions_value - 100000.0) / 100000.0) * 100 as return_pct
    FROM member_positions mp
  )
  SELECT
    ic.id as club_id,
    ic.name as club_name,
    ic.description as club_description,
    CASE WHEN ic.owner_id = auth.uid() THEN ic.join_code ELSE NULL END as join_code,
    ic.owner_id,
    COUNT(mr.user_id)::bigint as member_count,
    COALESCE(ROUND(AVG(mr.return_pct)::numeric, 2), 0) as avg_return,
    ic.image_url
  FROM public.investment_clubs ic
  LEFT JOIN member_returns mr ON mr.club_id = ic.id
  GROUP BY ic.id, ic.name, ic.description, ic.join_code, ic.owner_id, ic.image_url
  ORDER BY avg_return DESC;
END;
$function$;

-- 3. Secure RPC for joining by code (so clients never need SELECT on join_code)
CREATE OR REPLACE FUNCTION public.join_club_by_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_club_id uuid;
  v_club_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id, name INTO v_club_id, v_club_name
  FROM public.investment_clubs
  WHERE join_code = lower(trim(p_code));

  IF v_club_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid code');
  END IF;

  INSERT INTO public.club_memberships (club_id, user_id)
  VALUES (v_club_id, v_user_id)
  ON CONFLICT (club_id, user_id) DO NOTHING;

  RETURN json_build_object('success', true, 'club_id', v_club_id, 'club_name', v_club_name);
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_club_by_code(text) TO authenticated;

-- Ensure unique constraint exists for ON CONFLICT (already from schema: unique(user_id, role) — wrong)
-- Add proper unique constraint on (club_id, user_id) if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'club_memberships_club_user_unique'
  ) THEN
    BEGIN
      ALTER TABLE public.club_memberships
      ADD CONSTRAINT club_memberships_club_user_unique UNIQUE (club_id, user_id);
    EXCEPTION WHEN duplicate_table THEN NULL;
    END;
  END IF;
END $$;

-- 4. Storage policies: only club owners can upload/update/delete club-images
-- Drop existing permissive policies
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND (polname ILIKE '%club-images%' OR polname ILIKE '%club image%' OR polname ILIKE '%club_images%')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.polname);
  END LOOP;
END $$;

-- Public read (bucket is public anyway)
CREATE POLICY "Club images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'club-images');

-- Only club owner can insert (path must start with their auth.uid())
CREATE POLICY "Club owners can upload their club image"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'club-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.investment_clubs
    WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Club owners can update their club image"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'club-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'club-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Club owners can delete their club image"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'club-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
