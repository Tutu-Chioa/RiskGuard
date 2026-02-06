#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将指定用户设为管理员。用法：
  python backend/scripts/set_admin.py <用户名>
例如：
  python backend/scripts/set_admin.py admin
"""
import os
import sys
import sqlite3

def main():
    if len(sys.argv) < 2:
        print('用法: python set_admin.py <用户名>')
        return 1
    username = sys.argv[1].strip()
    if not username:
        print('请提供用户名')
        return 1

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    project_root = os.path.dirname(backend_dir)
    db_path = os.path.join(project_root, 'data', 'risk_platform.db')
    
    if not os.path.isfile(db_path):
        print('数据库不存在:', db_path)
        return 1

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, role FROM users WHERE username=?", (username,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        print('用户不存在:', username)
        return 1
    user_id, uname, old_role = row[0], row[1], row[2]
    if old_role == 'admin':
        conn.close()
        print('用户已是管理员:', uname)
        return 0
    cursor.execute("UPDATE users SET role='admin' WHERE id=?", (user_id,))
    conn.commit()
    conn.close()
    print('已将用户设为管理员:', uname)
    return 0

if __name__ == '__main__':
    exit(main())
