/* Nét khuất: cạnh nào bị khối che, vẽ nét đứt.

   BẢN CŨ DÙNG MẸO: vẽ mỗi đoạn hai lần, lần thứ hai đặt depthFunc = GreaterDepth để chỉ
   hiện ở chỗ bị che. Mẹo này phụ thuộc thứ tự vẽ và bộ đệm chiều sâu, nên thỉnh thoảng sai —
   và quan trọng hơn, nó không cho ta biết cạnh nào khuất, nên KHÔNG XUẤT ẢNH ĐƯỢC.

   LUẬT THẬT: chóp, lăng trụ, hộp, lập phương đều là khối LỒI. Với khối lồi, một cạnh nhìn
   thấy được khi và chỉ khi có ít nhất một mặt kề quay về phía người nhìn. Và cạnh của khối
   lồi thì hoặc nhìn thấy trọn vẹn, hoặc khuất trọn vẹn — không có chuyện khuất một nửa.
   Đúng tuyệt đối, tính bằng vài phép nhân vô hướng, và dùng được cho cả màn hình lẫn ảnh xuất.

   Đường phụ (chân đường vuông góc, giao tuyến kéo dài) thì khác: chúng có thể xuyên qua khối,
   nên phải cắt thành khúc trong và khúc ngoài. Cắt đoạn thẳng theo khối lồi là giao của các
   nửa không gian — một vòng lặp đơn giản, kết quả chính xác. */

import { sub, mul, dot, cross, len, avg } from '../core/vec.js';

/* Pháp tuyến ổn định nhất của một đa giác phẳng: chọn bộ ba đỉnh cho tích có hướng lớn nhất.
   Lấy bừa ba đỉnh đầu là hỏng ngay khi chúng gần thẳng hàng. */
function normalOf(ps) {
  let best = null, bestLen = -1;
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++)
      for (let k = j + 1; k < ps.length; k++) {
        const nv = cross(sub(ps[j], ps[i]), sub(ps[k], ps[i])), l = len(nv);
        if (l > bestLen) { bestLen = l; best = nv; }
      }
  return best && bestLen > 1e-12 ? mul(best, 1 / bestLen) : [0, 0, 1];
}

/* Các mặt của khối, kèm pháp tuyến hướng RA NGOÀI.
   Hướng ra ngoài suy từ tâm khối, không dựa vào thứ tự đỉnh — thứ tự đỉnh do phần dựng hình
   sinh ra và không bảo đảm nhất quán giữa mặt đáy với các mặt bên. */
export function faceData(pts, faces) {
  const moi = faces.flat().map(n => pts[n]).filter(Boolean);
  if (!moi.length) return [];
  const tam = avg(moi);
  return faces.map(f => {
    const ps = f.map(n => pts[n]);
    if (ps.some(p => !p)) return null;
    let n = normalOf(ps);
    const c = avg(ps);
    if (dot(n, sub(c, tam)) < 0) n = mul(n, -1);
    return { names: f, ps, n, c, d: dot(n, ps[0]) };   // mặt phẳng: dot(n, x) = d
  }).filter(Boolean);
}

/* Tập cạnh nhìn thấy được. keyOf(p,q) phải cho cùng một khoá bất kể thứ tự.
   huong = hướng nhìn (từ mắt vào hình). */
export function visibleEdges(fd, huong, keyOf) {
  const vis = new Set();
  for (const f of fd) {
    if (dot(f.n, huong) >= -1e-9) continue;            // mặt quay lưng lại
    f.names.forEach((v, j) => vis.add(keyOf(v, f.names[(j + 1) % f.names.length])));
  }
  return vis;
}

/* Điểm x có bị khối che khi nhìn theo hướng `huong` không?

   Hỏi cách khác: đi từ x ngược hướng nhìn (tức về phía mắt) có xuyên qua khối không.
   Với khối lồi, tập các s > 0 mà x − s·huong nằm trong khối là giao của các nửa không gian,
   tính bằng một vòng lặp. Khác với phép thử "nằm trong khối": một điểm hoàn toàn bên ngoài
   vẫn có thể bị che nếu khối đứng chắn giữa nó và mắt. */
export function hiddenAt(x, fd, huong, eps = 1e-7) {
  let lo = eps, hi = Infinity;
  for (const f of fd) {
    const A = dot(f.n, huong), C = f.d - dot(f.n, x);
    if (Math.abs(A) < 1e-12) { if (C < -eps) return false; continue; }
    const t = -C / A;
    if (A > 0) lo = Math.max(lo, t); else hi = Math.min(hi, t);
    if (lo >= hi) return false;
  }
  return lo < hi;
}

/* Chia một đoạn thành các khúc khuất / không khuất, theo thứ tự dọc đoạn.
   Lấy mẫu rồi dò nhị phân tại chỗ đổi trạng thái, nên ranh giới đủ sắc để xuất ảnh.
   Trả về [{t0, t1, khuat}] — dùng chung cho cả vẽ màn hình lẫn xuất ảnh. */
export function splitByView(a, b, fd, huong, N = 28) {
  if (!fd.length) return [{ t0: 0, t1: 1, khuat: false }];
  const diem = t => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const che = t => hiddenAt(diem(t), fd, huong);

  /* Dò nhị phân ranh giới giữa hai mẫu khác trạng thái. */
  const bien = (t0, t1) => {
    let lo = t0, hi = t1;
    for (let i = 0; i < 12; i++) {
      const m = (lo + hi) / 2;
      if (che(m) === che(t0)) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  };

  const ra = [];
  let batDau = 0, tt = che(0);
  for (let i = 1; i <= N; i++) {
    const t = i / N, s = che(t);
    if (s !== tt) {
      const c = bien((i - 1) / N, t);
      if (c > batDau + 1e-6) ra.push({ t0: batDau, t1: c, khuat: tt });
      batDau = c; tt = s;
    }
  }
  if (batDau < 1 - 1e-6) ra.push({ t0: batDau, t1: 1, khuat: tt });
  return ra.length ? ra : [{ t0: 0, t1: 1, khuat: tt }];
}
