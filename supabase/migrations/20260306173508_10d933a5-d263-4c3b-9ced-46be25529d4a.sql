
-- Create private bucket for authenticated WhatsApp media attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Allow authenticated users to upload files to the bucket
CREATE POLICY "Allow authenticated upload whatsapp-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media');

-- Allow authenticated users to read files from the bucket
CREATE POLICY "Allow authenticated read whatsapp-media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'whatsapp-media');

-- Allow authenticated users to delete files from the bucket
CREATE POLICY "Allow authenticated delete whatsapp-media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'whatsapp-media');
