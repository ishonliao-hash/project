from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid


class SceneMetadata(BaseModel):
    shot_type: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class Scene(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    filename: str
    original_filename: str
    duration: float = 0.0
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    thumbnail: Optional[str] = None
    metadata: SceneMetadata = Field(default_factory=SceneMetadata)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SceneCreate(BaseModel):
    project_id: str
    original_filename: str
    metadata: Optional[SceneMetadata] = None


class SceneUpdate(BaseModel):
    metadata: Optional[SceneMetadata] = None


class EditDecision(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scene_id: str
    scene_filename: str
    order: int
    in_point: float = 0.0
    out_point: float = 0.0
    transition_type: str = "cut"
    transition_duration: float = 0.5


class EditPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    decisions: List[EditDecision] = Field(default_factory=list)
    total_duration: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EditPlanUpdate(BaseModel):
    decisions: List[EditDecision]


class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    scenes: List[Scene] = Field(default_factory=list)
    edit_plan: Optional[EditPlan] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProjectCreate(BaseModel):
    name: str


class ProjectUpdate(BaseModel):
    name: Optional[str] = None


class ExportRequest(BaseModel):
    project_id: str
    format: str = "mp4"
    quality: str = "high"
