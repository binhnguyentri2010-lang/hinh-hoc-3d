/* Mặt phẳng đặt tên riêng: (α), (P), (β).

   VÌ SAO CẦN: đề thiết diện hầu như luôn đặt tên cho mặt phẳng cắt —
   "Gọi (α) là mặt phẳng đi qua M, N, P. Xác định thiết diện của hình chóp cắt bởi (α)."
   Bản cũ chỉ hiểu mặt phẳng khi đề kể đủ tên đỉnh như "(SAC)", nên mọi đề dạng này trượt
   ngay từ câu đầu.

   Giai đoạn 2 mới làm phần ĐẶT TÊN: (α) được định nghĩa bằng ba điểm đã biết.
   Các cách định nghĩa khác — qua một điểm và song song với mặt phẳng khác, chứa một đường
   và song song với đường khác, qua một điểm và vuông góc với một đường — thuộc Giai đoạn 4,
   sẽ bổ sung vào chính bảng tra này. */

import { toks } from '../parse/normalize.js';

const TEN = "([A-ZΑ-Ωα-ω]'?)";
const DS_DIEM = "((?:[A-Z]'?\\s*(?:,|và)\\s*)*[A-Z]'?)";

/* "(α) đi qua M, N, P" · "(α) là mặt phẳng qua ba điểm M, N và P" · "(α) chứa M, N, P" */
const QUA = new RegExp(
  `\\(\\s*${TEN}\\s*\\)\\s*(?:là\\s*)?(?:mặt phẳng\\s*)?(?:đi\\s*)?(?:qua|chứa)\\s*` +
  `(?:(?:ba|các|những)\\s*)?(?:điểm\\s*)?${DS_DIEM}(?![A-Z'])`, 'g');

/* "(α) = (MNP)" · "(α) là (MNP)" */
const BANG = new RegExp(`\\(\\s*${TEN}\\s*\\)\\s*(?:là|=)\\s*\\(\\s*((?:[A-Z]'?){3,8})\\s*\\)`, 'g');

/* Phải chạy SAU runDefs(): các điểm M, N, P trong định nghĩa cần đã được dựng xong. */
export function bindPlanes(ctx) {
  const { t, pts } = ctx;
  const alias = ctx.planeAlias = {};

  const dat = (ten, ns) => {
    if (ns.length >= 3 && ns.every(n => pts[n]) && !alias[ten]) alias[ten] = ns;
  };

  for (const m of t.matchAll(BANG)) dat(m[1], toks(m[2]));
  for (const m of t.matchAll(QUA)) dat(m[1], toks(m[2]));

  /* Đề đặt tên mà máy không tra ra được thì phải nói, chứ đừng im lặng bỏ câu hỏi —
     người dùng sẽ tưởng app không biết làm dạng đó. */
  for (const m of t.matchAll(new RegExp(`\\(\\s*${TEN}\\s*\\)`, 'g'))) {
    const ten = m[1];
    if (alias[ten] || pts[ten]) continue;
    if (!ctx.W.some(w => w.includes(`(${ten})`)))
      ctx.W.push(`Chưa hiểu mặt phẳng (${ten}) là mặt phẳng nào. Hiện chỉ đọc được dạng ` +
                 `"(${ten}) đi qua M, N, P" hoặc "(${ten}) = (MNP)".`);
  }
}
