/* Xuất hình ra SVG và PNG để dán vào Word, vào đề kiểm tra, vào vở.

   Làm được là nhờ Giai đoạn 3 đã tính được cạnh nào khuất (src/render/hidden.js). Bản cũ
   dùng mẹo bộ đệm chiều sâu nên chỉ trình duyệt "biết" chỗ nào khuất, còn mã thì không —
   không thể sinh ra nét đứt trên giấy.

   Một mạch code cho cả hai định dạng: dựng SVG trước, PNG vẽ lại chính SVG đó lên canvas.
   Nền trắng, nét đen, đúng kiểu hình trong sách chứ không phải ảnh chụp màn hình nền tối.

   Dải băng "HÌNH MINH HOẠ · chưa đủ dữ kiện" đi theo cả ảnh xuất ra — để một hình sai tỉ lệ
   không lặng lẽ lan ra ngoài khi học sinh gửi cho nhau. */

import { Vector3 } from 'three';
import { sub, add, mul, len, avg } from '../core/vec.js';
import { splitByView } from './hidden.js';

const MAU = {
  nen: '#ffffff',
  canh: '#14181f',
  phu: '#a8620a',
  chan: '#c2185b',
  giao: '#c2185b',
  mat: 'rgba(20,24,31,.045)',
  matHi: 'rgba(24,120,72,.10)',
  ov: ['rgba(24,120,72,.13)', 'rgba(120,60,150,.13)', 'rgba(190,140,20,.13)'],
  chu: '#14181f',
  chuPhu: '#a8620a',
  chuGiao: '#c2185b',
  bangThieu: '#c2185b',
  bangNhe: '#6b7280',
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = v => Math.round(v * 100) / 100;

/* Nhãn bị chồng lên nhau thì đẩy nhau ra. Hình chỉ có 5–6 điểm thì không sao, nhưng thiết
   diện thêm I, J, K vào là chồng ngay — mà ảnh xuất ra thì không xoay được để nhìn cho rõ. */
function giaiToaNhan(nhan, r = 15, toiDa = 34) {
  for (let lan = 0; lan < 80; lan++) {
    let doi = false;
    for (let i = 0; i < nhan.length; i++)
      for (let j = i + 1; j < nhan.length; j++) {
        const a = nhan[i], b = nhan[j];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d > 2 * r || d < 1e-9) continue;
        const day = (2 * r - d) / 2, ux = dx / d, uy = dy / d;
        a.x -= ux * day; a.y -= uy * day;
        b.x += ux * day; b.y += uy * day;
        doi = true;
      }
    if (!doi) break;
  }
  /* Đẩy xa quá thì nhãn rời khỏi điểm của nó — kéo lại trong tầm. */
  for (const n of nhan) {
    const dx = n.x - n.ax, dy = n.y - n.ay, d = Math.hypot(dx, dy);
    if (d > toiDa) { n.x = n.ax + dx / d * toiDa; n.y = n.ay + dy / d * toiDa; }
  }
}

