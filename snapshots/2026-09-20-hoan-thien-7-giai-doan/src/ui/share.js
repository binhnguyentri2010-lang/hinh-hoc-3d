/* Lưu và chia sẻ — hoàn toàn ngoại tuyến, không máy chủ, không tài khoản.

   Ba đường:
     · Thư viện trong máy (localStorage) — mở lại bài đã vẽ
     · File .json — gửi qua Zalo, USB, email
     · Mã đề — chuỗi chữ copy dán cho nhau, không cần gửi file

   Lưu cả `supply` chứ không chỉ câu chữ của đề: người dùng đã sửa tay hay kéo điểm thì mở
   lại phải ra đúng hình đó, không phải hình mặc định. */

const KHOA = 'hhkg.thuvien.v1';

export function docThuVien() {
  try { return JSON.parse(localStorage.getItem(KHOA) || '[]'); } catch (e) { return []; }
}

function ghiThuVien(ds) {
  try { localStorage.setItem(KHOA, JSON.stringify(ds)); return true; }
  catch (e) { return false; }     // riêng tư / hết chỗ — gọi bên ngoài tự báo
}

export function luuBai(ten, de, supply) {
  const ds = docThuVien();
  const bai = { ten, de, supply: supply || {}, luc: new Date().toISOString() };
  const i = ds.findIndex(x => x.ten === ten);
  if (i >= 0) ds[i] = bai; else ds.unshift(bai);
  return ghiThuVien(ds.slice(0, 200)) ? bai : null;
}

export function xoaBai(ten) {
  return ghiThuVien(docThuVien().filter(x => x.ten !== ten));
}

/* ---------- mã đề ---------- */

/* btoa chỉ nhận byte, mà đề thì có dấu tiếng Việt — nên phải qua UTF-8 trước.
   Dùng base64url (đổi +/ thành -_) để mã dán được vào mọi chỗ, kể cả URL. */
const nen = obj => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(obj))))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const giaiNen = s => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(u));
};

export function taoMa(de, supply) {
  return 'HHKG1.' + nen({ d: de, s: supply || {} });
}

export function docMa(ma) {
  const s = String(ma).trim().replace(/\s+/g, '');
  if (!s.startsWith('HHKG1.')) throw new Error('Không phải mã đề (mã đề bắt đầu bằng HHKG1.)');
  const o = giaiNen(s.slice(6));
  if (!o || typeof o.d !== 'string') throw new Error('Mã đề hỏng hoặc bị cắt mất một phần');
  return { de: o.d, supply: o.s || {} };
}

/* ---------- file .json ---------- */

export function xuatFile(ds) {
  const blob = new Blob([JSON.stringify({ loai: 'hinh-hoc-khong-gian', v: 1, bai: ds }, null, 1)],
    { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'thu-vien-hinh-khong-gian.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function nhapFile(file) {
  return new Promise((ok, loi) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const o = JSON.parse(fr.result);
        const ds = Array.isArray(o) ? o : o.bai;
        if (!Array.isArray(ds)) throw new Error('File không đúng định dạng thư viện');
        const cu = docThuVien(), ten = new Set(cu.map(x => x.ten));
        const them = ds.filter(x => x && typeof x.de === 'string' && !ten.has(x.ten));
        ghiThuVien([...them, ...cu].slice(0, 200));
        ok(them.length);
      } catch (e) { loi(e); }
    };
    fr.onerror = () => loi(new Error('Không đọc được file'));
    fr.readAsText(file);
  });
}
