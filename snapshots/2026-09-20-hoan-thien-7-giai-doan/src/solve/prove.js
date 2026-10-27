/* Câu hỏi "Chứng minh …" — dạng phổ biến bậc nhất trong SGK mà bản cũ bỏ qua hoàn toàn.

   App này không phải máy chứng minh định lý, nên nó làm đúng hai việc và nói rõ mình làm gì:
     1. KIỂM TRA mệnh đề có đúng trên hình vừa dựng không (bằng số, dung sai tương đối).
     2. NÊU LÝ DO theo đúng mẫu lập luận trong sách, bằng cách đi tìm các đường thẳng cụ thể
        thoả điều kiện của định lý — "AB ⊥ SA và AB ⊥ AD, mà SA, AD ⊂ (SAD) cắt nhau tại A".

   Mệnh đề SAI thì nói thẳng là sai. Học sinh chép nhầm đề là chuyện thường, và biết sớm còn
   hơn ngồi chứng minh một điều không đúng. */

import { sub, dot, cross, len } from '../core/vec.js';
import { toks, PLANE_TOK } from '../parse/normalize.js';
import { scopeOf } from '../parse/clauses.js';
import { planeOf } from '../build/points.js';

const TOL = 1e-6;
const DT = "(?<![A-Z'(])([A-Z]'?[A-Z]'?)(?![A-Z'(])";
const VG = "(?:⊥|vuông góc(?:\\s*với)?)";
const SS = "(?:∥|\\/\\/|song song(?:\\s*với)?)";

