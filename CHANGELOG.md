# 更新日志

## [未发布] - 2025-02-05

### 新增

- **通知中心（站内消息）**
  - 后端：`notifications`、`task_runs` 表，`GET/PATCH /api/notifications`、全部已读接口
  - 前端：顶部导航栏通知铃铛、未读角标、下拉列表、标为已读/全部已读、跳转企业

- **预警规则与业务联动**
  - 新建风险警报时根据用户收藏与预警规则（新警报/风险升级）推送站内通知并可选发送邮件

- **风险警报增强**
  - 按严重程度筛选（全部/高/中/低），支持中英文 severity 匹配
  - 警报卡片展示「已处理」状态，支持「标记已处理」按钮（`PATCH /api/alerts/<id>`）
  - `risk_alerts` 表增加 `processed_at` 字段

- **尽调补充 / AI 助手**
  - 企业详情页尽调补充区块：对话历史、输入、发送并归集、语音
  - 接口增加权限校验：仅收藏该企业的用户可访问

- **报告导出 PDF**
  - `GET /api/companies/<id>/export-pdf`，使用 reportlab 生成企业风险评估 PDF
  - 前端企业详情页增加「导出 PDF」按钮

- **多维度风险量化与展示**
  - 企业详情页新闻列表与弹窗展示多维度风险标签（法律/财务/经营/舆情等），数据来自 `company_news.risk_dimensions`

- **企业级 RAG 问答（「问这家企业」）**
  - 后端：`llm_service.ask_company_question`、`POST /api/companies/<id>/ask`，基于企业信息与新闻上下文回答
  - 前端：企业详情页「问这家企业」输入框与答案展示

- **任务状态页细化**
  - 大模型搜索新闻任务写入 `task_runs`（进行中/成功/失败）
  - `GET /api/task-status/detailed` 返回最近任务执行记录（类型、企业、状态、说明、时间）
  - 前端任务状态页「最近任务执行记录」表格，支持跳转企业详情

- **API 文档（OpenAPI/Swagger）**
  - `backend/openapi.yaml`（OpenAPI 3.0），`GET /api/openapi.yaml`、`GET /api/docs`（Swagger UI）
  - 设置页左侧增加「API 文档（OpenAPI）」入口，新标签打开 `/api/docs`

- **忘记密码流程**
  - 后端已有 `POST /api/auth/forgot-password`、`POST /api/auth/reset-password`
  - 前端 ForgotPasswordPage、ResetPasswordPage 与登录页「忘记密码？」链接已打通

### 变更

- 警报列表接口 `GET /api/alerts` 支持 `?severity=` 筛选，返回项增加 `processed_at`
- 企业尽调补充与 RAG 问答接口增加企业收藏权限校验
- 依赖：`backend/requirements.txt` 增加 `reportlab>=4.0.0`

### 修复

- 警报列表在存在 `processed_at` 列时正确映射 `row[7]`/`row[8]`，兼容无该列时的 8 列返回
- 按严重程度筛选时同时匹配中文（高/中/低）与英文（high/medium/low）存储值
