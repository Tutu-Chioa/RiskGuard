#!/usr/bin/env bash
# 本地测试「生成二维码」登录脚本，无需打包 .app，改完 run_media_login_with_qr.py 直接重跑即可
# 用法：从项目根执行 ./scripts/test_media_login_local.sh

set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$PWD"

# 与 app.py 里一致：数据目录用 Application Support（与 .app 一致）或项目 data
if [[ -d "$HOME/Library/Application Support/RiskGuard" ]]; then
  DATA_DIR="$HOME/Library/Application Support/RiskGuard"
else
  DATA_DIR="$PROJECT_ROOT/data"
  mkdir -p "$DATA_DIR"
fi

MC_PATH="${MEDIACRAWLER_PATH:-$PROJECT_ROOT/MediaCrawler}"
if [[ ! -d "$MC_PATH" ]]; then
  MC_PATH="$DATA_DIR/MediaCrawler"
fi
if [[ ! -d "$MC_PATH" ]]; then
  echo "错误: 找不到 MediaCrawler 目录，请设置 MEDIACRAWLER_PATH 或确保项目内有 MediaCrawler"
  exit 1
fi

QR_DIR="$DATA_DIR/mediacrawler_qr"
SESSIONS_DIR="$DATA_DIR/mediacrawler_sessions"
PLATFORM="${1:-xhs}"
mkdir -p "$QR_DIR" "$SESSIONS_DIR"
QR_FILE="$QR_DIR/$PLATFORM.txt"

export MEDIACRAWLER_PATH="$MC_PATH"
export MEDIACRAWLER_QR_FILE="$QR_FILE"
export SYS2_SESSIONS_DIR="$SESSIONS_DIR"
export PLATFORM="$PLATFORM"
# 使用与 .app 相同的 Playwright 浏览器目录（若存在），否则用默认
if [[ -d "$DATA_DIR/playwright-browsers" ]]; then
  export PLAYWRIGHT_BROWSERS_PATH="$DATA_DIR/playwright-browsers"
fi

echo "MEDIACRAWLER_PATH=$MEDIACRAWLER_PATH"
echo "MEDIACRAWLER_QR_FILE=$MEDIACRAWLER_QR_FILE"
echo "PLATFORM=$PLATFORM"
echo "---"
python3 -m backend.scripts.run_media_login_with_qr
