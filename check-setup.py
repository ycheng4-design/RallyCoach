#!/usr/bin/env python
"""
Setup verification script for Badminton Analyzer
Checks if all required configurations are in place
"""

import os
import sys
from pathlib import Path

def check_file_exists(filepath, description):
    """Check if a file exists"""
    if os.path.exists(filepath):
        print(f"✓ {description}: Found")
        return True
    else:
        print(f"✗ {description}: Missing")
        return False

def check_env_file(filepath, required_keys):
    """Check if .env file has required keys configured"""
    if not os.path.exists(filepath):
        print(f"✗ {filepath}: File not found")
        return False

    with open(filepath, 'r') as f:
        content = f.read()

    all_configured = True
    for key in required_keys:
        if key in content:
            # Check if it has a placeholder value
            if f"{key}=your-" in content or f"{key}=https://your-project" in content:
                print(f"  ✗ {key}: Not configured (still has placeholder)")
                all_configured = False
            else:
                print(f"  ✓ {key}: Configured")
        else:
            print(f"  ✗ {key}: Missing")
            all_configured = False

    return all_configured

def main():
    print("=" * 60)
    print("Badminton Analyzer - Setup Verification")
    print("=" * 60)
    print()

    base_dir = Path(__file__).parent
    all_checks_passed = True

    # Check backend files
    print("Backend Files:")
    backend_files = [
        (base_dir / "backend" / "main.py", "main.py"),
        (base_dir / "backend" / "analysis.py", "analysis.py"),
        (base_dir / "backend" / "pose_estimation.py", "pose_estimation.py"),
        (base_dir / "backend" / "gemini_client.py", "gemini_client.py"),
        (base_dir / "backend" / "requirements.txt", "requirements.txt"),
    ]
    for filepath, desc in backend_files:
        if not check_file_exists(filepath, desc):
            all_checks_passed = False
    print()

    # Check frontend files
    print("Frontend Files:")
    frontend_files = [
        (base_dir / "frontend" / "package.json", "package.json"),
        (base_dir / "frontend" / "src" / "App.jsx", "App.jsx"),
        (base_dir / "frontend" / "src" / "pages" / "Login.jsx", "Login.jsx"),
        (base_dir / "frontend" / "src" / "pages" / "Upload.jsx", "Upload.jsx"),
        (base_dir / "frontend" / "src" / "pages" / "Results.jsx", "Results.jsx"),
    ]
    for filepath, desc in frontend_files:
        if not check_file_exists(filepath, desc):
            all_checks_passed = False
    print()

    # Check backend .env
    print("Backend Environment Variables (backend/.env):")
    backend_env = base_dir / "backend" / ".env"
    backend_keys = ["GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY"]
    if not check_env_file(backend_env, backend_keys):
        all_checks_passed = False
    print()

    # Check frontend .env
    print("Frontend Environment Variables (frontend/.env):")
    frontend_env = base_dir / "frontend" / ".env"
    frontend_keys = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_BACKEND_URL"]
    if not check_env_file(frontend_env, frontend_keys):
        all_checks_passed = False
    print()

    # Check Python packages
    print("Checking Python packages...")
    try:
        import cv2
        print("  ✓ opencv-python installed")
    except ImportError:
        print("  ✗ opencv-python not installed")
        all_checks_passed = False

    try:
        import mediapipe
        print("  ✓ mediapipe installed")
    except ImportError:
        print("  ✗ mediapipe not installed")
        all_checks_passed = False

    try:
        import fastapi
        print("  ✓ fastapi installed")
    except ImportError:
        print("  ✗ fastapi not installed")
        all_checks_passed = False

    print()

    # Check Node modules
    print("Checking Frontend Dependencies...")
    node_modules = base_dir / "frontend" / "node_modules"
    if node_modules.exists():
        print("  ✓ node_modules installed")
    else:
        print("  ✗ node_modules not installed (run 'npm install' in frontend/)")
        all_checks_passed = False
    print()

    # Final summary
    print("=" * 60)
    if all_checks_passed:
        print("✓ All checks passed! You're ready to run the app.")
        print()
        print("Next steps:")
        print("1. Start backend: Run start-backend.bat")
        print("2. Start frontend: Run start-frontend.bat")
        print("3. Open browser to http://localhost:5173")
    else:
        print("✗ Some checks failed. Please review the issues above.")
        print()
        print("Common fixes:")
        print("- Configure .env files with your actual API keys")
        print("- Run 'pip install -r requirements.txt' in backend/")
        print("- Run 'npm install' in frontend/")
        print("- See SETUP_GUIDE.md for detailed instructions")
    print("=" * 60)

if __name__ == "__main__":
    main()
