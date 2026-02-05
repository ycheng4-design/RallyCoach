-- RallyCoach Database Migration
-- Run this in your Supabase SQL Editor to add missing columns and tables

-- Add missing columns to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'practice';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS video_path TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS filename TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS duration_seconds FLOAT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS frame_count INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS overall_score INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS pose_data JSONB;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS summary JSONB DEFAULT '{}'::jsonb;

-- Copy data from old columns to new columns if they exist (optional migration)
-- UPDATE sessions SET type = mode WHERE type IS NULL AND mode IS NOT NULL;
-- UPDATE sessions SET summary = score_summary WHERE summary = '{}'::jsonb AND score_summary IS NOT NULL;

-- Create issues table if it doesn't exist
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT,
  timestamps JSONB,
  drill JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_session_id ON issues(session_id);

-- Enable RLS on issues table
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Issues policies (linked via session)
DO $$
BEGIN
  -- Drop existing policies if they exist to avoid conflicts
  DROP POLICY IF EXISTS "Users can view own issues" ON issues;
  DROP POLICY IF EXISTS "Users can insert own issues" ON issues;
  DROP POLICY IF EXISTS "Users can delete own issues" ON issues;
END
$$;

CREATE POLICY "Users can view own issues" ON issues
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = issues.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own issues" ON issues
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = issues.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own issues" ON issues
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = issues.session_id AND sessions.user_id = auth.uid())
  );

-- Create racket_favorites table for storing user's favorite rackets
CREATE TABLE IF NOT EXISTS racket_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  racket_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, racket_id)
);

-- Enable RLS on racket_favorites
ALTER TABLE racket_favorites ENABLE ROW LEVEL SECURITY;

-- Racket favorites policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own racket favorites" ON racket_favorites;
  DROP POLICY IF EXISTS "Users can insert own racket favorites" ON racket_favorites;
  DROP POLICY IF EXISTS "Users can delete own racket favorites" ON racket_favorites;
END
$$;

CREATE POLICY "Users can view own racket favorites" ON racket_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own racket favorites" ON racket_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own racket favorites" ON racket_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_racket_favorites_user_id ON racket_favorites(user_id);

-- Success message
SELECT 'Migration completed successfully!' as status;
