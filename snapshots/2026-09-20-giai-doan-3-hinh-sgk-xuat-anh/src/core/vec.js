/* Toán vector cho điểm dạng [x, y, z].
   Trích nguyên văn từ legacy/index.html dòng 68–84 — không đổi một ký tự nào của phần thân hàm. */

export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const mid = (a, b) => mul(add(a, b), .5);
export const avg = ps => mul(ps.reduce(add, [0, 0, 0]), 1 / ps.length);
export const normal = (p, q, r) => cross(sub(q, p), sub(r, p));
export const projPlane = (x, p, n) => sub(x, mul(n, dot(n, sub(x, p)) / dot(n, n)));
export const projLine = (x, p, d) => add(p, mul(d, dot(d, sub(x, p)) / dot(d, d)));

/* Cặp điểm gần nhau nhất của hai đường thẳng (p1p2) và (p3p4).
   Hai đường song song → trả về p1 và hình chiếu của p1 lên đường kia. */
export function closest(p1, p2, p3, p4) {
  const d1 = sub(p2, p1), d2 = sub(p4, p3), r = sub(p1, p3),
        a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r),
        c = dot(d1, r), b = dot(d1, d2), den = a * e - b * b;
  if (Math.abs(den) < 1e-12) return [p1, projLine(p1, p3, d2)];
  const s = (b * f - c * e) / den, t = (a * f - b * c) / den;
  return [add(p1, mul(d1, s)), add(p3, mul(d2, t))];
}

/* Tâm đường tròn ngoại tiếp tam giác ABC. */
export function circum(A, B, C) {
  const a = sub(A, C), b = sub(B, C), axb = cross(a, b);
  return add(C, mul(cross(sub(mul(b, dot(a, a)), mul(a, dot(b, b))), axb), 1 / (2 * dot(axb, axb))));
}

/* Tâm đường tròn nội tiếp tam giác ABC. */
export function incenter(A, B, C) {
  const a = len(sub(B, C)), b = len(sub(C, A)), c = len(sub(A, B));
  return mul(add(add(mul(A, a), mul(B, b)), mul(C, c)), 1 / (a + b + c));
}

/* Diện tích đa giác phẳng.
   CẢNH BÁO: giả định các đỉnh đã theo đúng thứ tự vòng quanh đa giác.
   Đưa vào lộn xộn sẽ ra số sai chứ không báo lỗi — xem sortRing() trong build/ring.js. */
export function polyArea(ps) {
  let s = [0, 0, 0];
  for (let i = 0; i < ps.length; i++) s = add(s, cross(ps[i], ps[(i + 1) % ps.length]));
  return len(s) / 2;
}
