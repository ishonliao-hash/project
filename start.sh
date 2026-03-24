#!/bin/bash
# AI Film Editor — Start Script

set -e

echo "=== AI Film Editor ==="
echo ""

# Check for ANTHROPIC_API_KEY
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "⚠️  WARNING: ANTHROPIC_API_KEY is not set."
  echo "   Set it with: export ANTHROPIC_API_KEY=your_key_here"
  echo ""
fi

# Check for FFmpeg
if command -v ffmpeg &> /dev/null; then
  echo "✓ FFmpeg found: $(ffmpeg -version 2>&1 | head -1)"
else
  echo "⚠️  FFmpeg not found. Video export will be disabled."
  echo "   Install with: apt install ffmpeg (Ubuntu) or brew install ffmpeg (macOS)"
fi
echo ""

# Start backend
echo "Starting backend (FastAPI) on port 8000..."
cd backend
pip install -q -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Wait for backend to be ready
sleep 2

# Start frontend
echo ""
echo "Starting frontend (Vite) on port 5173..."
cd ../frontend
npm install --silent
npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "=== Ready ==="
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait and clean up
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
