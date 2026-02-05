/**
 * Scoring Engine Module
 *
 * Scores shot recommendations based on multiple tactical factors:
 * - Movement pressure on opponent
 * - Open court exploitation
 * - Risk assessment under pressure
 * - Angle exposure penalty
 */

import type {
  ShotRecommendation,
  ShotFeatures,
  RallyState,
  ScoringWeights,
  RecommendationRationale,
  RationaleType,
  ShotType,
} from './types';
import {
  DEBUG_FLAG,
  DEFAULT_SCORING_WEIGHTS,
  BASE_SCORE,
  MIN_SCORE,
  MAX_SCORE,
  SHOT_RISK_LEVELS,
  ZONE_DISTANCES,
  ANGLE_RISK_BY_ZONE,
  PRESSURE_THRESHOLDS,
} from './constants';

/**
 * Debug logger
 */
function logDebug(message: string, data?: unknown): void {
  if (DEBUG_FLAG) {
    console.log(`[ScoringEngine] ${message}`, data ?? '');
  }
}

/**
 * Calculate movement pressure score (0-1)
 * Higher = more movement required from opponent
 */
export function calculateMovementPressureScore(
  targetZone: number,
  features: ShotFeatures
): number {
  // Distance from current landing zone to target zone
  const zoneDistance = ZONE_DISTANCES[features.landingZone]?.[targetZone] ?? 0.5;

  // Factor in existing opponent movement (momentum)
  // If opponent is already moving in one direction, opposite direction adds more pressure
  const momentumFactor = features.opponentDirectionChange / Math.PI;

  // Combine factors
  const score = (zoneDistance * 0.7) + (momentumFactor * 0.3);

  return Math.min(1, Math.max(0, score));
}

/**
 * Calculate open court exploitation score (0-1)
 * Higher = better exploitation of open areas
 */
export function calculateOpenCourtScore(
  targetZone: number,
  rallyState: RallyState
): number {
  // Check if target zone is in open court zones
  if (rallyState.openCourtZones.includes(targetZone)) {
    // Bonus for targeting corners (zones 0, 2, 6, 8)
    const cornerBonus = [0, 2, 6, 8].includes(targetZone) ? 0.2 : 0;
    return Math.min(1, 0.8 + cornerBonus);
  }

  // Partial credit if adjacent to open zone
  const adjacentToOpen = rallyState.openCourtZones.some(openZone => {
    const diff = Math.abs(targetZone - openZone);
    return diff === 1 || diff === 3; // Adjacent horizontally or vertically
  });

  if (adjacentToOpen) {
    return 0.4;
  }

  return 0.1; // Not targeting open court
}

/**
 * Assess risk level for a shot type under current pressure (0-1)
 * Higher = riskier shot choice
 */
export function assessShotRisk(
  shotType: ShotType,
  rallyState: RallyState
): number {
  const baseRisk = SHOT_RISK_LEVELS[shotType] ?? 0.5;

  // Under high pressure, all shots become riskier
  const pressureMultiplier = 1 + (rallyState.pressure * 0.5);

  // Phase adjustment: attacking shots in defense are extra risky
  let phaseMultiplier = 1;
  if (rallyState.phase === 'defense') {
    if (['smash', 'drop', 'net'].includes(shotType)) {
      phaseMultiplier = 1.3; // Extra risky to attack from defense
    }
  } else if (rallyState.phase === 'attack') {
    if (['clear', 'lift'].includes(shotType)) {
      phaseMultiplier = 0.8; // Defensive shots from attack are safer
    }
  }

  const adjustedRisk = baseRisk * pressureMultiplier * phaseMultiplier;
  return Math.min(1, Math.max(0, adjustedRisk));
}

/**
 * Calculate angle exposure risk (0-1)
 * Higher = more angles exposed to opponent counter-attack
 */
export function calculateAngleExposure(
  targetZone: number,
  shotType: ShotType
): number {
  const baseAngleRisk = ANGLE_RISK_BY_ZONE[targetZone] ?? 0.5;

  // Shot type adjustments
  // Drops and nets to center are particularly risky (easy counter)
  let shotTypeMultiplier = 1;
  if (['drop', 'net'].includes(shotType) && [1, 4].includes(targetZone)) {
    shotTypeMultiplier = 1.3; // Center drops are risky
  }

  // Deep clears to corners are safer
  if (shotType === 'clear' && [6, 8].includes(targetZone)) {
    shotTypeMultiplier = 0.7;
  }

  const angleRisk = baseAngleRisk * shotTypeMultiplier;
  return Math.min(1, Math.max(0, angleRisk));
}

