/* Tìm giao tuyến hai mặt phẳng và giao điểm đường–mặt, kèm các bước lập luận kiểu SGK.
   Trích nguyên văn từ legacy/index.html dòng 430–509.

   ĐÂY LÀ PHẦN QUÝ NHẤT CỦA DỰ ÁN. Nó biết diễn đạt đúng lối sách giáo khoa:
     · "Điểm chung thứ nhất: S ∈ (SAC) và S ∈ (SBD)"
     · "I = AC ∩ BD  (AC ⊂ (SAC), BD ⊂ (SBD))"
     · "Trong (SAB), qua M kẻ đường thẳng ∥ AB, cắt SC tại J"
     · "Chọn mặt phẳng phụ (SAC) chứa SC"
   Golden test so từng chữ của những câu này. Đổi một dấu phẩy là đỏ.

   makeIncidence() phải được gọi SAU khi mọi điểm đã dựng xong, vì Usc/cen0/usedNames
   được chốt một lần tại thời điểm đó — đúng như bản gốc. */

import { sub, add, mul, dot, cross, len, avg, normal, closest } from '../core/vec.js';

export function makeIncidence(ctx) {
  const { pts, edges, K } = ctx;

  const allP = Object.values(pts);
  let Usc = 0;
  for (const a of allP) for (const b of allP) Usc = Math.max(Usc, len(sub(a, b)));
  const E = 1e-6 * Usc, cen0 = avg(allP), usedNames = new Set(Object.keys(pts));

  const newName = () => {
    for (const c of 'IJKEFHGOPQRTXYZUVW') if (!usedNames.has(c)) { usedNames.add(c); return c; }
    return '?';
  };

  /* TODO Giai đoạn 1: ns.map lấy đúng 3 tên ĐẦU TIÊN của mặt phẳng. Nếu ba điểm đó
     thẳng hàng thì pháp tuyến ≈ 0 và mọi phép chia sau đó vỡ. Phải chọn bộ ba không
     thẳng hàng. */
  const plInfo = ns => {
    const [a, b, c] = ns.map(n => pts[n]);
    const n = normal(a, b, c);
    const nn = mul(n, 1 / len(n));
    return { ns, a, n: nn, on: x => Math.abs(dot(nn, sub(x, a))) < E };
  };

  const findName = x => Object.keys(pts).find(k => len(sub(pts[k], x)) < E);

  /* Mọi đoạn thẳng nối hai điểm đã biết cùng nằm trong mặt phẳng pl.
     sc = điểm ưu tiên: là cạnh thật của khối (+2), đầu mút có tên trong tên mặt phẳng (+1 mỗi đầu). */
  function lineCands(pl, other) {
    const ns = Object.keys(pts).filter(k => pl.on(pts[k])), out = [];
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
      const p = ns[i], q = ns[j];
      if (other && other.on(pts[p]) && other.on(pts[q])) continue;
      out.push({ p, q, sc: (edges.has(K(p, q)) ? 2 : 0) + (pl.ns.includes(p) ? 1 : 0) + (pl.ns.includes(q) ? 1 : 0) });
    }
    return out;
  }

  /* Giao điểm hai đoạn thẳng, nếu chúng thực sự cắt nhau và điểm cắt không văng quá xa hình. */
  function meet(A, B, C, D) {
    const cr = cross(sub(B, A), sub(D, C));
    if (len(cr) < 1e-9 * Usc * Usc) return null;
    if (Math.abs(dot(sub(C, A), cr)) / len(cr) > E) return null;
    const [x] = closest(A, B, C, D);
    return len(sub(x, cen0)) > 4 * Usc ? null : x;
  }

  /* Kéo dài đoạn ra hai đầu để vẽ giao tuyến cho dễ nhìn. */
  const inter = (a, b) => { const d = sub(b, a); return [sub(a, mul(d, .3)), add(b, mul(d, .3)), 'inter']; };

  function interPlanes(n1, n2) {
    const A1 = `(${n1.join('')})`, A2 = `(${n2.join('')})`;
    const P1 = plInfo(n1), P2 = plInfo(n2),
          ov = { planes: [n1, n2], segs: [], names: {} },
          dir = cross(P1.n, P2.n);
    if (len(dir) < 1e-9)
      return { ans: P1.on(P2.a) ? 'Hai mặt phẳng trùng nhau' : 'Hai mặt phẳng song song', steps: [], ov, common: [] };

    const common = [], steps = [];
    const addC = (name, pos, why) => {
      if (common.length < 2 && !common.some(c => len(sub(c.pos, pos)) < E)) common.push({ name, pos, why });
    };

    /* Điểm chung hiển nhiên: điểm có tên trong cả hai mặt phẳng, hoặc nằm trên một
       đoạn thuộc mặt phẳng kia. */
    for (const k of [...new Set([...n1, ...n2])]) {
      if (!(P1.on(pts[k]) && P2.on(pts[k]))) continue;
      let why = `${k} ∈ ${A1} và ${k} ∈ ${A2}`;
      if (!(n1.includes(k) && n2.includes(k))) {
        const [PP, AA, nn] = n1.includes(k) ? [P2, A2, n2] : [P1, A1, n1];
        const l = lineCands(PP).find(l => l.p !== k && l.q !== k && nn.includes(l.p) && nn.includes(l.q)
                    && len(cross(sub(pts[l.q], pts[l.p]), sub(pts[k], pts[l.p]))) < E * Usc);
        if (l) why = `${k} ∈ ${n1.includes(k) ? A1 : A2} và ${k} ∈ ${l.p}${l.q} ⊂ ${AA}`;
      }
      addC(k, pts[k], why);
    }

    if (common.length < 2) {
      const c1 = lineCands(P1, P2), c2 = lineCands(P2, P1), found = [];
      for (const a of c1) for (const b of c2) {
        const x = meet(pts[a.p], pts[a.q], pts[b.p], pts[b.q]);
        if (!x) continue;
        const nm = findName(x),
              atEnd = [a.p, a.q, b.p, b.q].some(v => len(sub(pts[v], x)) < E),
              l1 = a.p + a.q, l2 = b.p + b.q;
        found.push({
          x, nm,
          sc: a.sc + b.sc + (nm ? 3 : 0) - (atEnd ? 4 : 0) - len(sub(x, cen0)) / Usc,
          why: n => `${n} = ${l1} ∩ ${l2}  (${l1} ⊂ ${A1}, ${l2} ⊂ ${A2})`,
          from: [a.p, a.q, b.p, b.q]
        });
      }

      /* Mẹo quen thuộc trong sách: qua một điểm của mặt phẳng này, kẻ đường song song
         với một đường của chính nó, rồi cắt một đường của mặt phẳng kia. */
      for (const [PA, PB, AA, BB, cB] of [[P1, P2, A1, A2, c2], [P2, P1, A2, A1, c1]]) {
        for (const X of Object.keys(pts).filter(k => PA.on(pts[k]) && !PB.on(pts[k])))
          for (const l of lineCands(PA)) {
            if (l.p === X || l.q === X) continue;
            const d = sub(pts[l.q], pts[l.p]);
            if (len(cross(d, sub(pts[X], pts[l.p]))) < E * Usc) continue;
            for (const b of cB) {
              const x = meet(pts[X], add(pts[X], d), pts[b.p], pts[b.q]);
              if (!x || len(sub(x, pts[X])) < E) continue;
              const nm = findName(x), lb = b.p + b.q;
              found.push({
                x, nm,
                sc: l.sc + b.sc - 3 + (nm ? 3 : 0) - len(sub(x, cen0)) / Usc,
                why: n => `Trong ${AA}, qua ${X} kẻ đường thẳng ∥ ${l.p}${l.q}, cắt ${lb} tại ${n}  (${lb} ⊂ ${BB})`,
                from: [X, b.p, b.q]
              });
            }
          }
      }

      found.sort((u, v) => v.sc - u.sc);
      for (const f of found) {
        if (common.length >= 2) break;
        if (common.some(c => len(sub(c.pos, f.x)) < E)) continue;
        const name = f.nm || newName();
        if (!f.nm) ov.names[name] = f.x;
        addC(name, f.x, f.why(name));
        f.from.forEach(p => ov.segs.push([pts[p], f.x]));
      }
    }

    common.forEach((c, i) => steps.push(`Điểm chung thứ ${i + 1}: ${c.why}`));

    let ans;
    if (common.length >= 2) {
      ans = `${A1} ∩ ${A2} = ${common[0].name}${common[1].name}`;
      ov.segs.push(inter(common[0].pos, common[1].pos));
    } else if (common.length === 1) {
      const c = common[0];
      let par = null;
      const pl = (l, d) => { const v = sub(pts[l.q], pts[l.p]); return len(cross(v, d)) < 1e-6 * len(v) * len(d); };
      for (const a of lineCands(P1)) {
        if (!pl(a, dir)) continue;
        const b = lineCands(P2).find(b => pl(b, dir));
        if (b) { par = [a, b]; break; }
      }
      const d = mul(dir, Usc * .6 / len(dir));
      ov.segs.push([sub(c.pos, d), add(c.pos, d), 'inter']);
      if (par) {
        const l1 = par[0].p + par[0].q, l2 = par[1].p + par[1].q;
        steps.push(`${l1} ⊂ ${A1}, ${l2} ⊂ ${A2} và ${l1} ∥ ${l2}`);
        ans = `Giao tuyến là đường thẳng d qua ${c.name} và song song với ${l1} (và ${l2})`;
      } else ans = `Giao tuyến là đường thẳng qua ${c.name}`;
    } else ans = 'Không tìm được điểm chung — có thể đề thiếu dữ kiện';

    return { ans, steps, ov, common };
  }

  return { Usc, E, cen0, usedNames, newName, plInfo, findName, lineCands, meet, inter, interPlanes };
}
