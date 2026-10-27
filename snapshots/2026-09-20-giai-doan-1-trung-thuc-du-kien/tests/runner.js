/* Bộ test, hai phần:

   PHẦN A — KHÔNG HỒI QUY. Chạy song song bản tham chiếu đã đóng băng (legacy/reference.js)
   và solveOnce() của bản mới, so từng con số, từng câu lập luận, từng mặt từng cạnh.
   Bản tham chiếu là máy chấm chứ không phải ảnh chụp đáp án, nên thêm đề mẫu mới không phải
   chép lại đáp án bằng tay.

   PHẦN B — TRUNG THỰC. Kiểm tra chính hành vi mới của Giai đoạn 1 trên solve(): đề thiếu dữ
   kiện thì không một con số nào được lọt ra, mà đề không số đo hợp lệ thì không được báo oan.

   So với solveOnce chứ không phải solve ở phần A là có chủ ý: solve() cố tình đổi đáp án
   (chặn, ghi chú), còn solveOnce() phải giữ nguyên hành vi cũ mãi mãi. Tách ra thì một lỗi
   hồi quy trong phần dựng hình không bị lẫn vào những thay đổi có chủ ý.

   Kết quả cũng gán vào window.__RESULTS__ để đọc được từ bên ngoài mà không cần nhìn màn hình. */

import { SAMPLES } from '../data/samples.js';
import { TRUST } from './cases.js';
import { solve as refSolve } from '../legacy/reference.js';

const EPS = 1e-9;

let newSolve = null, trustSolve = null, loadError = null;
try {
  const mod = await import('../src/solve/engine.js');
  newSolve = mod.solveOnce;
  trustSolve = mod.solve;
} catch (e) {
  loadError = e;
}

/* ================= phần A: so với máy chấm ================= */

function cmpNum(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') return a === b;
  if (!isFinite(a) || !isFinite(b)) return Object.is(a, b);
  return Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b));
}

function cmpPoints(ref, got, diffs) {
  const rk = Object.keys(ref).sort(), gk = Object.keys(got).sort();
  const missing = rk.filter(k => !(k in got)), extra = gk.filter(k => !(k in ref));
  if (missing.length) diffs.push(`thiếu điểm: ${missing.join(', ')}`);
  if (extra.length) diffs.push(`thừa điểm: ${extra.join(', ')}`);
  for (const k of rk) {
    if (!(k in got)) continue;
    const a = ref[k], b = got[k];
    if (!a.every((v, i) => cmpNum(v, b[i])))
      diffs.push(`điểm ${k}: chuẩn (${a.map(v => +v.toFixed(6))}) ≠ mới (${b.map(v => +v.toFixed(6))})`);
  }
}

function cmpResults(ref, got, diffs) {
  if (ref.length !== got.length) {
    diffs.push(`số câu trả lời: chuẩn ${ref.length} ≠ mới ${got.length}`);
    diffs.push(`  chuẩn: ${ref.map(r => r.q).join(' | ')}`);
    diffs.push(`  mới  : ${got.map(r => r.q).join(' | ')}`);
    return;
  }
  ref.forEach((r, i) => {
    const g = got[i];
    if (r.q !== g.q) diffs.push(`câu ${i + 1} đề mục: "${r.q}" ≠ "${g.q}"`);
    if (r.a !== g.a) diffs.push(`câu ${i + 1} "${r.q}": chuẩn "${r.a}" ≠ mới "${g.a}"`);
    const rs = r.steps || [], gs = g.steps || [];
    if (rs.length !== gs.length) {
      diffs.push(`câu ${i + 1} "${r.q}": số bước chuẩn ${rs.length} ≠ mới ${gs.length}`);
    } else {
      rs.forEach((s, j) => {
        if (s !== gs[j]) diffs.push(`câu ${i + 1} bước ${j + 1}: chuẩn "${s}" ≠ mới "${gs[j]}"`);
      });
    }
    const ro = r.ov, go = g.ov;
    if (!!ro !== !!go) { diffs.push(`câu ${i + 1}: một bên có lớp phủ, bên kia không`); return; }
    if (ro && go) {
      const rn = Object.keys(ro.names || {}).sort().join(','), gn = Object.keys(go.names || {}).sort().join(',');
      if (rn !== gn) diffs.push(`câu ${i + 1} điểm phụ sinh thêm: "${rn}" ≠ "${gn}"`);
      if ((ro.segs || []).length !== (go.segs || []).length)
        diffs.push(`câu ${i + 1} số đoạn vẽ thêm: ${(ro.segs || []).length} ≠ ${(go.segs || []).length}`);
    }
  });
}

