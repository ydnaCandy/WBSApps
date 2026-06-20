# リリース手順（Docker Compose）

## 構成

```
[ブラウザ]
    ↓ :80
[nginx (frontend コンテナ)]
    /api/* → proxy_pass → [backend コンテナ :8000]
                               ↓
                          [SQLite /app/data/wbs.db]
                          (Docker volume: db-data)
```

## 前提

- Docker / Docker Compose がインストール済みであること
- `release/` ディレクトリから実行すること

## 初回起動

```bash
cd release

# イメージをビルドして起動
docker compose up -d --build

# 初期データ投入（初回のみ）
docker compose exec backend python seed.py
```

アクセス: http://localhost:38080

## 通常の起動・停止

```bash
# 起動
docker compose up -d

# 停止
docker compose down

# ログ確認
docker compose logs -f
```

## コードを更新してデプロイ

```bash
docker compose up -d --build
```

## データのバックアップ・リストア

```bash
# バックアップ
docker run --rm -v release_db-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/wbs_backup.tar.gz -C /data .

# リストア
docker run --rm -v release_db-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/wbs_backup.tar.gz -C /data
```

## ポートを変更する場合

`docker-compose.yml` の `ports` を変更:

```yaml
ports:
  - "9090:80"   # ホスト側のポートを変更
```

## デモアカウント（seed.py 実行後）

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | password123 | Admin |
| member@example.com | password123 | Member |
