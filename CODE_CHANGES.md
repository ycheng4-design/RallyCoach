# 📝 Exact Code Changes - Copy/Paste Reference

## File 1: `backend/gemini_client.py`

**Line 47 - CHANGE:**
```python
# OLD:
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

# NEW:
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"
```

---

## File 2: `backend/analysis.py`

**Lines 40-43 - CHANGE:**
```python
# OLD:
result = {
    "shots": shot_events,
    "feedback": feedback
}

# NEW:
result = {
    "shots": shot_events,
    "gemini_feedback": feedback
}
```

---

## File 3: `backend/main.py`

### Change 1: Imports (Lines 3-7)
```python
# OLD:
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from supabase import create_client

# NEW:
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from dotenv import load_dotenv
from supabase import create_client
```

### Change 2: Supabase Initialization (Lines 27-43)
```python
# OLD:
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase = None
if SUPABASE_URL and SUPABASE_URL != "https://your-project.supabase.co":
    key = SUPABASE_SERVICE_KEY if SUPABASE_SERVICE_KEY and SUPABASE_SERVICE_KEY != "your-service-role-key" else SUPABASE_ANON_KEY
    if key:
        supabase = create_client(SUPABASE_URL, key)

# NEW:
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Create Supabase client with SERVICE_ROLE key for backend operations
# This bypasses RLS and allows database writes without authentication
supabase = None
if SUPABASE_URL and SUPABASE_URL != "https://your-project.supabase.co":
    if SUPABASE_SERVICE_KEY and SUPABASE_SERVICE_KEY != "your-service-role-key":
        try:
            supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
            print("✓ Supabase initialized with SERVICE_ROLE key (RLS bypass enabled)")
        except Exception as e:
            print(f"✗ Supabase initialization failed: {e}")
    else:
        print("✗ SUPABASE_SERVICE_KEY not configured - database writes will fail")
```

### Change 3: ADD New Endpoint (After line 56, before @app.post("/api/analyze"))
```python
# ADD THIS NEW ENDPOINT:
@app.get("/temp/{filename}")
async def serve_temp_video(filename: str):
    """Serve annotated videos from temp directory for local playback"""
    file_path = f"temp/{filename}"
    if os.path.exists(file_path):
        return FileResponse(
            file_path,
            media_type="video/mp4",
            headers={
                "Accept-Ranges": "bytes",
                "Cache-Control": "no-cache"
            }
        )
    raise HTTPException(status_code=404, detail="Video not found")
```

### Change 4: Database Insert Logic (Lines 119-142)
```python
# OLD:
# Save analysis to database (optional, may fail due to RLS)
try:
    supabase.table("analysis_results").insert({
        "user_id": None,
        "video_id": None,
        "result_json": {
            "video_url": annotated_video_url,
            "shot_count": len(analysis_result.get('shots', [])),
            "shots": analysis_result.get('shots', []),
            "feedback": analysis_result.get('gemini_feedback', {}),
            "language": language
        }
    }).execute()
except Exception as db_error:
    print(f"Database insert skipped (RLS requires authentication): {db_error}")
    # Continue anyway - video upload succeeded

# NEW:
# Save analysis to database (SERVICE_ROLE bypasses RLS)
try:
    db_payload = {
        "result_json": {
            "user_id": user_id,
            "video_url": annotated_video_url,
            "shot_count": len(analysis_result.get('shots', [])),
            "shots": analysis_result.get('shots', []),
            "feedback": analysis_result.get('gemini_feedback', {}),
            "language": language
        }
    }

    db_response = supabase.table("analysis_results").insert(db_payload).execute()
    print(f"✓ Database insert successful: Record ID = {db_response.data[0]['id'] if db_response.data else 'N/A'}")

except Exception as db_error:
    # Log detailed error for debugging
    print(f"✗ Database insert failed:")
    print(f"  Error type: {type(db_error).__name__}")
    print(f"  Error message: {str(db_error)}")
    if hasattr(db_error, 'message'):
        print(f"  Details: {db_error.message}")
    # Continue anyway - video upload succeeded
```

### Change 5: Response Logging (Lines 167-179)
```python
# OLD:
response = {
    "shots": analysis_result.get('shots', []),
    "gemini_feedback": analysis_result.get('gemini_feedback', ''),
    "annotated_video_url": annotated_video_url,
    "pose_data": [pose if pose else {} for pose in pose_data[:100]],
    "total_shots": len(analysis_result.get('shots', []))
}

return JSONResponse(content=response)

# NEW:
response = {
    "shots": analysis_result.get('shots', []),
    "gemini_feedback": analysis_result.get('gemini_feedback', ''),
    "annotated_video_url": annotated_video_url,
    "pose_data": [pose if pose else {} for pose in pose_data[:100]],
    "total_shots": len(analysis_result.get('shots', []))
}

print(f"✓ Sending response with video URL: {annotated_video_url}")
print(f"✓ Shots detected: {len(analysis_result.get('shots', []))}")
print(f"✓ Feedback generated: {bool(analysis_result.get('gemini_feedback'))}")

return JSONResponse(content=response)
```

