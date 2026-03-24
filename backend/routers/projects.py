"""Project management endpoints."""
from fastapi import APIRouter, HTTPException
from datetime import datetime
from ..models.schemas import Project, ProjectCreate, ProjectUpdate
from ..services import storage

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=list[Project])
async def list_projects():
    return storage.get_all_projects()


@router.post("/", response_model=Project)
async def create_project(data: ProjectCreate):
    project = Project(name=data.name, description=data.description)
    storage.save_project(project)
    return project


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=Project)
async def update_project(project_id: str, data: ProjectUpdate):
    project = storage.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    project.updated_at = datetime.utcnow()
    storage.save_project(project)
    return project


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    if not storage.delete_project(project_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}
