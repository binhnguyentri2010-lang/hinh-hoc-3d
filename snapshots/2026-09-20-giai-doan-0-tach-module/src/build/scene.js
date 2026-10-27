/* Nhận dạng khối (chóp / tứ diện / lăng trụ / hộp / lập phương), tìm chân đường cao,
   suy ra chiều cao, dựng toàn bộ đỉnh và mặt.
   Trích nguyên văn từ legacy/index.html dòng 272–362.

   ĐÂY LÀ Ổ CỦA VẤN ĐỀ BỊA SỐ. Ba chỗ dưới đây trả về một con số bịa khi đề không cho đủ,
   và người dùng không hề biết:
     · heightFor(..., d0)  → d0 = extent()*1.1, tức "chiều cao bằng 1.1 lần bề ngang đáy"
     · lăng trụ xiên       → d*1.5 khi không suy ra được gì
     · hình hộp            → s0*1.2
   Giai đoạn 1 sẽ đổi thành: trả về null + ghi lý do vào ctx.missing, rồi chặn mọi kết quả
   phụ thuộc. Giai đoạn 0 giữ nguyên hành vi để máy chấm còn so được. */

import { sub, add, mul, len, mid, avg, projLine } from '../core/vec.js';
import { toks, DEG } from '../parse/normalize.js';
import { base2D } from './base2d.js';
import { refPoint, runDefs } from './points.js';

/* Chân đường cao hạ từ đỉnh X xuống mặt đáy — đọc từ các cách diễn đạt quen thuộc của đề. */
export function footOf(ctx, X) {
  const { t, pts, S, derived, L } = ctx;
  const B = S.base,
        bl = `[${[...new Set(B.map(n => n[0]))].join('')}']{3,8}`,
        baseRe = `(?:(?:mặt\\s*)?đáy|\\(\\s*${bl}\\s*\\))`,
        Xe = X.replace("'", "'");
  let m;

  /* "SA ⊥ (ABCD)" → chân là A */
  if (m = t.match(new RegExp(`(?<![A-Z'])${Xe}([A-Z]'?)\\s*(?:⊥|vuông góc)\\s*(?:với\\s*)?${baseRe}`))) {
    if (pts[m[1]]) return { p: pts[m[1]], name: m[1] };
  }
  /* "(SAB) và (SAC) cùng vuông góc với đáy" → chân là cạnh chung A */
  if (m = t.match(new RegExp(`\\(\\s*${Xe}([A-Z]'?)([A-Z]'?)\\s*\\)\\s*(?:và|,)\\s*\\(\\s*${Xe}([A-Z]'?)([A-Z]'?)\\s*\\)[^.;]{0,30}?vuông góc`))) {
    const c = [m[1], m[2]].find(v => v === m[3] || v === m[4]);
    if (c && pts[c]) return { p: pts[c], name: c };
  }
  /* "(SAB) ⊥ (ABCD)" với (SAB) là tam giác cân/đều → chân là trung điểm AB */
  if (m = t.match(new RegExp(`\\(\\s*${Xe}([A-Z]'?)([A-Z]'?)\\s*\\)[^.;]{0,45}?(?:⊥|vuông góc)\\s*(?:với\\s*)?${baseRe}`))) {
    if (pts[m[1]] && pts[m[2]]) return { p: mid(pts[m[1]], pts[m[2]]), mid: [m[1], m[2]] };
  }
  /* "hình chiếu của S lên (ABC) là trọng tâm G của tam giác ABC" */
  if (m = t.match(new RegExp(`hình chiếu\\s*(?:vuông góc\\s*)?(?:của\\s*)?(?:điểm\\s*)?${Xe}\\s*(?:lên|trên|xuống)[^.;]*?(?:là|trùng với)\\s*(?:điểm\\s*)?(?:(trung điểm|trọng tâm|tâm|giao điểm)\\s*(?:([A-Z]'?)(?![A-Z'])\\s*)?(?:của\\s*)?(?:cạnh\\s*|đoạn\\s*|tam giác\\s*|hình \\S+\\s*)?((?:[A-Z]'?)*)|([A-Z]'?))`))) {
    if (m[4]) {
      if (pts[m[4]]) return { p: pts[m[4]], name: m[4] };
    } else {
      const p = refPoint(ctx, m[1], m[3]);
      if (p) {
        if (m[2] && !pts[m[2]]) { pts[m[2]] = p; derived.push(m[2]); }
        return { p, name: m[2] };
      }
    }
  }
  /* Có "SH ⊥ đáy" nhưng H chưa dựng được — báo để gọi lại sau khi runDefs() chạy thêm vòng */
  if (m = t.match(new RegExp(`(?<![A-Z'])${Xe}([A-Z]'?)\\s*(?:⊥|vuông góc)\\s*(?:với\\s*)?${baseRe}`))) {
    return { pending: m[1] };
  }
  return null;
}

