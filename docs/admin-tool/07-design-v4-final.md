# 松间叩仙管理台设计 V4：开发定稿

> 状态：三轮反思后的开发基线
> 平台：Windows x64，Visual Studio Community 2026，.NET 10 WPF

## 1. 最终目标

交付可运行 EXE 和安全管理 API，形成完整玩家运营闭环：查到玩家、理解状态、采取动作、验证结果、追溯审计。首版不做直连数据库、任意 SQL、永久删除和无审计写入。

## 2. 首版模块与完成定义

### 2.1 连接与登录

- 配置 API URL，握手显示环境、实例、版本、数据库迁移状态。
- 独立管理员账号登录；角色：owner、operator、support、auditor。
- 管理 JWT 仅内存保存；关闭程序即退出。
- 401 自动回到登录页；403 明确显示缺少权限。

### 2.2 总览

- 玩家总数、今日活跃、7 日活跃、封禁数。
- 灵石存量、活动拍品、未领取邮件、24 小时战斗数。
- 境界分布、最近管理员操作、服务健康状态。

### 2.3 玩家工作台

- 服务端分页搜索、状态/境界筛选、排序。
- 聚合详情：账号、角色、数值、状态、功法、装备、库存、配方、邮件、拍卖、聊天、战斗、游历、突破、审计。
- 时间线合并关键历史。
- 健康检查：气血、倍率、装备门槛、异常状态和队列。
- 动作：封禁/解封、踢下线、调节灵石/奇缘、设置精力、满血、结束异常闭关、清理待处理事件/敌人、修复属性。
- 资产：邮件发放物品/装备/灵石；直接库存纠错；解锁功法/丹谱/炼器谱。

### 2.4 邮件

- 单人邮件，支持物品或装备附件、数量、灵石、有效期。
- 玩家样式预览。
- 请求幂等，发送后可从玩家时间线验证。
- 全服和筛选批量邮件保留服务端任务结构，首版 UI 标为后续开放，不假装完成。

### 2.5 聊天与拍卖

- 聊天分页搜索；隐藏、恢复，保留原文与原因。
- 拍卖按状态、卖家查询；管理员撤拍，物品通过邮件返还。
- 不物理删除聊天或拍品。

### 2.6 公告

- 公告列表、创建、编辑、发布、撤回。
- 标题、正文、优先级、置顶、开始和结束时间。
- 玩家 API 返回当前公告；管理端提供纯文本预览。

### 2.7 内容中心

首版实现完整只读目录和针对核心字段的受控编辑：

- 境界：灵气需求、基础速度、BOSS 门槛、说明。
- 功法：说明、修炼/闭关倍率、突破加成、属性加成、来源、图片。
- 物品：说明、效果、配方、制作时间、来源、图片。
- 装备：属性、门槛、说明、配方、来源、图片。
- 区域、敌人、事件、商店：核心数值、说明和启停字段。

所有字段服务端白名单；修改前显示引用影响摘要；支持按审计记录恢复上一次值。

### 2.8 审计

- 查询管理员操作、目标、结果、原因、时间和前后差异。
- 日志不可通过 API 删除。
- 每个错误显示可复制 requestId。

## 3. 数据库定稿

迁移 `030_admin_console.sql`：

- `admin_users`
- `admin_audit_logs`
- `admin_idempotency_keys`
- `announcements`
- `resource_ledger`
- `users.status/ban_reason/banned_until/session_version`
- `characters.admin_version`
- `chat_messages.moderation_status/moderated_by/moderated_at/moderation_reason`
- `auction_listings` 状态允许 `admin_cancelled`

迁移幂等执行，不创建默认管理员，不修改现有玩家资产。

## 4. 服务端定稿

目录：

- `middleware/adminAuth.js`
- `middleware/adminAuthorize.js`
- `controllers/adminAuthController.js`
- `controllers/adminController.js`
- `routes/admin.js`
- `services/adminService.js`
- `scripts/create-admin.js`

安全要求：

- bcrypt cost 12。
- 管理 JWT audience `songjian-admin`，4 小时过期。
- 登录限流；统一白名单验证。
- 写操作事务、`FOR UPDATE`、幂等键、审计。
- 玩家 auth 检查封禁和 sessionVersion。
- 响应头和 JSON 携带 requestId。

## 5. WPF 定稿

解决方案：`admin-tool/SongJian.AdminTool.slnx`

项目结构：

- `Models`：API DTO 和列表模型。
- `Services`：API、会话、设置、对话框服务。
- `ViewModels`：登录、主窗体和各模块状态。
- `Views`：登录、总览、玩家、邮件、聊天、拍卖、公告、内容、审计、设置。
- `Themes`：颜色、控件样式、图标资源。

界面规则：

- 1440×900 为主设计尺寸，最小 1180×720。
- 固定左导航、紧凑工具栏、主数据表、右侧详情抽屉。
- 颜色不单一：深灰背景、青绿状态、金色重点、红色风险。
- 数字列右对齐；表格稳定列宽；长文本换行或省略并提供完整查看。
- 高风险确认不使用模糊“确定”，按钮写明动作。

## 6. 请求恢复协议

- 客户端为每个写请求生成 GUID 幂等键。
- 服务端保存 method、path、body hash、状态和响应。
- 同键同请求返回原响应；同键不同请求返回 409。
- 客户端超时后调用 `GET /api/admin/requests/:key` 查询结果，再决定是否重试。

## 7. 构建与发布

- 开发构建：Visual Studio/MSBuild `Release|x64`。
- 默认发布：framework-dependent `win-x64`，生成原生入口 EXE。
- 可选发布：self-contained single-file `win-x64`。
- 输出：`artifacts/admin-tool/win-x64/`。
- EXE 不含数据库凭据、管理员密码或 API token。

## 8. 测试矩阵

- 后端单元：权限矩阵、校验、脱敏、健康检查。
- API 集成：登录、分页、封禁会话失效、并发 409、幂等重放、邮件发放、库存不足、撤拍回滚、聊天恢复、公告生命周期、内容非法值。
- 桌面端：启动、连接失败、登录、分页、筛选、确认框、401/403/409/422/500 展示。
- 构建：Visual Studio Release x64 成功，EXE 可启动。
- 安全扫描：发布目录搜索 DB 密码、JWT secret 和管理员密码，必须无匹配。

## 9. 交付清单

- 三轮反思与 V4 定稿文档。
- 数据库迁移和管理员创建脚本。
- 管理 API、测试。
- Visual Studio 解决方案和 WPF 源码。
- Release x64 EXE 和发布目录。
- 安装、首次登录、权限、备份与故障处理文档。

## 10. 明确不做

- EXE 直连 PostgreSQL。
- 任意 SQL 控制台。
- 永久删除玩家、聊天、拍品或审计。
- 在代码或发布包写死账号密码。
- 未经预览的全服批量资产发放。

这些不是缺功能，而是生产安全边界。
