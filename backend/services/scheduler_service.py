# -*- coding: utf-8 -*-
"""
定时任务：每 30 分钟（或用户自定义间隔）刷新企业信息；每日自动备份数据库。
"""
import os
import shutil
import json
import sqlite3
import threading
import time
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'risk_platform.db')
BACKUP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'backup')
_scheduler = None


def get_db_path():
    return DB_PATH


def refresh_all_companies():
    """刷新所有企业的工商/舆情/新闻信息"""
    try:
        from services.enterprise_crawler import fetch_company_info, fetch_news_for_company
        from services.llm_service import analyze_sentiment_and_keywords, analyze_news_for_company
        from services.wordcloud_service import generate_wordcloud

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM companies")
        companies = cursor.fetchall()
        cursor.execute("SELECT api_key, base_url, model, enable_web_search FROM llm_config WHERE api_key IS NOT NULL AND api_key != '' LIMIT 1")
        llm_row = cursor.fetchone()
        api_key = base_url = model = None
        enable_web_search = False
        if llm_row:
            api_key, base_url, model = llm_row[0], llm_row[1], llm_row[2]
            enable_web_search = bool(llm_row[3]) if len(llm_row) > 3 else False
        from services.llm_service import fetch_company_info_by_llm

        for cid, cname in companies:
            try:
                # 企业工商、法律等信息：仅用大模型联网搜索
                info = None
                if api_key:
                    llm_info = fetch_company_info_by_llm(cname, api_key, base_url, model, enable_web_search=enable_web_search)
                    if llm_info:
                        info = {}
                        for k, v in llm_info.items():
                            if v is None:
                                continue
                            if isinstance(v, (list, dict)):
                                info[k] = json.dumps(v, ensure_ascii=False) if v else ''
                            elif v not in ('-', '', '无', '未知'):
                                info[k] = str(v).strip()
                            else:
                                info.setdefault(k, '')
                        for f in ('legal_representative','registered_capital','registered_address','industry','business_status','business_scope','equity_structure','established_date','legal_cases','equity_changes','capital_changes'):
                            info.setdefault(f, '')
                if info is None:
                    info = fetch_company_info(cname)
                cursor.execute("""UPDATE companies SET legal_representative=?, registered_capital=?, business_status=?,
                    registered_address=?, business_scope=?, equity_structure=?, established_date=?,
                    industry=COALESCE(NULLIF(industry,''),?), legal_cases=?, equity_changes=?, capital_changes=?,
                    crawl_status='crawled', last_updated=? WHERE id=?""",
                    (info.get('legal_representative',''), info.get('registered_capital',''), info.get('business_status',''),
                     info.get('registered_address',''), info.get('business_scope',''), info.get('equity_structure',''),
                     info.get('established_date',''), info.get('industry',''),
                     info.get('legal_cases',''), info.get('equity_changes',''), info.get('capital_changes',''),
                     datetime.now().isoformat(), cid))

                # 获取媒体舆情文本并分析
                cursor.execute("SELECT content FROM company_media_reviews WHERE company_id=?", (cid,))
                reviews_text = ' '.join(r[0] or '' for r in cursor.fetchall())
                if reviews_text or True:
                    result = analyze_sentiment_and_keywords(cname, reviews_text or '暂无', api_key, base_url, model)
                    new_level = (result.get('risk_level') or '').strip()
                    old_level = ''
                    if new_level == '高':
                        cursor.execute("SELECT risk_level FROM companies WHERE id=?", (cid,))
                        row = cursor.fetchone()
                        old_level = (row[0] or '').strip() if row else ''
                    cursor.execute("UPDATE companies SET social_evaluation=?, risk_level=? WHERE id=?",
                        (result.get('summary',''), result.get('risk_level',''), cid))
                    if new_level == '高' and old_level != '高':
                        try:
                            cursor.execute("""INSERT INTO risk_alerts (company_id, alert_type, severity, description, source) VALUES (?,?,?,?,?)""",
                                (cid, 'company', 'high', '企业风险等级升至高风险', 'scheduler'))
                        except sqlite3.OperationalError:
                            pass
                    for kw in result.get('keywords', [])[:20]:
                        cursor.execute("INSERT OR IGNORE INTO company_keywords (company_id, keyword, weight) VALUES (?,?,1)", (cid, kw))

                # 获取新闻并分析归类
                news_list = fetch_news_for_company(cname)
                for n in news_list:
                    analysis = analyze_news_for_company(cname, n.get('title'), n.get('content'), api_key, base_url, model)
                    cursor.execute("""INSERT INTO company_news (company_id, title, content, source, source_url, sentiment_score, risk_level, category, keywords, publish_date)
                        VALUES (?,?,?,?,?,?,?,?,?,?)""",
                        (cid, n.get('title',''), n.get('content',''), n.get('source',''), n.get('url',''),
                         analysis.get('sentiment_score',0), analysis.get('risk_level',''), analysis.get('category',''),
                         json.dumps(analysis.get('keywords',[]), ensure_ascii=False), n.get('publish_date','')))

                # 定时媒体舆情爬取：基于关键词搜索，入库时按 (company_id, platform, title) 去重，只插入新条目
                try:
                    from services.crawler import trigger_media_crawl
                    from services.media_review_store import save_media_reviews_dedup
                    def _save_reviews(cid2, reviews):
                        save_media_reviews_dedup(DB_PATH, cid2, cname, reviews, api_key, base_url, model)
                    trigger_media_crawl(cid, cname, callback=_save_reviews)
                except Exception as crawl_err:
                    print('Scheduler media crawl trigger error:', cid, cname, crawl_err)

            except Exception as e:
                print('Refresh company error:', cid, cname, e)
        conn.commit()
        conn.close()
    except Exception as e:
        print('Scheduler refresh error:', e)


