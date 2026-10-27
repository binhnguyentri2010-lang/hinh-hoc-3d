/* Mặt phẳng đặt tên riêng: (α), (P), (β) — và dựng luôn thiết diện của nó với khối.

   Đề thiết diện hầu như luôn đặt tên cho mặt phẳng cắt, rồi định nghĩa nó bằng một điều kiện
   chứ không bằng ba điểm cụ thể:
       "Gọi (α) là mặt phẳng đi qua M và song song với (SBD)."
       "(α) chứa AB và song song với SC."
       "(α) đi qua A và vuông góc với SC."

   Sau khi dựng được thiết diện, các đỉnh của nó được ĐẶT TÊN và thêm vào hình như những
   điểm bình thường. Nhờ vậy (α) trở thành một mặt phẳng "kể đủ tên đỉnh" y như (SAC), và
   mọi câu hỏi phía sau — giao tuyến với (α), khoảng cách tới (α) — chạy được ngay mà không
   phải sửa gì trong phần giải. Đây cũng đúng trình tự học sinh làm: dựng thiết diện trước,
   đặt tên các giao điểm, rồi mới dùng chúng. */

import { sub, add, mul, dot, cross, len, normal } from '../core/vec.js';
import { toks } from '../parse/normalize.js';
import { thietDien } from '../solve/section.js';

const TEN = "([A-ZΑ-Ωα-ω]'?)";
const MP = "\\(\\s*((?:[A-Z]'?){3,8})\\s*\\)";
const DT = "([A-Z]'?[A-Z]'?)(?![A-Z'])";
const D1 = "([A-Z]'?)(?![A-Z'])";
const DAU = `\\(\\s*${TEN}\\s*\\)\\s*(?:là\\s*)?(?:mặt phẳng\\s*)?`;
const QUA = `(?:đi\\s*)?qua\\s*(?:điểm\\s*)?`;
const VA = `\\s*(?:,|và)?\\s*(?:và\\s*)?`;

const DS_DIEM = "((?:[A-Z]'?\\s*(?:,|và)\\s*)*[A-Z]'?)";

const LUAT_TEN = [
  /* (α) = (MNP) */
  { re: new RegExp(`${DAU}(?:là|=)\\s*\\(\\s*((?:[A-Z]'?){3,8})\\s*\\)`, 'g'), kieu: 'ba-diem' },
  /* (α) đi qua M và song song với (SBD) */
  { re: new RegExp(`${DAU}${QUA}${D1}${VA}song song\\s*(?:với\\s*)?${MP}`, 'g'), kieu: 'qua-ss-mp' },
  /* (α) đi qua M, song song với AB và SC */
  { re: new RegExp(`${DAU}${QUA}${D1}${VA}song song\\s*(?:với\\s*)?${DT}\\s*và\\s*${DT}`, 'g'), kieu: 'qua-ss-2dt' },
  /* (α) chứa AB và song song với CD */
  { re: new RegExp(`${DAU}chứa\\s*${DT}${VA}song song\\s*(?:với\\s*)?${DT}`, 'g'), kieu: 'chua-ss' },
  /* (α) đi qua A và vuông góc với SC */
  { re: new RegExp(`${DAU}${QUA}${D1}${VA}(?:⊥|vuông góc)\\s*(?:với\\s*)?${DT}`, 'g'), kieu: 'qua-vg' },
  /* (α) đi qua M, N, P */
  { re: new RegExp(`${DAU}(?:${QUA}|chứa\\s*)(?:(?:ba|các|những)\\s*)?(?:điểm\\s*)?${DS_DIEM}(?![A-Z'])`, 'g'), kieu: 'ba-diem-qua' },
];

