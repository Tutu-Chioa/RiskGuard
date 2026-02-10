# -*- coding: utf-8 -*-
"""
风险时间序列聚合层
--------------------
从 enterprise_event_feature 聚合出 enterprise_risk_timeseries：
- 按天、按企业聚合各维度的 0~1 风险得分
- 生成综合 RiskScore（0~100）
"""

from __future__ import annotations

import sqlite3
from typing import Optional, Dict, Any, Iterable

DB_PATH = None  # 由调用方设置或在 app 中传入


def _get_conn(db_path: Optional[str] = None) -> sqlite3.Connection:
    path = db_path or DB_PATH
    if not path:
        raise RuntimeError("risk_timeseries_service.DB_PATH 未设置")
    return sqlite3.connect(path, timeout=30)


def _compute_scores_for_day(rows: Iterable[sqlite3.Row]) -> Dict[str, Any]:
    """
    基于当日的 enterprise_event_feature 记录，计算各维度得分。
    第一版简单做法：按事件类型归类 + 取平均严重度。
    """
    dims = {
        "legal": [],
        "business": [],
        "media": [],
        "policy": [],
        "industry": [],
    }
    news_count = 0
    neg_news = 0
    sentiment_values = []
    policy_impact = []

    for r in rows:
        et = (r["event_type"] or "").upper()
        sev = r["severity_score"] if r["severity_score"] is not None else 0.0
        sent = r["sentiment_score"] if r["sentiment_score"] is not None else 0.0

        if r["source_type"] == "NEWS":
            news_count += 1
            sentiment_values.append(sent)
            if sent <= -0.2:
                neg_news += 1

        if et in ("LEGAL_PENALTY", "LITIGATION"):
            dims["legal"].append(sev)
        elif et in ("BUSINESS",):
            dims["business"].append(sev)
        elif et in ("FINANCIAL_STRESS",):
            dims["business"].append(min(1.0, sev + 0.1))
        elif et in ("PUBLIC_OPINION",):
            dims["media"].append(sev)
        # POLICY 相关
        if r["source_type"] == "POLICY":
            dims["policy"].append(sev)
            if r["policy_direction"] and r["policy_direction"].upper() == "NEGATIVE":
                s = r["policy_strength"] if r["policy_strength"] is not None else sev
                policy_impact.append(max(0.0, s))

        # 行业层面目前先空着，后续可从行业维度表聚合

    def avg_or_default(values, default=0.0):
        return float(sum(values) / len(values)) if values else default

    score_legal = avg_or_default(dims["legal"])
    score_business = avg_or_default(dims["business"])
    score_media = avg_or_default(dims["media"])
    score_policy = avg_or_default(dims["policy"])
    score_industry = avg_or_default(dims["industry"])  # 目前可能为 0

    # 简单综合风险分（加权平均）
    wL, wB, wM, wP, wI = 0.25, 0.25, 0.2, 0.15, 0.15
    risk_score = 100.0 * (
        wL * score_legal
        + wB * score_business
        + wM * score_media
        + wP * score_policy
        + wI * score_industry
    )
    # 若任一方为高风险（>=0.6，对应新闻「高」），当日综合分不低于 58，使趋势图与「相关新闻为高」一致
    max_dim = max(score_legal, score_business, score_media, score_policy, score_industry)
    if max_dim >= 0.6:
        risk_score = max(risk_score, 58.0)

    news_count = int(news_count)
    neg_ratio = float(neg_news) / news_count if news_count > 0 else 0.0
    sentiment_index = avg_or_default(sentiment_values)
    policy_impact_val = avg_or_default(policy_impact)

    return {
        "score_legal": score_legal,
        "score_business": score_business,
        "score_media": score_media,
        "score_policy": score_policy,
        "score_industry": score_industry,
        "risk_score": risk_score,
        "news_count": news_count,
        "neg_news_ratio": neg_ratio,
        "sentiment_index": sentiment_index,
        "policy_impact": policy_impact_val,
    }


def rebuild_timeseries_for_enterprise(enterprise_id: int, db_path: Optional[str] = None) -> int:
    """
    重新计算某个 enterprise 的全部时间序列风险记录。
    返回写入的记录数。
    """
    conn = _get_conn(db_path)
    conn.row_factory = sqlite3.Row
    cu = conn.cursor()

    cu.execute(
        """
        SELECT * FROM enterprise_event_feature
        WHERE enterprise_id=?
        ORDER BY event_date
        """,
        (enterprise_id,),
    )
    rows = cu.fetchall()
    if not rows:
        # 没有事件时，清空已有 TS 记录
        cu.execute("DELETE FROM enterprise_risk_timeseries WHERE enterprise_id=?", (enterprise_id,))
        conn.commit()
        conn.close()
        return 0

    # 删除旧记录
    cu.execute("DELETE FROM enterprise_risk_timeseries WHERE enterprise_id=?", (enterprise_id,))
    conn.commit()

    # 按日期分组
    current_date = None
    bucket = []
    written = 0
    for r in rows:
        d = r["event_date"]
        if current_date is None:
            current_date = d
        if d != current_date:
            scores = _compute_scores_for_day(bucket)
            cu.execute(
                """
                INSERT INTO enterprise_risk_timeseries (
                    enterprise_id, ts_date,
                    score_legal, score_business, score_media, score_policy, score_industry,
                    risk_score, news_count, neg_news_ratio, sentiment_index, sentiment_vol, policy_impact
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    enterprise_id,
                    current_date,
                    scores["score_legal"],
                    scores["score_business"],
                    scores["score_media"],
                    scores["score_policy"],
                    scores["score_industry"],
                    scores["risk_score"],
                    scores["news_count"],
                    scores["neg_news_ratio"],
                    scores["sentiment_index"],
                    None,  # sentiment_vol 暂未计算
                    scores["policy_impact"],
                ),
            )
            written += 1
            current_date = d
            bucket = []
        bucket.append(r)

    # 最后一桶
    if bucket:
        scores = _compute_scores_for_day(bucket)
        cu.execute(
            """
            INSERT INTO enterprise_risk_timeseries (
                enterprise_id, ts_date,
                score_legal, score_business, score_media, score_policy, score_industry,
                risk_score, news_count, neg_news_ratio, sentiment_index, sentiment_vol, policy_impact
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
            """,
            (
                enterprise_id,
                current_date,
                scores["score_legal"],
                scores["score_business"],
                scores["score_media"],
                scores["score_policy"],
                scores["score_industry"],
                scores["risk_score"],
                scores["news_count"],
                scores["neg_news_ratio"],
                scores["sentiment_index"],
                None,
                scores["policy_impact"],
            ),
        )
        written += 1

    conn.commit()
    conn.close()
    return written

