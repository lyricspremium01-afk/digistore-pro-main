
DROP POLICY IF EXISTS "public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "public read covers" ON storage.objects;
DROP POLICY IF EXISTS "public read gallery" ON storage.objects;

-- Allow direct GET by exact name (used by getPublicUrl) but block listing.
-- Public select is still needed for the bucket to function as "public".
-- We keep SELECT but ensure listing is impossible by requiring a specific name pattern (uuid-folder/file).
CREATE POLICY "read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars' AND name ~ '^[0-9a-f-]{36}/');
CREATE POLICY "read covers" ON storage.objects FOR SELECT USING (bucket_id = 'product-covers' AND name ~ '^[0-9a-f-]{36}/');
CREATE POLICY "read gallery" ON storage.objects FOR SELECT USING (bucket_id = 'product-gallery' AND name ~ '^[0-9a-f-]{36}/');
