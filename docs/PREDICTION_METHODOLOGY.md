# 风险预测方法说明

本文档说明当前风险预测的**假设、输入、公式、局限**，以及如何通过回测与配置实现**准确、客观、可复现**。

---

## 一、目标与原则

- **全面**：纳入企业自身风险时间序列与宏观指数（政策与市场环境）。
- **准确**：通过历史回测得到 MAE、RMSE、方向准确率及相对朴素基准的提升，并用于预测区间。
- **客观**：权重与关键参数存入 `prediction_config` 表，可配置、可审计，避免硬编码。
- **科学**：公式与假设文档化，提供预测区间（基于回测残差），与基准对比评估。

---

## 二、输入数据

| 来源 | 说明 |
|------|------|
| `enterprise_risk_timeseries` | 按日、按企业聚合的风险得分（法律/经营/舆情/政策/行业、综合 risk_score 0–100），由 `enterprise_event_feature` 聚合得到，事件特征来自企业相关新闻等。 |
| `macro_daily_index` | 按日宏观指数（由「最新政策与市场环境」新闻计算得到的 policy_score / macro_risk_score 0–1），用于对预测做水平调整。 |
| `backtest_metrics` | 回测得到的残差标准差（如 `residual_std_7d`、`residual_std_30d`），用于预测区间。 |
| `prediction_config` | 可配置参数：`macro_adjustment_scale`、`macro_neutral`、`prediction_interval_z`。 |

---

## 三、预测公式

1. **趋势估计**  
   取企业最近 `lookback_days`（默认 30）天的 `risk_score`，用最小二乘拟合线性趋势，得到斜率 `slope` 和末点 `base_score`。

2. **宏观调整**  
   从 `macro_daily_index` 取最近一天的 `macro_risk_score`（0–1），与配置的 `macro_neutral`（默认 0.5）比较：  
   `adjustment = macro_adjustment_scale * (macro_risk_score - macro_neutral)`，并限制在 ±10 分。

3. **点预测**  
   未来第 `i` 天（i=1…horizon_days）：  
   `pred_score_i = clip(base_score + slope * i + adjustment, 0, 100)`。

4. **预测区间**（若存在回测残差标准差）  
   取 `backtest_metrics` 中对应 horizon 的 `residual_std`，以及 `prediction_config` 中的 `prediction_interval_z`（默认 1.96，约 95% 区间）：  
   `interval_i = [pred_score_i - z * residual_std, pred_score_i + z * residual_std]`，再裁剪到 [0, 100]。

---

## 四、回测与准确性

- **接口**：`GET /api/v1/predict/backtest?lookback_days=30&horizon_days=7`（需登录）。
- **做法**：对每个企业、每个满足条件的日期 T，仅用 [T-30, T] 的数据做线性外推，得到 T+7（或 T+30）的预测值，与真实值比较；同时计算「朴素基准」（预测值=当日值）的 MAE。
- **输出**：MAE、RMSE、方向准确率、相对朴素基准的提升、残差标准差；结果写入 `backtest_metrics`，供预测区间使用。
- **建议**：在时间序列数据积累后定期运行回测（如每周），以监控预测表现并更新残差标准差。

---

## 五、可配置参数（客观与可审计）

| 键 | 含义 | 默认 |
|----|------|------|
| `macro_adjustment_scale` | 宏观指数每偏离中性 0.1 时对风险分的调整幅度 | 20（即约 ±10 分） |
| `macro_neutral` | 宏观中性值，高于此值加分、低于减分 | 0.5 |
| `prediction_interval_z` | 预测区间的 z 值（1.96 约 95%） | 1.96 |

以上存储在 `prediction_config` 表中，可通过 SQL 或后续管理界面修改，避免改代码。

---

## 六、局限与未覆盖因素

- **模型**：当前为线性外推 + 宏观水平调整，对拐点、突发事件、非线性关系不敏感。
- **数据**：未纳入裁判文书/监管处罚、财报指标、行业景气指数等；政策/宏观通过 `macro_daily_index` 参与，未按企业维度细分。
- **区间**：预测区间基于历史回测残差，假设未来误差分布与历史相近；未区分不同风险等级或行业。
- **用途**：预测仅供辅助参考，不构成唯一决策依据，需结合右侧「最新政策与市场环境」及业务判断使用。

---

## 七、与「全面、准确、客观、科学」的对应

| 维度 | 实现方式 |
|------|----------|
| 全面 | 企业时间序列（多维度聚合）+ 宏观指数；数据覆盖缺口见第六节。 |
| 准确 | 回测得到 MAE/RMSE/方向准确率/相对基准提升；残差标准差用于区间。 |
| 客观 | 权重与关键参数存 `prediction_config`，可配置、可查、可审计。 |
| 科学 | 公式与假设本文档化；提供预测区间；与朴素基准对比评估。 |
