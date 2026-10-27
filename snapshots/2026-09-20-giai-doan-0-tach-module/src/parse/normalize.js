/* Chuẩn hoá đề bài trước khi đem regex ra quét.
   Trích nguyên văn từ legacy/index.html dòng 109–122.

   TODO Giai đoạn 2: thêm lớp khớp không dấu (parse/deaccent.js) — học sinh gõ trên điện
   thoại rất hay viết "cho hinh chop S.ABCD co day la hinh vuong canh a", và toàn bộ regex
   ở đây đều có dấu nên sẽ trượt sạch. */

/* Một độ dài: "a", "2a", "a√3", "3/2", "a√2/2"… Bắt 3 nhóm: hệ số, số trong căn, mẫu số.
   Phần (?!…) ở cuối để "45" trong "45°" hay "45 độ" không bị nuốt thành độ dài. */
export const LEN = "((?:\\d+(?:[.,]\\d+)?\\s*)?a|\\d+(?:[.,]\\d+)?)(?:\\s*√\\s*(\\d+))?(?:\\s*\\/\\s*(\\d+))?(?![\\w°√]|\\s*độ)";

/* Một số đo góc. */
export const DEG = "(\\d+(?:[.,]\\d+)?)";

/* Ba nhóm bắt được từ LEN → giá trị số, quy ước a = 1. */
export function lenVal(c, r, d) {
  c = c.replace(/\s/g, '').replace(',', '.');
  let v = c.endsWith('a') ? (c.length > 1 ? parseFloat(c) : 1) : parseFloat(c);
  if (r) v *= Math.sqrt(+r);
  if (d) v /= +d;
  return v;
}

/* Gom các cách viết khác nhau về một mối: nháy đơn, chữ hoa đầu câu, "căn"/"sqrt" → √,
   "mặt phẳng (ABC)" → "(ABC)", nhiều dấu cách → một dấu cách.
   Lưu ý: chữ cái in hoa được giữ nguyên vì chúng là TÊN ĐIỂM — chỉ hạ chữ hoa đứng
   ngay trước chữ thường (tức chữ hoa đầu câu). */
export function norm(s) {
  return s.replace(/[’‘`´′]/g, "'")
    .replace(/([A-ZĐ])(?=[a-zđà-ỹ])/g, c => c.toLowerCase())
    .replace(/([ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂƠƯẠ-Ỹ])/g, c => c.toLowerCase())
    .replace(/căn\s*(?:bậc\s*hai\s*(?:của\s*)?)?\(?\s*(\d+)\s*\)?/g, '√$1')
    .replace(/sqrt\s*\(?\s*(\d+)\s*\)?/g, '√$1')
    .replace(/(\d*)\s*√(\d+)\s*a(?![a-zà-ỹđ])/g, '$1a√$2')
    .replace(/(?:mặt phẳng|mp)\s*\(/g, '(')
    .replace(/\s+/g, ' ');
}

/* Tách chuỗi tên điểm: "A'B'C'" → ["A'", "B'", "C'"] */
export const toks = s => (s || '').match(/[A-Z]'?/g) || [];
