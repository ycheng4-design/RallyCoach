-- RallyCoach Database Migration v4 - Strategy Engine
-- Adds tables for rally analysis, shots, and recommendations persistence
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: Create rallies table
-- ============================================

CREATE TABLE IF NOT EXISTS rallies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    rally_index INTEGER NOT NULL,
    start_time_ms INTEGER NOT NULL DEFAULT 0,
    end_time_ms INTEGER NOT NULL DEFAULT 0,
    total_shots INTEGER DEFAULT 0,
    dominant_phase TEXT CHECK (dominant_phase IN ('attack', 'neutral', 'defense')),
    average_pressure NUMERIC(4,3) DEFAULT 0.5,
    winner TEXT CHECK (winner IN ('us', 'them', 'unknown')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_session_rally UNIQUE (session_id, rally_index)
);

COMMENT ON TABLE rallies IS 'Rally segments within a session for strategy analysis';
COMMENT ON COLUMN rallies.rally_index IS 'Sequential index of rally within session (0-based)';
COMMENT ON COLUMN rallies.dominant_phase IS 'Most common phase during the rally: attack, neutral, or defense';
COMMENT ON COLUMN rallies.average_pressure IS 'Average pressure score across all shots (0-1)';

CREATE INDEX IF NOT EXISTS idx_rallies_session_id ON rallies(session_id);
CREATE INDEX IF NOT EXISTS idx_rallies_session_index ON rallies(session_id, rally_index);

-- ============================================
-- STEP 2: Create shots table
-- ============================================

CREATE TABLE IF NOT EXISTS shots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rally_id UUID NOT NULL REFERENCES rallies(id) ON DELETE CASCADE,
    shot_index INTEGER NOT NULL,
    shot_type TEXT NOT NULL,
    start_time_ms INTEGER NOT NULL DEFAULT 0,
    end_time_ms INTEGER NOT NULL DEFAULT 0,
    player TEXT CHECK (player IN ('near', 'far')),
    -- Shot features stored as JSONB for flexibility
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Rally state at this shot
    rally_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Original trajectory slice for this shot
    trajectory_slice JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_rally_shot UNIQUE (rally_id, shot_index)
);

COMMENT ON TABLE shots IS 'Individual shots within a rally with extracted features';
COMMENT ON COLUMN shots.shot_type IS 'Shot type: clear, drop, smash, drive, net, lift, serve, push, unknown';
COMMENT ON COLUMN shots.features IS 'ShotFeatures JSON: contactZone, landingZone, shuttleSpeedProxy, shuttleHeightProxy, opponentMovementDistance, opponentDirectionChange, recoveryQuality';
COMMENT ON COLUMN shots.rally_state IS 'RallyState JSON: phase, initiative, pressure, openCourtZones, timestamp';
COMMENT ON COLUMN shots.trajectory_slice IS 'Array of TrajectoryPoint for this shot segment';

CREATE INDEX IF NOT EXISTS idx_shots_rally_id ON shots(rally_id);
CREATE INDEX IF NOT EXISTS idx_shots_type ON shots(shot_type);
CREATE INDEX IF NOT EXISTS idx_shots_rally_index ON shots(rally_id, shot_index);

-- ============================================
-- STEP 3: Create recommendations table
-- ============================================

CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
    rec_index INTEGER NOT NULL CHECK (rec_index BETWEEN 0 AND 2),
    shot_type TEXT NOT NULL,
    target_zone INTEGER NOT NULL CHECK (target_zone BETWEEN 0 AND 8),
    score INTEGER NOT NULL DEFAULT 50 CHECK (score BETWEEN 0 AND 100),
    confidence NUMERIC(4,3) DEFAULT 0.75,
    -- Path polyline as array of {x, y, z?} objects
    path_polyline JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Rationale as array of {type, description, impact} objects
    rationale JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_shot_rec UNIQUE (shot_id, rec_index)
);

COMMENT ON TABLE recommendations IS 'TOP-3 shot recommendations for each decision point';
COMMENT ON COLUMN recommendations.rec_index IS 'Recommendation rank (0=best, 1=second, 2=third)';
COMMENT ON COLUMN recommendations.target_zone IS 'Target zone ID (0-8 grid: 0=front-left, 4=mid-center, 8=back-right)';
COMMENT ON COLUMN recommendations.path_polyline IS 'Array of PathPoint: {x, y, z} for trajectory visualization';
COMMENT ON COLUMN recommendations.rationale IS 'Array of RecommendationRationale: {type, description, impact}';

CREATE INDEX IF NOT EXISTS idx_recommendations_shot_id ON recommendations(shot_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_score ON recommendations(score DESC);

-- ============================================
-- STEP 4: Enable Row Level Security
-- ============================================

ALTER TABLE rallies ENABLE ROW LEVEL SECURITY;
ALTER TABLE shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: RLS Policies for rallies
-- ============================================

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view rallies for their sessions" ON rallies;
    DROP POLICY IF EXISTS "Users can insert rallies for their sessions" ON rallies;
    DROP POLICY IF EXISTS "Users can update rallies for their sessions" ON rallies;
    DROP POLICY IF EXISTS "Users can delete rallies for their sessions" ON rallies;
END
$$;

CREATE POLICY "Users can view rallies for their sessions"
    ON rallies FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = rallies.session_id
            AND sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert rallies for their sessions"
    ON rallies FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = rallies.session_id
            AND sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update rallies for their sessions"
    ON rallies FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = rallies.session_id
            AND sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete rallies for their sessions"
    ON rallies FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = rallies.session_id
            AND sessions.user_id = auth.uid()
        )
    );

