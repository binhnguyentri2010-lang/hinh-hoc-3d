#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Máy chủ phát triển cho ứng dụng. Chỉ dùng thư viện chuẩn Python.

Chạy:  python tools\\serve.py          → http://localhost:8080
       python tools\\serve.py 9000     → đổi cổng

Hai việc nó làm mà http.server trần không làm:

1. ÉP KIỂU MIME CỦA .js. Trên Windows, mimetypes đọc registry, và máy nào cài nhầm phần
   mềm là .js hoá ra text/plain — trình duyệt lập tức từ chối nạp ES module với lỗi
   "Failed to load module script". Rất tốn thời gian mò nếu không biết trước.

2. TẮT CACHE. Sửa module xong bấm F5 mà trình duyệt vẫn chạy bản cũ là cái bẫy kinh điển
   khi phát triển bằng module rời.
"""

import mimetypes
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/javascript", ".mjs")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("image/svg+xml", ".svg")


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".json": "application/json",
        ".html": "text/html",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        "": "application/octet-stream",
    }

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        msg = fmt % args
        if " 200 " in msg or " 304 " in msg:
            return  # chỉ in lỗi, đỡ rác màn hình
        sys.stderr.write("  %s\n" % msg)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    handler = partial(Handler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    print("Ung dung:  http://localhost:%d/" % port)
    print("Test:      http://localhost:%d/tests/" % port)
    print("Ctrl+C de dung.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nDa dung.")
        server.server_close()


if __name__ == "__main__":
    main()
