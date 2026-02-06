from flask import Flask, jsonify, request
from datetime import datetime, timedelta
import sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from functools import wraps
import os
import json
import threading
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor

# 导入CORS
from flask_cors import CORS

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'

# 添加CORS支持，允许来自前端的所有请求
CORS(app, resources={
    r"/api/*": {
        "origins": ["*"],  # 允许所有来源
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Origin"]
    }
})

# Database initialization
def init_db():
    conn = sqlite3.connect('risk_platform.db')
    cursor = conn.cursor()
    
    # Drop tables if they exist (for development purposes)
    cursor.execute("DROP TABLE IF EXISTS risk_insights")
    cursor.execute("DROP TABLE IF EXISTS news_items") 
    cursor.execute("DROP TABLE IF EXISTS documents")
    cursor.execute("DROP TABLE IF EXISTS risk_alerts")
    cursor.execute("DROP TABLE IF EXISTS companies")
    cursor.execute("DROP TABLE IF EXISTS users")
    
    # Users table
    cursor.execute('''
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Companies table
    cursor.execute('''
        CREATE TABLE companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            industry TEXT,
            risk_level TEXT DEFAULT '未知',
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Risk alerts table
    cursor.execute('''
        CREATE TABLE risk_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_id INTEGER,
            alert_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            description TEXT,
            source TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies (id)
        )
    ''')
    
    # Documents table
    cursor.execute('''
        CREATE TABLE documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            company_id INTEGER,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'uploaded',
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (company_id) REFERENCES companies (id)
        )
    ''')
    
    # News items table
    cursor.execute('''
        CREATE TABLE news_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL,
            source_url TEXT,
            scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Risk insights table
    cursor.execute('''
        CREATE TABLE risk_insights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            content TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            source_data TEXT,
            generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Insert sample data
    cursor.execute("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
                   ("admin", "admin@example.com", generate_password_hash("admin123"), "admin"))
    
    cursor.execute("INSERT INTO companies (name, industry) VALUES (?, ?)", 
                   ("ABC科技有限公司", "科技"))
    cursor.execute("INSERT INTO companies (name, industry) VALUES (?, ?)", 
                   ("XYZ制造集团", "制造业"))
    cursor.execute("INSERT INTO companies (name, industry) VALUES (?, ?)", 
                   ("EFG金融服务", "金融"))
    
    # Insert sample news data
    sample_news = [
        ("某科技公司因数据泄露面临重大法律风险", "根据最新报道，某知名科技公司因数据泄露事件面临重大法律风险。该公司未能及时保护用户隐私数据，导致大量敏感信息外泄。目前监管部门已介入调查，可能面临数百万美元的罚款。此事件提醒所有企业在数字化转型过程中必须加强数据安全防护措施。", "法律", "https://example.com/news/1", 1),
        ("新兴行业监管政策更新，多家企业需调整合规策略", "新兴行业的监管政策迎来重大更新，多家相关企业需紧急调整合规策略。新政策涵盖了数据处理、消费者保护、反垄断等多个方面。专家建议企业应尽快评估新政策对业务的影响，并制定相应的合规计划。预计未来几个月内，行业将迎来一波合规调整潮。", "监管", "https://example.com/news/2", 1),
        ("金融行业信用风险指数上升至警戒水平", "最新发布的金融行业信用风险指数已上升至警戒水平，引发业界关注。受经济环境变化和市场波动影响，多个金融机构的信贷质量出现下滑。分析师指出，银行等金融机构应加强对贷款组合的风险管理，提前做好应对准备。", "金融", "https://example.com/news/3", 1),
        ("供应链风险评估显示多个关键节点存在隐患", "一项全面的供应链风险评估显示，多个关键节点存在潜在隐患。这些隐患主要包括单一供应商依赖、地理集中度高、应急响应能力不足等问题。专家建议企业应建立多元化的供应网络，提高供应链韧性，并制定详细的应急预案。", "运营", "https://example.com/news/4", 1),
        ("国际制裁影响扩大，跨境业务企业面临新挑战", "随着国际制裁范围的进一步扩大，从事跨境业务的企业面临新的挑战。受影响的企业需要重新评估其国际业务布局，调整供应链结构，并确保遵守各司法管辖区的法律法规。企业应密切关注政策变化，及时调整战略方向。", "国际", "https://example.com/news/5", 1)
    ]
    
    for news in sample_news:
        cursor.execute("INSERT INTO news_items (title, content, category, source_url, user_id) VALUES (?, ?, ?, ?, ?)", news)
    
    # Insert sample insights data
    sample_insights = [
        ("全球供应链风险", "地缘政治紧张局势影响全球供应链稳定性", "当前全球供应链面临多重挑战，包括地缘政治紧张局势、贸易摩擦、自然灾害等因素。企业应采取多元化供应策略，建立弹性供应链体系，以应对不确定性风险。建议企业加强供应链可视化管理，提高风险预警能力。", "高危", "", 1),
        ("金融监管趋严", "新法规出台，金融机构合规成本上升", "随着金融监管政策的不断收紧，金融机构面临更高的合规要求。新法规涵盖资本充足率、风险管理、信息披露等多个方面。机构需投入更多资源进行合规建设，同时也推动了行业的规范化发展。", "中危", "", 1),
        ("网络安全威胁", "勒索软件攻击频率增加，企业面临数据泄露风险", "网络安全威胁持续升级，特别是勒索软件攻击频率显著增加。企业需要建立全面的安全防护体系，包括网络隔离、数据备份、员工培训等措施。同时，应制定应急响应计划，确保在遭受攻击时能够快速恢复。", "中高危", "", 1)
    ]
    
    for insight in sample_insights:
        cursor.execute("INSERT INTO risk_insights (title, description, content, risk_level, source_data, user_id) VALUES (?, ?, ?, ?, ?, ?)", insight)
    
    conn.commit()
    conn.close()

# JWT token decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            token = token.split(" ")[1]  # Remove "Bearer " prefix
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(current_user_id, *args, **kwargs)
    
    return decorated

# Authentication routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    conn = sqlite3.connect('risk_platform.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password_hash, role FROM users WHERE username=?", (username,))
    user = cursor.fetchone()
    conn.close()
    
    if user and check_password_hash(user[2], password):
        token = jwt.encode({
            'user_id': user[0],
            'username': user[1],
            'role': user[3],
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        
        return jsonify({
            'token': token,
            'user': {
                'id': user[0],
                'username': user[1],
                'role': user[3]
            }
        })
    
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    conn = sqlite3.connect('risk_platform.db')
    cursor = conn.cursor()
    
    try:
        password_hash = generate_password_hash(password)
        cursor.execute("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                       (username, email, password_hash))
        conn.commit()
        conn.close()
        return jsonify({'message': 'User registered successfully'}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'message': 'Username or email already exists'}), 400

# News and Insights routes
@app.route('/api/news', methods=['GET'])
@token_required
def get_news(current_user_id):
    category = request.args.get('category')
    skip = int(request.args.get('skip', 0))
    limit = int(request.args.get('limit', 10))
    
    conn = sqlite3.connect('risk_platform.db')
    cursor = conn.cursor()
    
    query = "SELECT id, title, content, category, source_url, scraped_at, created_at FROM news_items WHERE user_id = ?"
    params = [current_user_id]
    
    if category:
        query += " AND category = ?"
        params.append(category)
    
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, skip])
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    news_items = []
    for row in rows:
        news_items.append({
            'id': row[0],
            'title': row[1],
            'content': row[2],
            'category': row[3],
            'source_url': row[4],
            'scraped_at': row[5],
            'created_at': row[6]
        })
    
    conn.close()
    return jsonify(news_items)

@app.route('/api/risk-insights', methods=['GET'])
@token_required
def get_risk_insights(current_user_id):
    risk_level = request.args.get('risk_level')
    skip = int(request.args.get('skip', 0))
    limit = int(request.args.get('limit', 10))
    
    conn = sqlite3.connect('risk_platform.db')
    cursor = conn.cursor()
    
    query = "SELECT id, title, description, content, risk_level, generated_at, created_at FROM risk_insights WHERE user_id = ?"
    params = [current_user_id]
    
    if risk_level:
        query += " AND risk_level = ?"
        params.append(risk_level)
    
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, skip])
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    insights = []
    for row in rows:
        insights.append({
            'id': row[0],
            'title': row[1],
            'description': row[2],
            'content': row[3],
            'risk_level': row[4],
            'generated_at': row[5],
            'created_at': row[6]
        })
    
    conn.close()
    return jsonify(insights)

