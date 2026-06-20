# WBS管理アプリケーション 詳細設計書 (v1.0)

> 本ドキュメントは `design.md`（概要仕様書）を補完し、実装済みの各モジュールの内部構造・動作仕様・画面仕様・API仕様を網羅的に記載した**詳細設計書**です。

---

## 目次

1. [システム構成図](#1-システム構成図)
2. [ディレクトリ構成](#2-ディレクトリ構成)
3. [バックエンド詳細設計](#3-バックエンド詳細設計)
4. [フロントエンド詳細設計](#4-フロントエンド詳細設計)
5. [画面仕様](#5-画面仕様)
6. [API詳細仕様](#6-api詳細仕様)
7. [データフロー](#7-データフロー)
8. [非機能要件・制約事項](#8-非機能要件制約事項)

---

## 1. システム構成図

```
┌─────────────────────────────────────────────────────────┐
│                    フロントエンド                          │
│              React 18+ / Vite / Tailwind CSS             │
│                   (http://localhost:5173)                 │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────────────┐  │
│  │ Sidebar  │ │ WBS Container│ │  Settings Layout     │  │
│  │  .jsx    │ │ TaskTable    │ │  MemberManagement    │  │
│  │          │ │ GanttChart   │ │  StatusMaster        │  │
│  └──────────┘ │ TaskDetail   │ └──────────────────────┘  │
│               │ TaskFormModal│                            │
│               └──────────────┘                            │
└──────────────────────┬───────────────────────────────────┘
                       │ axios (X-User-Id ヘッダー付き)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    バックエンド                            │
│          FastAPI / SQLAlchemy / Pydantic v2               │
│                   (http://localhost:8000)                 │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐  │
│  │ main.py │ │ crud.py  │ │models.py│ │ schemas.py   │  │
│  │ (API)   │ │ (ロジック) │ │  (ORM)  │ │ (バリデーション)│  │
│  └─────────┘ └──────────┘ └─────────┘ └──────────────┘  │
└──────────────────────┬───────────────────────────────────┘
                       │ SQLAlchemy ORM
                       ▼
              ┌──────────────────┐
              │   SQLite (wbs.db) │
              └──────────────────┘
```

---

## 2. ディレクトリ構成

```
MyWBSApps/
├── design.md                     # 概要仕様書
├── design_detail.md              # 本ドキュメント（詳細設計書）
│
├── backend/                      # バックエンド (Python / FastAPI)
│   ├── main.py                   # FastAPIアプリケーション本体・ルーティング定義
│   ├── database.py               # SQLAlchemy Engine / Session の初期化
│   ├── models.py                 # ORMモデル定義（6テーブル）
│   ├── schemas.py                # Pydantic v2 リクエスト/レスポンススキーマ
│   ├── crud.py                   # データベース操作ロジック（CRUD関数群）
│   ├── seed.py                   # 初期データ投入スクリプト
│   ├── requirements.txt          # Python依存パッケージ
│   └── wbs.db                    # SQLiteデータベースファイル（自動生成）
│
└── frontend/                     # フロントエンド (React / Vite)
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx              # エントリポイント（ReactDOM.createRoot）
        ├── App.jsx               # ルーティング設定（BrowserRouter）
        ├── index.css             # Tailwind CSS ベーススタイル
        │
        ├── context/
        │   └── AppContext.jsx    # グローバルステート・認証管理
        │
        ├── hooks/
        │   └── useWbsData.js     # WBSツリーの展開/折りたたみ管理Hook
        │
        ├── lib/
        │   └── utils.js          # ユーティリティ関数（cn等）
        │
        └── components/
            ├── Sidebar.jsx       # サイドバー（プロジェクト切替・ナビゲーション）
            │
            ├── wbs/
            │   ├── WbsContainer.jsx    # WBSメイン画面（テーブル+チャートの統合）
            │   ├── TaskTable.jsx       # WBSタスクテーブル（左ペイン）
            │   ├── GanttChart.jsx      # ガントチャート（右ペイン）
            │   ├── TaskDetailPanel.jsx # タスク詳細パネル（スライドアウト）
            │   └── TaskFormModal.jsx   # タスク追加・編集モーダル
            │
            └── settings/
                └── SettingsLayout.jsx  # 設定画面レイアウト
```

---

## 3. バックエンド詳細設計

### 3.1 データベース設定 (`database.py`)

| 項目          | 内容                                           |
|:-------------|:-----------------------------------------------|
| エンジン       | `sqlite:///./wbs.db`                           |
| セッション     | `SessionLocal` (autocommit=False, autoflush=False) |
| ベースクラス    | `declarative_base()` による `Base`              |
| 依存性注入     | `get_db()` ジェネレータで各リクエストにセッションを注入 |

### 3.2 ORMモデル (`models.py`)

#### Users テーブル

| カラム名    | 型      | 制約                          | 説明            |
|:----------|:--------|:-----------------------------|:--------------|
| id        | String  | PK, UUID自動生成, INDEX       | ユーザーID       |
| name      | String  | NOT NULL, INDEX              | ユーザー名       |
| email     | String  | NOT NULL, UNIQUE, INDEX      | メールアドレス    |
| password_hash | String | NOT NULL                 | パスワードのハッシュ値 |

**リレーション**: `projects` (ProjectMember経由), `tasks` (担当タスク), `comments`

#### Statuses テーブル（マスタ）

| カラム名      | 型       | 制約               | 説明                |
|:------------|:---------|:------------------|:-------------------|
| id          | String   | PK, UUID自動生成    | ステータスID         |
| name        | String   | NOT NULL           | ステータス名         |
| color       | String   | NOT NULL           | カラーコード (例: `#3b82f6`) |
| sort_order  | Integer  | DEFAULT 0          | 表示順              |

**初期データ**: `未着手` (#cbd5e1), `進行中` (#3b82f6), `完了` (#22c55e)

#### Projects テーブル

| カラム名       | 型      | 制約              | 説明              |
|:-------------|:--------|:-----------------|:-----------------|
| id           | String  | PK, UUID自動生成   | プロジェクトID      |
| name         | String  | NOT NULL, INDEX   | プロジェクト名      |
| description  | String  | NULLABLE          | プロジェクト概要     |

**カスケード**: メンバーおよびタスクの削除時に連動削除

#### ProjectMembers テーブル（中間テーブル）

| カラム名      | 型       | 制約           | 説明            |
|:------------|:---------|:-------------|:--------------|
| project_id  | String   | PK, FK(projects.id) | プロジェクトID |
| user_id     | String   | PK, FK(users.id)    | ユーザーID    |
| is_admin    | Boolean  | DEFAULT False       | 管理者フラグ   |

**複合主キー**: (`project_id`, `user_id`)

#### Tasks テーブル

| カラム名        | 型       | 制約                        | 説明                       |
|:--------------|:---------|:---------------------------|:--------------------------|
| id            | String   | PK, UUID自動生成             | タスクID                    |
| project_id    | String   | FK(projects.id), NOT NULL   | 所属プロジェクト              |
| title         | String   | NOT NULL                    | タスク名                    |
| level         | Integer  | NOT NULL                    | 階層 (1=フェーズ, 2=タスク, 3=サブタスク) |
| parent_id     | String   | FK(tasks.id), NULLABLE      | 親タスクID（自己参照FK）        |
| planned_start | Date     | NULLABLE                    | 開始予定日                   |
| planned_end   | Date     | NULLABLE                    | 終了予定日                   |
| actual_start  | Date     | NULLABLE                    | 開始実績日                   |
| actual_end    | Date     | NULLABLE                    | 終了実績日                   |
| progress      | Integer  | DEFAULT 0                   | 進捗率 (0〜100)             |
| assignee_id   | String   | FK(users.id), NULLABLE      | 担当者ID                    |
| status_id     | String   | FK(statuses.id), NULLABLE   | ステータスID                 |
| notes         | Text     | NULLABLE                    | 備考                       |

**自己参照リレーション**: `parent` ↔ `children` (cascade: all, delete-orphan)

#### Deliverables テーブル

| カラム名    | 型      | 制約                         | 説明         |
|:----------|:--------|:---------------------------|:-----------|
| id        | String  | PK, UUID自動生成              | 成果物ID     |
| task_id   | String  | FK(tasks.id), NOT NULL       | タスクID     |
| name      | String  | NOT NULL                     | 成果物名     |
| url       | String  | NOT NULL                     | URL        |

#### Comments テーブル

| カラム名      | 型      | 制約                         | 説明         |
|:------------|:--------|:---------------------------|:-----------|
| id          | String  | PK, UUID自動生成              | コメントID    |
| task_id     | String  | FK(tasks.id), NOT NULL       | タスクID     |
| user_id     | String  | FK(users.id), NOT NULL       | 投稿者ID     |
| content     | Text    | NOT NULL                     | コメント本文   |
| created_at  | String  | NOT NULL                     | 投稿日時(ISO) |

### 3.3 Pydanticスキーマ (`schemas.py`)

各テーブルに対して以下のスキーマパターンを適用:

| パターン        | 用途                  | 備考                              |
|:-------------|:---------------------|:----------------------------------|
| `*Base`      | 共通フィールド定義       | Create/Updateの基底クラス            |
| `*Create`    | POST リクエスト用      | 必須フィールドのみ                    |
| `*Update`    | PATCH リクエスト用     | 全フィールドOptional                  |
| `*Response`  | レスポンス用           | id + from_attributes = True        |

**特記事項**:
- `TaskResponse` には `has_children: bool` フラグを含む（子タスク有無の判定用）
- `TaskUpdate` の `progress` フィールドは `ge=0, le=100` のバリデーション付き
- `ProjectMemberResponse` には `user: UserResponse` をネスト

### 3.4 CRUDロジック (`crud.py`)

| 関数名                 | 引数                                   | 概要                                              |
|:----------------------|:---------------------------------------|:-------------------------------------------------|
| `get_users`           | db, skip, limit                        | ユーザー一覧取得（ページネーション対応）                  |
| `get_statuses`        | db                                     | ステータスマスタ一覧取得（sort_order順）                 |
| `get_projects_for_user`| db, user_id                           | ユーザーが参加するプロジェクト一覧取得                    |
| `get_project_members` | db, project_id                         | プロジェクトメンバー一覧取得                             |
| `add_project_member`  | db, project_id, member                 | メンバー追加                                        |
| `is_admin`            | db, project_id, user_id                | 管理者権限判定 → `bool`                              |
| `get_wbs_tasks`       | db, project_id, parent_id, all_tasks   | タスクツリー取得（遅延読み込み or 全取得）                 |
| `get_task`            | db, task_id                            | 単一タスク取得                                       |
| `create_task`         | db, project_id, task                   | タスク新規作成                                       |
| `update_task`         | db, task_id, task                      | タスク部分更新（exclude_unset）                        |
| `delete_task`         | db, task_id                            | タスク削除（カスケード削除）                             |

**`get_wbs_tasks` の動作パターン**:

| パラメータ                  | 動作                                  |
|:--------------------------|:--------------------------------------|
| `parent_id=None, all_tasks=False` | Level 1 タスクのみ取得               |
| `parent_id=<id>, all_tasks=False` | 指定タスクの直接子タスクのみ取得          |
| `all_tasks=True`                  | プロジェクト全タスクをフラットに取得       |

### 3.5 認証・認可

| 項目               | 実装方式                                      |
|:------------------|:---------------------------------------------|
| パスワード認証       | `POST /api/v1/auth/login` でEmail/PWを検証        |
| ユーザー特定         | `X-User-Id` リクエストヘッダーから取得（疑似認証）   |
| 権限チェック範囲      | タスク操作、メンバー追加、インポート操作等             |
| 権限チェック対象      | Level 1, 2 のタスク等 → `is_admin` 確認         |
| エラーレスポンス      | 401 (認証失敗), 403 (権限不足), 400 (Bad Request) |

### 3.6 初期データ投入 (`seed.py`)

実行コマンド: `source venv/bin/activate && python seed.py`

投入するデータ:

| データ種別          | 内容                                            |
|:-----------------|:-----------------------------------------------|
| ステータスマスタ     | 未着手, 進行中, 完了（3件）                         |
| テストユーザー      | 管理者 太郎 (admin), 一般 花子 (member)             |
| テストプロジェクト   | Webシステム刷新プロジェクト                           |
| メンバー割当       | 太郎=管理者, 花子=一般                               |
| WBSサンプル       | L1: 要件定義フェーズ → L2: 業務要件の整理, システム要件定義 → L3: ヒアリング実施, 要件定義書の作成 |

---

## 4. フロントエンド詳細設計

### 4.1 エントリポイントとルーティング

**`main.jsx`**: `ReactDOM.createRoot` によるレンダリング。`index.css` (Tailwind) を読み込み。

**`App.jsx`**: `BrowserRouter` によるルーティング。

| パス               | コンポーネント      | 概要                     |
|:------------------|:-----------------|:------------------------|
| `/wbs`            | `WbsContainer`   | WBSメイン画面（デフォルト）  |
| `/login`          | `Login`          | 認証および新規ユーザー登録画面|
| `/settings/*`     | `SettingsLayout` | 設定画面群                 |
| `/`               | → `/wbs` redirect | デフォルトリダイレクト       |

### 4.2 グローバルステート (`AppContext.jsx`)

**`AppProvider`** が管理するステート:

| ステート          | 型               | 概要                                    |
|:----------------|:----------------|:---------------------------------------|
| `users`         | `User[]`        | 全ユーザー一覧                             |
| `currentUser`   | `User \| null`  | 現在選択中のユーザー                         |
| `projects`      | `Project[]`     | 現在ユーザーが参加するプロジェクト一覧           |
| `currentProject`| `Project \| null`| 現在選択中のプロジェクト                      |
| `statuses`      | `Status[]`      | ステータスマスタ一覧                         |
| `isAdmin`       | `boolean`       | 現在のプロジェクトにおける管理者フラグ           |

**`api` (axios)**: `baseURL: http://localhost:8000`。ユーザー変更時に `X-User-Id` ヘッダーを自動設定。

**処理フロー**:
1. 初回マウント時にユーザーとステータスを並列取得
2. ユーザー変更 → ヘッダー更新 → プロジェクト一覧再取得 → メンバー情報から管理者判定

### 4.3 カスタムHook (`useWbsData.js`)

```
入力: initialTasks (ツリー構造の配列)
出力: expandedIds, setExpandedIds, toggleExpand, expandAllToLevel, collapseAll, visibleTasks
```

| メソッド            | 引数               | 動作                                       |
|:------------------|:------------------|:------------------------------------------|
| `toggleExpand`    | taskId            | 指定タスクの展開/折りたたみをトグル             |
| `expandAllToLevel`| level, tasks      | 指定レベル未満の全親タスクを展開               |
| `collapseAll`     | (なし)             | 全タスクを折りたたまれた状態にリセット           |
| `setExpandedIds`  | Set<string>       | 展開IDセットを直接設定（全展開ボタン等で使用）   |

**`visibleTasks`** (useMemo): DFSでツリーを走査し、展開されているノードの子要素のみをフラットな配列として返す。

### 4.4 コンポーネント詳細

#### 4.4.1 Sidebar (`Sidebar.jsx`)

| 機能                | 実装方式                                          |
|:-------------------|:------------------------------------------------|
| 開閉トグル           | `useState(isOpen)` で幅を `w-64` ↔ `w-16` 切り替え |
| アニメーション       | `transition-all duration-300`                     |
| 折りたたみ時表示     | ナビアイコンのみ表示。テキストは非表示                   |
| トグル・UI          | サイドバーからの直接ログアウトや、プロジェクトの「＋」ボタン(新規追加)機能を内包 |
| プロジェクト切替     | ボタンクリック → `setCurrentProject()`               |
| ナビゲーション       | `NavLink` (WBSビュー, メンバー管理, ステータスマスタ)     |
| 管理者バッジ         | `isAdmin=true` 時に「管理者権限あり」バッジ表示          |

#### 4.4.2 WbsContainer (`WbsContainer.jsx`)

WBS画面全体を統括する最上位コンポーネント。

| 機能                 | 実装方式                                              |
|:--------------------|:----------------------------------------------------|
| データ取得            | `fetchTasks()` → `/api/v1/projects/{pid}/wbs` をコール |
| ツリー構築            | `buildTree()` でフラットリストからparent/children構造を構築 |
| ペインリサイズ        | `useState(tableWidthPercent)` + マウスドラッグハンドラ    |
| リサイズ範囲          | 20%〜80%の範囲内で左ペイン幅を可変                        |
| ローディング表示      | `Loader2` アイコン + オーバーレイ表示                     |
| 遅延読み込み          | `handleToggleExpand()` で未取得の子タスクをAPI経由で追加取得 |
| 全展開              | `/wbs?all_tasks=true` で全タスク取得 → ツリー再構築 → 全展開 |
| すべて折りたたむ       | `collapseAll()` 呼び出し                               |
| タスク追加           | `TaskFormModal` を開く（新規モード）                      |
| タスク編集           | `TaskFormModal` を開く（編集モード）                      |
| タスク詳細表示        | `TaskDetailPanel` をスライドアウトで表示                   |
| ガントチャート変更通知  | `onTaskChange` コールバック → PATCH API → 再取得          |

#### 4.4.3 TaskTable (`TaskTable.jsx`)

WBSの左ペイン（タスク一覧テーブル）。

| 列名              | 幅         | 内容                            |
|:-----------------|:-----------|:-------------------------------|
| タスク名           | flex-1     | 階層に応じたインデント + 展開/折りたたみアイコン |
| 開始(予定)         | 100px      | `planned_start` を `'YY-MM-DD` 形式 |
| 開始(実績)         | 100px      | `actual_start`                  |
| 終了(予定)         | 100px      | `planned_end`                   |
| 終了(実績)         | 100px      | `actual_end`                    |

**操作ボタン（各行）**: 編集ボタン (onTaskEdit), 子タスク追加ボタン (onTaskAdd)

**インデント**: Level 1 = `pl-4`, Level 2 = `pl-8`, Level 3 = `pl-12`

#### 4.4.4 GanttChart (`GanttChart.jsx`)

WBSの右ペイン（タイムラインチャート）。

| 設定項目         | 値                       |
|:---------------|:------------------------|
| セル幅          | 24px / 日                |
| 表示範囲         | 最小日付の7日前 〜 最大日付の14日後 |
| 行の高さ         | 40px                    |
| ヘッダー表示      | 年月（月単位のグルーピング）+ 日（1日単位） |

**タスクバーの色分け（Level別）**:

| Level | 計画バー色                  | 進捗バー色                   |
|:------|:--------------------------|:---------------------------|
| 1     | `bg-blue-300/50`          | `bg-blue-500`              |
| 2     | `bg-emerald-300/50`       | `bg-emerald-500`           |
| 3     | `bg-amber-300/50`         | `bg-amber-500`             |

**ドラッグ操作**:

| アクション          | 操作対象           | 変更される値                      |
|:-----------------|:-----------------|:-------------------------------|
| `move`           | バーの中央部        | `planned_start`, `planned_end` (日数差を維持して平行移動) |
| `resize-start`   | バーの左端 (6px)    | `planned_start` のみ変更         |
| `resize-end`     | バーの右端 (6px)    | `planned_end` のみ変更           |
| `progress`       | バー内部の進捗境界    | `progress` (0〜100) の値変更     |

**ドラッグ完了時**: `onTaskChange(taskId, { planned_start, planned_end, progress })` を呼び出し、親の `WbsContainer` 経由で PATCH API によりサーバーへ永続化。

#### 4.4.5 TaskFormModal (`TaskFormModal.jsx`)

タスクの新規追加専用モーダルダイアログ。

| フィールド       | 型          | 備考                             |
|:--------------|:-----------|:--------------------------------|
| タスク名       | text        | 必須                              |
| 開始予定日     | date        | 任意                              |
| 終了予定日     | date        | 任意                              |
| 開始実績日     | date        | 任意                              |
| 終了実績日     | date        | 任意                              |
| 進捗率        | number      | 0〜100                            |
| ステータス     | select      | ステータスマスタから動的生成           |
| 担当者        | select      | プロジェクトメンバーから動的生成        |
| 備考          | textarea    | 任意                               |

**動作モード**:
- 送信先 `POST /api/v1/projects/{pid}/tasks`
- 親タスク指定があれば、子タスク(Level 2/3)として作成。なければLevel 1として作成。

#### 4.4.6 TaskDetailPanel (`TaskDetailPanel.jsx`)

タスクをクリックした際にスライドアウトで表示されるパネル。
ここでタスクの全項目を直接編集・更新可能（インラインフォーム）。

| セクション     | 内容                                  |
|:------------|:-------------------------------------|
| 基本情報      | タスク名, ステータス, 担当者, 進捗（フォーム入力） |
| 日付情報      | 予定/実績の開始・終了日（フォーム入力）       |
| 備考         | テキストエリア入力                         |
| アクション    | 「変更を保存」ボタン押下で PATCH リクエスト |
| コメント      | ユーザー名 + 日時 + 本文のリスト表示         |
| 成果物       | 名前 + URLリンクのリスト表示と新規追加・削除    |

### 4.5 ユーティリティ (`lib/utils.js`)

| 関数    | 内容                                       |
|:-------|:------------------------------------------|
| `cn()` | `clsx` + `tailwind-merge` による条件付きクラス名結合 |

---

## 5. 画面仕様

### 5.1 WBSメイン画面 (`/wbs`)

```
┌──────────────────┬─────────────────────────────────────────────────┐
│   サイドバー       │              WBSメインエリア                       │
│  (開閉トグル付)    │                                                  │
│                  │  ┌─ ヘッダー ─────────────────────────────────────┐ │
│  ユーザー切替      │  │ プロジェクト名 [WBS]  すべて折りたたむ 全展開  +タスク追加 │ │
│                  │  └──────────────────────────────────────────────┘ │
│  プロジェクト一覧   │                                                    │
│                  │  ┌─ 左ペイン ──── ┤ ├─── 右ペイン ────────────────┐  │
│  ナビゲーション     │  │  タスクテーブル   │◄►│   ガントチャート            │  │
│   - WBSビュー     │  │   (階層表示)      │   │   (タイムラインバー)        │  │
│   - メンバー管理   │  │                 │   │                         │  │
│   - ステータスマスタ │  │                 │   │                         │  │
│                  │  └─────────────── ┤ ├──────────────────────────┘  │
└──────────────────┴──────────────────────────────────────────────────┘
                    ◄─── ドラッグハンドルで左右のペイン幅を調整可能 ───►
```

### 5.2 設定画面 (`/settings/*`)

| パス                    | 画面名          | 機能                          |
|:-----------------------|:--------------|:-----------------------------|
| `/settings/members`    | メンバー管理     | プロジェクトメンバーの一覧・追加     |
| `/settings/statuses`   | ステータスマスタ  | ステータスの一覧・追加・編集        |

---

## 6. API詳細仕様

### 6.1 認証・ユーザー・マスタAPI

#### `POST /api/v1/auth/login`
- パスワード検証を行い、成功時にユーザー情報を返す。

#### `POST /api/v1/users`
- 新規ユーザーアカウントを作成し、DBへパスワードをハッシュ化して保存。

#### `GET /api/v1/users`
- 全ユーザー一覧取得

#### `GET /api/v1/statuses`
- ステータスマスタ一覧取得 (sort_order順)

### 6.2 プロジェクトAPI

#### `GET /api/v1/projects`
- 自身が参加するプロジェクト一覧

#### `POST /api/v1/projects`
- プロジェクト新規作成（作成者は自動でAdmin権限付与）

#### `GET/POST /api/v1/projects/{pid}/members`
- プロジェクトメンバー一覧取得 / 新規メンバー追加

#### `GET /api/v1/projects/{pid}/export`
- プロジェクトのタスクツリーを一括設定してJSON出力

#### `POST /api/v1/projects/{pid}/import`
- JSONタスクツリーを読み込み、内部IDや親子関係を再構築して全体を一括登録

### 6.3 WBS API

#### `GET /api/v1/projects/{pid}/wbs`
- クエリパラメータ: `parent_id` (任意), `all_tasks` (真偽)。遅延フェッチまたは全展開用。

### 6.4 タスクCRUD & 成果物 API

#### `POST /api/v1/projects/{pid}/tasks`
- 新規タスク作成 (Level 1,2 は管理者のみ)

#### `PATCH /api/v1/tasks/{task_id}`
- タスク部分更新 (Level 1,2 は管理者のみ)

#### `DELETE /api/v1/tasks/{task_id}`
- タスク削除（カスケード削除）

#### `POST /api/v1/tasks/{task_id}/deliverables`
- 対象タスクに成果物リンク（名前・URL）を登録する

#### `DELETE /api/v1/deliverables/{deliverable_id}`
- 成果物リンクを削除する

---

## 7. データフロー

### 7.1 初期表示フロー

```
[App マウント]
  │
  ├─ GET /api/v1/users       → users[]
  ├─ GET /api/v1/statuses    → statuses[]
  │
  ├─ (デフォルトユーザー選択)
  │   └─ X-User-Id ヘッダー設定
  │   └─ GET /api/v1/projects → projects[]
  │       └─ (デフォルトプロジェクト選択)
  │           └─ GET /api/v1/projects/{pid}/members → is_admin 判定
  │
  └─ WbsContainer マウント
      └─ GET /api/v1/projects/{pid}/wbs → Level 1 タスク[]
          └─ buildTree() → rawTasks → visibleTasks (useMemo)
```

### 7.2 タスク展開フロー（遅延読み込み）

```
[ユーザーが ▶ アイコンをクリック]
  │
  ├─ handleToggleExpand(taskId)
  │   ├─ 既に展開済み? → toggleExpand(taskId) で折りたたみ
  │   └─ 未展開 & has_children & 子データ未取得?
  │       └─ GET /api/v1/projects/{pid}/wbs?parent_id={taskId}
  │           └─ rawTasks の該当ノードに children を挿入
  │           └─ toggleExpand(taskId) で展開
  │
  └─ visibleTasks が再計算 → TaskTable & GanttChart 再描画
```

### 7.3 全展開フロー

```
[ユーザーが「全展開」ボタンをクリック]
  │
  └─ GET /api/v1/projects/{pid}/wbs?all_tasks=true
      └─ フラットリスト → Map構築 → ツリー構造に変換
      └─ has_children タスクのIDを全て expandedIds にセット
      └─ rawTasks + expandedIds を同時更新
      └─ 全タスクが展開状態で表示
```

### 7.4 ガントチャートのドラッグフロー

```
[マウスダウン: タスクバー上]
  │
  ├─ actionType 判定 (move / resize-start / resize-end / progress)
  │
  ├─ [マウスムーブ]
  │   └─ ドラッグ差分(ピクセル)から日数 or 進捗%を計算
  │   └─ taskPreviews にプレビュー値をセット → バーのリアルタイム更新
  │
  └─ [マウスアップ]
      └─ onTaskChange(taskId, { planned_start, planned_end, progress })
          └─ WbsContainer: PATCH /api/v1/tasks/{taskId}
          └─ fetchTasks() で全体再取得 → 表示更新
```

---

## 8. 非機能要件・制約事項

### 8.1 パフォーマンス

| 項目                  | 対策                                            |
|:---------------------|:-----------------------------------------------|
| 大量タスクの初期表示    | 遅延読み込み（Level 1 のみ初回取得）                  |
| ツリー展開時           | 必要に応じて子タスクを都度API取得                      |
| 全展開時              | `all_tasks=true` で1回のリクエストで全取得             |
| リスト再計算           | `useMemo` でツリー走査結果をメモ化                    |
| ドラッグプレビュー      | 別 state (`taskPreviews`) でローカル更新し、API コールは mouseUp時のみ |

### 8.2 UI/UXガイドライン

| 項目             | ガイドライン                                      |
|:----------------|:-----------------------------------------------|
| 言語             | 全UIテキスト・ボタン・ラベルは日本語                  |
| コードコメント    | ソースコード内のコメントは日本語                       |
| ローディング表示  | `Loader2` スピナー + 半透明オーバーレイ               |
| エラー通知       | `alert()` によるシンプルなエラー表示                  |
| レスポンシブ      | 左ペイン最小幅: 300px, リサイズ範囲: 20%〜80%        |
| トランジション    | サイドバー開閉: `transition-all duration-300`       |

### 8.3 セキュリティ

| 項目               | 現状の実装                 | 本番運用時の推奨                    |
|:------------------|:------------------------|:--------------------------------|
| 認証方式           | `X-User-Id` ヘッダー (疑似) | JWT トークン認証への移行             |
| CORS             | `allow_origins=["*"]`    | フロントエンドのオリジンに限定          |
| SQLインジェクション  | SQLAlchemy ORM で対策済み  | -                                |

### 8.4 今後の拡張候補

| 機能                    | 概要                                          | 優先度  |
|:-----------------------|:---------------------------------------------|:------|
| 進捗の自動ロールアップ    | L3の進捗加重平均 → L2 → L1 へ自動計算            | 高     |
| 仮想スクロール           | 数百行以上のタスク表示時にDOM描画を最適化           | 中     |
| コメントCRUD API        | コメントの追加・編集・削除エンドポイント             | 中     |
| 成果物CRUD API          | 成果物の追加・削除エンドポイント                    | 中     |
| ステータスの使用チェック   | ステータス削除時に使用中タスクがあれば削除ブロック      | 中     |
| プロジェクトCRUD         | プロジェクトの新規作成・編集・削除                   | 低     |
| 実績バーのガントチャート表示 | 計画バーの下に実績バーを重ねて表示                  | 低     |
| JWT認証                 | 本番向けのトークンベース認証への移行                 | 低     |
