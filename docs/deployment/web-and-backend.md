# 网页端与后端部署

网页由 `frontend/` 构建，浏览器通过同一域名下的 `/api/` 访问 `backend/`。后端使用 PostgreSQL，启动时执行数据库迁移。玩家使用账号和密码登录。

## Docker Compose 完整部署

完整部署包含 PostgreSQL、Express API 和 Nginx。将仓库根目录的 `.env.example` 复制为 `.env`，设置数据库密码、至少 64 位的 `JWT_SECRET`，并将 `CLIENT_ORIGIN` 设为实际访问的网页来源，例如 `https://game.example.com`。来源包含协议和域名，末尾不加斜杠。

```bash
docker compose up -d --build
```

在入口代理上配置 HTTPS，将网页域名转发至 Compose 提供的 HTTP 端口 `80`。浏览器使用 HTTPS 访问，才能正常发送登录会话 Cookie。

## 分开部署网页和 API

1. 将 `backend/.env.example` 复制为 `backend/.env`，填写 PostgreSQL 连接、`JWT_SECRET` 和 `CLIENT_ORIGIN`。启用管理 API 时另外设置 `ADMIN_JWT_SECRET`。
2. 从项目根目录运行 `docker compose -f docker-compose.backend.yml up -d --build`。后端只绑定宿主机回环地址 `127.0.0.1:3001`。
3. 在 `frontend/` 运行 `npm ci` 和 `npm run build`，上传 `dist/` 到静态服务器。使用默认的 `/api` 地址构建网页。
4. 在网页域名上配置 HTTPS，将 `/api/` 转发至 `http://127.0.0.1:3001/api/`，保留请求路径。可通过后端的 `/health` 检查服务状态。

部署后用浏览器测试注册、登录、刷新页面后恢复会话，以及退出登录。
