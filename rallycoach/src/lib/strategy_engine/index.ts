/**
 * Strategy Engine - Public API
 *
 * This module provides situation-aware rally analysis and tactical recommendations
 * for badminton shot selection.
 *
 * @example
 * ```typescript
 * import { analyzeRally, generateRecommendations } from '@/lib/strategy_engine';
 *
 * // Analyze a complete rally
 * const result = analyzeRally(sessionId, trajectory);
 *
 * // Get recommendations for a specific shot
 * const recs = generateRecommendationsForShot(trajectory, shotIndex);
 * ```
 */

// ============================================
// Type Exports
// ============================================

export type {
  // Court zones
  CourtDepthZone,
  CourtWidthZone,
  CourtZone,
  // Rally state
  RallyPhase,
  Initiative,
  RallyState,
  // Shots
  ShotType,
  ShotSegment,
  ShotFeatures,
  // Recommendations
  PathPoint,
  RationaleType,
  RecommendationRationale,
  ShotRecommendation,
  PerShotAnalysis,
  // Results
  RallySummary,
  AnalysisMetadata,
  RallyAnalysisResult,
  // Configuration
  StrategyEngineConfig,
  ScoringWeights,
  // Database records
  RallyRecord,
  ShotRecord,
  RecommendationRecord,
} from './types';

// ============================================
// Shot Segmentation Exports
// ============================================

export {
  segmentShots,
  reclassifyShot,
  mergeShortSegments,
  estimateShuttleSpeed,
  estimateShuttleHeight,
} from './shot-segmentation';

// ============================================
// Rally State Machine Exports
// ============================================

export {
  positionToZone,
  zoneToPosition,
  isAdjacentZone,
  findOpenCourtZones,
  computeRallyState,
  computeAllRallyStates,
  describeRallyState,
  getDominantPhase,
  getAveragePressure,
  findKeyMoments,
} from './rally-state-machine';

// ============================================
// Feature Extraction Exports
// ============================================

export {
  extractContactZone,
  extractLandingZone,
  estimateOpponentMovement,
  estimateOpponentDirectionChange,
  calculateRecoveryQuality,
  extractShotFeatures,
  extractAllShotFeatures,
  calculateMovementPressure,
  analyzePatterns,
} from './feature-extraction';

// ============================================
// Scoring Engine Exports
// ============================================

export {
  calculateMovementPressureScore,
  calculateOpenCourtScore,
  assessShotRisk,
  calculateAngleExposure,
  calculateConfidence,
  scoreRecommendation,
  scoreAndRankRecommendations,
  calculateTacticalValue,
  compareRecommendations,
} from './scoring-engine';

// ============================================
// Recommendation Generator Exports
// ============================================

export {
  generateShotPath,
  generateRecommendations,
  generatePerShotAnalysis,
  analyzeRally,
  generateRecommendationsForShot,
  convertLegacyTrajectory,
  getShotDescription,
} from './recommendation-generator';

// ============================================
// Constants Exports
// ============================================

export {
  DEBUG_FLAG,
  ENGINE_VERSION,
  ZONE_GRID,
  ZONE_CENTERS,
  ZONE_ADJACENCY,
  ZONE_DISTANCES,
  DEFAULT_SCORING_WEIGHTS,
  VIABLE_SHOTS_BY_PHASE,
  SHOT_RISK_LEVELS,
  SHOT_HEIGHT_PROXY,
  RECOMMENDATION_COLORS,
  RECOMMENDATION_LINE_STYLES,
  PHASE_COLORS,
  PHASE_NEXT_ACTION,
} from './constants';
