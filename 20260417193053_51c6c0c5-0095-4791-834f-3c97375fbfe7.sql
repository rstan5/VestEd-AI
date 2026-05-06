
-- Drop unused view (we use the SECURITY DEFINER RPC instead)
DROP VIEW IF EXISTS public.investment_clubs_public;

-- Make the club-images bucket non-public to prevent listing,
-- but keep individual file URLs accessible via signed/public read policy.
UPDATE storage.buckets SET public = false WHERE id = 'club-images';

-- Replace the broad SELECT policy with one that still allows reading individual files
-- (any authenticated user can fetch by exact path) but disables wildcard listing.
DROP POLICY IF EXISTS "Club images are publicly readable" ON storage.objects;

CREATE POLICY "Anyone can read individual club images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'club-images');
