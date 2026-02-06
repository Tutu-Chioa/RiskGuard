# -*- coding: utf-8 -*-
"""
MediaCrawler 集成服务
- 调用 MediaCrawler 爬取小红书、微博、知乎等平台对企业名称的搜索结果
- 需提前克隆并配置 MediaCrawler：git clone https://github.com/NanmiCoder/MediaCrawler
- 环境变量 MEDIACRAWLER_PATH 指向 MediaCrawler 项目根目录
"""
import os
import json
import subprocess
import glob
import shutil
import time
from datetime import datetime

# 每次从环境变量读取，避免 .env 在模块导入之后才加载导致读不到
def _get_path():
    return os.environ.get('MEDIACRAWLER_PATH', '').strip()


def _get_mediacrawler_python():
    """
    优先返回 MediaCrawler 项目下的 venv Python，保证与扫码登录脚本同一环境、同一 cwd 语义。
    这样爬取时 os.getcwd() 为 MC 根目录，browser_data 等路径与登录时一致，登录态可复用。
    若未找到 venv 则返回 None，调用方回退到 uv run。
    """
    path = _get_path()
    if not path or not os.path.isdir(path):
        return None
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
    """本系统媒体爬虫登录态目录（与 app 中 _mediacrawler_sessions_dir 一致），创建后返回绝对路径。"""
    base = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'mediacrawler_sessions')
    os.makedirs(base, exist_ok=True)
    return os.path.abspath(base)


def get_qr_dir():
    """本系统二维码写入目录（与 app 中 _mediacrawler_qr_dir 一致），创建后返回绝对路径。"""
    base = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'mediacrawler_qr')
    os.makedirs(base, exist_ok=True)
    return os.path.abspath(base)


def is_available():
    """检查 MediaCrawler 是否可用"""
    path = _get_path()
    if not path or not os.path.isdir(path):
        return False
    main_py = os.path.join(path, 'main.py')
    return os.path.isfile(main_py)


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
    本系统保存路径：backend/../data/mediacrawler_sessions/{platform}/
    MediaCrawler 使用：MEDIACRAWLER_PATH/data/{platform}/ 或 getcwd()/browser_data/（爬取时 cwd=MC 根目录）
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    our_sessions = os.path.join(base_dir, 'data', 'mediacrawler_sessions', platform)
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
    
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    our_sessions = os.path.join(base_dir, 'data', 'mediacrawler_sessions', platform)
    # 若存在「内嵌扫码登录」的 marker，爬取时使用 Playwright 以复用 browser_data 中的会话
    use_playwright = os.path.isfile(os.path.join(our_sessions, 'logged_in.txt'))
    
    # MediaCrawler 仅支持 --save_data_option，不支持 --save_data_path；JSON 会写到 MediaCrawler 项目下的 data/{platform}，解析时用 mc_data_path 读取
    save_path = os.path.abspath(os.path.join(base_dir, 'data', 'mediacrawler_output', platform))
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
    py_exe = _get_mediacrawler_python()
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
    except FileNotFoundError:
        # uv 或 venv python 不存在时，回退到系统 python（需在 MC 目录下可导入）
        if not py_exe:
            cmd = ['python3', 'main.py'] + args
        else:
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
        except Exception as e:
            _remove_keyword_file()
            return {
                'status': 'error',
                'message': f'执行 MediaCrawler 失败: {e}',
                'reviews': []
            }
    except subprocess.TimeoutExpired:
        _remove_keyword_file()
        return {
            'status': 'timeout',
            'message': f'爬取超时（{_get_timeout()}秒）',
            'reviews': []
        }
    except Exception as e:
        _remove_keyword_file()
        return {
            'status': 'error',
            'message': str(e),
            'reviews': []
        }
    
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
        return {
            'status': 'no_content',
            'message': '未解析到有效内容，请先扫码登录小红书（或当前平台）后再测试。可在本机运行 MediaCrawler 扫码后，在系统设置中上传 Cookie/Session。',
            'reviews': [],
            'crawl_stderr': stderr_snippet,
        }
    
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
