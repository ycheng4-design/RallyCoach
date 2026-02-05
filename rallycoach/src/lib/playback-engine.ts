/**
 * PlaybackEngine - Shared animation state management using refs
 * This prevents re-mounting of animation loops when speed/view changes
 */

export type TimeScale = 0.25 | 0.5 | 1 | 2;
export type ActiveView = '2d' | '3d';

export interface PlaybackState {
  playing: boolean;
  timeScale: TimeScale;
  t: number; // normalized time 0-1
  activeView: ActiveView;
}

export interface PlaybackEngineRefs {
  playingRef: { current: boolean };
  timeScaleRef: { current: TimeScale };
  tRef: { current: number };
  activeViewRef: { current: ActiveView };
  lastTimestampRef: { current: number };
}

/**
 * Creates a playback engine with refs for animation state
 * Use this in components to avoid re-creating animation loops on state changes
 */
export function createPlaybackEngine(): PlaybackEngineRefs {
  return {
    playingRef: { current: true },
    timeScaleRef: { current: 1 },
    tRef: { current: 0 },
    activeViewRef: { current: '2d' },
    lastTimestampRef: { current: 0 },
  };
}

/**
 * Get the current state snapshot from refs
 */
export function getPlaybackState(engine: PlaybackEngineRefs): PlaybackState {
  return {
    playing: engine.playingRef.current,
    timeScale: engine.timeScaleRef.current,
    t: engine.tRef.current,
    activeView: engine.activeViewRef.current,
  };
}

/**
 * Update time using delta time and timeScale
 * @param engine - The playback engine refs
 * @param timestamp - Current RAF timestamp in ms
 * @returns The new normalized time (0-1)
 */
export function updatePlaybackTime(
  engine: PlaybackEngineRefs,
  timestamp: number
): number {
  if (!engine.playingRef.current) {
    engine.lastTimestampRef.current = timestamp;
    return engine.tRef.current;
  }

  // Calculate delta time in seconds
  const lastTimestamp = engine.lastTimestampRef.current || timestamp;
  const dt = (timestamp - lastTimestamp) / 1000;
  engine.lastTimestampRef.current = timestamp;

  // Update time with timeScale
  // Base animation is 10 seconds for full loop, so increment is dt/10
  const increment = (dt * engine.timeScaleRef.current) / 10;
  engine.tRef.current += increment;

  // Loop back to 0 when reaching 1
  if (engine.tRef.current >= 1) {
    engine.tRef.current = 0;
  }

  return engine.tRef.current;
}

/**
 * PlaybackEngine methods
 */
export const PlaybackEngine = {
  play(engine: PlaybackEngineRefs): void {
    engine.playingRef.current = true;
  },

  pause(engine: PlaybackEngineRefs): void {
    engine.playingRef.current = false;
  },

  toggle(engine: PlaybackEngineRefs): boolean {
    engine.playingRef.current = !engine.playingRef.current;
    return engine.playingRef.current;
  },

  reset(engine: PlaybackEngineRefs): void {
    engine.tRef.current = 0;
    engine.lastTimestampRef.current = 0;
  },

  setSpeed(engine: PlaybackEngineRefs, speed: TimeScale): void {
    engine.timeScaleRef.current = speed;
  },

  setActiveView(engine: PlaybackEngineRefs, view: ActiveView): void {
    engine.activeViewRef.current = view;
  },

  step(engine: PlaybackEngineRefs, delta: number): void {
    engine.tRef.current = Math.max(0, Math.min(1, engine.tRef.current + delta));
  },
};
