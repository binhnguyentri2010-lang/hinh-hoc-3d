#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Lưu một bản sao toàn bộ dự án vào snapshots/ — đường lùi khi chưa có git.

Máy chưa cài git, mà từ đây trở đi mỗi giai đoạn đều đụng vào phần lõi đang chạy tốt.
Không có đường lùi thì một lần sửa hỏng là mất trắng.

Chạy:  python tools\\snapshot.py "giai-doan-0-tach-module"

Bỏ qua: snapshots/ (khỏi lồng nhau) và dist/ (build.py sinh lại được trong một giây).
Giữ lại vendor/ dù nặng 1,3 MB — để bản lưu tự chạy được mà không cần tải lại từ mạng.
"""

import shutil
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SNAP = ROOT / "snapshots"
SKIP = {"snapshots", "dist", "__pycache__", ".git"}


def main():
    if len(sys.argv) < 2:
        print('Thieu ten moc. Vi du: python tools\\snapshot.py "giai-doan-0-tach-module"',
              file=sys.stderr)
        sys.exit(1)

    name = "%s-%s" % (date.today().isoformat(), sys.argv[1])
    dest = SNAP / name
    if dest.exists():
        print("Da co ban luu %s — khong ghi de." % name, file=sys.stderr)
        sys.exit(1)

    dest.mkdir(parents=True)
    n_files = n_bytes = 0
    for item in sorted(ROOT.iterdir()):
        if item.name in SKIP:
            continue
        target = dest / item.name
        if item.is_dir():
            shutil.copytree(item, target, ignore=shutil.ignore_patterns(*SKIP))
        else:
            shutil.copy2(item, target)

    for f in dest.rglob("*"):
        if f.is_file():
            n_files += 1
            n_bytes += f.stat().st_size

    print("Da luu: snapshots/%s" % name)
    print("%d file, {:,} bytes".format(n_bytes) % n_files)
    print("Quay lai: chep nguoc thu muc do de len goc du an.")


if __name__ == "__main__":
    main()
