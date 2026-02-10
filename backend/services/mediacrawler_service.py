# -*- coding: utf-8 -*-
"""
MediaCrawler 集成服务
- 调用 MediaCrawler 爬取小红书、微博、知乎等平台对企业名称的搜索结果
- 需提前克隆并配置 MediaCrawler：git clone https://github.com/NanmiCoder/MediaCrawler
- 环境变量 MEDIACRAWLER_PATH 指向 MediaCrawler 项目根目录
"""
import os
import sys
import json
import subprocess
import glob
import shutil
import time
import threading
from datetime import datetime

# 同一时间只运行一个 MediaCrawler 爬取任务，避免陆续添加多企业时浏览器锁冲突
_crawl_lock = threading.Lock()

# 每次从环境变量读取，避免 .env 在模块导入之后才加载导致读不到
def _get_path():
    return os.environ.get('MEDIACRAWLER_PATH', '').strip()


def _get_mediacrawler_python():
    """
    优先返回 MediaCrawler 项目下的 venv Python，保证与扫码登录脚本同一环境、同一 cwd 语义。
    若未找到 venv 则返回 None，调用方回退到 uv run。兼容 Windows（Scripts/python.exe）与 Unix（bin/python）。
    """
    path = _get_path()
    if not path or not os.path.isdir(path):
        return None
    if sys.platform == 'win32':
        for rel in ('.venv', 'venv'):
            exe = os.path.join(path, rel, 'Scripts', 'python.exe')
            if os.path.isfile(exe):
                return exe
    else:
        for rel in ('.venv', 'venv'):
            exe = os.path.join(path, rel, 'bin', 'python')
            if os.path.isfile(exe):
                return exe
    return None

def _get_platform():
    return os.environ.get('MEDIACRAWLER_PLATFORM', 'xhs').strip() or 'xhs'

def _get_timeout():
    """爬取子进程超时（秒）。关键词热度高、开评论时耗时长，默认 360 秒；可通过环境变量 MEDIACRAWLER_TIMEOUT 覆盖。"""
    try:
        return int(os.environ.get('MEDIACRAWLER_TIMEOUT', '360'))
    except (TypeError, ValueError):
        return 360


# 供 app.py 等调用，每次从环境变量读取
def get_mediacrawler_path():
    return _get_path()

def get_mediacrawler_platform():
    return _get_platform()


def get_mediacrawler_python():
    """返回 MediaCrawler 虚拟环境 Python 路径，供 start-login 等调用。"""
    return _get_mediacrawler_python()


def get_sessions_dir():
    """本系统媒体爬虫登录态目录（与 app 中 _mediacrawler_sessions_dir 一致），创建后返回绝对路径。.app 下用 RISKGUARD_DATA_DIR。"""
    data_root = os.environ.get('RISKGUARD_DATA_DIR', '').strip()
    if not data_root:
        data_root = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')
    base = os.path.join(data_root, 'mediacrawler_sessions')
    os.makedirs(base, exist_ok=True)
    return os.path.abspath(base)


def get_qr_dir():
    """本系统二维码写入目录（与 app 中 _mediacrawler_qr_dir 一致），创建后返回绝对路径。.app 下用 RISKGUARD_DATA_DIR。"""
    data_root = os.environ.get('RISKGUARD_DATA_DIR', '').strip()
    if not data_root:
        data_root = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')
    base = os.path.join(data_root, 'mediacrawler_qr')
    os.makedirs(base, exist_ok=True)
    return os.path.abspath(base)


def _main_py_rel(mc_path):
    """返回 MediaCrawler 根目录下 main 脚本的相对路径（兼容 PyInstaller 将 main.py 打成目录的情况）。"""
    if not mc_path or not os.path.isdir(mc_path):
        return None
    main_py = os.path.join(mc_path, 'main.py')
    if os.path.isfile(main_py):
        return 'main.py'
    if os.path.isfile(os.path.join(main_py, 'main.py')):
        return 'main.py/main.py'
    return None


def is_available():
    """检查 MediaCrawler 是否可用"""
    path = _get_path()
    return _main_py_rel(path) is not None


def is_platform_logged_in(platform=None):
    """
    检查当前平台是否已有登录态（扫码成功或已上传 session/cookie）。
    未登录时不应启动爬取，否则会弹出登录二维码且长时间无结果。
    """
    platform = platform or _get_platform()
    our_sessions = os.path.join(get_sessions_dir(), platform)
    marker_file = os.path.join(our_sessions, 'logged_in.txt')
    if os.path.isfile(marker_file):
        return True
    ignore_files = {'login_stderr.log'}
    if os.path.isdir(our_sessions):
        if any(f for f in os.listdir(our_sessions) if not f.startswith('.') and f not in ignore_files):
            return True
    # 兼容 path 为文件（如上传的 cookie 文件）
    if os.path.isfile(our_sessions) or os.path.isfile(our_sessions + '.json'):
        return True
    return False


