#!/bin/bash
# 将 RiskGuard 打包为 Mac .app 并生成 .dmg
# 使用前：请在本机安装 Python 3 并 pip install -r backend/requirements.txt
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
APP_NAME="RiskGuard"
DMG_NAME="${APP_NAME}.dmg"
BUILD_DIR="${PROJECT_ROOT}/dist-mac"
APP_PATH="${BUILD_DIR}/${APP_NAME}.app"
RESOURCES="${APP_PATH}/Contents/Resources"
MACOS="${APP_PATH}/Contents/MacOS"

echo "项目根目录: $PROJECT_ROOT"
echo "输出目录: $BUILD_DIR"
echo ""

# 1. 构建前端
echo "[1/5] 构建前端..."
cd "$PROJECT_ROOT"
npm run build:frontend
echo ""

# 2. 创建 .app 目录结构
echo "[2/5] 创建 .app 结构..."
rm -rf "$BUILD_DIR"
mkdir -p "$MACOS" "$RESOURCES/data" "$RESOURCES/backend" "$RESOURCES/risk_frontend"

# 3. 复制后端（排除 __pycache__、.env 等）
echo "[3/5] 复制后端..."
rsync -a --exclude='__pycache__' --exclude='*.pyc' --exclude='.env' \
  "${PROJECT_ROOT}/backend/" "${RESOURCES}/backend/"
# 若存在 .env 则复制（用户可能已配置）
if [ -f "${PROJECT_ROOT}/backend/.env" ]; then
  cp "${PROJECT_ROOT}/backend/.env" "${RESOURCES}/backend/.env"
else
  [ -f "${PROJECT_ROOT}/backend/.env.example" ] && cp "${PROJECT_ROOT}/backend/.env.example" "${RESOURCES}/backend/.env" || true
fi

# 4. 复制前端 build
echo "[4/5] 复制前端 build..."
cp -R "${PROJECT_ROOT}/risk_frontend/build" "${RESOURCES}/risk_frontend/"

# 5. 安装启动脚本与 Info.plist
cp "${SCRIPT_DIR}/riskguard-launcher" "$MACOS/"
chmod +x "$MACOS/riskguard-launcher"

# Info.plist
cat > "${APP_PATH}/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>riskguard-launcher</string>
  <key>CFBundleIdentifier</key>
  <string>com.riskguard.app</string>
  <key>CFBundleName</key>
  <string>RiskGuard</string>
  <key>CFBundleDisplayName</key>
  <string>RiskGuard 企业风险监控</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
PLIST

echo "[5/5] 生成 .dmg..."
# 创建只读 .dmg（用户将 .app 拖到「应用程序」使用）
if command -v create-dmg &>/dev/null; then
  create-dmg --volname "$APP_NAME" --window-size 520 320 --app-drop-link 380 120 "$BUILD_DIR/$DMG_NAME" "$APP_PATH"
else
  # 无 create-dmg 时用 hdiutil
  hdiutil create -volname "$APP_NAME" -srcfolder "$APP_PATH" -ov -format UDZO "$BUILD_DIR/$DMG_NAME"
fi

echo ""
echo "完成。"
echo "  .app: $APP_PATH"
echo "  .dmg: $BUILD_DIR/$DMG_NAME"
echo ""
echo "使用方式："
echo "  - 直接双击运行: $APP_PATH"
echo "  - 或打开 .dmg，将 RiskGuard 拖到「应用程序」后从启动台/Spotlight 打开"
echo "  - 首次运行需本机已安装 Python 3 并执行: pip install -r backend/requirements.txt（或安装到 .app 同目录的 venv）"
