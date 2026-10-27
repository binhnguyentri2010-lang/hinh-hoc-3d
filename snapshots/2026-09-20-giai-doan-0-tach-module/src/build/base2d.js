/* Dựng đa giác đáy trong mặt phẳng z = 0.
   Trích nguyên văn từ legacy/index.html dòng 139–197. Biến tự do của closure cũ
   (t, baseSide, L) nay truyền vào qua ctx — logic không đổi một dòng nào.

   ctx.t        đề đã chuẩn hoá
   ctx.baseSide cạnh đáy đọc được từ đề, hoặc undefined
   ctx.L(p,q)   độ dài đoạn pq đọc được từ đề, hoặc undefined

   TODO Giai đoạn 1 — những chỗ dưới đây đang ĐOÁN khi đề không cho đủ, cần gắn nhãn
   origin và chặn kết quả phụ thuộc chúng:
     · s = 1 khi không có cạnh nào          → 'tự do'
     · tam giác thường c*.3, c*.85          → 'tự do'
     · tứ giác lồi 2.4k, 1.9k, 1.8k…        → 'tự do'
     · góc hình thoi mặc định 60°           → 'thiếu' nếu đề hỏi số đo
     · hình thang L2 = L1/2, h = L1/2       → 'thiếu' nếu đề hỏi số đo
     · hình chữ nhật s2 = s1*1.6            → 'thiếu' */

export function base2D(ctx, names) {
  const { t, baseSide, L } = ctx;
  const n = names.length, s = baseSide ?? L(names[0], names[1]) ?? 1, P = {};
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
      a1 = a1 ?? s; a2 = a2 ?? a1;
      set(X, 0, 0); set(o1, a1, 0); set(o2, 0, a2);

    } else if (kind === 'cân' && tm[2] && names.includes(tm[2])) {
      const X = tm[2], [o1, o2] = names.filter(v => v !== X), b = L(o1, o2) ?? s, l = L(X, o1) ?? L(X, o2);
      const h = l && l > b / 2 ? Math.sqrt(l * l - b * b / 4) : b;
      set(o1, 0, 0); set(o2, b, 0); set(X, b / 2, h);

    } else {
      const a = L(B, C), b = L(C, A), c = L(A, B) ?? s;
      if (a && b) {
        const x = (b * b + c * c - a * a) / (2 * c);
        set(A, 0, 0); set(B, c, 0); set(C, x, Math.sqrt(Math.max(b * b - x * x, 1e-6)));
      } else {
        set(A, 0, 0); set(B, c, 0); set(C, c * .3, c * .85);
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
      const L1 = L(Q[0], Q[1]) ?? 2 * s / (L(Q[0], Q[1]) ? 1 : 1), L2 = L(Q[2], Q[3]) ?? L1 / 2;
      const r1 = t.match(/vuông\s*tại\s*([A-Z])/), rv = r1 ? r1[1] : null;
      let h;
      if (rv && (rv === Q[0] || rv === Q[3])) {
        h = L(Q[0], Q[3]) ?? L1 / 2;
        set(Q[0], 0, 0); set(Q[1], L1, 0); set(Q[2], L2, h); set(Q[3], 0, h);
      } else if (rv && (rv === Q[1] || rv === Q[2])) {
        h = L(Q[1], Q[2]) ?? L1 / 2;
        set(Q[0], 0, 0); set(Q[1], L1, 0); set(Q[2], L1, h); set(Q[3], L1 - L2, h);
      } else {
        const leg = L(Q[0], Q[3]) ?? L(Q[1], Q[2]), dx = (L1 - L2) / 2;
        h = leg && leg > Math.abs(dx) ? Math.sqrt(leg * leg - dx * dx) : L1 / 2;
        set(Q[0], 0, 0); set(Q[1], L1, 0); set(Q[3], dx, h); set(Q[2], dx + L2, h);
      }

    } else if (/thoi|bình hành/.test(t)) {
      const s2 = /thoi/.test(t) ? s : (L(A, D) ?? L(B, C) ?? s * 1.5);
      const am = t.match(/góc\s*([A-Z])([A-Z])([A-Z])\s*(?:=|bằng)\s*(\d+)/);
      let ang = 60;
      if (am) { ang = +am[4]; if (am[2] === B || am[2] === D) ang = 180 - ang; }
      const r = ang * Math.PI / 180;
      set(A, 0, 0); set(B, s, 0); set(D, s2 * Math.cos(r), s2 * Math.sin(r));
      set(C, s + s2 * Math.cos(r), s2 * Math.sin(r));

    } else if (/tứ giác/.test(t) && !/tứ giác đều/.test(t)) {
      const k = baseSide ?? 1;
      set(A, 0, 0); set(B, 2.4 * k, 0); set(C, 1.9 * k, 1.8 * k); set(D, .5 * k, 1.2 * k);

    } else {
      const sq = /hình vuông|tứ giác đều|lập phương/.test(t) || !/chữ nhật|hình hộp/.test(t);
      let s1 = L(A, B) ?? L(C, D) ?? baseSide ?? 1, s2 = L(B, C) ?? L(A, D);
      const dg = L(A, C) ?? L(B, D);
      if (sq) { if (!L(A, B) && !baseSide && dg) s1 = dg / Math.SQRT2; s2 = s1; }
      else s2 = s2 ?? (dg && dg > s1 ? Math.sqrt(dg * dg - s1 * s1) : s1 * 1.6);
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
