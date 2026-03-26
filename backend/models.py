import uuid
from sqlalchemy import Column, String, Integer, Boolean, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

# UUIDを自動生成するユーティリティ関数
def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    """
    アプリケーションを利用するユーザーマスタテーブル
    """
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

    # リレーションシップ
    projects = relationship("ProjectMember", back_populates="user")
    tasks = relationship("Task", back_populates="assignee")
    comments = relationship("Comment", back_populates="user")


class Status(Base):
    """
    タスクのステータス（未着手、進行中など）を管理するマスタテーブル
    """
    __tablename__ = "statuses"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String, nullable=False)
    color = Column(String, nullable=False)  # UI表示用のカラーコード
    sort_order = Column(Integer, default=0)

    # リレーションシップ
    tasks = relationship("Task", back_populates="status")


class Project(Base):
    """
    複数プロジェクトを管理するためのテーブル
    """
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)

    # リレーションシップ
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


class ProjectMember(Base):
    """
    プロジェクトとユーザーを紐づける中間テーブル (権限管理含む)
    """
    __tablename__ = "project_members"

    project_id = Column(String, ForeignKey("projects.id"), primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    is_admin = Column(Boolean, default=False)  # 管理者権限フラグ

    # リレーションシップ
    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="projects")


class Task(Base):
    """
    WBSの各タスク(Level 1, 2, 3)を管理する再起リレーションを持つテーブル
    """
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    level = Column(Integer, nullable=False)  # 階層レベル (1, 2, 3)
    parent_id = Column(String, ForeignKey("tasks.id"), nullable=True, index=True)
    
    planned_start = Column(Date, nullable=True)
    planned_end = Column(Date, nullable=True)
    actual_start = Column(Date, nullable=True)
    actual_end = Column(Date, nullable=True)
    
    progress = Column(Integer, default=0)
    assignee_id = Column(String, ForeignKey("users.id"), nullable=True)
    status_id = Column(String, ForeignKey("statuses.id"), nullable=True)
    notes = Column(Text, nullable=True)

    # リレーションシップ
    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks")
    status = relationship("Status", back_populates="tasks")
    
    # 自己参照 (親タスクと子タスク)
    parent = relationship("Task", remote_side=[id], back_populates="children")
    children = relationship("Task", back_populates="parent", cascade="all, delete-orphan")
    
    deliverables = relationship("Deliverable", back_populates="task", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")


class Deliverable(Base):
    """
    タスク(主にLevel 3)に紐づく成果物へのリンク情報を管理するテーブル
    """
    __tablename__ = "deliverables"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)

    # リレーションシップ
    task = relationship("Task", back_populates="deliverables")


class Comment(Base):
    """
    タスクに紐づくコメント情報を管理するテーブル
    """
    __tablename__ = "comments"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    task_id = Column(String, ForeignKey("tasks.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(String, nullable=False) # 簡単のためISO文字列として保存

    # リレーションシップ
    task = relationship("Task", back_populates="comments")
    user = relationship("User", back_populates="comments")
