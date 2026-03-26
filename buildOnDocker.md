# Docker Compose 構築手順

MyWBSApps を Docker Compose で起動するための手順です。
用途に合わせて「開発用（ホットリロード有効）」と「本番用（Nginx配信）」の2つのパターンを用意しています。

---

## 1. バックエンドの準備 (共通)

バックエンドの構成は開発・本番ともに共通として進めます（ホットリロードを有効にします）。
`backend` ディレクトリに以下の内容で `Dockerfile` を作成します。

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 依存関係ファイルのコピーとインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# コードのコピー
COPY . .

# FastAPI アプリケーションの起動用コマンド
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

---

## パターンA: 開発用環境 (Viteのホッドリロード使用)

ソースコードを変更したら即座にブラウザに反映される、開発向けの構成です。

### A-1. 開発用 Dockerfile の作成
`frontend` ディレクトリに `Dockerfile.dev` を作成します。

```dockerfile
# frontend/Dockerfile.dev
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

# Vite サーバーを 0.0.0.0 で起動
ENV HOST=0.0.0.0
CMD ["npm", "run", "dev", "--", "--host"]
```

### A-2. 開発用 docker-compose.yml の作成
プロジェクトのルートディレクトリに `docker-compose.dev.yml` を作成します。

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - PYTHONUNBUFFERED=1

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - CHOKIDAR_USEPOLLING=true
    depends_on:
      - backend
```

### A-3. 起動手順 (開発用)
開発用ファイルを指定して起動します。
```bash
docker compose -f docker-compose.dev.yml up -d --build
```
- **フロントエンド**: http://localhost:5173
- **バックエンド API**: http://localhost:8000/docs

---

## パターンB: 本番用環境 (Nginx 配信)

軽量で高速な Nginx を使用して静的ファイルを配信する、本番ライクな構成です。

### B-1. nginx.conf の作成
`frontend` ディレクトリに `nginx.conf` を作成します。React Router などの SPA 用の設定が含まれています。

```nginx
# frontend/nginx.conf
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### B-2. 本番用 Dockerfile の作成
`frontend` ディレクトリにデフォルトの `Dockerfile` を作成します。

```dockerfile
# frontend/Dockerfile
# ---- Build Stage ----
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### B-3. 本番用 docker-compose.yml の作成
プロジェクトのルートディレクトリにデフォルトの `docker-compose.yml` を作成します。

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    depends_on:
      - backend
```

### B-4. 起動手順 (本番用)
デフォルトのファイル名を使用しているため、通常のコマンドで起動します。
```bash
docker compose up -d --build
```
- **フロントエンド**: http://localhost:8080
- **バックエンド API**: http://localhost:8000/docs

---

## コンテナの停止

起動した構成に合わせて停止コマンドを実行してください。

```bash
# 開発用環境を停止する場合
docker compose -f docker-compose.dev.yml down

# 本番用環境を停止する場合
docker compose down
```