/* Chiều cao từ đỉnh X. Thử lần lượt: cạnh XH cho sẵn → "chiều cao bằng…" → cạnh bên +
   Pytago → góc cạnh bên với đáy → góc mặt bên với đáy → mặt bên đều/vuông cân.
   Hết cách thì trả về d0 — tức con số bịa. */
export function heightFor(ctx, X, f, d0) {
  const { t, pts, S, L, heightV, lateral } = ctx;
  const foot = Object.assign([...f.p], { name: f.name });
  const B = S.base,
        bl = `[${[...new Set(B.map(n => n[0]))].join('')}']{3,8}`,
        baseRe = `(?:(?:mặt\\s*)?đáy|\\(\\s*${bl}\\s*\\))`;
  const hd = v => len(sub(foot, pts[v]));
  let m;

  if (foot.name && L(X, foot.name)) return L(X, foot.name);
  if (heightV) return heightV;
  for (const v of B) { const e = L(X, v); if (e && e > hd(v) + 1e-9) return Math.sqrt(e * e - hd(v) ** 2); }
  if (lateral && lateral > hd(B[0])) return Math.sqrt(lateral ** 2 - hd(B[0]) ** 2);

  const angE = [
    new RegExp(`góc\\s*(?:giữa\\s*)?(?:đường thẳng\\s*|cạnh bên\\s*)?(?<![A-Z'])${X}([A-Z]'?)\\s*(?:và|với)\\s*${baseRe}\\s*(?:bằng|=|là)\\s*${DEG}`),
    new RegExp(`(?<![A-Z'])${X}([A-Z]'?)\\s*tạo với\\s*${baseRe}\\s*(?:một\\s*)?góc\\s*(?:bằng\\s*)?${DEG}`)];
  for (const re of angE) if ((m = t.match(re)) && pts[m[1]]) return hd(m[1]) * Math.tan(+m[2].replace(',', '.') * Math.PI / 180);

  const angF = [
    new RegExp(`góc\\s*giữa\\s*(?:hai\\s*)?(?:mặt phẳng\\s*|mặt bên\\s*)?\\(\\s*${X}([A-Z]'?)([A-Z]'?)\\s*\\)\\s*(?:và|với)\\s*${baseRe}\\s*(?:bằng|=|là)\\s*${DEG}`),
    new RegExp(`\\(\\s*${X}([A-Z]'?)([A-Z]'?)\\s*\\)\\s*tạo với\\s*${baseRe}\\s*(?:một\\s*)?góc\\s*(?:bằng\\s*)?${DEG}`)];
  for (const re of angF) if ((m = t.match(re)) && pts[m[1]] && pts[m[2]]) {
    const d = len(sub(foot, projLine(foot, pts[m[1]], sub(pts[m[2]], pts[m[1]]))));
    return d * Math.tan(+m[3].replace(',', '.') * Math.PI / 180);
  }

  if ((m = t.match(new RegExp(`(?<![A-Z'.])${X}([A-Z]'?)([A-Z]'?)\\s*\\)?\\s*(?:là\\s*)?(?:tam giác\\s*)?(đều|vuông cân)`))) && pts[m[1]] && pts[m[2]]) {
    const e = len(sub(pts[m[1]], pts[m[2]])) / (m[3] === 'đều' ? 1 : Math.SQRT2), d = hd(m[1]);
    if (e > d) return Math.sqrt(e * e - d * d);
  }

  return d0; // ← TODO Giai đoạn 1: đây là con số bịa, phải đổi thành null + ghi lý do
}

/* Bề ngang lớn nhất của đáy — dùng làm thước đo khi phải đoán. */
export function extent(ctx) {
  const { pts, S } = ctx;
  let e = 0;
  for (const a of S.base) for (const b of S.base) e = Math.max(e, len(sub(pts[a], pts[b])));
  return e || 1;
}

