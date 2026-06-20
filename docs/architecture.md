# アーキテクチャ概要

## 全体構成

- **frontend/** — React 19 + Vite 8 + Tailwind CSS SPA
- **backend/** — FastAPI + SQLAlchemy 2.0 + SQLite (`backend/wbs.db`)
- フロントエンドはaxiosで `http://localhost:8000` のREST APIを叩く

---

## バックエンド構成（`backend/`）

| ファイル | 役割 |
|---------|------|
| `main.py` | FastAPIルーティング（全APIエンドポイント定義） |
| `models.py` | SQLAlchemy ORMモデル（8テーブル） |
| `schemas.py` | Pydantic v2 バリデーションスキーマ |
| `crud.py` | DBアクセス処理 |
| `database.py` | DBセッション・エンジン設定 |
| `seed.py` | 初期データ投入スクリプト |

---

## フロントエンド構成（`frontend/src/`）

| ファイル/ディレクトリ | 役割 |
|---|---|
| `context/AppContext.jsx` | グローバル状態（currentUser, projects, statuses）＋axiosヘッダー設定 |
| `hooks/useWbsData.js` | タスクツリーの展開/折り畳み状態管理（visibleTasksをmemo） |
| `components/wbs/WbsContainer.jsx` | WBS画面のメインオーケストレーター |
| `components/wbs/TaskTable.jsx` | 左ペイン（タスクツリーテーブル） |
| `components/wbs/GanttChart.jsx` | 右ペイン（ガントチャート） |
| `components/wbs/TaskDetailPanel.jsx` | スライドアウト詳細パネル |
| `components/wbs/TaskFormModal.jsx` | タスク作成/編集モーダル |
| `pages/Login.jsx` | ログインページ |

---

## データモデルの要点

- タスクは3階層：Level 1（フェーズ）→ Level 2（タスク）→ Level 3（サブタスク）
- `Tasks`テーブルは自己参照（`parent_id`で階層構造）
- WBS APIはlazy-loading対応：`parent_id`パラメータで子タスクを随時取得

---

## 認証の仕組み

- JWTなし。ログイン後に`X-User-Id`ヘッダーを全リクエストに付与
- AppContextがaxiosインスタンスにヘッダーをセットし、localStorageにユーザー情報を保存
- プロジェクトメンバーの`is_admin`フラグでL1/L2タスクの編集権限を制御（403を返す）
