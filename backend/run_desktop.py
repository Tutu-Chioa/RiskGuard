#!/usr/bin/env python3
"""
桌面窗口模式（仅 macOS）：用 pywebview 在独立应用窗口内打开 RiskGuard。
- 关闭窗口时仅隐藏到后台，不退出；点击程序坞图标可重新打开主窗口。
使用前请：pip install pywebview；若报错可再装 pyobjc-framework-WebKit。
从项目根目录运行：python backend/run_desktop.py
"""
import os
import sys
import threading
import time

# 打包后若以 -m / -c / 单脚本 方式被调用，只运行该模块/代码/脚本并退出，不启动 GUI
_run_module_only = None
_run_c_only = None  # 测试爬取等用 sys.executable -c "..." 启动，需直接 exec 后退出
_run_script_path = None  # 爬取用 sys.executable /path/to/_crawl_main.py 启动，只执行脚本后退出
if getattr(sys, 'frozen', False):
    if os.environ.get('RISKGUARD_LOGIN_SUBPROCESS') == '1':
        _run_module_only = 'backend.scripts.run_media_login_with_qr'
    elif len(sys.argv) >= 3 and sys.argv[1] == '-c':
        _run_c_only = sys.argv[2]
    elif len(sys.argv) >= 2 and sys.argv[1].endswith('.py'):
        _p = os.path.normpath(os.path.abspath(sys.argv[1]))
        if os.path.isfile(_p):
            _run_script_path = _p
    elif '-m' in sys.argv:
        _mi = sys.argv.index('-m')
        if _mi + 1 < len(sys.argv):
            _mod = sys.argv[_mi + 1]
            if _mod == 'backend.scripts.run_media_login_with_qr':
                _run_module_only = _mod
            elif _mod == 'playwright':  # RiskGuard -m playwright install chromium
                _run_module_only = _mod

# 打包后（PyInstaller）：必须在 import backend 之前把「含 backend 的目录」加入 path，否则 backend.services 会报 no module named 'services'
if getattr(sys, 'frozen', False):
    _exe_dir = os.path.dirname(os.path.abspath(sys.executable))
    _frameworks = os.path.abspath(os.path.join(_exe_dir, '..', 'Frameworks'))
    for _p in (getattr(sys, '_MEIPASS', ''), _frameworks):
        if _p and os.path.isdir(_p) and _p not in sys.path:
            sys.path.insert(0, _p)
if not getattr(sys, 'frozen', False):
    _project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(_project_root)
    if _project_root not in sys.path:
        sys.path.insert(0, _project_root)

# 仅运行指定模块后退出，不启动 GUI
if _run_module_only:
    import runpy
    if _run_module_only == 'playwright':
        _mi = sys.argv.index('-m')
        _args = sys.argv[_mi + 2:] if _mi + 2 < len(sys.argv) else ['install']
        sys.argv = ['playwright'] + _args
    runpy.run_module(_run_module_only, run_name='__main__')
    sys.exit(0)

if _run_c_only is not None:
    try:
        exec(compile(_run_c_only, '<string>', 'exec'))
    except SystemExit as e:
        sys.exit(e.code if e.code is not None else 0)
    sys.exit(0)

if _run_script_path is not None:
    import runpy
    try:
        runpy.run_path(_run_script_path, run_name='__main__')
    except SystemExit as e:
        sys.exit(e.code if e.code is not None else 0)
    sys.exit(0)

os.environ['STANDALONE_APP'] = '1'
os.environ['DESKTOP_WINDOW'] = '1'
os.environ.setdefault('FLASK_ENV', 'production')
os.environ.setdefault('SKIP_DROP_TABLES', '1')
_PORT = int(os.environ.get('PORT', 8005))
_URL = f'http://127.0.0.1:{_PORT}/'

# 程序坞点击时用于显示主窗口的引用（仅 macOS）
_dock_reopen_main_window = []


