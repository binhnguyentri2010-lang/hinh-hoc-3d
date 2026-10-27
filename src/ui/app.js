/* Nối giao diện với phần lõi.

   Ba khối việc:
     · Kết quả  — đáp án, chú thích, lời giải từng bước (bấm được để xem dựng dần)
     · Dữ kiện  — BẢNG SỬA ĐƯỢC: mọi đại lượng của hình, kể cả số đề đã cho, đều gõ lại
                  hoặc kéo thanh trượt được; hình và đáp án đổi theo ngay
     · Xuất ảnh — SVG/PNG nền trắng kiểu SGK, copy thẳng vào Word

   Bảng dữ kiện nằm trong thẻ riêng và KHÔNG dựng lại khi kéo thanh trượt — dựng lại thì
   con trỏ chuột rời khỏi thanh trượt ngay giữa lúc kéo. */

import { SAMPLES } from '../../data/samples.js';
import { solve } from '../solve/engine.js';
import { norm, parseLen, parseDeg } from '../parse/normalize.js';
import { fmt } from '../core/format.js';
import { KIND } from '../solve/trust.js';
import { initViewer } from '../render/scene3d.js';
import { xuatSVG, svgSangPNG, taiVe, chepVaoClipboard } from '../render/export.js';
import { KHOI, CAU_HOI, dayNaoDung, soanDe } from './dungnhanh.js';
import { docThuVien, luuBai, xoaBai, taoMa, docMa, xuatFile, nhapFile } from './share.js';

const $ = id => document.getElementById(id);
const inp = $('inp'), out = $('out'), banner = $('banner');
const bang = $('bang'), bangCard = $('bangCard'), toast = $('toast');
const cFaces = $('cFaces'), cLbl = $('cLbl'), cRot = $('cRot'), cSS = $('cSS');

const viewer = initViewer($('view'));

/* supply: id đại lượng → giá trị đang dùng (người gõ hoặc kéo)
   supplyText: nguyên văn đã gõ, để vẽ lại ô nhập cho đúng
   gocBanDau: giá trị lúc đầu, dùng làm mốc cho khoảng của thanh trượt */
let supply = {}, supplyText = {}, gocBanDau = {}, resHienTai = null, dangPhat = null;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gonLen = v => fmt(v, 1).split('  (')[0].trim();

/* ---------- công tắc và xuất ảnh ---------- */

function pushToggles() {
  viewer.setToggles({ faces: cFaces.checked, labels: cLbl.checked, rotate: cRot.checked });
}
[cFaces, cLbl, cRot].forEach(e => e.onchange = pushToggles);
cSS.onchange = () => viewer.setPhepChieu(cSS.checked);

let toastTimer = null;
function baoTin(msg, loi = false) {
  toast.textContent = msg;
  toast.className = 'toast' + (loi ? ' bad' : '');
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, loi ? 6000 : 3000);
}

const tenFile = () => 'hinh-khong-gian-' + new Date().toISOString().slice(0, 10);

async function xuatAnh(kieu) {
  const dl = viewer.duLieuXuat();
  if (!dl || !dl.res) { baoTin('Chưa có hình để xuất', true); return; }
  try {
    const { svg, rong, cao } = xuatSVG(dl);
    if (kieu === 'svg') {
      taiVe(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), tenFile() + '.svg');
      baoTin('Đã tải file SVG');
      return;
    }
    const png = await svgSangPNG(svg, rong, cao);
    if (kieu === 'png') { taiVe(png, tenFile() + '.png'); baoTin('Đã tải file PNG'); }
    else { await chepVaoClipboard(png); baoTin('Đã copy ảnh — dán thẳng vào Word được rồi'); }
  } catch (e) {
    console.error(e);
    baoTin(kieu === 'copy'
      ? 'Không copy được vào clipboard (' + e.message + '). Dùng nút Tải PNG thay thế.'
      : 'Không xuất được ảnh: ' + e.message, true);
  }
}
$('btnPNG').onclick = () => xuatAnh('png');
$('btnSVG').onclick = () => xuatAnh('svg');
$('btnCopy').onclick = () => xuatAnh('copy');

