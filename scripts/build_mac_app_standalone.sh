#!/bin/bash
# 打包成「自包含」Mac 应用：他人电脑无需安装 Python，拖到「应用程序」双击即用
# 使用前：pip install pyinstaller pywebview（及 backend/requirements.txt 全部依赖）
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

APP_NAME="RiskGuard"
DMG_NAME="${APP_NAME}.dmg"
DIST_APP="$PROJECT_ROOT/dist/${APP_NAME}.app"

echo "=== 1. 构建前端 ==="
npm run build:frontend

echo ""
echo "=== 2. 安装打包依赖（若未装）==="
pip install -q pyinstaller pywebview 2>/dev/null || true
# MediaCrawler 扫码/爬取所需依赖（与 spec hiddenimports 对应）
pip install -q parsel PyExecJS pyhumps aiosqlite aiomysql motor opencv-python aiofiles 2>/dev/null || true

echo ""
echo "=== 3. PyInstaller 打包（含 Python + 后端 + 前端，约需数分钟）==="
# --noconfirm 覆盖已有 build/dist；--clean 清理缓存
pyinstaller --noconfirm --clean scripts/mac/RiskGuard.spec

# PyInstaller 引导程序要求 PYTHONHOME=Contents/Frameworks，并从该路径加载 libpython 与标准库。
# 因此：可执行文件单独放 MacOS，其余（base_library.zip、python3.12、_internal、frontend 等）全部放 Frameworks。
RAW_DIR="$PROJECT_ROOT/dist/RiskGuard"
if [ -d "$RAW_DIR" ] && [ ! -d "$DIST_APP" ]; then
  echo "整理为标准 .app 结构（可执行文件 -> MacOS，其余 -> Frameworks）..."
  mkdir -p "$DIST_APP/Contents/MacOS" "$DIST_APP/Contents/Frameworks" "$DIST_APP/Contents/Resources"
  [ -f "$RAW_DIR/RiskGuard" ] && mv "$RAW_DIR/RiskGuard" "$DIST_APP/Contents/MacOS/"
  for x in "$RAW_DIR"/*; do [ -e "$x" ] && mv "$x" "$DIST_APP/Contents/Frameworks/"; done
  rmdir "$RAW_DIR" 2>/dev/null || true
  # PyInstaller 6 常把 base_library.zip、python3.12 放在 _internal 下，但引导程序从 Frameworks 根目录查找，需上移
  if [ -d "$DIST_APP/Contents/Frameworks/_internal" ]; then
    mv "$DIST_APP/Contents/Frameworks/_internal"/* "$DIST_APP/Contents/Frameworks/" 2>/dev/null || true
    rmdir "$DIST_APP/Contents/Frameworks/_internal" 2>/dev/null || true
  fi
  # 若 PyInstaller 未把 libpython 打进包，从当前 Python 复制（含 libintl）
  if ! ls "$DIST_APP/Contents/Frameworks"/libpython*.dylib 1>/dev/null 2>&1; then
    py_libdir="$(python3 -c "
import sys, os
exe = getattr(sys, 'executable', '')
if not exe: sys.exit(1)
base = os.path.dirname(os.path.abspath(exe))
for cand in [os.path.join(base, 'lib'), os.path.join(os.path.dirname(base), 'lib'), base]:
    if not cand or not os.path.isdir(cand): continue
    for name in os.listdir(cand):
        if name.startswith('libpython') and name.endswith('.dylib'):
            print(cand)
            sys.exit(0)
sys.exit(1)
" 2>/dev/null)"
    if [ -n "$py_libdir" ] && [ -d "$py_libdir" ]; then
      cp "$py_libdir"/libpython*.dylib "$DIST_APP/Contents/Frameworks/" 2>/dev/null || true
      for f in "$py_libdir"/*.dylib; do
        [ -f "$f" ] && cp "$f" "$DIST_APP/Contents/Frameworks/" 2>/dev/null || true
      done
      echo "已从当前 Python 复制 lib 到 Contents/Frameworks"
    fi
  fi
  # libpython 常依赖 libintl.8（gettext），若缺失则从 Homebrew / pyenv 查找并复制
  if ! [ -f "$DIST_APP/Contents/Frameworks/libintl.8.dylib" ]; then
    libintl_src=""
    for libdir in /opt/homebrew/lib /usr/local/lib; do
      [ -f "$libdir/libintl.8.dylib" ] && libintl_src="$libdir/libintl.8.dylib" && break
    done
    if [ -z "$libintl_src" ]; then
      libintl_src="$(find /opt/homebrew /usr/local "$HOME/.pyenv" -name 'libintl.8.dylib' 2>/dev/null | head -1)"
    fi
    if [ -n "$libintl_src" ] && [ -f "$libintl_src" ]; then
      cp "$libintl_src" "$DIST_APP/Contents/Frameworks/" && echo "已复制 libintl.8.dylib 到 Contents/Frameworks"
    fi
  fi
  # 应用图标：若有 RiskGuard.icns 则放入 Resources 并在 Info.plist 中声明
  ICON_SRC="$SCRIPT_DIR/mac/RiskGuard.icns"
  if [ ! -f "$ICON_SRC" ]; then
    chmod +x "$SCRIPT_DIR/mac/make_icon.sh" 2>/dev/null || true
    "$SCRIPT_DIR/mac/make_icon.sh" 2>/dev/null && ICON_SRC="$SCRIPT_DIR/mac/RiskGuard.icns" || true
  fi
  if [ -f "$ICON_SRC" ]; then
    cp "$ICON_SRC" "$DIST_APP/Contents/Resources/" && echo "已添加应用图标"
    ICON_PLIST='  <key>CFBundleIconFile</key>
  <string>RiskGuard</string>'
  else
    ICON_PLIST=""
  fi
  # Info.plist 为双击打开所必需
  cat > "$DIST_APP/Contents/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>RiskGuard</string>
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
${ICON_PLIST}
</dict>
</plist>
PLIST
fi

# 若 .app 已存在且存在 RiskGuard.icns，确保图标在 Resources 且 Info.plist 已声明（避免漏写）
ICON_SRC="$SCRIPT_DIR/mac/RiskGuard.icns"
if [ -d "$DIST_APP" ] && [ -f "$ICON_SRC" ]; then
  mkdir -p "$DIST_APP/Contents/Resources"
  cp "$ICON_SRC" "$DIST_APP/Contents/Resources/"
  if ! grep -q "CFBundleIconFile" "$DIST_APP/Contents/Info.plist" 2>/dev/null; then
    /usr/libexec/PlistBuddy -c "Add :CFBundleIconFile string RiskGuard" "$DIST_APP/Contents/Info.plist" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :CFBundleIconFile RiskGuard" "$DIST_APP/Contents/Info.plist" 2>/dev/null || true
  fi
fi

if [ ! -d "$DIST_APP" ] || [ ! -f "$DIST_APP/Contents/MacOS/RiskGuard" ]; then
  echo "未找到可执行文件，请检查 PyInstaller 输出: dist/"
  exit 1
fi

echo ""
echo "=== 4. 生成 .dmg（可选）==="
if command -v create-dmg &>/dev/null; then
  # 若无可用的 DMG 背景图则尝试生成（需 Pillow）
  DMG_BG="$SCRIPT_DIR/mac/dmg_background.png"
  if [ ! -f "$DMG_BG" ] && command -v python3 &>/dev/null; then
    python3 "$SCRIPT_DIR/mac/make_dmg_background.py" 2>/dev/null || true
  fi
  # 背景图必须用绝对路径；有背景时不能加 --skip-jenkins，否则 AppleScript 不跑、背景和图标位置不生效
  [ -f "$DMG_BG" ] && DMG_BG="$(cd "$(dirname "$DMG_BG")" && pwd)/$(basename "$DMG_BG")"
  # create-dmg 需要「包含 .app 的文件夹」作为源，卷内只显示 RiskGuard.app 与应用程序链接
  DMG_SRC=$(mktemp -d)
  cp -R "$DIST_APP" "$DMG_SRC/"
  VOLICON_ARG=()
  [ -f "$SCRIPT_DIR/mac/RiskGuard.icns" ] && VOLICON_ARG=(--volicon "$SCRIPT_DIR/mac/RiskGuard.icns")
  BG_ARG=()
  SKIP_JENKINS_ARG=(--skip-jenkins)
  if [ -f "$DMG_BG" ]; then
    BG_ARG=(--background "$DMG_BG")
    SKIP_JENKINS_ARG=()   # 有背景时必须跑 AppleScript，否则背景和图标布局不生效
  fi
  create-dmg \
    --volname "${APP_NAME}" \
    "${VOLICON_ARG[@]}" \
    "${BG_ARG[@]}" \
    --window-size 560 360 \
    --icon-size 80 \
    --text-size 13 \
    --icon "${APP_NAME}.app" 120 110 \
    --app-drop-link 400 110 \
    "${SKIP_JENKINS_ARG[@]}" \
    "$PROJECT_ROOT/dist/$DMG_NAME" "$DMG_SRC" && echo "已生成带「拖到应用程序」界面的 .dmg" || true
  rm -rf "$DMG_SRC"
else
  hdiutil create -volname "$APP_NAME" -srcfolder "$DIST_APP" -ov -format UDZO \
    "$PROJECT_ROOT/dist/$DMG_NAME" 2>/dev/null && echo "已生成简易 .dmg（仅包含 app，无拖拽界面）" || true
  echo "提示：若需双击 .dmg 出现「拖到应用程序」界面，请安装: brew install create-dmg  后重新执行本脚本"
fi

echo ""
echo "完成。"
echo "  应用: $DIST_APP"
echo "  可将 ${APP_NAME}.app 拖到「应用程序」或发给他人，双击即可使用（无需安装 Python）。"
echo "  数据目录: ~/Library/Application Support/RiskGuard/"
echo ""
echo "若双击打不开，请在终端执行以下命令查看报错："
echo "  $DIST_APP/Contents/MacOS/RiskGuard"
