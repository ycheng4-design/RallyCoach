-- RallyCoach V2 Database Migration
-- Run these SQL commands in your Supabase SQL Editor
-- This adds support for: Sessions, Issues, Events, Practice Stats

-- ============================================
-- 1. CREATE SESSIONS TABLE
-- ============================================
-- Stores both Analytics and Practice sessions
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type TEXT NOT NULL CHECK (type IN ('analytics', 'practice')),
    video_path TEXT,  -- Storage path for uploaded video (analytics only)
    video_url TEXT,   -- Public URL for video playback
    filename TEXT,    -- Original filename
    duration_seconds NUMERIC,
    overall_score NUMERIC DEFAULT 0,  -- 0-100 score
    summary JSONB DEFAULT '{}'::jsonb,  -- {top_issues: [], notes: ""}
    pose_data JSONB DEFAULT '[]'::jsonb,  -- Array of landmarks per frame (for overlay)
    frame_count INTEGER DEFAULT 0
);

COMMENT ON TABLE sessions IS 'Stores both Analytics (video upload) and Practice (webcam) sessions';

-- ============================================
-- 2. CREATE ISSUES TABLE
-- ============================================
-- Detected issues per session with drill recommendations
CREATE TABLE IF NOT EXISTS issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    code TEXT NOT NULL,  -- e.g., 'ELBOW_LOW_BACKHAND', 'STANCE_TOO_NARROW'
    title TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    description TEXT,
    drill JSONB DEFAULT '{}'::jsonb,  -- {steps: [], tips: [], duration_minutes: 5}
    keyframes JSONB DEFAULT '[]'::jsonb,  -- [{svg: "...", label: "Setup"}, ...]
    timestamps JSONB DEFAULT '[]'::jsonb,  -- [1.2, 3.5, 7.8] seconds where issue occurred
    occurrence_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE issues IS 'Form issues detected in a session with associated drills';

-- ============================================
-- 3. CREATE EVENTS TABLE
-- ============================================
-- Per-frame events for detailed analysis
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    t NUMERIC NOT NULL,  -- Timestamp in seconds
    frame_number INTEGER,
    code TEXT NOT NULL,  -- Rule code e.g., 'ELBOW_ANGLE'
    value NUMERIC,  -- Measured value
    threshold_min NUMERIC,
    threshold_max NUMERIC,
    passed BOOLEAN DEFAULT true,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE events IS 'Per-frame rule evaluation results';

-- ============================================
-- 4. CREATE PRACTICE_STATS TABLE
-- ============================================
-- Aggregated stats for practice sessions
CREATE TABLE IF NOT EXISTS practice_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    drill_type TEXT,  -- 'smash', 'clear', 'netshot', 'footwork'
    total_frames INTEGER DEFAULT 0,
    green_frames INTEGER DEFAULT 0,
    red_frames INTEGER DEFAULT 0,
    green_ratio NUMERIC GENERATED ALWAYS AS (
        CASE WHEN total_frames > 0 THEN green_frames::NUMERIC / total_frames ELSE 0 END
    ) STORED,
    avg_elbow_angle NUMERIC,
    avg_stance_width NUMERIC,
    peak_form_score NUMERIC DEFAULT 0,
    duration_seconds NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE practice_stats IS 'Aggregated statistics for practice sessions';

-- ============================================
-- 5. CREATE DAILY_AGGREGATES TABLE
-- ============================================
-- Daily aggregated metrics for dashboard charts
CREATE TABLE IF NOT EXISTS daily_aggregates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    analytics_sessions INTEGER DEFAULT 0,
    practice_sessions INTEGER DEFAULT 0,
    total_practice_minutes NUMERIC DEFAULT 0,
    avg_technique_score NUMERIC DEFAULT 0,
    avg_green_ratio NUMERIC DEFAULT 0,
    top_issues JSONB DEFAULT '[]'::jsonb,  -- [{code: "...", count: 5}, ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

COMMENT ON TABLE daily_aggregates IS 'Daily aggregated metrics for dashboard charts';

-- ============================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_aggregates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS POLICIES FOR SESSIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;
CREATE POLICY "Users can view their own sessions"
    ON sessions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sessions" ON sessions;
CREATE POLICY "Users can insert their own sessions"
    ON sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions;
CREATE POLICY "Users can update their own sessions"
    ON sessions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sessions" ON sessions;
CREATE POLICY "Users can delete their own sessions"
    ON sessions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 8. RLS POLICIES FOR ISSUES
-- ============================================
DROP POLICY IF EXISTS "Users can view issues for their sessions" ON issues;
CREATE POLICY "Users can view issues for their sessions"
    ON issues FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = issues.session_id
            AND sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert issues for their sessions" ON issues;
CREATE POLICY "Users can insert issues for their sessions"
    ON issues FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = issues.session_id
            AND sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete issues for their sessions" ON issues;
CREATE POLICY "Users can delete issues for their sessions"
    ON issues FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = issues.session_id
            AND sessions.user_id = auth.uid()
        )
    );

