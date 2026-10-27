/* Thiết diện: cắt khối bằng một mặt phẳng.

   Đây là nội dung trực quan nhất của hình không gian THPT, và cũng là thứ khó hình dung nhất
   khi chỉ nhìn hình vẽ tay trên giấy.

   Thuật toán dựa vào một điều: chóp, lăng trụ, hộp đều LỒI. Nhờ vậy:
     · Thiết diện luôn là một đa giác lồi, nên gom hết các đỉnh rồi sắp theo góc quanh trọng
       tâm là ra đúng thứ tự vòng — khỏi phải nối từng đoạn rồi dò chu trình.
     · Phần khối nằm một bên mặt phẳng vẫn lồi, nên thể tích tính được chính xác bằng cách
       cắt từng mặt rồi cộng các tứ diện từ một điểm trong.

   THỨ TỰ VÒNG LÀ BẮT BUỘC: polyArea() trong core/vec.js giả định các đỉnh đã theo thứ tự
   quanh đa giác, đưa vào lộn xộn thì ra số sai chứ không báo lỗi. */

import { sub, add, mul, dot, cross, len, avg, normal, polyArea } from '../core/vec.js';

/* Giao của mặt phẳng với MỘT mặt của khối.
   Trả về danh sách điểm giao (0, 1 hoặc 2 điểm), hoặc cả mặt nếu mặt nằm trong mặt phẳng. */
function catMotMat(ps, p0, n, eps) {
  const d = ps.map(p => dot(n, sub(p, p0)));
  if (d.every(x => Math.abs(x) <= eps)) return { trung: true, diem: ps.slice() };

  const ra = [];
  const them = p => { if (!ra.some(q => len(sub(p, q)) < eps * 8)) ra.push(p); };
  for (let i = 0; i < ps.length; i++) {
    const j = (i + 1) % ps.length;
    if (Math.abs(d[i]) <= eps) { them(ps[i]); continue; }
    if (Math.abs(d[j]) <= eps) continue;              // để lượt sau xử lý đỉnh đó
    if (d[i] * d[j] < 0) them(add(ps[i], mul(sub(ps[j], ps[i]), d[i] / (d[i] - d[j]))));
  }
  return { trung: false, diem: ra };
}

/* Hai trục đơn vị nằm trong mặt phẳng pháp tuyến n — để sắp xếp các đỉnh theo góc. */
function trucTrongMatPhang(n) {
  const tam = Math.abs(n[0]) < .9 ? [1, 0, 0] : [0, 1, 0];
  const u = cross(n, tam), u1 = mul(u, 1 / len(u));
  const v = cross(n, u1);
  return [u1, mul(v, 1 / len(v))];
}

/* Thiết diện của khối (faces là danh sách mặt, mỗi mặt là mảng điểm) với mặt phẳng (p0, n).
   Trả về { dinh: [...] theo thứ tự vòng, theoMat: [{mat, doan}] } hoặc null nếu không cắt. */
export function thietDien(faces, p0, n, scale = 1) {
  const eps = 1e-7 * Math.max(1, scale);
  const gom = [], theoMat = [];

  for (const f of faces) {
    const r = catMotMat(f.ps, p0, n, eps);
    if (r.trung) {
      /* Mặt phẳng trùng với một mặt của khối — thiết diện chính là mặt đó. */
      return { dinh: f.ps.slice(), theoMat: [{ mat: f, doan: f.ps.slice() }], trungMat: f };
    }
    if (r.diem.length >= 2) theoMat.push({ mat: f, doan: [r.diem[0], r.diem[r.diem.length - 1]] });
    for (const p of r.diem) if (!gom.some(q => len(sub(p, q)) < eps * 8)) gom.push(p);
  }
  if (gom.length < 3) return null;

  /* Khối lồi ⇒ thiết diện lồi ⇒ sắp theo góc quanh trọng tâm là ra đúng thứ tự vòng. */
  const c = avg(gom);
  const [u, v] = trucTrongMatPhang(n);
  const dinh = gom.slice().sort((a, b) => {
    const ga = Math.atan2(dot(sub(a, c), v), dot(sub(a, c), u));
    const gb = Math.atan2(dot(sub(b, c), v), dot(sub(b, c), u));
    return ga - gb;
  });
  return { dinh, theoMat };
}

/* Cắt một đa giác phẳng, giữ phần dot(n, x − p0) ≤ 0 (Sutherland–Hodgman một mặt phẳng). */
function catDaGiac(ps, p0, n) {
  const ra = [];
  const d = ps.map(p => dot(n, sub(p, p0)));
  for (let i = 0; i < ps.length; i++) {
    const j = (i + 1) % ps.length;
    if (d[i] <= 0) ra.push(ps[i]);
    if (d[i] * d[j] < 0) ra.push(add(ps[i], mul(sub(ps[j], ps[i]), d[i] / (d[i] - d[j]))));
  }
  return ra;
}

/* Thể tích một khối lồi cho bởi danh sách mặt.
   Lấy một điểm bên trong rồi cộng thể tích các tứ diện từ điểm đó tới từng tam giác của từng
   mặt. Vì khối lồi và điểm nằm trong, các tứ diện này lát kín khối và không chồng nhau — nên
   lấy trị tuyệt đối từng cái là đúng, khỏi cần lo định hướng mặt. */
export function theTichLoi(mats) {
  const tatCa = mats.flat();
  if (tatCa.length < 4) return 0;
  const c = avg(tatCa);
  let v = 0;
  for (const f of mats)
    for (let i = 1; i < f.length - 1; i++)
      v += Math.abs(dot(sub(f[0], c), cross(sub(f[i], c), sub(f[i + 1], c))));
  return v / 6;
}

/* Mặt phẳng chia khối thành hai phần — trả về [thể tích phần dưới, phần trên].
   "Dưới" là phía dot(n, x − p0) ≤ 0. */
export function chiaTheTich(faces, p0, n) {
  const duoi = faces.map(f => catDaGiac(f.ps, p0, n)).filter(f => f.length >= 3);
  const td = thietDien(faces, p0, n);
  if (td) duoi.push(td.dinh);
  const toanBo = theTichLoi(faces.map(f => f.ps));
  const v1 = theTichLoi(duoi);
  return [Math.min(v1, toanBo), Math.max(toanBo - v1, 0)];
}

export function dienTichThietDien(dinh) {
  return polyArea(dinh);
}

/* Mặt phẳng đi qua ba điểm → dạng (điểm, pháp tuyến). */
export function tuBaDiem(a, b, c) {
  const n = normal(a, b, c);
  const l = len(n);
  return l < 1e-12 ? null : { diem: a, phap: mul(n, 1 / l) };
}