/* ---------- tự dựng hình ---------- */

function opt(ds) { return ds.map(x => `<option value="${x.ma}">${esc(x.ten)}</option>`).join(''); }

const dKhoi = $('dKhoi'), dDay = $('dDay'), dHoi = $('dHoi');
dKhoi.innerHTML = opt(KHOI);
dHoi.innerHTML = CAU_HOI.map(x =>
  `<label><input type="checkbox" class="cHoi" value="${x.ma}"${x.ma === 'V' ? ' checked' : ''}> ${esc(x.ten)}</label>`).join('');

function capNhatOChon() {
  const k = dKhoi.value, ds = dayNaoDung(k);
  $('dDayWrap').style.display = ds ? '' : 'none';
  if (ds) dDay.innerHTML = opt(ds);
  const coC2 = k === 'hop' || (k === 'chop4' && ['chunhat', 'binhhanh', 'thang'].includes(dDay.value));
  $('dC2Wrap').style.display = coC2 ? '' : 'none';
  $('dHWrap').style.display = k === 'lapphuong' || k === 'tudiendeu' ? 'none' : '';
}
dKhoi.onchange = capNhatOChon;
dDay.onchange = capNhatOChon;
capNhatOChon();

$('dTao').onclick = () => {
  const hoi = [...document.querySelectorAll('.cHoi')].filter(e => e.checked).map(e => e.value);
  inp.value = soanDe({
    khoi: dKhoi.value, day: dDay.value,
    c: $('dC').value.trim() || 'a', c2: $('dC2').value.trim() || '2a', h: $('dH').value.trim() || 'a',
    hoi: hoi.length ? hoi : ['V'],
  });
  run();
};

/* ---------- thư viện & chia sẻ ---------- */

function veThuVien() {
  const ds = docThuVien();
  $('lDs').innerHTML = ds.length
    ? ds.map((b, i) => `<div class="baiLuu">` +
        `<button class="ghost" data-mo="${i}">${esc(b.ten)}</button>` +
        `<button class="ghost xoa" data-xoa="${i}" title="Xoá">✕</button></div>`).join('')
    : '<div style="color:var(--muted);font-size:12.3px">Chưa lưu bài nào.</div>';
  $('lDs').querySelectorAll('[data-mo]').forEach(e => e.onclick = () => {
    const b = docThuVien()[+e.dataset.mo];
    if (!b) return;
    moBai(b.de, b.supply);
    baoTin('Đã mở: ' + b.ten);
  });
  $('lDs').querySelectorAll('[data-xoa]').forEach(e => e.onclick = () => {
    const b = docThuVien()[+e.dataset.xoa];
    if (b) { xoaBai(b.ten); veThuVien(); }
  });
}

function moBai(de, sup) {
  dungPhat();
  inp.value = de;
  supply = { ...(sup || {}) };
  supplyText = {}; gocBanDau = {};
  giaiVaVe(true);
}

$('lLuu').onclick = () => {
  const ten = ($('lTen').value || '').trim() || inp.value.slice(4, 44).trim() + '…';
  if (!inp.value.trim()) { baoTin('Chưa có đề để lưu', true); return; }
  if (luuBai(ten, inp.value, supply)) { $('lTen').value = ''; veThuVien(); baoTin('Đã lưu: ' + ten); }
  else baoTin('Không lưu được — trình duyệt đang chặn bộ nhớ cục bộ (chế độ riêng tư?)', true);
};

$('lMa').onclick = () => {
  if (!inp.value.trim()) { baoTin('Chưa có đề', true); return; }
  const ma = taoMa(inp.value, supply);
  $('lMaO').value = ma;
  $('lMaO').select();
  try { navigator.clipboard.writeText(ma); baoTin('Đã tạo mã đề và copy vào clipboard'); }
  catch (e) { baoTin('Đã tạo mã đề — copy ô bên dưới để gửi'); }
};