---

## File 4: `frontend/src/pages/ResultsEnhanced.jsx`

### Change 1: Data Access (Lines 8-12)
```jsx
// OLD:
const data = location.state?.analysis || {}
const { shots, feedback, annotated_video_url } = data

// NEW:
const data = location.state?.analysis || {}
const { shots, gemini_feedback, annotated_video_url } = data
// Use gemini_feedback if available, otherwise fallback to feedback (for backwards compatibility)
const feedback = gemini_feedback || data.feedback || {}
```

### Change 2: State & Debugging (Lines 14-22)
```jsx
// OLD:
const videoRef = useRef(null)
const [currentFrame, setCurrentFrame] = useState(0)
const [showGhost, setShowGhost] = useState(false)

// NEW:
const videoRef = useRef(null)
const [currentFrame, setCurrentFrame] = useState(0)
const [showGhost, setShowGhost] = useState(false)
const [videoError, setVideoError] = useState(null)

// Debug: Log video URL
console.log('Video URL:', annotated_video_url)
console.log('Shots count:', shots?.length)
console.log('Feedback:', feedback)
```

### Change 3: Video Section (Lines 63-93)
```jsx
// OLD:
<div style={styles.card}>
  <h2 style={styles.sectionTitle}>AI Coach Vision</h2>
  <div style={styles.videoContainer}>
    <video
      ref={videoRef}
      src={annotated_video_url}
      controls
      style={styles.video}
      onTimeUpdate={handleTimeUpdate}
    />

// NEW:
<div style={styles.card}>
  <h2 style={styles.sectionTitle}>📹 Annotated Video Playback</h2>
  <p style={{color: '#888', fontSize: '0.9rem', marginBottom: '10px'}}>
    Watch your performance with real-time skeleton overlay and shot markers
  </p>
  {!annotated_video_url && (
    <div style={{padding: '20px', backgroundColor: '#ff000020', borderRadius: '8px', marginBottom: '10px'}}>
      ⚠️ Video URL not available. Check backend logs.
    </div>
  )}
  {videoError && (
    <div style={{padding: '20px', backgroundColor: '#ff000020', borderRadius: '8px', marginBottom: '10px'}}>
      ⚠️ Video failed to load: {videoError}
    </div>
  )}
  <div style={styles.videoContainer}>
    <video
      ref={videoRef}
      src={annotated_video_url}
      controls
      style={styles.video}
      onTimeUpdate={handleTimeUpdate}
      onError={(e) => {
        console.error('Video error:', e)
        setVideoError('Failed to load video. Check if file exists and server is running.')
      }}
      onLoadedMetadata={() => {
        console.log('✓ Video loaded successfully')
        setVideoError(null)
      }}
    />
```

---

## File 5: `backend/.env.example` (NEW FILE - Create this)

```bash
# Backend Environment Variables
# Copy this file to .env and fill in your actual values

# Gemini API Configuration
# Get your API key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key-here

# Supabase Configuration
# Get these from: https://supabase.com/dashboard/project/_/settings/api
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# IMPORTANT: SERVICE_ROLE key is SECRET - NEVER commit this or expose to frontend
# This key bypasses Row Level Security (RLS) and should ONLY be used in backend
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

---

## File 6: `frontend/.env.example` (NEW FILE - Create this)

```bash
# Frontend Environment Variables
# Copy this file to .env and fill in your actual values

# Supabase Configuration
# Get these from: https://supabase.com/dashboard/project/_/settings/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Backend API URL
VITE_BACKEND_URL=http://localhost:8000

# NOTE: NEVER put SUPABASE_SERVICE_KEY in frontend .env
# Service role keys should ONLY exist in backend environment
```

---

## Verification: Files to Check

After applying all changes, verify these files were modified:

```bash
# Backend files:
✓ backend/gemini_client.py      (1 change - line 47)
✓ backend/analysis.py           (1 change - line 42)
✓ backend/main.py               (5 changes - see above)
✓ backend/.env.example          (NEW FILE)

# Frontend files:
✓ frontend/src/pages/ResultsEnhanced.jsx  (3 changes - see above)
✓ frontend/.env.example                   (NEW FILE)

# Config files (already existed):
✓ .gitignore                    (Already contains .env - no change needed)
```

---

## Quick Apply Commands

```bash
# If you want to verify changes without manually editing:

# Check Gemini model name:
grep -n "gemini-2.0-flash-exp" backend/gemini_client.py

# Check analysis.py key name:
grep -n "gemini_feedback" backend/analysis.py

# Check main.py has SERVICE_ROLE:
grep -n "SUPABASE_SERVICE_KEY" backend/main.py | head -5

# Check main.py has video endpoint:
grep -n "serve_temp_video" backend/main.py

# Check frontend has gemini_feedback:
grep -n "gemini_feedback" frontend/src/pages/ResultsEnhanced.jsx

# Check .env.example files exist:
ls backend/.env.example
ls frontend/.env.example
```

---

## Done! 🎉

All code changes documented. Apply them in order, restart backend, and test!
