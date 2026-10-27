/* Nhận diện và trả lời các câu hỏi trong đề: thể tích, khoảng cách, góc, diện tích,
   độ dài, giao tuyến, giao điểm.
   Trích nguyên văn từ legacy/index.html dòng 364–429 và 510–547.

   THỨ TỰ CÁC KHỐI Ở ĐÂY LÀ MỘT PHẦN CỦA HỢP ĐỒNG. Bộ test so mảng kết quả theo chỉ số,
   nên đảo thứ tự hai vòng lặp là đỏ ngay — kể cả khi từng đáp án vẫn đúng.

   TODO Giai đoạn 1 — ba lỗi logic đã biết trong file này:
     1. Vòng "giao tuyến" quét TOÀN BỘ đề tìm mọi cặp (ABC) và (DEF) chỉ vì từ "giao tuyến"
        xuất hiện ở đâu đó. Đề vừa hỏi góc giữa (SBC) và (ABCD) vừa hỏi giao tuyến sẽ sinh
        ra một giao tuyến ma. Phải khoanh vùng theo mệnh đề.
     2. Chỉ câu hỏi góc mới lọc mệnh đề cho sẵn bằng given(). Khoảng cách, diện tích, độ dài
        thì chưa — "khoảng cách từ A đến (SBC) bằng a" đang bị hiểu thành câu hỏi.
     3. Chỉ thể tích khử trùng lặp. Các loại khác nhắc lại hai lần là ra hai dòng giống nhau. */

import { sub, add, mul, dot, cross, len, normal, projPlane, projLine, closest, polyArea } from '../core/vec.js';
import { toks, PLANE_TOK } from '../parse/normalize.js';
import { scopeOf } from '../parse/clauses.js';
import { fmt as fmtRaw, fmtAng } from '../core/format.js';
import { planeOf } from '../build/points.js';
import { dungThietDien, matsCuaKhoi } from '../build/planes.js';
import { tuBaDiem, chiaTheTich, dienTichThietDien } from './section.js';
import { makeIncidence } from './incidence.js';
import { runProve } from './prove.js';

