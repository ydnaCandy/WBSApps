from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import date

# ユーザー関連スキーマ
class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(UserBase):
    id: str
    class Config:
        from_attributes = True

# ステータス関連スキーマ
class StatusBase(BaseModel):
    name: str
    color: str
    sort_order: int = 0

class StatusResponse(StatusBase):
    id: str
    class Config:
        from_attributes = True

# 成果物関連スキーマ
class DeliverableBase(BaseModel):
    name: str
    url: str

class DeliverableCreate(DeliverableBase):
    pass

class DeliverableResponse(DeliverableBase):
    id: str
    task_id: str
    class Config:
        from_attributes = True

# コメント関連スキーマ
class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    user_id: str

class CommentResponse(CommentBase):
    id: str
    task_id: str
    user_id: str
    created_at: str
    class Config:
        from_attributes = True

# タスク関連スキーマ
class TaskBase(BaseModel):
    title: str
    level: int  # 1, 2, 3
    parent_id: Optional[str] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None
    progress: int = Field(default=0, ge=0, le=100)
    assignee_id: Optional[str] = None
    status_id: Optional[str] = None
    notes: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)
    assignee_id: Optional[str] = None
    status_id: Optional[str] = None
    notes: Optional[str] = None

class TaskResponse(TaskBase):
    id: str
    project_id: str
    deliverables: List[DeliverableResponse] = []
    has_children: bool = False # Level1,2の場合は子要素があるかどうかのフラグ
    class Config:
        from_attributes = True

# プロジェクトメンバー関連スキーマ
class ProjectMemberBase(BaseModel):
    user_id: str
    is_admin: bool = False

class ProjectMemberCreate(ProjectMemberBase):
    pass

class ProjectMemberResponse(ProjectMemberBase):
    user: UserResponse
    class Config:
        from_attributes = True

# プロジェクト関連スキーマ
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str
    members: List[ProjectMemberResponse] = []
    class Config:
        from_attributes = True
