# 将 RiskGuard 打包为 Mac .dmg 应用

本说明介绍如何把项目打包成 **.dmg 磁盘镜像**，在 Mac 上像普通应用一样双击运行（无需终端、无需单独起前后端）。

## 推荐：自包含 .app（他人电脑无需装 Python，拖到「应用程序」双击即用）

**适合分发给别人**：打出来的应用内已包含 Python 与所有依赖，对方只需像普通 Mac 应用一样拖到「应用程序」、双击打开即可使用（桌面窗口，不依赖浏览器）。

### 前置要求（仅打包机需要）

- **macOS**
- **Node.js**（用于构建前端）
- **Python 3** 及全部依赖：
  ```bash
  pip3 install -r backend/requirements.txt
  pip3 install pyinstaller pywebview
  ```
  macOS 上若桌面窗口无法打开，可再装：`pip3 install pyobjc-framework-WebKit`

### 打包步骤（在项目根目录执行）

```bash
chmod +x scripts/build_mac_app_standalone.sh
./scripts/build_mac_app_standalone.sh
```

首次打包会稍慢（数分钟），完成后得到：

- **dist/RiskGuard.app**：自包含应用，可直接双击运行（桌面窗口内打开界面）
- **dist/RiskGuard.dmg**：可选，用于分发；对方打开 .dmg 后把 RiskGuard 拖到「应用程序」即可

### DMG 安装器界面

- 使用 **create-dmg** 生成 .dmg 时，会采用类似常见 Mac 安装器的拖拽界面：白底、主标题「RiskGuard」与「for Mac」、中间箭头指向「应用程序」、底部说明与兼容性文案。
- 背景图由 **scripts/mac/dmg_background.png** 提供；若该文件不存在，打包脚本会尝试运行 `python3 scripts/mac/make_dmg_background.py` 生成（需本机已安装 Pillow）。也可手动运行该脚本或替换 `dmg_background.png` 以自定义样式。

### 使用方式（含对方电脑）

1. 将 **RiskGuard.app** 拖到「应用程序」文件夹（或直接放在任意位置）。
2. 双击 **RiskGuard.app**，会弹出「RiskGuard 企业风险监控」窗口，在窗口内使用即可，无需浏览器、无需安装 Python。
3. 数据与配置保存在本机：`~/Library/Application Support/RiskGuard/`。

### MediaCrawler 内嵌（安装即用，无需对方装 Python/venv）

- 若项目根目录存在 **MediaCrawler** 文件夹，打包时会把其**源码**打入 .app，并自动带上 MediaCrawler 所需依赖（playwright 等），实现**一个 .dmg 安装即用**。
- **对方只需**：安装 .dmg → 将 RiskGuard 拖到「应用程序」→ 双击打开。**无需**在终端执行任何命令。
- 首次运行 .app 时会自动将内嵌的 MediaCrawler 复制到 **`~/Library/Application Support/RiskGuard/MediaCrawler`** 并设为路径；首次使用「生成二维码」或「测试爬取」时会自动下载 Playwright 的 Chromium 浏览器（约数十 MB，仅一次），稍等片刻即可。
- 若打包时项目内**没有** MediaCrawler 文件夹，则 .app 不包含媒体爬虫，对方需在设置里填写 MediaCrawler 路径（或在本机项目内先建 venv 再填项目路径）。

### 应用图标

- 打包时会自动用 **scripts/mac/riskguard-logo.svg**（与项目左上角 logo 一致）生成 **RiskGuard.icns**，并设为 .app 图标。
- 若想用自己的图：先执行  
  `./scripts/mac/make_icon.sh /path/to/你的图.png`（或 .svg）  
  生成 `scripts/mac/RiskGuard.icns`，再执行打包脚本即可。
- **若图标仍不显示**（已确认 Resources 内有 RiskGuard.icns 且 Info.plist 有 CFBundleIconFile）：
  1. 刷新图标缓存：终端执行  
     `touch dist/RiskGuard.app` 后 `killall Finder`；或  
     `sudo rm -rf /Library/Caches/com.apple.iconservices.store` 后 `killall Finder`。
  2. 将 .app 复制到「应用程序」再查看；或对 .app 执行  
     `lsregister -f /path/to/RiskGuard.app`（需替换为实际路径）。
  3. **手动设置图标（通常有效）**：用「预览」打开 `scripts/mac/RiskGuard.icns` → 全选 (⌘A) → 复制 (⌘C)；再选中 **RiskGuard.app** → 文件 → 显示简介（或 ⌘I）→ 点击左上角小图标 → 粘贴 (⌘V)。关闭简介后图标会立即生效。

---

## 方式一：脚本打包（需对方电脑已装 Python 3）

若只在自己或已装 Python 的电脑上用，可用轻量打包（不内嵌 Python）：

### 前置要求

- **macOS**、**Node.js**、**Python 3** 及 `pip3 install -r backend/requirements.txt`
- 可选：**create-dmg**（`brew install create-dmg`）

### 打包步骤

```bash
chmod +x scripts/build_mac_dmg.sh
./scripts/build_mac_dmg.sh
```

