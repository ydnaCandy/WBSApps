from fastapi import FastAPI, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware

import models
import schemas
import crud
from database import engine, Base, get_db

# データベーステーブルの作成（すでに存在する場合は作成されない）
Base.metadata.create_all(bind=engine)

app = FastAPI(title="WBS Management API")

# ReactからのCORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 開発用
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# 疑似的な認証: リクエストヘッダーから user-id を取得してユーザーを特定する
# 本来はJWTトークンなどを利用して検証するが、今回の要件として
# ユーザーと権限切り替えのデモができるようにシンプルなヘッダー認証とする。
# ----------------------------------------------------
def get_current_user_id(x_user_id: Optional[str] = Header(None)) -> str:
    if not x_user_id:
        # デフォルトでユーザーIDがない場合はテスト用に固定することも可能だが
        # UIからヘッダーを付加される想定とする
        raise HTTPException(status_code=401, detail="X-User-Id header missing")
    return x_user_id

# -----------------
# 認証 API
# -----------------
@app.post("/api/v1/auth/login", response_model=schemas.UserResponse)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """メールアドレスとパスワードでログインし、成功した場合はユーザー情報を返す"""
    user = crud.authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")
    return user

# -----------------
# マスタAPI
# -----------------
@app.get("/api/v1/users", response_model=List[schemas.UserResponse])
def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """全ユーザー一覧を取得"""
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@app.post("/api/v1/users", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """新規ユーザー登録"""
    existing_user = crud.get_user_by_email(db, user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="このメールアドレスは既に登録されています")
    return crud.create_user(db, user)

@app.get("/api/v1/statuses", response_model=List[schemas.StatusResponse])
def get_statuses(db: Session = Depends(get_db)):
    """ステータスマスタ一覧を取得"""
    return crud.get_statuses(db)

# -----------------
# プロジェクトAPI
# -----------------
@app.get("/api/v1/projects", response_model=List[schemas.ProjectResponse])
def get_projects(db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    """自身が参加するプロジェクト一覧を取得"""
    return crud.get_projects_for_user(db, current_user_id)

@app.post("/api/v1/projects", response_model=schemas.ProjectResponse)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    """新規プロジェクトの作成（作成者が自動で管理者になります）"""
    return crud.create_project(db, project, current_user_id)

@app.get("/api/v1/projects/{pid}/members", response_model=List[schemas.ProjectMemberResponse])
def get_project_members(pid: str, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    """プロジェクトメンバーの取得"""
    return crud.get_project_members(db, pid)

@app.post("/api/v1/projects/{pid}/members", response_model=schemas.ProjectMemberResponse)
def add_project_member(pid: str, member: schemas.ProjectMemberCreate, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    """プロジェクトメンバーの追加"""
    # 本当は管理権限チェックなどが必要だがここでは省略（要件次第）
    if not crud.is_admin(db, pid, current_user_id):
        raise HTTPException(status_code=403, detail="Admin privileges required to add members")
    return crud.add_project_member(db, pid, member)

@app.get("/api/v1/projects/{pid}/wbs", response_model=List[schemas.TaskResponse])
def get_wbs(pid: str, parent_id: Optional[str] = None, all_tasks: bool = False, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    """
    指定プロジェクトのタスクツリー取得。
    parent_idが指定されれば直下の子タスク(Level2等)を、指定がなければLevel1タスクを返す遅延読み込み対応。
    all_tasks=trueの場合はプロジェクト内の全タスクをフラットなリストとして返す。
    """
    return crud.get_wbs_tasks(db, pid, parent_id=parent_id, all_tasks=all_tasks)

@app.get("/api/v1/projects/{pid}/export")
def export_project(pid: str, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    """プロジェクトの全タスクをエクスポート"""
    # 権限チェック (メンバーであればエクスポート可能とする)
    members = crud.get_project_members(db, pid)
    if not any(m.user_id == current_user_id for m in members):
        raise HTTPException(status_code=403, detail="Access denied")
    
    tasks = crud.get_wbs_tasks(db, pid, all_tasks=True)
    return tasks

@app.post("/api/v1/projects/{pid}/import")
def import_project(pid: str, tasks_data: List[dict], db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    """JSONからタスクをインポート"""
    if not crud.is_admin(db, pid, current_user_id):
        raise HTTPException(status_code=403, detail="Admin privileges required to import tasks")
    
    import uuid
    id_map = {}
    
    # Pass 1: IDマッピングの作成
    for t_data in tasks_data:
        old_id = t_data.get("id")
        new_id = str(uuid.uuid4())
        if old_id:
            id_map[old_id] = new_id
        t_data["new_id"] = new_id
        
    # Pass 2: DBへの登録
    from datetime import datetime
    
    def parse_date(date_str):
        if not date_str: return None
        try:
            return datetime.fromisoformat(date_str).date()
        except:
            return None

    count = 0
    for t_data in tasks_data:
        old_parent = t_data.get("parent_id")
        new_parent = id_map.get(old_parent) if old_parent else None
        
        db_task = models.Task(
            id=t_data["new_id"],
            project_id=pid,
            title=t_data.get("title", "未設定タスク"),
            level=t_data.get("level", 1),
            parent_id=new_parent,
            planned_start=parse_date(t_data.get("planned_start")),
            planned_end=parse_date(t_data.get("planned_end")),
            actual_start=parse_date(t_data.get("actual_start")),
            actual_end=parse_date(t_data.get("actual_end")),
            progress=t_data.get("progress", 0),
            assignee_id=t_data.get("assignee_id"),
            status_id=t_data.get("status_id"),
            notes=t_data.get("notes")
        )
        db.add(db_task)
        count += 1
        
    db.commit()
    return {"message": "Import successful", "imported_count": count}

# -----------------
# タスクCRUD API
# -----------------
@app.post("/api/v1/projects/{pid}/tasks", response_model=schemas.TaskResponse)
def create_task(pid: str, task: schemas.TaskCreate, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    """タスク作成（Levelに応じた権限チェック実行）"""
    if task.level in [1, 2]:
        if not crud.is_admin(db, pid, current_user_id):
            raise HTTPException(status_code=403, detail="Admin privileges required to create Level 1/2 tasks")
    
    # 作成後、has_childrenフラグ等を再計算させるためには辞書ではなくモデルから再取得するか、手動でセットする
    new_task = crud.create_task(db, project_id=pid, task=task)
    # response_modelに準拠するための変換
    response_task = {
        "id": new_task.id,
        "project_id": new_task.project_id,
        "title": new_task.title,
        "level": new_task.level,
        "parent_id": new_task.parent_id,
        "planned_start": new_task.planned_start,
        "planned_end": new_task.planned_end,
        "actual_start": new_task.actual_start,
        "actual_end": new_task.actual_end,
        "progress": new_task.progress,
        "assignee_id": new_task.assignee_id,
        "status_id": new_task.status_id,
        "notes": new_task.notes,
        "has_children": False,
        "deliverables": []
    }
    return response_task

@app.patch("/api/v1/tasks/{task_id}", response_model=schemas.TaskResponse)
def update_task(task_id: str, task_update: schemas.TaskUpdate, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    """タスク更新（Levelに応じた権限チェック実行）"""
    existing_task = crud.get_task(db, task_id)
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    pid = existing_task.project_id
    if existing_task.level in [1, 2]:
        if not crud.is_admin(db, pid, current_user_id):
            raise HTTPException(status_code=403, detail="Admin privileges required to update Level 1/2 tasks")
            
    updated_task = crud.update_task(db, task_id, task_update)
    
    # 子要素数の計算
    child_count = db.query(models.Task).filter(models.Task.parent_id == updated_task.id).count()
    
    response_task = {
        **updated_task.__dict__,
        "has_children": child_count > 0,
        "deliverables": updated_task.deliverables
    }
    return response_task

@app.delete("/api/v1/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    """タスク削除（Levelに応じた権限チェック実行）"""
    existing_task = crud.get_task(db, task_id)
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    pid = existing_task.project_id
    if existing_task.level in [1, 2]:
        if not crud.is_admin(db, pid, current_user_id):
            raise HTTPException(status_code=403, detail="Admin privileges required to delete Level 1/2 tasks")
            
    success = crud.delete_task(db, task_id)
    return {"success": success}

# -----------------
# 成果物API
# -----------------
@app.post("/api/v1/tasks/{task_id}/deliverables", response_model=schemas.DeliverableResponse)
def add_deliverable(task_id: str, deliverable: schemas.DeliverableCreate, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    """タスクに成果物リンクを追加"""
    existing_task = crud.get_task(db, task_id)
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    return crud.create_deliverable(db, task_id, deliverable)

@app.delete("/api/v1/deliverables/{deliverable_id}")
def remove_deliverable(deliverable_id: str, db: Session = Depends(get_db), current_user_id: str = Depends(get_current_user_id)):
    """成果物リンクを削除"""
    success = crud.delete_deliverable(db, deliverable_id)
    if not success:
        raise HTTPException(status_code=404, detail="Deliverable not found")
    return {"success": success}

# アプリケーション起動時のメッセージ用ルート
@app.get("/")
def read_root():
    return {"message": "WBS Management API is running. Check /docs for API documentation."}