def _setup_dock_reopen(main_window):
    """macOS：点击程序坞图标时显示主窗口；右键退出可正常退出。"""
    if sys.platform != 'darwin':
        return
    try:
        from Foundation import NSObject, NSNotificationCenter
        from AppKit import NSApplication

        _dock_reopen_main_window.append(main_window)
        main_window._is_visible = True  # 关窗时在 on_closing 里设为 False

        # 1）通知：应用被激活时若无可见窗口则显示主窗口
        def _on_activate(_notification):
            if not _dock_reopen_main_window or _dock_reopen_main_window[0] is None:
                return
            try:
                w = _dock_reopen_main_window[0]
                if not getattr(w, '_is_visible', True):
                    w.show()
                    w._is_visible = True
            except Exception:
                pass

        nc = NSNotificationCenter.defaultCenter()
        app = NSApplication.sharedApplication()
        nc.addObserverForName_object_queue_usingBlock_(
            'NSApplicationDidBecomeActiveNotification',
            app,
            None,
            _on_activate,
        )

        # 2）延迟约 1 秒设置 delegate，使「右键退出」生效（run loop 启动后执行）
        def _set_delegate_after_start():
            try:
                orig = app.delegate()
                class _AppDelegate(NSObject):
                    def applicationShouldHandleReopen_hasVisibleWindows_(self, sender, flag):
                        if not flag and _dock_reopen_main_window and _dock_reopen_main_window[0] is not None:
                            try:
                                _dock_reopen_main_window[0].show()
                                _dock_reopen_main_window[0]._is_visible = True
                            except Exception:
                                pass
                        return True
                    def applicationShouldTerminate_(self, sender):
                        return 1  # NSTerminateNow
                d = _AppDelegate.alloc().init()
                d._orig = orig
                if orig is not None:
                    for sel in ('applicationDidFinishLaunching_', 'applicationWillTerminate_'):
                        if hasattr(orig, sel):
                            def _make_forward(selector):
                                def f(self, *a):
                                    return getattr(self._orig, selector)(*a)
                                return f
                            setattr(_AppDelegate, sel, _make_forward(sel))
                app.setDelegate_(d)
            except Exception:
                pass

        from Foundation import NSTimer
        class _TimerTarget(NSObject):
            def fire_(self, _timer):
                _set_delegate_after_start()
        ttarget = _TimerTarget.alloc().init()
        NSTimer.scheduledTimerWithTimeInterval_target_selector_userInfo_repeats_(1.0, ttarget, 'fire:', None, False)
    except Exception:
        pass


def _run_server():
    from backend.app import run_standalone_server
    run_standalone_server()


def _wait_for_server(timeout=30):
    try:
        import urllib.request
        for _ in range(timeout * 5):
            try:
                urllib.request.urlopen(_URL, timeout=1)
                return True
            except Exception:
                time.sleep(0.2)
    except Exception:
        pass
    return False


def main():
    try:
        import webview
    except ImportError:
        print('请先安装 pywebview：')
        print('  pip install pywebview')
        print('macOS 若窗口无法打开，可再安装：')
        print('  pip install pyobjc-framework-WebKit')
        sys.exit(1)

    server_thread = threading.Thread(target=_run_server, daemon=True)
    server_thread.start()

    if not _wait_for_server():
        print('服务启动超时，请检查端口', _PORT, '是否被占用')
        sys.exit(1)

    time.sleep(0.8)

    # 主窗口：关窗时仅隐藏不退出；点击程序坞图标可再次打开
    main_window = webview.create_window(
        'RiskGuard 企业风险监控',
        _URL,
        width=1280,
        height=800,
        min_size=(800, 600),
        resizable=True,
        confirm_close=True,
    )
    def on_closing():
        # 关窗时改为隐藏，不退出；点击程序坞图标可再次打开
        try:
            main_window._is_visible = False
            main_window.hide()
        except Exception:
            pass
        return False  # 取消关闭，窗口只是被隐藏

    main_window.events.closing += on_closing

    # macOS：点击程序坞图标时显示主窗口
    _setup_dock_reopen(main_window)

    webview.start(debug=os.environ.get('RISKGUARD_DEBUG', '').strip() in ('1', 'true'))


if __name__ == '__main__':
    main()