-- ============================================
-- 9. RLS POLICIES FOR EVENTS
-- ============================================
DROP POLICY IF EXISTS "Users can view events for their sessions" ON events;
CREATE POLICY "Users can view events for their sessions"
    ON events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = events.session_id
            AND sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert events for their sessions" ON events;
CREATE POLICY "Users can insert events for their sessions"
    ON events FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = events.session_id
            AND sessions.user_id = auth.uid()
        )
    );

-- ============================================
-- 10. RLS POLICIES FOR PRACTICE_STATS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own practice stats" ON practice_stats;
CREATE POLICY "Users can view their own practice stats"
    ON practice_stats FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own practice stats" ON practice_stats;
CREATE POLICY "Users can insert their own practice stats"
    ON practice_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 11. RLS POLICIES FOR DAILY_AGGREGATES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own daily aggregates" ON daily_aggregates;
CREATE POLICY "Users can view their own daily aggregates"
    ON daily_aggregates FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can upsert their own daily aggregates" ON daily_aggregates;
CREATE POLICY "Users can upsert their own daily aggregates"
    ON daily_aggregates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own daily aggregates" ON daily_aggregates;
CREATE POLICY "Users can update their own daily aggregates"
    ON daily_aggregates FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- 12. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(type);
CREATE INDEX IF NOT EXISTS idx_issues_session ON issues(session_id);
CREATE INDEX IF NOT EXISTS idx_issues_code ON issues(code);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_session_code ON events(session_id, code);
CREATE INDEX IF NOT EXISTS idx_events_t ON events(t);
CREATE INDEX IF NOT EXISTS idx_practice_stats_user ON practice_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_stats_session ON practice_stats(session_id);
CREATE INDEX IF NOT EXISTS idx_daily_aggregates_user_date ON daily_aggregates(user_id, date DESC);

-- ============================================
-- 13. SERVICE ROLE BYPASS POLICIES
-- ============================================
-- These allow the backend (using service role key) to insert data for any user

DROP POLICY IF EXISTS "Service role can insert sessions" ON sessions;
CREATE POLICY "Service role can insert sessions"
    ON sessions FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert issues" ON issues;
CREATE POLICY "Service role can insert issues"
    ON issues FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert events" ON events;
CREATE POLICY "Service role can insert events"
    ON events FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert practice_stats" ON practice_stats;
CREATE POLICY "Service role can insert practice_stats"
    ON practice_stats FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert daily_aggregates" ON daily_aggregates;
CREATE POLICY "Service role can insert daily_aggregates"
    ON daily_aggregates FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 14. HELPER FUNCTIONS
-- ============================================

-- Function to update daily aggregates after session insert
CREATE OR REPLACE FUNCTION update_daily_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO daily_aggregates (user_id, date, analytics_sessions, practice_sessions, avg_technique_score)
    VALUES (
        NEW.user_id,
        DATE(NEW.created_at),
        CASE WHEN NEW.type = 'analytics' THEN 1 ELSE 0 END,
        CASE WHEN NEW.type = 'practice' THEN 1 ELSE 0 END,
        NEW.overall_score
    )
    ON CONFLICT (user_id, date)
    DO UPDATE SET
        analytics_sessions = daily_aggregates.analytics_sessions +
            CASE WHEN NEW.type = 'analytics' THEN 1 ELSE 0 END,
        practice_sessions = daily_aggregates.practice_sessions +
            CASE WHEN NEW.type = 'practice' THEN 1 ELSE 0 END,
        avg_technique_score = (daily_aggregates.avg_technique_score + NEW.overall_score) / 2;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for daily aggregates
DROP TRIGGER IF EXISTS trigger_update_daily_aggregates ON sessions;
CREATE TRIGGER trigger_update_daily_aggregates
    AFTER INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_aggregates();

-- ============================================
-- 15. STORAGE BUCKET (Run in Dashboard)
-- ============================================
-- Create a "keyframes" bucket for storing generated keyframe images
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create bucket named "keyframes" (private)
-- 3. Add policy: Authenticated users can read/write their own folder

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- After running this migration:
-- 1. Update your backend to use these new tables
-- 2. Update frontend to query sessions instead of analysis_results
-- 3. Run the storage bucket setup manually in Dashboard