$('lDan').onclick = () => {
  try {
    const { de, supply: sup } = docMa($('lMaO').value);
    moBai(de, sup);
    baoTin('Đã mở bài từ mã đề');
  } catch (e) { baoTin(e.message, true); }
};

$('lXuat').onclick = () => {
  const ds = docThuVien();
  if (!ds.length) { baoTin('Thư viện đang trống', true); return; }
  xuatFile(ds); baoTin(`Đã xuất ${ds.length} bài ra file`);
};

$('lNhap').onclick = () => $('lFile').click();
$('lFile').onchange = async e => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  try { const n = await nhapFile(f); veThuVien(); baoTin(`Đã nhập thêm ${n} bài`); }
  catch (err) { baoTin('Không nhập được: ' + err.message, true); }
  e.target.value = '';
};

veThuVien();

/* ---------- đề mẫu ---------- */

const sd = $('samples');
SAMPLES.forEach((s, i) => {
  const b = document.createElement('button');
  b.className = 'ghost';
  b.textContent = `${i + 1}. ${s.slice(4, 80)}…`;
  b.onclick = () => { inp.value = s; run(); };
  sd.appendChild(b);
});

/* ---------- dải băng tin cậy ---------- */

function setBanner(trust) {
  if (!trust || trust.level === 'đủ') { banner.style.display = 'none'; return; }
  banner.style.display = '';
  if (trust.level === 'thiếu') {
    banner.className = 'banner thieu';
    banner.textContent = 'HÌNH MINH HOẠ · chưa đủ dữ kiện, số đo không đúng tỉ lệ';
  } else {
    banner.className = 'banner bieudien';
    banner.textContent = 'Hình biểu diễn · tỉ lệ tuỳ ý, như hình vẽ trong sách';
  }
}

/* ---------- bảng dữ kiện sửa được ---------- */

const NHAN_LOAI = {
  [KIND.GIVEN]: ['đề cho', 'k-cho'],
  [KIND.DERIVED]: ['suy ra', 'k-suyra'],
  [KIND.FREE]: ['tự do', 'k-tudo'],
  [KIND.MISSING]: ['thiếu', 'k-thieu'],
  [KIND.SUPPLIED]: ['bạn nhập', 'k-nhap'],
};

function khoangTruot(g) {
  const goc = gocBanDau[g.id];
  if (g.mode === 'angle') return { min: 10, max: 170, step: .5 };
  if (g.mode === 'ratio') return { min: .05, max: .95, step: .005 };
  const b = goc || 1;
  return { min: +(b * .15).toFixed(6), max: +(b * 3).toFixed(6), step: +(b / 200).toFixed(6) };
}

function hienGiaTri(g) {
  if (g.mode === 'angle') return String(+g.value.toFixed(2));
  if (g.mode === 'ratio') return String(+g.value.toFixed(3));
  return gonLen(g.value);
}

function dongDuLieu(g) {
  const [nhan, cls] = NHAN_LOAI[g.kind] || ['?', ''];
  const kt = khoangTruot(g);
  const txt = supplyText[g.id] ?? hienGiaTri(g);
  const mode = g.mode === 'angle' ? 'angle' : g.mode === 'ratio' ? 'ratio' : 'len';
  return `<div class="dk ${cls}">
      <span class="ten">${esc(g.label || g.id)}</span>
      <span class="loai">${esc(nhan)}</span>
      <div class="haiO">
        <input type="text" data-gid="${esc(g.id)}" data-mode="${mode}" value="${esc(txt)}">
        <input type="range" data-gid="${esc(g.id)}" data-mode="${mode}"
               min="${kt.min}" max="${kt.max}" step="${kt.step}" value="${g.value}">
      </div>
    </div>`;
}

