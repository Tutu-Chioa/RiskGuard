# -*- coding: utf-8 -*-
"""
媒体舆情入库：按 (company_id, platform, title) 去重，只插入新条目，实现增量更新。
"""
import sqlite3


def save_media_reviews_dedup(db_path, company_id, company_name, reviews, api_key=None, base_url=None, model=None):
    """
    媒体舆情入库，按 (company_id, platform, title) 去重，只插入新条目。
    然后根据本次爬取内容更新企业社会评价、风险等级与关键词。
    """
    conn = sqlite3.connect(db_path, timeout=30)
    cu = conn.cursor()
    for r in reviews:
        title = (r.get('title') or '')[:200]
        platform = r.get('platform') or ''
        cu.execute("SELECT 1 FROM company_media_reviews WHERE company_id=? AND platform=? AND title=? LIMIT 1",
                   (company_id, platform, title))
        if cu.fetchone():
            continue
        cu.execute("INSERT INTO company_media_reviews (company_id, platform, title, content, sentiment) VALUES (?,?,?,?,?)",
                   (company_id, platform, r.get('title', ''), r.get('content', ''), r.get('sentiment', 'neutral')))
    reviews_text = (' '.join((r.get('content') or '') for r in reviews)).strip()
    # 仅当有实质评论内容时才调用 LLM 并更新社会评价，避免把「缺乏评论、中性」写入库
    if api_key and reviews and len(reviews_text) >= 10:
        from services.llm_service import analyze_sentiment_and_keywords
        result = analyze_sentiment_and_keywords(company_name, reviews_text, api_key, base_url, model)
        summary = (result.get('summary') or '').strip()
        # 若 LLM 返回的是「缺乏内容」类结论，不覆盖原有社会评价
        if summary and '缺乏' not in summary and '无法判断' not in summary and '暂无' not in summary:
            new_level = (result.get('risk_level') or '').strip()
            old_level = ''
            if new_level == '高':
                cu.execute("SELECT risk_level FROM companies WHERE id=?", (company_id,))
                old_row = cu.fetchone()
                old_level = (old_row[0] or '').strip() if old_row else ''
            cu.execute("UPDATE companies SET social_evaluation=?, risk_level=?, media_status='success' WHERE id=?",
                       (summary, result.get('risk_level', ''), company_id))
            if new_level == '高' and old_level != '高':
                try:
                    cu.execute("""INSERT INTO risk_alerts (company_id, alert_type, severity, description, source) VALUES (?,?,?,?,?)""",
                        (company_id, 'company', 'high', '企业风险等级升至高风险', 'media_crawl'))
                except sqlite3.OperationalError:
                    pass
            cu.execute("DELETE FROM company_keywords WHERE company_id=?", (company_id,))
            for kw in result.get('keywords', [])[:20]:
                cu.execute("INSERT INTO company_keywords (company_id, keyword, weight) VALUES (?,?,1)", (company_id, kw))
        else:
            cu.execute("UPDATE companies SET media_status='success' WHERE id=?", (company_id,))
    else:
        cu.execute("UPDATE companies SET media_status='success' WHERE id=?", (company_id,))
    conn.commit()
    conn.close()