def refresh_macro_policy_digest():
    """使用大模型（联网）生成宏观政策摘要并写入 macro_policy_digest 表。返回 (成功, 消息)。"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT api_key, base_url, model, enable_web_search FROM llm_config WHERE api_key IS NOT NULL AND api_key != '' LIMIT 1"
        )
        row = cursor.fetchone()
        conn.close()
        if not row:
            return False, '未配置 LLM API，无法生成宏观政策摘要'
        api_key, base_url, model = row[0], row[1], row[2]
        enable_web_search = bool(row[3]) if len(row) > 3 else True
        from services.llm_service import generate_macro_policy_digest
        result = generate_macro_policy_digest(
            api_key=api_key, base_url=base_url, model=model, enable_web_search=enable_web_search
        )
        if not result or not result.get('content'):
            return False, '大模型未返回有效摘要'
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO macro_policy_digest (title, content, updated_at) VALUES (?, ?, ?)",
            (result.get('title', '宏观政策与市场环境摘要'), result.get('content', ''), datetime.now().isoformat())
        )
        conn.commit()
        conn.close()
        return True, '已更新宏观政策摘要'
    except Exception as e:
        print('refresh_macro_policy_digest error:', e)
        return False, str(e)


def refresh_macro_policy_news():
    """多维度政策与市场新闻：联网搜索，每条单独写入 macro_policy_news 表。"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT api_key, base_url, model, enable_web_search FROM llm_config WHERE api_key IS NOT NULL AND api_key != '' LIMIT 1"
        )
        row = cursor.fetchone()
        conn.close()
        if not row:
            print('refresh_macro_policy_news: 未配置 LLM API，跳过')
            return
        api_key, base_url, model = row[0], row[1], row[2]
        enable_web_search = bool(row[3]) if len(row) > 3 else True
        from services.llm_service import generate_macro_policy_news_items
        items = generate_macro_policy_news_items(
            api_key=api_key, base_url=base_url, model=model, enable_web_search=enable_web_search
        )
        if not items:
            print('refresh_macro_policy_news: LLM 未返回条目')
            return
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM macro_policy_news")
        now = datetime.now().isoformat()
        for it in items:
            cursor.execute(
                "INSERT INTO macro_policy_news (title, content, source, dimension, published_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (it.get('title', ''), it.get('content', ''), it.get('source', ''), it.get('dimension', '政策'), now, now)
            )
        conn.commit()
        conn.close()
        print('refresh_macro_policy_news: 已写入 %d 条' % len(items))
    except Exception as e:
        print('refresh_macro_policy_news error:', e)


def run_backup():
    """将数据库复制到 data/backup/ 并记录上次备份时间到 system_settings。"""
    try:
        if not os.path.isfile(DB_PATH):
            return
        os.makedirs(BACKUP_DIR, exist_ok=True)
        stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        dest = os.path.join(BACKUP_DIR, f'risk_platform_{stamp}.db')
        shutil.copy2(DB_PATH, dest)
        now_iso = datetime.now().strftime('%Y-%m-%d %H:%M')
        conn = sqlite3.connect(DB_PATH)
        conn.execute("INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)", ('last_backup', now_iso))
        conn.commit()
        conn.close()
        print('Backup completed:', dest)
    except Exception as e:
        print('Backup error:', e)


def start_scheduler(interval_minutes=30):
    """启动定时任务"""
    global _scheduler
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        _scheduler = BackgroundScheduler()
        _scheduler.add_job(refresh_all_companies, 'interval', minutes=interval_minutes)
        # 每日早上 6:00 更新宏观政策摘要
        _scheduler.add_job(refresh_macro_policy_digest, 'cron', hour=6, minute=0)
        # 每日凌晨 2:00 自动备份数据库
        _scheduler.add_job(run_backup, 'cron', hour=2, minute=0)
        # 政策与市场新闻：每 6 小时更新一次（多维度、每条单独）
        _scheduler.add_job(refresh_macro_policy_news, 'interval', hours=6)
        _scheduler.start()
        # 启动后 2 分钟执行一次政策新闻刷新，避免首次无数据
        def run_policy_news_once():
            time.sleep(120)
            refresh_macro_policy_news()
        threading.Thread(target=run_policy_news_once, daemon=True).start()
        print(f'Scheduler started: refresh every {interval_minutes} min, macro 06:00, backup 02:00, policy_news every 6h')
    except ImportError:
        print('APScheduler not installed, skipping scheduled refresh')


def stop_scheduler():
    global _scheduler
    if _scheduler:
        _scheduler.shutdown()


