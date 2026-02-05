# Quick Setup Guide

Follow these steps to get the Badminton Analyzer running:

## Step 1: Configure API Keys

### Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for project to be ready (2-3 minutes)
3. Go to **Settings** → **API**
4. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)
   - **service_role key** (another long string, keep secret!)

### Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with Google account
3. Click **"Create API Key"**
4. Copy the generated key

## Step 2: Set Up Supabase Database

1. Open your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file `supabase-setup.sql` in this project
5. Copy ALL the SQL code and paste into the query editor
6. Click **Run** to execute
7. You should see "Success. No rows returned"

## Step 3: Create Storage Bucket

1. In Supabase dashboard, click **Storage** in sidebar
2. Click **"New bucket"**
3. Name it: `videos`
4. Make it **Private** (uncheck "Public bucket")
5. Click **Create bucket**

## Step 4: Configure Environment Variables

### Backend (.env)

1. Open `backend/.env` in a text editor
2. Replace placeholder values:

```env
GEMINI_API_KEY=your-actual-gemini-key-from-step-1
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Save the file

### Frontend (.env)

1. Open `frontend/.env` in a text editor
2. Replace placeholder values:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_BACKEND_URL=http://localhost:8000
```

3. Save the file

## Step 5: Install Python Dependencies

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate    # Windows
# OR
source venv/bin/activate  # Mac/Linux

# Install packages
pip install -r requirements.txt
```

**Note:** This will take 2-3 minutes. MediaPipe and OpenCV are large packages.

## Step 6: Install Frontend Dependencies

Open a **new terminal** (keep backend terminal open):

```bash
cd frontend

npm install
```

This takes about 30 seconds.

## Step 7: Run the Application

### Terminal 1 - Backend:

```bash
cd backend
venv\Scripts\activate    # Windows (if not already activated)
python main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### Terminal 2 - Frontend:

```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

## Step 8: Test the Application

1. Open browser to `http://localhost:5173`
2. Click **"Sign Up"**
3. Enter email and password
4. You should be redirected to Upload page
5. Click **"Choose File"** and select a video (any video works for testing)
6. Click **"Upload & Analyze"**
7. Wait for analysis (30-60 seconds)
8. View results!

## Common Issues

### "Connection refused" error
- Make sure backend is running on port 8000
- Check if another program is using port 8000

### "Invalid API key" error
- Double-check your Gemini API key in `backend/.env`
- Make sure there are no extra spaces

### "Supabase error" / "Authentication failed"
- Verify Supabase URL and keys are correct
- Check if SQL setup completed successfully
- Make sure auth is enabled (Settings → Authentication → Email provider should be ON)

### "No module named 'mediapipe'"
- Make sure venv is activated (you should see `(venv)` in terminal)
- Run `pip install -r requirements.txt` again

### Video analysis fails
- Check if video file is valid (MP4, MOV work best)
- Look at backend terminal for error messages
- Try with a shorter video first (<30 seconds)

## Verification Checklist

Before testing, verify:

- [ ] Supabase project created and SQL executed
- [ ] Storage bucket "videos" created (private)
- [ ] Gemini API key obtained
- [ ] `backend/.env` filled with real values
- [ ] `frontend/.env` filled with real values
- [ ] Backend dependencies installed (`pip list` shows mediapipe, fastapi, etc.)
- [ ] Frontend dependencies installed (`node_modules` folder exists)
- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:5173
- [ ] Can access http://localhost:8000/health in browser (shows status)

## Next Steps

Once everything works:

1. Try uploading different badminton videos
2. Experiment with the analysis results
3. Adjust detection thresholds in `backend/analysis.py` if needed
4. Customize feedback prompts in `backend/gemini_client.py`

## Need Help?

Check:
- Backend terminal for error logs
- Browser console (F12) for frontend errors
- Supabase dashboard → Database → Table Editor to verify data
- Supabase dashboard → Authentication → Users to see registered users

Good luck! 🏸
