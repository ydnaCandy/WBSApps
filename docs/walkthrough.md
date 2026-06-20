# WBS Management App 機能追加 Walkthrough

ご要望いただいた3つの主な機能改修および追加が完了しました。

## 1. タスク追加時のツリー折りたたみ問題の修正
- **変更点**: WBSのタスクを追加・編集した後に、全体ツリーの「展開状態 (`expandedIds`)」がリセットされないよう改善しました。
- **実装詳細**: テーブル・ガントチャートでの変更送信時に、以前のようにルート階層だけを取り直すのではなく、展開している構造があれば `all_tasks=true` を用いて一気に再取得し、クライアント側でツリーを再構築する [refreshTasks](file:///Users/sandy/Documents/MyGit/WBSApps/frontend/src/components/wbs/WbsContainer.jsx#96-113) 処理を追加しました。

## 2. ログイン機能の実装
- **変更点**: サイドバーでの「疑似的なユーザー切り替えドロップダウン」を廃止し、本番運用を想定した **ログイン画面** を実装しました。
- **実装詳細 (バックエンド)**:
  - [User](file:///Users/sandy/Documents/MyGit/WBSApps/backend/models.py#10-25) テーブルに [password_hash](file:///Users/sandy/Documents/MyGit/WBSApps/backend/crud.py#8-13) を追加。
  - テスト環境用の初期データ ([seed.py](file:///Users/sandy/Documents/MyGit/WBSApps/backend/seed.py)) で、パスワード `password123` をハッシュ化して保存するよう修正。
  - `POST /api/v1/auth/login` エンドポイントを開設し、パスワード認証を実装。
- **実装詳細 (フロントエンド)**:
  - 未認証時は `/login` 画面にリダイレクトし、Email とパスワードの認証フォームを表示。
  - 認証成功後は localStorage および [AppContext](file:///Users/sandy/Documents/MyGit/WBSApps/frontend/src/context/AppContext.jsx#129-130) にユーザー情報を保持し、ログアウト機能をサイドバーに配置しました。

## 3. ガントチャートの予定/実績モード切替
- **変更点**: ガントチャート上部に新たに「予定 / 実績」のトグルスイッチを追加しました。
- **実装詳細**:
  - トグルを「実績」に切り替えると、ガントチャートのタスクバーが「実績日 (`actual_start`, `actual_end`)」に基づいて描画されます。また、実績モード時にはバーの色を落ち着いた色（スレート系）に変更して視覚的に区別できます。
  - チャート全体を表示するための「表示範囲 (`minDate`, `maxDate`)」の計算ロジックに、実績日付も考慮するように修正しました。

## 4. 成果物URL（保存先）の複数登録機能
- **変更点**: タスク詳細パネルから、各タスクに対して複数の「成果物リンク（URL）」を登録・削除できる機能を追加しました。
- **実装詳細**:
  - バックエンドに `POST /api/v1/tasks/{task_id}/deliverables` と `DELETE /api/v1/deliverables/{deliverable_id}` エンドポイントを追加しました。
  - フロントエンドの「タスク詳細パネル」の成果物セクションに、「リンクを追加」ボタンと入力フォーム（表示名、URL）を実装し、一覧表示と個別削除（ゴミ箱アイコン）ができるようにしました。

## 確認方法（ローカルテスト環境）

ターミナルを2つ開いてフロントエンドとバックエンドを起動し、ブラウザでアクセスしてください。

1. **ログイン**
   - [http://localhost:5173](http://localhost:5173) にアクセスするとログイン画面が表示されます。
   - `admin@example.com` / `password123` でログインをお試しください。
2. **ツリー維持・実績モードの確認**
   - ログイン後、WBS画面でいくつかタスクを展開し、新しいタスクを追加してください。保存後もツリーが折りたたまれないことが確認できます。
   - 右上の「予定」と「実績」スイッチを切り替え、ガントチャートの描画が切り替わる動作をご確認ください。