/* viewer.duLieuXuat() → chuỗi SVG. */
export function xuatSVG(dl, opts = {}) {
  const { res, fd, huong, camera, hien, KHOA, selOv } = dl;
  const rong = opts.rong || 1000;
  const [vw, vh] = dl.size;
  const cao = Math.round(rong * vh / vw);

  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();

  /* toạ độ toán học → điểm trên ảnh */
  const chieu = p => {
    const v = new Vector3(p[0], p[2], -p[1]).project(camera);
    return { x: (v.x + 1) / 2 * rong, y: (1 - v.y) / 2 * cao };
  };

  const pts = res.pts;
  const ve = [];      // các nét
  const diem = [];    // chấm điểm
  const nhan = [];    // nhãn

  const duong = (a, b, mau, w, dut) => {
    const p = chieu(a), q = chieu(b);
    if (!isFinite(p.x) || !isFinite(q.x)) return;
    ve.push(`<line x1="${num(p.x)}" y1="${num(p.y)}" x2="${num(q.x)}" y2="${num(q.y)}" ` +
      `stroke="${mau}" stroke-width="${w}" stroke-linecap="round"` +
      (dut ? ` stroke-dasharray="7 5" opacity=".72"` : '') + `/>`);
  };

  const daGiac = (ns, to) => {
    const d = ns.map(n => chieu(typeof n === 'string' ? pts[n] : n));
    if (d.some(p => !isFinite(p.x))) return;
    ve.push(`<polygon points="${d.map(p => `${num(p.x)},${num(p.y)}`).join(' ')}" fill="${to}" stroke="none"/>`);
  };

  /* mặt của khối, rồi mặt được tô sáng theo câu hỏi */
  res.faces.forEach(f => daGiac(f, MAU.mat));
  const daTo = new Set();
  res.planesHi.forEach(pl => { const k = pl.join(''); if (!daTo.has(k)) { daTo.add(k); daGiac(pl, MAU.matHi); } });

  /* lớp phủ của câu hỏi đang chọn */
  const ovs = res.R.map((r, i) => (r.ov && (selOv === -1 || selOv === i)) ? r.ov : null).filter(Boolean);
  ovs.forEach(ov => ov.planes.forEach((pl, i) => daGiac(pl, MAU.ov[i % 3])));

  /* cạnh khối: nét liền nếu nhìn thấy, nét đứt nếu khuất */
  res.edges.forEach(([a, b]) => duong(pts[a], pts[b], MAU.canh, 2, !hien.has(KHOA(a, b))));

  /* đường phụ: cắt thành khúc khuất / không khuất */
  const P = p => typeof p === 'string' ? pts[p] : p;
  res.aux.forEach(([a, b]) => {
    const pa = P(a), pb = P(b);
    if (!pa || !pb || len(sub(pa, pb)) < 1e-9) return;
    for (const k of splitByView(pa, pb, fd, huong))
      duong(add(pa, mul(sub(pb, pa), k.t0)), add(pa, mul(sub(pb, pa), k.t1)), MAU.phu, 1.6, k.khuat);
  });

  ovs.forEach(ov => ov.segs.forEach(([a, b, k]) => {
    if (len(sub(a, b)) < 1e-9) return;
    duong(a, b, k === 'inter' ? MAU.giao : MAU.phu, k === 'inter' ? 2.6 : 1.6, false);
  }));

  /* điểm và nhãn */
  const tam = chieu(avg(Object.values(pts)));
  const themNhan = (p, ten, mau, banKinh, mauChu) => {
    const q = chieu(p);
    if (!isFinite(q.x)) return;
    diem.push(`<circle cx="${num(q.x)}" cy="${num(q.y)}" r="${banKinh}" fill="${mau}"/>`);
    if (!ten) return;
    let dx = q.x - tam.x, dy = q.y - tam.y;
    const d = Math.hypot(dx, dy) || 1;
    nhan.push({ ten, ax: q.x, ay: q.y, x: q.x + dx / d * 17, y: q.y + dy / d * 17, mau: mauChu });
  };

  for (const [n, p] of Object.entries(pts)) themNhan(p, n, MAU.canh, 3, MAU.chu);
  res.feet.forEach(p => themNhan(p, null, MAU.chan, 2.6));
  ovs.forEach(ov => { for (const [n, p] of Object.entries(ov.names)) themNhan(p, n, MAU.giao, 3, MAU.chuGiao); });

  giaiToaNhan(nhan);
  const chuNhan = nhan.map(n =>
    `<text x="${num(n.x)}" y="${num(n.y + 5)}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" ` +
    `font-size="17" font-style="italic" font-weight="600" fill="${n.mau}">${esc(n.ten)}</text>`);

  /* cắt sát nội dung cho khỏi thừa nền trắng */
  const toaDo = [...Object.values(pts), ...res.feet].map(chieu).filter(p => isFinite(p.x));
  ovs.forEach(ov => { for (const p of Object.values(ov.names)) { const q = chieu(p); if (isFinite(q.x)) toaDo.push(q); } });
  const le = 46;
  let x0 = Math.min(...toaDo.map(p => p.x)) - le, x1 = Math.max(...toaDo.map(p => p.x)) + le;
  let y0 = Math.min(...toaDo.map(p => p.y)) - le, y1 = Math.max(...toaDo.map(p => p.y)) + le;

  /* dải băng cảnh báo, nếu hình không đúng tỉ lệ */
  const muc = res.trust ? res.trust.level : 'đủ';
  let bang = '';
  if (muc !== 'đủ') {
    const chu = muc === 'thiếu'
      ? 'HÌNH MINH HOẠ · chưa đủ dữ kiện, số đo không đúng tỉ lệ'
      : 'Hình biểu diễn · tỉ lệ tuỳ ý';
    const mau = muc === 'thiếu' ? MAU.bangThieu : MAU.bangNhe;
    y0 -= 30;
    bang = `<text x="${num((x0 + x1) / 2)}" y="${num(y0 + 20)}" text-anchor="middle" ` +
      `font-family="system-ui,'Segoe UI',sans-serif" font-size="14" font-weight="600" fill="${mau}">${esc(chu)}</text>`;
  }

  const W = num(x1 - x0), H = num(y1 - y0);
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${num(x0)} ${num(y0)} ${W} ${H}">` +
      `<rect x="${num(x0)}" y="${num(y0)}" width="${W}" height="${H}" fill="${MAU.nen}"/>` +
      bang + ve.join('') + diem.join('') + chuNhan.join('') + `</svg>`,
    rong: x1 - x0, cao: y1 - y0,
  };
}

/* SVG → PNG, qua canvas. scale 2 cho ảnh nét trên màn hình độ phân giải cao. */
export function svgSangPNG(svg, rong, cao, scale = 2) {
  return new Promise((ok, loi) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = Math.round(rong * scale); cv.height = Math.round(cao * scale);
      const c = cv.getContext('2d');
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, cv.width, cv.height);
      c.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob(b => b ? ok(b) : loi(new Error('Không tạo được PNG')), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); loi(new Error('Không đọc được SVG vừa dựng')); };
    img.src = url;
  });
}

export function taiVe(blob, ten) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = ten;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Chép ảnh vào clipboard để dán thẳng vào Word. Cần ngữ cảnh an toàn (localhost tính là an
   toàn, file:// thì không) nên phải có đường lui. */
export async function chepVaoClipboard(blob) {
  if (!navigator.clipboard || !window.ClipboardItem) throw new Error('Trình duyệt không cho chép ảnh');
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}
