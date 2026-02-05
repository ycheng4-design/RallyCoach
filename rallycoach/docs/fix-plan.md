# RallyCoach End-to-End Fix Plan

## Status: ALL PHASES COMPLETE

| Phase | Status | Description |
|-------|--------|-------------|
| 0 | ✅ COMPLETE | Video ingest + playback |
| 1 | ✅ COMPLETE | MediaPipe timestamp mismatch |
| 2 | ✅ COMPLETE | Real player thumbnails |
| 3 | ✅ COMPLETE | Analytics false positives |
| 4 | ✅ COMPLETE | Strategy playback + 3D view |

## Overview

This document outlines the comprehensive fix plan for RallyCoach, addressing video upload/playback issues, MediaPipe timestamp errors, player thumbnails, analytics scoring, and strategy visualization.

---

## PHASE 0 - Video Ingest + Playback (Unblocks History Review)

### Problem Statement

1. **Upload failures for large files**: Supabase Storage standard upload fails for files >6MB with "StorageApiError: The object exceeded the maximum allowed size"
2. **History "View Details" shows "No video available"**: Console shows upload failures but sessions are created anyway
3. **Strategy mode video shows 0:00/0:00**: NotSupportedError due to missing source type

### Root Cause Analysis

| File | Line | Issue |
|------|------|-------|
| `src/lib/supabase.ts` | 78-103 | Uses standard `upload()` instead of TUS resumable upload |
| `src/app/analytics/page.tsx` | 713-791 | Creates session even if upload fails |
| `src/app/strategy/page.tsx` | 151-222 | Same issue - session created on upload failure |
| `src/app/history/[sessionId]/page.tsx` | 536-538 | No fallback for missing/failed video URLs |

### Implementation Plan

#### 1. Implement TUS Resumable Uploads (`src/lib/supabase.ts`)

```typescript
// New function: uploadVideoResumable()
// - Uses @supabase/storage-js uploadToSignedUrl or tus-js-client
// - Chunk size: 5MB for files > 6MB
// - Progress callback for UI feedback
// - Returns { path, bucket } on success, throws on failure
```

#### 2. Fix Analytics Upload Error Handling (`src/app/analytics/page.tsx`)

- Wrap upload in try/catch
- Show user-friendly error message if upload fails
- Do NOT create session if upload fails
- Add progress indicator for large uploads

#### 3. Fix Strategy Upload Error Handling (`src/app/strategy/page.tsx`)

- Same fixes as analytics
- Proper error surfacing

#### 4. Fix History Video Playback (`src/app/history/[sessionId]/page.tsx`)

- Check if `video_url` exists and is valid
- Try to create signed URL for private buckets
- Show clear "Video unavailable (upload failed)" message
- Add `<source type="video/mp4">` for better codec detection

### Verification Checklist

- [ ] Upload demo.mp4 (< 6MB) - should succeed
- [ ] Upload large video (> 6MB) - should use resumable upload
- [ ] Check storage bucket for uploaded object
- [ ] History details page plays video correctly
- [ ] Failed uploads show clear error message
- [ ] No "ghost" sessions created for failed uploads

---

## PHASE 1 - Fix MediaPipe Timestamp Mismatch

### Problem Statement

Console errors:
- "Packet timestamp mismatch"
- "Timestamps not strictly monotonically increasing"
- "CalculatorGraph::Run() failed"
- "WaitUntilIdle failed"

### Root Cause

- `detectForVideo()` receives non-monotonic timestamps
- Video seeking can produce same timestamp twice
- `video.currentTime * 1000` may round to same value

### Implementation Plan