-- ============================================
-- STEP 6: RLS Policies for shots
-- ============================================

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view shots for their rallies" ON shots;
    DROP POLICY IF EXISTS "Users can insert shots for their rallies" ON shots;
    DROP POLICY IF EXISTS "Users can update shots for their rallies" ON shots;
    DROP POLICY IF EXISTS "Users can delete shots for their rallies" ON shots;
END
$$;

CREATE POLICY "Users can view shots for their rallies"
    ON shots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM rallies
            JOIN sessions ON sessions.id = rallies.session_id
            WHERE rallies.id = shots.rally_id
            AND sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert shots for their rallies"
    ON shots FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM rallies
            JOIN sessions ON sessions.id = rallies.session_id
            WHERE rallies.id = shots.rally_id
            AND sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update shots for their rallies"
    ON shots FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM rallies
            JOIN sessions ON sessions.id = rallies.session_id
            WHERE rallies.id = shots.rally_id
            AND sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete shots for their rallies"
    ON shots FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM rallies
            JOIN sessions ON sessions.id = rallies.session_id
            WHERE rallies.id = shots.rally_id
            AND sessions.user_id = auth.uid()
        )
    );

-- ============================================
-- STEP 7: RLS Policies for recommendations
-- ============================================

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view recommendations for their shots" ON recommendations;
    DROP POLICY IF EXISTS "Users can insert recommendations for their shots" ON recommendations;
    DROP POLICY IF EXISTS "Users can update recommendations for their shots" ON recommendations;
    DROP POLICY IF EXISTS "Users can delete recommendations for their shots" ON recommendations;
END
$$;

CREATE POLICY "Users can view recommendations for their shots"
    ON recommendations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM shots
            JOIN rallies ON rallies.id = shots.rally_id
            JOIN sessions ON sessions.id = rallies.session_id
            WHERE shots.id = recommendations.shot_id
            AND sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert recommendations for their shots"
    ON recommendations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM shots
            JOIN rallies ON rallies.id = shots.rally_id
            JOIN sessions ON sessions.id = rallies.session_id
            WHERE shots.id = recommendations.shot_id
            AND sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update recommendations for their shots"
    ON recommendations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM shots
            JOIN rallies ON rallies.id = shots.rally_id
            JOIN sessions ON sessions.id = rallies.session_id
            WHERE shots.id = recommendations.shot_id
            AND sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete recommendations for their shots"
    ON recommendations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM shots
            JOIN rallies ON rallies.id = shots.rally_id
            JOIN sessions ON sessions.id = rallies.session_id
            WHERE shots.id = recommendations.shot_id
            AND sessions.user_id = auth.uid()
        )
    );

-- ============================================
-- STEP 8: Update strategy_results table
-- ============================================

-- Add columns for enhanced analysis storage
ALTER TABLE strategy_results
ADD COLUMN IF NOT EXISTS rally_analysis JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS engine_version TEXT DEFAULT 'v1.0.0',
ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER DEFAULT NULL;

COMMENT ON COLUMN strategy_results.rally_analysis IS 'Full RallyAnalysisResult JSON with per-shot recommendations';
COMMENT ON COLUMN strategy_results.engine_version IS 'Strategy engine version used for analysis';
COMMENT ON COLUMN strategy_results.processing_time_ms IS 'Time taken to process the analysis in milliseconds';

-- ============================================
-- STEP 9: Create helper functions
-- ============================================

-- Function to get rally summary for a session
CREATE OR REPLACE FUNCTION get_rally_summary(p_session_id UUID)
RETURNS TABLE (
    rally_id UUID,
    rally_index INTEGER,
    total_shots INTEGER,
    dominant_phase TEXT,
    average_pressure NUMERIC,
    recommendation_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id AS rally_id,
        r.rally_index,
        r.total_shots,
        r.dominant_phase,
        r.average_pressure,
        COUNT(rec.id) AS recommendation_count
    FROM rallies r
    LEFT JOIN shots s ON s.rally_id = r.id
    LEFT JOIN recommendations rec ON rec.shot_id = s.id
    WHERE r.session_id = p_session_id
    GROUP BY r.id, r.rally_index, r.total_shots, r.dominant_phase, r.average_pressure
    ORDER BY r.rally_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get shot details with recommendations
CREATE OR REPLACE FUNCTION get_shot_with_recommendations(p_shot_id UUID)
RETURNS TABLE (
    shot_id UUID,
    shot_index INTEGER,
    shot_type TEXT,
    features JSONB,
    rally_state JSONB,
    recommendations JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id AS shot_id,
        s.shot_index,
        s.shot_type,
        s.features,
        s.rally_state,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', rec.id,
                    'rec_index', rec.rec_index,
                    'shot_type', rec.shot_type,
                    'target_zone', rec.target_zone,
                    'score', rec.score,
                    'confidence', rec.confidence,
                    'path_polyline', rec.path_polyline,
                    'rationale', rec.rationale
                ) ORDER BY rec.rec_index
            ) FILTER (WHERE rec.id IS NOT NULL),
            '[]'::jsonb
        ) AS recommendations
    FROM shots s
    LEFT JOIN recommendations rec ON rec.shot_id = s.id
    WHERE s.id = p_shot_id
    GROUP BY s.id, s.shot_index, s.shot_type, s.features, s.rally_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 10: Success message
-- ============================================

SELECT 'Migration v4 (Strategy Engine) completed successfully!' as status;
