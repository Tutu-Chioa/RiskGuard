# -*- coding: utf-8 -*-
"""
ML 特征构建骨架（阶段 2）
-------------------------
作用：
- 从 SQLite（enterprise_risk_timeseries + enterprise_risk_label 等）构建训练/预测所需特征
- 目前仅提供函数签名与基本结构，方便后续逐步填充
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Tuple, List, Dict, Any

import numpy as np

DB_PATH: Optional[str] = None


def _get_conn(db_path: Optional[str] = None) -> sqlite3.Connection:
    path = db_path or DB_PATH
    if not path:
        raise RuntimeError("ml.feature_builder.DB_PATH 未设置")
    return sqlite3.connect(path, timeout=30)


def _linear_trend(xs: List[float]) -> float:
    """简单线性斜率，用于趋势特征。"""
    n = len(xs)
    if n < 2:
        return 0.0
    x_vals = list(range(n))
    mean_x = sum(x_vals) / n
    mean_y = sum(xs) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_vals, xs))
    den = sum((x - mean_x) ** 2 for x in x_vals) or 1.0
    return num / den


def build_ml_dataset(
    label_type: str,
    lookback_days: int = 90,
    horizon_days: int = 30,
    db_path: Optional[str] = None,
) -> Tuple[np.ndarray, np.ndarray, List[Dict[str, Any]]]:
    """
    从数据库构建用于训练的 (X, y, meta)：
    - X: (n_samples, n_features) 的特征矩阵
    - y: (n_samples,) 的标签（0/1）
    - meta: 每一行对应的 {enterprise_id, as_of_date, label_type}

    最小可用实现（简单特征）：
    - 对每条 enterprise_risk_label 记录：
      - 在 enterprise_risk_timeseries 中取 [as_of_date - lookback_days, as_of_date] 的窗口
      - 提取 risk_score 的均值/标准差/最后值/斜率 等 4 个特征
    """
    conn = _get_conn(db_path)
    conn.row_factory = sqlite3.Row
    cu = conn.cursor()

    cu.execute(
        """
        SELECT enterprise_id, as_of_date, label_value
        FROM enterprise_risk_label
        WHERE label_type=? AND (label_value=0 OR label_value=1)
        ORDER BY as_of_date
        """,
        (label_type,),
    )
    label_rows = cu.fetchall()
    if not label_rows:
        conn.close()
        return np.zeros((0, 0)), np.zeros((0,)), []

    X_list: List[np.ndarray] = []
    y_list: List[int] = []
    meta: List[Dict[str, Any]] = []

    for lr in label_rows:
        eid = int(lr["enterprise_id"])
        as_of = lr["as_of_date"]
        # 取窗口数据
        as_of_dt = datetime.strptime(as_of[:10], "%Y-%m-%d").date()
        start_dt = as_of_dt - timedelta(days=lookback_days)
        cu.execute(
            """
            SELECT ts_date, risk_score
            FROM enterprise_risk_timeseries
            WHERE enterprise_id=? AND ts_date BETWEEN ? AND ?
            ORDER BY ts_date ASC
            """,
            (eid, start_dt.isoformat(), as_of_dt.isoformat()),
        )
        ts_rows = cu.fetchall()
        if not ts_rows:
            continue
        scores = [float(r["risk_score"]) for r in ts_rows]
        arr = np.array(scores, dtype=float)
        mean = float(arr.mean())
        std = float(arr.std())
        last = float(arr[-1])
        slope = float(_linear_trend(scores))
        feat = np.array([mean, std, last, slope], dtype=float)
        X_list.append(feat)
        y_list.append(int(lr["label_value"]))
        meta.append(
            {
                "enterprise_id": eid,
                "as_of_date": as_of,
                "label_type": label_type,
            }
        )

    conn.close()

    if not X_list:
        return np.zeros((0, 0)), np.zeros((0,)), []

    X = np.vstack(X_list)
    y = np.array(y_list, dtype=int)
    return X, y, meta


def build_features_for_single(
    enterprise_id: int,
    as_of_date: str,
    lookback_days: int = 90,
    db_path: Optional[str] = None,
) -> np.ndarray:
    """
    为单个企业、某个 as_of_date 构建一行特征，用于在线预测。

    当前实现与 build_ml_dataset 使用一致的 4 维特征：
    - 过去 lookback_days 内 risk_score 的均值/标准差/最后值/斜率
    """
    conn = _get_conn(db_path)
    conn.row_factory = sqlite3.Row
    cu = conn.cursor()

    as_of_dt = datetime.strptime(as_of_date[:10], "%Y-%m-%d").date()
    start_dt = as_of_dt - timedelta(days=lookback_days)
    cu.execute(
        """
        SELECT ts_date, risk_score
        FROM enterprise_risk_timeseries
        WHERE enterprise_id=? AND ts_date BETWEEN ? AND ?
        ORDER BY ts_date ASC
        """,
        (enterprise_id, start_dt.isoformat(), as_of_dt.isoformat()),
    )
    rows = cu.fetchall()
    conn.close()

    if not rows:
        return np.zeros((0,))

    scores = [float(r["risk_score"]) for r in rows]
    arr = np.array(scores, dtype=float)
    mean = float(arr.mean())
    std = float(arr.std())
    last = float(arr[-1])
    slope = float(_linear_trend(scores))
    return np.array([mean, std, last, slope], dtype=float)

