/* Hiển thị số dưới dạng căn thức: 1.2247… → "a√6/2".
   Trích từ legacy/index.html dòng 86–106.

   Giai đoạn 1 — ĐÃ SIẾT DUNG SAI, từ 1e-7 xuống 1e-9 (tương đối).

   Vì sao: đây cũng là một kiểu bịa đáp án, chỉ tinh vi hơn chuyện bịa chiều cao. Với ngưỡng
   1e-7 và mẫu số thử tới 36, một con số vốn xấu rất dễ "khớp" vào một phân thức căn trông
   như đáp án chính xác. Học sinh chép "a√13/29" vào bài mà thật ra kết quả không phải thế.

   1e-9 vẫn dư sức nhận ra căn thức thật: các đáp án hình học đi qua vài chục phép nhân chia
   chỉ tích luỹ sai số cỡ 1e-15 tương đối, cách ngưỡng mới cả triệu lần. Còn một số ngẫu
   nhiên thì gần như không thể lọt. Ngoài ngưỡng đó thì in số thập phân kèm dấu ≈ —
   thà xấu mà thật. */

const gcd = (a, b) => b ? gcd(b, a % b) : a;

/* Tìm biểu diễn v = (s/q)·√k. Trả về null nếu không khớp dạng nào. */
export function surd(v) {
  v = Math.abs(v);
  if (v < 1e-9) return { s: 0, k: 1, q: 1 };
  for (let q = 1; q <= 36; q++) {
    const n = v * v * q * q, r = Math.round(n);
    if (r > 0 && r < 200000 && Math.abs(n - r) < 1e-9 * Math.max(1, n)) {
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
