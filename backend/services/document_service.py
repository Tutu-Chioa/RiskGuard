# -*- coding: utf-8 -*-
"""
文档服务：提取文本供 LLM 分析
"""
import os


def extract_text_from_file(filepath):
    """从文件提取文本，支持 txt、pdf"""
    if not filepath or not os.path.isfile(filepath):
        return ''
    ext = os.path.splitext(filepath)[1].lower()
    try:
        if ext == '.txt':
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        if ext == '.pdf':
            from pypdf import PdfReader
            reader = PdfReader(filepath)
            return '\n'.join(page.extract_text() or '' for page in reader.pages)
    except Exception as e:
        print('[Document] extract error:', e)
    return ''