/**
 * Calculate confidence level for a recommendation (0-1)
 */
export function calculateConfidence(
  shotType: ShotType,
  rallyState: RallyState,
  features: ShotFeatures
): number {
  let confidence = 0.75; // Base confidence

  // Higher confidence when shot matches phase
  if (rallyState.phase === 'attack' && ['smash', 'drop', 'net'].includes(shotType)) {
    confidence += 0.1;
  } else if (rallyState.phase === 'defense' && ['clear', 'lift'].includes(shotType)) {
    confidence += 0.1;
  }

  // Lower confidence under high pressure
  if (rallyState.pressure > PRESSURE_THRESHOLDS.defense) {
    confidence -= 0.1;
  }

  // Higher confidence if recovery quality is good
  if (features.recoveryQuality < 0.3) {
    confidence += 0.05;
  }

  return Math.min(1, Math.max(0.5, confidence));
}

/**
 * Build rationale array for a recommendation
 */
function buildRationale(
  targetZone: number,
  shotType: ShotType,
  features: ShotFeatures,
  rallyState: RallyState,
  movementScore: number,
  openCourtScore: number,
  riskScore: number,
  angleRisk: number
): RecommendationRationale[] {
  const rationale: RecommendationRationale[] = [];

  // Movement pressure rationale
  if (movementScore > 0.5) {
    rationale.push({
      type: 'movement_pressure',
      description: movementScore > 0.7
        ? 'Forces significant opponent movement'
        : 'Increases opponent movement distance',
      impact: movementScore,
    });
  }

  // Open court rationale
  if (openCourtScore > 0.5) {
    rationale.push({
      type: 'open_court',
      description: openCourtScore > 0.7
        ? 'Targets undefended court area'
        : 'Exploits partial court opening',
      impact: openCourtScore,
    });
  }

  // Risk rationale (negative impact if under pressure)
  if (rallyState.pressure > PRESSURE_THRESHOLDS.defense && riskScore > 0.5) {
    rationale.push({
      type: 'risk_reduction',
      description: 'Higher risk shot under pressure situation',
      impact: -riskScore,
    });
  } else if (riskScore < 0.3 && rallyState.phase === 'defense') {
    rationale.push({
      type: 'risk_reduction',
      description: 'Safe shot to reset the rally',
      impact: 1 - riskScore,
    });
  }

  // Angle exposure rationale
  if (angleRisk > 0.4) {
    rationale.push({
      type: 'angle_denial',
      description: angleRisk > 0.6
        ? 'May expose court to counter-attack angles'
        : 'Moderate angle exposure to opponent',
      impact: -angleRisk,
    });
  }

  // Recovery time rationale for defensive shots
  if (['clear', 'lift'].includes(shotType) && features.recoveryQuality > 0.4) {
    rationale.push({
      type: 'recovery_time',
      description: 'Provides time to recover court position',
      impact: 0.5,
    });
  }

  return rationale;
}

/**
 * Score a single recommendation
 * Returns updated recommendation with score and rationale
 */
