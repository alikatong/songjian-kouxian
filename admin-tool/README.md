# 松间叩仙管理台

## 打开与构建

使用 Visual Studio Community 2026 打开 `SongJian.AdminTool.sln`，选择 `Release | x64` 构建；或在项目根目录运行：

```powershell
.\scripts\build-admin.ps1
```

自包含单文件输出：

```text
artifacts\admin-tool\win-x64\松间叩仙管理台.exe
```

## 首次使用

1. 先执行 `backend\db\migrate.js`。
2. 使用 `npm run admin:create -- <账号> <强密码> <显示名> owner` 创建首个所有者。
3. 启动后端，然后运行 EXE。
4. 管理 API 地址默认是 `http://127.0.0.1:3001`。

管理台不会保存密码或 JWT，不会包含远程 PostgreSQL 配置。API 地址保存到当前 Windows 用户的 LocalAppData。

## 权限

- `owner`：全部权限。
- `operator`：玩家资产、内容、拍卖、公告。
- `support`：玩家处置、邮件、聊天。
- `auditor`：只读。

权限最终由服务端校验；隐藏或禁用客户端按钮不构成安全边界。

## 高风险操作

所有写操作必须填写原因并经过二次确认。客户端自动生成幂等键；服务端使用事务、乐观版本和不可变审计日志。

不提供玩家永久删除、任意 SQL 或 EXE 直连数据库。

## 设计文档

最终开发基线为 `docs/admin-tool/07-design-v4-final.md`。此前三轮反思文档保留完整决策过程。
