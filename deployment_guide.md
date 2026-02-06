# 智能风控平台 - 部署配置

## 项目结构
```
risk-monitoring-platform/
├── backend/                 # 后端服务
│   ├── api/                 # API服务
│   ├── crawlers/            # 爬虫服务
│   ├── analyzers/           # 分析器
│   └── notifications/       # 通知服务
├── frontend/                # 前端界面
├── database/                # 数据库脚本
├── docs/                    # 文档
└── deployment/              # 部署配置
```

## 环境配置

### 1. 后端环境配置
```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt
```

### 2. 环境变量配置 (.env)
```env
# 数据库配置
DATABASE_URL=sqlite:///./risk_platform.db
# 或使用PostgreSQL
# DATABASE_URL=postgresql://user:password@localhost/dbname

# 邮件配置
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# 爬虫配置
SCRAPY_USER_AGENT=Mozilla/5.0 (compatible; RiskBot/1.0)
SCRAPY_CONCURRENT_REQUESTS=16
SCRAPY_DOWNLOAD_DELAY=1

# API配置
API_HOST=0.0.0.0
API_PORT=8000
SECRET_KEY=your-super-secret-key-change-in-production

# Redis配置（用于爬虫队列）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

## 依赖包列表 (requirements.txt)
```txt
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9  # 如果使用PostgreSQL
asyncpg==0.29.0         # 如果使用PostgreSQL异步驱动
aiohttp==3.9.1
beautifulsoup4==4.12.2
requests==2.31.0
pandas==2.1.4
numpy==1.26.2
plotly==5.18.0
jieba==0.42.1
textblob==0.17.1
scrapy==2.11.1
scrapy-redis==0.7.3
redis==5.0.1
python-dotenv==1.0.0
pydantic==2.5.0
alembic==1.13.1
celery==5.3.4
flower==2.0.1  # 用于监控Celery任务
schedule==1.2.0
selenium==4.15.0  # 用于处理JavaScript渲染的页面
webdriver-manager==4.0.1
```

## Docker 配置

### Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://risk_user:risk_pass@db:5432/risk_db
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    volumes:
      - ./data:/app/data

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: risk_db
      POSTGRES_USER: risk_user
      POSTGRES_PASSWORD: risk_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  celery_worker:
    build: .
    command: celery -A celery_app worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://risk_user:risk_pass@db:5432/risk_db
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  celery_beat:
    build: .
    command: celery -A celery_app beat --loglevel=info
    environment:
      - DATABASE_URL=postgresql://risk_user:risk_pass@db:5432/risk_db
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  flower:
    image: mher/flower:2.0
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - FLOWER_PORT=5555
    ports:
      - "5555:5555"
    depends_on:
      - redis

volumes:
  postgres_data:
```

## 启动说明

### 1. 本地开发启动
```bash
# 启动后端API服务
cd backend/api
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 启动爬虫服务
cd backend/crawlers
scrapy crawl risk_monitoring

# 启动前端
cd frontend
npm install
npm run dev
```

### 2. 生产环境启动
```bash
# 使用Docker Compose启动所有服务
docker-compose up -d

# 或者分别启动各个服务
# 启动数据库迁移
alembic upgrade head

# 启动API服务
gunicorn -w 4 -k uvicorn.workers.UvicornWorker api.main:app -b 0.0.0.0:8000

# 启动Celery工作进程
celery -A celery_app worker --loglevel=info

# 启动Celery调度器
celery -A celery_app beat --loglevel=info
```

## API 接口文档

### 1. 企业风险监控
- **POST** `/api/monitor-company/`
  - 请求体: `{"name": "企业名称", "email": "通知邮箱", "phone": "通知手机"}`
  - 响应: 完整的风险分析报告

### 2. 企业信息查询
- **GET** `/api/company/{id}`
  - 获取企业基本信息

### 3. 风险历史
- **GET** `/api/company/{id}/risk-history`
  - 获取企业风险评分历史

### 4. 法律案件
- **GET** `/api/company/{id}/legal-cases`
  - 获取企业相关法律案件

### 5. 媒体报道
- **GET** `/api/company/{id}/media-reports`
  - 获取企业相关新闻报道

## 定时任务配置

使用Celery Beat配置定时任务：

```python
from celery.schedules import crontab

# 每天凌晨2点执行全量扫描
'full_scan_daily': {
    'task': 'tasks.full_company_scan',
    'schedule': crontab(hour=2, minute=0),
},

# 每小时检查一次高风险企业
'high_risk_monitoring': {
    'task': 'tasks.monitor_high_risk_companies',
    'schedule': crontab(minute=0),  # 每小时
},

# 每15分钟检查一次新注册企业
'new_company_monitoring': {
    'task': 'tasks.monitor_new_companies',
    'schedule': crontab(minute='*/15'),  # 每15分钟
},
```

## 监控和日志

### 日志配置
```python
import logging
from logging.handlers import RotatingFileHandler

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    handlers=[
        RotatingFileHandler('logs/app.log', maxBytes=10000000, backupCount=10),
        logging.StreamHandler()
    ]
)
```

### 性能监控
- 使用Prometheus + Grafana进行性能监控
- 集成FastAPI的/metrics端点
- 监控API响应时间、错误率、吞吐量

## 安全配置

### 1. JWT认证
```python
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### 2. 输入验证
- 使用Pydantic进行请求体验证
- 实施速率限制
- 防止SQL注入和XSS攻击

## 部署注意事项

1. **安全性**：
   - 生产环境中必须使用HTTPS
   - 设置强密码和密钥
   - 定期更新依赖包

2. **性能**：
   - 使用Redis作为缓存
   - 数据库索引优化
   - 异步处理大量数据

3. **监控**：
   - 设置错误跟踪（如Sentry）
   - 配置健康检查端点
   - 设置告警机制

4. **备份**：
   - 定期备份数据库
   - 配置灾难恢复计划
   - 测试备份恢复流程
```