from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models
import crud
from datetime import date, timedelta

# テーブル作成
Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    try:
        # デフォルトステータスの投入
        statuses = [
            models.Status(name="未着手", color="#cbd5e1", sort_order=1),
            models.Status(name="進行中", color="#3b82f6", sort_order=2),
            models.Status(name="完了", color="#22c55e", sort_order=3),
        ]
        
        # 既に存在するかチェック
        existing_statuses = db.query(models.Status).count()
        if existing_statuses == 0:
            db.add_all(statuses)
            db.commit()
            print("ステータスマスタの初期データを投入しました。")
        else:
            print("ステータスマスタは既に存在します。")

        # テスト用ユーザーの作成
        users = [
            models.User(name="管理者 太郎", email="admin@example.com", password_hash=crud.get_password_hash("password123")),
            models.User(name="一般 花子", email="member@example.com", password_hash=crud.get_password_hash("password123")),
        ]
        existing_users = db.query(models.User).count()
        if existing_users == 0:
            for u in users:
                db.add(u)
            db.commit()
            print("テスト用ユーザーを投入しました。")
        
        # テスト用プロジェクトの作成
        user_admin = db.query(models.User).filter_by(email="admin@example.com").first()
        user_member = db.query(models.User).filter_by(email="member@example.com").first()
        
        status_todo = db.query(models.Status).filter_by(name="未着手").first()
        status_doing = db.query(models.Status).filter_by(name="進行中").first()
        status_done = db.query(models.Status).filter_by(name="完了").first()

        existing_projects = db.query(models.Project).count()
        if existing_projects == 0 and user_admin and user_member:
            project = models.Project(name="Webシステム刷新プロジェクト", description="2026年度の基幹システム刷新に向けたWBS")
            db.add(project)
            db.commit()
            
            # メンバーの割当
            member1 = models.ProjectMember(project_id=project.id, user_id=user_admin.id, is_admin=True)
            member2 = models.ProjectMember(project_id=project.id, user_id=user_member.id, is_admin=False)
            db.add_all([member1, member2])
            db.commit()
            
            # WBSタスクの初期データ投入 (Level 1, Level 2, Level 3)
            today = date.today()
            
            # Level 1 : フェーズ
            l1_task1 = models.Task(project_id=project.id, title="要件定義フェーズ", level=1, planned_start=today, planned_end=today + timedelta(days=30))
            db.add(l1_task1)
            db.commit()
            db.refresh(l1_task1)
            
            # Level 2 : タスク
            l2_task1_1 = models.Task(project_id=project.id, parent_id=l1_task1.id, title="業務要件の整理", level=2, planned_start=today, planned_end=today + timedelta(days=10))
            l2_task1_2 = models.Task(project_id=project.id, parent_id=l1_task1.id, title="システム要件定義", level=2, planned_start=today + timedelta(days=11), planned_end=today + timedelta(days=30))
            db.add_all([l2_task1_2, l2_task1_1])
            db.commit()
            db.refresh(l2_task1_1)
            
            # Level 3 : サブタスク
            l3_task1_1_1 = models.Task(project_id=project.id, parent_id=l2_task1_1.id, title="ヒアリング実施", level=3, planned_start=today, planned_end=today + timedelta(days=5), status_id=status_done.id, progress=100, assignee_id=user_member.id)
            l3_task1_1_2 = models.Task(project_id=project.id, parent_id=l2_task1_1.id, title="要件定義書の作成", level=3, planned_start=today + timedelta(days=6), planned_end=today + timedelta(days=10), status_id=status_doing.id, progress=30, assignee_id=user_admin.id)
            db.add_all([l3_task1_1_1, l3_task1_1_2])
            db.commit()

            print("テスト用プロジェクトおよびWBS初期データを投入しました。")

    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
