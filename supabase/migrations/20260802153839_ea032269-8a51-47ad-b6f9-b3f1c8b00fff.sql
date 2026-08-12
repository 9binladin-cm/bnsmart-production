DROP POLICY IF EXISTS "own files read" ON storage.objects;
DROP POLICY IF EXISTS "own files insert" ON storage.objects;
DROP POLICY IF EXISTS "own files update" ON storage.objects;
DROP POLICY IF EXISTS "own files delete" ON storage.objects;

CREATE POLICY "own files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dayneramit' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own files insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dayneramit' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'dayneramit' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'dayneramit' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dayneramit' AND (storage.foldername(name))[1] = auth.uid()::text);