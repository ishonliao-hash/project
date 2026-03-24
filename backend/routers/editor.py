"""Manual edit plan endpoints — no AI, pure user control."""
from fastapi import APIRouter, HTTPException
from models.schemas import EditPlanUpdate, EditPlan
from services import storage

router = APIRouter(prefix="/editor", tags=["editor"])


@router.get("/{project_id}/plan", response_model=EditPlan)
async def get_edit_plan(project_id: str):
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.edit_plan:
        raise HTTPException(status_code=404, detail="No edit plan yet")
    return project.edit_plan


@router.put("/{project_id}/plan", response_model=EditPlan)
async def save_edit_plan(project_id: str, data: EditPlanUpdate):
    """Save the user's manually constructed edit plan."""
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from models.schemas import EditPlan
    from datetime import datetime

    if project.edit_plan:
        plan = project.edit_plan
        plan.decisions = data.decisions
    else:
        plan = EditPlan(project_id=project_id, decisions=data.decisions)

    # Recalculate total duration
    total = 0.0
    for d in data.decisions:
        scene = storage.get_scene(project_id, d.scene_id)
        if scene:
            if d.out_point > 0:
                total += d.out_point - d.in_point
            else:
                total += scene.duration
    plan.total_duration = total

    storage.update_project_edit_plan(project_id, plan)
    return plan


@router.delete("/{project_id}/plan")
async def clear_edit_plan(project_id: str):
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.edit_plan = None
    storage.save_project(project)
    return {"message": "Edit plan cleared"}