1. **Track last timestamp**: Keep `lastTimestampMs` reference
2. **Ensure monotonic**: `ts = Math.max(lastTimestampMs + 1, Math.floor(video.currentTime * 1000))`
3. **Use requestVideoFrameCallback**: When available, for precise timestamps
4. **Add low-confidence detection**: If pose results empty, mark as "low confidence"

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/analytics/page.tsx:238-334` | Add timestamp tracking in `processVideoWithPose()` |
| `src/app/practice/page.tsx` | Similar timestamp fixes if applicable |

---

## PHASE 2 - Real Player Thumbnails in "Select Yourself"

### Problem Statement

Player selection modal shows placeholder avatars instead of real cropped thumbnails.

### Implementation Plan

**Option B: Client-side approach (recommended for this codebase)**

1. Extract frame at 0.5s from uploaded video
2. Use existing MediaPipe numPoses=4 to detect persons
3. Crop thumbnails from bounding boxes
4. Store thumbnails in Supabase Storage
5. Update `PlayerTrackData.thumbnail_url`

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/analytics/page.tsx:408-472` | Enhance `detectPlayerTracks()` to capture thumbnails |
| `src/components/PlayerSelectionModal.tsx` | Display real thumbnails instead of placeholders |
| `src/lib/supabase.ts` | Add `uploadThumbnail()` function |

---

## PHASE 3 - Fix Analytics "Great Form!" False Positives

### Problem Statement

- Shows "Great form!" when pose detection has low confidence
- No validation of pose coverage ratio
- Too lenient scoring thresholds

### Implementation Plan

1. **Add pose coverage check**:
   ```typescript
   if (validPoseFrameRatio < 0.7 || avgConfidence < 0.5) {
     return { band: 'unknown', message: 'Insufficient pose data' };
   }
   ```

2. **Tighten scoring rules**:
   - Stance width check (ankles vs shoulders)
   - Knee bend depth check (minimum angle)
   - Shoulder rotation timing check

3. **Add persistence check**: Require deviations across N frames

4. **Add debug panel** (dev-only): Show pose coverage %, confidence, triggered rules

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/scoring-rules.ts` | Add confidence gating, coverage check |
| `src/app/history/[sessionId]/page.tsx:606-610` | Update "Great form!" condition |
| `src/app/analytics/page.tsx:1240-1244` | Same update |

---

## PHASE 4 - Strategy Playback Speed + 3D View

### Problem Statement

1. 2D trajectory animation is too fast
2. No 3D visualization mode
3. Strategy sessions don't store/replay videos

### Implementation Plan

#### 1. Animation Speed Control

Add speed selector: 0.25x, 0.5x, 1x, 2x with play/pause/step controls

#### 2. 3D Toggle with React Three Fiber

```typescript
// New component: CourtTrajectory3D
// - Court plane mesh
// - Net geometry
// - Ball following trajectory curve
// - Pseudo-3D height based on shot type
```

#### 3. Strategy Video in History

- Ensure strategy sessions save `video_path` and `video_url`
- History detail page handles strategy type

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/strategy/page.tsx:593-800` | Add speed control, 3D toggle |
| New: `src/components/CourtTrajectory3D.tsx` | React Three Fiber 3D court |
| `package.json` | Add @react-three/fiber, @react-three/drei |

---

## Deliverables Per Phase

| Phase | PR/Commit | Files Changed |
|-------|-----------|---------------|
| 0 | `fix/video-upload-playback` | supabase.ts, analytics/page.tsx, strategy/page.tsx, history/[sessionId]/page.tsx |
| 1 | `fix/mediapipe-timestamps` | analytics/page.tsx, practice/page.tsx |
| 2 | `feat/player-thumbnails` | analytics/page.tsx, PlayerSelectionModal.tsx |
| 3 | `fix/scoring-false-positives` | scoring-rules.ts, history pages |
| 4 | `feat/strategy-3d-playback` | strategy/page.tsx, CourtTrajectory3D.tsx |

---

## Security Notes

- NO service role key in client code
- Use anon key + RLS policies
- Signed URLs for private bucket access
- Validate file types on upload

---

## Testing Approach

Each phase includes:
1. Unit-ish checks in code (console.log for debugging)
2. Manual verification steps
3. Screenshots/GIFs in PR description