export function runProve(ctx, R, inc, trung) {
  const { t, pts } = ctx;
  const { plInfo, lineCands } = inc;
  const PL = `\\(\\s*(${PLANE_TOK})\\s*\\)`;

  const co = ns => ns && ns.every(n => pts[n]);
  const huong = s => { const l = toks(s); return co(l) && l.length === 2 ? sub(pts[l[1]], pts[l[0]]) : null; };
  const ss = (u, v) => len(cross(u, v)) <= TOL * len(u) * len(v);
  const vg = (u, v) => Math.abs(dot(u, v)) <= TOL * len(u) * len(v);

  const them = (q, dung, ketLuan, buoc) => {
    if (trung(q)) return;
    R.push({
      q,
      a: dung ? '✓ Đúng — ' + ketLuan : '✗ SAI trên hình dựng từ đề này — kiểm tra lại đề',
      steps: dung ? buoc : ['Máy đã dựng hình theo đúng dữ kiện đọc được và kiểm tra bằng số: mệnh đề không thoả.'],
    });
  };

  /* Các đoạn nối hai điểm đã biết, cùng nằm trong mặt phẳng pl. */
  const trongMP = pl => lineCands(plInfo(pl)).map(c => ({ ten: c.p + c.q, v: sub(pts[c.q], pts[c.p]), sc: c.sc }))
                                             .filter(x => len(x.v) > 1e-9)
                                             .sort((a, b) => b.sc - a.sc);

  for (const cl of scopeOf(t, 'chứng-minh')) {

    /* ---- đường thẳng ⊥ mặt phẳng ---- */
    for (const m of cl.matchAll(new RegExp(`${DT}\\s*${VG}\\s*${PL}`, 'g'))) {
      const u = huong(m[1]), pl = planeOf(ctx, m[2]);
      if (!u || !co(pl)) continue;
      const P = plInfo(pl);
      const dung = ss(u, P.n);
      const buoc = [];
      if (dung) {
        const vuong = trongMP(pl).filter(x => vg(u, x.v));
        const a = vuong[0], b = vuong.find(x => a && !ss(x.v, a.v));
        if (a && b) buoc.push(`${m[1]} ⊥ ${a.ten} và ${m[1]} ⊥ ${b.ten}`,
                              `${a.ten}, ${b.ten} là hai đường cắt nhau cùng nằm trong (${pl.join('')})`,
                              `⇒ ${m[1]} ⊥ (${pl.join('')})`);
        else buoc.push(`${m[1]} cùng phương với pháp tuyến của (${pl.join('')})`);
      }
      them(`Chứng minh ${m[1]} ⊥ (${m[2]})`, dung, `${m[1]} ⊥ (${pl.join('')})`, buoc);
    }

    /* ---- đường thẳng ∥ mặt phẳng ---- */
    for (const m of cl.matchAll(new RegExp(`${DT}\\s*${SS}\\s*${PL}`, 'g'))) {
      const ln = toks(m[1]), u = huong(m[1]), pl = planeOf(ctx, m[2]);
      if (!u || !co(pl)) continue;
      const P = plInfo(pl);
      const trong = ln.every(n => P.on(pts[n]));
      const dung = vg(u, P.n) && !trong;
      const buoc = [];
      if (dung) {
        const c = trongMP(pl).find(x => ss(u, x.v));
        if (c) buoc.push(`${m[1]} ∥ ${c.ten}`, `${c.ten} ⊂ (${pl.join('')}) và ${m[1]} ⊄ (${pl.join('')})`,
                         `⇒ ${m[1]} ∥ (${pl.join('')})`);
        else buoc.push(`${m[1]} vuông góc với pháp tuyến của (${pl.join('')}) và không nằm trong mặt phẳng đó`);
      } else if (trong) {
        R.push({ q: `Chứng minh ${m[1]} ∥ (${m[2]})`, a: `${m[1]} nằm TRONG (${pl.join('')}), không phải song song` });
        continue;
      }
      them(`Chứng minh ${m[1]} ∥ (${m[2]})`, dung, `${m[1]} ∥ (${pl.join('')})`, buoc);
    }

    /* ---- mặt phẳng ⊥ mặt phẳng ---- */
    for (const m of cl.matchAll(new RegExp(`${PL}\\s*${VG}\\s*${PL}`, 'g'))) {
      const p1 = planeOf(ctx, m[1]), p2 = planeOf(ctx, m[2]);
      if (!co(p1) || !co(p2)) continue;
      const A = plInfo(p1), B = plInfo(p2);
      const dung = vg(A.n, B.n);
      const buoc = [];
      if (dung) {
        /* Phải tìm cả hai chiều. Với (SAC) ⊥ (SBD) thì trong (SAC) KHÔNG có đường nào vuông
           góc với (SBD), nhưng trong (SBD) lại có: BD ⊥ (SAC). Chỉ tìm một chiều là tuột mất
           lập luận đúng và phải nói câu chống chế "hai pháp tuyến vuông góc". */
        const l1 = trongMP(p1).find(x => ss(x.v, B.n));
        const l2 = l1 ? null : trongMP(p2).find(x => ss(x.v, A.n));
        if (l1) buoc.push(`${l1.ten} ⊥ (${p2.join('')})`, `${l1.ten} ⊂ (${p1.join('')})`,
                          `⇒ (${p1.join('')}) ⊥ (${p2.join('')})`);
        else if (l2) buoc.push(`${l2.ten} ⊥ (${p1.join('')})`, `${l2.ten} ⊂ (${p2.join('')})`,
                               `⇒ (${p2.join('')}) ⊥ (${p1.join('')})`);
        else buoc.push('Hai pháp tuyến vuông góc với nhau');
      }
      them(`Chứng minh (${m[1]}) ⊥ (${m[2]})`, dung, `(${p1.join('')}) ⊥ (${p2.join('')})`, buoc);
    }

    /* ---- mặt phẳng ∥ mặt phẳng ---- */
    for (const m of cl.matchAll(new RegExp(`${PL}\\s*${SS}\\s*${PL}`, 'g'))) {
      const p1 = planeOf(ctx, m[1]), p2 = planeOf(ctx, m[2]);
      if (!co(p1) || !co(p2)) continue;
      const A = plInfo(p1), B = plInfo(p2);
      const dung = ss(A.n, B.n) && !B.on(A.a);
      const buoc = [];
      if (dung) {
        const ds = trongMP(p1).filter(x => vg(x.v, B.n));
        const a = ds[0], b = ds.find(x => a && !ss(x.v, a.v));
        if (a && b) buoc.push(`${a.ten} ∥ (${p2.join('')}) và ${b.ten} ∥ (${p2.join('')})`,
                              `${a.ten}, ${b.ten} là hai đường cắt nhau cùng nằm trong (${p1.join('')})`,
                              `⇒ (${p1.join('')}) ∥ (${p2.join('')})`);
      }
      them(`Chứng minh (${m[1]}) ∥ (${m[2]})`, dung, `(${p1.join('')}) ∥ (${p2.join('')})`, buoc);
    }

    /* ---- đường thẳng ⊥ đường thẳng ---- */
    for (const m of cl.matchAll(new RegExp(`${DT}\\s*${VG}\\s*${DT}`, 'g'))) {
      const u = huong(m[1]), v = huong(m[2]);
      if (!u || !v) continue;
      const dung = vg(u, v);
      const buoc = [];
      if (dung) {
        /* Lối chứng minh quen thuộc: tìm một mặt phẳng chứa đường thứ hai mà đường thứ nhất
           vuông góc với cả mặt phẳng đó. */
        const l2 = toks(m[2]);
        const mp = timMatPhangChua(ctx, l2, pl => ss(u, plInfo(pl).n));
        if (mp) buoc.push(`${m[1]} ⊥ (${mp.join('')})`, `${m[2]} ⊂ (${mp.join('')})`, `⇒ ${m[1]} ⊥ ${m[2]}`);
        else buoc.push(`Hai vectơ chỉ phương có tích vô hướng bằng 0`);
      }
      them(`Chứng minh ${m[1]} ⊥ ${m[2]}`, dung, `${m[1]} ⊥ ${m[2]}`, buoc);
    }

    /* ---- đường thẳng ∥ đường thẳng ---- */
    for (const m of cl.matchAll(new RegExp(`${DT}\\s*${SS}\\s*${DT}`, 'g'))) {
      const u = huong(m[1]), v = huong(m[2]);
      if (!u || !v) continue;
      them(`Chứng minh ${m[1]} ∥ ${m[2]}`, ss(u, v), `${m[1]} ∥ ${m[2]}`,
           [`Hai vectơ chỉ phương cùng phương`]);
    }
  }
}

/* Tìm một mặt của khối (hoặc mặt phẳng đặt tên) chứa cả hai đầu của đoạn và thoả điều kiện. */
function timMatPhangChua(ctx, ln, dk) {
  const ungVien = [...ctx.faces, ...Object.values(ctx.planeAlias || {})];
  for (const pl of ungVien) {
    if (!pl || pl.length < 3) continue;
    if (!ln.every(n => pl.includes(n))) continue;
    try { if (dk(pl)) return pl; } catch (e) { /* mặt suy biến, bỏ qua */ }
  }
  return null;
}
