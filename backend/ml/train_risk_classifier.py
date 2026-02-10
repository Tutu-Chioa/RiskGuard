# -*- coding: utf-8 -*-
"""
风险分类模型训练脚本骨架（阶段 2）
----------------------------------
说明：
- 本脚本演示如何从 feature_builder 构建训练数据，并用 XGBoost / sklearn 训练模型。
- 目前仅提供结构和注释，避免仓库在未安装机器学习依赖时报错。

使用步骤（建议在单独虚拟环境中执行）：
1. 安装依赖：
   pip install scikit-learn xgboost joblib
2. 在 backend/ml/feature_builder.py 中实现 build_ml_dataset(...)
3. 运行：
   python -m backend.ml.train_risk_classifier
"""

from __future__ import annotations

import os


def main():
    try:
        import joblib  # type: ignore
        from xgboost import XGBClassifier  # type: ignore
        from sklearn.model_selection import train_test_split  # type: ignore
        from sklearn.metrics import roc_auc_score, classification_report  # type: ignore
    except ImportError:
        print("请先安装依赖：pip install scikit-learn xgboost joblib")
        return

    from backend.ml import feature_builder as fb

    if fb.DB_PATH is None:
        # 默认从环境变量或固定路径读取，可按需修改
        from backend import app as backend_app  # type: ignore
        fb.DB_PATH = backend_app._DB_PATH  # noqa: SLF001

    print("构建训练数据集...")
    try:
        X, y, meta = fb.build_ml_dataset(label_type="explosion", lookback_days=90, horizon_days=30)
    except NotImplementedError:
        print("build_ml_dataset 尚未实现，请先在 backend/ml/feature_builder.py 中补充逻辑。")
        return

    if X.shape[0] == 0:
        print("没有可用训练样本，请先在 enterprise_risk_label 中准备标签数据。")
        return

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

    print(f"训练样本数: {X_train.shape[0]}, 验证样本数: {X_val.shape[0]}, 特征数: {X_train.shape[1]}")

    model = XGBClassifier(
        max_depth=4,
        n_estimators=200,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
    )
    model.fit(X_train, y_train)

    y_pred_prob = model.predict_proba(X_val)[:, 1]
    auc = roc_auc_score(y_val, y_pred_prob)
    print("Validation AUC:", auc)
    print(classification_report(y_val, (y_pred_prob > 0.5).astype(int)))

    os.makedirs("models", exist_ok=True)
    out_path = os.path.join("models", "risk_classifier_explosion.pkl")
    joblib.dump(model, out_path)
    print("模型已保存到:", out_path)


if __name__ == "__main__":
    main()

