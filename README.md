# RiskGuard — 企业风险监控系统

Enterprise risk monitoring platform: track companies, news, media sentiment, and risk alerts. Multi-user, admin panel, 2FA, auto backup. React + Flask + SQLite.

---

## 简介

RiskGuard（企业风险监控系统）支持添加关注企业、爬取工商与舆情数据、大模型分析风险与社会评价、仪表盘与风险警报。支持多用户、权限隔离、管理员后台、两步验证与自动备份，适合内网或云服务器部署。

## 主要功能

- **企业管理**：添加/编辑企业，工商信息与舆情爬取（可接爱企查/企查查、MediaCrawler）
- **风险分析**：LLM 分析新闻与媒体评价，风险等级、词云、趋势图表
- **仪表盘**：风险分布、趋势、分类统计
- **企业对比**：多企业并排对比
- **多用户与权限**：注册/登录、JWT、按用户隔离数据、管理员用户管理
- **安全**：两步验证（TOTP）、自动备份、限流、忘记密码（需配置 SMTP）
- **响应式**：支持桌面、平板与手机

## 技术栈

| 端 | 技术 |
|----|------|
| 前端 | React 19, React Router, Tailwind CSS, Recharts |
| 后端 | Flask, SQLite, JWT, pyotp, APScheduler |
| 部署 | Node 静态服务 + 代理，或 Nginx + 后端 |

## 快速开始

```bash
# 克隆
git clone https://github.com/Tutu-Chioa/RiskGuard.git
cd RiskGuard

# 后端
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
# 编辑 backend/.env（生产环境必设 SECRET_KEY、SKIP_DROP_TABLES=1）

# 前端
npm install && cd risk_frontend && npm install && cd ..

# 启动（两个终端）
npm run start:backend    # 后端 8005
npm run serve            # 构建前端并启动静态+代理 3004
```

浏览器访问 **http://localhost:3004**。详细步骤见 [STARTUP.md](STARTUP.md)。

## 项目介绍页

我们提供了一页式产品介绍，方便您快速了解 RiskGuard 的功能与使用场景：

- **在线访问**：<https://tutu-chioa.github.io/RiskGuard/intro.html>
- **本地查看**：克隆仓库后直接打开根目录下的 [intro.html](intro.html)

## 文档

- [STARTUP.md](STARTUP.md) — 本地/服务器启动流程  
- [docs/WHO_DOES_WHAT.md](docs/WHO_DOES_WHAT.md) — 配置项谁来做  
- [docs/DEPLOY_FROM_GITHUB.md](docs/DEPLOY_FROM_GITHUB.md) — 从 GitHub 部署到云服务器  
- [backend/CRAWLER_SETUP.md](backend/CRAWLER_SETUP.md) — 爬虫与 LLM 配置  

## 许可证

本项目采用 [MIT 许可证](LICENSE)。
