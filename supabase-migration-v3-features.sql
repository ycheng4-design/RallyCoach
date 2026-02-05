-- RallyCoach V3 Features Migration
-- Adds: Ghost Rival, Mistake Timeline, Auto Skill Score + Confidence
-- Run these SQL commands in your Supabase SQL Editor

-- ============================================
-- 1. ADD SKILL SCORE & CONFIDENCE FIELDS TO SESSIONS
-- ============================================
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS skill_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS skill_confidence NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS confidence_reasons JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN sessions.skill_score IS 'Computed skill score 0-100 from pose metrics (not Gemini)';
COMMENT ON COLUMN sessions.skill_confidence IS 'Confidence 0-100 derived from landmark visibility';
COMMENT ON COLUMN sessions.confidence_reasons IS 'Array of reasons affecting confidence';

-- ============================================
-- 2. ADD GHOST/BEST REP FIELDS TO SESSIONS
-- ============================================
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS best_rep_window JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ghost_pose_sequence JSONB DEFAULT NULL;

COMMENT ON COLUMN sessions.best_rep_window IS 'Best rep window: {startTime, endTime, score, shotType}';
COMMENT ON COLUMN sessions.ghost_pose_sequence IS 'Downsampled pose frames for ghost overlay (15fps)';

-- ============================================
-- 3. ENHANCE ISSUES TABLE FOR MISTAKE TIMELINE
-- ============================================
-- Add more detailed mistake event fields
ALTER TABLE issues
ADD COLUMN IF NOT EXISTS start_time_sec NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS end_time_sec NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS confidence NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS affected_joints JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS fix_keyframes JSONB DEFAULT NULL;

COMMENT ON COLUMN issues.start_time_sec IS 'Start time of mistake segment in seconds';
COMMENT ON COLUMN issues.end_time_sec IS 'End time of mistake segment in seconds';
COMMENT ON COLUMN issues.confidence IS 'Confidence of detection from visibility (0-1)';
COMMENT ON COLUMN issues.affected_joints IS 'Array of landmark indices affected by this issue';
COMMENT ON COLUMN issues.fix_keyframes IS 'Keyframes for animated fix-it card';

-- ============================================
-- 4. CREATE MISTAKE_EVENTS TABLE (Granular Timeline)
-- ============================================
-- More granular mistake events for timeline segments
CREATE TABLE IF NOT EXISTS mistake_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
    start_time_sec NUMERIC NOT NULL,
    end_time_sec NUMERIC NOT NULL,
    severity NUMERIC DEFAULT 0.5 CHECK (severity >= 0 AND severity <= 1),
    confidence NUMERIC DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
    joints JSONB DEFAULT '[]'::jsonb,
    summary_title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE mistake_events IS 'Granular mistake segments for timeline visualization';

-- ============================================
-- 5. RLS FOR MISTAKE_EVENTS
-- ============================================
ALTER TABLE mistake_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view mistake events for their sessions" ON mistake_events;
CREATE POLICY "Users can view mistake events for their sessions"
    ON mistake_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = mistake_events.session_id
            AND sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert mistake events for their sessions" ON mistake_events;
CREATE POLICY "Users can insert mistake events for their sessions"
    ON mistake_events FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = mistake_events.session_id
            AND sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role can insert mistake_events" ON mistake_events;
CREATE POLICY "Service role can insert mistake_events"
    ON mistake_events FOR INSERT
    WITH CHECK (true);

-- ============================================
-- 6. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_mistake_events_session ON mistake_events(session_id);
CREATE INDEX IF NOT EXISTS idx_mistake_events_time ON mistake_events(start_time_sec, end_time_sec);
CREATE INDEX IF NOT EXISTS idx_sessions_skill_score ON sessions(skill_score);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- After running this migration:
-- 1. Frontend will compute skill_score from pose metrics
-- 2. Ghost overlay uses best_rep_window + ghost_pose_sequence
-- 3. Mistake timeline uses mistake_events table
