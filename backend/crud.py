from sqlalchemy.orm import Session
import hashlib
import os
import binascii
import models
import schemas

def get_password_hash(password: str) -> str:
    salt = hashlib.sha256(os.urandom(60)).hexdigest().encode('ascii')
    pwdhash = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt, 100000)
    pwdhash = binascii.hexlify(pwdhash)
    return (salt + pwdhash).decode('ascii')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    salt = hashed_password[:64].encode('ascii')
    old_pwdhash = hashed_password[64:]
    pwdhash = hashlib.pbkdf2_hmac('sha512', plain_password.encode('utf-8'), salt, 100000)
    pwdhash = binascii.hexlify(pwdhash).decode('ascii')
    return pwdhash == old_pwdhash

# -----------
# Users / Statuses
# -----------
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_statuses(db: Session):
    return db.query(models.Status).order_by(models.Status.sort_order).all()

# -----------
# Projects / Members
# -----------
def get_projects_for_user(db: Session, user_id: str):
    """ユーザーが参加しているプロジェクト一覧を取得"""
    return db.query(models.Project).join(models.ProjectMember).filter(models.ProjectMember.user_id == user_id).all()

def create_project(db: Session, project: schemas.ProjectCreate, user_id: str):
    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    db.flush() # 発番
    
    db_member = models.ProjectMember(
        project_id=db_project.id,
        user_id=user_id,
        is_admin=True
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_project)
    return db_project

def get_project_members(db: Session, project_id: str):
    return db.query(models.ProjectMember).filter(models.ProjectMember.project_id == project_id).all()

def add_project_member(db: Session, project_id: str, member: schemas.ProjectMemberCreate):
    db_member = models.ProjectMember(
        project_id=project_id,
        user_id=member.user_id,
        is_admin=member.is_admin
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

def is_admin(db: Session, project_id: str, user_id: str) -> bool:
    """ユーザーがプロジェクトの管理者かどうかを判定"""
    member = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id,
        models.ProjectMember.user_id == user_id
    ).first()
    return member.is_admin if member else False

# -----------
# Tasks (WBS)
# -----------
def get_wbs_tasks(db: Session, project_id: str, parent_id: str = None, all_tasks: bool = False):
    """
    指定プロジェクトのタスクツリーを取得する。
    遅延読み込み対応: parent_idが未指定の場合はLevel 1のみ取得し、指定された場合はその子タスク(Level 2 or 3)を取得。
    all_tasksがTrueの場合は、階層やparent_idに関係なくプロジェクトの全タスクを取得する。
    """
    query = db.query(models.Task).filter(models.Task.project_id == project_id)
    if not all_tasks:
        if parent_id:
            query = query.filter(models.Task.parent_id == parent_id)
        else:
            query = query.filter(models.Task.level == 1)
        
    tasks = query.all()
    
    # schemas.TaskResponse 用に has_children フラグを計算する
    result = []
    for task in tasks:
        # 子要素の有無を確認（パフォーマンスのためカウントのみ）
        child_count = db.query(models.Task).filter(models.Task.parent_id == task.id).count()
        
        task_dict = {
            "id": task.id,
            "project_id": task.project_id,
            "title": task.title,
            "level": task.level,
            "parent_id": task.parent_id,
            "planned_start": task.planned_start,
            "planned_end": task.planned_end,
            "actual_start": task.actual_start,
            "actual_end": task.actual_end,
            "progress": task.progress,
            "assignee_id": task.assignee_id,
            "status_id": task.status_id,
            "notes": task.notes,
            "deliverables": task.deliverables,
            "has_children": child_count > 0
        }
        result.append(task_dict)
    
    return result

def get_task(db: Session, task_id: str):
    return db.query(models.Task).filter(models.Task.id == task_id).first()

def create_task(db: Session, project_id: str, task: schemas.TaskCreate):
    db_task = models.Task(**task.model_dump(), project_id=project_id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

def update_task(db: Session, task_id: str, task: schemas.TaskUpdate):
    db_task = get_task(db, task_id)
    if not db_task:
        return None
        
    update_data = task.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
        
    db.commit()
    db.refresh(db_task)
    return db_task

def delete_task(db: Session, task_id: str):
    db_task = get_task(db, task_id)
    if db_task:
        db.delete(db_task)
        db.commit()
        return True
    return False

# -----------
# Deliverables
# -----------
def create_deliverable(db: Session, task_id: str, deliverable: schemas.DeliverableCreate):
    db_deliv = models.Deliverable(**deliverable.model_dump(), task_id=task_id)
    db.add(db_deliv)
    db.commit()
    db.refresh(db_deliv)
    return db_deliv

def delete_deliverable(db: Session, deliverable_id: str):
    db_deliv = db.query(models.Deliverable).filter(models.Deliverable.id == deliverable_id).first()
    if db_deliv:
        db.delete(db_deliv)
        db.commit()
        return True
    return False
