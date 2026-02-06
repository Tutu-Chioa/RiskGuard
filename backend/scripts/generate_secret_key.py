#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成用于 SECRET_KEY 的随机字符串。请将输出复制到 backend/.env 的 SECRET_KEY=..."""
import secrets
print(secrets.token_hex(32))