function renderBang(res) {
  const gs = (res.trust && res.trust.guesses) || [];
  if (!gs.length) { bangCard.style.display = 'none'; return; }
  gs.forEach(g => { if (gocBanDau[g.id] === undefined) gocBanDau[g.id] = g.goc ?? g.value; });
  /* Thiếu lên trước — đó là thứ người dùng cần xử lý ngay. */
  const uuTien = { [KIND.MISSING]: 0, [KIND.SUPPLIED]: 1, [KIND.FREE]: 2, [KIND.DERIVED]: 3, [KIND.GIVEN]: 4 };
  const sx = gs.slice().sort((a, b) => (uuTien[a.kind] ?? 9) - (uuTien[b.kind] ?? 9));
  bangCard.style.display = '';
  bang.innerHTML = sx.map(dongDuLieu).join('');
  noiBang();
}

function docO(el) {
  const raw = el.value.trim();
  if (el.type === 'range') return parseFloat(raw);
  if (!raw) return null;
  return el.dataset.mode === 'angle' ? parseDeg(raw)
       : el.dataset.mode === 'ratio' ? (v => Number.isFinite(v) && v > 0 && v < 1 ? v : undefined)(parseFloat(raw.replace(',', '.')))
       : parseLen(raw);
}

function noiBang() {
  bang.querySelectorAll('input[type=text]').forEach(el => {
    const ap = () => {
      const id = el.dataset.gid, v = docO(el);
      if (v === null) { delete supply[id]; delete supplyText[id]; giaiVaVe(true); return; }
      if (v === undefined) { el.classList.add('xau'); return; }
      el.classList.remove('xau');
      supply[id] = v; supplyText[id] = el.value.trim();
      giaiVaVe(true);
    };
    el.addEventListener('change', ap);
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ap(); } });
  });

  /* Kéo thanh trượt: KHÔNG dựng lại bảng (mất con trỏ giữa lúc kéo) và KHÔNG ngắm lại
     camera (hình sẽ giật mỗi nấc kéo). Chỉ cập nhật hình và đáp án. */
  let cho = null;
  bang.querySelectorAll('input[type=range]').forEach(el => {
    el.addEventListener('input', () => {
      const id = el.dataset.gid, v = parseFloat(el.value);
      if (!Number.isFinite(v)) return;
      supply[id] = v;
      if (el.dataset.mode === 'angle') {
        supplyText[id] = String(+v.toFixed(1));
        const o = bang.querySelector(`input[type=text][data-gid="${CSS.escape(id)}"]`);
        if (o) o.value = supplyText[id];
      } else capNhatOSo(id, v, el.dataset.mode);
      if (cho) cancelAnimationFrame(cho);
      cho = requestAnimationFrame(() => { cho = null; giaiVaVe(false, true); });
    });
    /* Chốt chặn: requestAnimationFrame bị bỏ qua khi tab chạy nền hoặc trình duyệt tiết kiệm
       khung hình, lúc đó giá trị cuối của cú kéo sẽ mất. 'change' bắn khi thả tay nên luôn
       áp được giá trị cuối cùng. */
    el.addEventListener('change', () => {
      if (cho) { cancelAnimationFrame(cho); cho = null; }
      giaiVaVe(false, true);
    });
  });
}

/* ---------- kéo điểm tự do trên hình ---------- */

function capNhatOSo(id, v, mode) {
  supplyText[id] = mode === 'ratio' ? String(+v.toFixed(3)) : gonLen(v);
  const o = bang.querySelector(`input[type=text][data-gid="${CSS.escape(id)}"]`);
  if (o) { o.value = supplyText[id]; o.classList.remove('xau'); }
  const sl = bang.querySelector(`input[type=range][data-gid="${CSS.escape(id)}"]`);
  if (sl) sl.value = v;
  const hang = o && o.closest('.dk');
  if (hang) {
    hang.className = 'dk k-nhap';
    const nh = hang.querySelector('.loai');
    if (nh) nh.textContent = 'bạn nhập';
  }
}