export function runQueries(ctx) {
  const { t, pts, S, faces, aux, planesHi, feet, W, K, L } = ctx;
  const R = [], edges = new Set();
  faces.forEach(f => f.forEach((v, i) => edges.add(K(v, f[(i + 1) % f.length]))));
  ctx.edges = edges;

  /* Đơn vị hiển thị: 'a' cho đề THPT thông thường, hoặc cm/m khi đề dùng số đo thật. */
  const fmtU = (v, pow) => fmtRaw(v, pow, ctx.unit || 'a');

  const has = ns => ns.every(n => pts[n]);

  /* Mệnh đề CHO SẴN chứ không phải câu hỏi: "…, biết khoảng cách từ A đến (SBC) bằng a".
     Bản cũ chỉ lọc cho câu hỏi góc, nên các loại khác vẫn hiểu nhầm dữ kiện thành câu hỏi
     rồi "trả lời" lại chính con số đề vừa cho.
     Nhận cả "bằng a" chứ không riêng "bằng 5" — độ dài trong đề thường viết theo a. */
  const given = m => /^\s*(?:bằng|=|là)\s*(?:\d|a(?![a-zà-ỹ]))/.test(t.slice(m.index + m[0].length));

  /* Đề nhắc lại một cụm là bản cũ ra hai dòng kết quả giống hệt nhau. Chặn từ đầu, trước cả
     khi vẽ thêm lớp phủ, để không tô chồng hai lần lên cùng một mặt phẳng. */
  const trung = label => R.some(x => x.q === label);
  const addLine = (p, q) => { if (!edges.has(K(p, q))) aux.push([p, q]); };
  /* Nhận cả "(SAC)" lẫn tên đặt riêng "(α)", "(P)". Tên chưa định nghĩa thì planeOf()
     trả null và câu hỏi được bỏ qua — không tính bừa. */
  const planeRe = `(\\(\\s*(?:${PLANE_TOK})\\s*\\)|(?:mặt\\s*)?đáy)`;
  const lineRe = "([A-Z]'?[A-Z]'?)(?![A-Z'(])";
  const addFoot = (p, from) => { feet.push(p); if (from) aux.push([from, p]); };

  const volMain = () => {
    const bp = S.base.map(n => pts[n]), n = normal(...bp.slice(0, 3)), A = polyArea(bp);
    if (S.kind === 'prism') return A * Math.abs(dot(n, sub(pts[S.top[0]], bp[0]))) / len(n);
    return A * Math.abs(dot(n, sub(pts[S.apex], bp[0]))) / len(n) / 3;
  };

  /* ---------- thể tích ---------- */
  for (const m of t.matchAll(/thể tích\s*(?:của\s*)?(?:khối\s*)?(?:đa diện|chóp|tứ diện|lăng trụ|hộp(?:\s*chữ nhật)?|lập phương)?\s*((?:[A-Z]'?)(?:\s*\.\s*)?(?:[A-Z]'?){2,})?/g)) {
    let v, label = 'Thể tích ' + (m[1] ? m[1].replace(/\s/g, '') : 'khối ' + S.label.replace(/^\S/, c => c.toLowerCase()));
    if (m[1]) {
      const [l, r] = m[1].split('.').map(toks);
      if (r && l.length === 1 && has([...l, ...r]) && r.length >= 3) {
        const bp = r.map(n => pts[n]), n = normal(...bp.slice(0, 3));
        v = polyArea(bp) * Math.abs(dot(n, sub(pts[l[0]], bp[0]))) / len(n) / 3;
      } else if (!r && l.length === 4 && has(l)) {
        const [a, b, c, d] = l.map(n => pts[n]);
        v = Math.abs(dot(sub(b, a), cross(sub(c, a), sub(d, a)))) / 6;
      } else v = volMain();
    } else v = volMain();
    if (!R.some(x => x.q === label)) R.push({ q: label, a: 'V = ' + fmtU(v, 3) });
  }

  /* ---------- khoảng cách từ điểm đến mặt phẳng ---------- */
  for (const m of t.matchAll(new RegExp(`khoảng cách\\s*từ\\s*(?:điểm\\s*)?([A-Z]'?)\\s*(?:đến|tới)\\s*(?:mặt phẳng\\s*)?${planeRe}`, 'g'))) {
    if (given(m)) continue;
    const pl = planeOf(ctx, m[2]);
    if (!pts[m[1]] || !pl || !has(pl)) continue;
    const label = `d(${m[1]}, (${pl.join('')}))`;
    if (trung(label)) continue;
    const [a, b, c] = pl.map(n => pts[n]), n = normal(a, b, c), F = projPlane(pts[m[1]], a, n);
    planesHi.push(pl); addFoot(F, m[1]);
    R.push({ q: label, a: fmtU(len(sub(pts[m[1]], F))) });
  }

  /* ---------- khoảng cách từ điểm đến đường thẳng ---------- */
  for (const m of t.matchAll(new RegExp(`khoảng cách\\s*từ\\s*(?:điểm\\s*)?([A-Z]'?)\\s*(?:đến|tới)\\s*(?:đường thẳng\\s*|cạnh\\s*)?${lineRe}`, 'g'))) {
    if (given(m)) continue;
    const ln = toks(m[2]);
    if (ln.length !== 2 || !has([m[1], ...ln])) continue;
    const label = `d(${m[1]}, ${m[2]})`;
    if (trung(label)) continue;
    const F = projLine(pts[m[1]], pts[ln[0]], sub(pts[ln[1]], pts[ln[0]]));
    addFoot(F, m[1]); addLine(...ln);
    R.push({ q: label, a: fmtU(len(sub(pts[m[1]], F))) });
  }

  /* ---------- khoảng cách giữa hai đường chéo nhau ---------- */
  for (const m of t.matchAll(new RegExp(`khoảng cách\\s*giữa\\s*(?:hai\\s*)?(?:đường thẳng\\s*)?([A-Z]'?[A-Z]'?)\\s*(?:và|với)\\s*(?:đường thẳng\\s*)?${lineRe}`, 'g'))) {
    if (given(m)) continue;
    const l1 = toks(m[1]), l2 = toks(m[2]);
    if (l1.length !== 2 || l2.length !== 2 || !has([...l1, ...l2])) continue;
    const label = `d(${m[1]}, ${m[2]})`;
    if (trung(label)) continue;
    const [x, y] = closest(pts[l1[0]], pts[l1[1]], pts[l2[0]], pts[l2[1]]);
    addLine(...l1); addLine(...l2); feet.push(x, y); aux.push([x, y]);
    R.push({ q: label, a: fmtU(len(sub(x, y))) });
  }

  /* ---------- góc giữa đường thẳng và mặt phẳng ---------- */
  for (const m of t.matchAll(new RegExp(`góc\\s*(?:giữa|tạo bởi)?\\s*(?:đường thẳng\\s*|cạnh\\s*)?([A-Z]'?[A-Z]'?)\\s*(?:và|với)\\s*(?:mặt phẳng\\s*)?${planeRe}`, 'g'))) {
    if (given(m)) continue;
    const ln = toks(m[1]), pl = planeOf(ctx, m[2]);
    if (ln.length !== 2 || !pl || !has([...ln, ...pl])) continue;
    const label = `Góc (${m[1]}, (${pl.join('')}))`;
    if (trung(label)) continue;
    const [a, b, c] = pl.map(n => pts[n]), n = normal(a, b, c), d = sub(pts[ln[1]], pts[ln[0]]);
    const ang = Math.asin(Math.min(1, Math.abs(dot(d, n)) / (len(d) * len(n))));
    planesHi.push(pl); addLine(...ln);
    const p0 = projPlane(pts[ln[0]], a, n), p1 = projPlane(pts[ln[1]], a, n);
    if (len(sub(p0, pts[ln[0]])) > 1e-9) { feet.push(p0); aux.push([pts[ln[0]], p0]); }
    if (len(sub(p1, pts[ln[1]])) > 1e-9) { feet.push(p1); aux.push([pts[ln[1]], p1]); }
    aux.push([p0, p1]);
    R.push({ q: label, a: fmtAng(ang) });
  }

  /* ---------- góc giữa hai mặt phẳng ---------- */
  for (const m of t.matchAll(new RegExp(`góc\\s*giữa\\s*(?:hai\\s*)?(?:mặt phẳng\\s*|mặt bên\\s*)?${planeRe}\\s*(?:và|với)\\s*(?:mặt phẳng\\s*)?${planeRe}`, 'g'))) {
    if (given(m)) continue;
    const p1 = planeOf(ctx, m[1]), p2 = planeOf(ctx, m[2]);
    if (!p1 || !p2 || !has([...p1, ...p2])) continue;
    const label = `Góc ((${p1.join('')}), (${p2.join('')}))`;
    if (trung(label)) continue;
    const n1 = normal(...p1.slice(0, 3).map(n => pts[n])), n2 = normal(...p2.slice(0, 3).map(n => pts[n]));
    planesHi.push(p1, p2);
    R.push({
      q: label,
      a: fmtAng(Math.acos(Math.min(1, Math.abs(dot(n1, n2)) / (len(n1) * len(n2)))))
    });
  }

  /* ---------- góc giữa hai đường thẳng ---------- */
  for (const m of t.matchAll(new RegExp(`góc\\s*giữa\\s*(?:hai\\s*)?(?:đường thẳng\\s*)?([A-Z]'?[A-Z]'?)\\s*(?:và|với)\\s*(?:đường thẳng\\s*)?${lineRe}`, 'g'))) {
    if (given(m)) continue;
    const l1 = toks(m[1]), l2 = toks(m[2]);
    if (l1.length !== 2 || l2.length !== 2 || !has([...l1, ...l2])) continue;
    const label = `Góc (${m[1]}, ${m[2]})`;
    if (trung(label)) continue;
    const d1 = sub(pts[l1[1]], pts[l1[0]]), d2 = sub(pts[l2[1]], pts[l2[0]]);
    addLine(...l1); addLine(...l2);
    R.push({
      q: label,
      a: fmtAng(Math.acos(Math.min(1, Math.abs(dot(d1, d2)) / (len(d1) * len(d2)))))
    });
  }

  /* ---------- diện tích ---------- */
  for (const m of t.matchAll(/diện tích\s*(?:của\s*)?(?:tam giác|tứ giác|hình|thiết diện|mặt)?[^A-Z.;]*?((?:[A-Z]'?){3,})/g)) {
    if (given(m)) continue;
    const ns = toks(m[1]);
    if (!has(ns)) continue;
    const label = `Diện tích ${m[1]}`;
    if (trung(label)) continue;
    planesHi.push(ns);
    R.push({ q: label, a: 'S = ' + fmtU(polyArea(ns.map(n => pts[n])), 2) });
  }

  /* ---------- độ dài ---------- */
  for (const m of t.matchAll(/độ dài\s*(?:của\s*)?(?:đoạn\s*(?:thẳng\s*)?|cạnh\s*)?([A-Z]'?[A-Z]'?)(?![A-Z'])/g)) {
    if (given(m)) continue;
    const ln = toks(m[1]);
    if (ln.length !== 2 || !has(ln)) continue;
    const label = `Độ dài ${m[1]}`;
    if (trung(label)) continue;
    addLine(...ln);
    R.push({ q: label, a: fmtU(len(sub(pts[ln[0]], pts[ln[1]]))) });
  }

  /* ---------- thiết diện ---------- */

  /* Đáp án chia làm ba câu riêng — hình dạng thiết diện, diện tích, tỉ số thể tích — chứ
     không gộp một cục. Vì phép thử nhiễu loạn chặn theo TỪNG CÂU: đề thiếu chiều cao thì
     diện tích bị chặn, nhưng "thiết diện là tứ giác MNPQ" vẫn đúng và vẫn phải trả lời. */
  const TEN_DA_GIAC = { 3: 'tam giác', 4: 'tứ giác', 5: 'ngũ giác', 6: 'lục giác', 7: 'thất giác', 8: 'bát giác' };
  const ucln = (a, b) => b ? ucln(b, a % b) : a;
  const phanSo = x => {
    if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
    for (let q = 2; q <= 24; q++) {
      const p = x * q;
      if (Math.abs(p - Math.round(p)) < 1e-9) {
        const P = Math.round(p), g = ucln(Math.abs(P), q) || 1;
        return `${P / g}/${q / g}`;
      }
    }
    return String(+x.toFixed(3));
  };
  const mpRe = new RegExp(`\\(\\s*(${PLANE_TOK})\\s*\\)`, 'g');

  for (const cl of scopeOf(t, 'thiết-diện'))
    for (const m of cl.matchAll(mpRe)) {
      const raw = m[1], label = `Thiết diện cắt bởi (${raw})`;
      if (trung(label)) continue;

      let td = ctx.thietDien && ctx.thietDien[raw];
      if (!td) {
        /* Mặt phẳng nêu thẳng trong câu hỏi, ví dụ "thiết diện cắt bởi (MNP)" */
        const ns = planeOf(ctx, raw);
        if (!ns || !has(ns)) continue;
        const pl = tuBaDiem(pts[ns[0]], pts[ns[1]], pts[ns[2]]);
        if (!pl) continue;
        td = dungThietDien(ctx, raw, { ...pl, moTa: `qua ${ns.join(', ')}` });
        if (!td) continue;
        ctx.thietDien[raw] = td;
        if (!ctx.planeAlias[raw]) ctx.planeAlias[raw] = td.names;
      }

      const n = td.names.length;
      const ov = { planes: [td.names], segs: [], names: {} };
      td.dinh.forEach((p, i) => ov.segs.push([p, td.dinh[(i + 1) % n], 'inter']));

      const buoc = [];
      if (td.moTa) buoc.push(`(${raw}) là mặt phẳng ${td.moTa}`);
      for (const x of td.tren) if (x.canh)
        buoc.push(`${x.ten} nằm trên cạnh ${x.canh}, ${x.canh[0]}${x.ten}/${x.canh} = ${phanSo(x.ti)}`);
      for (const x of td.theoMat)
        buoc.push(`(${raw}) ∩ (${x.mat.join('')}) = ${tenDoan(x.doan, td)}`);

      R.push({
        q: label,
        a: `Thiết diện là ${TEN_DA_GIAC[n] || n + ' cạnh'} ${td.names.join('')}`,
        steps: buoc, ov, autoNames: td.moi,
      });

      if (/diện tích/.test(cl) || /diện tích\s*(?:của\s*)?thiết diện/.test(t))
        R.push({ q: `Diện tích thiết diện ${td.names.join('')}`,
                 a: 'S = ' + fmtU(dienTichThietDien(td.dinh), 2), autoNames: td.moi });

      if (/tỉ số|tỷ số|chia\s*(?:khối\s*\S+\s*)?thành hai phần/.test(t)) {
        const [v1, v2] = chiaTheTich(matsCuaKhoi(ctx), td.diem, td.phap);
        R.push({ q: 'Tỉ số thể tích hai phần',
                 a: v2 > 1e-12 ? `V₁/V₂ = ${phanSo(v1 / v2)}  (≈ ${(v1 / v2).toFixed(4)})`
                               : 'Mặt phẳng không chia được khối thành hai phần',
                 autoNames: td.moi });
      }
    }

  /* Tên của đoạn giao trên một mặt, theo tên đỉnh thiết diện nếu trùng. */
  function tenDoan(doan, td) {
    return doan.map(p => {
      const i = td.dinh.findIndex(q => len(sub(p, q)) < 1e-6 * Math.max(1, len(q)));
      if (i >= 0) return td.names[i];
      const co = Object.keys(pts).find(k => len(sub(pts[k], p)) < 1e-6);
      return co || '?';
    }).join('');
  }

  /* ---------- giao tuyến / giao điểm ---------- */
  const inc = makeIncidence(ctx);
  const { E, plInfo, findName, lineCands, meet, newName, interPlanes, usedNames } = inc;

  /* Chỉ quét các mệnh đề thật sự đang hỏi giao tuyến — xem src/parse/clauses.js để biết
     vì sao không thể quét cả đề, và cũng không thể chỉ quét mệnh đề chứa chữ "giao tuyến". */
  const capMatPhang = new RegExp(
    `\\(\\s*(${PLANE_TOK})\\s*\\)\\s*(?:và|,|với)\\s*\\(\\s*(${PLANE_TOK})\\s*\\)`, 'g');

  for (const cl of scopeOf(t, 'giao-tuyến'))
    for (const m of cl.matchAll(capMatPhang)) {
      const n1 = planeOf(ctx, m[1]), n2 = planeOf(ctx, m[2]), label = `Giao tuyến (${m[1]}) và (${m[2]})`;
      if (R.some(x => x.q === label)) continue;
      if (!n1 || !n2) continue;                       // tên mặt phẳng chưa định nghĩa
      if (!has(n1) || !has(n2)) {
        R.push({ q: label, a: 'Chưa xác định được: ' + [...n1, ...n2].filter(n => !pts[n]).join(', ') });
        continue;
      }
      const r = interPlanes(n1, n2);
      R.push({ q: label, a: r.ans, steps: r.steps, ov: r.ov });
    }

  const giaoDiemRe = new RegExp(
    `giao điểm\\s*(?:của\\s*)?(?:đường thẳng\\s*)?([A-Z]'?)([A-Z]'?)\\s*(?:và|với)\\s*\\(\\s*(${PLANE_TOK})\\s*\\)`, 'g');

  for (const m of t.matchAll(giaoDiemRe)) {
    const ln = [m[1], m[2]], lnS = m[1] + m[2], ns = planeOf(ctx, m[3]),
          A1 = `(${m[3]})`, label = `Giao điểm ${lnS} và ${A1}`;
    if (!ns) continue;                                // tên mặt phẳng chưa định nghĩa
    if (!has([...ln, ...ns])) {
      R.push({ q: label, a: 'Chưa xác định được: ' + [...ln, ...ns].filter(n => !pts[n]).join(', ') });
      continue;
    }
    const P = plInfo(ns), X = pts[ln[0]], Y = pts[ln[1]], d = sub(Y, X), dn = dot(d, P.n),
          ov = { planes: [ns], segs: [], names: {} };
    if (Math.abs(dn) < 1e-9 * len(d)) {
      R.push({ q: label, a: P.on(X) ? `${lnS} nằm trong ${A1}` : `${lnS} ∥ ${A1}`, ov });
      continue;
    }
    const x = add(X, mul(d, dot(P.n, sub(P.a, X)) / dn)), steps = [];
    let best = null;
    for (const b of lineCands(P)) {
      const y = meet(X, Y, pts[b.p], pts[b.q]);
      if (y && len(sub(y, x)) < E * 10 && (!best || b.sc > best.sc)) best = b;
    }
    let name = findName(x);
    if (best) {
      name = name || newName();
      const l2 = best.p + best.q;
      steps.push(`${lnS} và ${l2} cùng nằm trong một mặt phẳng, ${l2} ⊂ ${A1}`, `${name} = ${lnS} ∩ ${l2}`);
      ov.segs.push([pts[best.p], x], [pts[best.q], x]);
    } else {
      const zs = Object.keys(pts).filter(k => len(cross(d, sub(pts[k], X))) > E * inc.Usc)
                  .sort((u, v) => (ctx.structNames.has(v) ? 1 : 0) - (ctx.structNames.has(u) ? 1 : 0));
      for (const Z of zs) {
        const snap = new Set(usedNames), auxNames = [...ln, Z], r = interPlanes(auxNames, ns);
        if (r.common.length < 2 || !meet(X, Y, r.common[0].pos, r.common[1].pos)) {
          usedNames.clear(); snap.forEach(v => usedNames.add(v));
          continue;
        }
        const g = r.common[0].name + r.common[1].name, A2 = `(${auxNames.join('')})`;
        name = name || newName();
        steps.push(`Chọn mặt phẳng phụ ${A2} chứa ${lnS}`, ...r.steps,
                   `⇒ ${A2} ∩ ${A1} = ${g}`,
                   `Trong ${A2}: ${name} = ${lnS} ∩ ${g}, mà ${g} ⊂ ${A1}`);
        Object.assign(ov.names, r.ov.names);
        ov.segs.push(...r.ov.segs);
        ov.planes.push(auxNames);
        break;
      }
      name = name || newName();
    }
    if (!findName(x)) ov.names[name] = x;
    ov.segs.push([X, x], [Y, x]);
    R.push({ q: label, a: `${lnS} ∩ ${A1} = ${name}`, steps, ov });
  }

  /* ---------- chứng minh ---------- */
  runProve(ctx, R, inc, trung);

  const unresolved = [...new Set([...t.matchAll(/(?:gọi|lấy|cho)\s*(?:điểm\s*)?([A-Z]'?)(?![A-Z'])/g)].map(x => x[1]))]
                       .filter(n => !pts[n]);
  if (unresolved.length) W.push('Chưa xác định được điểm: ' + unresolved.join(', '));

  return { R, edges };
}
