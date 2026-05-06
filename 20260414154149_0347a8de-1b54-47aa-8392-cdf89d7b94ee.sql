
-- Add image_url column to investment_clubs
ALTER TABLE public.investment_clubs ADD COLUMN image_url text;

-- Create storage bucket for club images
INSERT INTO storage.buckets (id, name, public) VALUES ('club-images', 'club-images', true);

-- Storage policies
CREATE POLICY "Club images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'club-images');

CREATE POLICY "Authenticated users can upload club images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'club-images');

CREATE POLICY "Authenticated users can update club images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'club-images');
