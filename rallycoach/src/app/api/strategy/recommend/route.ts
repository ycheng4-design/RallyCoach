import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

/**
 * Strategy Recommendation API
 *
 * Input: Rally tracking data (shot sequence, player/opponent positions, timestamps)
 * Output: Tactical recommendations with trajectories
 *
 * This is a stub implementation that uses deterministic rules.
 * Replace with Gemini API call when ready.
 */

// Request schema
interface StrategyRecommendRequest {
  rallyId: string;
  shots: ShotData[];
  playerPositions?: PositionData[];
  opponentPositions?: PositionData[];
  matchContext?: {
    score?: string;
    gamePoint?: boolean;
    matchPoint?: boolean;
  };
}

interface ShotData {
  type: 'clear' | 'drop' | 'smash' | 'drive' | 'net' | 'serve' | 'lift' | 'unknown';
  timestamp: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  speed?: number;
}

interface PositionData {
  timestamp: number;
  x: number;
  y: number;
}

// Response schema
interface StrategyRecommendResponse {
  rallyId: string;
  context: {
    tags: string[];
    opponentWeaknesses: string[];
    notes: string;
  };
  recommendations: StrategyRecommendation[];
}

interface StrategyRecommendation {
  id: string;
  name: string;
  reason: string;
  confidence: number;
  jumpToVideoTimeSec?: number;
  trajectory2D: TrajectoryPoint[];
  trajectory3D: TrajectoryPoint[];
}

interface TrajectoryPoint {
  x: number;
  y: number;
  z?: number;
  t: number;
}

