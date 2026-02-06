#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库备份脚本：将 data/risk_platform.db 复制到 data/backup/ 并带时间戳。
建议通过 cron 定期执行，例如每天凌晨：0 2 * * * cd /path/to/sys2 && python backend/scripts/backup_db.py
"""
import os
import shutil
from datetime import datetime

def main():
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    project_root = os.path.dirname(backend_dir)
    db_path = os.path.join(project_root, 'data', 'risk_platform.db')
    backup_dir = os.path.join(project_root, 'data', 'backup')
    
    if not os.path.isfile(db_path):
        print('Database not found:', db_path)
        return 1
    
    os.makedirs(backup_dir, exist_ok=True)
    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    dest = os.path.join(backup_dir, f'risk_platform_{stamp}.db')
    shutil.copy2(db_path, dest)
    print('Backup saved:', dest)
    return 0

if __name__ == '__main__':
    exit(main())
