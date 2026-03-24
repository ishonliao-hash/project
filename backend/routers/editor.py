"""AI editor and edit plan endpoints."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..models.schemas import AIEditRequest, EditPlanUpdate, EditPlan
from ..services import storage, ai_editor
import json

router = APIRouter(prefix="/editor", tags=["editor"])


@router.post("/generate/{project_id}", response_model=EditPlan)
async def generate_edit_plan(project_id: str, request: AIEditRequest = None):
    """Generate an AI edit plan for the project."""
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.scenes:
        raise HTTPException(status_code=400, detail="Project has no scenes")

    description = None
    if request and request.description:
        description = request.description

    try:
        plan = await ai_editor.generate_edit_plan(project, description)
        updated = storage.update_project_edit_plan(project_id, plan)
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI editing failed: {str(e)}")


@router.get("/stream/{project_id}")
async def stream_edit_generation(project_id: str, description: str = None):
    """Stream the AI thinking process while generating an edit plan."""
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.scenes:
        raise HTTPException(status_code=400, detail="Project has no scenes")

    async def generate():
        try:
            async for chunk in ai_editor.stream_edit_thinking(project, description):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@router.put("/{project_id}/plan", response_model=EditPlan)
async def update_edit_plan(project_id: str, data: EditPlanUpdate):
    """Update the edit plan manually (user overrides)."""
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.edit_plan:
        raise HTTPException(status_code=404, detail="No edit plan exists. Generate one first.")

    project.edit_plan.decisions = data.decisions
    # Recalculate total duration
    total = 0.0
    for d in data.decisions:
        scene = storage.get_scene(project_id, d.scene_id)
        if scene:
            if d.out_point > 0:
                total += d.out_point - d.in_point
            else:
                total += scene.duration
    project.edit_plan.total_duration = total
    storage.save_project(project)
    return project.edit_plan


@router.get("/{project_id}/plan", response_model=EditPlan)
async def get_edit_plan(project_id: str):
    """Get the current edit plan for a project."""
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.edit_plan:
        raise HTTPException(status_code=404, detail="No edit plan generated yet")
    return project.edit_plan


@router.delete("/{project_id}/plan")
async def delete_edit_plan(project_id: str):
    """Clear the edit plan."""
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.edit_plan = None
    storage.save_project(project)
    return {"message": "Edit plan cleared"}
