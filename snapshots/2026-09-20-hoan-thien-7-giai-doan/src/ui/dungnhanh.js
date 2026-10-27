/* Tự dựng hình — không cần có sẵn đề.

   Đây là ý "miêu tả hình ảnh của mình" trong ý tưởng ban đầu của dự án: không phải lúc nào
   người dùng cũng có một đề in sẵn để dán vào. Nhiều khi chỉ là "cho tôi xem hình chóp đáy
   hình thoi, chiều cao 2a".

   Cách làm: các ô chọn ở đây SOẠN RA câu đề tiếng Việt rồi đưa cho chính parser xử lý —
   không dựng hình theo một đường riêng. Nhờ vậy chỉ có một con đường dẫn tới hình, mọi thứ
   đã kiểm thử cho đường đó đều áp dụng được, và người dùng NHÌN THẤY câu đề tương ứng với
   lựa chọn của mình, học luôn cách diễn đạt. */

export const KHOI = [
  { ma: 'chop4', ten: 'Hình chóp — đáy tứ giác' },
  { ma: 'chop3', ten: 'Hình chóp — đáy tam giác' },
  { ma: 'chopdeu', ten: 'Hình chóp tứ giác đều' },
  { ma: 'langtru3', ten: "Lăng trụ đứng — đáy tam giác" },
  { ma: 'hop', ten: 'Hình hộp chữ nhật' },
  { ma: 'lapphuong', ten: 'Hình lập phương' },
  { ma: 'tudiendeu', ten: 'Tứ diện đều' },
];

export const DAY4 = [
  { ma: 'vuong', ten: 'hình vuông' },
  { ma: 'chunhat', ten: 'hình chữ nhật' },
  { ma: 'thoi', ten: 'hình thoi' },
  { ma: 'binhhanh', ten: 'hình bình hành' },
  { ma: 'thang', ten: 'hình thang vuông' },
];

export const DAY3 = [
  { ma: 'deu', ten: 'tam giác đều' },
  { ma: 'vuong', ten: 'tam giác vuông' },
  { ma: 'can', ten: 'tam giác cân' },
];

export const CAU_HOI = [
  { ma: 'V', ten: 'thể tích' },
  { ma: 'g', ten: 'góc với đáy' },
  { ma: 'd', ten: 'khoảng cách' },
  { ma: 'gt', ten: 'giao tuyến' },
  { ma: 'td', ten: 'thiết diện' },
];

export function dayNaoDung(khoi) {
  if (khoi === 'chop4') return DAY4;
  if (khoi === 'chop3' || khoi === 'langtru3') return DAY3;
  return null;
}

