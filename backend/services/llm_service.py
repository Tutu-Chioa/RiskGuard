# -*- coding: utf-8 -*-
"""
LLM 服务：接入 OpenAI 及兼容 API
- 社会情绪量化分析
- 关键词提取
- 企业信息收集与整理
- 新闻/资讯分析归类
"""
import os
import json
import re
from datetime import datetime

# 中英字段名映射：LLM 可能返回中文 key
COMPANY_INFO_KEY_MAP = {
    'legal_representative': ['legal_representative', '法定代表人', '法人代表'],
    'registered_capital': ['registered_capital', '注册资本'],
    'registered_address': ['registered_address', '注册地址'],
    'industry': ['industry', '行业', '所属行业'],
    'business_status': ['business_status', '经营状态'],
    'established_date': ['established_date', '成立日期'],
    'business_scope': ['business_scope', '经营范围'],
    'equity_structure': ['equity_structure', '股权结构'],
    'legal_cases': ['legal_cases', '法律案件', '诉讼'],
    'equity_changes': ['equity_changes', '股权变更'],
    'capital_changes': ['capital_changes', '资本变更'],
    'brief': ['brief', '简介', '企业简介'],
}

# 系统内置提示词
PROMPT_SENTIMENT = """你是一个专业的舆情分析师。请根据以下关于企业"{company_name}"的媒体/用户评论内容，完成以下任务：
1. 量化社会对该企业的整体情绪，给出 -1 到 1 的分数（-1 极负面，0 中性，1 极正面）
2. 用一段话总结社会评价
3. 提取 5-10 个关键词（用于词云展示）
4. 给出风险等级：低/中/高

请以 JSON 格式回复，格式如下：
{{
  "sentiment_score": 0.65,
  "summary": "社会评价总结...",
  "keywords": ["关键词1", "关键词2", ...],
  "risk_level": "低"
}}
只输出 JSON，不要其他文字。"""

PROMPT_KEYWORDS = """从以下文本中提取 5-15 个与"{company_name}"相关的关键词，用于词云展示。优先提取：行业术语、风险相关词、评价词。
文本：
{text}

请以 JSON 格式回复：{"keywords": ["词1", "词2", ...]}
只输出 JSON。"""

PROMPT_COMPANY_INFO = """请根据企业名称"{company_name}"，基于你的知识库整理该企业的公开信息（如已知），以 JSON 格式输出：
{
  "legal_representative": "法定代表人（如已知）",
  "registered_capital": "注册资本（如已知）",
  "industry": "所处行业",
  "business_status": "经营状态（如已知）",
  "established_date": "成立日期（如已知）",
  "business_scope": "经营范围摘要",
  "equity_structure": [{"name": "股东名", "ratio": "持股比例", "type": "类型"}],
  "brief": "企业简介"
}
如某字段未知可填 "-"。只输出 JSON。"""

PROMPT_COMPANY_INFO_WEB = """你是企业工商信息提取助手。请联网搜索「{company_name}」的最新工商登记、天眼查/企查查/爱企查等公开信息。

要求：尽可能填满所有字段。只有确实搜索不到时才填 "-"。行业、法人、注册资本、注册地址、经营状态等通常在工商网站可查到。

严格按以下 JSON 输出，顺序与字段名不变：
{{
  "legal_representative": "法定代表人全名",
  "registered_capital": "注册资本及币种，如：1000万人民币、10万美元",
  "registered_address": "完整注册地址",
  "industry": "所属行业",
  "business_status": "存续/在业/注销/吊销",
  "established_date": "成立日期，格式 YYYY-MM-DD",
  "business_scope": "经营范围摘要（50-200字）",
  "equity_structure": [{{"name": "股东名", "ratio": "持股比例", "type": "自然人/企业"}}],
  "legal_cases": [{{"case_type": "案件类型", "status": "状态", "court": "法院", "date": "日期"}}],
  "equity_changes": [{{"date": "日期", "change": "变更类型", "detail": "详情"}}],
  "capital_changes": [{{"date": "日期", "change": "变更类型", "before": "变更前", "after": "变更后"}}],
  "brief": "企业简介（1-3句）"
}}

只输出 JSON，无其他文字。"""

# 统一风险维度说明（法律/财务/经营/舆情，每项仅取 低/中/高）
RISK_DIMENSIONS_DESC = '各维度仅允许：低、中、高。risk_level 为综合等级。'

