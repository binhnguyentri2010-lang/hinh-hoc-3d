/* Hiển thị số dưới dạng căn thức: 1.2247… → "a√6/2".
   Trích nguyên văn từ legacy/index.html dòng 86–106 — Giai đoạn 0 không đổi hành vi.

   TODO Giai đoạn 1 — siết dung sai của surd():
   ngưỡng hiện tại (sai số tương đối 1e-7, mẫu tới 36, k tới 200000) đủ rộng để biến
   một số vốn xấu thành phân thức căn trông rất "chính xác". Đó cũng là một kiểu bịa đáp án.
   Khi siết, golden test sẽ đỏ ở đúng những chỗ cần xem lại — đó là chủ ý. */

const gcd = (a, b) => b ? gcd(b, a % b) : a;

/* Tìm biểu diễn v = (s/q)·√k. Trả về null nếu không khớp dạng nào. */
export function surd(v) {
  v = Math.abs(v);
  if (v < 1e-9) return { s: 0, k: 1, q: 1 };
  for (let q = 1; q <= 36; q++) {
    const n = v * v * q * q, r = Math.round(n);
    if (r > 0 && r < 200000 && Math.abs(n - r) < 1e-7 * Math.max(1, n)) {
      let s = 1, k = r;
      for (let i = 2; i * i <= k; i++) while (k % (i * i) === 0) { k /= i * i; s *= i; }
      const g = gcd(s, q);
      return { s: s / g, k, q: q / g };
    }
  }
  return null;
}

/* Độ dài (pow=1), diện tích (pow=2), thể tích (pow=3) — đơn vị theo cạnh a. */
export function fmt(v, pow = 1) {
  const u = ['', 'a', 'a²', 'a³'][pow], r = surd(v), ap = `${+v.toFixed(4)}${u}`;
  if (!r) return '≈ ' + ap;
  if (r.s === 0) return '0';
  let str = (r.s === 1 && (r.k > 1 || u) ? '' : r.s) + u + (r.k > 1 ? '√' + r.k : '');
  if (!str) str = '1';
  if (r.q > 1) str += '/' + r.q;
  return (r.k > 1 || r.q > 1) ? `${str}  (≈ ${ap})` : str;
}

/* Góc: ưu tiên số độ tròn, nếu không thì kèm tan dưới dạng căn thức. */
export function fmtAng(rad) {
  const d = rad * 180 / Math.PI, rd = Math.round(d);
  if (Math.abs(d - rd) < 1e-6) return rd + '°';
  const tn = surd(Math.tan(rad));
  let extra = '';
  if (tn && tn.q <= 12) {
    let s = (tn.s === 1 && tn.k > 1 ? '' : tn.s) + (tn.k > 1 ? '√' + tn.k : '');
    if (tn.q > 1) s += '/' + tn.q;
    extra = ` (tan = ${s})`;
  }
  return `≈ ${d.toFixed(2)}°${extra}`;
}
