# -*- coding: utf-8 -*-
"""
风险特征抽取层
----------------
从现有结构化数据（company_news / macro_policy_news / 工商变更等）中抽取统一的
enterprise_event_feature 记录，供后续风险聚合与时间序列/预测使用。

第一版实现目标：
- 只依赖已有表，不引入新的外部系统
- 只做“简单、可落地”的规则映射，后续再逐步接入 LLM 精细抽取
"""

from __future__ import annotations

import sqlite3
from datetime import datetime
from typing import Iterable, Dict, Any, Optional

DB_PATH = None  # 由调用方传入，或在 app.py 中注入


def _get_conn(db_path: Optional[str] = None) -> sqlite3.Connection:
    path = db_path or DB_PATH
    if not path:
        raise RuntimeError("feature_extraction_service.DB_PATH 未设置")
    return sqlite3.connect(path, timeout=30)


def _parse_event_date(publish_date: Optional[str], created_at: Optional[str]) -> str:
    """
    将 publish_date / created_at 转为 YYYY-MM-DD，缺失则用今天。
    """
    for v in (publish_date, created_at):
        if not v:
            continue
        try:
            # 已是 YYYY-MM-DD
            if len(v) >= 10:
                return v[:10]
        except Exception:
            continue
    return datetime.utcnow().strftime("%Y-%m-%d")


def _map_news_to_event(row: sqlite3.Row) -> Dict[str, Any]:
    """
    将 company_news 的一行映射为 enterprise_event_feature 结构。
    先用简单规则：按 category / risk_level / sentiment_score 粗分 event_type 和 severity。
    """
    category = (row["category"] or "").strip()
    risk_level = (row["risk_level"] or "").strip()
    sentiment_score = row["sentiment_score"]

    # 事件类型粗分类
    if category in ("法律", "合规", "监管"):
        event_type = "LEGAL_PENALTY"
    elif category in ("经营", "运营"):
        event_type = "BUSINESS"
    elif category in ("财务", "金融"):
        event_type = "FINANCIAL_STRESS"
    else:
        event_type = "PUBLIC_OPINION"

    # 情绪标签
    label = "NEU"
    if sentiment_score is not None:
        if sentiment_score <= -0.2:
            label = "NEG"
        elif sentiment_score >= 0.2:
            label = "POS"

    # 严重程度（0~1）：先按 risk_level，再按情绪加权
    base_severity = {
        "高": 0.8,
        "中": 0.5,
        "低": 0.2,
    }.get(risk_level, 0.3)
    if label == "NEG":
        base_severity = min(1.0, base_severity + 0.2)
    elif label == "POS":
        base_severity = max(0.0, base_severity - 0.1)

    return {
        "enterprise_id": row["company_id"],
        "source_type": "NEWS",
        "source_id": row["id"],
        "event_date": _parse_event_date(row["publish_date"], row["created_at"]),
        "event_type": event_type,
        "sentiment_label": label,
        "sentiment_score": sentiment_score if sentiment_score is not None else 0.0,
        "severity_score": base_severity,
        "policy_direction": None,
        "policy_strength": None,
        "biz_change_type": None,
        "extra_json": None,
    }


def rebuild_news_features(db_path: Optional[str] = None, enterprise_id: Optional[int] = None) -> int:
    """
    从 company_news 重建 NEWS 类 enterprise_event_feature 记录。
    - 若指定 enterprise_id，则只处理该企业；
    - 否则处理全量。
    返回新写入的记录数。
    """
    conn = _get_conn(db_path)
    conn.row_factory = sqlite3.Row
    cu = conn.cursor()

    where = ""
    params: Iterable[Any] = ()
    if enterprise_id is not None:
        where = "WHERE company_id = ?"
        params = (enterprise_id,)

    cu.execute(f"SELECT * FROM company_news {where}", params)
    rows = cu.fetchall()

    # 为避免重复，先删除对应企业的 NEWS 来源特征
    if enterprise_id is not None:
        cu.execute(
            "DELETE FROM enterprise_event_feature WHERE enterprise_id=? AND source_type='NEWS'",
            (enterprise_id,),
        )
    else:
        cu.execute("DELETE FROM enterprise_event_feature WHERE source_type='NEWS'")
    conn.commit()

    count = 0
    for row in rows:
        ev = _map_news_to_event(row)
        cu.execute(
            """
            INSERT INTO enterprise_event_feature (
                enterprise_id, source_type, source_id, event_date, event_type,
                sentiment_label, sentiment_score, severity_score,
                policy_direction, policy_strength, biz_change_type, extra_json
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                ev["enterprise_id"],
                ev["source_type"],
                ev["source_id"],
                ev["event_date"],
                ev["event_type"],
                ev["sentiment_label"],
                ev["sentiment_score"],
                ev["severity_score"],
                ev["policy_direction"],
                ev["policy_strength"],
                ev["biz_change_type"],
                ev["extra_json"],
            ),
        )
        count += 1

    conn.commit()
    conn.close()
    return count