/* Dữ liệu dùng để VẼ. Lúc đầu bộ test bỏ qua phần này nên một lỗi làm mất mặt hoặc mất cạnh
   vẫn lọt qua với toàn bộ 13 đề đạt. Không so là không bắt được. */
function cmpRender(ref, got, diffs) {
  const faceKey = fs => fs.map(f => f.join('')).sort().join(' ');
  if (faceKey(ref.faces) !== faceKey(got.faces))
    diffs.push(`mặt: chuẩn [${faceKey(ref.faces)}] ≠ mới [${faceKey(got.faces)}]`);

  const edgeKey = es => es.map(e => [...e].sort().join('')).sort().join(' ');
  if (edgeKey(ref.edges) !== edgeKey(got.edges))
    diffs.push(`cạnh: chuẩn [${edgeKey(ref.edges)}] ≠ mới [${edgeKey(got.edges)}]`);

  if ([...ref.derived].sort().join(',') !== [...got.derived].sort().join(','))
    diffs.push(`điểm tự dựng: chuẩn [${[...ref.derived].sort()}] ≠ mới [${[...got.derived].sort()}]`);

  const at = v => Array.isArray(v) ? '(' + v.map(x => +x.toFixed(6)).join(',') + ')' : String(v);
  const auxKey = as => as.map(a => a.slice(0, 2).map(at).sort().join('-')).sort().join(' ');
  if (auxKey(ref.aux) !== auxKey(got.aux))
    diffs.push(`đường phụ: ${ref.aux.length} đoạn ≠ ${got.aux.length} đoạn, hoặc lệch vị trí`);

  const feetKey = fs => fs.map(at).sort().join(' ');
  if (feetKey(ref.feet) !== feetKey(got.feet))
    diffs.push(`chân vuông góc: ${ref.feet.length} điểm ≠ ${got.feet.length} điểm, hoặc lệch vị trí`);
}

function compare(ref, got) {
  const diffs = [];
  if (ref.error || got.error) {
    if (ref.error !== got.error) diffs.push(`lỗi: chuẩn "${ref.error || '(không)'}" ≠ mới "${got.error || '(không)'}"`);
    return diffs;
  }
  if (ref.S.label !== got.S.label) diffs.push(`tên khối: "${ref.S.label}" ≠ "${got.S.label}"`);
  cmpPoints(ref.pts, got.pts, diffs);
  cmpResults(ref.R, got.R, diffs);
  cmpRender(ref, got, diffs);
  const rw = (ref.W || []).join(' / '), gw = (got.W || []).join(' / ');
  if (rw !== gw) diffs.push(`cảnh báo: chuẩn "${rw}" ≠ mới "${gw}"`);
  return diffs;
}

function runA() {
  const rows = [], sum = { total: 0, pass: 0, fail: 0 };
  for (let i = 0; i < SAMPLES.length; i++) {
    const text = SAMPLES[i];
    sum.total++;
    let ref, got;
    try { ref = refSolve(text); } catch (e) {
      sum.fail++; rows.push({ i, status: 'MÁY CHẤM LỖI', diffs: [String(e && e.stack || e)], text }); continue;
    }
    if (!newSolve) { rows.push({ i, status: 'CHỜ', diffs: [], text }); continue; }
    try { got = newSolve(text); } catch (e) {
      sum.fail++; rows.push({ i, status: 'LỖI', diffs: [String(e && e.stack || e)], text }); continue;
    }
    const diffs = compare(ref, got);
    if (diffs.length) { sum.fail++; rows.push({ i, status: 'LỆCH', diffs, text }); }
    else { sum.pass++; rows.push({ i, status: 'ĐẠT', diffs: [], text }); }
  }
  return { rows, sum };
}

/* ================= phần B: trung thực ================= */

