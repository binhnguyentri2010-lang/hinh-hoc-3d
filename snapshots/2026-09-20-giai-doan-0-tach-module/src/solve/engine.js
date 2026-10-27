/* Điểm vào của toàn bộ phần lõi: đề bài (chuỗi) → hình + đáp án.
   Ghép lại từ legacy/index.html dòng 124–138 và 362, 548.

   Giai đoạn 0 giữ nguyên cấu trúc một-lượt-chạy của bản cũ: đọc đề, dựng hình và giải toán
   dùng chung một ngữ cảnh ctx. Giai đoạn 1 sẽ chẻ ctx thành ba tầng rõ rệt
   (Spec → Scene → Results) để phục vụ sửa tay, thanh trượt, mã đề chia sẻ và phép thử
   nhiễu loạn. Làm từng bước một: lần này chỉ tách file, không đổi hành vi. */

import { LEN, norm, lenVal } from '../parse/normalize.js';
import { runDefs } from '../build/points.js';
import { detectSolid } from '../build/scene.js';
import { runQueries } from './queries.js';

export function solve(raw) {
  const t = norm(raw), W = [], lens = {};
  const K = (p, q) => [p, q].sort().join('|');
  const L = (p, q) => lens[K(p, q)];

  /* Độ dài cho sẵn: "AB = a", "SA = BC = a√2" (một giá trị gán cho nhiều đoạn) */
  for (const m of t.matchAll(new RegExp(`((?:(?<![A-Z'])[A-Z]'?[A-Z]'?\\s*(?:=|bằng)\\s*)+)${LEN}`, 'g'))) {
    const v = lenVal(m[2], m[3], m[4]);
    for (const q of m[1].matchAll(/([A-Z]'?)([A-Z]'?)\s*(?:=|bằng)/g)) lens[K(q[1], q[2])] = v;
  }

  const num1 = re => { const m = t.match(new RegExp(re + LEN)); return m ? lenVal(m[1], m[2], m[3]) : undefined; };
  const baseSide = num1("cạnh\\s*(?:đáy\\s*)?(?:đều\\s*)?(?:bằng|là|=|có độ dài(?:\\s*bằng)?)?\\s*");
  const lateral = num1("cạnh bên\\s*(?:đều\\s*)?(?:bằng|là|=|có độ dài(?:\\s*bằng)?)?\\s*");
  const heightV = num1("(?:chiều cao|đường cao)[^.;,=]{0,25}?(?:bằng|là|=)?\\s*");

  const ctx = {
    t, W, lens, K, L,
    baseSide, lateral, heightV,
    pts: {}, faces: [], S: { kind: null, apex: null, base: [], top: [] },
    derived: [], structNames: new Set(),
    aux: [], auxExt: [], planesHi: [], feet: [],
    frI: 0,
    edges: null,
  };

  const err = detectSolid(ctx);
  if (err) return err;

  runDefs(ctx);

  const { R, edges } = runQueries(ctx);

  return {
    pts: ctx.pts,
    faces: ctx.faces,
    edges: [...edges].map(k => k.split('|')),
    aux: ctx.aux,
    planesHi: ctx.planesHi,
    feet: ctx.feet,
    derived: ctx.derived,
    R, W: ctx.W, S: ctx.S,
  };
}
