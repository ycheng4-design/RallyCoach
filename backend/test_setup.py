#!/usr/bin/env python
"""
Quick test script to verify backend dependencies
"""

print("Testing backend setup...")
print()

# Test imports
try:
    import cv2
    print("✓ OpenCV imported successfully")
    print(f"  Version: {cv2.__version__}")
except ImportError as e:
    print(f"✗ Failed to import OpenCV: {e}")

try:
    import mediapipe as mp
    print("✓ MediaPipe imported successfully")
    print(f"  Version: {mp.__version__}")
except ImportError as e:
    print(f"✗ Failed to import MediaPipe: {e}")

try:
    import fastapi
    print("✓ FastAPI imported successfully")
    print(f"  Version: {fastapi.__version__}")
except ImportError as e:
    print(f"✗ Failed to import FastAPI: {e}")

try:
    from google import genai
    print("✓ Google GenAI imported successfully")
except ImportError as e:
    print(f"✗ Failed to import Google GenAI: {e}")

try:
    from supabase import create_client
    print("✓ Supabase client imported successfully")
except ImportError as e:
    print(f"✗ Failed to import Supabase: {e}")

print()
print("If all imports succeeded, your backend is ready!")
print("Run 'python main.py' to start the server.")
