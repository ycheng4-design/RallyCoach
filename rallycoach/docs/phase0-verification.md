# Phase 0 - Video Ingest + Playback Verification

## Changes Made

### 1. TUS Resumable Uploads (`src/lib/supabase.ts`)

- Added `tus-js-client` dependency for resumable uploads
- Files > 6MB automatically use TUS protocol with chunked upload
- Files < 6MB use standard upload for speed
- Progress callback support for UI feedback
- Proper error handling with user-friendly messages
- Added helper functions:
  - `uploadVideo()` - Main upload function with auto-selection of upload method
  - `getSignedVideoUrl()` - For private bucket access
  - `videoExists()` - Check if video exists in storage
  - `uploadThumbnail()` - For player thumbnails (Phase 2 prep)

### 2. Analytics Page Error Handling (`src/app/analytics/page.tsx`)

- `saveAnalysisToDatabase()` now returns success/error status
- Upload errors are properly surfaced to UI
- Sessions are NOT created if upload fails (critical fix)
- Progress tracking during upload (60-95% of progress bar)
- File size limit increased to 100MB (TUS handles large files)

### 3. Strategy Page Error Handling (`src/app/strategy/page.tsx`)

- Same upload error handling as analytics
- Sessions only created after successful upload
- Progress tracking for large file uploads
- Clear error messages for upload failures

### 4. History Detail Page Video Playback (`src/app/history/[sessionId]/page.tsx`)

- Added `loadVideoUrl()` helper to try multiple URL approaches:
  1. First tries stored public URL
  2. Falls back to signed URL if public fails
  3. Shows clear error if video unavailable
- Added loading state while video URL is being resolved
- Added `onError` handler for video element
- Added proper `<source>` elements with MIME types for better codec detection
- Clear "Video Unavailable" UI with explanation

## Verification Checklist

### Pre-requisites
- [ ] Supabase project has `videos` bucket created
- [ ] Bucket policy allows authenticated uploads
- [ ] Environment variables set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Test 1: Small File Upload (< 6MB)
1. Go to Analytics page
2. Upload a video file < 6MB
3. Expected: Upload succeeds, session created, video plays in history
4. Check console for: "Using standard upload for..."

### Test 2: Large File Upload (> 6MB)
1. Go to Analytics page
2. Upload a video file > 6MB (but < 100MB)
3. Expected: Upload succeeds with progress, session created
4. Check console for: "Using TUS resumable upload for..."

### Test 3: Upload Failure Handling
1. Temporarily disable network or use invalid credentials
2. Try to upload a video
3. Expected: Error message shown, NO session created

### Test 4: History Video Playback
1. Upload a video successfully
2. Go to History page
3. Click on the session to view details
4. Expected: Video plays with skeleton overlay

### Test 5: Missing Video Handling
1. Find a session with missing/deleted video
2. Go to History detail page
3. Expected: "Video Unavailable" message with explanation

### Test 6: Strategy Mode Upload
1. Go to Strategy page
2. Upload a new video
3. Expected: Upload succeeds, analysis runs, results show

## Files Changed

| File | Changes |
|------|---------|
| `src/lib/supabase.ts` | TUS upload, signed URLs, helpers |
| `src/app/analytics/page.tsx` | Upload error handling, progress |
| `src/app/strategy/page.tsx` | Upload error handling, progress |
| `src/app/history/[sessionId]/page.tsx` | Video playback fixes |
| `src/app/history/page.tsx` | Minor TypeScript fix |
| `package.json` | Added tus-js-client |

## Console Logs to Verify

```
// Successful small upload
"Using standard upload for video.mp4 (2.50MB)"

// Successful large upload
"Using TUS resumable upload for video.mp4 (25.00MB)"
"TUS upload completed: user123/1234567890-video.mp4"

// History page video loading
"Video uploaded successfully: user123/1234567890-video.mp4"
"Public URL: https://..."
```

## Rollback Instructions

If issues occur:
1. Remove tus-js-client: `npm uninstall tus-js-client`
2. Revert supabase.ts to use only standard upload
3. Revert error handling changes in analytics/strategy pages
