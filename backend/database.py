from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLiteデータベースのURL定義 (ローカルファイルへの保存)
SQLALCHEMY_DATABASE_URL = "sqlite:///./wbs.db"

# Engineインスタンスの作成 (SQLite固有の設定スレッドセーフ対策を含む)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# セッションを作成するためのローカルセッションファクトリ
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 全てのモデルが継承する基底クラス (Base) の宣言
Base = declarative_base()

# 依存性注入 (Dependency Injection) 用の関数
# 各リクエストでDBセッションを取得し、完了後にクローズする
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