PROMPT_NEWS_ANALYZE = """分析以下新闻/资讯，判断是否与"{company_name}"相关，并按统一标准量化情感与风险。
标题：{title}
内容：{content}

以 JSON 格式回复，严格按以下结构（各风险维度仅填 低/中/高）：
{{
  "related": true/false,
  "sentiment_score": -1到1,
  "category": "法律/财务/经营/舆情/其他",
  "risk_level": "低/中/高",
  "risk_dimensions": {{
    "legal_risk": "低/中/高",
    "financial_risk": "低/中/高",
    "operational_risk": "低/中/高",
    "reputation_risk": "低/中/高"
  }},
  "confidence": "低/中/高",
  "keywords": ["词1", "词2"]
}}
只输出 JSON。"""

PROMPT_NEWS_SEARCH = """请联网搜索企业「{company_name}」近期的相关新闻（如融资、监管、经营、诉讼等），整理成 3-5 条。
每条新闻按统一标准评估：risk_level 为综合风险（低/中/高），risk_dimensions 为各维度（仅填 低/中/高）。

以 JSON 格式输出，严格按以下结构：
{{
  "news": [
    {{
      "title": "新闻标题",
      "summary": "大模型总结的要点摘要",
      "source": "来源",
      "date": "YYYY-MM-DD",
      "risk_level": "低/中/高",
      "category": "法律/财务/经营/舆情/其他",
      "risk_dimensions": {{ "legal_risk": "低/中/高", "financial_risk": "低/中/高", "operational_risk": "低/中/高", "reputation_risk": "低/中/高" }},
      "confidence": "低/中/高"
    }}
  ]
}}

只输出 JSON，不要其他文字。如无相关新闻可返回 {{"news": []}}。"""

# 宏观政策摘要：联网搜索最新政策/监管/市场环境，供右侧面板展示（范围含宏观、国际、流动性等）
PROMPT_MACRO_POLICY = """请联网搜索并整理「国内及国际近期与商业、监管、金融、合规、产业政策、宏观环境、流动性/利率、行业景气」相关的最新政策与市场环境信息（如近期一周内的政策文件、监管动态、重要会议精神、宏观数据与国际形势等）。

要求：
1. 以宏观视角归纳成一份简明摘要，便于企业做风险与合规参考。
2. 包含：政策/监管要点、宏观与国际环境、对企业的可能影响、建议关注方向。
3. 严格以 JSON 格式输出，且只输出 JSON，不要其他文字：
{
  "title": "宏观政策与市场环境摘要（日期范围）",
  "content": "正文内容，可分段落，用换行分隔。每段简明扼要。"
}
content 建议 400-1000 字。"""

# 多维度政策与市场新闻：每条单独一条，范围扩大至宏观、国际、流动性、行业景气等
PROMPT_MACRO_POLICY_NEWS = """请联网搜索国内及国际近期与「政策、监管、金融、产业、合规、市场环境、宏观、国际」相关的多条新闻或动态。

要求：
1. 从多维度分别搜集：监管政策、金融动态、产业政策、合规要求、市场环境、宏观形势（如利率、流动性、景气指数）、国际局势与跨境政策等，每个维度可有多条。
2. 每条新闻单独一条，不要合并成一份时间跨度总结。每条包含：标题、简明内容/摘要、来源、所属维度。
3. 至少返回 8 条、最多 30 条。每条内容 80-200 字。
4. 严格只输出 JSON，不要其他文字，格式如下：
{
  "items": [
    { "title": "新闻标题", "content": "该条新闻的简明摘要或要点", "source": "来源名称或网站", "dimension": "政策|监管|金融|产业|合规|市场环境|宏观|国际" },
    ...
  ]
}}
dimension 只能是：政策、监管、金融、产业、合规、市场环境、宏观、国际 之一。"""


