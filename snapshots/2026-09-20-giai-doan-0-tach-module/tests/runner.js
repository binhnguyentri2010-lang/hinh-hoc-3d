/* Bộ test: chạy song song bản tham chiếu đã đóng băng (legacy/reference.js) và bản mới
   trong src/, rồi so từng con số, từng câu lập luận.

   Bản tham chiếu là máy chấm chứ không phải ảnh chụp đáp án — thêm đề mẫu mới không
   phải chép lại đáp án bằng tay, và không có nguy cơ chép sai.

   Kết quả cũng gán vào window.__RESULTS__ để đọc được từ bên ngoài mà không cần nhìn màn hình. */

import { SAMPLES } from '../data/samples.js';
import { solve as refSolve } from '../legacy/reference.js';

const EPS = 1e-9;

/* Bản mới có thể chưa tồn tại trong lúc đang tách dần từng module — thiếu thì báo,
   chứ không làm sập cả trang test. */
let newSolve = null, newSolveError = null;
try {
  const mod = await import('../src/solve/engine.js');
  newSolve = mod.solve;
} catch (e) {
  newSolveError = e;
}

/* ---------- so sánh ---------- */

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
    if (!a.every((v, i) => cmpNum(v, b[i]))) {
      diffs.push(`điểm ${k}: chuẩn (${a.map(v => +v.toFixed(6))}) ≠ mới (${b.map(v => +v.toFixed(6))})`);
    }
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
    // phần tô màu minh hoạ: so cấu trúc, không so toạ độ
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

/* Dữ liệu dùng để VẼ — mặt, cạnh, đường phụ, chân vuông góc, điểm tự dựng.
   Lúc đầu bộ test bỏ qua phần này và chỉ so điểm với đáp án, nên một lỗi làm mất mặt hoặc
   mất cạnh vẫn lọt qua với toàn bộ 13 đề đạt. Không so là không bắt được. */
function cmpRender(ref, got, diffs) {
  const faceKey = fs => fs.map(f => f.join('')).sort().join(' ');
  if (faceKey(ref.faces) !== faceKey(got.faces))
    diffs.push(`mặt: chuẩn [${faceKey(ref.faces)}] ≠ mới [${faceKey(got.faces)}]`);

  const edgeKey = es => es.map(e => [...e].sort().join('')).sort().join(' ');
  if (edgeKey(ref.edges) !== edgeKey(got.edges))
    diffs.push(`cạnh: chuẩn [${edgeKey(ref.edges)}] ≠ mới [${edgeKey(got.edges)}]`);

  if ([...ref.derived].sort().join(',') !== [...got.derived].sort().join(','))
    diffs.push(`điểm tự dựng: chuẩn [${[...ref.derived].sort()}] ≠ mới [${[...got.derived].sort()}]`);

  /* aux/feet chứa lẫn tên điểm và toạ độ — quy về một dạng chuỗi rồi so */
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

/* ---------- chạy ---------- */

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function run() {
  const rows = [], summary = { total: 0, pass: 0, fail: 0, oracleFail: 0 };

  for (let i = 0; i < SAMPLES.length; i++) {
    const text = SAMPLES[i];
    summary.total++;

    // 1. Máy chấm phải tự chạy được đã
    let ref;
    try {
      ref = refSolve(text);
    } catch (e) {
      summary.oracleFail++; summary.fail++;
      rows.push({ i, status: 'MÁY CHẤM LỖI', diffs: [String(e && e.stack || e)], text });
      continue;
    }

    if (!newSolve) {
      rows.push({ i, status: 'CHỜ', diffs: [], text, note: ref.error ? 'máy chấm báo: ' + ref.error : `máy chấm ra ${ref.R.length} câu trả lời` });
      continue;
    }

    let got;
    try {
      got = newSolve(text);
    } catch (e) {
      summary.fail++;
      rows.push({ i, status: 'LỖI', diffs: [String(e && e.stack || e)], text });
      continue;
    }

    const diffs = compare(ref, got);
    if (diffs.length) { summary.fail++; rows.push({ i, status: 'LỆCH', diffs, text }); }
    else { summary.pass++; rows.push({ i, status: 'ĐẠT', diffs: [], text }); }
  }

  render(rows, summary);
  window.__RESULTS__ = {
    ready: true,
    hasNewImpl: !!newSolve,
    newImplError: newSolveError ? String(newSolveError.message || newSolveError) : null,
    ...summary,
    failures: rows.filter(r => r.status !== 'ĐẠT' && r.status !== 'CHỜ')
                  .map(r => ({ i: r.i + 1, status: r.status, diffs: r.diffs })),
  };
  console.log('[test]', JSON.stringify({ ...summary, hasNewImpl: !!newSolve }));
}

function render(rows, s) {
  const color = st => st === 'ĐẠT' ? 'ok' : st === 'CHỜ' ? 'wait' : 'bad';
  document.getElementById('out').innerHTML = `
    <div class="sum ${s.fail ? 'bad' : 'ok'}">
      ${s.pass}/${s.total} đạt · ${s.fail} hỏng
      ${newSolve ? '' : '<span class="wait"> · chưa có bản mới trong src/solve/engine.js — mới chỉ kiểm tra máy chấm</span>'}
      ${newSolveError && !newSolve ? `<div class="note">${esc(newSolveError.message || newSolveError)}</div>` : ''}
    </div>` +
    rows.map(r => `
      <div class="case">
        <div class="hd"><b class="${color(r.status)}">${r.status}</b>
          <span class="n">#${r.i + 1}</span>
          <span class="t">${esc(r.text.slice(0, 110))}…</span></div>
        ${r.note ? `<div class="note">${esc(r.note)}</div>` : ''}
        ${r.diffs.map(d => `<div class="diff">✗ ${esc(d)}</div>`).join('')}
      </div>`).join('');
}

run();
