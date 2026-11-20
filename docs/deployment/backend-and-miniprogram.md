# 后端与微信小程序部署

## 架构

- `backend/`：独立 Node.js API，只连接 PostgreSQL，不托管小程序代码。
- `miniprogram/`：原生微信小程序工程，通过 HTTPS 请求后端 `/api`。
- `frontend/`：原 React Web 端，保留用于回归或运营备用，不参与小程序发布。

## 后端服务器

1. 将仓库部署到服务器，复制 `backend/.env.example` 为 `backend/.env`。
2. 设置数据库连接、两个至少 64 位的 JWT 密钥和 `NODE_ENV=production`。
   如启用实验性的微信手机号登录，在后端环境变量中配置 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`，
   并确认后端 AppID 与小程序私有配置一致。
3. 启动独立后端：

```bash
docker compose -f docker-compose.backend.yml up -d --build
```

容器只绑定服务器回环地址 `127.0.0.1:3001`。使用 Nginx 或 Caddy 提供公网 HTTPS，例如将
`https://api.example.com/api/` 反向代理到 `http://127.0.0.1:3001/api/`，并将 `/health`
代理到后端健康检查。不要直接把 3001 端口暴露到公网。

## 微信小程序

1. 在已被 Git 忽略的 `miniprogram/project.private.config.json` 顶层设置目标小程序的 `appid`。
2. 用微信开发者工具导入 `miniprogram/`，并确认工具显示的 AppID 与私有配置一致。
3. 在 `miniprogram/config/env.js` 中将 `API_BASE_URL` 改为公网 HTTPS API 地址。
4. 在微信公众平台的“开发管理 -> 开发设置 -> 服务器域名”中，把相同域名加入
   `request` 合法域名。正式小程序不能使用 IP、HTTP 或带非标准端口的开发地址。
5. 在开发者工具中完成预览、真机调试和上传。

小程序当前使用道号和口令登录。后端保留实验性的微信手机号登录接口，须由用户主动授权，
并满足微信对小程序主体类型和认证状态的要求。

小程序请求不使用浏览器 CORS；`CLIENT_ORIGIN` 只影响保留的 Web 客户端。JWT 存储在小程序本地
存储中，服务端返回 401 时会自动清理并回到登录页。AppID 是小程序标识，`WECHAT_APP_SECRET`
是调用微信服务端接口的密钥，只能保存在后端环境变量中。
