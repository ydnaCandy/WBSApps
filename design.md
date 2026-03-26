# WBS管理アプリケーション 開発仕様書 (v2.7)

## 1. プロジェクト概要

複数のプロジェクトを切り替えて管理し、各プロジェクトのタスクを3階層（フェーズ / タスク / サブタスク）で構成するWBSアプリケーション。予定・実績の差異管理、進捗の自動ロールアップに加え、ユーザー管理、アクセス権限管理、ステータス等のマスタ管理、および大量データに対応するパフォーマンス最適化を備える。

## 2. 技術スタック

### バックエンド

- Framework: FastAPI (Python 3.10+, venv環境)
- Database: SQLite / SQLAlchemy (ORM)
- Validation: Pydantic v2

### フロントエンド

- Framework: React 18+ (Vite, npm)
- Styling: Tailwind CSS
- Chart Layout: カスタムガントチャート実装 (年月日のタイムライン)
- Icons/Dates: Lucide React / dayjs

## 3. 機能要件

### 3.1 ユーザー・権限管理 (User & Role Management)

- ユーザーマスタ: アプリケーションを利用するユーザーを管理。
- プロジェクトメンバー管理: プロジェクトごとに参加ユーザーを割り当て。
- プロジェクト権限: 参加ユーザーごとに「管理者(Admin)」フラグを保持。
    - 管理者: プロジェクト設定変更、メンバー追加・削除、マスタ編集が可能。また、Level 1 (フェーズ) と Level 2 (タスク) の作成・編集・削除権限を持つ。
    - 一般: Level 3 (サブタスク) の作成・編集・削除、全タスクの閲覧、タスクへのコメント投稿、成果物追加が可能。

### 3.2 マスタ管理 (Master Data)

- ステータスマスタ: タスクのステータス（未着手、進行中、完了など）をDBでマスタ管理し、動的に変更・追加可能にする。
- プロジェクトごとのカスタムステータス、または全体共通マスタとしての運用を想定（初期は全体共通）。

### 3.3 プロジェクト管理 (Multi-Project)

- 複数のプロジェクトを作成・編集・削除・切り替えが可能。
- 自身が参加しているプロジェクトのみ表示される。

### 3.4 3階層タスク管理・予定・実績

- Level 1 (フェーズ) / Level 2 (タスク) / Level 3 (サブタスク) の固定階層。
- 階層の折りたたみ (Collapse/Expand): Level 1、Level 2 の各行には開閉ボタン（トグル）があり、配下のタスク（L2, L3）を折りたたんで非表示にすることができる。
- 一括展開機能: プロジェクト全体のタスクツリーに対して、「すべて折りたたむ（L1のみ表示）」「Level 2まで展開」「すべて展開（L3まで表示）」を一括で行える操作を提供する。
- Level 1 と Level 2 の操作は管理者に限定し、プロジェクトの骨格を保護する。
- 予定・実績の4つの日付管理と、進捗の自動ロールアップ（L3→L2→L1）。
- タスクの担当者は、そのプロジェクトに参加しているユーザーから選択する。

### 3.5 備考・コメント・成果物管理

- タスクごとの備考欄と、ユーザー紐付きのコメント機能。
- Level 3 に対する複数URL（成果物）の紐付け。

### 3.6 画面構成

- ログイン画面 (`/login`): ユーザー認証（ログイン）および新規アカウント作成機能。
- サイドバー: プロジェクト一覧、プロジェクトの新規作成、各種設定（メンバー管理、マスタ管理）へのリンク。
- メイン（左）: WBSテーブル。上部に一括操作ボタンや新規タスク追加ボタンを配置。プロジェクトごとのエクスポート/インポートボタンも備える。
- メイン（右）: ガントチャート。テーブルの折りたたみに連動。「予定」「実績」モードの切り替えにより表示対象の日付（計画or実績）を選択可能。
- 詳細パネル: タスクの全項目（タイトル・ステータス・担当者・予定実績日など）のインライン編集、備考、コメント、成果物リンクの管理画面。
- タスク追加モーダル: 新規タスクの作成専用のダイアログ。
- 設定画面: ユーザー管理、プロジェクトメンバー管理、ステータスマスタ管理。

## 4. データモデル (Database Schema)

### Users Table

| Column | Type | Description |
| :---- | :---- | :---- |
| id | String (PK) | UUID |
| name | String | ユーザー名 |
| email | String | メールアドレス |
| password_hash | String | パスワードハッシュ (PBKDF2) |

### Statuses Table (マスタ)

| Column | Type | Description |
| :---- | :---- | :---- |
| id | String (PK) | UUID |
| name | String | ステータス名 (例: "未着手", "進行中") |
| color | String | UI表示用のカラーコード |
| sort_order | Integer | 表示順 |

### Projects Table

| Column | Type | Description |
| :---- | :---- | :---- |
| id | String (PK) | UUID |
| name | String | プロジェクト名 |
| description | String | プロジェクト概要 |

### ProjectMembers Table (中間テーブル)

| Column | Type | Description |
| :---- | :---- | :---- |
| project_id | String (PK, FK) | プロジェクトID |
| user_id | String (PK, FK) | ユーザーID |
| is_admin | Boolean | 管理者権限フラグ (True/False) |

### Tasks Table

