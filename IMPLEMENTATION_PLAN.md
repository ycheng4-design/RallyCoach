# RallyCoach Upgrade Implementation Plan

## Overview
This document outlines the complete implementation plan for upgrading the RallyCoach badminton coaching web app with skeleton overlay, drill keyframes, timestamp navigation, history mode, and dashboard charts.

---

## A. Skeleton Overlay + Red/Green Feedback

### A1. Practice Mode (Webcam)
**Files to modify:**
- `frontend/src/pages/LivePractice.jsx` - Add live skeleton overlay
- `frontend/src/lib/poseDetection.js` (NEW) - MediaPipe Pose Landmarker setup
- `frontend/src/lib/rulesEngine.js` (NEW) - Form scoring rules
- `frontend/src/lib/skeletonRenderer.js` (NEW) - Canvas drawing utilities

**Implementation:**
1. Initialize MediaPipe Pose Landmarker from `@mediapipe/tasks-vision`
2. Run pose detection on each webcam frame via `requestAnimationFrame`
3. Compute form score using rules engine (elbow angle, stance width, etc.)
4. Draw skeleton on canvas overlay with color based on score (green/red)
5. Update live stats (Green Frames / Red Frames / Green Ratio)
6. Show "Current Metrics" panel with live values

### A2. Analytics Mode (Uploaded Video)
**Files to modify:**
- `frontend/src/pages/ResultsEnhanced.jsx` → rename to `Analytics.jsx`
- Add canvas overlay synced to video playback
- Use pose data from backend response

**Implementation:**
1. Receive `pose_data` array from backend (landmarks per frame)
2. Create canvas overlay positioned over video
3. Use `requestVideoFrameCallback` (or timeupdate fallback) to sync overlay
4. Draw skeleton at correct frame landmarks
5. Color based on current frame's pass/fail status

---

## B. Drill Keyframe Animations + Drill Cards

### B1. Keyframe Generator
**Files to create:**
- `frontend/src/lib/keyframeGenerator.js` - SVG skeleton renderer

**Implementation:**
1. Create SVG renderer that takes landmarks and outputs stick-figure skeleton
2. Each drill has 3 keyframes: Setup, Contact, Follow-through
3. Emphasize relevant body parts with thicker lines
4. Store ideal pose templates per drill type

### B2. Drill Cards
**Files to create:**
- `frontend/src/components/DrillCard.jsx` - Reusable drill card component

**Implementation:**
1. Each issue gets a DrillCard with:
   - Severity badge (low/medium/high)
   - 3-frame keyframe slideshow/carousel
   - Step-by-step drill instructions
   - "Practice this drill" button
2. Different keyframes per issue type

---

## C. Click-to-Jump Timestamps

**Files to modify:**
- `frontend/src/pages/Analytics.jsx`
- `backend/main.py` - Return violation timestamps

**Implementation:**
1. Backend computes per-frame rule violations with timestamps
2. Frontend displays clickable timestamp chips per issue
3. Clicking timestamp sets `video.currentTime = t`
4. Auto-pause and highlight overlay state
5. "Next mistake" button cycles through violations

---

## D. History Mode

### D1. Database Schema
**Files to create:**
- `supabase-migration-v2.sql` - New tables

**Tables:**
- `sessions` - id, user_id, created_at, type, video_path, overall_score, summary
- `issues` - id, session_id, code, title, severity, description, drill, keyframes
- `events` - id, session_id, t, code, value, passed
- `practice_stats` - id, user_id, session_id, green_frames, red_frames, etc.

### D2. History Page
**Files to create:**
- `frontend/src/pages/History.jsx`

**Implementation:**
1. Add "History" to sidebar/navigation
2. List sessions in reverse chronological order
3. Each row shows: date, filename, score, top issues
4. Click to open session in Analytics view
5. RLS policies for user-only access

---

## E. Dashboard Charts

**Files to modify:**
- `frontend/src/pages/Dashboard.jsx`

**Implementation:**
1. Add charts section above video list
2. Query aggregated data from sessions/events tables
3. Charts:
   - Technique score trend (line chart)
   - Top recurring issues (bar chart)
   - Practice green ratio over time (line chart)
   - Total sessions count

---

## File Structure (New/Modified)

```
frontend/src/
├── lib/
│   ├── poseDetection.js    (NEW) - MediaPipe setup
│   ├── rulesEngine.js      (NEW) - Form rules
│   ├── skeletonRenderer.js (NEW) - Canvas drawing
│   └── keyframeGenerator.js(NEW) - SVG keyframes
├── components/
│   ├── DrillCard.jsx       (NEW)
│   ├── KeyframeCarousel.jsx(NEW)
│   ├── TimestampChip.jsx   (NEW)
│   └── StatsChart.jsx      (NEW)
├── pages/
│   ├── Analytics.jsx       (RENAMED from ResultsEnhanced.jsx)
│   ├── History.jsx         (NEW)
│   ├── LivePractice.jsx    (MODIFIED)
│   └── Dashboard.jsx       (MODIFIED)
└── App.jsx                 (MODIFIED - add routes)

backend/
├── main.py                 (MODIFIED - new endpoints)
├── rules_engine.py         (NEW) - Form rules
└── pose_estimation.py      (MODIFIED - add per-frame scoring)

SQL/
└── supabase-migration-v2.sql (NEW)
```

---

## Implementation Order

1. **Phase 1: Foundation**
   - Supabase migration scripts
   - Shared pose detection module (frontend)
   - Rules engine (shared logic)
   - Skeleton renderer

2. **Phase 2: Practice Mode**
   - Live skeleton overlay
   - Real-time stats
   - Current metrics panel

3. **Phase 3: Analytics Mode**
   - Video overlay sync
   - Timestamp chips
   - Issue cards with keyframes

4. **Phase 4: History & Dashboard**
   - History page
   - Dashboard charts
   - Data aggregation

5. **Phase 5: Polish**
   - Tests
   - Performance optimization
   - Error handling

---

## Technical Notes

### MediaPipe Pose Landmarker (Frontend)
```javascript
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

const poseLandmarker = await PoseLandmarker.createFromOptions(
  await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  ),
  {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
    },
    runningMode: "VIDEO",
    numPoses: 1
  }
)
```

### Form Rules (Example)
```javascript
const rules = {
  ELBOW_EXTENSION: {
    compute: (landmarks) => calcAngle(shoulder, elbow, wrist),
    threshold: { min: 160, max: 180 },
    severity: 'high',
    drill: 'elbow-extension-drill'
  },
  // ...more rules
}
```

### Skeleton Drawing
```javascript
const POSE_CONNECTIONS = [
  [11, 12], // shoulders
  [11, 13], [13, 15], // left arm
  [12, 14], [14, 16], // right arm
  [11, 23], [12, 24], // torso
  [23, 24], // hips
  [23, 25], [25, 27], // left leg
  [24, 26], [26, 28], // right leg
]
```
