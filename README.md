# WBSApps

WBS (Work Breakdown Structure) 管理アプリケーションです。

## ローカル環境 (OS上) でのテスト起動手順

バックエンド(FastAPI)とフロントエンド(React + Vite)は、それぞれ別々のターミナルで起動する必要があります。

### 1. バックエンドの起動 (APIサーバー)

ターミナルを開き、バックエンドディレクトリに移動してAPIサーバーを起動します。

```bash
# バックエンドディレクトリに移動
cd backend

# Python仮想環境の作成と有効化 (Mac環境)
python3 -m venv .venv
source .venv/bin/activate

# 依存パッケージのインストール
pip install -r requirements.txt

# (初回のみ任意) DBと初期データのセットアップ
python seed.py

# 開発サーバーの起動 (http://localhost:8000)
uvicorn main:app --reload
```

### 2. フロントエンドの起動 (Webクライアント)

もう一つ新しいターミナルを開き、フロントエンド側を起動します。

```bash
# フロントエンドディレクトリに移動
cd frontend

# パッケージのインストール
npm install

# 開発用サーバーの起動 (http://localhost:5173)
npm run dev
```

起動後、ブラウザで [http://localhost:5173](http://localhost:5173) にアクセスすることでアプリケーションを操作可能です。

## デモアカウント

初回 `seed.py` 実行後、以下のテストアカウントでログインできます。

- **管理者**: `admin@example.com` / `password123`
- **一般**: `member@example.com` / `password123`

新規ユーザー登録画面から自身のアカウントを作成することも可能です。
また、プロジェクトの追加、エクスポート/インポートなど、タスク管理以外にも各種管理機能をご利用いただけます。