@app.route('/api/test-data', methods=['POST'])
@token_required
def add_test_data(current_user_id):
    # Add test news data if not exists
    conn = sqlite3.connect('risk_platform.db')
    cursor = conn.cursor()
    
    # Check if test data already exists for this user
    cursor.execute("SELECT COUNT(*) FROM news_items WHERE user_id = ?", (current_user_id,))
    news_count_before = cursor.fetchone()[0]
    
    if news_count_before == 0:
        test_news = [
            ("某科技公司因数据泄露面临重大法律风险", "根据最新报道，某知名科技公司因数据泄露事件面临重大法律风险。该公司未能及时保护用户隐私数据，导致大量敏感信息外泄。目前监管部门已介入调查，可能面临数百万美元的罚款。此事件提醒所有企业在数字化转型过程中必须加强数据安全防护措施。", "法律", "https://example.com/news/1", current_user_id),
            ("新兴行业监管政策更新，多家企业需调整合规策略", "新兴行业的监管政策迎来重大更新，多家相关企业需紧急调整合规策略。新政策涵盖了数据处理、消费者保护、反垄断等多个方面。专家建议企业应尽快评估新政策对业务的影响，并制定相应的合规计划。预计未来几个月内，行业将迎来一波合规调整潮。", "监管", "https://example.com/news/2", current_user_id),
            ("金融行业信用风险指数上升至警戒水平", "最新发布的金融行业信用风险指数已上升至警戒水平，引发业界关注。受经济环境变化和市场波动影响，多个金融机构的信贷质量出现下滑。分析师指出，银行等金融机构应加强对贷款组合的风险管理，提前做好应对准备。", "金融", "https://example.com/news/3", current_user_id),
            ("供应链风险评估显示多个关键节点存在隐患", "一项全面的供应链风险评估显示，多个关键节点存在潜在隐患。这些隐患主要包括单一供应商依赖、地理集中度高、应急响应能力不足等问题。专家建议企业应建立多元化的供应网络，提高供应链韧性，并制定详细的应急预案。", "运营", "https://example.com/news/4", current_user_id),
            ("国际制裁影响扩大，跨境业务企业面临新挑战", "随着国际制裁范围的进一步扩大，从事跨境业务的企业面临新的挑战。受影响的企业需要重新评估其国际业务布局，调整供应链结构，并确保遵守各司法管辖区的法律法规。企业应密切关注政策变化，及时调整战略方向。", "国际", "https://example.com/news/5", current_user_id)
        ]
        
        for news in test_news:
            cursor.execute("INSERT INTO news_items (title, content, category, source_url, user_id) VALUES (?, ?, ?, ?, ?)", news)
    else:
        test_news = []  # Initialize to avoid UnboundLocalError
    
    # Check if test insights already exist for this user
    cursor.execute("SELECT COUNT(*) FROM risk_insights WHERE user_id = ?", (current_user_id,))
    insights_count_before = cursor.fetchone()[0]
    
    if insights_count_before == 0:
        test_insights = [
            ("全球供应链风险", "地缘政治紧张局势影响全球供应链稳定性", "当前全球供应链面临多重挑战，包括地缘政治紧张局势、贸易摩擦、自然灾害等因素。企业应采取多元化供应策略，建立弹性供应链体系，以应对不确定性风险。建议企业加强供应链可视化管理，提高风险预警能力。", "高危", "", current_user_id),
            ("金融监管趋严", "新法规出台，金融机构合规成本上升", "随着金融监管政策的不断收紧，金融机构面临更高的合规要求。新法规涵盖资本充足率、风险管理、信息披露等多个方面。机构需投入更多资源进行合规建设，同时也推动了行业的规范化发展。", "中危", "", current_user_id),
            ("网络安全威胁", "勒索软件攻击频率增加，企业面临数据泄露风险", "网络安全威胁持续升级，特别是勒索软件攻击频率显著增加。企业需要建立全面的安全防护体系，包括网络隔离、数据备份、员工培训等措施。同时，应制定应急响应计划，确保在遭受攻击时能够快速恢复。", "中高危", "", current_user_id)
        ]
        
        for insight in test_insights:
            cursor.execute("INSERT INTO risk_insights (title, description, content, risk_level, source_data, user_id) VALUES (?, ?, ?, ?, ?, ?)", insight)
    else:
        test_insights = []  # Initialize to avoid UnboundLocalError
    
    conn.commit()
    conn.close()
    
    return jsonify({"message": "测试数据已添加", "news_count": len(test_news), "insights_count": len(test_insights)})