def _platform_label(platform):
    """平台代码转中文名"""
    labels = {
        'xhs': '小红书', 'dy': '抖音', 'ks': '快手', 'bili': 'B站',
        'wb': '微博', 'tieba': '贴吧', 'zhihu': '知乎'
    }
    return labels.get(platform, platform)


def _parse_json_output(save_path, platform, company_name, min_mtime=0):
    """
    解析 MediaCrawler 输出的 JSON 文件，转为统一的 review 列表。
    min_mtime: 只解析修改时间 >= min_mtime 的文件（用于本次爬取新写入的数据，避免混入历史其他关键词）
    """
    reviews = []
    platform_label = _platform_label(platform)
    
    # 搜索 JSON 文件：MediaCrawler 实际写入 data/{platform}/json/*.json，需递归匹配
    patterns = [
        (os.path.join(save_path, '**', '*.json'), True),
        (os.path.join(save_path, 'json', '*.json'), False),
        (os.path.join(save_path, '*.json'), False),
    ]
    json_files = []
    for p, recursive in patterns:
        try:
            json_files.extend(glob.glob(p, recursive=recursive) if recursive else glob.glob(p))
        except TypeError:
            json_files.extend(glob.glob(p))
    
    seen = set()
    for fp in json_files:
        if min_mtime > 0:
            try:
                if os.path.getmtime(fp) < min_mtime:
                    continue
            except OSError:
                continue
        if fp in seen:
            continue
        seen.add(fp)
        try:
            with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
                data = f.read()
            # 可能是单条 JSON 或 JSON 数组
            try:
                obj = json.loads(data)
            except json.JSONDecodeError:
                continue
            items = obj if isinstance(obj, list) else [obj]
            for item in items:
                if not isinstance(item, dict):
                    continue
                title = item.get('title') or item.get('note_title') or item.get('content', '')[:80]
                desc = item.get('desc') or item.get('desc_raw') or item.get('note_desc') or item.get('content') or ''
                text = (title + ' ' + str(desc)).strip()
                if not text:
                    continue
                # 主内容
                reviews.append({
                    'platform': platform_label,
                    'title': title[:200] if title else f'关于{company_name}的讨论',
                    'content': text[:2000],
                    'sentiment': 'neutral',
                })
                # 评论
                comments = item.get('comments') or item.get('comment_list') or []
                for c in comments[:5]:
                    if isinstance(c, dict):
                        cnt = c.get('content') or c.get('comment_content') or c.get('text') or ''
                    else:
                        cnt = str(c)
                    if cnt:
                        reviews.append({
                            'platform': platform_label,
                            'title': f'评论',
                            'content': cnt[:500],
                            'sentiment': 'neutral',
                        })
        except Exception:
            continue
    
    return reviews


def _filter_reviews_by_keyword(reviews, keyword):
    """
    只保留标题或正文中包含当前搜索关键词（企业名）的条目。
    当未使用 min_mtime 时用于避免混入历史数据；若关键词较短可做宽松匹配（包含即可）。
    """
    if not (keyword and keyword.strip()):
        return reviews
    k = keyword.strip()
    out = []
    for r in reviews:
        title = (r.get('title') or '')
        content = (r.get('content') or '')
        if k in title or k in content:
            out.append(r)
    return out


def _copy_uploaded_sessions_to_mediacrawler(platform):
    """
    将本系统「上传的登录态」及扫码登录产生的 browser_data 等复制到 MediaCrawler 项目 data 目录，供爬虫使用。
    本系统保存路径：与 get_sessions_dir() 一致（.app 下为 RISKGUARD_DATA_DIR/mediacrawler_sessions/{platform}/）
    MediaCrawler 使用：MEDIACRAWLER_PATH/data/{platform}/
    """
    our_sessions = os.path.join(get_sessions_dir(), platform)
    if not os.path.isdir(our_sessions):
        return
    mc_path = _get_path()
    if not mc_path or not os.path.isdir(mc_path):
        return
    mc_data = os.path.join(mc_path, 'data', platform)
    os.makedirs(mc_data, exist_ok=True)
    for name in os.listdir(our_sessions):
        if name.startswith('.'):
            continue
        src = os.path.join(our_sessions, name)
        dst = os.path.join(mc_data, name)
        try:
            if os.path.isfile(src):
                shutil.copy2(src, dst)
            elif os.path.isdir(src):
                if os.path.isdir(dst):
                    for root, _, files in os.walk(src):
                        rel = os.path.relpath(root, src)
                        if rel == '.':
                            out_dir = dst
                        else:
                            out_dir = os.path.join(dst, rel)
                        os.makedirs(out_dir, exist_ok=True)
                        for f in files:
                            shutil.copy2(os.path.join(root, f), os.path.join(out_dir, f))
                else:
                    shutil.copytree(src, dst, dirs_exist_ok=True)
        except Exception:
            pass