export function scoreRecommendation(
  recommendation: ShotRecommendation,
  features: ShotFeatures,
  rallyState: RallyState,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ShotRecommendation {
  let score = BASE_SCORE;

  // Calculate individual factors
  const movementScore = calculateMovementPressureScore(
    recommendation.targetZone,
    features
  );
  const openCourtScore = calculateOpenCourtScore(
    recommendation.targetZone,
    rallyState
  );
  const riskScore = assessShotRisk(recommendation.shotType, rallyState);
  const angleRisk = calculateAngleExposure(
    recommendation.targetZone,
    recommendation.shotType
  );

  // Apply weights to calculate final score
  score += movementScore * weights.movementPressure;
  score += openCourtScore * weights.openCourt;

  // Apply penalties only when relevant
  if (rallyState.pressure > PRESSURE_THRESHOLDS.attack) {
    score -= riskScore * weights.riskUnderPressure;
  }
  score -= angleRisk * weights.angleExposure;

  // Clamp score to valid range
  score = Math.min(MAX_SCORE, Math.max(MIN_SCORE, score));

  // Build rationale
  const rationale = buildRationale(
    recommendation.targetZone,
    recommendation.shotType,
    features,
    rallyState,
    movementScore,
    openCourtScore,
    riskScore,
    angleRisk
  );

  // Calculate confidence
  const confidence = calculateConfidence(
    recommendation.shotType,
    rallyState,
    features
  );

  logDebug(`Scored recommendation: ${recommendation.shotType} to zone ${recommendation.targetZone}`, {
    score: score.toFixed(1),
    movement: movementScore.toFixed(2),
    openCourt: openCourtScore.toFixed(2),
    risk: riskScore.toFixed(2),
    angle: angleRisk.toFixed(2),
    confidence: confidence.toFixed(2),
  });

  return {
    ...recommendation,
    score: Math.round(score),
    rationale,
    confidence,
  };
}

/**
 * Score multiple recommendations and sort by score descending
 */
export function scoreAndRankRecommendations(
  recommendations: ShotRecommendation[],
  features: ShotFeatures,
  rallyState: RallyState,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ShotRecommendation[] {
  const scored = recommendations.map(rec =>
    scoreRecommendation(rec, features, rallyState, weights)
  );

  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Calculate tactical value (EPV-like metric) for a shot
 * Higher = better expected outcome
 */
export function calculateTacticalValue(
  recommendation: ShotRecommendation,
  features: ShotFeatures,
  rallyState: RallyState
): number {
  // Simplified EPV calculation
  // Positive factors: movement pressure, open court, phase alignment
  // Negative factors: risk, angle exposure

  let value = 0;

  // Movement pressure contribution
  const movement = calculateMovementPressureScore(
    recommendation.targetZone,
    features
  );
  value += movement * 0.3;

  // Open court contribution
  const openCourt = calculateOpenCourtScore(
    recommendation.targetZone,
    rallyState
  );
  value += openCourt * 0.3;

  // Phase alignment contribution
  const phaseAlignment = getPhaseAlignment(
    recommendation.shotType,
    rallyState.phase
  );
  value += phaseAlignment * 0.2;

  // Risk penalty
  const risk = assessShotRisk(recommendation.shotType, rallyState);
  value -= risk * 0.1;

  // Angle penalty
  const angle = calculateAngleExposure(
    recommendation.targetZone,
    recommendation.shotType
  );
  value -= angle * 0.1;

  return Math.min(1, Math.max(0, value));
}

/**
 * Get phase alignment score (how well shot matches current phase)
 */
function getPhaseAlignment(shotType: ShotType, phase: string): number {
  const alignments: Record<string, Record<ShotType, number>> = {
    attack: {
      smash: 1.0,
      drop: 0.9,
      net: 0.8,
      drive: 0.6,
      clear: 0.3,
      lift: 0.1,
      push: 0.5,
      serve: 0.5,
      unknown: 0.5,
    },
    neutral: {
      smash: 0.6,
      drop: 0.7,
      net: 0.7,
      drive: 0.8,
      clear: 0.7,
      lift: 0.5,
      push: 0.6,
      serve: 0.5,
      unknown: 0.5,
    },
    defense: {
      smash: 0.2,
      drop: 0.3,
      net: 0.4,
      drive: 0.6,
      clear: 0.9,
      lift: 1.0,
      push: 0.5,
      serve: 0.5,
      unknown: 0.5,
    },
  };

  return alignments[phase]?.[shotType] ?? 0.5;
}

/**
 * Compare two recommendations and explain the difference
 */
export function compareRecommendations(
  rec1: ShotRecommendation,
  rec2: ShotRecommendation
): string {
  const scoreDiff = rec1.score - rec2.score;
  const comparison: string[] = [];

  if (Math.abs(scoreDiff) < 5) {
    comparison.push('Both options are similarly viable.');
  } else if (scoreDiff > 0) {
    comparison.push(`${rec1.shotType} scores ${scoreDiff} points higher.`);
  } else {
    comparison.push(`${rec2.shotType} scores ${-scoreDiff} points higher.`);
  }

  // Compare key rationales
  const rec1Positive = rec1.rationale.filter(r => r.impact > 0);
  const rec2Positive = rec2.rationale.filter(r => r.impact > 0);

  if (rec1Positive.length > rec2Positive.length) {
    comparison.push(`${rec1.shotType} has more tactical advantages.`);
  } else if (rec2Positive.length > rec1Positive.length) {
    comparison.push(`${rec2.shotType} has more tactical advantages.`);
  }

  return comparison.join(' ');
}