# Company routes
@app.route('/api/companies', methods=['GET'])
@token_required
def get_companies(current_user_id):
    conn = sqlite3.connect('risk_platform.db')
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT c.id, c.name, c.industry, c.risk_level, c.last_updated, 
               COUNT(ra.id) as alert_count
        FROM companies c
        LEFT JOIN risk_alerts ra ON c.id = ra.company_id
        GROUP BY c.id
        ORDER BY c.last_updated DESC
    """)
    
    companies = []
    for row in cursor.fetchall():
        companies.append({
            'id': row[0],
            'name': row[1],
            'industry': row[2],
            'risk_level': row[3],
            'last_updated': row[4],
            'alert_count': row[5]
        })
    
    conn.close()
    return jsonify(companies)

@app.route('/api/companies/<int:company_id>', methods=['GET'])
@token_required
def get_company(current_user_id, company_id):
    conn = sqlite3.connect('risk_platform.db')
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT c.id, c.name, c.industry, c.risk_level, c.last_updated
        FROM companies c
        WHERE c.id = ?
    """, (company_id,))
    
    company = cursor.fetchone()
    if not company:
        conn.close()
        return jsonify({'message': 'Company not found'}), 404
    
    result = {
        'id': company[0],
        'name': company[1],
        'industry': company[2],
        'risk_level': company[3],
        'last_updated': company[4]
    }
    
    # Get risk alerts for this company
    cursor.execute("""
        SELECT id, alert_type, severity, description, source, timestamp
        FROM risk_alerts
        WHERE company_id = ?
        ORDER BY timestamp DESC
    """, (company_id,))
    
    alerts = []
    for row in cursor.fetchall():
        alerts.append({
            'id': row[0],
            'alert_type': row[1],
            'severity': row[2],
            'description': row[3],
            'source': row[4],
            'timestamp': row[5]
        })
    
    result['alerts'] = alerts
    conn.close()
    
    return jsonify(result)

