# -*- coding: utf-8 -*-
"""
宏观指数服务
------------
从 macro_policy_news 计算按日的宏观风险/政策指数，写入 macro_daily_index，供风险预测等使用。
"""
from __future__ import annotations

import re
import sqlite3
from datetime import datetime
from typing import Optional

# 维度对宏观风险的影响权重（0~1，越高表示该维度越拉高宏观风险观感）
DIMENSION_RISK_WEIGHT = {
    "监管": 0.85,
    "合规": 0.85,
    "国际": 0.80,
    "宏观": 0.75,
    "金融": 0.70,
    "政策": 0.65,
    "产业": 0.55,
    "市场环境": 0.50,
}

# 标题/内容中出现则略抬高风险观的词（负面倾向）
NEGATIVE_HINTS = re.compile(
    r"收紧|趋严|风险|下滑|制裁|处罚|违规|违约|爆雷|下跌|收紧|整顿|整改|叫停|限制|禁止|立案|调查"
)

DB_PATH: Optional[str] = None


def _get_conn(db_path: Optional[str] = None) -> sqlite3.Connection:
    path = db_path or DB_PATH
    if not path:
        raise RuntimeError("macro_index_service.DB_PATH 未设置")
    return sqlite3.connect(path, timeout=30)


def _item_score(dimension: str, title: str, content: str) -> float:
    """单条政策新闻的宏观风险得分 0~1。"""
    dim = (dimension or "政策").strip()
    base = DIMENSION_RISK_WEIGHT.get(dim, 0.5)
    text = (title or "") + " " + (content or "")
    if NEGATIVE_HINTS.search(text):
        base = min(1.0, base + 0.12)
    return base


def compute_and_save_macro_index(db_path: Optional[str] = None, ts_date: Optional[str] = None) -> bool:
    """
    根据当前 macro_policy_news 表的数据计算当日宏观指数，写入 macro_daily_index。
    ts_date 不传则用今天（本地日期 YYYY-MM-DD）。
    返回是否写入成功。
    """
    conn = _get_conn(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT id, title, content, dimension FROM macro_policy_news"
    )
    rows = cur.fetchall()
    if not rows:
        conn.close()
        return False
    date_str = ts_date or datetime.now().strftime("%Y-%m-%d")
    scores = [
        _item_score(
            r["dimension"],
            r["title"] or "",
            r["content"] or "",
        )
        for r in rows
    ]
    policy_score = sum(scores) / len(scores)
    macro_risk_score = min(1.0, policy_score * 1.05)  # 可与 policy_score 区分更细，目前略抬一点
    now = datetime.now().isoformat()
    cur.execute(
        """
        INSERT OR REPLACE INTO macro_daily_index (ts_date, policy_score, macro_risk_score, updated_at)
        VALUES (?, ?, ?, ?)
        """,
        (date_str, policy_score, macro_risk_score, now),
    )
    conn.commit()
    conn.close()
    return True


def get_macro_index_history(
    days: int = 30,
    db_path: Optional[str] = None,
) -> list[dict]:
    """获取最近 N 天的宏观指数，用于预测时的宏观调整。"""
    conn = _get_conn(db_path)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT ts_date, policy_score, macro_risk_score
        FROM macro_daily_index
        ORDER BY ts_date DESC
        LIMIT ?
        """,
        (max(1, days),),
    )
    rows = cur.fetchall()
    conn.close()
    return [
        {"date": r[0], "policy_score": r[1], "macro_risk_score": r[2]}
        for r in rows
    ]
