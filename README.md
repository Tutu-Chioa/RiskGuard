# RiskGuard — 企业风险监控系统

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

企业风险监控平台：企业跟踪、新闻与舆情、LLM 风险分析、仪表盘。多用户、两步验证、自动备份。React + Flask + SQLite。

**仓库**：[https://github.com/Tutu-Chioa/RiskGuard](https://github.com/Tutu-Chioa/RiskGuard)

---

## 简介

RiskGuard 支持添加关注企业、爬取工商与舆情数据、大模型分析风险与社会评价、风险时间序列与预测、仪表盘与风险警报。提供系统说明页与数据表管理（DbViewer），便于理解计算逻辑与维护数据。支持多用户、权限隔离、管理员后台、两步验证与自动备份，适合内网或云服务器部署。**macOS 用户**可打包为独立 .app / .dmg，双击运行、无需浏览器与 Python 环境。

## 主要功能

| 模块 | 说明 |
|------|------|
| **企业管理** | 添加/编辑企业，工商信息与舆情爬取（可接爱企查/企查查、MediaCrawler） |
| **风险分析** | LLM 分析新闻与媒体评价，风险等级、词云、趋势图表 |
| **风险预测** | 基于企业风险时间序列的线性趋势 + 宏观指数调整，未来 N 天点预测与约 95% 区间；支持回测（MAE、RMSE、方向准确率、残差标准差） |
| **仪表盘** | 风险分布、趋势、分类统计 |
| **企业对比** | 多企业并排对比 |
| **系统说明与数据管理** | 系统说明页（数据流、计算依据、关键表）；DbViewer 查看/编辑核心数据表（需管理员） |
| **多用户与权限** | 注册/登录、JWT、按用户隔离数据、管理员用户管理 |
| **安全** | 两步验证（TOTP）、自动备份、限流、忘记密码（需配置 SMTP） |
| **响应式** | 支持桌面、平板与手机 |

## 技术栈

| 端 | 技术 |
|----|------|
| 前端 | React 19, React Router, Tailwind CSS, Recharts |
| 后端 | Flask, SQLite, JWT, pyotp, APScheduler |
| 桌面端（可选） | pywebview（仅 macOS），独立窗口、关窗隐藏、程序坞点击恢复 |
| 部署 | Node 静态 + 代理，或 Nginx + 后端；Mac 可打包为 .app / .dmg |

## 快速开始

### 方式一：本地开发（前后端分离）

```bash
git clone https://github.com/Tutu-Chioa/RiskGuard.git
cd RiskGuard

# 后端
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
# 编辑 backend/.env（生产必设 SECRET_KEY、SKIP_DROP_TABLES=1）

# 前端
npm install && cd risk_frontend && npm install && cd ..

# 启动（两个终端）
npm run start:backend    # 后端 8005
npm run serve            # 构建前端并启动静态+代理 3004
```

浏览器访问 **http://localhost:3004**。详细步骤见 [STARTUP.md](STARTUP.md)。

### 方式二：桌面窗口（仅 macOS，不依赖浏览器）

```bash
pip install pywebview
# 若窗口无法打开：pip install pyobjc-framework-WebKit

npm run build:frontend
python backend/run_desktop.py
```

将弹出独立应用窗口；关窗后仅隐藏，点击程序坞图标可再次打开。

### 方式三：Mac 打包为 .app / .dmg（分发给他人）

在项目根目录执行（需已安装 create-dmg：`brew install create-dmg`）：

```bash
./scripts/build_mac_app_standalone.sh
```

得到 **dist/RiskGuard.app** 与 **dist/RiskGuard.dmg**。对方将 .app 拖入「应用程序」即可使用，无需安装 Python。详见 [docs/PACKAGE_MAC_DMG.md](docs/PACKAGE_MAC_DMG.md)。

## 项目介绍页

- **在线**：[https://tutu-chioa.github.io/RiskGuard/intro.html](https://tutu-chioa.github.io/RiskGuard/intro.html)
- **本地**：克隆后打开根目录 [intro.html](intro.html)

## 文档

| 文档 | 说明 |
|------|------|
| [STARTUP.md](STARTUP.md) | 本地/服务器完整启动流程 |
| [docs/PACKAGE_MAC_DMG.md](docs/PACKAGE_MAC_DMG.md) | Mac 打包 .app / .dmg、桌面窗口模式 |
| [docs/PREDICTION_METHODOLOGY.md](docs/PREDICTION_METHODOLOGY.md) | 风险预测方法（假设、公式、回测、配置与局限） |
| [docs/计算过程与底层逻辑.md](docs/计算过程与底层逻辑.md) | 从原始数据到风险分与预测的整体计算流程与公式 |
| [docs/DB_BROWSER_使用说明.md](docs/DB_BROWSER_使用说明.md) | 用 DB Browser for SQLite 查看/维护数据库 |
| [docs/WHO_DOES_WHAT.md](docs/WHO_DOES_WHAT.md) | 配置项说明 |
| [docs/DEPLOY_FROM_GITHUB.md](docs/DEPLOY_FROM_GITHUB.md) | 从 GitHub 部署到云服务器 |
| [backend/CRAWLER_SETUP.md](backend/CRAWLER_SETUP.md) | 爬虫与 LLM 配置 |

## 推送时遇到 SSL 错误

若 `git push` 出现 `SSL_ERROR_SYSCALL` 或连接 GitHub 超时，可改用 **SSH** 推送（需已配置 SSH 密钥）：

```bash
git remote set-url origin git@github.com:Tutu-Chioa/RiskGuard.git
git push origin main
```

或检查网络/代理、防火墙是否拦截 443 端口。

## 许可证

[MIT](LICENSE)
