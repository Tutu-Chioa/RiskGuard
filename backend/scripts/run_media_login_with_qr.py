# -*- coding: utf-8 -*-
"""
在 MediaCrawler 环境中启动「仅登录」流程，将二维码写入文件供前端轮询显示。
需在 MediaCrawler 项目根目录的虚拟环境中运行，或由后端设置 sys.path 与 cwd 后调用。

环境变量：
- MEDIACRAWLER_PATH: MediaCrawler 项目根目录（若未设置则从脚本位置推断）
- MEDIACRAWLER_QR_FILE: 二维码 Base64 写入路径（如 sys2/data/mediacrawler_qr/xhs.txt）
- SYS2_SESSIONS_DIR: 登录成功后写入 marker 的目录（sys2/data/mediacrawler_sessions）
- PLATFORM: 平台，如 xhs
"""
import asyncio
import os
import sys


def _mc_path():
    p = os.environ.get("MEDIACRAWLER_PATH", "").strip()
    if p and os.path.isdir(p):
        return p
    # 推断：本脚本在 sys2/backend/scripts/，MC 可能在 sys2/MediaCrawler 或上级
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base = os.path.dirname(os.path.dirname(script_dir))  # backend -> sys2
    for name in ("MediaCrawler", "MediaCrawler-main"):
        candidate = os.path.join(base, name)
        if os.path.isdir(candidate) and os.path.isfile(os.path.join(candidate, "main.py")):
            return candidate
    return ""


def main():
    mc_path = _mc_path()
    if not mc_path:
        print("[run_media_login_with_qr] MEDIACRAWLER_PATH not set or invalid", file=sys.stderr)
        sys.exit(1)

    os.chdir(mc_path)
    if mc_path not in sys.path:
        sys.path.insert(0, mc_path)

    platform = os.environ.get("PLATFORM", "xhs").strip() or "xhs"
    qr_file = os.environ.get("MEDIACRAWLER_QR_FILE", "").strip()
    sys2_sessions = os.environ.get("SYS2_SESSIONS_DIR", "").strip()
    # 若未传入（子进程 env 异常），用与 backend 一致的路径：脚本在 backend/scripts/ -> 上级两级为 sys2
    if not sys2_sessions:
        _script_dir = os.path.dirname(os.path.abspath(__file__))
        _sys2_root = os.path.dirname(os.path.dirname(_script_dir))  # backend -> sys2
        sys2_sessions = os.path.join(_sys2_root, "data", "mediacrawler_sessions")

    # 最小化爬取：仅登录后爬 1 条即结束
    sys.argv = [
        "main.py",
        "--platform", platform,
        "--lt", "qrcode",
        "--type", "search",
        "--keywords", "登录",
        "--headless", "true",
        "--get_comment", "false",
        "--get_sub_comment", "false",
    ]

    # 先改 config，再被 main 的 parse_cmd 覆盖的部分用 argv 控制
    import config
    config.ENABLE_CDP_MODE = False  # 使用 Playwright，便于无头且输出二维码到文件
    config.HEADLESS = True
    config.CRAWLER_MAX_NOTES_COUNT = 1
    config.ENABLE_GET_MEIDAS = False
    config.ENABLE_GET_COMMENTS = False
    config.ENABLE_GET_SUB_COMMENTS = False
    # 仅用于扫码登录，不需要把「登录」关键词的搜索结果写入 JSON，
    # 否则会污染后续按企业名爬取时的舆情数据解析（看到大量“登录相关”内容）。
    # 改为使用 sqlite 存储，我们的集成只解析 JSON，不会读取这里的结果。
    config.SAVE_DATA_OPTION = "sqlite"

    # sqlite 模式需要先初始化表结构（xhs_note 等），否则会报 no such table
    import asyncio
    from database import db
    try:
        asyncio.run(db.init_db("sqlite"))
    except Exception as e:
        print(f"[run_media_login_with_qr] init_db sqlite: {e}", file=sys.stderr)

    # 将二维码写入文件供前端轮询；xhs 的 login 用的是 utils.show_qrcode，必须同时 patch crawler_util 和 utils
    import tools.crawler_util as crawler_util
    from tools import utils

    def write_qrcode(qr_code):
        if not qr_code:
            return
        if "," in str(qr_code):
            qr_code = str(qr_code).split(",")[1]
        data_url = "data:image/png;base64," + str(qr_code)
        if qr_file:
            try:
                os.makedirs(os.path.dirname(qr_file), exist_ok=True)
                with open(qr_file, "w", encoding="utf-8") as f:
                    f.write(data_url)
            except Exception as e:
                print(f"[run_media_login_with_qr] write qrcode failed: {e}", file=sys.stderr)

    crawler_util.show_qrcode = write_qrcode
    utils.show_qrcode = write_qrcode

    # 扫码成功时立即写 marker；同时写 env 指定路径与脚本推断路径，保证后端必能读到
    _script_dir = os.path.dirname(os.path.abspath(__file__))
    _sys2_root = os.path.dirname(os.path.dirname(_script_dir))
    _sessions_fallback = os.path.join(_sys2_root, "data", "mediacrawler_sessions")
    _sessions_abs = os.path.abspath(sys2_sessions) if sys2_sessions else ""

    def write_logged_in_marker():
        for base in (_sessions_abs, _sessions_fallback):
            if not base:
                continue
            try:
                platform_dir = os.path.join(base, platform)
                os.makedirs(platform_dir, exist_ok=True)
                marker = os.path.join(platform_dir, "logged_in.txt")
                with open(marker, "w", encoding="utf-8") as f:
                    f.write("ok\n")
                    f.flush()
            except Exception as e:
                print(f"[run_media_login_with_qr] write marker failed ({base}): {e}", file=sys.stderr)

    # 先 import main，让 media_platform.xhs.login 被加载，再 patch 确保改的是爬虫会用到的同一份
    from main import main as app_main, async_cleanup
    from tools.app_runner import run

    try:
        import media_platform.xhs.login as xhs_login
        _original_check = xhs_login.XiaoHongShuLogin.check_login_state

        async def _patched_check_login_state(self, no_logged_in_session):
            result = await _original_check(self, no_logged_in_session)
            if result:
                write_logged_in_marker()
            return result

        xhs_login.XiaoHongShuLogin.check_login_state = _patched_check_login_state
        print("[run_media_login_with_qr] patch check_login_state ok", file=sys.stderr)
    except Exception as e:
        print(f"[run_media_login_with_qr] patch check_login_state: {e}", file=sys.stderr)

    try:
        run(app_main, async_cleanup, cleanup_timeout_seconds=15.0)
    except SystemExit as e:
        if e.code not in (0, None):
            raise
    except Exception as e:
        print(f"[run_media_login_with_qr] error: {e}", file=sys.stderr)
        raise

    # 脚本正常结束时再写一次 marker（patch 失败或非 xhs 时保底；扫码成功且 patch 生效时也会在结束时写一次，无害）
    write_logged_in_marker()


if __name__ == "__main__":
    main()
