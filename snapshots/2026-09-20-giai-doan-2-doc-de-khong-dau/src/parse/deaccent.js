/* Đọc được đề gõ không dấu.

   VẤN ĐỀ: học sinh gõ trên điện thoại rất hay viết "cho hinh chop S.ABCD co day la hinh
   vuong canh a". Toàn bộ regex của parser đều có dấu nên trượt sạch — app vô dụng trên
   điện thoại, mà đó lại là nơi học sinh dùng nhiều nhất.

   CÁCH LÀM: không bỏ dấu cả đề rồi bỏ dấu cả 50 biểu thức regex (phải sửa 50 chỗ rải khắp
   5 file, và làm hỏng luôn các phép so chuỗi kiểu kind === 'đều'). Thay vào đó PHỤC HỒI DẤU
   cho đúng những từ khoá mà parser quan tâm. Phần còn lại của parser không phải sửa gì.

   VÌ SAO LÀM ĐƯỢC: bỏ dấu tiếng Việt là ánh xạ một-đổi-một ("ế" → "e", "đ" → "d"), nên chuỗi
   giữ nguyên độ dài và chèn dấu trở lại không xê dịch một chỉ số nào. Mọi m.index, mọi
   t.slice() trong parser vẫn đúng y như cũ.

   HAI ĐIỀU GIỮ CHO AN TOÀN:
     · Chỉ phục hồi trên đoạn TOÀN CHỮ THƯỜNG. Tên điểm luôn viết hoa, nên "VA" (hai điểm V,
       A) không bao giờ bị biến thành "và".
     · Luật dài chạy trước và giữ chỗ. "tam giac" phải thành "tam giác" chứ không được để luật
       ngắn "tam" → "tâm" cướp mất. */

/* Bỏ dấu, giữ nguyên độ dài. NFD tách chữ và dấu ra, xoá dấu rồi còn lại đúng một ký tự.
   "đ" không tách được nên phải xử riêng. */
