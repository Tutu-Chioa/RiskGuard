# 完整启动流程

在**项目根目录**下执行以下步骤（路径请按本机实际修改，如 `/Users/xxx/Desktop/sys2`）。

---

## 一、准备（首次或依赖变更时）

### 1. 后端 Python 依赖

```bash
cd /path/to/sys2
pip install -r backend/requirements.txt
# 建议使用虚拟环境：python3 -m venv .venv && source .venv/bin/activate 后再 pip install
```

### 2. 后端环境变量（启用媒体爬虫时必配）

```bash
cd /path/to/sys2/backend
cp .env.example .env
# 编辑 .env，至少设置：
# MEDIACRAWLER_PATH=/path/to/sys2/MediaCrawler   （指向 MediaCrawler 项目根目录）
```

可选项见 `backend/.env.example`（如 `MEDIACRAWLER_PLATFORM`、`MEDIACRAWLER_TIMEOUT`、`SECRET_KEY`、SMTP 等）。

### 3. MediaCrawler（需要企业/测试爬取时）

```bash
cd /path/to/sys2

# 若尚未克隆
git clone https://github.com/NanmiCoder/MediaCrawler.git
# 或下载解压后目录名为 MediaCrawler 或 MediaCrawler-main

# 进入 MediaCrawler 并创建虚拟环境（推荐，与扫码登录、爬取共用）
cd MediaCrawler
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# 若项目使用 uv：uv sync
# 安装浏览器驱动（扫码与爬取需要）
uv run playwright install
# 或：.venv/bin/playwright install
deactivate
cd ..
```

确保 `backend/.env` 中的 `MEDIACRAWLER_PATH` 指向上述 MediaCrawler 根目录（例如 `/path/to/sys2/MediaCrawler`）。

### 4. 前端与静态服务

```bash
cd /path/to/sys2
npm install

cd risk_frontend && npm install && cd ..
```

---

## 二、启动顺序（共需两个终端）

### 终端 1：启动后端（Flask，端口 8005）

```bash
cd /path/to/sys2
npm run start:backend
# 或：python backend/app.py
```

保持运行，看到类似 `Running on http://0.0.0.0:8005` 即可。

**生产环境建议**：设置环境变量后再启动，避免覆盖数据、泄露密钥：

- `SECRET_KEY`：JWT 密钥，务必改为随机长字符串
- `SKIP_DROP_TABLES=1` 或 `FLASK_ENV=production`：启动时仅执行数据库迁移（加表/加列），不 DROP 表、不插入示例数据

---

### 终端 2：构建前端并启动静态服务（端口 3004）

```bash
cd /path/to/sys2

# 方式 A：一条命令完成「构建 + 启动」
npm run serve

# 方式 B：分步执行
npm run build:frontend   # 构建前端到 risk_frontend/build
npm run start:server     # 启动 Node 服务（提供页面 + 代理 /api 到 8005）
```

保持运行，看到前端服务在 3004 端口即可（如 `Frontend server running on http://localhost:3004`）。

---

## 三、访问

- 浏览器打开：**http://localhost:3004**
- 前端页面由 3004 提供，接口 `/api/*` 会自动代理到后端 8005。

---

## 四、媒体爬虫（可选）

- **扫码登录**：系统设置 → 平台登录（媒体爬虫）→ 选择平台 →「生成二维码」，扫码后登录态会保存，用于后续企业/测试爬取。
- **测试爬取**：同一页面可输入关键词（如「美团」）后点击「测试爬取（美团）」验证爬虫与登录态是否正常。
- 未配置 `MEDIACRAWLER_PATH` 或未登录时，爬取可能返回 0 条或提示先扫码/上传 Cookie。

---

## 五、端口与脚本对照

| 端口 | 作用           | 启动命令              |
|------|----------------|------------------------|
| 8005 | 后端 API       | `npm run start:backend` |
| 3004 | 前端页面 + 代理 | `npm run start:server`（需先构建） |

| 脚本 | 说明 |
|------|------|
| `npm run start:backend`   | 启动 Flask 后端 |
| `npm run build:frontend`  | 构建前端（CI 模式，减少 ECANCELED） |
| `npm run start:server`   | 启动前端静态服务 + API 代理（依赖已构建的 build） |
| `npm run serve`           | 先 build:frontend，再 start:server |
| `npm run start:frontend`  | 开发模式：仅启动前端 dev server（端口见 risk_frontend，可配 proxy 到 8005） |

---

## 六、开发模式（可选）

若只改前端、且希望热更新，可不用「构建 + Node 服务」：

- **终端 1**：`npm run start:backend`（后端 8005）
- **终端 2**：`npm run start:frontend`（前端 dev，默认 3000；通过 risk_frontend 的 proxy 访问 8005）

此时直接访问前端 dev 的地址即可。

---

## 七、一键命令汇总（复制即用，请改路径）

```bash
# 假设项目在 /Users/chengzi/Desktop/sys2
cd /Users/chengzi/Desktop/sys2

# 首次准备
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
# 编辑 backend/.env，设置 MEDIACRAWLER_PATH=/Users/chengzi/Desktop/sys2/MediaCrawler

npm install
cd risk_frontend && npm install && cd ..

# MediaCrawler 首次（可选）
# cd MediaCrawler && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && uv run playwright install && deactivate && cd ..

# 启动（两个终端）
# 终端1:
npm run start:backend

# 终端2:
npm run serve
```

然后浏览器访问 **http://localhost:3004**。