def generate_macro_policy_news_items(api_key=None, base_url=None, model=None, enable_web_search=True):
    """联网搜索多维度政策与市场新闻，每条单独返回。返回 [{"title","content","source","dimension"}, ...] 或 []"""
    prompt = PROMPT_MACRO_POLICY_NEWS
    result = call_llm(prompt, api_key, base_url, model, enable_search=enable_web_search)
    if not result or not isinstance(result, dict):
        return []
    items = result.get('items') or result.get('list') or []
    out = []
    for x in items:
        if not isinstance(x, dict):
            continue
        title = (x.get('title') or x.get('标题') or '').strip()
        content = (x.get('content') or x.get('摘要') or x.get('content_text') or '').strip()
        if not title and not content:
            continue
        source = (x.get('source') or x.get('来源') or '').strip()
        dimension = (x.get('dimension') or x.get('维度') or '政策').strip()
        if dimension not in ('政策', '监管', '金融', '产业', '合规', '市场环境', '宏观', '国际'):
            dimension = '政策'
        out.append({'title': title or '政策动态', 'content': content, 'source': source, 'dimension': dimension})
    return out


def generate_macro_policy_digest(api_key=None, base_url=None, model=None, enable_web_search=True):
    """生成宏观政策摘要，使用联网搜索获取最新信息。返回 {"title": str, "content": str} 或 None"""
    prompt = PROMPT_MACRO_POLICY
    result = call_llm(prompt, api_key, base_url, model, enable_search=enable_web_search)
    if result and isinstance(result, dict):
        title = result.get('title') or result.get('标题') or '宏观政策与市场环境摘要'
        content = result.get('content') or result.get('正文') or result.get('content_text') or ''
        if content or title:
            return {'title': str(title).strip(), 'content': str(content).strip()}
    return None


def call_llm(prompt, api_key=None, base_url=None, model='gpt-4o-mini', enable_search=False):
    """调用 OpenAI 或兼容 API。enable_search=True 时传 extra_body（通义千问 qwen3-max 等支持联网搜索）"""
    if not api_key:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url=base_url or 'https://api.openai.com/v1')
        kwargs = {
            'model': model or 'gpt-4o-mini',
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.3
        }
        if enable_search:
            kwargs['extra_body'] = {'enable_search': True}
        resp = client.chat.completions.create(**kwargs)
        text = resp.choices[0].message.content.strip()
        # 尝试解析 JSON：支持 ```json ... ``` 或前后带说明文字
        parsed = _extract_json_from_text(text)
        if parsed is not None:
            return parsed
        if text.startswith('```'):
            text = text.split('```')[1]
            if text.startswith('json'):
                text = text[4:].strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return None
    except Exception as e:
        print('LLM call error:', e)
        # 若 enable_search 失败，部分模型（如 qwen-plus）不支持联网，尝试不带 enable_search 重试
        if enable_search:
            try:
                from openai import OpenAI
                c = OpenAI(api_key=api_key, base_url=base_url or 'https://api.openai.com/v1')
                kwargs2 = {
                    'model': model or 'gpt-4o-mini',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'temperature': 0.3
                }
                resp = c.chat.completions.create(**kwargs2)
                text = resp.choices[0].message.content.strip()
                parsed = _extract_json_from_text(text)
                if parsed is not None:
                    print('LLM retry without enable_search succeeded (model may not support web search)')
                    return parsed
                if text.startswith('```'):
                    text = text.split('```')[1]
                    if text.startswith('json'):
                        text = text[4:].strip()
                return json.loads(text)
            except Exception as e2:
                print('LLM retry error:', e2)
        return None


def analyze_sentiment_and_keywords(company_name, reviews_text, api_key=None, base_url=None, model=None):
    """分析媒体舆情，返回情绪分数、摘要、关键词"""
    text = (reviews_text or '')[:3000] or '无'
    prompt = PROMPT_SENTIMENT.format(company_name=company_name) + "\n\n评论内容：\n" + text
    result = call_llm(prompt, api_key, base_url, model)
    if result:
        return result
    return {
        'sentiment_score': 0.5,
        'summary': '暂无 LLM 分析结果，请配置 API Key。',
        'keywords': ['舆情', '分析', '关注'],
        'risk_level': '中'
    }


def extract_keywords(company_name, text, api_key=None, base_url=None, model=None):
    """从文本提取关键词"""
    prompt = PROMPT_KEYWORDS.format(company_name=company_name, text=((text or '')[:2000] or ''))
    result = call_llm(prompt, api_key, base_url, model)
    if result and 'keywords' in result:
        return result['keywords']
    return []