export function deaccent(s) {
  return String(s)
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/* Bảng từ khoá: [dạng không dấu (regex), dạng có dấu (CÙNG ĐỘ DÀI)].
   Xếp dài trước ngắn sau — "tam giac" phải đứng trước "tam". */
const LUAT = [
  // khối và hình
  [/\bhinh chop\b/g, 'hình chóp'],
  [/\bhop chu nhat\b/g, 'hộp chữ nhật'],
  [/\blap phuong\b/g, 'lập phương'],
  [/\bhinh thang\b/g, 'hình thang'],
  [/\bhinh vuong\b/g, 'hình vuông'],
  [/\bbinh hanh\b/g, 'bình hành'],
  [/\bhinh thoi\b/g, 'hình thoi'],
  [/\bhinh hop\b/g, 'hình hộp'],
  [/\bchu nhat\b/g, 'chữ nhật'],
  [/\blang tru\b/g, 'lăng trụ'],
  [/\btu dien\b/g, 'tứ diện'],
  [/\btu giac\b/g, 'tứ giác'],
  [/\btam giac\b/g, 'tam giác'],
  [/\bda dien\b/g, 'đa diện'],
  [/\bhinh chieu\b/g, 'hình chiếu'],
  [/\bthiet dien\b/g, 'thiết diện'],
  [/\bhinh\b/g, 'hình'],
  [/\bkhoi\b/g, 'khối'],
  [/\bchop\b/g, 'chóp'],      // "khối chóp" — khác với "hình chóp" đã có luật riêng
  [/\bhop\b/g, 'hộp'],        // "khối hộp"
  [/\bdung\b/g, 'đứng'],      // "lăng trụ đứng"
  [/\bxien\b/g, 'xiên'],

  // tính chất
  [/\bngoai tiep\b/g, 'ngoại tiếp'],
  [/\bnoi tiep\b/g, 'nội tiếp'],
  [/\bvuong goc\b/g, 'vuông góc'],
  [/\bdoi mot\b/g, 'đôi một'],
  [/\bvuong\b/g, 'vuông'],
  [/\bdeu\b/g, 'đều'],

  // "can" ba nghĩa: căn bậc hai · căn (trước số) · cân (tam giác cân)
  [/\bcan bac hai\b/g, 'căn bậc hai'],
  [/\bcan(?=\s*\(?\s*\d)/g, 'căn'],
  [/\bcan\b/g, 'cân'],

  // bộ phận của hình
  [/\bcanh ben\b/g, 'cạnh bên'],
  [/\bchieu cao\b/g, 'chiều cao'],
  [/\bduong cao\b/g, 'đường cao'],
  [/\bduong thang\b/g, 'đường thẳng'],
  [/\bduong cheo\b/g, 'đường chéo'],
  [/\bdoan thang\b/g, 'đoạn thẳng'],
  [/\bmat phang\b/g, 'mặt phẳng'],
  [/\bmat ben\b/g, 'mặt bên'],
  [/\bcanh\b/g, 'cạnh'],
  [/\bdoan\b/g, 'đoạn'],
  [/\bday\b/g, 'đáy'],
  [/\bmat\b/g, 'mặt'],

  // điểm và quan hệ
  [/\btrung diem\b/g, 'trung điểm'],
  [/\btrong tam\b/g, 'trọng tâm'],
  [/\bgiao tuyen\b/g, 'giao tuyến'],
  [/\bgiao diem\b/g, 'giao điểm'],
  [/\bdiem\b/g, 'điểm'],
  [/\btam\b/g, 'tâm'],

  // câu hỏi
  [/\bkhoang cach\b/g, 'khoảng cách'],
  [/\bchung minh\b/g, 'chứng minh'],
  [/\bxac dinh\b/g, 'xác định'],
  [/\bdien tich\b/g, 'diện tích'],
  [/\bthe tich\b/g, 'thể tích'],
  [/\bdo dai\b/g, 'độ dài'],
  [/\btinh\b/g, 'tính'],
  [/\btim\b/g, 'tìm'],
  [/\bgoc\b/g, 'góc'],
  [/(?<=\d\s?)\bdo\b/g, 'độ'],

  // từ nối và trạng từ
  [/\blan luot\b/g, 'lần lượt'],
  [/\bbat ki\b/g, 'bất kì'],
  [/\bbat ky\b/g, 'bất kỳ'],
  [/\btuy y\b/g, 'tùy ý'],
  [/\bdi dong\b/g, 'di động'],
  [/\btao voi\b/g, 'tạo với'],
  [/\btrung voi\b/g, 'trùng với'],
  [/\bcat boi\b/g, 'cắt bởi'],
  [/\bti so\b/g, 'tỉ số'],
  [/\bsao cho\b/g, 'sao cho'],
  [/\bthuoc\b/g, 'thuộc'],
  [/\bkhong\b/g, 'không'],
  [/\bgiua\b/g, 'giữa'],
  [/\bbang\b/g, 'bằng'],
  [/\bchua\b/g, 'chứa'],
  [/\bden\b/g, 'đến'],
  [/\btoi\b/g, 'tới'],
  [/\blen\b/g, 'lên'],
  [/\bxuong\b/g, 'xuống'],
  [/\bloi\b/g, 'lồi'],
  [/\bdoi\b/g, 'đối'],
  [/\bcap\b/g, 'cặp'],
  [/\bboi\b/g, 'bởi'],
  [/\bbiet\b/g, 'biết'],
  [/\bcheo\b/g, 'chéo'],
  [/\bphan\b/g, 'phần'],
  [/\blon\b/g, 'lớn'],
  [/\bnho\b/g, 'nhỏ'],
  [/\bke\b/g, 'kẻ'],
  [/\bdi\b/g, 'đi'],      // sau "di dong" → "di động", nên không cướp mất từ đó
  [/\bvoi\b/g, 'với'],
  [/\bcua\b/g, 'của'],
  [/\bcac\b/g, 'các'],
  [/\bmot\b/g, 'một'],
  [/\bnam\b/g, 'nằm'],
  [/\btren\b/g, 'trên'],
  [/\blay\b/g, 'lấy'],
  [/\bgoi\b/g, 'gọi'],
  [/\bhay\b/g, 'hãy'],
  [/\bcat\b/g, 'cắt'],
  [/\btai\b/g, 'tại'],
  [/\bco\b/g, 'có'],
  [/\bla\b/g, 'là'],
  [/\bva\b/g, 'và'],
  [/\btu\b/g, 'từ'],
];

/* Kiểm tra ngay lúc nạp module: thay thế phải CÙNG ĐỘ DÀI với dạng không dấu của nó,
   nếu không thì mọi chỉ số phía sau lệch hết mà không ai biết. */
for (const [re, acc] of LUAT) {
  if (deaccent(acc).length !== acc.length) {
    throw new Error(`Luật phục hồi dấu sai: "${acc}" đổi độ dài khi bỏ dấu`);
  }
}

/* Chèn dấu trở lại cho các từ khoá. Giữ nguyên độ dài chuỗi. */
export function restoreVi(s) {
  const d = deaccent(s);
  const out = s.split('');
  const daLay = new Array(s.length).fill(false);   // ô đã bị luật dài hơn chiếm

  for (const [re, acc] of LUAT) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(d)) !== null) {
      const i = m.index, n = m[0].length;
      if (n !== acc.length) continue;                       // an toàn kép
      if (/[A-Z]/.test(s.slice(i, i + n))) continue;        // chạm tên điểm → bỏ qua
      let vuong = false;
      for (let k = 0; k < n; k++) if (daLay[i + k]) { vuong = true; break; }
      if (vuong) continue;
      for (let k = 0; k < n; k++) { out[i + k] = acc[k]; daLay[i + k] = true; }
    }
  }
  return out.join('');
}
