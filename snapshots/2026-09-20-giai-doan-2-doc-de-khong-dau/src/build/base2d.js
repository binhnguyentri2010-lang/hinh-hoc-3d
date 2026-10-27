/* Dựng đa giác đáy trong mặt phẳng z = 0.
   Trích từ legacy/index.html dòng 139–197. Biến tự do của closure cũ (t, baseSide, L)
   truyền vào qua ctx.

   Giai đoạn 1: mọi con số máy TỰ CHỌN khi đề không cho đủ đều phải đi qua ctx.guess().
   Giá trị trả về khi không nhiễu loạn giống hệt bản cũ, nên hình vẫn vẽ y như trước —
   chỉ khác là bây giờ máy BIẾT chỗ nào nó đang đoán, và đáp án nào phụ thuộc chỗ đó.

   Phân loại:
     MISSING — đề lẽ ra phải cho (chiều cao, cạnh còn lại, góc đáy)
     FREE    — đề cố ý không ràng buộc ("tứ giác lồi", "M bất kỳ trên AB") */

import { KIND } from '../solve/trust.js';

export function base2D(ctx, names) {
  const { t, baseSide, L, guess } = ctx;
  const n = names.length, P = {};

  /* Kích thước tổng thể. Không có độ dài nào trong đề thì mọi đáp án có thứ nguyên
     (độ dài, diện tích, thể tích) đều vô nghĩa — nên đây là MISSING, không phải FREE.
     Dùng chung một đại lượng 'kích-thước' cho mọi chỗ rơi về mặc định 1, để khi nhiễu loạn
     thì cả hình cùng phóng to — chứ nhiễu một chỗ mà các chỗ khác đứng yên thì thành ra
     đang thử một hình méo, không phải thử đổi kích thước. */
  const scaleGuess = () => guess('kích-thước', 1, {
    kind: KIND.MISSING, label: 'kích thước hình',
    why: 'đề không cho độ dài nào (cạnh đáy, cạnh bên, hay một đoạn cụ thể)' });
  const s = baseSide ?? L(names[0], names[1]) ?? scaleGuess();

  const set = (nm, x, y) => P[nm] = [x, y, 0];

  if (n === 3) {
    const [A, B, C] = names;
    const tm = t.match(new RegExp(`tam giác\\s*(?:${names.join('')})?\\s*(đều|vuông cân|vuông|cân)(?:\\s*tại\\s*([A-Z]))?`));
    const kind = /tứ diện đều|tam giác đều/.test(t) && !(tm && tm[1] !== 'đều') ? 'đều' : tm ? tm[1] : null;

    if (kind === 'đều') {
      set(A, 0, 0); set(B, s, 0); set(C, s / 2, s * Math.sqrt(3) / 2);

    } else if (kind && kind.startsWith('vuông') && tm[2] && names.includes(tm[2])) {
      const X = tm[2], [o1, o2] = names.filter(v => v !== X), h = L(o1, o2);
      let a1 = L(X, o1), a2 = L(X, o2);
      if (kind === 'vuông cân') { a1 = a1 ?? a2 ?? (h ? h / Math.SQRT2 : s); a2 = a1; }
      if (a1 == null && a2 != null && h) a1 = Math.sqrt(h * h - a2 * a2);
      if (a2 == null && a1 != null && h) a2 = Math.sqrt(h * h - a1 * a1);
      if (a1 == null) a1 = guess('cạnh-góc-vuông-1', s, {
        kind: KIND.MISSING, label: `cạnh ${X}${o1}`, why: `không thấy ${X}${o1} = …` });
      if (a2 == null) a2 = guess('cạnh-góc-vuông-2', a1, {
        kind: KIND.MISSING, label: `cạnh ${X}${o2}`, why: `không thấy ${X}${o2} = …` });
      set(X, 0, 0); set(o1, a1, 0); set(o2, 0, a2);

    } else if (kind === 'cân' && tm[2] && names.includes(tm[2])) {
      const X = tm[2], [o1, o2] = names.filter(v => v !== X), b = L(o1, o2) ?? s, l = L(X, o1) ?? L(X, o2);
      const h = l && l > b / 2 ? Math.sqrt(l * l - b * b / 4) : guess('cạnh-bên-đáy', b, {
        kind: KIND.MISSING, label: `cạnh bên của tam giác cân ${names.join('')}`,
        why: `không thấy ${X}${o1} hay ${X}${o2} = …` });
      set(o1, 0, 0); set(o2, b, 0); set(X, b / 2, h);

    } else {
      const a = L(B, C), b = L(C, A), c = L(A, B) ?? s;
      if (a && b) {
        const x = (b * b + c * c - a * a) / (2 * c);
        set(A, 0, 0); set(B, c, 0); set(C, x, Math.sqrt(Math.max(b * b - x * x, 1e-6)));
      } else {
        const k = guess('dáng-tam-giác', 1, {
          kind: KIND.MISSING, mode: 'shape', label: `hình dạng tam giác ${names.join('')}`,
          why: 'chỉ biết một cạnh — thiếu hai cạnh còn lại, hoặc thiếu góc, hoặc thiếu chữ "đều/cân/vuông"' });
        set(A, 0, 0); set(B, c, 0); set(C, c * .3 * k, c * .85);
      }
    }

  } else if (n === 4) {
    const [A, B, C, D] = names;

    if (/thang/.test(t)) {
      let Q = [A, B, C, D];
      const pm = t.match(/([A-Z])([A-Z])\s*(?:\/\/|∥|song song(?:\s*với)?)\s*([A-Z])([A-Z])/);
      const rm = t.match(/vuông\s*tại\s*([A-Z])\s*(?:và|,)\s*([A-Z])/);
      const pair = pm ? [pm[1], pm[2]] : rm ? null : [A, B];
      if (pair) {
        const st = new Set(pair);
        if ((st.has(B) && st.has(C)) || (st.has(D) && st.has(A))) Q = [B, C, D, A];
      } else {
        const st = new Set([rm[1], rm[2]]);
        if ((st.has(A) && st.has(B)) || (st.has(C) && st.has(D))) Q = [B, C, D, A];
      }
      const L1 = L(Q[0], Q[1]) ?? guess('đáy-lớn', 2 * s, {
        kind: KIND.MISSING, label: `đáy lớn ${Q[0]}${Q[1]}`, why: `không thấy ${Q[0]}${Q[1]} = …` });
      const L2 = L(Q[2], Q[3]) ?? guess('đáy-nhỏ', L1 / 2, {
        kind: KIND.MISSING, label: `đáy nhỏ ${Q[2]}${Q[3]}`, why: `không thấy ${Q[2]}${Q[3]} = …` });
      const missH = lab => guess('chiều-cao-đáy', L1 / 2, {
        kind: KIND.MISSING, label: `chiều cao hình thang (${lab})`, why: `không thấy ${lab} = …` });
      const r1 = t.match(/vuông\s*tại\s*([A-Z])/), rv = r1 ? r1[1] : null;
      let h;
      if (rv && (rv === Q[0] || rv === Q[3])) {
        h = L(Q[0], Q[3]) ?? missH(`${Q[0]}${Q[3]}`);
        set(Q[0], 0, 0); set(Q[1], L1, 0); set(Q[2], L2, h); set(Q[3], 0, h);
      } else if (rv && (rv === Q[1] || rv === Q[2])) {
        h = L(Q[1], Q[2]) ?? missH(`${Q[1]}${Q[2]}`);
        set(Q[0], 0, 0); set(Q[1], L1, 0); set(Q[2], L1, h); set(Q[3], L1 - L2, h);
      } else {
        const leg = L(Q[0], Q[3]) ?? L(Q[1], Q[2]), dx = (L1 - L2) / 2;
        h = leg && leg > Math.abs(dx) ? Math.sqrt(leg * leg - dx * dx) : missH('cạnh bên');
        set(Q[0], 0, 0); set(Q[1], L1, 0); set(Q[3], dx, h); set(Q[2], dx + L2, h);
      }

    } else if (/thoi|bình hành/.test(t)) {
      const s2 = /thoi/.test(t) ? s : (L(A, D) ?? L(B, C) ?? guess('cạnh-đáy-2', s * 1.5, {
        kind: KIND.MISSING, label: `cạnh ${A}${D}`, why: `không thấy ${A}${D} hay ${B}${C} = …` }));
      const am = t.match(/góc\s*([A-Z])([A-Z])([A-Z])\s*(?:=|bằng)\s*(\d+)/);
      let ang;
      if (am) { ang = +am[4]; if (am[2] === B || am[2] === D) ang = 180 - ang; }
      else ang = guess('góc-đáy', 60, {
        kind: KIND.MISSING, mode: 'angle', label: `góc của hình ${/thoi/.test(t) ? 'thoi' : 'bình hành'}`,
        why: 'không thấy số đo góc nào của đáy' });
      const r = ang * Math.PI / 180;
      set(A, 0, 0); set(B, s, 0); set(D, s2 * Math.cos(r), s2 * Math.sin(r));
      set(C, s + s2 * Math.cos(r), s2 * Math.sin(r));

    } else if (/tứ giác/.test(t) && !/tứ giác đều/.test(t)) {
      /* Đề nói rõ "tứ giác" mà không ràng buộc gì thêm → hình dạng tự do thật sự,
         không phải thiếu dữ kiện. Vẫn vẽ, vẫn trả lời, chỉ ghi chú là ứng với hình đang vẽ. */
      const k = baseSide ?? scaleGuess();
      const f = guess('dáng-tứ-giác', 1, {
        kind: KIND.FREE, mode: 'shape', label: `hình dạng tứ giác ${names.join('')}`,
        why: 'đề chỉ nói "tứ giác", không ràng buộc hình dạng' });
      set(A, 0, 0); set(B, 2.4 * k, 0); set(C, 1.9 * k * f, 1.8 * k); set(D, .5 * k, 1.2 * k * f);

    } else {
      const sq = /hình vuông|tứ giác đều|lập phương/.test(t) || !/chữ nhật|hình hộp/.test(t);
      let s1 = L(A, B) ?? L(C, D) ?? baseSide ?? scaleGuess(), s2 = L(B, C) ?? L(A, D);
      const dg = L(A, C) ?? L(B, D);
      if (sq) {
        if (!L(A, B) && !baseSide && dg) s1 = dg / Math.SQRT2;
        s2 = s1;
      } else if (s2 == null) {
        s2 = dg && dg > s1 ? Math.sqrt(dg * dg - s1 * s1) : guess('cạnh-đáy-2', s1 * 1.6, {
          kind: KIND.MISSING, label: `cạnh ${B}${C}`, why: `không thấy ${B}${C}, ${A}${D}, hay đường chéo = …` });
      }
      set(A, 0, 0); set(B, s1, 0); set(C, s1, s2); set(D, 0, s2);
    }

  } else {
    const R = s / (2 * Math.sin(Math.PI / n));
    names.forEach((nm, i) => {
      const a = 2 * Math.PI * i / n - Math.PI / 2 - Math.PI / n;
      set(nm, R * Math.cos(a), R * Math.sin(a));
    });
  }

  return P;
}