def _extract_json_from_text(text):
    """从可能包含前后文字的回复中提取 JSON 对象"""
    if not text or not isinstance(text, str):
        return None
    text = text.strip()
    # 先尝试 ```json ... ``` 块
    m = re.search(r'```(?:json)?\s*(\{[\s\S]*?\})\s*```', text)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    # 尝试直接找第一个 { ... }
    m = re.search(r'\{[\s\S]*\}', text)
    if m:
        raw = m.group(0)
        # 去除可能的尾随逗号
        raw = re.sub(r',\s*}', '}', raw)
        raw = re.sub(r',\s*]', ']', raw)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _normalize_company_info(raw):
    """将 LLM 返回的 dict 规范化为我们期望的英文 key，兼容中文 key"""
    if not raw or not isinstance(raw, dict):
        return {}
    out = {}
    # 建立 中文key/变体 -> 英文key 的查找表
    key_to_eng = {}
    for eng, aliases in COMPANY_INFO_KEY_MAP.items():
        for a in aliases:
            key_to_eng[a] = eng
    for k, v in raw.items():
        if v is None:
            continue
        if isinstance(k, str):
            eng_key = key_to_eng.get(k) or key_to_eng.get(k.strip())
        else:
            eng_key = None
        if eng_key:
            if isinstance(v, (list, dict)):
                out[eng_key] = v
            elif v not in ('-', '', '无', '未知'):
                out[eng_key] = str(v).strip() if v else ''
            else:
                out.setdefault(eng_key, '')
        elif k in list(COMPANY_INFO_KEY_MAP.keys()):
            if isinstance(v, (list, dict)):
                out[k] = v
            elif v not in ('-', '', '无', '未知'):
                out[k] = str(v).strip() if v else ''
            else:
                out.setdefault(k, '')
    return out


def fetch_company_info_by_llm(company_name, api_key=None, base_url=None, model=None, enable_web_search=False):
    """通过 LLM 整理企业公开信息。enable_web_search=True 时使用联网搜索（通义千问等）"""
    prompt = (PROMPT_COMPANY_INFO_WEB if enable_web_search else PROMPT_COMPANY_INFO).format(company_name=company_name)
    result = call_llm(prompt, api_key, base_url, model, enable_search=enable_web_search)
    if result and isinstance(result, dict):
        return _normalize_company_info(result)
    # call_llm 可能返回解析后的 dict，若失败则 result 为 None；若返回的是 str 则再尝试提取
    return None


def search_company_news(company_name, api_key=None, base_url=None, model=None, enable_web_search=False):
    """联网搜索企业近期相关新闻，整理后返回"""
    prompt = PROMPT_NEWS_SEARCH.format(company_name=company_name)
    result = call_llm(prompt, api_key, base_url, model, enable_search=enable_web_search)
    if result and isinstance(result, dict) and 'news' in result:
        return result.get('news', [])
    return []


def analyze_news_for_company(company_name, title, content, api_key=None, base_url=None, model=None):
    """分析新闻是否与企业相关，并量化情感与风险（含统一多维度）"""
    prompt = PROMPT_NEWS_ANALYZE.format(company_name=company_name, title=title or '', content=(content or '')[:1500])
    result = call_llm(prompt, api_key, base_url, model)
    if result:
        _ensure_risk_dimensions(result)
        return result
    return {'related': False, 'sentiment_score': 0, 'category': '其他', 'risk_level': '中', 'risk_dimensions': {}, 'keywords': []}


def _ensure_risk_dimensions(obj):
    """确保 risk_dimensions 为 dict，且各键为 低/中/高"""
    if not isinstance(obj, dict):
        return
    rd = obj.get('risk_dimensions')
    if not isinstance(rd, dict):
        obj['risk_dimensions'] = {'legal_risk': '中', 'financial_risk': '中', 'operational_risk': '中', 'reputation_risk': '中'}
    else:
        for k in ['legal_risk', 'financial_risk', 'operational_risk', 'reputation_risk']:
            if rd.get(k) not in ('低', '中', '高'):
                rd[k] = rd.get(k) or '中'


