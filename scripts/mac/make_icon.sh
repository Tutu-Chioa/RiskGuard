#!/bin/bash
# 生成 RiskGuard.icns 供 Mac .app 使用。默认用项目左上角 logo（紫蓝渐变+闪电）的 SVG。
# 用法: ./make_icon.sh [源图.png 或 源图.svg]，不传则用 scripts/mac/riskguard-logo.svg
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEFAULT_SVG="$SCRIPT_DIR/riskguard-logo.svg"
DEFAULT_PNG="$PROJECT_ROOT/risk_frontend/public/logo512.png"
SRC="${1:-}"
if [ -z "$SRC" ]; then
  [ -f "$DEFAULT_SVG" ] && SRC="$DEFAULT_SVG" || SRC="$DEFAULT_PNG"
fi
OUT_ICNS="$SCRIPT_DIR/RiskGuard.icns"
ICONSET="$SCRIPT_DIR/RiskGuard.iconset"

if [ ! -f "$SRC" ]; then
  echo "源图不存在: $SRC"
  echo "用法: $0 [源图路径]"
  echo "默认优先使用 scripts/mac/riskguard-logo.svg（与左上角 logo 一致）"
  exit 1
fi

echo "从 $SRC 生成 .icns ..."
rm -rf "$ICONSET"
mkdir -p "$ICONSET"

# 若源为 SVG，先用 qlmanage 转为 1024 的 PNG（Retina 友好），再生成各尺寸
WORK_PNG="$SRC"
if [ "${SRC##*.}" = "svg" ]; then
  qlmanage -t -s 1024 -o "$SCRIPT_DIR" "$SRC" 2>/dev/null || true
  WORK_PNG="$SCRIPT_DIR/$(basename "$SRC").png"
  if [ ! -f "$WORK_PNG" ]; then
    qlmanage -t -s 512 -o "$SCRIPT_DIR" "$SRC" 2>/dev/null || true
    WORK_PNG="$SCRIPT_DIR/$(basename "$SRC").png"
  fi
  if [ ! -f "$WORK_PNG" ]; then
    echo "SVG 转 PNG 失败，请安装或使用 PNG 源图。"
    exit 1
  fi
fi

for size in 16 32 128 256 512; do
  sips -z $size $size "$WORK_PNG" --out "$ICONSET/icon_${size}x${size}.png" 2>/dev/null || true
  size2=$((size * 2))
  sips -z $size2 $size2 "$WORK_PNG" --out "$ICONSET/icon_${size}x${size}@2x.png" 2>/dev/null || true
done

iconutil -c icns "$ICONSET" -o "$OUT_ICNS"
rm -rf "$ICONSET"
if [ "$WORK_PNG" != "$SRC" ] && [ -f "$WORK_PNG" ]; then rm -f "$WORK_PNG"; fi
echo "已生成: $OUT_ICNS"
echo "打包 .app 时会自动使用此图标。"
