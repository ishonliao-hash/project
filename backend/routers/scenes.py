"""Scene upload and management endpoints."""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
import shutil
import uuid
import os
from pathlib import Path
from models.schemas import Scene, SceneMetadata, SceneUpdate
from services import storage, video_processor

router = APIRouter(prefix="/scenes", tags=["scenes"])

UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
THUMBNAILS_DIR = Path(__file__).parent.parent / "thumbnails"
ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".mts"}


@router.post("/upload")
async def upload_scene(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    shot_type: str = Form(default=""),
    location: str = Form(default=""),
    notes: str = Form(default=""),
):
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Save file with unique name
    scene_id = str(uuid.uuid4())
    safe_filename = f"{scene_id}{ext}"
    file_path = UPLOADS_DIR / safe_filename

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Get video info
    info = video_processor.get_video_info(str(file_path))

    # Generate thumbnail
    thumbnail_filename = f"{scene_id}.jpg"
    thumbnail_path = THUMBNAILS_DIR / thumbnail_filename
    video_processor.generate_thumbnail(str(file_path), str(thumbnail_path))

    # Create scene
    scene = Scene(
        id=scene_id,
        project_id=project_id,
        filename=safe_filename,
        original_filename=file.filename,
        duration=info.get("duration", 0.0),
        width=info.get("width"),
        height=info.get("height"),
        fps=info.get("fps"),
        thumbnail=thumbnail_filename if os.path.exists(thumbnail_path) else None,
        metadata=SceneMetadata(
            shot_type=shot_type or None,
            location=location or None,
            notes=notes or None,
        )
    )

    storage.add_scene_to_project(project_id, scene)
    return scene


@router.get("/{project_id}/{scene_id}", response_model=Scene)
async def get_scene(project_id: str, scene_id: str):
    scene = storage.get_scene(project_id, scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scene


@router.patch("/{project_id}/{scene_id}", response_model=Scene)
async def update_scene(project_id: str, scene_id: str, data: SceneUpdate):
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for i, scene in enumerate(project.scenes):
        if scene.id == scene_id:
            if data.metadata:
                project.scenes[i].metadata = data.metadata
            storage.save_project(project)
            return project.scenes[i]
    raise HTTPException(status_code=404, detail="Scene not found")


@router.delete("/{project_id}/{scene_id}")
async def delete_scene(project_id: str, scene_id: str):
    scene = storage.get_scene(project_id, scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    # Clean up files
    file_path = UPLOADS_DIR / scene.filename
    if file_path.exists():
        file_path.unlink()
    if scene.thumbnail:
        thumb_path = THUMBNAILS_DIR / scene.thumbnail
        if thumb_path.exists():
            thumb_path.unlink()

    storage.remove_scene_from_project(project_id, scene_id)
    return {"message": "Scene deleted"}


@router.get("/thumbnail/{filename}")
async def get_thumbnail(filename: str):
    thumb_path = THUMBNAILS_DIR / filename
    if not thumb_path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(str(thumb_path), media_type="image/jpeg")


@router.get("/video/{filename}")
async def stream_video(filename: str):
    video_path = UPLOADS_DIR / filename
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(str(video_path), media_type="video/mp4")