PROMPT_DOC_LINK_ANALYZE = """根据以下文档/链接内容，判断其与哪些企业相关，并按统一标准量化情感与风险。
标题：{title}
内容（摘要）：{content}

可选企业列表（id: 名称）：{companies_str}

请以 JSON 格式回复，各风险维度仅填 低/中/高：
{{
  "company_id": 匹配的企业ID（如无匹配填 null）,
  "company_name": "匹配的企业名称",
  "is_news": true/false,
  "summary": "内容摘要",
  "sentiment_score": -1到1,
  "risk_level": "低/中/高",
  "risk_dimensions": {{ "legal_risk": "低/中/高", "financial_risk": "低/中/高", "operational_risk": "低/中/高", "reputation_risk": "低/中/高" }},
  "category": "法律/财务/经营/舆情/其他",
  "keywords": ["词1", "词2"]
}}
只输出 JSON。"""


def analyze_document_or_link_for_company(title, content, companies_list, api_key=None, base_url=None, model=None):
    """分析文档/链接内容，归类到相关企业，判断是否资讯并量化"""
    companies_str = ', '.join(f'{c[0]}: {c[1]}' for c in companies_list) if companies_list else '无'
    prompt = PROMPT_DOC_LINK_ANALYZE.format(
        title=title or '',
        content=(content or '')[:2500],
        companies_str=companies_str
    )
    result = call_llm(prompt, api_key, base_url, model)
    if result:
        _ensure_risk_dimensions(result)
        return result
    return {
        'company_id': None, 'company_name': '', 'is_news': False,
        'summary': '分析失败', 'sentiment_score': 0, 'risk_level': '中',
        'risk_dimensions': {}, 'category': '其他', 'keywords': []
    }


# ---------- 尽调补充：用户输入整理并归集到企业 ----------
PROMPT_SUPPLEMENT = """你是企业尽调助手。用户（客户经理）正在对企业「{company_name}」做尽调，并提供了网上查不到的补充信息（口述或文字）。

当前企业已有信息摘要：
{company_summary}

用户本次输入：
{user_input}

请完成：
1. 从用户输入中提取可写入企业档案的**结构化信息**（若某字段用户未提及则不要编造，填 null）。
2. 用一段话总结「已归集到企业档案的内容」供前端展示。

严格按以下 JSON 输出，只输出 JSON：
{{
  "updates": {{
    "legal_representative": "法定代表人（仅当用户明确提到）",
    "registered_capital": "注册资本",
    "business_status": "经营状态",
    "registered_address": "注册地址",
    "business_scope": "经营范围补充",
    "social_evaluation": "社会评价/舆情补充",
    "supplement_notes": "内部备注、尽调要点等无法映射到上述字段的原文或总结"
  }},
  "summary": "已归集：xxx；未归集：xxx（若有）"
}}
updates 中只包含用户确实提到的字段；summary 为一句话，便于界面展示。"""


def process_supplement_chat(company_name, company_summary, user_input, api_key=None, base_url=None, model=None):
    """处理尽调补充对话：从用户输入中提取结构化更新与摘要"""
    summary = (company_summary or '')[:1500]
    prompt = PROMPT_SUPPLEMENT.format(
        company_name=company_name,
        company_summary=summary or '（暂无）',
        user_input=(user_input or '').strip()[:2000]
    )
    result = call_llm(prompt, api_key, base_url, model)
    if result and isinstance(result, dict):
        return result
    return {'updates': {}, 'summary': '未能解析，请重试或检查 LLM 配置。'}


def ask_company_question(company_name, context_text, question, api_key=None, base_url=None, model=None):
    """基于企业上下文回答用户问题（RAG-lite：无向量库，直接拼接上下文）。返回 {"answer": "..."}"""
    if not api_key or not (question or '').strip():
        return {'answer': '请配置 LLM 并输入问题。'}
    prompt = f"""你是一个企业风控与尽调助手。请仅根据以下「企业相关信息」回答用户问题。若信息中无法得出答案，请如实说明。

【企业相关信息】
{context_text[:6000] or '（暂无）'}

【用户问题】
{(question or '').strip()[:500]}

请用简洁、准确的一段话回答，直接输出答案内容，不要重复问题。"""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url=base_url or 'https://api.openai.com/v1')
        resp = client.chat.completions.create(
            model=model or 'gpt-4o-mini',
            messages=[{'role': 'user', 'content': prompt}],
            temperature=0.2
        )
        text = (resp.choices[0].message.content or '').strip()
        return {'answer': text or '未得到有效回答。'}
    except Exception as e:
        return {'answer': f'回答失败：{str(e)[:200]}'}
