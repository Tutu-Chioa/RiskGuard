# -*- coding: utf-8 -*-
"""
企业信息爬取：工商信息、法律诉讼、股权变动、资金变动等
- 可对接爱企查/企查查 API（需 API Key）
- 或使用公开数据源 / 爬虫（受反爬限制）
"""
import os
import json
import re
import threading
from datetime import datetime

# 爱企查 / 企查查 等通常需登录或 API，此处提供结构化接口便于后续对接
AIQICHA_API_BASE = os.environ.get('AIQICHA_API_BASE', '')
AIQICHA_API_KEY = os.environ.get('AIQICHA_API_KEY', '')


def fetch_company_info(name):
    """获取企业工商信息：注册资金、行业、股权结构等"""
    if AIQICHA_API_KEY and AIQICHA_API_BASE:
        return _fetch_via_api(name)
    return _fetch_mock(name)


def _fetch_mock(name):
    """模拟数据（无 API 时）"""
    return {
        'name': name,
        'legal_representative': '模拟法人',
        'registered_capital': '1000万人民币',
        'industry': '科技',
        'business_status': '存续',
        'registered_address': '北京市海淀区模拟地址',
        'business_scope': '技术开发、技术服务等',
        'equity_structure': json.dumps([
            {'name': '股东A', 'ratio': '60%', 'type': '自然人'},
            {'name': '股东B', 'ratio': '40%', 'type': '企业法人'}
        ], ensure_ascii=False),
        'established_date': '2020-01-15',
        'legal_cases': json.dumps([
            {'case_type': '民事', 'status': '审理中', 'court': '某法院', 'date': '2024-01-01'}
        ], ensure_ascii=False),
        'equity_changes': json.dumps([
            {'date': '2024-01-10', 'change': '股权变更', 'detail': '股东A持股比例由50%变更为60%'}
        ], ensure_ascii=False),
        'capital_changes': json.dumps([
            {'date': '2023-06-01', 'change': '增资', 'before': '500万', 'after': '1000万'}
        ], ensure_ascii=False),
        'crawl_time': datetime.now().isoformat(),
        'source': 'mock'
    }


def _fetch_via_api(name):
    """通过爱企查/企查查 API 获取（需配置）"""
    import requests
    try:
        url = f"{AIQICHA_API_BASE.rstrip('/')}/search"
        r = requests.get(url, params={'keyword': name, 'key': AIQICHA_API_KEY}, timeout=10)
        if r.ok:
            data = r.json()
            # 根据实际 API 结构解析
            return _parse_api_response(data, name)
    except Exception as e:
        print('Enterprise API error:', e)
    return _fetch_mock(name)


def _parse_api_response(data, name):
    """解析 API 返回（需按实际接口调整）"""
    # 占位，实际对接时实现
    return _fetch_mock(name)


def fetch_news_for_company(name, limit=20):
    """
    获取与企业相关的新闻/资讯
    可对接新闻 API 或爬虫
    """
    # 模拟新闻
    return [
        {
            'title': f'关于{name}的最新动态',
            'content': '企业持续稳健发展，市场关注度较高。',
            'source': '模拟来源',
            'url': 'https://example.com/1',
            'publish_date': datetime.now().strftime('%Y-%m-%d'),
        },
        {
            'title': f'{name}行业分析',
            'content': '业内专家对该企业持谨慎乐观态度。',
            'source': '模拟来源',
            'url': 'https://example.com/2',
            'publish_date': datetime.now().strftime('%Y-%m-%d'),
        },
    ][:limit]
