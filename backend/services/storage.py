"""In-memory storage for projects and scenes (replace with DB in production)."""
from typing import Dict, Optional
from models.schemas import Project, Scene, EditPlan
import json
import os
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
PROJECTS_FILE = DATA_DIR / "projects.json"


def _load_projects() -> Dict[str, dict]:
    if PROJECTS_FILE.exists():
        try:
            with open(PROJECTS_FILE) as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_projects(projects: Dict[str, dict]):
    with open(PROJECTS_FILE, "w") as f:
        json.dump(projects, f, default=str)


# In-memory cache
_projects: Dict[str, dict] = _load_projects()


def get_all_projects() -> list:
    return [Project(**p) for p in _projects.values()]


def get_project(project_id: str) -> Optional[Project]:
    data = _projects.get(project_id)
    if data:
        return Project(**data)
    return None


def save_project(project: Project):
    _projects[project.id] = project.dict()
    _save_projects(_projects)


def delete_project(project_id: str) -> bool:
    if project_id in _projects:
        del _projects[project_id]
        _save_projects(_projects)
        return True
    return False


def get_scene(project_id: str, scene_id: str) -> Optional[Scene]:
    project = get_project(project_id)
    if project:
        for scene in project.scenes:
            if scene.id == scene_id:
                return scene
    return None


def add_scene_to_project(project_id: str, scene: Scene) -> Optional[Project]:
    project = get_project(project_id)
    if project:
        project.scenes.append(scene)
        save_project(project)
        return project
    return None


def remove_scene_from_project(project_id: str, scene_id: str) -> bool:
    project = get_project(project_id)
    if project:
        project.scenes = [s for s in project.scenes if s.id != scene_id]
        save_project(project)
        return True
    return False


def update_project_edit_plan(project_id: str, edit_plan: EditPlan) -> Optional[Project]:
    project = get_project(project_id)
    if project:
        project.edit_plan = edit_plan
        save_project(project)
        return project
    return None
