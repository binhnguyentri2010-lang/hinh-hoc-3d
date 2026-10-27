/* Dựng các điểm phụ đề nhắc tới: trung điểm, trọng tâm, tâm, giao điểm hai đường,
   hình chiếu vuông góc, điểm chia theo tỉ lệ, điểm tự do trên cạnh.
   Trích nguyên văn từ legacy/index.html dòng 199–269.

   Chạy lặp nhiều vòng vì các định nghĩa có thể phụ thuộc nhau: "M là trung điểm AB"
   rồi "N là trung điểm SM" — vòng đầu chưa có M thì vòng sau mới dựng được N.

   ctx: { t, pts, S, structNames, derived, aux, auxExt, frI }

   TODO Giai đoạn 1: vị trí điểm tự do trên cạnh (mảng fr bên dưới) là giá trị máy tự
   chọn → gắn nhãn 'tự do', cho kéo được, và mọi đáp án phụ thuộc nó phải kèm chú thích
   "ứng với vị trí đang chọn". */

import { sub, add, mul, mid, avg, circum, incenter, projPlane, projLine, normal, closest } from '../core/vec.js';
import { toks } from '../parse/normalize.js';
import { KIND } from '../solve/trust.js';

export function refPoint(ctx, kind, letters) {
  const { pts, S } = ctx;
  const ns = toks(letters);
  if (!ns.every(n => pts[n])) return null;
  if (/trung điểm/.test(kind) && ns.length === 2) return mid(pts[ns[0]], pts[ns[1]]);
  if (/tâm|giao điểm|trọng tâm/.test(kind)) {
    const use = ns.length >= 3 ? ns : S.base;
    if (!use.length) return null;
    if (/ngoại tiếp/.test(kind) && use.length === 3) return circum(...use.map(n => pts[n]));
    if (/nội tiếp/.test(kind) && use.length === 3) return incenter(...use.map(n => pts[n]));
    if (/giao điểm/.test(kind) && use.length === 4 && !/trọng tâm/.test(kind)) {
      const [a, b, c, d] = use.map(n => pts[n]);
      const [x, y] = closest(a, c, b, d);
      return mid(x, y);
    }
    return avg(use.map(n => pts[n]));
  }
  if (ns.length === 1) return pts[ns[0]];
  return null;
}

