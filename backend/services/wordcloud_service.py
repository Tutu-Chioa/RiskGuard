# -*- coding: utf-8 -*-
"""
词云生成服务
"""
import os
import io
import base64
from collections import Counter


def generate_wordcloud(keywords, width=400, height=200):
    """
    从关键词列表生成词云图，返回 base64 PNG
    keywords: [str] 或 [{"word": "词", "weight": 1}, ...]
    """
    try:
        from wordcloud import WordCloud
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import jieba

        if not keywords:
            keywords = ['暂无', '数据']

        # 统计词频
        if isinstance(keywords[0], dict):
            word_freq = {k['word']: k.get('weight', 1) for k in keywords}
        else:
            counter = Counter(keywords)
            word_freq = dict(counter)

        wc = WordCloud(
            width=width,
            height=height,
            font_path=_get_font_path(),
            background_color='white',
            max_words=50,
            relative_scaling=0.5
        ).generate_from_frequencies(word_freq)

        buf = io.BytesIO()
        plt.figure(figsize=(width/100, height/100), dpi=100)
        plt.imshow(wc, interpolation='bilinear')
        plt.axis('off')
        plt.tight_layout(pad=0)
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        plt.close()
        buf.seek(0)
        return 'data:image/png;base64,' + base64.b64encode(buf.read()).decode()
    except ImportError:
        # 无 wordcloud 时返回占位
        return None
    except Exception as e:
        print('WordCloud error:', e)
        return None


def _get_font_path():
    """获取中文字体路径"""
    candidates = [
        '/System/Library/Fonts/PingFang.ttc',
        '/System/Library/Fonts/STHeiti Light.ttc',
        'C:/Windows/Fonts/simhei.ttf',
        '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None
