# 用 DB Browser for SQLite 查看本系统数据库

## 一、数据库文件在哪里

本系统使用 **SQLite**，数据库文件名固定为 `risk_platform.db`，路径分两种：

| 运行方式 | 数据库完整路径 |
|----------|----------------|
| **开发 / 命令行运行**（如 `python backend/app.py`） | **项目根目录下的 `data/risk_platform.db`**<br>例如：`/Users/chengzi/Desktop/sys2/data/risk_platform.db` |
| **打包成 Mac .app 运行** | **用户目录**<br>`~/Library/Application Support/RiskGuard/risk_platform.db`<br>（`~` 即你的用户主目录） |

- 若项目在桌面且名为 `sys2`，开发时数据库一般是：  
  **`/Users/chengzi/Desktop/sys2/data/risk_platform.db`**
- 若还没有 `data` 目录或该文件，先**启动一次本系统后端**（或前端触发一次需要写库的操作），会自动创建。

---

## 二、在 DB Browser 里打开

1. 打开 **DB Browser for SQLite**。
2. 菜单 **文件 → 打开数据库**（或拖拽文件进窗口）。
3. 在文件选择框中：
   - **开发运行**：进入项目里的 `data` 文件夹，选中 **`risk_platform.db`**。
   - **.app 运行**：按 `Cmd+Shift+G` 输入：  
     `~/Library/Application Support/RiskGuard`  
     回车后选中其中的 **`risk_platform.db`**。
4. 打开后即可在「浏览数据」里选表查看、在「执行 SQL」里写查询。

---

## 三、和系统如何“联动”

- **同一份文件**：本系统后端和 DB Browser 打开的是**同一个** `risk_platform.db` 文件。
- **系统写入 → 你在 DB Browser 里看**：系统跑着时，新数据会直接写进这个文件。在 DB Browser 里点 **“读取数据库”**（或关闭后重新打开该文件）即可看到最新数据。
- **你在 DB Browser 里改 → 系统用**：在 DB Browser 里改完数据后点 **“写入更改”** 保存，本系统下次读库就会用新数据（例如刷新页面、重新请求接口）。
- **避免锁库**：  
  - 若在 DB Browser 里要做**大量修改或结构变更**，建议先**退出本系统**（关掉后端 / 关掉 .app），改完保存后再启动，可减少 “database is locked” 等冲突。  
  - 若只是**查看**，可一直开着系统，在 DB Browser 里用「读取数据库」刷新即可。

---

## 四、快速定位路径（开发时）

在项目根目录执行（会打印当前运行时会用的数据库路径）：

```bash
python -c "
import os, sys
sys.path.insert(0, '.')
# 模拟开发环境
os.environ.pop('STANDALONE_APP', None)
from backend.app import _DB_PATH
print('数据库路径:', _DB_PATH)
print('是否存在:', os.path.isfile(_DB_PATH))
"
```

把打印出的路径复制到 DB Browser 的“打开数据库”里即可。