def crawl_by_keyword(company_name, platform=None, callback=None, company_id=None):
    """
    使用 MediaCrawler 按关键词爬取媒体内容
    
    :param company_name: 企业名称，作为搜索关键词
    :param platform: 平台代码 xhs/dy/ks/bili/wb/tieba/zhihu，默认 xhs
    :param callback: 完成后回调 callback(company_id, reviews_list)
    :param company_id: 企业 ID，传给 callback
    :return: dict 含 status, message, reviews(成功时)
    """
    if not is_available():
        return {
            'status': 'unavailable',
            'message': 'MediaCrawler 未配置，请设置环境变量 MEDIACRAWLER_PATH 指向项目根目录',
            'reviews': []
        }
    
    platform = platform or _get_platform()
    # 使用用户上传的登录态（若有）
    _copy_uploaded_sessions_to_mediacrawler(platform)
    
    # 未登录时不启动爬取，避免每次新增企业都弹出小红书登录二维码且长时间无结果
    if not is_platform_logged_in(platform):
        return {
            'status': 'no_content',
            'message': '请先在系统设置→平台登录中完成小红书扫码（或上传 Cookie）后再爬取；未登录时不会启动爬虫，避免弹出登录窗口。',
            'reviews': [],
        }
    
    # 会话目录与 app 一致，.app 下使用 RISKGUARD_DATA_DIR，否则使用项目 data/
    our_sessions = os.path.join(get_sessions_dir(), platform)
    # 若存在「内嵌扫码登录」的 marker，爬取时使用 Playwright 以复用 browser_data 中的会话
    use_playwright = os.path.isfile(os.path.join(our_sessions, 'logged_in.txt'))
    
    # MediaCrawler 写入其 data/{platform}/；解析时先试本系统 mediacrawler_output，再试 MC data
    data_root = os.path.dirname(get_sessions_dir())
    save_path = os.path.abspath(os.path.join(data_root, 'mediacrawler_output', platform))
    os.makedirs(save_path, exist_ok=True)
    
    # 关键词：优先用企业名，避免 MediaCrawler 本地 config/KEYWORDS（如“登录”）覆盖
    keyword = (company_name or '').strip() or '企业'
    
    env = dict(os.environ)
    env['MEDIACRAWLER_KEYWORDS'] = keyword
    # 直接传关键词，子进程优先用此值，不依赖文件（避免线程/uv 下读不到或读错）
    env['SYS2_CRAWL_KEYWORD'] = keyword
    if use_playwright:
        env['MEDIACRAWLER_USE_PLAYWRIGHT'] = '1'
    
    mc_path = os.path.abspath(_get_path())
    keyword_file = os.path.join(mc_path, '.sys2_crawl_keyword.txt')
    try:
        with open(keyword_file, 'w', encoding='utf-8') as f:
            f.write(keyword)
    except Exception:
        pass
    env['SYS2_CRAWL_KEYWORD_FILE'] = keyword_file

    # 稳定流程：优先用 MediaCrawler 项目下的 venv Python，与扫码登录同一环境、同一 cwd，登录态可复用
    # 仅传 --save_data_option（当前版本无 --save_data_path），数据写入 MediaCrawler/data/{platform}/
    # --start 1 从第一页开始；评论适量以兼顾速度与内容（可被 MEDIACRAWLER_MAX_COMMENTS 覆盖）
    max_comments = 5
    try:
        max_comments = int(os.environ.get('MEDIACRAWLER_MAX_COMMENTS', '5'))
        max_comments = max(0, min(20, max_comments))
    except (TypeError, ValueError):
        pass
    args = [
        '--platform', platform,
        '--lt', 'qrcode',
        '--type', 'search',
        '--keywords', keyword,
        '--start', '1',
        '--save_data_option', 'json',
        '--headless', 'true',
        '--get_comment', 'true',
        '--max_comments_count_singlenotes', str(max_comments),
    ]
    # .app 内用同一可执行文件跑 MediaCrawler main.py；用临时脚本代替 -c 长字符串，避免打包/传参时被破坏导致 SyntaxError
    if getattr(sys, 'frozen', False):
        _data = os.environ.get('RISKGUARD_DATA_DIR', '')
        if _data:
            env['PLAYWRIGHT_BROWSERS_PATH'] = os.path.join(_data, 'playwright-browsers')
        env['PLAYWRIGHT_CHROMIUM_USE_HEADLESS_NEW'] = '0'
        _main_rel = _main_py_rel(mc_path) or 'main.py'
        env['MEDIACRAWLER_CRAWL_ARGS'] = '\n'.join(args)
        env['MEDIACRAWLER_MAIN_REL'] = _main_rel
        data_root = os.path.dirname(get_sessions_dir())
        bootstrap_dir = os.path.join(data_root, 'mediacrawler_bootstrap')
        os.makedirs(bootstrap_dir, exist_ok=True)
        _bootstrap_py = os.path.join(bootstrap_dir, '_crawl_main.py')
        # macOS 上与登录一致：patch Playwright 使用本机 Chrome，避免 x86 Chromium 在 Rosetta 下 mach_vm_read 崩溃
        _playwright_patch = r'''
try:
    from playwright._impl._browser_type import BrowserType
    _orig_lp = BrowserType.launch_persistent_context
    async def _patched_lp(self, *args, _orig=_orig_lp, **kwargs):
        user_data_dir = kwargs.pop("user_data_dir", None) or kwargs.pop("userDataDir", None)
        if user_data_dir is None and args:
            user_data_dir, args = args[0], args[1:]
        if sys.platform == "darwin":
            kwargs["channel"] = kwargs.get("channel") or "chrome"
        headless = kwargs.get("headless", True)
        if headless:
            ign = kwargs.get("ignore_default_args") or kwargs.get("ignoreDefaultArgs") or []
            ign = ["--headless=new"] if ign is True else list(ign) if isinstance(ign, (list, tuple)) else []
            if "--headless=new" not in ign:
                ign.append("--headless=new")
            kwargs.pop("ignore_default_args", None)
            kwargs["ignoreDefaultArgs"] = ign
            extra = list(kwargs.get("args") or [])
            if "--headless" not in extra and "--headless=new" not in extra:
                extra.append("--headless")
            kwargs["args"] = extra
        return await _orig(self, user_data_dir, *args, **kwargs)
    BrowserType.launch_persistent_context = _patched_lp
except Exception:
    pass
'''
        _bootstrap_content = '''# auto-generated crawl bootstrap
import os, sys, runpy, types
mc = os.environ.get("MEDIACRAWLER_PATH", "")
if not mc:
    sys.exit(1)
os.chdir(mc)
sys.path.insert(0, mc)
try:
    from sqlalchemy.orm import declarative_base as _db
    import sqlalchemy.orm as _orm
    _m = types.ModuleType("declarative")
    _m.declarative_base = _db
    _m.__file__ = getattr(_orm, "__file__", "")
    sys.modules["sqlalchemy.ext.declarative"] = _m
    import sqlalchemy.ext as _ext
    _ext.declarative = _m
except Exception:
    pass
''' + _playwright_patch + '''
a = os.environ.get("MEDIACRAWLER_CRAWL_ARGS", "").split("\\n")
rel = os.environ.get("MEDIACRAWLER_MAIN_REL", "main.py")
sys.argv = [os.path.join(mc, rel)] + a
runpy.run_path(rel, run_name="__main__")
'''
        try:
            with open(_bootstrap_py, 'w', encoding='utf-8') as f:
                f.write(_bootstrap_content)
        except Exception:
            return {'status': 'error', 'message': '无法写入爬虫引导脚本', 'reviews': []}
        cmd = [sys.executable, _bootstrap_py]
    else:
        py_exe = _get_mediacrawler_python()
        if py_exe:
            cmd = [py_exe, 'main.py'] + args
        else:
            cmd = ['uv', 'run', 'main.py'] + args
    
    crawl_start = time.time()
    
    def _remove_keyword_file():
        try:
            if os.path.isfile(keyword_file):
                os.remove(keyword_file)
        except Exception:
            pass
    
    def _clear_browser_lock():
        if use_playwright and mc_path:
            _ud = os.path.join(mc_path, 'browser_data', '{}_user_data_dir'.format(platform))
            for _lock in ('SingletonLock', 'SingletonSocket', 'SingletonCookie'):
                _fp = os.path.join(_ud, _lock)
                try:
                    if os.path.isfile(_fp):
                        os.remove(_fp)
                except Exception:
                    pass

    with _crawl_lock:
        _clear_browser_lock()
        proc = None
        last_error = None
        for attempt in range(2):
            if attempt == 1:
                _clear_browser_lock()
                time.sleep(2)
            try:
                proc = subprocess.run(
                    cmd,
                    cwd=mc_path,
                    env=env,
                    capture_output=True,
                    timeout=_get_timeout(),
                    text=True,
                    encoding='utf-8',
                    errors='replace',
                )
                break
            except FileNotFoundError:
                if getattr(sys, 'frozen', False):
                    _remove_keyword_file()
                    return {'status': 'error', 'message': 'MediaCrawler 执行失败（可执行文件未找到）', 'reviews': []}
                cmd = ['python3', 'main.py'] + args
                try:
                    proc = subprocess.run(
                        cmd,
                        cwd=mc_path,
                        env=env,
                        capture_output=True,
                        timeout=_get_timeout(),
                        text=True,
                        encoding='utf-8',
                        errors='replace',
                    )
                    break
                except Exception as e:
                    _remove_keyword_file()
                    return {'status': 'error', 'message': '执行 MediaCrawler 失败: %s' % e, 'reviews': []}
            except subprocess.TimeoutExpired:
                _remove_keyword_file()
                return {'status': 'timeout', 'message': '爬取超时（%s 秒）' % _get_timeout(), 'reviews': []}
            except Exception as e:
                last_error = e
                if attempt == 0:
                    continue
                _remove_keyword_file()
                msg = str(e)
                if 'SingletonLock' in msg or 'File exists' in msg or 'SingletonCookie' in msg:
                    msg += ' 请关闭所有 Chrome 窗口后重试；若已关闭仍报错，请在系统设置中清除登录态后重新扫码。'
                return {'status': 'error', 'message': msg, 'reviews': []}
        if proc is None:
            _remove_keyword_file()
            return {'status': 'error', 'message': last_error and str(last_error) or '爬取启动失败', 'reviews': []}

        # 优先只解析本次爬取新写入的 JSON（min_mtime），避免混入历史数据
        reviews = _parse_json_output(save_path, platform, company_name, min_mtime=crawl_start)
        if not reviews:
            mc_data_path = os.path.join(_get_path(), 'data', platform)
            reviews = _parse_json_output(mc_data_path, platform, company_name, min_mtime=crawl_start)
        # 若按时间未拿到数据，回退：解析全部文件再按关键词过滤（兼容写入延迟或路径差异）
        if not reviews:
            reviews = _parse_json_output(save_path, platform, company_name, min_mtime=0)
            if not reviews:
                reviews = _parse_json_output(mc_data_path, platform, company_name, min_mtime=0)
            if reviews:
                reviews = _filter_reviews_by_keyword(reviews, keyword)
        elif len(reviews) > 20:
            filtered = _filter_reviews_by_keyword(reviews, keyword)
            if filtered:
                reviews = filtered

        if not reviews:
            _remove_keyword_file()
            stderr_snippet = (getattr(proc, 'stderr', None) or '')[-1500:].strip() if proc else ''
            msg = '未解析到有效内容，请先扫码登录小红书（或当前平台）后再测试。可在本机运行 MediaCrawler 扫码后，在系统设置中上传 Cookie/Session。'
            if stderr_snippet and ('SingletonLock' in stderr_snippet or 'File exists' in stderr_snippet):
                msg += ' 若曾出现浏览器占用提示，请关闭所有 Chrome 窗口后重试。'
            return {'status': 'no_content', 'message': msg, 'reviews': [], 'crawl_stderr': stderr_snippet}

        if callback and company_id is not None:
            callback(company_id, reviews)

        _remove_keyword_file()
        return {
            'status': 'ok',
            'message': f'爬取完成，共 {len(reviews)} 条',
            'reviews': reviews,
        }


def crawl_multi_platform(company_name, platforms=None, callback=None, company_id=None):
    """
    多平台爬取（依次执行）
    :param platforms: 如 ['xhs','wb','zhihu']，默认仅 xhs
    """
    platforms = platforms or [_get_platform()]
    all_reviews = []
    for plat in platforms:
        result = crawl_by_keyword(company_name, platform=plat, company_id=None)
        all_reviews.extend(result.get('reviews', []))
    
    if callback and company_id is not None:
        callback(company_id, all_reviews)
    
    return {
        'status': 'ok',
        'message': f'多平台爬取完成，共 {len(all_reviews)} 条',
        'reviews': all_reviews,
    }
