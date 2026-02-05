-- RallyCoach Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table: Stores practice session data
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'practice',
  video_path TEXT,
  video_url TEXT,
  filename TEXT,
  duration_seconds FLOAT,
  frame_count INTEGER,
  overall_score INTEGER,
  pose_data JSONB,
  summary JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Issues table: Stores detected form issues
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

-- Analysis results table: Stores video analysis from Gemini Pro
CREATE TABLE IF NOT EXISTS analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_path TEXT NOT NULL,
  result_json JSONB,
  status TEXT NOT NULL DEFAULT 'processing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Racket favorites table: Stores user's favorite rackets
CREATE TABLE IF NOT EXISTS racket_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  racket_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, racket_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_issues_session_id ON issues(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id ON analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_status ON analysis_results(status);
CREATE INDEX IF NOT EXISTS idx_racket_favorites_user_id ON racket_favorites(user_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE racket_favorites ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Issues policies (linked via session)
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

-- Analysis results policies
CREATE POLICY "Users can view own analysis" ON analysis_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis" ON analysis_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis" ON analysis_results
  FOR UPDATE USING (auth.uid() = user_id);

-- Racket favorites policies
CREATE POLICY "Users can view own favorites" ON racket_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON racket_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON racket_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for videos (run this separately or via Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true);
