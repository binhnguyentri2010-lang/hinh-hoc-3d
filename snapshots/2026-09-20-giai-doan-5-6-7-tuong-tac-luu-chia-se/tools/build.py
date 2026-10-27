#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gộp toàn bộ ứng dụng thành MỘT file HTML mở được bằng double-click.

VÌ SAO CẦN: trình duyệt chặn ES module nạp qua file:// (chính sách CORS). Bản dev chạy
qua tools/serve.py thì không sao, nhưng file gửi cho người khác qua Zalo/USB phải tự
đứng được, không cần máy chủ, không cần mạng.

CÁCH LÀM: nhúng mã nguồn từng module vào HTML. Lúc chạy, một đoạn script thường (không
phải module) dựng blob URL cho từng module theo đúng thứ tự phụ thuộc rồi import() module
gốc. Mỗi module vẫn giữ phạm vi riêng của nó — nên không có chuyện code của mình trùng tên
với một trong khoảng một nghìn tên mà three.js xuất ra.

Chỉ dùng thư viện chuẩn Python. Không pip install gì.

Chạy:  python tools\\build.py
"""

import json
import re
import sys
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parent.parent
ENTRY = "src/ui/app.js"
OUT = ROOT / "dist" / "hinh-hoc-3d.html"

# Bare specifier → file thật trong vendor/
BARE = {"three": "vendor/three.module.js"}

# "import ... from 'x'" và "export ... from 'x'" (chịu được khối import xuống dòng)
FROM_RE = re.compile(r"""(?:^|[\n;])[ \t]*(?:import|export)\b[^'"();]*?\bfrom[ \t]*(['"])(.+?)\1""")
# "import 'x'" — nhập chỉ để chạy tác dụng phụ
SIDE_RE = re.compile(r"""(?:^|[\n;])[ \t]*import[ \t]*(['"])(.+?)\1""")

PLACEHOLDER = "__HHKG_MOD_{}__"


def die(msg):
    print("LOI: " + msg, file=sys.stderr)
    sys.exit(1)


def resolve(spec, importer):
    """Đổi specifier trong mã nguồn thành đường dẫn tính từ gốc dự án."""
    if spec in BARE:
        return BARE[spec]
    if not spec.startswith("."):
        die("Khong giai duoc specifier %r trong %s. Neu day la thu vien moi, "
            "them vao BARE trong tools/build.py." % (spec, importer))
    parts = []
    for p in str(PurePosixPath(importer).parent / spec).split("/"):
        if p in ("", "."):
            continue
        if p == "..":
            if parts:
                parts.pop()
        else:
            parts.append(p)
    return "/".join(parts)


def collect(entry):
    """Duyệt đồ thị phụ thuộc, trả về thứ tự nạp (phụ thuộc đứng trước) và mã đã đánh dấu."""
    mods, state, order = {}, {}, []

    def visit(mid, stack):
        if state.get(mid) == "done":
            return
        if state.get(mid) == "visiting":
            die("Phu thuoc vong: " + " -> ".join(stack + [mid]))
        state[mid] = "visiting"

        path = ROOT / mid
        if not path.exists():
            die("Thieu file: %s (duoc nhap tu %s)" % (mid, stack[-1] if stack else "(goc)"))
        code = path.read_text(encoding="utf-8")

        # Thu thập mọi specifier kèm đúng vị trí, để thay chính xác chứ không thay mù cả file
        spans = []
        for rx in (FROM_RE, SIDE_RE):
            for m in rx.finditer(code):
                spans.append((m.start(2), m.end(2), m.group(2)))
        spans.sort()

        deps = []
        for _, _, spec in spans:
            dep = resolve(spec, mid)
            if dep not in deps:
                deps.append(dep)
        for dep in deps:
            visit(dep, stack + [mid])

        # Thay từ cuối về đầu để các vị trí phía trước không bị xê dịch
        for start, end, spec in reversed(spans):
            code = code[:start] + PLACEHOLDER.format(resolve(spec, mid)) + code[end:]

        mods[mid] = code
        state[mid] = "done"
        order.append(mid)

    visit(entry, [])
    return order, mods


LOADER = """
(function () {
  var box = document.getElementById('__hhkg_app__');
  var M = JSON.parse(box.textContent);
  var urls = {};
  try {
    for (var i = 0; i < M.order.length; i++) {
      var id = M.order[i], code = M.mods[id];
      for (var k = 0; k < i; k++) {
        var dep = M.order[k], ph = '__HHKG_MOD_' + dep + '__';
        if (code.indexOf(ph) >= 0) code = code.split(ph).join(urls[dep]);
      }
      urls[id] = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    }
    import(urls[M.entry]).catch(report);
  } catch (e) { report(e); }
  function report(e) {
    document.body.innerHTML =
      '<pre style="color:#ffb454;background:#0f1420;padding:20px;font:14px monospace;' +
      'white-space:pre-wrap">Khong nap duoc ung dung:\\n\\n' +
      String(e && e.stack || e) + '</pre>';
  }
})();
"""


def main():
    order, mods = collect(ENTRY)

    payload = json.dumps({"entry": ENTRY, "order": order, "mods": mods},
                         ensure_ascii=False, separators=(",", ":"))
    # "</script" nằm trong mã nguồn sẽ cắt ngang thẻ script; "\/" là escape hợp lệ của JSON
    payload = payload.replace("</", "<\\/")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    if "<!--APP:START-->" not in html or "<!--APP:END-->" not in html:
        die("index.html thieu moc <!--APP:START--> / <!--APP:END-->")

    inline = ('<script type="application/json" id="__hhkg_app__">' + payload + "</script>\n"
              "<script>" + LOADER + "</script>")
    html = re.sub(r"<!--APP:START-->.*?<!--APP:END-->", lambda _: inline, html, flags=re.S)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding="utf-8")

    print("Da gop %d module -> %s" % (len(order), OUT))
    print("Kich thuoc: {:,} bytes".format(OUT.stat().st_size))
    print("Thu tu nap:")
    for mid in order:
        print("   " + mid)


if __name__ == "__main__":
    main()
