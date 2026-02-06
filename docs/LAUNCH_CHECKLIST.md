# 正式上线前检查清单

以下按「必须」「强烈建议」「可选」分类，便于在正式上线前逐项落实。

---

## 一、必须完成（不做不宜上线）

### 1. 生产环境密钥与数据库保护

- **SECRET_KEY**：当前默认值为 `your-secret-key-change-in-production`，**必须**在正式环境改为随机强密钥（如 32+ 位随机字符串），否则 JWT 可被伪造。
  - 在 `backend/.env` 中设置：`SECRET_KEY=你的随机长字符串`
- **禁止清空数据库**：首次在生产环境启动时，务必设置：
  - `SKIP_DROP_TABLES=1` 或 `FLASK_ENV=production`
  - 否则会执行 DROP 表并插入示例数据，导致现有用户与数据被清空。
  - 启动示例：`SKIP_DROP_TABLES=1 npm run start:backend`

### 2. HTTPS

- 正式对外访问**必须**走 HTTPS，避免密码、Token 在传输中被窃听或篡改。
- 可用 Nginx / 云厂商负载均衡做 SSL 终结，或后端直接配 SSL（不推荐暴露 Flask 直连公网）。

### 3. 前端生产构建与接口地址

- 使用 `npm run build:frontend` 生成生产包，用 `npm run start:server` 或 Nginx 等提供静态资源。
- 确认生产环境下前端请求的 API 基地址正确（当前通过 Node 代理到 8005；若前后端分离部署，需配置为实际后端域名/端口）。

---

## 二、强烈建议（安全与稳定性）

### 4. CORS 收紧（已支持环境变量）

- 生产环境在 `backend/.env` 中设置：`CORS_ORIGINS=https://你的前端域名`（多个用逗号分隔）。
- 未设置时默认允许所有来源（便于开发）。

### 5. 数据库备份与迁移

- **备份**：已提供脚本 `backend/scripts/backup_db.py`，将 `data/risk_platform.db` 复制到 `data/backup/` 并带时间戳。可配合 cron 定期执行，例如：`0 2 * * * cd /path/to/sys2 && python backend/scripts/backup_db.py`。
- **从旧版升级**：若之前没有按用户隔离，需执行一次性迁移（见 `docs/MULTI_USER_AND_PRODUCTION.md` 中的 SQL 示例）。

### 6. 错误与敏感信息不暴露给用户（已实现）

- 当设置 `FLASK_ENV=production` 或 `SKIP_DROP_TABLES=1` 时，统一错误处理会向前端返回通用文案「服务器内部错误，请稍后再试」，详细异常仅记录在服务端日志。

### 7. 管理员账号（已提供脚本）

- 使用脚本：`python backend/scripts/set_admin.py <用户名>`，可将该用户设为 `admin`。
- 或手动在数据库中执行：`UPDATE users SET role='admin' WHERE username='xxx';`

---

## 三、可选（体验与运维）

### 8. 忘记密码流程（已对接）

- 前端已有「忘记密码」入口与重置页；后端在配置 SMTP 后会发送重置邮件且不再向前端返回 token；未配置时开发模式仍返回 token 便于测试。可选配置 `RESET_PASSWORD_BASE_URL` 作为邮件中重置链接的前端基地址。

### 9. 限流与防暴力破解（已实现）

- 登录、注册、忘记密码接口已按 IP+路径限流：每分钟每端点最多 6 次，超出返回 429「请求过于频繁，请稍后再试」。

### 10. 日志与监控（已实现）

- 已记录：登录失败（用户名、IP）、Token 缺失/过期/无效、管理员权限拒绝、企业访问/操作 403。
- 健康检查：`GET /api/health` 或 `HEAD /api/health` 返回 200 表示服务与数据库可用，可供负载均衡或监控探测。

### 11. 环境变量集中管理

- 将 `SECRET_KEY`、`SMTP_*`、`DATABASE_URL`（若改用 PostgreSQL）等统一放在 `.env` 或部署平台的环境配置中，且不提交到代码库。

---

## 四、已知但非阻塞的未实现/占位（可按需补齐）

以下不影响「能上线」，但影响体验或功能完整度：

| 项目 | 说明 |
|------|------|
| 风险警报页 | 卡片文案仍为写死；可改为对接 `GET /api/alerts` 与真实企业 ID。 |
| 用户设置（姓名、邮箱、警报阈值） | 前端已与后端 `PATCH /api/auth/me` 对接并持久化。 |
| 两因素认证 / 数据备份 | **已实现**：2FA（TOTP 启用/关闭、登录二次验证）、自动备份（每日 2:00 + GET /api/backup/status）。 |
| 忘记密码 | **已实现**：前端入口、重置页、后端发邮件；需配置 SMTP 或管理后台发件人。 |
| 风险警报的自动创建 | 定时任务在风险等级升至「高」时会写入 `risk_alerts`；若从未触发则警报列表可能为空。 |

---

## 五、上线前自检表（可打勾）

- [ ] `SECRET_KEY` 已改为强随机值且未提交到代码库
- [ ] 生产启动已设置 `SKIP_DROP_TABLES=1` 或 `FLASK_ENV=production`
- [ ] 对外访问已启用 HTTPS
- [ ] 前端生产构建并指向正确 API 地址
- [ ] CORS 已收紧：在 .env 中设置 `CORS_ORIGINS=https://你的前端域名`（建议）
- [ ] 数据库有定期备份：可配置 cron 执行 `python backend/scripts/backup_db.py`（建议）
- [ ] 如需管理员：执行 `python backend/scripts/set_admin.py <用户名>`
- [ ] 从旧版升级时，已按需执行 `user_company_favorites` 迁移（见多用户文档）

完成以上必须项与强烈建议项后，即可视为具备正式上线条件；其余为体验与运维增强，可按迭代逐步补齐。
