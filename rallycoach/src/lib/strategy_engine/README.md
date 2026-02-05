# Strategy Engine

A situation-aware rally analysis and tactical recommendation system for badminton.

## Overview

The Strategy Engine analyzes badminton rally trajectories to:

1. **Segment shots** - Detect decision points from trajectory data
2. **Compute rally state** - Determine phase (attack/neutral/defense), initiative, and pressure
3. **Extract features** - Analyze shot characteristics and court positions
4. **Generate recommendations** - Provide TOP-3 shot recommendations with rationale

## Quick Start

```typescript
import { analyzeRally } from '@/lib/strategy_engine';

// Analyze a rally trajectory
const result = analyzeRally(sessionId, trajectoryPoints);

// Access per-shot analysis
for (const shot of result.shots) {
  console.log(`Shot ${shot.shot.shotIndex}: ${shot.shot.type}`);
  console.log(`Phase: ${shot.features.rallyState.phase}`);
  console.log(`Pressure: ${shot.features.rallyState.pressure}`);

  // Get TOP-3 recommendations
  for (const rec of shot.recommendations) {
    console.log(`- ${rec.shotType} to zone ${rec.targetZone} (${rec.score}%)`);
  }
}
```

## Architecture

```
strategy_engine/
├── types.ts                    # Type definitions
├── constants.ts                # Court zones, thresholds, weights
├── shot-segmentation.ts        # Shot detection algorithm
├── rally-state-machine.ts      # Phase/pressure computation
├── feature-extraction.ts       # Per-shot feature extraction
├── scoring-engine.ts           # Recommendation scoring
├── recommendation-generator.ts # TOP-3 generation
├── index.ts                    # Public API exports
└── __tests__/                  # Unit tests
```

## Court Zone System

The court is divided into a 3x3 grid (9 zones):

```
Far side (opponent):
  6 | 7 | 8  (back - near opponent baseline)
  3 | 4 | 5  (mid)
  0 | 1 | 2  (front - near net)
---- NET ----
```

## Rally State Model

Each shot has an associated rally state:

```typescript
interface RallyState {
  phase: 'attack' | 'neutral' | 'defense';
  initiative: 'us' | 'them' | 'unknown';
  pressure: number;      // 0-1 (0 = low, 1 = high)
  openCourtZones: number[]; // Available target zones
}
```

### Phase Detection

- **Attack**: Player has initiative, can apply pressure (smash/drop shots)
- **Neutral**: Neither player has clear advantage
- **Defense**: Player is under pressure (lift/clear shots to reset)

### Pressure Calculation

Pressure is calculated from:
- Time pressure (fast exchanges)
- Position pressure (opponent close to net)
- Shot type pressure (receiving smash = high pressure)
- Court position (playing from deep = more pressure)

## Recommendation Scoring

Each recommendation is scored based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Movement Pressure | +20 | Forces opponent to move far/fast |
| Open Court | +25 | Targets undefended area |
| Risk Under Pressure | -15 | Penalty for risky shots when pressured |
| Angle Exposure | -10 | Penalty for exposing counter-attack angles |

## API Reference

### `analyzeRally(sessionId, trajectory, poseTimestamps?, opponentPositions?)`

Analyze a complete rally and generate per-shot recommendations.

**Parameters:**
- `sessionId: string` - Session identifier
- `trajectory: TrajectoryPoint[]` - Array of trajectory points
- `poseTimestamps?: number[]` - Optional pose timestamps for fusion
- `opponentPositions?: {x, y, timestamp}[]` - Optional opponent tracking data

**Returns:** `RallyAnalysisResult`

### `generateRecommendations(shot, features, rallyState)`

Generate TOP-3 recommendations for a single shot.

**Returns:** `ShotRecommendation[]` (exactly 3 items, sorted by score)

### `computeRallyState(shots, shotIndex, opponentPosition?)`

Compute the rally state at a specific shot.

**Returns:** `RallyState`

