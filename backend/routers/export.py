"""Video export endpoints."""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pathlib import Path
import uuid
import os
from models.schemas import ExportRequest
from services import storage, video_processor

router = APIRouter(prefix="/export", tags=["export"])

EXPORTS_DIR = Path(__file__).parent.parent / "exports"

# Track export jobs {job_id: {status, output_path, error}}
export_jobs: dict = {}


@router.post("/")
async def start_export(request: ExportRequest, background_tasks: BackgroundTasks):
    """Start an async video export job."""
    project = storage.get_project(request.project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.edit_plan:
        raise HTTPException(status_code=400, detail="No edit plan. Generate one first.")
    if not project.edit_plan.decisions:
        raise HTTPException(status_code=400, detail="Edit plan has no decisions.")

    job_id = str(uuid.uuid4())
    output_filename = f"export_{request.project_id}_{job_id}.mp4"
    output_path = str(EXPORTS_DIR / output_filename)

    export_jobs[job_id] = {
        "status": "processing",
        "output_path": output_path,
        "output_filename": output_filename,
        "error": None
    }

    decisions_data = [
        {
            "scene_filename": d.scene_filename,
            "in_point": d.in_point,
            "out_point": d.out_point,
            "transition_type": d.transition_type,
            "transition_duration": d.transition_duration
        }
        for d in project.edit_plan.decisions
    ]

    background_tasks.add_task(
        _run_export, job_id, decisions_data, output_path, request.quality
    )

    return {"job_id": job_id, "status": "processing"}


async def _run_export(job_id: str, decisions: list, output_path: str, quality: str):
    success, result = video_processor.export_video(decisions, output_path, quality)
    if success:
        export_jobs[job_id]["status"] = "complete"
    else:
        export_jobs[job_id]["status"] = "error"
        export_jobs[job_id]["error"] = result


@router.get("/status/{job_id}")
async def get_export_status(job_id: str):
    job = export_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Export job not found")
    return {
        "job_id": job_id,
        "status": job["status"],
        "error": job.get("error")
    }


@router.get("/download/{job_id}")
async def download_export(job_id: str):
    job = export_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Export job not found")
    if job["status"] != "complete":
        raise HTTPException(status_code=400, detail=f"Export not ready: {job['status']}")
    if not os.path.exists(job["output_path"]):
        raise HTTPException(status_code=404, detail="Export file not found")
    return FileResponse(
        job["output_path"],
        media_type="video/mp4",
        filename=job["output_filename"]
    )
