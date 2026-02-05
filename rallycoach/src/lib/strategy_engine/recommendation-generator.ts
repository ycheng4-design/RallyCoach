/**
 * Recommendation Generator Module
 *
 * Generates TOP-3 shot recommendations for each decision point,
 * including shot type, target zone, path polyline, and rationale.
 */

import type {
  ShotSegment,
  ShotFeatures,
  RallyState,
  ShotRecommendation,
  PathPoint,
  ShotType,
  PerShotAnalysis,
  RallyAnalysisResult,
  RallySummary,
  AnalysisMetadata,
} from './types';
import type { TrajectoryPoint } from '../types';
import { segmentShots } from './shot-segmentation';
import {
  computeRallyState,
  computeAllRallyStates,
  positionToZone,
  zoneToPosition,
  getDominantPhase,
  getAveragePressure,
  findKeyMoments,
} from './rally-state-machine';
import { extractShotFeatures, extractAllShotFeatures } from './feature-extraction';
import { scoreAndRankRecommendations } from './scoring-engine';
import {
  DEBUG_FLAG,
  ENGINE_VERSION,
  VIABLE_SHOTS_BY_PHASE,
  SHOT_HEIGHT_PROXY,
  ZONE_CENTERS,
} from './constants';

/**
 * Debug logger
 */
function logDebug(message: string, data?: unknown): void {
  if (DEBUG_FLAG) {
    console.log(`[RecommendationGenerator] ${message}`, data ?? '');
  }
}

/**
 * Generate a unique recommendation ID
 */