/* Trả về câu đề hoàn chỉnh. c = cạnh đáy, c2 = cạnh thứ hai, h = chiều cao. */
export function soanDe({ khoi, day, c = 'a', c2 = '2a', h = 'a', hoi = ['V'] }) {
  const cau = [];
  let khoiTen = '', dayMP = '', hoiV = '';

  if (khoi === 'lapphuong') {
    cau.push(`Cho hình lập phương ABCD.A'B'C'D' cạnh ${c}.`);
    khoiTen = "ABCD.A'B'C'D'"; dayMP = '(ABCD)'; hoiV = "khối lập phương ABCD.A'B'C'D'";

  } else if (khoi === 'hop') {
    cau.push(`Cho hình hộp chữ nhật ABCD.A'B'C'D' có AB = ${c}, AD = ${c2}, AA' = ${h}.`);
    khoiTen = "ABCD.A'B'C'D'"; dayMP = '(ABCD)'; hoiV = "khối hộp ABCD.A'B'C'D'";

  } else if (khoi === 'tudiendeu') {
    cau.push(`Cho tứ diện đều ABCD cạnh ${c}.`);
    khoiTen = 'ABCD'; dayMP = '(BCD)'; hoiV = 'khối tứ diện ABCD';

  } else if (khoi === 'langtru3') {
    cau.push(`Cho lăng trụ đứng ABC.A'B'C' có đáy ABC là ${moTaDay3(day, c)}, AA' = ${h}.`);
    khoiTen = "ABC.A'B'C'"; dayMP = '(ABC)'; hoiV = "khối lăng trụ ABC.A'B'C'";

  } else if (khoi === 'chopdeu') {
    cau.push(`Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng ${c}, chiều cao bằng ${h}.`);
    khoiTen = 'S.ABCD'; dayMP = '(ABCD)'; hoiV = 'khối chóp S.ABCD';

  } else if (khoi === 'chop3') {
    cau.push(`Cho hình chóp S.ABC có đáy ABC là ${moTaDay3(day, c)}, SA ⊥ (ABC), SA = ${h}.`);
    khoiTen = 'S.ABC'; dayMP = '(ABC)'; hoiV = 'khối chóp S.ABC';

  } else {
    cau.push(`Cho hình chóp S.ABCD có đáy ABCD là ${moTaDay4(day, c, c2)}, SA ⊥ (ABCD), SA = ${h}.`);
    khoiTen = 'S.ABCD'; dayMP = '(ABCD)'; hoiV = 'khối chóp S.ABCD';
  }

  const chop = khoi.startsWith('chop');
  const tamGiac = khoi === 'chop3' || khoi === 'langtru3' || khoi === 'tudiendeu';

  if (hoi.includes('td') || hoi.includes('gt')) {
    if (chop) cau.push(tamGiac ? 'Gọi M là trung điểm SB.' : 'Gọi M, N lần lượt là trung điểm của SB, SD.');
    else cau.push("Gọi M là trung điểm của BB'.");
  }

  const tinh = [];
  if (hoi.includes('V')) tinh.push(`thể tích ${hoiV}`);
  if (hoi.includes('g')) tinh.push(chop
    ? `góc giữa ${tamGiac ? 'SC' : 'SC'} và ${dayMP}`
    : (khoi === 'tudiendeu' ? `góc giữa AB và (BCD)` : `góc giữa AC' và ${dayMP}`));
  if (hoi.includes('d')) tinh.push(chop
    ? `khoảng cách từ A đến ${tamGiac ? '(SBC)' : '(SBC)'}`
    : (khoi === 'tudiendeu' ? 'khoảng cách từ A đến (BCD)' : "khoảng cách từ A đến (A'BD)"));
  if (tinh.length) cau.push('Tính ' + tinh.join(' và ') + '.');

  if (hoi.includes('gt') && chop)
    cau.push(tamGiac ? 'Tìm giao tuyến của (AMC) và (SBC).' : 'Tìm giao tuyến của (AMN) và (SBD).');
  if (hoi.includes('td'))
    cau.push(chop
      ? `Gọi (α) là mặt phẳng đi qua M và song song với ${dayMP}. Xác định thiết diện cắt bởi (α) và tính diện tích thiết diện.`
      : `Gọi (α) là mặt phẳng đi qua M và song song với ${dayMP}. Xác định thiết diện cắt bởi (α).`);

  return cau.join(' ');
}

function moTaDay4(day, c, c2) {
  if (day === 'chunhat') return `hình chữ nhật có AB = ${c}, AD = ${c2}`;
  if (day === 'thoi') return `hình thoi cạnh ${c}, góc BAD bằng 60°`;
  if (day === 'binhhanh') return `hình bình hành có AB = ${c}, AD = ${c2}, góc BAD bằng 60°`;
  if (day === 'thang') return `hình thang vuông tại A và B, AB = BC = ${c}, AD = ${c2}`;
  return `hình vuông cạnh ${c}`;
}

function moTaDay3(day, c) {
  if (day === 'vuong') return `tam giác vuông tại B, AB = ${c}, BC = ${c}`;
  if (day === 'can') return `tam giác cân tại A, AB = AC = ${c}, BC = ${c}`;
  return `tam giác đều cạnh ${c}`;
}
