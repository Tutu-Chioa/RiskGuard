# 上线事项：哪些由系统/开发完成，哪些必须您自己做

上线前涉及：**SECRET_KEY、SKIP_DROP_TABLES/FLASK_ENV、HTTPS、生产构建与 API 地址、CORS、备份、管理员配置**。下面区分「已帮你做好 / 可帮你做」与「必须您自己做」的部分。

---

## 一、已帮你做好 / 已由开发完成

| 项目 | 说明 |
|------|------|
| **SECRET_KEY 生成方式** | 已提供脚本：在项目根目录运行 `python backend/scripts/generate_secret_key.py`，会输出一串随机密钥，您只需复制到 `backend/.env` 的 `SECRET_KEY=...`。 |
| **启动时提醒** | 若未改 SECRET_KEY 或未设置 SKIP_DROP_TABLES/FLASK_ENV，后端启动时会在日志里打出警告，提醒您配置。 |
| **.env 模板与说明** | `backend/.env.example` 中已写好生产必配项（SECRET_KEY、SKIP_DROP_TABLES、CORS_ORIGINS）及注释，复制为 `.env` 后按说明填写即可。 |
| **CORS 逻辑** | 后端已支持通过环境变量 `CORS_ORIGINS` 限制允许的前端域名，您只需在 `.env` 里设值。 |
| **自动备份** | 系统已内置每日凌晨 2:00 的数据库自动备份，并可在设置页查看上次备份时间。 |
| **管理员脚本** | 已提供 `python backend/scripts/set_admin.py <用户名>`，您只需在服务器上执行一次并传入自己的用户名。 |
| **生产构建命令** | 前端生产构建与启动方式已定：`npm run build:frontend`、`npm run serve` 等，见 `STARTUP.md`。 |

---

## 二、必须您自己做的（无法代劳）

以下都依赖您的**实际运行环境、域名、部署方式**，只能在您自己的机器或服务器上完成：

| 项目 | 您需要做的 |
|------|------------|
| **SECRET_KEY** | 1）在项目根目录运行 `python backend/scripts/generate_secret_key.py`；2）把输出复制到 `backend/.env`，写成 `SECRET_KEY=刚才复制的字符串`；3）确保 `.env` 不提交到 git、不泄露。 |
| **SKIP_DROP_TABLES / FLASK_ENV** | 在**生产环境启动后端时**设置环境变量。例如：在 `backend/.env` 里写 `SKIP_DROP_TABLES=1` 或 `FLASK_ENV=production`；若用 systemd/Docker/云控制台，则在那里配置同名环境变量。 |
| **HTTPS** | 在您的服务器或云服务上配置：用 Nginx/负载均衡做 SSL 终结、申请并配置证书（如 Let’s Encrypt）、让对外访问只走 https。代码侧无法替您完成。 |
| **生产构建与 API 地址** | 在您自己的环境中执行 `npm run build:frontend`（或 `npm run serve`），并确认访问的是生产地址。若前后端同域（同一台机 + Node 代理或 Nginx 反向代理），一般无需改 API 地址；若前后端分离部署，需您在 Nginx/代理里把 `/api` 指到后端，或后续由开发加「前端配置 API 基地址」再由您在构建时传入。 |
| **CORS** | 在**生产环境**的 `backend/.env` 里设置 `CORS_ORIGINS=https://您的前端域名`（多个用逗号分隔）。域名只有您知道。 |
| **备份（额外保障）** | 系统已有内置自动备份；若需要额外保障，需您在服务器上自己配置 cron 或云备份（例如定期拷贝 `data/` 或整机快照）。 |
| **管理员账号** | 在服务器上执行一次：`python backend/scripts/set_admin.py 您的用户名`（或先注册一个用户再执行）。用户名和服务器访问只有您有。 |

---

## 三、总结对照表

| 事项 | 开发/系统能做的 | 您必须做的 |
|------|------------------|------------|
| SECRET_KEY | 提供生成脚本和 .env 说明 | 运行脚本、把结果填进 .env、保管好不泄露 |
| SKIP_DROP_TABLES / FLASK_ENV | 读环境变量、启动时警告 | 在生产环境启动时真正设置这两个之一 |
| HTTPS | 文档说明必须用 HTTPS | 在您自己的服务器/云上配置证书与 HTTPS |
| 生产构建与 API 地址 | 提供构建命令与部署说明 | 在您环境里执行构建、按您的部署方式配置访问与代理 |
| CORS | 后端已支持 CORS_ORIGINS | 在 .env 里填您的前端域名 |
| 备份 | 已做内置自动备份 | 如需额外备份，自己配 cron 或云备份 |
| 管理员配置 | 提供 set_admin.py 脚本 | 在服务器上执行脚本并传入自己的用户名 |

简言之：**密钥、环境变量、HTTPS、域名、服务器上的命令和备份策略，都必须您在自己的环境中操作；脚本、配置说明、启动提醒和 CORS/备份逻辑，已由这边准备好。**

---

## 四、上传到云服务器后再配置可以吗？

**可以。** 以上需要您做的项，都是在上传、部署到云服务器之后，在**服务器上**再配置即可，无需在本地提前做完。

建议顺序：

1. **上传代码**到云服务器（git clone 或本地上传）。
2. **在服务器上**安装依赖（`pip install -r backend/requirements.txt`、`npm install` 等，见 `STARTUP.md`）。
3. **在服务器上**复制并编辑配置：
   - `cp backend/.env.example backend/.env`
   - 运行 `python backend/scripts/generate_secret_key.py`，把输出填进 `backend/.env` 的 `SECRET_KEY=...`
   - 在 `backend/.env` 中取消注释并设置 `SKIP_DROP_TABLES=1`（或 `FLASK_ENV=production`）
   - 若有域名，设置 `CORS_ORIGINS=https://你的前端域名`
4. **在服务器上**做生产构建并启动（如 `npm run serve` 或按您的部署方式启动后端 + 前端）。
5. 配置 **HTTPS**（Nginx + 证书等，在服务器或负载均衡上完成）。
6. 首次有用户后，在服务器上执行 `python backend/scripts/set_admin.py <用户名>` 设置管理员。

本地开发阶段可以继续用默认配置；上线前在云服务器上按上述步骤做一遍即可。