/* Nhận dạng khối và dựng toàn bộ đỉnh. Trả về {error} nếu không nhận ra khối nào. */
export function detectSolid(ctx) {
  const { t, pts, S, faces, derived, aux, L, lateral, heightV, baseSide } = ctx;
  let m;

  if (m = t.match(/(lập phương|hộp chữ nhật|hình hộp|lăng trụ)[^A-Z.]*?((?:[A-Z]){3,6})\s*\.\s*((?:[A-Z]'?){3,6})/)) {
    S.kind = 'prism';
    S.base = toks(m[2]);
    let top = toks(m[3]);
    if (top.length !== S.base.length) top = S.base.map(n => n + "'");  // TODO Gđ1: cảnh báo đổi tên
    S.top = top;
    Object.assign(pts, base2D(ctx, S.base));
    ctx.structNames = new Set([...S.base, ...top]);
    runDefs(ctx);

    let off = [0, 0, 0], h;
    const s0 = len(sub(pts[S.base[0]], pts[S.base[1]]));
    if (/lập phương/.test(m[1])) h = s0;
    else {
      let f = null, i = 0;
      for (; i < top.length; i++) { f = footOf(ctx, top[i]); if (f && f.p) break; f = null; }
      if (f) {
        off = sub(f.p, pts[S.base[i]]); off[2] = 0;
        const e = L(S.base[i], top[i]) ?? lateral, d = len(off);
        h = e && e > d ? Math.sqrt(e * e - d * d) : heightV;
        if (!h) {
          const am = t.match(new RegExp(`góc\\s*(?:giữa\\s*)?(?:cạnh bên\\s*|${S.base[i]}${top[i]}\\s*)(?:và|với)\\s*(?:mặt\\s*)?(?:đáy|\\([^)]*\\))\\s*(?:bằng|=|là)\\s*${DEG}`));
          h = am ? d * Math.tan(+am[1] * Math.PI / 180) : (d > 1e-9 ? d * 1.5 : extent(ctx));
        }
      } else {
        h = heightV ?? lateral;
        for (let j = 0; j < top.length && !h; j++) h = L(S.base[j], top[j]);
        h = h ?? (/hộp/.test(m[1]) ? s0 * 1.2 : extent(ctx));
      }
    }
    S.base.forEach((b, j) => pts[top[j]] = add(add(pts[b], off), [0, 0, h]));
    faces.push(S.base, [...top]);
    S.base.forEach((b, j) => { const k = (j + 1) % S.base.length; faces.push([b, S.base[k], top[k], top[j]]); });
    S.label = (/lập phương/.test(m[1]) ? 'Hình lập phương ' : /hộp/.test(m[1]) ? 'Hình hộp ' : 'Lăng trụ ')
            + S.base.join('') + '.' + top.join('');

  } else if ((m = t.match(/chóp[^A-Z.]*?([A-Z])\s*\.\s*((?:[A-Z]){3,6})(?![A-Z'])/))
          || (m = t.match(/tứ diện[^A-Z.]*?([A-Z]{4})(?![A-Z'])/))) {
    let apex, base;
    if (m[2]) {
      apex = m[1]; base = toks(m[2]);
      S.label = 'Hình chóp ' + apex + '.' + base.join('');
    } else {
      const ns = toks(m[1]);
      const om0 = t.match(/([A-Z])[A-Z]\s*,\s*\1[A-Z]\s*(?:,|và)\s*\1[A-Z][^.;]{0,20}đôi một vuông góc/);
      if (om0 && ns.includes(om0[1])) apex = om0[1];
      else apex = ['S', 'O'].includes(ns[0]) ? ns[0] : ns[3];
      base = ns.filter(n => n !== apex);
      S.label = 'Tứ diện ' + ns.join('');
    }
    S.kind = 'pyr'; S.apex = apex; S.base = base;
    ctx.structNames = new Set([apex, ...base]);

    const om = t.match(new RegExp(`${apex}[A-Z]\\s*,\\s*${apex}[A-Z]\\s*(?:,|và)\\s*${apex}[A-Z][^.;]{0,20}đôi một vuông góc`));
    if (om && base.length === 3) {
      const s = baseSide ?? 1;
      pts[apex] = [0, 0, 0];
      const ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      base.forEach((b, i) => pts[b] = mul(ax[i], L(apex, b) ?? s));
      runDefs(ctx);
    } else {
      Object.assign(pts, base2D(ctx, base));
      runDefs(ctx);
      let f = footOf(ctx, apex);
      if (f && f.pending) { runDefs(ctx); f = footOf(ctx, apex); }
      if (!f || !f.p) f = { p: avg(base.map(n => pts[n])), center: true };
      if (/tứ diện đều/.test(t)) {
        const s = len(sub(pts[base[0]], pts[base[1]]));
        pts[apex] = add(f.p, [0, 0, s * Math.sqrt(2 / 3)]);
      } else {
        pts[apex] = add(f.p, [0, 0, heightFor(ctx, apex, f, extent(ctx) * 1.1)]);
      }
      if (f.mid) {
        const nm = Object.keys(pts).find(k => derived.includes(k) && len(sub(pts[k], f.p)) < 1e-9);
        if (nm) aux.push([apex, nm]);
      }
      if (f.center) {
        const nm = Object.keys(pts).find(k => derived.includes(k) && len(sub(pts[k], f.p)) < 1e-9);
        if (nm) aux.push([apex, nm]);
      }
      if (f.name && derived.includes(f.name)) aux.push([apex, f.name]);
    }
    faces.push(base);
    base.forEach((b, i) => faces.push([apex, b, base[(i + 1) % base.length]]));

  } else {
    return { error: 'Không nhận dạng được khối hình. Hãy ghi rõ, ví dụ: "hình chóp S.ABCD", "lăng trụ ABC.A\'B\'C\'", "hình lập phương ABCD.A\'B\'C\'D\'", "tứ diện ABCD".' };
  }
  return null;
}