function noiKeoDiem(res) {
  const gs = (res.trust && res.trust.guesses) || [];
  const list = gs.filter(g => g.mode === 'ratio' && g.canh && res.pts[g.diem] &&
                              res.pts[g.canh[0]] && res.pts[g.canh[1]])
                 .map(g => ({ id: g.id, p: res.pts[g.diem], a: res.pts[g.canh[0]], b: res.pts[g.canh[1]] }));
  viewer.setKeoDuoc(list, (id, t) => {
    supply[id] = t;
    capNhatOSo(id, t, 'ratio');
    giaiVaVe(false, true);
  });
}

/* ---------- kết quả ---------- */

function trustHTML(res) {
  const tr = res.trust;
  if (!tr || tr.level !== 'thiếu') return '';
  return `<div class="miss"><h4>⛔ Chưa đủ dữ kiện để tính</h4>` +
    tr.missingUsed.map(g => `<div class="item">
      <div class="lab">${esc(g.label || g.id)}</div>
      <div class="why">Đã tìm: ${esc(g.why || '')} — không thấy.</div>
      <div class="hint2">Nhập giá trị ở bảng “Dữ kiện — sửa được” bên dưới.</div>
    </div>`).join('') + `</div>`;
}

function renderKetQua(res) {
  const coords = Object.entries(res.pts)
    .map(([n, p]) => `${n.padEnd(3)} (${p.map(v => +v.toFixed(3)).join(', ')})`).join('\n');

  out.innerHTML = `<h3>Kết quả</h3><div style="margin-bottom:6px">🔷 <b style="color:var(--accent)">${esc(res.S.label)}</b></div>` +
    trustHTML(res) +
    (res.R.some(r => r.ov) ? '<button class="ghost" id="allOv" style="margin-bottom:4px">👁 Hiện tất cả</button>' : '') +
    (res.R.length
      ? res.R.map((r, i) => `<div class="res${r.blocked ? ' chan' : ''}"${r.ov ? ` data-i="${i}"` : ''}>` +
          `${esc(r.q)}<br><b>${esc(r.a)}</b>` +
          (r.note ? `<div class="note">↔ ${esc(r.note)}</div>` : '') +
          (r.chuThich && !r.blocked ? `<div class="step">↳ ${esc(r.chuThich)}</div>` : '') +
          (r.steps || []).map((s, j) =>
            `<div class="step"${r.ov ? ` data-r="${i}" data-b="${j}"` : ''}>• ${esc(s)}</div>`).join('') +
          (r.ov && r.ov.soBuoc ? `<div class="buocBar" data-r="${i}">` +
            `<button class="mini" data-act="lui">◀</button>` +
            `<span class="buocSo">trọn bài</span>` +
            `<button class="mini" data-act="toi">▶</button>` +
            `<button class="mini" data-act="phat">▶ Phát</button>` +
            `<button class="mini" data-act="het">Hiện hết</button></div>` : '') +
          `</div>`).join('')
      : '<div style="color:var(--muted)">Không thấy câu hỏi “Tính …” nào — chỉ vẽ hình.</div>') +
    res.W.map(w => `<div class="warn">⚠ ${esc(w)}</div>`).join('') +
    `<details><summary>Tọa độ (a = 1)</summary><pre>${esc(coords)}</pre></details>`;

  out.querySelectorAll('.res[data-i]').forEach(e =>
    e.onclick = () => { dungPhat(); viewer.setOverlay(+e.dataset.i); syncSel(); });
  const ab = $('allOv');
  if (ab) ab.onclick = () => { dungPhat(); viewer.setOverlay(-1); syncSel(); };
  wireBuoc();
  syncSel();
}

/* ---------- trình chiếu lời giải từng bước ---------- */

function dungPhat() { clearInterval(dangPhat); dangPhat = null; }