function generateRecId(shotType: ShotType, targetZone: number): string {
  return `rec-${shotType}-${targetZone}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate shot path polyline from contact point to target zone
 */
export function generateShotPath(
  contactPoint: { x: number; y: number },
  targetZone: number,
  shotType: ShotType
): PathPoint[] {
  const target = zoneToPosition(targetZone);
  const path: PathPoint[] = [];

  // Start point
  path.push({
    x: contactPoint.x,
    y: contactPoint.y,
    z: 0.5, // Default height at contact
  });

  // Generate intermediate points based on shot type
  const heightProxy = SHOT_HEIGHT_PROXY[shotType] ?? 0.5;
  const numPoints = 5;

  for (let i = 1; i < numPoints; i++) {
    const t = i / numPoints;

    // Linear interpolation for x, y
    const x = contactPoint.x + (target.x - contactPoint.x) * t;
    const y = contactPoint.y + (target.y - contactPoint.y) * t;

    // Parabolic arc for height
    // Height peaks at t=0.5, varies by shot type
    const heightBase = 0.3;
    const heightPeak = heightProxy * 3; // Max height in meters
    const z = heightBase + heightPeak * 4 * t * (1 - t);

    path.push({ x, y, z });
  }

  // End point
  path.push({
    x: target.x,
    y: target.y,
    z: 0.2, // Landing height
  });

  return path;
}

/**
 * Get viable shot types based on rally phase and contact zone
 */
function getViableShotTypes(
  phase: string,
  contactZone: number
): ShotType[] {
  const phaseShotTypes = VIABLE_SHOTS_BY_PHASE[phase] ?? VIABLE_SHOTS_BY_PHASE.neutral;

  // Filter based on contact zone
  // From back court: can play clear, smash, drop, drive
  // From mid court: can play drive, drop, net
  // From front court: can play net, push, lift
  const depthIdx = Math.floor(contactZone / 3);

  if (depthIdx === 2) {
    // Back court
    return phaseShotTypes.filter(s =>
      ['clear', 'smash', 'drop', 'drive', 'lift'].includes(s)
    );
  } else if (depthIdx === 1) {
    // Mid court
    return phaseShotTypes.filter(s =>
      ['drive', 'drop', 'net', 'clear', 'push'].includes(s)
    );
  } else {
    // Front court
    return phaseShotTypes.filter(s =>
      ['net', 'push', 'lift', 'drive'].includes(s)
    );
  }
}

/**
 * Build a candidate recommendation (before scoring)
 */
function buildCandidateRecommendation(
  shotType: ShotType,
  targetZone: number,
  contactPoint: { x: number; y: number }
): ShotRecommendation {
  const pathPolyline = generateShotPath(contactPoint, targetZone, shotType);

  return {
    id: generateRecId(shotType, targetZone),
    shotType,
    targetZone,
    pathPolyline,
    score: 0, // Will be set by scoring engine
    rationale: [], // Will be set by scoring engine
    confidence: 0.75, // Will be updated by scoring engine
  };
}

/**
 * Generate TOP-3 recommendations for a single shot
 */
export function generateRecommendations(
  shot: ShotSegment,
  features: ShotFeatures,
  rallyState: RallyState
): ShotRecommendation[] {
  logDebug(`Generating recommendations for shot ${shot.shotIndex}`, {
    phase: rallyState.phase,
    pressure: rallyState.pressure.toFixed(2),
    openZones: rallyState.openCourtZones,
  });

  // Get contact point from shot
  const startPoint = shot.trajectorySlice[0] ?? { x: 0.5, y: 0.25 };
  const contactPoint = { x: startPoint.x, y: startPoint.y };

  // Get viable shot types for current phase and position
  const viableShotTypes = getViableShotTypes(rallyState.phase, features.contactZone);

  // Generate candidate recommendations
  const candidates: ShotRecommendation[] = [];

  // Prioritize open court zones
  const targetZones = [
    ...rallyState.openCourtZones,
    // Add some non-open zones for variety
    ...Array.from({ length: 9 }, (_, i) => i).filter(
      z => !rallyState.openCourtZones.includes(z)
    ),
  ];

  // Generate candidates: each viable shot type to each target zone
  for (const shotType of viableShotTypes) {
    for (const targetZone of targetZones.slice(0, 5)) {
      // Limit to top 5 zones
      candidates.push(
        buildCandidateRecommendation(shotType, targetZone, contactPoint)
      );
    }
  }

  // Score and rank all candidates
  const scored = scoreAndRankRecommendations(
    candidates,
    features,
    rallyState
  );

  // Return top 3
  const top3 = scored.slice(0, 3);

  logDebug(`Generated TOP-3 recommendations`, {
    recs: top3.map(r => ({
      type: r.shotType,
      zone: r.targetZone,
      score: r.score,
    })),
  });

  return top3;
}

/**
 * Generate per-shot analysis for all shots in a rally
 */
export function generatePerShotAnalysis(
  shots: ShotSegment[],
  rallyStates: RallyState[],
  features: ShotFeatures[]
): PerShotAnalysis[] {
  return shots.map((shot, index) => {
    const state = rallyStates[index];
    const shotFeatures = features[index];

    const recommendations = generateRecommendations(shot, shotFeatures, state);

    return {
      shot,
      features: shotFeatures,
      recommendations,
    };
  });
}

/**
 * Build rally summary from shot analysis
 */
function buildRallySummary(
  shots: PerShotAnalysis[],
  rallyStates: RallyState[]
): RallySummary {
  return {
    totalShots: shots.length,
    dominantPhase: getDominantPhase(rallyStates),
    averagePressure: getAveragePressure(rallyStates),
    keyMoments: findKeyMoments(rallyStates),
    winner: 'unknown', // Would need point outcome data
  };
}

/**
 * Main function: Analyze a complete rally and generate recommendations
 *
 * @param sessionId Session ID
 * @param trajectory Array of trajectory points
 * @param poseTimestamps Optional pose timestamps for fusion
 * @param opponentPositions Optional opponent position data
 * @param playerPositions Optional player position data
 * @returns Complete rally analysis result
 */
export function analyzeRally(
  sessionId: string,
  trajectory: TrajectoryPoint[],
  poseTimestamps?: number[],
  opponentPositions?: Array<{ x: number; y: number; timestamp: number }>,
  playerPositions?: Array<{ x: number; y: number; timestamp: number }>
): RallyAnalysisResult {
  const startTime = Date.now();
  const debugLogs: string[] = [];

  if (DEBUG_FLAG) {
    debugLogs.push(`Starting analysis with ${trajectory.length} trajectory points`);
  }

  // Step 1: Segment shots from trajectory
  const shots = segmentShots(trajectory, poseTimestamps);
  if (DEBUG_FLAG) {
    debugLogs.push(`Segmented into ${shots.length} shots`);
  }

  // Handle empty trajectory
  if (shots.length === 0) {
    logDebug('No shots detected, returning empty result');
    return {
      sessionId,
      rallyId: `rally-${Date.now()}`,
      shots: [],
      summary: {
        totalShots: 0,
        dominantPhase: 'neutral',
        averagePressure: 0.5,
        keyMoments: [],
      },
      metadata: {
        processedAt: new Date().toISOString(),
        engineVersion: ENGINE_VERSION,
        processingTimeMs: Date.now() - startTime,
        debugLogs: DEBUG_FLAG ? debugLogs : undefined,
      },
    };
  }

  // Step 2: Compute rally states for all shots
  const rallyStates = computeAllRallyStates(shots, opponentPositions);
  if (DEBUG_FLAG) {
    debugLogs.push(`Computed rally states: ${rallyStates.map(s => s.phase).join(', ')}`);
  }

  // Step 3: Extract features for all shots
  const features = extractAllShotFeatures(
    shots,
    rallyStates,
    opponentPositions,
    playerPositions
  );
  if (DEBUG_FLAG) {
    debugLogs.push(`Extracted features for ${features.length} shots`);
  }

  // Step 4: Generate per-shot analysis with recommendations
  const perShotAnalysis = generatePerShotAnalysis(shots, rallyStates, features);

  // Step 5: Build rally summary
  const summary = buildRallySummary(perShotAnalysis, rallyStates);

  // Build final result
  const result: RallyAnalysisResult = {
    sessionId,
    rallyId: `rally-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    shots: perShotAnalysis,
    summary,
    metadata: {
      processedAt: new Date().toISOString(),
      engineVersion: ENGINE_VERSION,
      processingTimeMs: Date.now() - startTime,
      debugLogs: DEBUG_FLAG ? debugLogs : undefined,
    },
  };

  logDebug('Rally analysis complete', {
    totalShots: summary.totalShots,
    dominantPhase: summary.dominantPhase,
    avgPressure: summary.averagePressure.toFixed(2),
    keyMoments: summary.keyMoments,
    processingTimeMs: result.metadata.processingTimeMs,
  });

  return result;
}

