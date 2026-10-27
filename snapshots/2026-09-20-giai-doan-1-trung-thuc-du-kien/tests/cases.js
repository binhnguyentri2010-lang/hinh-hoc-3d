/* Bộ ca kiểm thử cho Giai đoạn 1 — trung thực về dữ kiện.

   Hai phía phải cùng đúng, và phía thứ hai mới là phía khó:
     · đề THIẾU dữ kiện  → tuyệt đối không được in ra con số nào
     · đề KHÔNG CÓ số đo nhưng vẫn hợp lệ (dạng tìm giao tuyến) → phải trả lời đầy đủ,
       không được báo lỗi oan

   `chan`  : danh sách chuỗi con của đề mục câu hỏi PHẢI bị chặn.
             Mọi câu khác trong cùng đề mặc nhiên phải KHÔNG bị chặn.
   `ghiChu`: câu phải có chú thích "ứng với … đang chọn" (phụ thuộc đại lượng tự do)
   `mucDo` : mức tin cậy của hình — 'đủ' | 'biểu-diễn' | 'thiếu'
   `canhBao`: chuỗi con phải xuất hiện trong phần cảnh báo */

export const TRUST = [
  {
    ten: 'Chóp thiếu chiều cao, hỏi thể tích → phải chặn',
    de: 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a. Tính thể tích khối chóp S.ABCD.',
    chan: ['Thể tích'],
    mucDo: 'thiếu',
  },
  {
    ten: 'Chóp thiếu chiều cao nhưng chỉ hỏi giao tuyến → KHÔNG được báo oan',
    de: 'Cho hình chóp S.ABCD có đáy là tứ giác lồi có các cạnh đối không song song. Tìm giao tuyến của (SAC) và (SBD).',
    chan: [],
    mucDo: 'biểu-diễn',
  },
  {
    /* Ca này canh một lỗi đã thật sự xảy ra: phép nhiễu loạn bẻ tứ giác quá mạnh thành
       gần-hình-thang, đáp án tụt xuống trường hợp suy biến, và máy kết luận nhầm rằng kết
       luận "(SAB) ∩ (SCD) = SJ" phụ thuộc hình dạng — trong khi nó đúng với mọi tứ giác.
       Kết luận đúng với mọi hình thì không được dính chú thích nào. */
    ten: 'Ba giao tuyến của chóp tứ giác lồi — đúng với mọi hình, không được có chú thích',
    de: 'Cho hình chóp S.ABCD có đáy là tứ giác lồi có các cạnh đối không song song. Tìm giao tuyến của a) (SAC) và (SBD); b) (SAB) và (SCD); c) (SAD) và (SBC).',
    chan: [],
    khongGhiChu: true,
    soCauGiaoTuyen: 3,
    mucDo: 'biểu-diễn',
  },
  {
    ten: 'Đề không cho một con số nào, chỉ hỏi giao tuyến → vẫn trả lời đủ',
    de: 'Cho tứ diện ABCD. Gọi M là trung điểm AB. Tìm giao tuyến của (MCD) và (ABC).',
    chan: [],
    mucDo: 'biểu-diễn',
  },
  {
    ten: 'Đề đủ dữ kiện → không chặn gì, hình đúng tỉ lệ',
    de: 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với mặt phẳng (ABCD) và SA = a√2. Tính thể tích khối chóp S.ABCD và khoảng cách từ A đến (SBC).',
    chan: [],
    mucDo: 'đủ',
  },
  {
    ten: 'Hình chữ nhật thiếu cạnh thứ hai → chặn thể tích',
    de: 'Cho hình chóp S.ABCD có đáy ABCD là hình chữ nhật, AB = a, SA ⊥ (ABCD), SA = a. Tính thể tích khối chóp S.ABCD.',
    chan: ['Thể tích'],
    mucDo: 'thiếu',
  },
  {
    ten: 'Hình thoi không cho góc → chặn diện tích đáy',
    de: 'Cho hình chóp S.ABCD có đáy ABCD là hình thoi cạnh a, SA ⊥ (ABCD), SA = a. Tính diện tích ABCD.',
    chan: ['Diện tích'],
    mucDo: 'thiếu',
  },
  {
    ten: 'Lăng trụ thiếu chiều cao → chặn thể tích',
    de: "Cho lăng trụ đứng ABC.A'B'C' có đáy ABC là tam giác đều cạnh a. Tính thể tích khối lăng trụ.",
    chan: ['Thể tích'],
    mucDo: 'thiếu',
  },
  {
    ten: 'Điểm M tự do trên cạnh → vẫn cho số, kèm ghi chú, không chặn',
    de: 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA ⊥ (ABCD), SA = a. Gọi M là điểm trên cạnh SB. Tính thể tích khối chóp M.ABCD.',
    chan: [],
    ghiChu: ['Thể tích M.ABCD'],
    mucDo: 'biểu-diễn',
  },
  {
    ten: 'Dữ kiện mâu thuẫn về chiều cao → phải cảnh báo',
    de: 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA ⊥ (ABCD), SA = a, góc giữa SC và đáy bằng 60°. Tính thể tích khối chóp S.ABCD.',
    chan: [],
    canhBao: ['mâu thuẫn'],
  },
  {
    /* Quan trọng: việc chặn phải theo TỪNG CÂU, không phải cả bài. Thiếu chiều cao thì
       chặn thể tích, nhưng giao tuyến vốn không phụ thuộc chiều cao nên vẫn phải trả lời. */
    ten: 'Đề nửa đủ nửa thiếu → chặn đúng câu thiếu, câu kia vẫn trả lời',
    de: 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a. Tính thể tích khối chóp S.ABCD. Tìm giao tuyến của (SAC) và (SBD).',
    chan: ['Thể tích'],
    mucDo: 'thiếu',
    dapAn: { 'Giao tuyến': '∩' },
  },
  {
    ten: 'Mệnh đề cho sẵn không được hiểu thành câu hỏi',
    de: 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA ⊥ (ABCD), SA = a. Biết khoảng cách từ A đến (SBC) bằng a√2/2. Tính thể tích khối chóp S.ABCD.',
    chan: [],
    soCau: 1,
  },
  {
    ten: 'Nhập bù chiều cao → đáp án phải trở lại, hình hết báo thiếu',
    de: 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a. Tính thể tích khối chóp S.ABCD.',
    nhap: { 'chiều-cao': Math.SQRT2 },
    chan: [],
    mucDo: 'đủ',
    dapAn: { 'Thể tích': 'a³√2/3' },
  },
  {
    ten: 'Giao tuyến không được lan sang cặp mặt phẳng của câu hỏi góc',
    de: 'Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA ⊥ (ABCD), SA = a. Tính góc giữa (SBC) và (ABCD). Tìm giao tuyến của (SAB) và (SCD).',
    chan: [],
    soCauGiaoTuyen: 1,   // chỉ (SAB)&(SCD), KHÔNG được thêm (SBC)&(ABCD)
  },
];