function syncSel() {
  const sel = viewer.getOverlay();
  out.querySelectorAll('.res[data-i]').forEach(e => e.classList.toggle('sel', +e.dataset.i === sel));
  syncBuoc();
}

function syncBuoc() {
  const sel = viewer.getOverlay(), b = viewer.getBuoc();
  out.querySelectorAll('.step[data-b]').forEach(e => {
    const cua = +e.dataset.r === sel, j = +e.dataset.b;
    e.classList.toggle('dangO', cua && b >= 0 && j === b);
    e.classList.toggle('chuaToi', cua && b >= 0 && j > b);
  });
  out.querySelectorAll('.buocBar').forEach(bar => {
    const cua = +bar.dataset.r === sel;
    const n = viewer.soBuocCuaLop(+bar.dataset.r) || 0;
    bar.querySelector('.buocSo').textContent =
      !cua || b < 0 ? 'trọn bài' : b >= n ? 'kết luận' : `bước ${b + 1}/${n}`;
  });
}

function datBuoc(i, b) {
  const n = viewer.soBuocCuaLop(i) || 0;
  viewer.setOverlay(i);
  viewer.setBuoc(Math.max(0, Math.min(b, n)));
  syncSel();
}

function wireBuoc() {
  out.querySelectorAll('.step[data-b]').forEach(e => e.onclick = ev => {
    ev.stopPropagation(); dungPhat(); datBuoc(+e.dataset.r, +e.dataset.b);
  });
  out.querySelectorAll('.buocBar').forEach(bar => {
    const i = +bar.dataset.r, n = viewer.soBuocCuaLop(i) || 0;
    bar.onclick = ev => {
      const act = ev.target.dataset && ev.target.dataset.act;
      if (!act) return;
      ev.stopPropagation();
      const b = viewer.getOverlay() === i ? viewer.getBuoc() : -1;
      if (act === 'het') { dungPhat(); viewer.setOverlay(i); viewer.setBuoc(-1); syncSel(); return; }
      if (act === 'lui') { dungPhat(); datBuoc(i, b < 0 ? n : b - 1); return; }
      if (act === 'toi') { dungPhat(); datBuoc(i, b < 0 ? 0 : b + 1); return; }
      if (act === 'phat') {
        if (dangPhat) { dungPhat(); return; }
        let k = 0; datBuoc(i, 0);
        dangPhat = setInterval(() => { k++; if (k > n) { dungPhat(); return; } datBuoc(i, k); }, 1400);
      }
    };
  });
}

/* ---------- chạy ---------- */

function giaiVaVe(veLaiBang = true, giuGocNhin = false) {
  let res;
  try {
    res = solve(inp.value, { supply });
  } catch (e) {
    console.error(e);
    res = { error: 'Lỗi khi đọc đề: ' + e.message };
  }
  if (res.error) {
    setBanner(null);
    bangCard.style.display = 'none';
    out.innerHTML = `<h3>Kết quả</h3><div class="warn">${esc(res.error)}</div>`;
    return;
  }
  resHienTai = res;
  viewer.build(res, giuGocNhin);
  pushToggles();
  noiKeoDiem(res);
  setBanner(res.trust);
  renderKetQua(res);
  if (veLaiBang) renderBang(res);
}

function run(giuSupply = false) {
  dungPhat();
  if (!giuSupply) { supply = {}; supplyText = {}; gocBanDau = {}; }
  giaiVaVe(true);
}

/* Phơi ra để gọi từ console và từ bộ test. viewer cần thiết vì khi khung trình duyệt bị ẩn
   thì requestAnimationFrame không chạy — lúc đó phải gọi tay viewer.renderOnce(). */
window.solve = solve;
window.norm = norm;
window.viewer = viewer;
window.ketQua = () => resHienTai;

$('go').onclick = () => run();
inp.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run(); });
inp.value = SAMPLES[0];
viewer.resize();
run();