得到 **dist-mac/RiskGuard.app** 与 **dist-mac/RiskGuard.dmg**。对方电脑也需安装 Python 3 及依赖，双击 .app 会打开**系统浏览器**访问本机服务。

### 数据与配置

- 数据目录：`~/Library/Application Support/RiskGuard/`
- 环境配置：打包前编辑 `backend/.env`，或打包后编辑 `RiskGuard.app/Contents/Resources/backend/.env`

---

## 以「单独程序」运行、不依赖浏览器（桌面窗口模式）

若希望**不打开 Chrome/Safari**，而是在**一个独立应用窗口**里使用（更像本地软件）：

1. **安装桌面窗口依赖**（一次性）：
   ```bash
   pip install pywebview
   ```
   macOS 若窗口无法打开或报错，可再装：
   ```bash
   pip install pyobjc-framework-WebKit
   ```

2. **先构建前端**（若尚未构建）：
   ```bash
   npm run build:frontend
   ```

3. **启动桌面窗口**（在项目根目录）：
   ```bash
   python backend/run_desktop.py
   ```
   会先启动后端，再弹出一个原生窗口（标题「RiskGuard 企业风险监控」），界面在该窗口内显示，无需浏览器。

**打包进 .app 时使用桌面窗口**：若希望打出来的 .app 双击后也是弹窗而不是打开浏览器，可在打包前把 `scripts/mac/riskguard-launcher` 替换为 `scripts/mac/riskguard-launcher-desktop` 的内容（或修改 `build_mac_dmg.sh` 里复制的启动脚本为 `riskguard-launcher-desktop`），并确保本机已安装 `pywebview`，打包后的 .app 内会使用桌面窗口模式。

---

## 方式二：不打包 .dmg，仅「像应用一样」本地运行

若只想在本机以「单进程 + 自动打开浏览器」的方式运行，无需打包：

```bash
# 1. 构建前端
npm run build:frontend

# 2. 以独立模式启动后端（会监听 127.0.0.1:8005 并自动打开浏览器）
STANDALONE_APP=1 FLASK_ENV=production SKIP_DROP_TABLES=1 python3 backend/app.py
```

数据仍使用项目下的 `data/` 目录；若要和方式一一致，可同时设 `STANDALONE_APP=1`，数据会改为使用 `~/Library/Application Support/RiskGuard/`。

---

## 故障排除

| 现象 | 可能原因 | 建议 |
|------|----------|------|
| **打开后白屏** | WebView 未正确加载 JS/CSS 或端口未就绪 | 已做：服务端对 .js/.css 使用正确 MIME 类型、窗口打开前稍作延迟。若仍白屏，可设 `RISKGUARD_DEBUG=1` 再运行，在窗口内右键检查控制台报错；或确认 `npm run build:frontend` 已成功且未改端口。 |
| 双击 .app 无反应或闪退 | （方式一）未安装 Python 3 或依赖 | 用「自包含」打包脚本打出 dist/RiskGuard.app，则对方无需装 Python；若用 build_mac_dmg.sh，对方也需装 Python 与依赖。 |
| 提示「Frontend build not found」 | 未先执行前端构建 | 在项目根目录执行 `npm run build:frontend` 后重新打包。 |
| 端口被占用 | 8005 已被其他程序占用 | 启动前设置 `PORT=8006`（或其它端口）。 |
| .dmg 双击打开后只有 app 图标、无「拖到应用程序」界面 | 未安装 create-dmg，脚本用 hdiutil 生成了简易 .dmg | 安装 **create-dmg** 后重新执行打包脚本即可生成带拖拽界面的 .dmg：`brew install create-dmg`，再运行 `./scripts/build_mac_app_standalone.sh`。 |
| PyInstaller 打包报错或缺少模块 | 部分包未被打进 | 在 `scripts/mac/RiskGuard.spec` 的 `hiddenimports` 中补充缺失模块名后重跑打包。 |
| **.app 图标不显示** | 系统图标缓存或未识别 | 见上文「应用图标 → 若图标仍不显示」：刷新缓存、复制到应用程序、或**显示简介后粘贴图标**（从 `scripts/mac/RiskGuard.icns` 复制到 .app 简介左上角）。 |
| **双击 .app 无反应或打不开** | 1) .app 结构不对 2) 系统拦截未签名应用 | 1) 重新执行一次 `./scripts/build_mac_app_standalone.sh`（脚本会生成标准 Contents/MacOS 结构）。2) 在终端运行可执行文件看报错：`/path/to/RiskGuard.app/Contents/MacOS/RiskGuard`。3) 若提示「无法打开，因为无法验证开发者」：**右键 .app → 打开**，或在「系统设置 → 隐私与安全性」中允许。 |
| **双击 .app 后桌面出现一个图标/图片** | 可能为系统或 WebView 行为 | 本应用不会主动在桌面创建文件。若出现的是程序坞中的 RiskGuard 图标，属正常。若确为桌面上的新文件（如 .webloc、.png），请记下文件名并反馈；可先删除该文件不影响使用。 |
