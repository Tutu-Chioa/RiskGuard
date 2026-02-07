# -*- coding: utf-8 -*-
"""
企业信息爬取服务
- 工商信息：注册资金、行业、股权结构等（可对接天眼查/企查查API，当前为模拟）
- MediaCrawler：媒体舆情爬取（需单独部署 MediaCrawler，此处提供调用接口）
"""
import os
import json
import subprocess
import threading
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'risk_platform.db')


def fetch_company_info(name):
    """委托给 enterprise_crawler"""
    from backend.services.enterprise_crawler import fetch_company_info as _fetch
    return _fetch(name)


def trigger_media_crawl(company_id, company_name, callback=None, on_error=None):
    """
    触发 MediaCrawler 爬取该企业在各媒体平台的评价
    - 若已配置 MEDIACRAWLER_PATH，则调用真实 MediaCrawler
    - 否则使用模拟数据
    - on_error: 可选，异常时调用的回调 on_error(company_id)
    """
    def _run():
        try:
            from backend.services.mediacrawler_service import (
                is_available,
                crawl_by_keyword,
            )
            if is_available():
                result = crawl_by_keyword(
                    company_name,
                    platform=None,
                    callback=None,
                    company_id=company_id,
                )
                status = result.get('status', '')
                reviews = result.get('reviews', []) if status in ('ok', 'mock') else []
                if callback:
                    callback(company_id, reviews)
                # no_content/error 时也要让前端知道爬取已结束，否则会一直显示「爬取中」
                if status not in ('ok', 'mock') and on_error:
                    try:
                        on_error(company_id)
                    except Exception:
                        pass
                return result
        except Exception as e:
            import traceback
            print('[Crawler] MediaCrawler 执行异常:', e)
            traceback.print_exc()
            if on_error:
                try:
                    on_error(company_id)
                except Exception:
                    pass

        # 回退到模拟数据
        import time
        time.sleep(2)
        mock_reviews = [
            {'platform': '微博', 'title': f'关于{company_name}的讨论', 'content': '用户普遍认为该公司发展稳健', 'sentiment': 'positive'},
            {'platform': '知乎', 'title': f'{company_name}怎么样', 'content': '行业口碑较好，值得关注', 'sentiment': 'neutral'},
            {'platform': 'B站', 'title': f'{company_name}相关视频', 'content': '部分用户反馈产品体验良好', 'sentiment': 'positive'},
        ]
        if callback:
            callback(company_id, mock_reviews)
        return {'status': 'mock', 'message': '使用模拟数据（MediaCrawler 未配置或执行失败）', 'reviews': mock_reviews}

    t = threading.Thread(target=_run)
    t.daemon = True
    t.start()
    return {'status': 'started', 'message': '媒体爬取任务已启动，请稍后刷新查看结果'}


def analyze_social_evaluation_with_llm(reviews_text, llm_api_key=None, llm_base_url=None):
    """
    使用大模型分析媒体舆情，输出可视化的社会评价摘要
    支持 OpenAI API 或兼容接口（如 Azure、国内大模型）
    """
    if not llm_api_key:
        # 无 API Key 时返回规则生成的摘要
        return {
            'summary': '基于媒体舆情的综合分析：该企业在本平台讨论中整体呈现中性偏正面评价，建议持续关注后续动态。',
            'sentiment_score': 0.65,
            'keywords': ['稳健', '口碑', '关注'],
            'risk_hint': '低',
            'analyzed_at': datetime.now().isoformat()
        }
    # TODO: 调用 OpenAI/兼容 API
    # import openai
    # client = openai.OpenAI(api_key=llm_api_key, base_url=llm_base_url)
    # response = client.chat.completions.create(...)
    return analyze_social_evaluation_with_llm(reviews_text, None)
