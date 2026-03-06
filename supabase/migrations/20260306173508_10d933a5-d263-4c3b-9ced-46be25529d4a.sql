
-- Create public bucket for WhatsApp media attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload files to the bucket
CREATE POLICY "Allow public upload whatsapp-media"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'whatsapp-media');

-- Allow anyone to read files from the bucket
CREATE POLICY "Allow public read whatsapp-media"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'whatsapp-media');

-- Allow anyone to delete files from the bucket
CREATE POLICY "Allow public delete whatsapp-media"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'whatsapp-media');