| Column | Type | Description |
| :---- | :---- | :---- |
| id | String (PK) | UUID |
| project_id | String (FK) | 属するプロジェクトID |
| title | String | タスク名 |
| level | Integer | 階層レベル (1, 2, 3) |
| parent_id | String (FK) | 親タスクID |
| planned_start | Date | 開始予定日 |
| planned_end | Date | 終了予定日 |
| actual_start | Date | 開始実績日 |
| actual_end | Date | 終了実績日 |
| progress | Integer | 進捗率 (0-100) |
| assignee_id | String (FK) | 担当者ID (Usersテーブル参照) |
| status_id | String (FK) | ステータスID (Statusesテーブル参照) |
| notes | Text | 備考・メモ |

### Deliverables & Comments Tables

- Deliverables: id, task_id, name, url
- Comments: id, task_id, user_id (FK), content, created_at

## 5. API エンドポイント (FastAPI)

| Method | Path | Description |
| :---- | :---- | :---- |
| POST | /api/v1/auth/login | メールアドレスとパスワードによる認証 |
| GET | /api/v1/users | ユーザー一覧取得 |
| POST | /api/v1/users | ユーザー新規登録 |
| GET | /api/v1/statuses | ステータスマスタ一覧取得 |
| GET | /api/v1/projects | 自身が参加するプロジェクト一覧取得 |
| POST | /api/v1/projects | プロジェクト新規作成（作成者は自動で管理者権限付与） |
| GET/POST | /api/v1/projects/{pid}/members | プロジェクトメンバーの取得・追加 |
| GET | /api/v1/projects/{pid}/export | タスクツリー一式をJSONでエクスポート |
| POST | /api/v1/projects/{pid}/import | JSONファイルのアップロードによるタスクツリーのインポート |
| GET | /api/v1/projects/{pid}/wbs | 指定プロジェクトのタスクツリー取得（遅延読み込み、全取得両対応） |
| POST/PATCH | /api/v1/tasks | タスク作成・更新 |
| DELETE | /api/v1/tasks/{id} | タスク削除 |
| POST | /api/v1/tasks/{id}/deliverables | 成果物リンク追加 |
| DELETE | /api/v1/deliverables/{id} | 成果物リンク削除 |

## 6. フロントエンド構成 (React)

- App.jsx: ルーティング設定（WBS画面、設定画面の切り替え）。
- Sidebar.jsx: プロジェクト切り替え、設定メニューへの導線。
- WbsContainer.jsx / TaskTable.jsx / GanttChart.jsx: メインWBS画面。
- Settings/ (Dir): MemberManagement.jsx, StatusMaster.jsx などの設定画面コンポーネント。

## 7. AIエージェントへの指示

### 1. バックエンド構築

- Users, ProjectMembers, Statuses テーブルを追加し、Tasks や Comments との正しい外部キー参照（FK）を設定せよ。
- 権限チェック: タスクの作成（POST）、更新（PATCH）、削除（DELETE）APIにおいて、操作対象のタスクが level=1 または level=2 の場合、リクエストしたユーザーが対象プロジェクトの管理者（is_admin == True）であるかを検証せよ。権限がない場合は 403 Forbidden を返すこと。
- パフォーマンス対策: /api/v1/projects/{pid}/wbs において、タスク数が膨大になることを想定し、段階的データ取得（例: 最初はLevel 1のみ取得し、展開時にLevel 2以下を取得する遅延読み込み）またはページネーションをサポートする設計にせよ。

### 2. フロントエンド構築

- UI言語: アプリケーションの画面に表示されるテキスト（ボタン、ラベル、プレースホルダー、通知メッセージなど）は基本的にすべて日本語で実装せよ。
- パフォーマンス対策とローディング: プロジェクト切り替え時やデータ取得時は、ローディングスピナーやスケルトンスクリーンを表示し、ユーザーに読み込み中であることを明示せよ。また、大量データ描画時のフリーズを防ぐため、仮想スクロール（Virtualization）の導入も検討せよ。
- 折りたたみ機能 (Collapse/Expand) と 一括展開:
    - WBSテーブルの Level 1、Level 2 行に開閉アイコン（▶ や ▼）を配置し、配下タスクの表示/非表示を個別に切り替えられるようにせよ。この開閉状態はガントチャート側の描画にも同期させること。
    - ツールバー等に「Level 2まで展開」などの一括操作ボタンを配置し、クリック時に表示状態を一括で変更する（必要に応じてバックエンドから該当レベルまでのデータをまとめてフェッチする）処理を実装せよ。
- タスクの「ステータス」および「担当者」の編集は、マスタに基づく select またはドロップダウンUIで実装せよ。
- is_admin フラグをコンテキスト等で管理し、管理者以外はLevel 1/2の編集操作を非活性化せよ。

## 8. 非機能要件

- 初期データ (Seed): データベース初期化時、デフォルトのステータス（未着手、進行中、完了）を Statuses テーブルに自動投入するスクリプトを用意すること。
- 整合性: ステータスマスタを削除する場合、すでにそのステータスを使用しているタスクが存在するかのチェックを行い、使用中なら削除をブロックすること。
- UX (体感速度): プロジェクト切り替え時、数件ずつのデータ取得や初期表示の軽量化を行うことで、ユーザーが待たされていると感じない設計とすること。