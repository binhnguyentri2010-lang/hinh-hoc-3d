#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Đóng băng phần lõi của bản prototype cũ thành một module tham chiếu.

VÌ SAO: bộ test cần một "đáp án chuẩn" để đối chiếu trong suốt quá trình tách module.
Chép tay đáp án ra file thì có nguy cơ chép sai, và mỗi lần thêm đề mẫu lại phải chép lại.
Cách chắc hơn: giữ nguyên si phần logic của bản cũ thành một module chạy được, rồi cho
bộ test gọi thẳng cả hai bản và so kết quả. Bản tham chiếu là máy chấm, không phải ảnh chụp.

Trích bằng script chứ không gõ tay, để bảo đảm không sai một ký tự nào.

legacy/index.html dòng 68–549 là toàn bộ phần logic thuần: toán vector, định dạng số,
đọc đề, dựng hình, giải. Không đụng gì tới three.js — nên tách ra chạy độc lập được.

CHẠY MỘT LẦN. Sau khi có legacy/reference.js thì KHÔNG chạy lại và KHÔNG sửa file đó nữa.
"""

import io
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "legacy" / "index.html"
OUT = ROOT / "legacy" / "reference.js"

FIRST, LAST = 68, 549  # 1-based, đã đối chiếu bằng mắt

HEADER = '''/* ĐÃ ĐÓNG BĂNG — KHÔNG SỬA FILE NÀY.

   Trích nguyên văn legacy/index.html dòng %d–%d bằng tools/freeze_reference.py.
   Đây là phần lõi của bản prototype đầu tiên: toán vector, định dạng số, đọc đề,
   dựng hình, giải toán. Không phụ thuộc three.js.

   Vai trò: máy chấm. Bộ test chạy song song bản này với bản mới trong src/ và so
   từng con số, từng câu lập luận. Bản mới lệch đi ở đâu là biết ngay ở đó.

   Muốn đổi hành vi (ví dụ siết surd() ở Giai đoạn 1) thì sửa bên src/ rồi cập nhật
   danh sách sai lệch có chủ ý trong tests/cases.js — tuyệt đối không sửa file này. */

'''

FOOTER = '''

export { solve, norm, toks, fmt, fmtAng, surd };
'''


def main():
    lines = io.open(SRC, encoding="utf-8").read().split("\n")
    chunk = lines[FIRST - 1:LAST]

    # Kiểm tra lại ranh giới trước khi ghi — thà dừng còn hơn tạo ra file sai
    problems = []
    if "vector math" not in chunk[0]:
        problems.append("dong dau khong phai moc 'vector math': %r" % chunk[0][:70])
    if chunk[-1].strip() != "}":
        problems.append("dong cuoi khong phai dau dong cua solve(): %r" % chunk[-1][:70])
    if any("THREE" in l for l in chunk):
        problems.append("dinh THREE — doan nay le ra phai thuan logic")
    if any(re.match(r"\s*import\s", l) for l in chunk):
        problems.append("dinh cau lenh import")
    if not any("function solve(raw)" in l for l in chunk):
        problems.append("khong thay 'function solve(raw)'")
    if problems:
        for p in problems:
            print("LOI: " + p, file=sys.stderr)
        sys.exit(1)

    if OUT.exists():
        print("Da co %s — bo qua. File nay chi tao mot lan." % OUT.name)
        return

    OUT.write_text(HEADER % (FIRST, LAST) + "\n".join(chunk) + FOOTER, encoding="utf-8")
    print("Da tao %s (%d dong, %,d bytes)".replace(",d", "d") % (OUT.name, len(chunk), OUT.stat().st_size))


if __name__ == "__main__":
    main()
