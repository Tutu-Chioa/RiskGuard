# PyInstaller spec for RiskGuard Mac .app (self-contained, no Python required on target)
# Run from project root after: npm run build:frontend
# Usage: pyinstaller scripts/mac/RiskGuard.spec

import os
import sys

# 须在项目根目录执行: pyinstaller scripts/mac/RiskGuard.spec
PROJECT_ROOT = os.getcwd()
FRONTEND_BUILD = os.path.join(PROJECT_ROOT, 'risk_frontend', 'build')
MEDIACRAWLER_ROOT = os.path.join(PROJECT_ROOT, 'MediaCrawler')

if not os.path.isdir(FRONTEND_BUILD):
    raise SystemExit('请先构建前端: npm run build:frontend')

# 前端 build 打进 bundle，运行时通过 sys._MEIPASS/frontend 访问
datas = [(FRONTEND_BUILD, 'frontend')]

# 将 MediaCrawler 源码打入 bundle（.app 一体），排除 venv/测试/文档等以减体积（轻量化）
_exclude_dirs = {'.git', '.venv', 'venv', '__pycache__', 'data', 'node_modules', 'browser_data', '.pytest_cache', 'tests', 'test', 'docs', '.github', 'examples', 'scripts'}
_exclude_files = {'.env', '.DS_Store', 'uv.lock', 'package-lock.json'}
if os.path.isdir(MEDIACRAWLER_ROOT):
    for _root, _dirs, _files in os.walk(MEDIACRAWLER_ROOT, topdown=True):
        _dirs[:] = [_d for _d in _dirs if _d not in _exclude_dirs]
        for _f in _files:
            if _f.endswith('.pyc') or _f in _exclude_files or _f.endswith('.md'):
                continue
            _src = os.path.join(_root, _f)
            _rel = os.path.relpath(_src, MEDIACRAWLER_ROOT)
            datas.append((_src, os.path.join('MediaCrawler', _rel)))

# 入口脚本（桌面窗口：Flask 子线程 + pywebview 主线程）
script = os.path.join(PROJECT_ROOT, 'backend', 'run_desktop.py')

# 可能未被自动扫描到的模块（含 .app 内用同一可执行文件跑 MediaCrawler 登录脚本）
# MediaCrawler 完整依赖见 requirements.txt，以下为 PyInstaller 易漏的 hiddenimport
hiddenimports = [
    'backend',
    'backend.app',
    'backend.scripts',
    'backend.scripts.run_media_login_with_qr',
    'backend.services',
    'backend.services.scheduler_service',
    'backend.services.llm_service',
    'backend.services.crawler',
    'backend.services.media_review_store',
    'backend.services.document_service',
    'backend.services.wordcloud_service',
    'backend.services.mediacrawler_service',
    'backend.services.enterprise_crawler',
    'flask',
    'flask_cors',
    'werkzeug',
    'jwt',
    'pyotp',
    'qrcode',
    'apscheduler',
    'webview',
    'dotenv',
    # MediaCrawler 扫码/爬取依赖（与 requirements.txt 对齐）
    'playwright',
    'playwright.__main__',  # python -m playwright install chromium
    'playwright.sync_api',
    'playwright.async_api',
    'tenacity',
    'typer',
    'aiofiles',
    'openpyxl',
    'cv2',
    'aiosqlite',
    'aiomysql',
    'motor',
    'motor.motor_asyncio',
    # MediaCrawler 各平台用到的第三方包（包名与 import 名可能不同）
    'parsel',       # pip: parsel, import: parsel
    'execjs',       # pip: PyExecJS, import: execjs
    'pyexecjs',     # 同上，部分环境
    'humps',        # pip: pyhumps, import: humps
    'pyhumps',      # 同上
    'httpx',
    'redis',
    'PIL',
    'PIL.Image',
]

# 排除大型/未用库以减体积：nltk/scipy 在 frozen 下易报错；pytest/sphinx 仅开发用
a = Analysis(
    [script],
    pathex=[PROJECT_ROOT],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['nltk', 'scipy', 'pyarrow', 'pytest', 'sphinx', 'IPython', 'notebook'],
    noarchive=False,
)

pyz = PYZ(a.pure)

# onedir：生成 .app 目录（Contents/MacOS/RiskGuard + Contents/Resources），他人电脑无需安装 Python
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='RiskGuard',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=True,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='RiskGuard',
)
