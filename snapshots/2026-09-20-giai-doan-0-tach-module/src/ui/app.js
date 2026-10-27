/* Nối giao diện với phần lõi.
   Trích nguyên văn từ legacy/index.html dòng 628–667. Khác hai điểm nhỏ: trạng thái công
   tắc truyền xuống viewer qua setToggles(), và việc tô sáng dòng kết quả đang chọn nằm ở
   đây thay vì trong module render. */

import { SAMPLES } from '../../data/samples.js';
import { solve } from '../solve/engine.js';
import { norm } from '../parse/normalize.js';
import { initViewer } from '../render/scene3d.js';

const inp = document.getElementById('inp');
const out = document.getElementById('out');
const cFaces = document.getElementById('cFaces');
const cLbl = document.getElementById('cLbl');
const cRot = document.getElementById('cRot');

const viewer = initViewer(document.getElementById('view'));

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

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function syncSel() {
  const sel = viewer.getOverlay();
  out.querySelectorAll('.res[data-i]').forEach(e => e.classList.toggle('sel', +e.dataset.i === sel));
}

function run() {
  let res;
  try {
    res = solve(inp.value);
  } catch (e) {
    console.error(e);
    res = { error: 'Lỗi khi đọc đề: ' + e.message };
  }
  if (res.error) {
    out.innerHTML = `<h3>Kết quả</h3><div class="warn">${esc(res.error)}</div>`;
    return;
  }

  viewer.build(res);
  pushToggles();

  const coords = Object.entries(res.pts)
    .map(([n, p]) => `${n.padEnd(3)} (${p.map(v => +v.toFixed(3)).join(', ')})`).join('\n');

  out.innerHTML = `<h3>Kết quả</h3><div style="margin-bottom:6px">🔷 <b style="color:var(--accent)">${esc(res.S.label)}</b></div>` +
    (res.R.some(r => r.ov) ? '<button class="ghost" id="allOv" style="margin-bottom:4px">👁 Hiện tất cả</button>' : '') +
    (res.R.length
      ? res.R.map((r, i) => `<div class="res"${r.ov ? ` data-i="${i}"` : ''}>${esc(r.q)}<br><b>${esc(r.a)}</b>` +
          (r.steps || []).map(s => `<div class="step">• ${esc(s)}</div>`).join('') + `</div>`).join('')
      : '<div style="color:var(--muted)">Không thấy câu hỏi “Tính …” nào — chỉ vẽ hình.</div>') +
    res.W.map(w => `<div class="warn">⚠ ${esc(w)}</div>`).join('') +
    `<details><summary>Tọa độ (a = 1)</summary><pre>${esc(coords)}</pre></details>`;

  out.querySelectorAll('.res[data-i]').forEach(e => e.onclick = () => { viewer.setOverlay(+e.dataset.i); syncSel(); });
  const ab = document.getElementById('allOv');
  if (ab) ab.onclick = () => { viewer.setOverlay(-1); syncSel(); };
  syncSel();
}

/* Để gọi được từ console và từ bộ test.
   viewer được phơi ra vì khi khung trình duyệt bị ẩn thì requestAnimationFrame không chạy,
   lúc đó phải gọi tay viewer.renderOnce() mới kiểm tra được phần vẽ. */
window.solve = solve;
window.norm = norm;
window.viewer = viewer;

document.getElementById('go').onclick = run;
inp.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run(); });
inp.value = SAMPLES[0];
viewer.resize();
run();