@app.route('/api/companies', methods=['POST'])
@token_required
def add_company(current_user_id):
    data = request.get_json()
    name = data.get('name')
    industry = data.get('industry')
    
    if not name:
        return jsonify({'message': 'Company name is required'}), 400
    
    conn = sqlite3.connect('risk_platform.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("INSERT INTO companies (name, industry) VALUES (?, ?)", (name, industry))
        company_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'id': company_id,
            'name': name,
            'industry': industry,
            'risk_level': '未知',
            'last_updated': datetime.now().isoformat()
        }), 201
    except Exception as e:
        conn.close()
        return jsonify({'message': str(e)}), 500

# Risk alerts routes
@app.route('/api/alerts', methods=['GET'])
@token_required
def get_alerts(current_user_id):
    conn = sqlite3.connect('risk_platform.db')
    cursor = conn.cursor()
    
    # Get all alerts with company info
    cursor.execute("""
        SELECT ra.id, ra.alert_type, ra.severity, ra.description, ra.source, ra.timestamp,
               c.name as company_name
        FROM risk_alerts ra
        JOIN companies c ON ra.company_id = c.id
        ORDER BY ra.timestamp DESC
        LIMIT 50
    """)
    
    alerts = []
    for row in cursor.fetchall():
        alerts.append({
            'id': row[0],
            'alert_type': row[1],
            'severity': row[2],
            'description': row[3],
            'source': row[4],
            'timestamp': row[5],
            'company_name': row[6]
        })
    
    conn.close()
    return jsonify(alerts)