/* Phải chạy SAU runDefs(): các điểm trong định nghĩa cần đã được dựng xong. */
export function bindPlanes(ctx) {
  const { t, pts } = ctx;
  const alias = ctx.planeAlias = {};
  const thiet = ctx.thietDien = {};

  const P = n => pts[n];
  const co = ns => ns.every(n => pts[n]);
  const huongDT = s => { const [a, b] = toks(s); return co([a, b]) ? sub(pts[b], pts[a]) : null; };
  const donVi = v => { const l = len(v); return l < 1e-12 ? null : mul(v, 1 / l); };


  /* Đọc định nghĩa → (một điểm, pháp tuyến) */
  function docDinhNghia(kieu, m) {
    if (kieu === 'ba-diem' || kieu === 'ba-diem-qua') {
      const ns = toks(m[2]);
      if (ns.length < 3 || !co(ns)) return null;
      const n = donVi(normal(P(ns[0]), P(ns[1]), P(ns[2])));
      return n ? { diem: P(ns[0]), phap: n, ns, moTa: `qua ${ns.join(', ')}` } : null;
    }
    if (kieu === 'qua-ss-mp') {
      const M = m[2], ns = toks(m[3]);
      if (!P(M) || ns.length < 3 || !co(ns)) return null;
      const n = donVi(normal(P(ns[0]), P(ns[1]), P(ns[2])));
      return n ? { diem: P(M), phap: n, moTa: `qua ${M}, song song với (${ns.join('')})` } : null;
    }
    if (kieu === 'qua-ss-2dt') {
      const M = m[2], d1 = huongDT(m[3]), d2 = huongDT(m[4]);
      if (!P(M) || !d1 || !d2) return null;
      const n = donVi(cross(d1, d2));
      return n ? { diem: P(M), phap: n, moTa: `qua ${M}, song song với ${m[3]} và ${m[4]}` } : null;
    }
    if (kieu === 'chua-ss') {
      const [a, b] = toks(m[2]), d1 = huongDT(m[2]), d2 = huongDT(m[3]);
      if (!co([a, b]) || !d1 || !d2) return null;
      const n = donVi(cross(d1, d2));
      return n ? { diem: P(a), phap: n, moTa: `chứa ${m[2]}, song song với ${m[3]}` } : null;
    }
    if (kieu === 'qua-vg') {
      const A = m[2], d = huongDT(m[3]);
      if (!P(A) || !d) return null;
      const n = donVi(d);
      return n ? { diem: P(A), phap: n, moTa: `qua ${A}, vuông góc với ${m[3]}` } : null;
    }
    return null;
  }

  const daHieu = {};                                        // tên → mô tả định nghĩa đọc được

  for (const { re, kieu } of LUAT_TEN) {
    re.lastIndex = 0;
    for (const m of t.matchAll(re)) {
      const ten = m[1];
      if (alias[ten]) continue;
      const dn = docDinhNghia(kieu, m);
      if (!dn) continue;
      daHieu[ten] = dn.moTa;
      if (dn.ns) alias[ten] = dn.ns;                       // đã kể đủ tên đỉnh, dùng luôn
      const r = dungThietDien(ctx, ten, dn);
      if (r && !alias[ten]) alias[ten] = r.names;
      if (r) thiet[ten] = r;
    }
  }

  /* Đề đặt tên mà máy không dùng được thì phải nói, chứ đừng im lặng bỏ câu hỏi — người dùng
     sẽ tưởng app không biết làm dạng đó. Hai tình huống khác hẳn nhau, không được gộp:
     đọc không ra định nghĩa, và đọc ra rồi nhưng mặt phẳng đó không cắt khối. */
  for (const m of t.matchAll(new RegExp(`\\(\\s*${TEN}\\s*\\)`, 'g'))) {
    const ten = m[1];
    if (alias[ten] || pts[ten]) continue;
    if (ctx.W.some(w => w.includes(`(${ten})`))) continue;
    if (daHieu[ten]) {
      ctx.W.push(`Đã hiểu (${ten}) là mặt phẳng ${daHieu[ten]}, nhưng mặt phẳng đó không cắt ` +
        `khối thành thiết diện — nó chỉ chạm khối ở một điểm hoặc một cạnh. Kiểm tra lại đề.`);
    } else {
      ctx.W.push(`Chưa hiểu mặt phẳng (${ten}) là mặt phẳng nào. Hiện đọc được các dạng: ` +
        `"(${ten}) đi qua M, N, P", "(${ten}) qua M và song song với (SBD)", ` +
        `"(${ten}) chứa AB và song song với CD", "(${ten}) qua A và vuông góc với SC".`);
    }
  }
}

/* Các mặt của khối, chỉ cần toạ độ đỉnh — phần cắt không dùng tới hướng pháp tuyến. */
export function matsCuaKhoi(ctx) {
  return ctx.faces.map(f => ({ names: f, ps: f.map(n => ctx.pts[n]) }))
                  .filter(f => f.ps.every(Boolean));
}

/* Dựng thiết diện, đặt tên các đỉnh mới, trả về bản ghi để phần giải dùng lại.
   Dùng chung cho cả mặt phẳng đặt tên ở đây lẫn mặt phẳng nêu thẳng trong câu hỏi
   ("thiết diện cắt bởi (MNP)"). */
export function dungThietDien(ctx, ten, dn) {
  const mats = matsCuaKhoi(ctx);
  let scale = 1;
  for (const f of mats) for (const p of f.ps) scale = Math.max(scale, len(p));

  const td = thietDien(mats, dn.diem, dn.phap, scale);
  if (!td || td.dinh.length < 3) return null;

  const eps = 1e-6 * Math.max(1, scale);
  const truoc = new Set(Object.keys(ctx.pts));
  const names = td.dinh.map(p => tenChoDiem(ctx, p, eps));
  if (names.some(n => !n)) return null;

  return {
    ten, dinh: td.dinh, names, moTa: dn.moTa,
    moi: names.filter(n => !truoc.has(n)),      // đỉnh máy tự đặt tên
    phap: dn.phap, diem: dn.diem,
    theoMat: td.theoMat.map(x => ({ mat: x.mat.names, doan: x.doan })),
    tren: names.map((n, i) => ({ ten: n, ...namTrenCanh(ctx, td.dinh[i], eps) })),
  };
}

/* Điểm đã có tên thì dùng lại, chưa có thì đặt tên mới và thêm vào hình. */
function tenChoDiem(ctx, p, eps) {
  for (const [n, q] of Object.entries(ctx.pts)) if (len(sub(p, q)) < eps) return n;
  const n = ctx.newName ? ctx.newName() : null;
  if (!n || n === '?') return null;
  ctx.pts[n] = p;
  ctx.derived.push(n);
  return n;
}

/* Đỉnh thiết diện nằm trên cạnh nào của khối, và chia cạnh đó theo tỉ lệ bao nhiêu —
   đây chính là thứ học sinh cần để dựng lại hình trên giấy. */
function namTrenCanh(ctx, p, eps) {
  for (const f of ctx.faces) {
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length];
      const A = ctx.pts[a], B = ctx.pts[b];
      if (!A || !B) continue;
      const d = sub(B, A), L = len(d);
      if (L < eps) continue;
      const tt = dot(sub(p, A), d) / (L * L);
      if (tt < -1e-6 || tt > 1 + 1e-6) continue;
      if (len(sub(p, add(A, mul(d, tt)))) > eps * 4) continue;
      if (tt < 1e-6 || tt > 1 - 1e-6) return { canh: null };   // trùng đỉnh có sẵn
      return { canh: a + b, ti: tt };
    }
  }
  return { canh: null };
}