export function planeOf(ctx, str) {
  if (!str) return null;
  if (/đáy/.test(str)) return ctx.S.base;
  const ns = toks(str);
  if (ns.length >= 3) return ns;
  /* Tên đặt riêng: "(α)", "(P)". Tra bảng do build/planes.js dựng.
     Không tra ra thì trả null — câu hỏi đó sẽ được bỏ qua thay vì tính bừa. */
  const ten = (String(str).match(/[A-ZΑ-Ωα-ω]'?/) || [])[0];
  if (ten && ctx.planeAlias && ctx.planeAlias[ten]) return ctx.planeAlias[ten];
  return null;
}

/* Vòng ngoài: sau khi đã dựng hết những điểm xác định được, mới đặt các điểm "tự do"
   (M bất kỳ trên cạnh AB) vào một vị trí đại diện. Làm sau cùng để không chặn mất một
   định nghĩa chính xác hơn có thể suy ra ở vòng trong. */
export function runDefs(ctx) {
  const { t, pts, structNames, derived } = ctx;
  for (let o = 0; o < 6; o++) {
    runDefs0(ctx);
    let any = false;
    const fr = [.4, .6, .35, .55, .45];
    const put = (n, p, q) => {
      if (!pts[n] && !structNames.has(n) && pts[p] && pts[q]) {
        /* Đề chỉ nói "M nằm trên cạnh AB" mà không cho tỉ lệ → vị trí là TỰ DO thật sự,
           không phải thiếu dữ kiện. Vẫn đặt một vị trí đại diện để vẽ; đáp án nào phụ thuộc
           vị trí này sẽ được ghi chú "ứng với vị trí đang chọn" thay vì bị chặn. */
        const u = ctx.guess(`vị-trí-${n}`, fr[ctx.frI++ % fr.length], {
          kind: KIND.FREE, mode: 'ratio',
          label: `vị trí điểm ${n} trên ${p}${q}`,
          why: `đề chỉ nói ${n} nằm trên ${p}${q}, không cho tỉ lệ chia`,
          diem: n, canh: [p, q] });     // để giao diện cho kéo thẳng điểm này trên hình
        pts[n] = add(pts[p], mul(sub(pts[q], pts[p]), u));
        derived.push(n);
        any = true;
      }
    };
    for (const m of t.matchAll(/((?:[A-Z]'?\s*(?:,|và)\s*)*[A-Z]'?)\s*(?:lần lượt\s*)?(?:là\s*)?(?:(?:ba|hai|các|một)\s*)?(?:điểm\s*)?(?:(?:di động|bất kì|bất kỳ|tùy ý)\s*)?(?:lần lượt\s*)?(?:nằm\s*)?(?:trên|thuộc)\s*(?:(?:ba|hai|các)\s*)?(?:cạnh|đoạn(?:\s*thẳng)?)\s*((?:[A-Z]'?[A-Z]'?\s*(?:,|và)\s*)*[A-Z]'?[A-Z]'?)(?![A-Z'])/g)) {
      const ns = toks(m[1]).filter(n => !structNames.has(n)), segs = m[2].split(/\s*(?:,|và)\s*/).map(toks);
      ns.forEach((n, i) => {
        const sg = segs[Math.min(i, segs.length - 1)];
        if (sg && sg.length === 2) put(n, sg[0], sg[1]);
      });
    }
    for (const m of t.matchAll(/trên\s*(?:cạnh|đoạn(?:\s*thẳng)?)\s*([A-Z]'?)([A-Z]'?)\s*(?:lấy|có)\s*(?:điểm\s*)?([A-Z]'?)/g)) {
      put(m[3], m[1], m[2]); // lượt xử lý tỉ lệ đã chạy trước, đây chỉ lấp chỗ còn trống
    }
    if (!any) break;
  }
}

/* Vòng trong: các định nghĩa xác định hoàn toàn. Lặp tới khi không dựng thêm được gì. */
export function runDefs0(ctx) {
  const { t, pts, S, structNames, derived, aux, auxExt } = ctx;
  let changed = true, guard = 0;
  const setP = (n, v) => {
    if (!pts[n] && v && v.every(Number.isFinite)) { pts[n] = v; derived.push(n); changed = true; }
  };
  const ok = ns => ns.every(n => pts[n]);

  while (changed && guard++ < 8) {
    changed = false;

    /* "M, N lần lượt là trung điểm của AB, CD" */
    for (const m of t.matchAll(/((?:[A-Z]'?\s*(?:,|và)\s*)*[A-Z]'?)\s*(?:lần lượt\s*)?là\s*(?:các\s*)?trung điểm\s*(?:của\s*)?(?:các\s*)?(?:cạnh\s*|đoạn(?:\s*thẳng)?\s*)?((?:[A-Z]'?[A-Z]'?\s*(?:,|và)\s*)*[A-Z]'?[A-Z]'?)(?![A-Z'])/g)) {
      const ns = toks(m[1]).filter(n => !structNames.has(n)), segs = m[2].split(/\s*(?:,|và)\s*/).map(toks);
      ns.forEach((n, i) => {
        const sg = segs[Math.min(i, segs.length - 1)];
        if (sg && sg.length === 2 && ok(sg)) setP(n, mid(pts[sg[0]], pts[sg[1]]));
      });
    }

    /* "trung điểm M của AB" */
    for (const m of t.matchAll(/trung điểm\s*([A-Z]'?)\s*(?:của\s*)?(?:cạnh\s*|đoạn(?:\s*thẳng)?\s*)?([A-Z]'?)([A-Z]'?)(?![A-Z'])/g))
      if (!structNames.has(m[1]) && ok([m[2], m[3]])) setP(m[1], mid(pts[m[2]], pts[m[3]]));

    /* trọng tâm */
    for (const m of t.matchAll(/([A-Z]'?)\s*là\s*trọng tâm\s*(?:của\s*)?(?:tam giác|tứ diện)?\s*((?:[A-Z]'?){3,4})/g))
      setP(m[1], refPoint(ctx, 'trọng tâm', m[2]));
    for (const m of t.matchAll(/trọng tâm\s*([A-Z]'?)\s*(?:của\s*)?(?:tam giác|tứ diện)\s*((?:[A-Z]'?){3,4})/g))
      setP(m[1], refPoint(ctx, 'trọng tâm', m[2]));

    /* "O là tâm …" / "O là giao điểm của AC và BD" */
    for (const m of t.matchAll(/([A-Z]'?)\s*là\s*(tâm|giao điểm)\s*([^.;,]*)/g)) {
      const rest = m[3], lm = rest.match(/^(?:của\s*)?(?:hai\s*)?(?:đường\s*(?:thẳng|chéo)\s*)?([A-Z]'?)([A-Z]'?)\s*(?:và|với)\s*([A-Z]'?)([A-Z]'?)/);
      if (lm) {
        if (ok([lm[1], lm[2], lm[3], lm[4]])) {
          const [x, y] = closest(pts[lm[1]], pts[lm[2]], pts[lm[3]], pts[lm[4]]);
          setP(m[1], mid(x, y));
        }
      } else setP(m[1], refPoint(ctx, m[2] + ' ' + rest, rest.match(/(?:[A-Z]'?){3,}/)?.[0] || ''));
    }

    /* "hình bình hành ABCD tâm O" */
    for (const m of t.matchAll(/(?:hình vuông|hình chữ nhật|hình thoi|hình bình hành|đáy|tâm)\s*(?:[A-Z]{3,4}\s*)?(?:có\s*)?tâm\s*(?:là\s*)?([A-Z])(?![A-Z'])/g))
      setP(m[1], refPoint(ctx, 'tâm', ''));

    /* "AC cắt BD tại O" */
    for (const m of t.matchAll(/([A-Z]'?)([A-Z]'?)\s*(?:cắt|∩)\s*([A-Z]'?)([A-Z]'?)\s*tại\s*([A-Z]'?)/g))
      if (ok([m[1], m[2], m[3], m[4]])) {
        const [x, y] = closest(pts[m[1]], pts[m[2]], pts[m[3]], pts[m[4]]);
        setP(m[5], mid(x, y));
      }

    /* hình chiếu vuông góc lên mặt phẳng hoặc lên đường thẳng */
    const proj = (H, X, target) => {
      if (!pts[X]) return;
      const pl = /^\(|đáy/.test(target) ? planeOf(ctx, target) : null;
      if (pl) {
        if (ok(pl)) {
          const [a, b, c] = pl.map(n => pts[n]);
          setP(H, projPlane(pts[X], a, normal(a, b, c)));
          aux.push([X, H]);
        }
      } else {
        const ln = toks(target);
        if (ln.length === 2 && ok(ln)) {
          setP(H, projLine(pts[X], pts[ln[0]], sub(pts[ln[1]], pts[ln[0]])));
          aux.push([X, H]);
          if (!ok([H])) return;
          auxExt.push([H, ln[0], ln[1]]);
        }
      }
    };
    for (const m of t.matchAll(/([A-Z]'?)\s*là\s*hình chiếu\s*(?:vuông góc\s*)?(?:của\s*)?(?:điểm\s*)?([A-Z]'?)\s*(?:lên|trên|xuống)\s*(?:đường thẳng\s*|cạnh\s*|mặt phẳng\s*)?(\(\s*(?:[A-Z]'?)+\s*\)|(?:mặt\s*)?đáy|[A-Z]'?[A-Z]'?)/g))
      proj(m[1], m[2], m[3]);
    for (const m of t.matchAll(/([A-Z]'?)([A-Z]'?)\s*(?:⊥|vuông góc(?:\s*với)?)\s*(\(\s*(?:[A-Z]'?)+\s*\)|[A-Z]'?[A-Z]'?)\s*(?:\(\s*\2\s*(?:∈|thuộc)|tại\s*\2)/g))
      if (pts[m[1]] && !pts[m[2]]) proj(m[2], m[1], m[3]);

    /* điểm chia theo tỉ lệ: "AN = 2NC", "SM = 2MB" */
    for (const m of t.matchAll(/(?<![A-Z'])([A-Z]'?)([A-Z]'?)\s*=\s*(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)?\s*([A-Z]'?)([A-Z]'?)(?![A-Z'])/g)) {
      const all = [m[1], m[2], m[4], m[5]],
            unk = [...new Set(all.filter(n => !pts[n]))],
            kn = [...new Set(all.filter(n => pts[n]))];
      if (unk.length !== 1 || kn.length !== 2) continue;
      const X = unk[0], [Y, Z] = kn,
            k = m[3] ? m[3].split('/').map(v => parseFloat(v.replace(',', '.'))).reduce((a, b) => a / b) : 1;
      const coef = (p, q) => {
        const st = new Set([p, q]);
        if (st.has(Y) && st.has(X)) return [1, 0];
        if (st.has(X) && st.has(Z)) return [-1, 1];
        if (st.has(Y) && st.has(Z)) return [0, 1];
        return null;
      };
      const c1 = coef(m[1], m[2]), c2 = coef(m[4], m[5]);
      if (!c1 || !c2) continue;
      const den = c1[0] - k * c2[0];
      if (Math.abs(den) < 1e-9) continue;
      const u = (k * c2[1] - c1[1]) / den;
      setP(X, add(pts[Y], mul(sub(pts[Z], pts[Y]), u)));
    }
  }
}
