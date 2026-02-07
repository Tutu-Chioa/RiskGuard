#!/usr/bin/env python3
"""
生成 DMG 拖拽窗口背景图：纯色，无文字无图案。
输出: scripts/mac/dmg_background.png (1120x720)，供 create-dmg --background 使用。
依赖: pip install Pillow
"""
import os
import sys

# 2x 分辨率，与 create-dmg 窗口 560x360 对应
SCALE = 2
W, H = 560 * SCALE, 360 * SCALE

def main():
    try:
        from PIL import Image
    except ImportError:
        print("请先安装 Pillow: pip install Pillow", file=sys.stderr)
        sys.exit(1)

    # 纯白背景
    img = Image.new("RGB", (W, H), (255, 255, 255))

    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dmg_background.png")
    img.save(out_path)
    print("已生成 纯色背景:", out_path)

if __name__ == "__main__":
    main()
