# 🧪 Verification Guide - Test All Fixes

## Quick Test (2 minutes)

### Step 1: Start Backend
```bash
cd backend
python main.py
```

**Expected Output:**
```
✓ Supabase initialized with SERVICE_ROLE key (RLS bypass enabled)
Starting Badminton Coach API...
Supabase configured: True
Gemini API configured: True
INFO:     Uvicorn running on http://0.0.0.0:8000
```

❌ **If you see:** `✗ SUPABASE_SERVICE_KEY not configured`
- Your `.env` file is missing `SUPABASE_SERVICE_KEY`
- Copy from backend `.env.example` and add your actual service role key

---

### Step 2: Test with cURL
```bash
# In a new terminal:
curl http://localhost:8000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "supabase_connected": true,
  "gemini_api_key": true
}
```

---

### Step 3: Upload Test Video

1. Start frontend: `cd frontend && npm run dev`
2. Open browser: http://localhost:5173
3. Upload a badminton video
4. Watch backend terminal logs:

**Expected Logs:**
```
Video saved: temp/input_Badminton.mp4
Analysis complete: 96 shots detected
Annotated video created: temp/annotated_Badminton.mp4
Video uploaded to Supabase: https://....supabase.co/storage/v1/object/public/videos/...
✓ Database insert successful: Record ID = <uuid>
✓ Sending response with video URL: https://...
✓ Shots detected: 96
✓ Feedback generated: True
```

❌ **If you see Gemini API errors:**
- Check error message for model name
- Should be `gemini-2.0-flash-exp`, not `gemini-1.5-flash`
- If still old model, file might not have saved - check `backend/gemini_client.py:47`

❌ **If database insert fails:**
- Check error type in logs
- If "PGRST204" or "column not found": Schema issue (should be fixed)
- If "RLS" error: Check `SUPABASE_SERVICE_KEY` is set correctly

---

### Step 4: Check Results Page

**Should See:**
- ✅ Video player with controls
- ✅ Video plays (not black screen)
- ✅ Colored skeleton overlay (green/red lines on player's body)
- ✅ Shot type labels appear (e.g., "SHOT: Net Shot")
- ✅ "Shots Detected" list on the right
- ✅ "Gemini Coach Report" with feedback

**Should NOT See:**
- ❌ Black video player
- ❌ "Video URL not available" warning
- ❌ "Video failed to load" error
- ❌ No skeleton overlay

---

## Detailed Verification Checklist

### ✅ 1. Gemini API Fixed
- [ ] Backend logs show analysis complete with shot count
- [ ] No "404" or "model not found" errors
- [ ] Frontend shows "Technique Analysis" text
- [ ] Frontend shows "Training Plan" bullet points
- [ ] Backend logs show: `✓ Feedback generated: True`

**Test Command:**
```bash
# Check the model name in the file:
grep "gemini-2.0-flash-exp" backend/gemini_client.py
# Should return: GEMINI_API_URL = "https://...gemini-2.0-flash-exp:generateContent"
```

---

### ✅ 2. Supabase Database Fixed
- [ ] Backend uses SERVICE_ROLE key (see startup logs)
- [ ] Database insert successful (no errors)
- [ ] Can see records in Supabase dashboard

**Test in Supabase Dashboard:**
1. Go to: https://supabase.com/dashboard/project/_/editor
2. Select `analysis_results` table
3. Should see new rows after each upload
4. Click on `result_json` column - should see JSON with:
   - `video_url`
   - `shot_count`
   - `shots` array
   - `feedback` object
   - `language`

**Test Command:**
```bash
# Verify SERVICE_KEY is in .env (don't print it!)
grep -c "SUPABASE_SERVICE_KEY=" backend/.env
# Should return: 1
```

---

### ✅ 3. Video Playback Fixed
- [ ] Video URL appears in response
- [ ] Video loads and plays in browser
- [ ] No console errors about video loading
- [ ] Can see skeleton overlay on video

**Test in Browser Console (F12):**
```javascript
// After uploading video, check console for:
"Video URL: http://localhost:8000/temp/annotated_Badminton.mp4"
"✓ Video loaded successfully"
```

**Manual File Check:**
```bash
# Check if annotated video exists:
ls backend/temp/annotated_*.mp4
# Should list video file(s)

# Test video directly:
curl -I http://localhost:8000/temp/annotated_Badminton.mp4
# Should return: HTTP/1.1 200 OK
# Content-Type: video/mp4
```

---

### ✅ 4. Skeleton Overlay Fixed
- [ ] Video shows colored lines (skeleton) on player
- [ ] Green lines = good form
- [ ] Red lines = form errors
- [ ] Shot labels appear during shots

**Visual Check:**
1. Play video in results page
2. Look for colored stick figure on player's body
3. Lines should connect: shoulders → elbows → wrists, hips → knees → ankles

**If Overlay Missing:**
```bash
# Download video and open in VLC:
# If you see skeleton in VLC but NOT in browser → codec issue
# If you DON'T see skeleton in VLC → pose detection issue

# Check pose detection works:
grep "draw_skeleton_on_frame" backend/video_annotator.py
# Should find function call at line ~179
```

---

## 🐛 Troubleshooting

### Problem: "SUPABASE_SERVICE_KEY not configured"
**Solution:**
```bash
cd backend
# Make sure .env exists:
ls .env

# Should contain (with YOUR actual key):
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Problem: Database insert fails with "relation does not exist"
**Solution:**
```sql
-- Run in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id UUID REFERENCES video_metadata(id) ON DELETE CASCADE,
    result_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Problem: Video loads but no skeleton
**Solution:**
```bash
# Check if pose estimation is working:
cd backend
python -c "from pose_estimation import extract_pose_from_video; print('✓ Pose module OK')"

# If error, install mediapipe:
pip install mediapipe
```

### Problem: Video shows "Failed to load"
**Solution:**
```bash
# Check backend logs for the video URL
# Try accessing URL directly in browser
# If 404 → file not created
# If CORS error → already fixed, restart backend
# If codec error → video format issue (use VLC to verify)
```

---

## 📞 Support Checklist

**Before asking for help, provide:**
1. Backend startup logs (first 10 lines)
2. Backend analysis logs (from upload to response)
3. Browser console output (F12 → Console)
4. Screenshot of results page
5. Output of: `ls backend/temp/`
6. Output of: `curl -I http://localhost:8000/health`

---

## ✨ Success Criteria

**All fixes working = ALL of these are true:**

- [x] Backend starts with: `✓ Supabase initialized with SERVICE_ROLE key`
- [x] Upload succeeds with: `✓ Database insert successful`
- [x] Response includes: `✓ Feedback generated: True`
- [x] Video plays in browser (not black screen)
- [x] Skeleton overlay visible (colored lines)
- [x] Shots list shows on results page
- [x] Gemini feedback displays (technique + training plan)
- [x] No errors in backend logs
- [x] No errors in browser console

**If ALL checked → Everything working! 🎉**
