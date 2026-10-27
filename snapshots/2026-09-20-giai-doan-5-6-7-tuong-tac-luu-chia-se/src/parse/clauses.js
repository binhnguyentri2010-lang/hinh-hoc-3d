/* Cắt đề thành từng mệnh đề và biết mệnh đề nào đang nói về chuyện gì.

   VÌ SAO CẦN: bản cũ chỉ cần thấy chữ "giao tuyến" xuất hiện ở BẤT KỲ đâu trong đề là quét
   toàn bộ đề tìm mọi cặp "(ABC) và (DEF)". Với đề:

       "Tính góc giữa (SBC) và (ABCD). Tìm giao tuyến của (SAB) và (SCD)."

   nó đẻ thêm một câu trả lời "Giao tuyến (SBC) và (ABCD)" mà không ai hỏi — cặp mặt phẳng
   đó là của câu hỏi GÓC.

   CÁI KHÓ: không thể chỉ quét trong đúng mệnh đề chứa chữ "giao tuyến", vì đề thường viết

       "Tìm giao tuyến của: a) (SAC) và (SBD); b) (MNP) và (SAC); c) …"

   — chữ "giao tuyến" nằm ở đầu, còn các cặp mặt phẳng nằm ở những mệnh đề sau. Nên một mệnh
   đề nêu chủ đề sẽ MỞ một phạm vi, kéo dài qua các mệnh đề kế tiếp cho tới khi gặp mệnh đề
   nêu chủ đề khác. */

/* Thứ tự quan trọng: "Hãy xác định giao tuyến" chứa cả "xác định" lẫn "giao tuyến",
   phải nhận ra "giao tuyến" trước. */
const CHU_DE = [
  [/giao tuyến/, 'giao-tuyến'],
  [/giao điểm/, 'giao-điểm'],
  [/thiết diện/, 'thiết-diện'],
  [/chứng minh/, 'chứng-minh'],
  [/tính|tìm|xác định/, 'khác'],
];

/* Cắt ở dấu chấm/chấm phẩy có khoảng trắng theo sau, và trước các nhãn câu a) b) c).

   Đòi hỏi khoảng trắng sau dấu chấm là có chủ ý: "hình chóp S.ABCD" và số thập phân "2.5"
   không có khoảng trắng sau dấu chấm nên không bị cắt nhầm. */
export function splitClauses(t) {
  return t
    .replace(/(?:^|\s)([a-h]\)\s)/g, '$1')
    .split(/[;.?!]\s+|/)
    .map(s => s.trim())
    .filter(Boolean);
}

/* Các mệnh đề đang thuộc phạm vi của một chủ đề. */
export function scopeOf(t, chuDe) {
  const out = [];
  let cur = null;
  for (const p of splitClauses(t)) {
    const found = CHU_DE.find(([re]) => re.test(p));
    if (found) cur = found[1];
    if (cur === chuDe) out.push(p);
  }
  return out;
}
