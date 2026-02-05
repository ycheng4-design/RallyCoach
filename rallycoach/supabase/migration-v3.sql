-- RallyCoach Database Migration v3
-- Enhanced Session Model with Strategy Mode, Multi-Player Tracking, and Asset Management
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: Enhance sessions table
-- ============================================

-- Add new columns for enhanced session tracking
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'analytics';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ready';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS match_format TEXT; -- 'singles' | 'doubles'
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS event_type TEXT; -- 'MS' | 'WS' | 'MD' | 'WD' | 'XD'
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS selected_tracks JSONB DEFAULT '[]'::jsonb; -- Track IDs chosen by user
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS summary_score FLOAT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS skill_level TEXT DEFAULT 'intermediate'; -- 'beginner' | 'intermediate' | 'advanced'
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS rules_version TEXT DEFAULT 'v1';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS tracks_data JSONB; -- Store detected tracklets with thumbnails

-- Update type column to support strategy mode
-- (The 'type' column already exists, we're just documenting it can now hold 'strategy')
COMMENT ON COLUMN sessions.type IS 'Session type: practice, analytics, or strategy';
COMMENT ON COLUMN sessions.mode IS 'Deprecated: use type instead. Kept for backward compatibility';
COMMENT ON COLUMN sessions.status IS 'Session status: processing, ready, or error';
COMMENT ON COLUMN sessions.match_format IS 'Match format: singles or doubles';
COMMENT ON COLUMN sessions.event_type IS 'Event type: MS (Men Singles), WS (Women Singles), MD (Men Doubles), WD (Women Doubles), XD (Mixed Doubles)';
COMMENT ON COLUMN sessions.selected_tracks IS 'Array of track IDs selected by user for pose overlay';
COMMENT ON COLUMN sessions.skill_level IS 'Player skill level for scoring bands: beginner, intermediate, advanced';

-- ============================================
-- STEP 2: Create session_assets table
-- ============================================

CREATE TABLE IF NOT EXISTS session_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'video' | 'analysis_json' | 'pose_json' | 'keyframe1' | 'keyframe2' | 'keyframe3' | 'trajectory_json' | 'trajectory_video' | 'tracks_thumbnail'
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'analysis',
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional asset metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for session_assets
CREATE INDEX IF NOT EXISTS idx_session_assets_session_id ON session_assets(session_id);
CREATE INDEX IF NOT EXISTS idx_session_assets_kind ON session_assets(kind);

-- Enable RLS on session_assets
ALTER TABLE session_assets ENABLE ROW LEVEL SECURITY;

-- Session assets policies (linked via session)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own session assets" ON session_assets;
  DROP POLICY IF EXISTS "Users can insert own session assets" ON session_assets;
  DROP POLICY IF EXISTS "Users can delete own session assets" ON session_assets;
END
$$;

CREATE POLICY "Users can view own session assets" ON session_assets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_assets.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own session assets" ON session_assets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_assets.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own session assets" ON session_assets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_assets.session_id AND sessions.user_id = auth.uid())
  );

-- ============================================
-- STEP 3: Create strategy_results table
-- ============================================

CREATE TABLE IF NOT EXISTS strategy_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  original_trajectory JSONB, -- Array of {x, y, timestamp} points
  refined_trajectory JSONB, -- Array of {x, y, timestamp} points
  coaching_points JSONB, -- Array of 5-6 coaching bullet points
  court_homography JSONB, -- 4-corner court calibration matrix
  shuttle_detections JSONB, -- Raw shuttle detection data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for strategy_results
CREATE INDEX IF NOT EXISTS idx_strategy_results_session_id ON strategy_results(session_id);

-- Enable RLS on strategy_results
ALTER TABLE strategy_results ENABLE ROW LEVEL SECURITY;

-- Strategy results policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own strategy results" ON strategy_results;
  DROP POLICY IF EXISTS "Users can insert own strategy results" ON strategy_results;
  DROP POLICY IF EXISTS "Users can update own strategy results" ON strategy_results;
END
$$;

CREATE POLICY "Users can view own strategy results" ON strategy_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = strategy_results.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own strategy results" ON strategy_results
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = strategy_results.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can update own strategy results" ON strategy_results
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = strategy_results.session_id AND sessions.user_id = auth.uid())
  );

-- ============================================
-- STEP 4: Create player_tracks table for multi-person tracking
-- ============================================

CREATE TABLE IF NOT EXISTS player_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  track_id INTEGER NOT NULL, -- Track ID within the session
  thumbnail_path TEXT, -- Storage path for track thumbnail crop
  bbox_samples JSONB, -- Sample bounding boxes across frames [{frame, x, y, w, h}, ...]
  side TEXT, -- 'near' | 'far' to indicate which side of court
  is_selected BOOLEAN DEFAULT FALSE, -- Whether this track is selected by user
  confidence_avg FLOAT, -- Average detection confidence
  frame_count INTEGER, -- Number of frames this track appears in
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, track_id)
);

-- Create index for player_tracks
CREATE INDEX IF NOT EXISTS idx_player_tracks_session_id ON player_tracks(session_id);

-- Enable RLS on player_tracks
ALTER TABLE player_tracks ENABLE ROW LEVEL SECURITY;

-- Player tracks policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own player tracks" ON player_tracks;
  DROP POLICY IF EXISTS "Users can insert own player tracks" ON player_tracks;
  DROP POLICY IF EXISTS "Users can update own player tracks" ON player_tracks;
  DROP POLICY IF EXISTS "Users can delete own player tracks" ON player_tracks;
END
$$;

CREATE POLICY "Users can view own player tracks" ON player_tracks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = player_tracks.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own player tracks" ON player_tracks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = player_tracks.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can update own player tracks" ON player_tracks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = player_tracks.session_id AND sessions.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own player tracks" ON player_tracks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = player_tracks.session_id AND sessions.user_id = auth.uid())
  );

-- ============================================
-- STEP 5: Create storage buckets (run separately or via dashboard)
-- ============================================

-- Note: Storage bucket creation must be done via Supabase Dashboard or Management API
-- The following are the buckets needed:
--
-- 1. videos (already exists, public)
-- 2. analysis (new, public) - for analysis_json, pose_json files
-- 3. keyframes (new, public) - for keyframe images
-- 4. strategy (new, public) - for trajectory_json, trajectory_video files
-- 5. tracks (new, public) - for track thumbnail crops

-- SQL to create buckets (run via Supabase SQL editor with service role):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('analysis', 'analysis', true) ON CONFLICT (id) DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('keyframes', 'keyframes', true) ON CONFLICT (id) DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('strategy', 'strategy', true) ON CONFLICT (id) DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('tracks', 'tracks', true) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 6: Add indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(type);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_match_format ON sessions(match_format);
CREATE INDEX IF NOT EXISTS idx_sessions_event_type ON sessions(event_type);

-- ============================================
-- Success message
-- ============================================

SELECT 'Migration v3 completed successfully! Remember to create storage buckets via Supabase Dashboard.' as status;