# Document upload route
@app.route('/api/documents', methods=['POST'])
@token_required
def upload_document(current_user_id):
    if 'file' not in request.files:
        return jsonify({'message': 'No file provided'}), 400
    
    file = request.files['file']
    company_id = request.form.get('company_id')
    
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400
    
    # Save file to uploads directory
    import os
    from werkzeug.utils import secure_filename
    import uuid
    
    filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4()}_{filename}"
    filepath = os.path.join('uploads', unique_filename)
    
    # Create uploads directory if it doesn't exist
    os.makedirs('uploads', exist_ok=True)
    
    file.save(filepath)
    
    # Store document info in database
    conn = sqlite3.connect('risk_platform.db')
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO documents (user_id, company_id, filename, filepath, status)
        VALUES (?, ?, ?, ?, ?)
    """, (current_user_id, company_id, filename, filepath, 'uploaded'))
    
    doc_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({
        'id': doc_id,
        'filename': filename,
        'filepath': filepath,
        'upload_time': datetime.now().isoformat(),
        'status': 'uploaded'
    }), 201

# Risk indicators endpoint
@app.route('/api/risk-indicators', methods=['GET'])
@token_required
def get_risk_indicators(current_user_id):
    # Mock data for risk indicators
    indicators = [
        {'id': 1, 'name': '经营状况', 'level': '低', 'change': '+2%', 'color': 'green'},
        {'id': 2, 'name': '法律纠纷', 'level': '中', 'change': '-5%', 'color': 'yellow'},
        {'id': 3, 'name': '高管变动', 'level': '高', 'change': '+15%', 'color': 'red'},
        {'id': 4, 'name': '供应链风险', 'level': '低', 'change': '0%', 'color': 'green'},
    ]
    
    return jsonify(indicators)

# Admin routes (require admin role)
@app.route('/api/admin/users', methods=['GET'])
@token_required
def get_users(current_user_id):
    # Get current user's role
    conn = sqlite3.connect('risk_platform.db')
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM users WHERE id = ?", (current_user_id,))
    user_role = cursor.fetchone()[0]
    
    if user_role != 'admin':
        conn.close()
        return jsonify({'message': 'Admin access required'}), 403
    
    cursor.execute("SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC")
    users = []
    for row in cursor.fetchall():
        users.append({
            'id': row[0],
            'username': row[1],
            'email': row[2],
            'role': row[3],
            'created_at': row[4]
        })
    
    conn.close()
    return jsonify(users)

# Media crawler integration routes (simplified version)
try:
    from simple_media_integration import crawl_company_risks_simple, simple_media_crawler
    print("Simple media crawler integration loaded successfully")
    
    @app.route('/api/media-crawl/company/<company_name>', methods=['GET'])
    @token_required
    def crawl_company_for_risks(current_user_id, company_name):
        """为企业爬取社交媒体上的风险信息"""
        if not crawl_company_risks_simple:
            return jsonify({'error': 'Media crawler not available'}), 500
            
        try:
            # 在后台线程中运行异步爬虫
            def run_crawl():
                return asyncio.run(crawl_company_risks_simple(company_name))
            
            # 使用线程池执行异步函数
            future = ThreadPoolExecutor(max_workers=1).submit(run_crawl)
            results = future.result(timeout=300)  # 5分钟超时
            
            return jsonify(results)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/media-crawl/configure', methods=['POST'])
    @token_required
    def configure_media_crawler(current_user_id):
        """配置媒体爬虫参数"""
        return jsonify({
            'message': 'Configuration not needed for simple crawler',
            'config': {
                'status': 'simple_crawler_active'
            }
        })

except ImportError as e:
    print(f"Failed to load simple media crawler integration: {e}")
    
    @app.route('/api/media-crawl/company/<company_name>', methods=['GET'])
    @token_required
    def crawl_company_for_risks_stub(current_user_id, company_name):
        return jsonify({'error': 'Media crawler not available'}), 500
    
    @app.route('/api/media-crawl/configure', methods=['POST'])
    @token_required
    def configure_media_crawler_stub(current_user_id):
        return jsonify({'error': 'Media crawler not available'}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=8005)