/**
 * Generate recommendations for a specific shot in context
 * Useful for real-time or interactive analysis
 */
export function generateRecommendationsForShot(
  trajectory: TrajectoryPoint[],
  shotIndex: number,
  opponentPosition?: { x: number; y: number }
): ShotRecommendation[] {
  // Segment trajectory
  const shots = segmentShots(trajectory);

  if (shotIndex < 0 || shotIndex >= shots.length) {
    logDebug(`Invalid shot index ${shotIndex}, returning empty recommendations`);
    return [];
  }

  // Compute state and features for specific shot
  const state = computeRallyState(shots, shotIndex, opponentPosition);
  const previousShot = shotIndex > 0 ? shots[shotIndex - 1] : undefined;
  const features = extractShotFeatures(
    shots[shotIndex],
    state,
    previousShot,
    opponentPosition ? [{ ...opponentPosition, timestamp: shots[shotIndex].startTime }] : undefined
  );

  return generateRecommendations(shots[shotIndex], features, state);
}

/**
 * Convert legacy trajectory format to analysis format
 * For backward compatibility with existing Strategy page
 */
export function convertLegacyTrajectory(
  originalTrajectory: TrajectoryPoint[],
  refinedTrajectory: TrajectoryPoint[]
): {
  trajectory: TrajectoryPoint[];
  legacyRecommendations: ShotRecommendation[];
} {
  // Use original trajectory for analysis
  const trajectory = originalTrajectory;

  // Convert refined trajectory to a single recommendation path
  const legacyPath: PathPoint[] = refinedTrajectory.map(p => ({
    x: p.x,
    y: p.y,
    z: 1.0, // Default height
  }));

  const legacyRecommendations: ShotRecommendation[] = [
    {
      id: 'legacy-optimal',
      shotType: 'clear',
      targetZone: 7,
      pathPolyline: legacyPath,
      score: 85,
      rationale: [
        {
          type: 'open_court',
          description: 'AI-suggested optimal placements',
          impact: 0.8,
        },
      ],
      confidence: 0.85,
    },
  ];

  return {
    trajectory,
    legacyRecommendations,
  };
}

/**
 * Get human-readable shot description
 */
export function getShotDescription(rec: ShotRecommendation): string {
  const zoneNames: Record<number, string> = {
    0: 'front-left',
    1: 'front-center',
    2: 'front-right',
    3: 'mid-left',
    4: 'mid-center',
    5: 'mid-right',
    6: 'back-left',
    7: 'back-center',
    8: 'back-right',
  };

  const shotTypeNames: Record<ShotType, string> = {
    clear: 'Clear',
    drop: 'Drop shot',
    smash: 'Smash',
    drive: 'Drive',
    net: 'Net shot',
    lift: 'Lift',
    serve: 'Serve',
    push: 'Push',
    unknown: 'Shot',
  };

  const zoneName = zoneNames[rec.targetZone] ?? 'court';
  const shotName = shotTypeNames[rec.shotType] ?? 'Shot';

  return `${shotName} to ${zoneName} (${rec.score}% confidence)`;
}
