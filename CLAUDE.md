# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# WBS Appsプロジェクト

WBS（Work Breakdown Structure）管理Webアプリ。フロントエンド（React/Vite）とバックエンド（FastAPI/SQLite）のフルスタック構成。

## コミニュケーションルール
- チャット内の対話は日本語を利用すること
- 報告は体言止め。
- 対話はである調を使うこと

## 禁止事項
- rm -rfコマンドは禁止。

## 作業ルール
- ファイルなどを操作する場合は必ずgitでブランチを切って作業すること


---

## 開発コマンド

### バックエンド
```bash
cd backend
source .venv/bin/activate          # 仮想環境の有効化
uvicorn main:app --reload           # 開発サーバー起動 (http://localhost:8000)
python seed.py                      # 初回のみ：テストデータ投入
# API docs: http://localhost:8000/docs
```

### フロントエンド
```bash
cd frontend
npm run dev      # 開発サーバー起動 (http://localhost:5173)
npm run build    # 本番ビルド (dist/ に出力)
npm run lint     # ESLint実行
npm run preview  # 本番ビルドのプレビュー
```

### デモアカウント（seed.py実行後）
| Email | Password | Role |
|-------|----------|------|
| admin@example.com | password123 | Admin |
| member@example.com | password123 | Member |

---

## アーキテクチャ

詳細は [`docs/architecture.md`](docs/architecture.md) を参照。