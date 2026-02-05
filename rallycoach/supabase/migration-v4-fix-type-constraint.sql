-- RallyCoach Database Migration v4
-- Fix: Add 'strategy' to sessions_type_check constraint
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: Drop the existing type check constraint
-- ============================================

-- First, find and drop the existing constraint
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_type_check;

-- ============================================
-- STEP 2: Add updated check constraint with 'strategy' type
-- ============================================

ALTER TABLE sessions ADD CONSTRAINT sessions_type_check
  CHECK (type IN ('practice', 'analytics', 'strategy'));

-- ============================================
-- Success message
-- ============================================

SELECT 'Migration v4 completed! sessions table now accepts practice, analytics, and strategy types.' as status;
