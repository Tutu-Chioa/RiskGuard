# -*- coding: utf-8 -*-
"""
预测回测服务
------------
用历史时间序列做“模拟预测”，与真实值对比，得到 MAE、RMSE、方向准确率、残差标准差等，
用于评估准确性、与基准对比、以及为预测区间提供残差标准差。
"""
from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple

DB_PATH: Optional[str] = None

# 与 prediction_service 一致的线性趋势与预测逻辑（不含宏观，回测时宏观历史难复现）
def _linear_trend(xs: List[float]) -> float:
    n = len(xs)
    if n < 2:
        return 0.0
    x_vals = list(range(n))
    mean_x = sum(x_vals) / n
    mean_y = sum(xs) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_vals, xs))
    den = sum((x - mean_x) ** 2 for x in x_vals) or 1.0
    return num / den


def _get_conn(db_path: Optional[str] = None) -> sqlite3.Connection:
    path = db_path or DB_PATH
    if not path:
        raise RuntimeError("backtest_service.DB_PATH 未设置")
    return sqlite3.connect(path, timeout=30)


def run_backtest(
    lookback_days: int = 30,
    horizon_days: int = 7,
    max_enterprises: Optional[int] = 200,
    db_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    对 enterprise_risk_timeseries 做历史回测：
    - 对每个企业、每个满足条件的日期 T，用 [T-lookback, T] 预测 T+horizon_days，与真实值比较。
    - 同时计算“朴素基准”（预测值=当日值）的 MAE，得到相对提升。
    - 返回 MAE、RMSE、方向准确率、残差标准差、相对基准提升，并写入 backtest_metrics 表供预测区间使用。
    """
    conn = _get_conn(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """
        SELECT enterprise_id, ts_date, risk_score
        FROM enterprise_risk_timeseries
        ORDER BY enterprise_id, ts_date
        """
    )
    rows = cur.fetchall()
    conn.close()
    if not rows:
        return {"error": "无时间序列数据", "n_samples": 0}

    # 按企业分组，每个企业一组 (date, score)
    by_enterprise: Dict[int, List[Tuple[str, float]]] = {}
    for r in rows:
        eid = r["enterprise_id"]
        if eid not in by_enterprise:
            by_enterprise[eid] = []
        by_enterprise[eid].append((r["ts_date"], float(r["risk_score"])))

    need_total = lookback_days + horizon_days
    errors_model: List[float] = []
    errors_naive: List[float] = []
    directions_correct = 0
    directions_total = 0
    n_enterprises = 0
    for eid, series in by_enterprise.items():
        if max_enterprises is not None and n_enterprises >= max_enterprises:
            break
        if len(series) < need_total:
            continue
        n_enterprises += 1
        dates = [s[0] for s in series]
        scores = [s[1] for s in series]
        for i in range(lookback_days, len(series) - horizon_days):
            window = scores[i - lookback_days : i]
            base = window[-1]
            slope = _linear_trend(window)
            pred_model = max(0.0, min(100.0, base + slope * horizon_days))
            actual = scores[i + horizon_days]
            pred_naive = base  # 朴素：预测值 = 当日值
            errors_model.append(pred_model - actual)
            errors_naive.append(pred_naive - actual)
            # 方向：相对当日是升还是降
            change_actual = actual - base
            change_pred_model = pred_model - base
            if change_actual * change_pred_model >= 0:
                directions_correct += 1
            directions_total += 1

    if not errors_model:
        return {
            "error": "无有效回测样本（需企业至少有 %d 天时间序列）" % need_total,
            "n_samples": 0,
        }

    n = len(errors_model)
    mae_model = sum(abs(e) for e in errors_model) / n
    mae_naive = sum(abs(e) for e in errors_naive) / n
    rmse_model = (sum(e * e for e in errors_model) / n) ** 0.5
    residual_std = (sum((e - (sum(errors_model) / n)) ** 2 for e in errors_model) / max(1, n - 1)) ** 0.5
    dir_acc = directions_correct / directions_total if directions_total else 0.0
    improvement_vs_naive = (mae_naive - mae_model) / mae_naive if mae_naive else 0.0

    out = {
        "n_samples": n,
        "n_enterprises": n_enterprises,
        "lookback_days": lookback_days,
        "horizon_days": horizon_days,
        "mae": round(mae_model, 4),
        "rmse": round(rmse_model, 4),
        "mae_naive": round(mae_naive, 4),
        "improvement_vs_naive": round(improvement_vs_naive, 4),
        "direction_accuracy": round(dir_acc, 4),
        "residual_std": round(residual_std, 4),
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }

    # 写入 backtest_metrics，供预测区间使用
    try:
        conn = _get_conn(db_path)
        cur = conn.cursor()
        now = datetime.utcnow().isoformat()
        cur.execute(
            "INSERT OR REPLACE INTO backtest_metrics (metric_name, value_real, value_text, extra_json, updated_at) VALUES (?,?,?,?,?)",
            ("mae", mae_model, str(mae_model), None, now),
        )
        cur.execute(
            "INSERT OR REPLACE INTO backtest_metrics (metric_name, value_real, value_text, extra_json, updated_at) VALUES (?,?,?,?,?)",
            ("residual_std_%dd" % horizon_days, residual_std, str(residual_std), None, now),
        )
        cur.execute(
            "INSERT OR REPLACE INTO backtest_metrics (metric_name, value_real, value_text, extra_json, updated_at) VALUES (?,?,?,?,?)",
            ("direction_accuracy", dir_acc, str(dir_acc), None, now),
        )
        cur.execute(
            "INSERT OR REPLACE INTO backtest_metrics (metric_name, value_real, value_text, extra_json, updated_at) VALUES (?,?,?,?,?)",
            ("last_backtest", None, None, str(out), now),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass
    return out