export async function POST(request: Request) {
  try {
    const body: StrategyRecommendRequest = await request.json();
    const { rallyId, shots, playerPositions, opponentPositions, matchContext } = body;

    if (!rallyId) {
      return NextResponse.json(
        { error: 'rallyId is required' },
        { status: 400 }
      );
    }

    // Analyze the rally to understand context
    const context = analyzeRallyContext(shots, opponentPositions);

    // Generate recommendations based on context
    const recommendations = generateRecommendations(
      shots,
      context,
      matchContext
    );

    const response: StrategyRecommendResponse = {
      rallyId,
      context,
      recommendations,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Strategy recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

/**
 * Analyze rally context to understand patterns and weaknesses
 */
function analyzeRallyContext(
  shots: ShotData[] = [],
  opponentPositions: PositionData[] = []
): StrategyRecommendResponse['context'] {
  const tags: string[] = [];
  const opponentWeaknesses: string[] = [];
  let notes = '';

  // Analyze shot patterns
  if (shots.length > 0) {
    const shotTypes = shots.map(s => s.type);
    const clearCount = shotTypes.filter(t => t === 'clear').length;
    const dropCount = shotTypes.filter(t => t === 'drop').length;
    const smashCount = shotTypes.filter(t => t === 'smash').length;
    const netCount = shotTypes.filter(t => t === 'net').length;

    // Tag the rally style
    if (clearCount > shots.length * 0.4) {
      tags.push('defensive-rally');
    }
    if (smashCount > 2) {
      tags.push('aggressive-rally');
    }
    if (netCount > shots.length * 0.3) {
      tags.push('net-battle');
    }
    if (dropCount > shots.length * 0.3) {
      tags.push('drop-focused');
    }

    // Analyze end positions for weaknesses
    const endPositions = shots.map(s => ({ x: s.endX, y: s.endY }));
    const avgEndX = endPositions.reduce((sum, p) => sum + p.x, 0) / endPositions.length;
    const avgEndY = endPositions.reduce((sum, p) => sum + p.y, 0) / endPositions.length;

    if (avgEndX < 0.4) {
      opponentWeaknesses.push('forehand-corner');
      notes += 'Opponent appears weaker on forehand side. ';
    }
    if (avgEndX > 0.6) {
      opponentWeaknesses.push('backhand-corner');
      notes += 'Opponent appears weaker on backhand side. ';
    }
    if (avgEndY > 0.7) {
      opponentWeaknesses.push('rear-court');
      notes += 'Opponent struggles with deep shots. ';
    }
    if (avgEndY < 0.3) {
      opponentWeaknesses.push('front-court');
      notes += 'Opponent late to front court. ';
    }
  }

  // Default context if no shots
  if (tags.length === 0) {
    tags.push('general-rally');
  }
  if (opponentWeaknesses.length === 0) {
    opponentWeaknesses.push('unknown');
  }
  if (!notes) {
    notes = 'Insufficient data for detailed analysis. General recommendations provided.';
  }

  return { tags, opponentWeaknesses, notes };
}

/**
 * Generate strategic recommendations based on rally context
 */
function generateRecommendations(
  shots: ShotData[] = [],
  context: StrategyRecommendResponse['context'],
  matchContext?: StrategyRecommendRequest['matchContext']
): StrategyRecommendation[] {
  const recommendations: StrategyRecommendation[] = [];

  // Recommendation 1: Deep Clear Strategy
  // Best when opponent has rear-court weakness
  const deepClearConfidence = context.opponentWeaknesses.includes('rear-court') ? 92 : 75;
  recommendations.push({
    id: 'deep-clear',
    name: 'Deep Clear Strategy',
    reason: context.opponentWeaknesses.includes('rear-court')
      ? 'Exploit opponent\'s weakness at the rear court with consistent deep clears to force weak returns.'
      : 'Push opponent to back court to create attacking opportunities from their weak lifts.',
    confidence: deepClearConfidence,
    jumpToVideoTimeSec: 2,
    trajectory2D: generateDeepClearTrajectory(),
    trajectory3D: generateDeepClearTrajectory3D(),
  });

  // Recommendation 2: Cross-Court Attack
  // Best when opponent has side weakness
  const crossCourtConfidence =
    context.opponentWeaknesses.includes('forehand-corner') ||
    context.opponentWeaknesses.includes('backhand-corner') ? 88 : 70;
  const targetSide = context.opponentWeaknesses.includes('backhand-corner') ? 'backhand' : 'forehand';
  recommendations.push({
    id: 'cross-court',
    name: 'Cross-Court Attack',
    reason: `Use sharp cross-court angles to target opponent's ${targetSide} side and create straight-line kill opportunities.`,
    confidence: crossCourtConfidence,
    jumpToVideoTimeSec: 4,
    trajectory2D: generateCrossCourtTrajectory(targetSide === 'backhand'),
    trajectory3D: generateCrossCourtTrajectory3D(targetSide === 'backhand'),
  });

  // Recommendation 3: Net Domination
  // Best when opponent has front-court weakness
  const netDominationConfidence = context.opponentWeaknesses.includes('front-court') ? 90 : 72;
  recommendations.push({
    id: 'net-domination',
    name: 'Net Domination',
    reason: context.opponentWeaknesses.includes('front-court')
      ? 'Opponent is slow to front court. Control the net with tight shots to force weak lifts.'
      : 'Take control of the rally by dominating the net area with deceptive tumbling shots.',
    confidence: netDominationConfidence,
    jumpToVideoTimeSec: 6,
    trajectory2D: generateNetDominationTrajectory(),
    trajectory3D: generateNetDominationTrajectory3D(),
  });

  // Recommendation 4: Smash and Follow (aggressive, for match/game point)
  if (matchContext?.gamePoint || matchContext?.matchPoint) {
    recommendations.push({
      id: 'smash-follow',
      name: 'Smash and Follow',
      reason: 'Critical point - apply maximum pressure with powerful smash followed by quick net cover.',
      confidence: 85,
      jumpToVideoTimeSec: 8,
      trajectory2D: generateSmashFollowTrajectory(),
      trajectory3D: generateSmashFollowTrajectory3D(),
    });
  }

  // Sort by confidence and return top 3
  return recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

// Trajectory generation helpers
function generateDeepClearTrajectory(): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  for (let i = 0; i < 8; i++) {
    const isEven = i % 2 === 0;
    points.push({
      x: isEven ? 0.7 : 0.3,
      y: isEven ? 0.1 : 0.9,
      t: i * 2,
    });
  }
  return points;
}

function generateDeepClearTrajectory3D(): TrajectoryPoint[] {
  return generateDeepClearTrajectory().map(p => ({ ...p, z: 0 }));
}

function generateCrossCourtTrajectory(toBackhand: boolean): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  for (let i = 0; i < 8; i++) {
    const isEven = i % 2 === 0;
    points.push({
      x: isEven ? (toBackhand ? 0.8 : 0.2) : (toBackhand ? 0.2 : 0.8),
      y: isEven ? 0.3 : 0.7,
      t: i * 2,
    });
  }
  return points;
}

function generateCrossCourtTrajectory3D(toBackhand: boolean): TrajectoryPoint[] {
  return generateCrossCourtTrajectory(toBackhand).map(p => ({ ...p, z: 0 }));
}

function generateNetDominationTrajectory(): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  for (let i = 0; i < 8; i++) {
    const isEven = i % 2 === 0;
    points.push({
      x: 0.3 + Math.random() * 0.4,
      y: isEven ? 0.25 : 0.55,
      t: i * 1.5, // Faster exchanges
    });
  }
  return points;
}

function generateNetDominationTrajectory3D(): TrajectoryPoint[] {
  return generateNetDominationTrajectory().map(p => ({ ...p, z: 0 }));
}

function generateSmashFollowTrajectory(): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  // Smash from rear
  points.push({ x: 0.5, y: 0.15, t: 0 });
  // Land steep at opponent
  points.push({ x: 0.6, y: 0.75, t: 1 });
  // Follow to net
  points.push({ x: 0.5, y: 0.35, t: 2 });
  // Net kill
  points.push({ x: 0.4, y: 0.55, t: 3 });
  // Winner
  points.push({ x: 0.7, y: 0.8, t: 4 });
  return points;
}

function generateSmashFollowTrajectory3D(): TrajectoryPoint[] {
  return generateSmashFollowTrajectory().map(p => ({ ...p, z: 0 }));
}
