# 从 GitHub 部署到云服务器

可以先把项目上传到 GitHub，再在云服务器上通过仓库地址克隆并部署。

---

## 一、上传到 GitHub 前注意

- **不要提交的已由 .gitignore 排除**：`backend/.env`、`data/`（数据库与备份）、`node_modules/`、`risk_frontend/build/` 等已忽略，可放心推代码。
- **不要**把 `backend/.env` 从 .gitignore 里删掉，也不要提交真实密钥。
- 若仓库打算公开，再次确认没有把 `.env`、`data/` 或密钥写进代码。

上传步骤示例（在本地项目目录）：

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/你的仓库名.git
git branch -M main
git push -u origin main
```

---

## 二、云服务器上「用 GitHub 链接」部署（手动一次）

在云服务器上通过 GitHub 链接拉代码并完成首次部署，可以这样做：

```bash
# 1. 克隆（把地址换成你的仓库）
git clone https://github.com/你的用户名/你的仓库名.git sys2
cd sys2

# 2. 后端
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
# 编辑 backend/.env：SECRET_KEY、SKIP_DROP_TABLES=1、CORS_ORIGINS 等
python backend/scripts/generate_secret_key.py   # 输出复制到 .env 的 SECRET_KEY

# 3. 前端
npm install
cd risk_frontend && npm install && cd ..

# 4. 构建并启动（二选一或按你习惯的方式）
# 方式 A：一条命令构建+起服务（前端 3004，后端需另起）
npm run build:frontend && npm run start:server   # 前端静态 + 代理
# 另开终端启动后端：
npm run start:backend   # 或 SKIP_DROP_TABLES=1 python backend/app.py

# 5. 设置管理员（有用户后执行一次）
python backend/scripts/set_admin.py 你的用户名
```

这样就是「给一个 GitHub 链接 → 在服务器上 clone → 配置 .env → 安装依赖 → 构建并启动」，部署一次完成。

---

## 三、「自动部署」：push 后服务器自动更新

若希望**每次 push 到 GitHub 后，云服务器自动拉代码并重启**，需要额外做一层「自动拉取 + 重启」的配置，而不是只给一个链接。常见两种方式：

### 方式 1：服务器上定时拉取（简单）

在服务器上写一个 cron，每隔几分钟执行一次（例如每 5 分钟）：

```bash
cd /path/to/sys2 && git pull && npm run build:frontend && (pm2 restart all 或 你用的重启命令)
```

或写成一个脚本 `deploy.sh`，在脚本里 `git pull`、`npm run build:frontend`、重启后端/前端进程，再让 cron 只执行这个脚本。

### 方式 2：GitHub 推送时触发（Webhook + 脚本）

1. 在服务器上放一个脚本（如 `deploy.sh`）：里面执行 `cd /path/to/sys2 && git pull && npm run build:frontend && 重启服务`。
2. 用 Nginx 或一个小 HTTP 服务暴露一个「仅你自己知道的」URL（例如 `/deploy?token=xxx`），该 URL 被请求时执行上述脚本。
3. 在 GitHub 仓库 **Settings → Webhooks** 里添加一个 Webhook：  
   - Payload URL 填上面的地址；  
   - 选择 “Just the push event”；  
   这样每次 push 会请求该 URL，服务器就会自动拉代码并重启。

这样就是「push 到 GitHub → 自动触发服务器上的拉取和重启」，实现自动部署。

---

## 四、小结

| 问题 | 答案 |
|------|------|
| 可以上传到 GitHub 吗？ | 可以，.gitignore 已排除 .env、data/ 等，按正常流程 push 即可。 |
| 云服务器用 GitHub 链接能部署吗？ | 可以：在服务器上 `git clone 你的仓库地址`，然后按上面步骤装依赖、配 .env、构建、启动。 |
| 给一个链接就能「自动」部署吗？ | 第一次需要在服务器上手动 clone + 配置一次；之后若要做「push 就自动更新」，需要再配定时任务或 GitHub Webhook（见第三节）。 |

总结：**可以上传到 GitHub，云服务器用你的 GitHub 仓库地址 clone 后按文档配置即可完成部署；** 若还要「push 后自动更新」，需要自己在服务器上加一层拉取与重启逻辑（定时或 Webhook）。
