-- Supabase Database Setup for Badminton Analyzer
-- Run these SQL commands in your Supabase SQL Editor

-- 1. Create video_metadata table
CREATE TABLE IF NOT EXISTS video_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration INTEGER,
    file_size INTEGER
);

-- 2. Create analysis_results table
CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id UUID REFERENCES video_metadata(id) ON DELETE CASCADE,
    result_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create training_plans table (optional, for future use)
CREATE TABLE IF NOT EXISTS training_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE video_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for video_metadata
CREATE POLICY "Users can view their own videos"
    ON video_metadata
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos"
    ON video_metadata
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
    ON video_metadata
    FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Create RLS Policies for analysis_results
CREATE POLICY "Users can view their own analysis results"
    ON analysis_results
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis results"
    ON analysis_results
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis results"
    ON analysis_results
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis results"
    ON analysis_results
    FOR DELETE
    USING (auth.uid() = user_id);

-- 7. Create RLS Policies for training_plans
CREATE POLICY "Users can view their own training plans"
    ON training_plans
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training plans"
    ON training_plans
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training plans"
    ON training_plans
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training plans"
    ON training_plans
    FOR DELETE
    USING (auth.uid() = user_id);

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_metadata_user_id ON video_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id ON analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_video_id ON analysis_results(video_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_user_id ON training_plans(user_id);

-- Storage Bucket Setup (run separately in Supabase Dashboard or via Storage Settings)
-- 1. Create a new bucket named "videos"
-- 2. Set it to private (not public)
-- 3. Add storage policies:
--    - Allow authenticated users to upload: bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text
--    - Allow authenticated users to read their own: bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text
--    - Allow authenticated users to delete their own: bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text
