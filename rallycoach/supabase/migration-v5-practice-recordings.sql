-- ============================================
-- Migration V5: Practice Session Recordings
-- ============================================
-- This migration adds support for practice session video recordings:
-- 1. New columns on sessions table for practice video metadata
-- 2. New storage bucket for practice recordings
-- 3. RLS policies for secure access

-- ============================================
-- 1. Add practice video columns to sessions table
-- ============================================

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS practice_video_path TEXT,
ADD COLUMN IF NOT EXISTS practice_video_mime TEXT,
ADD COLUMN IF NOT EXISTS practice_video_duration_sec INTEGER,
ADD COLUMN IF NOT EXISTS practice_video_size_bytes BIGINT;

-- Add comments for documentation
COMMENT ON COLUMN sessions.practice_video_path IS 'Storage path for practice session recording';
COMMENT ON COLUMN sessions.practice_video_mime IS 'MIME type of the practice recording (video/webm or video/mp4)';
COMMENT ON COLUMN sessions.practice_video_duration_sec IS 'Duration of the practice recording in seconds';
COMMENT ON COLUMN sessions.practice_video_size_bytes IS 'File size of the practice recording in bytes';

-- ============================================
-- 2. Create storage bucket for practice recordings
-- ============================================

-- Note: Run this in the Supabase SQL Editor or via Supabase CLI
-- The bucket is private by default (not public)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'practice-recordings',
  'practice-recordings',
  false, -- Private bucket
  104857600, -- 100MB max file size
  ARRAY['video/webm', 'video/mp4', 'video/quicktime']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['video/webm', 'video/mp4', 'video/quicktime']::text[];

-- ============================================
-- 3. RLS Policies for practice-recordings bucket
-- ============================================

-- Policy: Users can upload recordings to their own folder
CREATE POLICY "Users can upload their own practice recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'practice-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can read only their own recordings
CREATE POLICY "Users can read their own practice recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'practice-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own recordings (for re-uploads)
CREATE POLICY "Users can update their own practice recordings"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'practice-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'practice-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own recordings
CREATE POLICY "Users can delete their own practice recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'practice-recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 4. Create index for efficient practice session queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sessions_practice_video
ON sessions (user_id, type)
WHERE type = 'practice' AND practice_video_path IS NOT NULL;

-- ============================================
-- Verification queries (run after migration)
-- ============================================

-- Check that columns were added:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'sessions' AND column_name LIKE 'practice_%';

-- Check that bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'practice-recordings';

-- Check RLS policies:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%practice%';