### `segmentShots(trajectory, poseTimestamps?)`

Segment trajectory into individual shots.

**Returns:** `ShotSegment[]`

## Database Schema

The engine stores data in three tables:

```sql
-- Rallies: Top-level rally container
CREATE TABLE rallies (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    rally_index INTEGER,
    dominant_phase TEXT,
    average_pressure NUMERIC
);

-- Shots: Individual shots with features
CREATE TABLE shots (
    id UUID PRIMARY KEY,
    rally_id UUID REFERENCES rallies(id),
    shot_index INTEGER,
    shot_type TEXT,
    features JSONB,
    rally_state JSONB
);

-- Recommendations: TOP-3 per shot
CREATE TABLE recommendations (
    id UUID PRIMARY KEY,
    shot_id UUID REFERENCES shots(id),
    rec_index INTEGER CHECK (0-2),
    shot_type TEXT,
    target_zone INTEGER,
    score INTEGER,
    rationale JSONB
);
```

## Running Tests

```bash
# Run all strategy engine tests
npm test -- --testPathPattern=strategy_engine

# Run specific test file
npm test -- shot-segmentation.test.ts
```

## Debug Mode

Enable debug logging by setting the environment variable:

```bash
NEXT_PUBLIC_STRATEGY_DEBUG=true
```

This will output detailed logs for:
- Shot segmentation decisions
- Rally state computations
- Recommendation scoring breakdowns

## Example: Analyzing a Rally

```typescript
import {
  analyzeRally,
  PHASE_COLORS,
  PHASE_NEXT_ACTION,
} from '@/lib/strategy_engine';

// Sample trajectory from video analysis
const trajectory = [
  { x: 0.5, y: 0.2, timestamp: 0 },
  { x: 0.5, y: 0.5, timestamp: 500 },
  { x: 0.3, y: 0.7, timestamp: 1000 },
  // ... more points
];

// Analyze
const result = analyzeRally('session-123', trajectory);

// Display summary
console.log(`Rally: ${result.summary.totalShots} shots`);
console.log(`Dominant phase: ${result.summary.dominantPhase}`);
console.log(`Average pressure: ${(result.summary.averagePressure * 100).toFixed(0)}%`);

// Display per-shot recommendations
result.shots.forEach((analysis, i) => {
  const state = analysis.features.rallyState;
  const nextAction = PHASE_NEXT_ACTION[state.phase];

  console.log(`\nShot ${i + 1}: ${analysis.shot.type}`);
  console.log(`State: ${state.phase} → ${nextAction}`);

  console.log('Recommendations:');
  analysis.recommendations.forEach((rec, j) => {
    console.log(`  ${j + 1}. ${rec.shotType} to zone ${rec.targetZone} (${rec.score}%)`);
    rec.rationale.forEach(r => {
      const sign = r.impact > 0 ? '+' : '';
      console.log(`     ${sign}${(r.impact * 100).toFixed(0)}% ${r.description}`);
    });
  });
});
```

## Integration with UI

The Strategy page uses the engine like this:

1. **Video Upload** → Trajectory extraction (mock or real)
2. **Analysis** → `analyzeRally()` processes trajectory
3. **Display** → Show rally state chip, shot timeline, recommendations
4. **Interaction** → Click shots to see context-specific recommendations

## Graceful Degradation

The engine handles missing data gracefully:

- **No pose data**: Uses trajectory-only segmentation
- **No opponent tracking**: Assumes corners are open
- **Short trajectories**: Returns empty result with default summary
- **Missing timestamps**: Uses sequential indices

## Performance Considerations

- Trajectory processing is O(n) where n = number of points
- Recommendations are memoized per shot
- Zone calculations use lookup tables
- All computations are synchronous (no async bottlenecks)

## Future Enhancements

- Integration with real video analysis (shuttle detection)
- Machine learning for shot type classification
- EPV (Expected Points Value) model training
- Opponent pattern recognition
- Historical data analysis for player tendencies
