/* Bộ đề dùng để ĐO MỐC — không phải để kiểm tra đúng/sai từng đáp án, mà để đếm xem trong
   một rổ đề thật thì app đọc hiểu được bao nhiêu phần trăm.

   Có con số này mới biết mỗi giai đoạn có thật sự khá lên hay không. Không đo thì rất dễ
   sửa mãi mà vẫn dậm chân, hoặc tệ hơn là làm hỏng chỗ khác mà không biết.

   Trải đều các dạng của chương trình THPT: đáy vuông / chữ nhật / thoi / bình hành / thang /
   tam giác đều–vuông–cân, chóp đều, tứ diện, lăng trụ đứng–xiên, hộp, lập phương; hỏi thể
   tích, khoảng cách, góc, diện tích, độ dài, giao tuyến, giao điểm. Có cả vài đề cố tình
   thiếu dữ kiện và vài đề diễn đạt lạ. */

export const CORPUS = [
  // ---- chóp, đáy tứ giác ----
  "Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA vuông góc với đáy và SA = a√3. Tính thể tích khối chóp S.ABCD và góc giữa SC với đáy.",
  "Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh 2a, SA ⊥ (ABCD), SA = a. Tính khoảng cách từ A đến (SBC) và khoảng cách từ A đến (SCD).",
  "Cho hình chóp S.ABCD có đáy ABCD là hình chữ nhật với AB = a, AD = a√3, SA ⊥ (ABCD), SA = 2a. Tính thể tích khối chóp S.ABCD và góc giữa SB và mặt phẳng (ABCD).",
  "Cho hình chóp S.ABCD có đáy ABCD là hình chữ nhật, AB = a, BC = 2a, SA vuông góc với mặt phẳng đáy, góc giữa SC và đáy bằng 60°. Tính thể tích khối chóp S.ABCD.",
  "Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng a, cạnh bên bằng a√3. Tính thể tích khối chóp và góc giữa mặt bên với mặt đáy.",
  "Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng 2a, chiều cao bằng a√2. Tính thể tích khối chóp S.ABCD và khoảng cách từ A đến (SBC).",
  "Cho hình chóp S.ABCD có đáy ABCD là hình thoi cạnh a, góc BAD bằng 60°, SA ⊥ (ABCD), SA = a. Tính thể tích khối chóp S.ABCD.",
  "Cho hình chóp S.ABCD có đáy ABCD là hình bình hành tâm O, SA = SC và SB = SD. Gọi M là trung điểm của SC. Tìm giao tuyến của (SAC) và (SBD).",
  "Cho hình chóp S.ABCD có đáy ABCD là hình thang vuông tại A và D, AB = 2a, AD = DC = a, SA ⊥ (ABCD), SA = a√2. Tính thể tích khối chóp S.ABCD.",
  "Cho hình chóp S.ABCD đáy là hình thang vuông tại A và B, AB = BC = a, AD = 2a, SA vuông góc với đáy, SA = a√3. Tính góc giữa (SCD) và (ABCD).",

  // ---- chóp, đáy tam giác ----
  "Cho hình chóp S.ABC có đáy ABC là tam giác đều cạnh a, SA ⊥ (ABC), SA = a. Tính thể tích khối chóp S.ABC và khoảng cách từ A đến (SBC).",
  "Cho hình chóp S.ABC có đáy ABC là tam giác đều cạnh 2a, mặt bên (SAB) là tam giác đều và nằm trong mặt phẳng vuông góc với đáy. Tính thể tích khối chóp S.ABC.",
  "Cho hình chóp S.ABC có đáy ABC là tam giác vuông tại B, AB = a, BC = a√3, SA vuông góc với mặt phẳng (ABC), SA = 2a. Tính thể tích khối chóp và góc giữa SC với (ABC).",
  "Cho hình chóp S.ABC có đáy ABC là tam giác vuông cân tại A, BC = a√2, SA ⊥ (ABC), SA = a. Tính khoảng cách từ A đến (SBC).",
  "Cho hình chóp tam giác đều S.ABC có cạnh đáy bằng a, cạnh bên bằng 2a. Gọi G là trọng tâm tam giác ABC. Tính thể tích khối chóp S.ABC.",
  "Cho hình chóp S.ABC có đáy ABC là tam giác cân tại A, AB = AC = a, BC = a√2, SA vuông góc với đáy và SA = a. Tính thể tích khối chóp S.ABC.",

  // ---- tứ diện ----
  "Cho tứ diện đều ABCD cạnh a. Tính thể tích khối tứ diện ABCD và khoảng cách từ A đến (BCD).",
  "Cho tứ diện OABC có OA, OB, OC đôi một vuông góc, OA = a, OB = 2a, OC = 3a. Tính thể tích tứ diện OABC và khoảng cách từ O đến (ABC).",
  "Cho tứ diện ABCD. Gọi M, N lần lượt là trung điểm của AB và CD. Tìm giao tuyến của (MCD) và (NAB).",
  "Cho tứ diện ABCD. Gọi I là trung điểm của AD, J là trung điểm của BC. Tìm giao tuyến của hai mặt phẳng (IBC) và (JAD).",

  // ---- lăng trụ, hộp, lập phương ----
  "Cho lăng trụ đứng ABC.A'B'C' có đáy ABC là tam giác đều cạnh a, AA' = 2a. Tính thể tích khối lăng trụ và góc giữa A'B với mặt phẳng (ABC).",
  "Cho lăng trụ đứng ABC.A'B'C' có đáy ABC là tam giác vuông tại A, AB = a, AC = a√3, AA' = a√2. Tính thể tích khối lăng trụ ABC.A'B'C'.",
  "Cho hình hộp chữ nhật ABCD.A'B'C'D' có AB = a, AD = 2a, AA' = 3a. Tính thể tích khối hộp và độ dài AC'.",
  "Cho hình lập phương ABCD.A'B'C'D' cạnh a. Tính góc giữa AC' và (ABCD), khoảng cách giữa hai đường thẳng AB' và BC'.",
  "Cho hình lập phương ABCD.A'B'C'D' cạnh 2a. Gọi M là trung điểm của CC'. Tính thể tích khối chóp M.ABCD.",

  // ---- giao tuyến, giao điểm ----
  "Cho hình chóp S.ABCD có đáy là tứ giác lồi ABCD. Tìm giao tuyến của (SAB) và (SCD); (SAD) và (SBC).",
  "Cho hình chóp S.ABCD có đáy là hình bình hành. Gọi M, N lần lượt là trung điểm của SB và SD. Tìm giao tuyến của (AMN) và (SBD).",
  "Cho hình chóp S.ABCD có đáy là hình bình hành tâm O. Gọi M là trung điểm SC. Tìm giao điểm của SO và (ABM).",
  "Cho tứ diện ABCD. Trên cạnh AB lấy điểm M sao cho AM = 2MB. Trên cạnh AC lấy điểm N. Tìm giao tuyến của (DMN) và (BCD).",
  "Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA ⊥ (ABCD), SA = a. Gọi M, N là trung điểm SB, SD. Gọi (α) là mặt phẳng đi qua A, M, N. Tìm giao tuyến của (α) và (SBD).",

  // ---- cố tình thiếu dữ kiện ----
  "Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a. Tính thể tích khối chóp S.ABCD.",
  "Cho hình chóp S.ABCD có đáy ABCD là hình chữ nhật, AB = a, SA ⊥ (ABCD), SA = a. Tính thể tích khối chóp S.ABCD.",

  // ---- diễn đạt lạ / đơn vị thật ----
  "Cho hình chóp S.ABCD, đáy ABCD là hình vuông cạnh 6 cm, SA vuông góc mặt đáy và SA = 8 cm. Tính thể tích khối chóp S.ABCD.",
  "Cho hình chóp S.ABC, tam giác ABC vuông tại B có AB = a, BC = a. Biết SA ⊥ (ABC) và SA = a√2. Hãy tính diện tích ABC và thể tích khối chóp S.ABC.",
  "Cho khối chóp S.ABCD có đáy là hình vuông cạnh a, cạnh bên SA vuông góc với đáy, SA tạo với đáy một góc 45°. Tính thể tích khối chóp.",
  "Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, hình chiếu vuông góc của S lên mặt phẳng (ABCD) là trung điểm H của AB, SH = a. Tính thể tích khối chóp S.ABCD.",
];
