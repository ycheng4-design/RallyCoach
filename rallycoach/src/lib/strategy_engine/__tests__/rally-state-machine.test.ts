/**
 * Rally State Machine Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  positionToZone,
  zoneToPosition,
  isAdjacentZone,
  findOpenCourtZones,
  computeRallyState,
  getDominantPhase,
  getAveragePressure,
  findKeyMoments,
} from '../rally-state-machine';
import type { ShotSegment, RallyState } from '../types';

// Helper to create mock shot segments
function createMockShot(
  index: number,
  type: string,
  startY: number = 0.3
): ShotSegment {
  return {
    shotIndex: index,
    type: type as any,
    startTime: index * 1000,
    endTime: (index + 1) * 1000,
    trajectorySlice: [
      { x: 0.5, y: startY, timestamp: index * 1000 },
      { x: 0.5, y: startY + 0.3, timestamp: (index + 1) * 1000 },
    ],
    player: startY < 0.5 ? 'near' : 'far',
  };
}

describe('Rally State Machine', () => {
  describe('positionToZone', () => {
    it('should return zone 0 for front-left position', () => {
      const zone = positionToZone(0.1, 0.55);
      expect(zone).toBe(0);
    });

    it('should return zone 1 for front-center position', () => {
      const zone = positionToZone(0.5, 0.55);
      expect(zone).toBe(1);
    });

    it('should return zone 2 for front-right position', () => {
      const zone = positionToZone(0.9, 0.55);
      expect(zone).toBe(2);
    });

    it('should return zone 4 for mid-center position', () => {
      const zone = positionToZone(0.5, 0.75);
      expect(zone).toBe(4);
    });

    it('should return zone 8 for back-right position', () => {
      const zone = positionToZone(0.9, 0.95);
      expect(zone).toBe(8);
    });

    it('should handle edge cases', () => {
      // Exactly at boundaries
      const zone = positionToZone(0.333, 0.667);
      expect(zone).toBeGreaterThanOrEqual(0);
      expect(zone).toBeLessThanOrEqual(8);
    });
  });

  describe('zoneToPosition', () => {
    it('should return center of zone 0', () => {
      const pos = zoneToPosition(0);
      expect(pos.x).toBeCloseTo(0.167, 1);
      expect(pos.y).toBeCloseTo(0.583, 1);
    });

    it('should return center of zone 4', () => {
      const pos = zoneToPosition(4);
      expect(pos.x).toBeCloseTo(0.5, 1);
      expect(pos.y).toBeCloseTo(0.75, 1);
    });

    it('should return center of zone 8', () => {
      const pos = zoneToPosition(8);
      expect(pos.x).toBeCloseTo(0.833, 1);
      expect(pos.y).toBeCloseTo(0.917, 1);
    });

    it('should return default for invalid zone', () => {
      const pos = zoneToPosition(-1);
      expect(pos.x).toBe(0.5);
      expect(pos.y).toBe(0.75);
    });
  });

  describe('isAdjacentZone', () => {
    it('should return true for same zone', () => {
      expect(isAdjacentZone(4, 4)).toBe(true);
    });

    it('should return true for horizontally adjacent zones', () => {
      expect(isAdjacentZone(0, 1)).toBe(true);
      expect(isAdjacentZone(1, 2)).toBe(true);
    });

    it('should return true for vertically adjacent zones', () => {
      expect(isAdjacentZone(1, 4)).toBe(true);
      expect(isAdjacentZone(4, 7)).toBe(true);
    });

    it('should return true for diagonally adjacent zones from center', () => {
      // Zone 4 (center) should be adjacent to all surrounding zones
      expect(isAdjacentZone(4, 0)).toBe(true);
      expect(isAdjacentZone(4, 8)).toBe(true);
    });

    it('should return false for non-adjacent zones', () => {
      expect(isAdjacentZone(0, 8)).toBe(false);
      expect(isAdjacentZone(2, 6)).toBe(false);
    });
  });

  describe('findOpenCourtZones', () => {
    it('should return corners when no opponent position', () => {
      const zones = findOpenCourtZones();
      expect(zones).toContain(0);
      expect(zones).toContain(2);
      expect(zones).toContain(6);
      expect(zones).toContain(8);
    });

    it('should exclude zones adjacent to opponent', () => {
      const opponentPos = { x: 0.5, y: 0.75 }; // Zone 4 (center)
      const zones = findOpenCourtZones(opponentPos);

      // Zone 4 and all adjacent zones should not be in open zones
      expect(zones).not.toContain(4);
    });

    it('should return far zones when opponent is in front', () => {
      const opponentPos = { x: 0.5, y: 0.55 }; // Zone 1 (front-center)
      const zones = findOpenCourtZones(opponentPos);

      // Back zones should be open
      expect(zones.some(z => z >= 6)).toBe(true);
    });
  });

  describe('computeRallyState', () => {
    it('should return default state for empty shots', () => {
      const state = computeRallyState([], 0);

      expect(state.phase).toBe('neutral');
      expect(state.initiative).toBe('unknown');
      expect(state.pressure).toBe(0.5);
      expect(state.openCourtZones).toHaveLength(4);
    });

    it('should return defense phase after receiving smash', () => {
      const shots: ShotSegment[] = [
        createMockShot(0, 'smash'),
        createMockShot(1, 'lift'),
      ];

      const state = computeRallyState(shots, 1);
      expect(state.phase).toBe('defense');
    });

    it('should return attack phase for attacking shots', () => {
      const shots: ShotSegment[] = [
        createMockShot(0, 'clear'),
        createMockShot(1, 'smash'),
        createMockShot(2, 'drop'),
      ];

      const state = computeRallyState(shots, 2);
      expect(['attack', 'neutral']).toContain(state.phase);
    });

    it('should calculate higher pressure under fast exchanges', () => {
      // Fast exchanges (short duration between shots)
      const fastShots: ShotSegment[] = [
        { ...createMockShot(0, 'drive'), startTime: 0, endTime: 200 },
        { ...createMockShot(1, 'drive'), startTime: 200, endTime: 400 },
        { ...createMockShot(2, 'drive'), startTime: 400, endTime: 600 },
      ];

      const slowShots: ShotSegment[] = [
        { ...createMockShot(0, 'clear'), startTime: 0, endTime: 2000 },
        { ...createMockShot(1, 'clear'), startTime: 2000, endTime: 4000 },
        { ...createMockShot(2, 'clear'), startTime: 4000, endTime: 6000 },
      ];

      const fastState = computeRallyState(fastShots, 2);
      const slowState = computeRallyState(slowShots, 2);

      expect(fastState.pressure).toBeGreaterThan(slowState.pressure);
    });

    it('should include open court zones', () => {
      const shots: ShotSegment[] = [
        createMockShot(0, 'clear'),
      ];

      const opponentPos = { x: 0.9, y: 0.9 }; // Back right
      const state = computeRallyState(shots, 0, opponentPos);

      // Front left should be open
      expect(state.openCourtZones).toContain(0);
    });
  });

  describe('getDominantPhase', () => {
    it('should return neutral for empty states', () => {
      expect(getDominantPhase([])).toBe('neutral');
    });

    it('should return attack when majority is attack', () => {
      const states: RallyState[] = [
        { phase: 'attack', initiative: 'us', pressure: 0.3, openCourtZones: [], timestamp: 0 },
        { phase: 'attack', initiative: 'us', pressure: 0.3, openCourtZones: [], timestamp: 1000 },
        { phase: 'neutral', initiative: 'unknown', pressure: 0.5, openCourtZones: [], timestamp: 2000 },
      ];

      expect(getDominantPhase(states)).toBe('attack');
    });

    it('should return defense when majority is defense', () => {
      const states: RallyState[] = [
        { phase: 'defense', initiative: 'them', pressure: 0.8, openCourtZones: [], timestamp: 0 },
        { phase: 'defense', initiative: 'them', pressure: 0.7, openCourtZones: [], timestamp: 1000 },
        { phase: 'attack', initiative: 'us', pressure: 0.3, openCourtZones: [], timestamp: 2000 },
      ];

      expect(getDominantPhase(states)).toBe('defense');
    });
  });

  describe('getAveragePressure', () => {
    it('should return 0.5 for empty states', () => {
      expect(getAveragePressure([])).toBe(0.5);
    });

    it('should calculate average correctly', () => {
      const states: RallyState[] = [
        { phase: 'neutral', initiative: 'unknown', pressure: 0.2, openCourtZones: [], timestamp: 0 },
        { phase: 'neutral', initiative: 'unknown', pressure: 0.4, openCourtZones: [], timestamp: 1000 },
        { phase: 'neutral', initiative: 'unknown', pressure: 0.6, openCourtZones: [], timestamp: 2000 },
      ];

      const avg = getAveragePressure(states);
      expect(avg).toBeCloseTo(0.4, 1);
    });
  });

  describe('findKeyMoments', () => {
    it('should return empty array for empty states', () => {
      expect(findKeyMoments([])).toHaveLength(0);
    });

    it('should find high pressure moments', () => {
      const states: RallyState[] = [
        { phase: 'neutral', initiative: 'unknown', pressure: 0.3, openCourtZones: [], timestamp: 0 },
        { phase: 'defense', initiative: 'them', pressure: 0.8, openCourtZones: [], timestamp: 1000 },
        { phase: 'neutral', initiative: 'unknown', pressure: 0.5, openCourtZones: [], timestamp: 2000 },
        { phase: 'defense', initiative: 'them', pressure: 0.9, openCourtZones: [], timestamp: 3000 },
      ];

      const moments = findKeyMoments(states, 0.7);
      expect(moments).toContain(1);
      expect(moments).toContain(3);
      expect(moments).not.toContain(0);
      expect(moments).not.toContain(2);
    });
  });
});
