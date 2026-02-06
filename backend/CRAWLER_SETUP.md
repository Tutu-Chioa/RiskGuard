# 爬虫启用说明

本系统有两类爬虫：**企业工商信息** 与 **媒体舆情**。默认均为模拟数据，按下方步骤可启用真实爬取。

---

## 一、企业工商信息（爱企查 / 企查查）

当前实现：`backend/services/enterprise_crawler.py`

### 启用方式

1. 申请爱企查或企查查 API（需付费或试用）。
2. 设置环境变量后启动后端：

```bash
export AIQICHA_API_BASE="https://api.example.com"   # 接口根地址
export AIQICHA_API_KEY="your-api-key"               # API Key
python backend/app.py
```

或在 `.env` 中配置后由应用加载：

```env
AIQICHA_API_BASE=https://api.example.com
AIQICHA_API_KEY=your-api-key
```

3. 在 `enterprise_crawler.py` 的 `_parse_api_response(data, name)` 中，按实际接口文档解析返回的 JSON 并映射到所需字段。

### 触发时机

- **添加企业**：新建企业后会自动后台爬取工商信息。
- **手动爬取**：企业详情页点击「手动爬取」按钮。

---

## 二、媒体舆情（MediaCrawler）✅ 已集成

当前实现：`backend/services/mediacrawler_service.py` + `crawler.py` 中的 `trigger_media_crawl()`

### 默认行为

未配置 MediaCrawler 时，返回模拟的微博、知乎、B 站等平台评价数据。

### 启用真实爬取

1. **克隆并安装 MediaCrawler**

```bash
git clone https://github.com/NanmiCoder/MediaCrawler.git
cd MediaCrawler
uv sync                    # 或 pip install -r requirements.txt
uv run playwright install  # 安装浏览器驱动
```

2. **首次扫码登录（推荐）**

首次使用需扫码登录以保存登录态，之后可无头运行：

```bash
cd MediaCrawler
uv run main.py --platform xhs --lt qrcode --type search --keywords "测试"
# 打开 APP 扫二维码完成登录，登录态会缓存
```

3. **配置本系统环境变量**

启动本系统后端时设置 MediaCrawler 项目路径：

```bash
export MEDIACRAWLER_PATH="/path/to/MediaCrawler"
python backend/app.py
```

或创建 `backend/.env`（需自行加载）：

```env
MEDIACRAWLER_PATH=/path/to/MediaCrawler
MEDIACRAWLER_PLATFORM=xhs
MEDIACRAWLER_TIMEOUT=180
```

4. **可选环境变量**

| 变量 | 说明 | 默认 |
|------|------|------|
| MEDIACRAWLER_PATH | MediaCrawler 项目根目录 | 空（禁用） |
| MEDIACRAWLER_PLATFORM | 默认平台 xhs/dy/ks/bili/wb/tieba/zhihu | xhs |
| MEDIACRAWLER_TIMEOUT | 爬取超时秒数 | 180 |

5. **API 检查状态**：`GET /api/mediacrawler/status` 可检查 MediaCrawler 是否已配置并可用。

6. **LLM 分析**：在 **系统设置 > AI/LLM 配置** 中填写 API Key、Base URL 和模型，系统会使用大模型分析爬取到的媒体内容并生成社会评价摘要。

### 首次爬取与定时更新

- **首次爬取（添加企业后）**：无时间区间限制，按企业名作为关键词在平台搜索，条数由 MediaCrawler 配置（如 `CRAWLER_MAX_NOTES_COUNT`，默认约 15 条）决定。如需调整首次拉取量，可修改 MediaCrawler 项目内 `config/base_config.py` 的 `CRAWLER_MAX_NOTES_COUNT`、`START_PAGE` 等。
- **定时自动爬取**：安装 APScheduler 后，定时任务除刷新工商/新闻外，会**同时触发媒体舆情爬取**。入库时按 `(company_id, platform, title)` 去重，**只插入新条目**，相当于在已有数据基础上做增量更新，不会因重复爬取而重复插入同一条内容。

---

## 三、定时刷新

安装 APScheduler 后，系统会按用户设置的间隔自动刷新企业信息：

```bash
pip install APScheduler
```

间隔在 **系统设置 > 数据刷新与报告格式** 中配置（默认 30 分钟）。

---

## 四、流程概览

```
添加企业 / 手动爬取
    ↓
企业工商信息（enterprise_crawler）← 需配置 AIQICHA_API_*
    ↓
媒体舆情（crawler.trigger_media_crawl）← 需部署 MediaCrawler
    ↓
LLM 分析（llm_service）← 需在系统设置配置 LLM API
    ↓
结果写入数据库并展示
```
