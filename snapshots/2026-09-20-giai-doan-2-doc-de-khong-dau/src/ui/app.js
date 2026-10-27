/* Nối giao diện với phần lõi.

   Giai đoạn 1 thêm ba thứ vào giao diện:
     · dải băng trên khung nhìn nói hình có đúng tỉ lệ hay không
     · bảng "đang thiếu gì" nêu đích danh, kèm ô nhập bù ngay tại chỗ
     · đáp án bị chặn hiện lý do thay vì con số bịa; đáp án phụ thuộc đại lượng tự do
       thì vẫn hiện số nhưng kèm chú thích */

import { SAMPLES } from '../../data/samples.js';
import { solve } from '../solve/engine.js';
import { norm, parseLen, parseDeg } from '../parse/normalize.js';
import { KIND } from '../solve/trust.js';
import { initViewer } from '../render/scene3d.js';

const inp = document.getElementById('inp');
const out = document.getElementById('out');
const banner = document.getElementById('banner');
const cFaces = document.getElementById('cFaces');
const cLbl = document.getElementById('cLbl');
const cRot = document.getElementById('cRot');

const viewer = initViewer(document.getElementById('view'));

/* Giá trị người dùng gõ bù vào chỗ thiếu: id đại lượng → số.
   supplyText giữ nguyên văn đã gõ để vẽ lại ô nhập cho đúng sau mỗi lần dựng lại. */
let supply = {}, supplyText = {};

function pushToggles() {
  viewer.setToggles({ faces: cFaces.checked, labels: cLbl.checked, rotate: cRot.checked });
}
[cFaces, cLbl, cRot].forEach(e => e.onchange = pushToggles);

const sd = document.getElementById('samples');
SAMPLES.forEach((s, i) => {
  const b = document.createElement('button');
  b.className = 'ghost';
  b.textContent = `${i + 1}. ${s.slice(4, 80)}…`;
  b.onclick = () => { inp.value = s; run(); };
  sd.appendChild(b);
});

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function syncSel() {
  const sel = viewer.getOverlay();
  out.querySelectorAll('.res[data-i]').forEach(e => e.classList.toggle('sel', +e.dataset.i === sel));
}

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

/* Một dòng "đang thiếu X" kèm ô nhập bù. */
function itemHTML(g) {
  const mode = g.mode === 'angle' ? 'angle' : 'len';
  const goiY = mode === 'angle' ? 'ví dụ 60' : 'ví dụ a√3, 2a, 1.5';
  const val = supplyText[g.id] ?? '';
  return `<div class="item">
      <div class="lab">${esc(g.label || g.id)}</div>
      <div class="why">Đã tìm: ${esc(g.why || '')} — không thấy.</div>
      <input data-gid="${esc(g.id)}" data-mode="${mode}" value="${esc(val)}" placeholder="${esc(goiY)}">
      <span class="hint2">${mode === 'angle' ? 'độ' : 'nhập rồi Enter'}</span>
    </div>`;
}

function trustHTML(res) {
  const tr = res.trust;
  if (!tr) return '';
  const nhap = tr.guesses.filter(g => g.kind === KIND.SUPPLIED);
  const nhapHTML = nhap.length
    ? `<details class="soft"><summary>Bạn đã nhập bù ${nhap.length} giá trị</summary>${nhap.map(itemHTML).join('')}</details>`
    : '';

  if (tr.level === 'thiếu') {
    return `<div class="miss"><h4>⛔ Chưa đủ dữ kiện để tính</h4>` +
      tr.missingUsed.map(itemHTML).join('') +
      `</div>` + nhapHTML;
  }
  const doan = tr.guesses.filter(g => g.kind === KIND.MISSING || g.kind === KIND.FREE);
  if (!doan.length) return nhapHTML;
  return `<details class="soft"><summary>Máy đang tự chọn ${doan.length} giá trị — không câu nào phụ thuộc vào chúng</summary>` +
    doan.map(itemHTML).join('') + `</details>` + nhapHTML;
}

function run(giuSupply = false) {
  if (!giuSupply) { supply = {}; supplyText = {}; }

  let res;
  try {
    res = solve(inp.value, { supply });
  } catch (e) {
    console.error(e);
    res = { error: 'Lỗi khi đọc đề: ' + e.message };
  }
  if (res.error) {
    setBanner(null);
    out.innerHTML = `<h3>Kết quả</h3><div class="warn">${esc(res.error)}</div>`;
    return;
  }

  viewer.build(res);
  pushToggles();
  setBanner(res.trust);

  const coords = Object.entries(res.pts)
    .map(([n, p]) => `${n.padEnd(3)} (${p.map(v => +v.toFixed(3)).join(', ')})`).join('\n');

  out.innerHTML = `<h3>Kết quả</h3><div style="margin-bottom:6px">🔷 <b style="color:var(--accent)">${esc(res.S.label)}</b></div>` +
    trustHTML(res) +
    (res.R.some(r => r.ov) ? '<button class="ghost" id="allOv" style="margin-bottom:4px">👁 Hiện tất cả</button>' : '') +
    (res.R.length
      ? res.R.map((r, i) => `<div class="res${r.blocked ? ' chan' : ''}"${r.ov ? ` data-i="${i}"` : ''}>` +
          `${esc(r.q)}<br><b>${esc(r.a)}</b>` +
          (r.note ? `<div class="note">↔ ${esc(r.note)}</div>` : '') +
          (r.steps || []).map(s => `<div class="step">• ${esc(s)}</div>`).join('') +
          `</div>`).join('')
      : '<div style="color:var(--muted)">Không thấy câu hỏi “Tính …” nào — chỉ vẽ hình.</div>') +
    res.W.map(w => `<div class="warn">⚠ ${esc(w)}</div>`).join('') +
    `<details><summary>Tọa độ (a = 1)</summary><pre>${esc(coords)}</pre></details>`;

  out.querySelectorAll('.res[data-i]').forEach(e => e.onclick = () => { viewer.setOverlay(+e.dataset.i); syncSel(); });
  const ab = document.getElementById('allOv');
  if (ab) ab.onclick = () => { viewer.setOverlay(-1); syncSel(); };
  wireSupplyInputs();
  syncSel();
}

function wireSupplyInputs() {
  out.querySelectorAll('input[data-gid]').forEach(el => {
    const apply = () => {
      const id = el.dataset.gid, raw = el.value.trim();
      if (!raw) {
        delete supply[id]; delete supplyText[id];
        run(true);
        return;
      }
      const v = el.dataset.mode === 'angle' ? parseDeg(raw) : parseLen(raw);
      if (v === undefined) { el.classList.add('xau'); return; }
      el.classList.remove('xau');
      supply[id] = v; supplyText[id] = raw;
      run(true);
      /* dựng lại xong thì ô nhập là phần tử mới — trả con trỏ về đúng ô vừa gõ */
      const lai = out.querySelector(`input[data-gid="${CSS.escape(id)}"]`);
      if (lai) { lai.focus(); lai.setSelectionRange(lai.value.length, lai.value.length); }
    };
    el.addEventListener('change', apply);
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
  });
}

/* Để gọi được từ console và từ bộ test.
   viewer được phơi ra vì khi khung trình duyệt bị ẩn thì requestAnimationFrame không chạy,
   lúc đó phải gọi tay viewer.renderOnce() mới kiểm tra được phần vẽ. */
window.solve = solve;
window.norm = norm;
window.viewer = viewer;

document.getElementById('go').onclick = () => run();
inp.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run(); });
inp.value = SAMPLES[0];
viewer.resize();
run();
