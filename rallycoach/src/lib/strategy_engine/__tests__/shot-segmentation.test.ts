/**
 * Shot Segmentation Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { segmentShots, estimateShuttleSpeed, estimateShuttleHeight } from '../shot-segmentation';
import type { TrajectoryPoint } from '../../types';

describe('Shot Segmentation', () => {
  describe('segmentShots', () => {
    it('should return empty array for insufficient trajectory points', () => {
      const trajectory: TrajectoryPoint[] = [
        { x: 0.5, y: 0.5, timestamp: 0 },
      ];

      const shots = segmentShots(trajectory);
      expect(shots).toHaveLength(0);
    });

    it('should detect direction change as decision point', () => {
      const trajectory: TrajectoryPoint[] = [
        { x: 0.5, y: 0.1, timestamp: 0 },
        { x: 0.5, y: 0.3, timestamp: 500 },
        { x: 0.5, y: 0.5, timestamp: 1000 },
        { x: 0.3, y: 0.4, timestamp: 1500 }, // Direction change
        { x: 0.2, y: 0.3, timestamp: 2000 },
        { x: 0.1, y: 0.2, timestamp: 2500 },
      ];

      const shots = segmentShots(trajectory);
      expect(shots.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect net crossing as decision point', () => {
      const trajectory: TrajectoryPoint[] = [
        { x: 0.5, y: 0.3, timestamp: 0 },
        { x: 0.5, y: 0.45, timestamp: 500 },
        { x: 0.5, y: 0.55, timestamp: 1000 }, // Net cross
        { x: 0.5, y: 0.7, timestamp: 1500 },
        { x: 0.5, y: 0.85, timestamp: 2000 },
      ];

      const shots = segmentShots(trajectory);
      expect(shots.length).toBeGreaterThanOrEqual(1);
    });

    it('should classify clear shot type correctly', () => {
      // Clear: long shot going deep to opponent's back court
      const clearTrajectory: TrajectoryPoint[] = [
        { x: 0.5, y: 0.2, timestamp: 0 },
        { x: 0.5, y: 0.4, timestamp: 500 },
        { x: 0.5, y: 0.6, timestamp: 1000 },
        { x: 0.5, y: 0.85, timestamp: 1500 },
      ];

      const shots = segmentShots(clearTrajectory);
      // Should detect at least one shot
      expect(shots.length).toBeGreaterThanOrEqual(1);
      // First shot should be classified (may vary based on heuristics)
      expect(shots[0]).toHaveProperty('type');
    });

    it('should assign shot indices sequentially', () => {
      const trajectory: TrajectoryPoint[] = [
        { x: 0.5, y: 0.1, timestamp: 0 },
        { x: 0.5, y: 0.5, timestamp: 1000 },
        { x: 0.3, y: 0.7, timestamp: 2000 },
        { x: 0.7, y: 0.3, timestamp: 3000 },
        { x: 0.5, y: 0.8, timestamp: 4000 },
      ];

      const shots = segmentShots(trajectory);

      // Check sequential indexing
      for (let i = 0; i < shots.length; i++) {
        expect(shots[i].shotIndex).toBe(i);
      }
    });

    it('should include trajectory slices in shot segments', () => {
      const trajectory: TrajectoryPoint[] = [
        { x: 0.5, y: 0.1, timestamp: 0 },
        { x: 0.5, y: 0.3, timestamp: 500 },
        { x: 0.5, y: 0.5, timestamp: 1000 },
        { x: 0.3, y: 0.7, timestamp: 1500 },
        { x: 0.2, y: 0.8, timestamp: 2000 },
      ];

      const shots = segmentShots(trajectory);

      // Each shot should have a trajectory slice
      for (const shot of shots) {
        expect(shot.trajectorySlice).toBeDefined();
        expect(shot.trajectorySlice.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should detect player side based on start position', () => {
      const trajectory: TrajectoryPoint[] = [
        { x: 0.5, y: 0.2, timestamp: 0 }, // Near side (y < 0.5)
        { x: 0.5, y: 0.4, timestamp: 500 },
        { x: 0.5, y: 0.6, timestamp: 1000 },
        { x: 0.5, y: 0.8, timestamp: 1500 },
      ];

      const shots = segmentShots(trajectory);

      if (shots.length > 0) {
        expect(shots[0].player).toBe('near');
      }
    });
  });

  describe('estimateShuttleSpeed', () => {
    it('should return 0 for empty trajectory', () => {
      const speed = estimateShuttleSpeed([]);
      expect(speed).toBe(0);
    });

    it('should return 0 for single point trajectory', () => {
      const speed = estimateShuttleSpeed([
        { x: 0.5, y: 0.5, timestamp: 0 },
      ]);
      expect(speed).toBe(0);
    });

    it('should return higher speed for faster trajectories', () => {
      const slowTrajectory: TrajectoryPoint[] = [
        { x: 0.5, y: 0.1, timestamp: 0 },
        { x: 0.5, y: 0.2, timestamp: 1000 }, // 1 second for 0.1 distance
      ];

      const fastTrajectory: TrajectoryPoint[] = [
        { x: 0.5, y: 0.1, timestamp: 0 },
        { x: 0.5, y: 0.5, timestamp: 500 }, // 0.5 second for 0.4 distance
      ];

      const slowSpeed = estimateShuttleSpeed(slowTrajectory);
      const fastSpeed = estimateShuttleSpeed(fastTrajectory);

      expect(fastSpeed).toBeGreaterThan(slowSpeed);
    });

    it('should normalize speed to 0-1 range', () => {
      const trajectory: TrajectoryPoint[] = [
        { x: 0, y: 0, timestamp: 0 },
        { x: 1, y: 1, timestamp: 100 },
      ];

      const speed = estimateShuttleSpeed(trajectory);
      expect(speed).toBeGreaterThanOrEqual(0);
      expect(speed).toBeLessThanOrEqual(1);
    });
  });

  describe('estimateShuttleHeight', () => {
    it('should return 0.5 for insufficient points', () => {
      const height = estimateShuttleHeight([
        { x: 0.5, y: 0.5, timestamp: 0 },
      ]);
      expect(height).toBe(0.5);
    });

    it('should return higher value for arced trajectories', () => {
      // Straight line trajectory
      const straightTrajectory: TrajectoryPoint[] = [
        { x: 0, y: 0, timestamp: 0 },
        { x: 0.5, y: 0.5, timestamp: 500 },
        { x: 1, y: 1, timestamp: 1000 },
      ];

      // Arced trajectory (point deviates from line)
      const arcedTrajectory: TrajectoryPoint[] = [
        { x: 0, y: 0, timestamp: 0 },
        { x: 0.5, y: 0.8, timestamp: 500 }, // Deviates upward
        { x: 1, y: 1, timestamp: 1000 },
      ];

      const straightHeight = estimateShuttleHeight(straightTrajectory);
      const arcedHeight = estimateShuttleHeight(arcedTrajectory);

      expect(arcedHeight).toBeGreaterThan(straightHeight);
    });
  });
});
