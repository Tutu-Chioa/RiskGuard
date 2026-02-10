# -*- coding: utf-8 -*-
"""
简单预测服务（阶段 1）
----------------------
基于 enterprise_risk_timeseries 做一个轻量级、可解释的风险“趋势预测”：
- 使用最近 N 天的 risk_score 做线性趋势 + 移动平均
- 预测未来 horizon_days 的风险分数和等级
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

DB_PATH: Optional[str] = None


def _get_conn(db_path: Optional[str] = None) -> sqlite3.Connection:
    path = db_path or DB_PATH
    if not path:
        raise RuntimeError("prediction_service.DB_PATH 未设置")
    return sqlite3.connect(path, timeout=30)


def _risk_level_from_score(score: float) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def _linear_trend(xs: List[float]) -> float:
    """
    计算简单线性趋势斜率（最小二乘），用于判断上升/下降速度。
    """
    n = len(xs)
    if n < 2:
        return 0.0
    x_vals = list(range(n))
    mean_x = sum(x_vals) / n
    mean_y = sum(xs) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_vals, xs))
    den = sum((x - mean_x) ** 2 for x in x_vals) or 1.0
    return num / den


def _safe_ml_risk_probability(enterprise_id: int, as_of_date: str, db_path: Optional[str]) -> Optional[float]:
    """
    阶段 2 占位：尝试加载 ML 模型并返回爆雷/高风险概率。
    - 若未安装相关依赖或模型文件缺失，返回 None，不影响整体接口。
    """
    try:
        from backend.ml import feature_builder as fb  # type: ignore
        import joblib  # type: ignore
    except Exception:
        return None

    # 设置 DB_PATH（若尚未设置）
    if fb.DB_PATH is None:
        fb.DB_PATH = db_path or DB_PATH
    if not fb.DB_PATH:
        return None

    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "models", "risk_classifier_explosion.pkl")
    model_path = os.path.abspath(model_path)
    if not os.path.isfile(model_path):
        return None

    try:
        model = joblib.load(model_path)
    except Exception:
        return None

    try:
        import numpy as np  # type: ignore
        x = fb.build_features_for_single(enterprise_id, as_of_date, db_path=fb.DB_PATH)
        if x is None or (isinstance(x, np.ndarray) and x.size == 0):
            return None
        proba = model.predict_proba(x.reshape(1, -1))[0, 1]
        return float(proba)
    except Exception:
        return None


def _get_prediction_config(db_path: Optional[str] = None) -> Dict[str, Any]:
    """从 prediction_config 表读取可配置参数，便于客观调参与审计。"""
    conn = _get_conn(db_path)
    cur = conn.cursor()
    cur.execute("SELECT key, value_text FROM prediction_config")
    rows = cur.fetchall()
    conn.close()
    cfg = {"macro_adjustment_scale": 20.0, "macro_neutral": 0.5, "prediction_interval_z": 1.96}
    for r in rows:
        k, v = r[0], r[1]
        if k == "macro_adjustment_scale":
            try:
                cfg[k] = float(v)
            except (TypeError, ValueError):
                pass
        elif k == "macro_neutral":
            try:
                cfg[k] = float(v)
            except (TypeError, ValueError):
                pass
        elif k == "prediction_interval_z":
            try:
                cfg[k] = float(v)
            except (TypeError, ValueError):
                pass
    return cfg


def _get_macro_adjustment(db_path: Optional[str] = None) -> tuple[float, bool]:
    """
    从 macro_daily_index 取最新宏观指数，计算对风险分的调整量（可正可负）。
    权重与中性值从 prediction_config 读取，保证可配置、可审计。
    返回 (adjustment, used)：adjustment 为对 risk_score 的加减分（约 -10~+10），used 表示是否使用了宏观数据。
    """
    try:
        from backend.services import macro_index_service as mis
        mis.DB_PATH = db_path or DB_PATH
        history = mis.get_macro_index_history(days=7, db_path=db_path)
    except Exception:
        return 0.0, False
    if not history:
        return 0.0, False
    cfg = _get_prediction_config(db_path)
    scale = cfg.get("macro_adjustment_scale", 20.0)
    neutral = cfg.get("macro_neutral", 0.5)
    latest = history[0]
    macro = float(latest.get("macro_risk_score", neutral))
    adj = scale * (macro - neutral)
    adj = max(-10.0, min(10.0, adj))
    return adj, True


def _get_residual_std(horizon_days: int, db_path: Optional[str] = None) -> Optional[float]:
    """从 backtest_metrics 读取对应 horizon 的残差标准差，用于预测区间。"""
    conn = _get_conn(db_path)
    cur = conn.cursor()
    cur.execute(
        "SELECT value_real FROM backtest_metrics WHERE metric_name = ?",
        ("residual_std_%dd" % horizon_days,),
    )
    row = cur.fetchone()
    conn.close()
    if row and row[0] is not None:
        return float(row[0])
    # 若没有对应 horizon，尝试 7d 或 30d
    for h in (7, 30):
        if h == horizon_days:
            continue
        conn = _get_conn(db_path)
        cur = conn.cursor()
        cur.execute("SELECT value_real FROM backtest_metrics WHERE metric_name = ?", ("residual_std_%dd" % h,))
        row = cur.fetchone()
        conn.close()
        if row and row[0] is not None:
            return float(row[0])
    return None


def predict_risk_for_enterprise(
    enterprise_id: int,
    horizon_days: int = 30,
    db_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    基于 enterprise_risk_timeseries 对单个 enterprise 做简单预测；
    若存在 macro_daily_index 则纳入宏观指数对预测分数做水平调整。
    返回包含 base 场景的预测结果（未来 horizon_days 每日一条）。
    """
    conn = _get_conn(db_path)
    conn.row_factory = sqlite3.Row
    cu = conn.cursor()
    cu.execute(
        """
        SELECT ts_date, risk_score, score_legal, score_business, score_media,
               score_policy, score_industry
        FROM enterprise_risk_timeseries
        WHERE enterprise_id=?
        ORDER BY ts_date ASC
        """,
        (enterprise_id,),
    )
    rows = cu.fetchall()
    conn.close()
    if not rows:
        return {
            "enterprise_id": enterprise_id,
            "history": [],
            "predictions": [],
            "message": "no_timeseries_data",
            "macro_considered": False,
            "macro_note": "当前预测仅基于企业自身风险时间序列，未纳入宏观因素；可参考右侧「最新政策与市场环境」做综合判断。",
        }

    # 最近窗口（例如 30 天）用于趋势估计
    history = [
        {
            "date": r["ts_date"],
            "risk_score": float(r["risk_score"]),
            "score_legal": float(r["score_legal"]),
            "score_business": float(r["score_business"]),
            "score_media": float(r["score_media"]),
            "score_policy": float(r["score_policy"]),
            "score_industry": float(r["score_industry"]),
        }
        for r in rows
    ]
    window = history[-min(30, len(history)):]
    last = window[-1]
    base_score = last["risk_score"]
    scores = [h["risk_score"] for h in window]
    slope = _linear_trend(scores)

    # 解释趋势：正斜率 => 上升，负斜率 => 下降
    if slope > 0.3:
        trend_desc = "近期风险有明显上升趋势"
    elif slope < -0.3:
        trend_desc = "近期风险有明显下降趋势"
    else:
        trend_desc = "近期风险总体较为平稳"

    # 宏观指数调整（基于 macro_daily_index，若有则对预测分数做水平平移）
    macro_adj, macro_used = _get_macro_adjustment(db_path)

    # 预测区间：用回测残差标准差与配置的 z 值得到约 95% 区间
    cfg = _get_prediction_config(db_path)
    z = cfg.get("prediction_interval_z", 1.96)
    residual_std = _get_residual_std(horizon_days, db_path)

    # 未来预测：简单线性外推 + 宏观调整 + 边界裁剪 + 可选预测区间
    last_date = datetime.strptime(last["date"], "%Y-%m-%d").date()
    preds: List[Dict[str, Any]] = []
    for i in range(1, horizon_days + 1):
        d = last_date + timedelta(days=i)
        s = max(0.0, min(100.0, base_score + slope * i + macro_adj))
        interval = None
        if residual_std is not None and residual_std > 0:
            half = z * residual_std
            interval = [max(0.0, s - half), min(100.0, s + half)]
        preds.append(
            {
                "date": d.isoformat(),
                "scenario": "base",
                "risk_score": s,
                "risk_level": _risk_level_from_score(s),
                "probability": None,
                "confidence_interval": interval,
                "dimension_scores": None,
                "explanations": None,
            }
        )

    ml_prob = _safe_ml_risk_probability(enterprise_id, last["date"], db_path)

    return {
        "enterprise_id": enterprise_id,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "horizon_days": horizon_days,
        "history": history,
        "predictions": preds,
        "trend_description": trend_desc,
        "ml_risk_probability": ml_prob,
        "macro_considered": macro_used,
        "macro_note": "已纳入宏观指数（基于「最新政策与市场环境」新闻计算的当日宏观风险）对预测的调整；若未显示则暂无宏观数据，请先刷新右侧政策与市场环境。" if macro_used else "当前未纳入宏观指数，可先刷新右侧「最新政策与市场环境」后再次预测。",
        "confidence_interval_based_on_backtest": residual_std is not None,
    }

