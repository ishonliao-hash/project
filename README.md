# AI Film Editor

An AI-powered film editing tool. Upload your scenes, describe your vision in plain English, and let Claude AI craft an edit plan for you — while you keep full creative control.

## Features

- **Scene Upload** — Drag & drop video clips (MP4, MOV, AVI, MKV, WebM)
- **Natural Language Vision** — Describe your desired film in plain text
- **AI Edit Planning** — Claude Opus 4.6 with adaptive thinking analyzes your scenes and generates a complete Edit Decision List (EDL) with:
  - Scene ordering for narrative flow
  - In/out points for each clip
  - Transition types (cut, dissolve, fade, wipe)
  - Editorial reasoning for each decision
- **Visual Timeline** — Drag-and-drop to reorder clips manually
- **Manual Override** — Edit any clip's trim points and transitions
- **AI Reasoning Panel** — See Claude's thinking behind the edit decisions
- **Export** — Render the final video with FFmpeg

## Architecture

```
backend/          FastAPI + Python
  main.py         App entry point
  models/         Pydantic schemas
  services/
    ai_editor.py  Claude API integration (streaming + adaptive thinking)
    video_processor.py  FFmpeg wrapper (thumbnails, metadata, export)
    storage.py    JSON-based persistence
  routers/
    projects.py   Project CRUD
    scenes.py     Scene upload/management
    editor.py     AI edit generation + SSE streaming
    export.py     Async video export jobs

frontend/         React + TypeScript + Vite
  src/
    App.tsx       Main layout
    components/
      Header.tsx
      ProjectSelector.tsx
      SceneUploader.tsx    Drag & drop upload
      SceneCard.tsx        Scene thumbnail + metadata
      DescriptionPanel.tsx Natural language input + AI generation
      Timeline.tsx         Drag-and-drop edit timeline
      AIReasoningPanel.tsx Claude's editorial reasoning
      ExportPanel.tsx      Export controls
    api/client.ts  Axios API client
    types/         TypeScript types
```

## Setup

### Requirements
- Python 3.11+
- Node.js 18+
- FFmpeg (for video processing)
- Anthropic API key

### Install & Run

```bash
# Set your API key
export ANTHROPIC_API_KEY=your_key_here

# Start everything
chmod +x start.sh
./start.sh
```

Or manually:

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Workflow

1. **Create a project** — Give it a name in the left sidebar
2. **Describe your vision** — "A cinematic travel film, dramatic wide shots first, then intimate close-ups"
3. **Upload scenes** — Drag & drop your video files
4. **Generate edit plan** — Click "Generate Edit Plan" and watch Claude think through your footage
5. **Review & adjust** — Drag clips in the timeline, adjust transitions, trim in/out points
6. **Export** — Click "Export to MP4" to render the final video

## API Docs

Visit http://localhost:8000/docs for the interactive Swagger UI.