function runB() {
  const rows = [], sum = { total: 0, pass: 0, fail: 0 };
  if (!trustSolve) return { rows, sum };

  for (let i = 0; i < TRUST.length; i++) {
    const c = TRUST[i];
    sum.total++;
    let r;
    try { r = trustSolve(c.de, { supply: c.nhap || {} }); } catch (e) {
      sum.fail++; rows.push({ i, status: 'LỖI', diffs: [String(e && e.stack || e)], text: c.ten }); continue;
    }
    const diffs = [];
    if (r.error) {
      diffs.push('không dựng được hình: ' + r.error);
    } else {
      const phaiChan = new Set();
      for (const key of (c.chan || [])) {
        const hit = r.R.filter(x => x.q.includes(key));
        if (!hit.length) diffs.push(`không thấy câu nào có "${key}" — đề mục hiện có: ${r.R.map(x => x.q).join(' | ') || '(không có câu nào)'}`);
        hit.forEach(x => phaiChan.add(x));
      }
      for (const x of phaiChan) if (!x.blocked)
        diffs.push(`"${x.q}" LẼ RA PHẢI BỊ CHẶN nhưng vẫn in ra: "${x.a}"`);
      for (const x of r.R) if (x.blocked && !phaiChan.has(x))
        diffs.push(`"${x.q}" bị chặn oan: "${x.a}"`);

      for (const key of (c.ghiChu || [])) {
        const hit = r.R.filter(x => x.q.includes(key));
        if (!hit.length) diffs.push(`không thấy câu nào có "${key}"`);
        hit.forEach(x => { if (!x.note) diffs.push(`"${x.q}" lẽ ra phải kèm chú thích "ứng với … đang chọn"`); });
      }

      if (c.khongGhiChu) for (const x of r.R) if (x.note)
        diffs.push(`"${x.q}" bị gắn chú thích thừa: "${x.note}" — kết luận này đúng với mọi hình`);

      if (c.mucDo && r.trust.level !== c.mucDo)
        diffs.push(`mức tin cậy của hình: mong "${c.mucDo}", thực tế "${r.trust.level}"`);

      for (const [key, mong] of Object.entries(c.dapAn || {})) {
        const hit = r.R.find(x => x.q.includes(key));
        if (!hit) diffs.push(`không thấy câu nào có "${key}"`);
        else if (!hit.a.includes(mong)) diffs.push(`"${hit.q}": mong đáp án chứa "${mong}", thực tế "${hit.a}"`);
      }

      for (const key of (c.canhBao || []))
        if (!r.W.some(w => w.includes(key)))
          diffs.push(`thiếu cảnh báo chứa "${key}" — cảnh báo hiện có: ${r.W.join(' / ') || '(không có)'}`);

      if (c.soCau !== undefined && r.R.length !== c.soCau)
        diffs.push(`số câu trả lời: mong ${c.soCau}, thực tế ${r.R.length} → ${r.R.map(x => x.q).join(' | ')}`);

      if (c.soCauGiaoTuyen !== undefined) {
        const n = r.R.filter(x => x.q.startsWith('Giao tuyến')).length;
        if (n !== c.soCauGiaoTuyen)
          diffs.push(`số câu giao tuyến: mong ${c.soCauGiaoTuyen}, thực tế ${n} → ${r.R.filter(x => x.q.startsWith('Giao tuyến')).map(x => x.q).join(' | ')}`);
      }
    }
    if (diffs.length) { sum.fail++; rows.push({ i, status: 'HỎNG', diffs, text: c.ten }); }
    else { sum.pass++; rows.push({ i, status: 'ĐẠT', diffs: [], text: c.ten }); }
  }
  return { rows, sum };
}

/* ================= hiển thị ================= */

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const color = st => st === 'ĐẠT' ? 'ok' : st === 'CHỜ' ? 'wait' : 'bad';

function section(title, lead, rows, sum) {
  return `<h2>${esc(title)}</h2><div class="lead">${esc(lead)}</div>` +
    `<div class="sum ${sum.fail ? 'bad' : 'ok'}">${sum.pass}/${sum.total} đạt · ${sum.fail} hỏng</div>` +
    rows.map(r => `
      <div class="case">
        <div class="hd"><b class="${color(r.status)}">${r.status}</b>
          <span class="n">#${r.i + 1}</span>
          <span class="t">${esc(String(r.text).slice(0, 110))}</span></div>
        ${r.diffs.map(d => `<div class="diff">✗ ${esc(d)}</div>`).join('')}
      </div>`).join('');
}

const A = runA(), B = runB();
document.getElementById('out').innerHTML =
  (loadError ? `<div class="sum bad">Không nạp được src/solve/engine.js: ${esc(loadError.message || loadError)}</div>` : '') +
  section('A · Không hồi quy', 'solveOnce() phải giống hệt bản tham chiếu đã đóng băng.', A.rows, A.sum) +
  section('B · Trung thực về dữ kiện', 'solve() phải chặn đúng chỗ thiếu, và không báo oan chỗ đề cố ý không cho số.', B.rows, B.sum);

window.__RESULTS__ = {
  ready: true,
  A: { ...A.sum, failures: A.rows.filter(r => r.status !== 'ĐẠT' && r.status !== 'CHỜ').map(r => ({ i: r.i + 1, status: r.status, diffs: r.diffs })) },
  B: { ...B.sum, failures: B.rows.filter(r => r.status !== 'ĐẠT').map(r => ({ i: r.i + 1, ten: r.text, diffs: r.diffs })) },
  loadError: loadError ? String(loadError.message || loadError) : null,
};
console.log('[test] A', JSON.stringify(A.sum), 'B', JSON.stringify(B.sum));
