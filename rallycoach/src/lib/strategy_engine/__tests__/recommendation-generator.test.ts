/**
 * Recommendation Generator Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  generateRecommendations,
  generateShotPath,
  analyzeRally,
} from '../recommendation-generator';
import type { ShotSegment, ShotFeatures, RallyState } from '../types';
import type { TrajectoryPoint } from '../../types';

// Helper to create mock shot segment
function createMockShot(type: string = 'clear'): ShotSegment {
  return {
    shotIndex: 0,
    type: type as any,
    startTime: 0,
    endTime: 1000,
    trajectorySlice: [
      { x: 0.5, y: 0.3, timestamp: 0 },
      { x: 0.5, y: 0.7, timestamp: 1000 },
    ],
    player: 'near',
  };
}

// Helper to create mock features
function createMockFeatures(): ShotFeatures {
  return {
    contactZone: 4,
    landingZone: 7,
    shuttleSpeedProxy: 0.5,
    shuttleHeightProxy: 0.6,
    opponentMovementDistance: 0.4,
    opponentDirectionChange: Math.PI / 4,
    recoveryQuality: 0.3,
    rallyState: createMockRallyState('neutral'),
  };
}

// Helper to create mock rally state
function createMockRallyState(phase: string = 'neutral'): RallyState {
  return {
    phase: phase as any,
    initiative: 'unknown',
    pressure: 0.5,
    openCourtZones: [0, 2, 6, 8],
    timestamp: 0,
  };
}

describe('Recommendation Generator', () => {
  describe('generateRecommendations', () => {
    it('should always return exactly 3 recommendations', () => {
      const shot = createMockShot('clear');
      const features = createMockFeatures();
      const state = createMockRallyState('neutral');

      const recs = generateRecommendations(shot, features, state);

      expect(recs).toHaveLength(3);
    });

    it('should return recommendations sorted by score descending', () => {
      const shot = createMockShot('clear');
      const features = createMockFeatures();
      const state = createMockRallyState('attack');

      const recs = generateRecommendations(shot, features, state);

      // Verify sorted descending
      for (let i = 1; i < recs.length; i++) {
        expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score);
      }
    });

    it('should prioritize open court zones', () => {
      const shot = createMockShot('drop');
      const features = createMockFeatures();
      const state = createMockRallyState('attack');
      state.openCourtZones = [0, 2]; // Front corners

      const recs = generateRecommendations(shot, features, state);

      // At least one recommendation should target an open zone
      const targetsOpenZone = recs.some(r =>
        state.openCourtZones.includes(r.targetZone)
      );
      expect(targetsOpenZone).toBe(true);
    });

    it('should include rationale for each recommendation', () => {
      const shot = createMockShot('smash');
      const features = createMockFeatures();
      const state = createMockRallyState('attack');

      const recs = generateRecommendations(shot, features, state);

      for (const rec of recs) {
        expect(rec.rationale).toBeDefined();
        expect(Array.isArray(rec.rationale)).toBe(true);
      }
    });

    it('should have valid score range (0-100)', () => {
      const shot = createMockShot('clear');
      const features = createMockFeatures();
      const state = createMockRallyState('neutral');

      const recs = generateRecommendations(shot, features, state);

      for (const rec of recs) {
        expect(rec.score).toBeGreaterThanOrEqual(0);
        expect(rec.score).toBeLessThanOrEqual(100);
      }
    });

    it('should have valid confidence range (0-1)', () => {
      const shot = createMockShot('clear');
      const features = createMockFeatures();
      const state = createMockRallyState('neutral');

      const recs = generateRecommendations(shot, features, state);

      for (const rec of recs) {
        expect(rec.confidence).toBeGreaterThanOrEqual(0);
        expect(rec.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should generate path polyline for each recommendation', () => {
      const shot = createMockShot('drop');
      const features = createMockFeatures();
      const state = createMockRallyState('attack');

      const recs = generateRecommendations(shot, features, state);

      for (const rec of recs) {
        expect(rec.pathPolyline).toBeDefined();
        expect(rec.pathPolyline.length).toBeGreaterThan(0);
        // Each point should have x, y coordinates
        for (const point of rec.pathPolyline) {
          expect(point.x).toBeDefined();
          expect(point.y).toBeDefined();
        }
      }
    });

    it('should recommend safer shots under high pressure', () => {
      const shot = createMockShot('lift');
      const features = createMockFeatures();

      // High pressure state (defense)
      const highPressureState = createMockRallyState('defense');
      highPressureState.pressure = 0.9;

      // Low pressure state (attack)
      const lowPressureState = createMockRallyState('attack');
      lowPressureState.pressure = 0.2;

      const highPressureRecs = generateRecommendations(shot, features, highPressureState);
      const lowPressureRecs = generateRecommendations(shot, features, lowPressureState);

      // Under high pressure, smash should score lower than clear/lift
      const highPressureSmash = highPressureRecs.find(r => r.shotType === 'smash');
      const highPressureClear = highPressureRecs.find(r => r.shotType === 'clear' || r.shotType === 'lift');

      if (highPressureSmash && highPressureClear) {
        expect(highPressureClear.score).toBeGreaterThanOrEqual(highPressureSmash.score);
      }
    });
  });

  describe('generateShotPath', () => {
    it('should generate valid path points', () => {
      const contactPoint = { x: 0.5, y: 0.3 };
      const targetZone = 7; // back-center

      const path = generateShotPath(contactPoint, targetZone, 'clear');

      expect(path.length).toBeGreaterThan(0);

      // First point should be near contact point
      expect(path[0].x).toBeCloseTo(contactPoint.x, 1);
      expect(path[0].y).toBeCloseTo(contactPoint.y, 1);

      // All points should have valid coordinates
      for (const point of path) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(1);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(1);
      }
    });

    it('should include height data for 3D rendering', () => {
      const contactPoint = { x: 0.5, y: 0.3 };
      const path = generateShotPath(contactPoint, 7, 'clear');

      // Should have z coordinate for height
      for (const point of path) {
        expect(point.z).toBeDefined();
        expect(point.z).toBeGreaterThanOrEqual(0);
      }
    });

    it('should generate higher arc for clears', () => {
      const contactPoint = { x: 0.5, y: 0.3 };

      const clearPath = generateShotPath(contactPoint, 7, 'clear');
      const drivePath = generateShotPath(contactPoint, 7, 'drive');

      // Get max height
      const clearMaxHeight = Math.max(...clearPath.map(p => p.z || 0));
      const driveMaxHeight = Math.max(...drivePath.map(p => p.z || 0));

      expect(clearMaxHeight).toBeGreaterThan(driveMaxHeight);
    });
  });

  describe('analyzeRally', () => {
    it('should return valid result for valid trajectory', () => {
      const sessionId = 'test-session';
      const trajectory: TrajectoryPoint[] = [
        { x: 0.5, y: 0.2, timestamp: 0 },
        { x: 0.5, y: 0.4, timestamp: 500 },
        { x: 0.4, y: 0.6, timestamp: 1000 },
        { x: 0.6, y: 0.8, timestamp: 1500 },
        { x: 0.5, y: 0.3, timestamp: 2000 },
      ];

      const result = analyzeRally(sessionId, trajectory);

      expect(result.sessionId).toBe(sessionId);
      expect(result.rallyId).toBeDefined();
      expect(result.shots).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should return empty result for empty trajectory', () => {
      const result = analyzeRally('test', []);

      expect(result.shots).toHaveLength(0);
      expect(result.summary.totalShots).toBe(0);
    });

    it('should include metadata with engine version', () => {
      const trajectory: TrajectoryPoint[] = [
        { x: 0.5, y: 0.2, timestamp: 0 },
        { x: 0.5, y: 0.6, timestamp: 1000 },
        { x: 0.5, y: 0.9, timestamp: 2000 },
      ];

      const result = analyzeRally('test', trajectory);

      expect(result.metadata.engineVersion).toBeDefined();
      expect(result.metadata.processedAt).toBeDefined();
    });

    it('should calculate summary statistics', () => {
      const trajectory: TrajectoryPoint[] = [
        { x: 0.5, y: 0.2, timestamp: 0 },
        { x: 0.5, y: 0.5, timestamp: 500 },
        { x: 0.3, y: 0.7, timestamp: 1000 },
        { x: 0.7, y: 0.3, timestamp: 1500 },
        { x: 0.5, y: 0.8, timestamp: 2000 },
      ];

      const result = analyzeRally('test', trajectory);

      expect(result.summary.totalShots).toBeGreaterThanOrEqual(0);
      expect(['attack', 'neutral', 'defense']).toContain(result.summary.dominantPhase);
      expect(result.summary.averagePressure).toBeGreaterThanOrEqual(0);
      expect(result.summary.averagePressure).toBeLessThanOrEqual(1);
    });

    it('should generate 3 recommendations per shot', () => {
      const trajectory: TrajectoryPoint[] = [
        { x: 0.5, y: 0.2, timestamp: 0 },
        { x: 0.5, y: 0.5, timestamp: 1000 },
        { x: 0.5, y: 0.8, timestamp: 2000 },
      ];

      const result = analyzeRally('test', trajectory);

      for (const shotAnalysis of result.shots) {
        expect(shotAnalysis.recommendations).toHaveLength(3);
      }
    });
  });
});
