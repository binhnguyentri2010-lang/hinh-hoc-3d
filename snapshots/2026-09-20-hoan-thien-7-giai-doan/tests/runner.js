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
import { CORPUS } from '../data/corpus.js';
import { TRUST } from './cases.js';
import { solve as refSolve } from '../legacy/reference.js';
import { deaccent } from '../src/parse/deaccent.js';

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

/* ================= phần C: đề gõ không dấu ================= */

/* Học sinh gõ trên điện thoại thường không bỏ dấu. Mỗi đề mẫu chạy thêm một lượt ở bản đã
   gỡ sạch dấu; kết quả phải trùng khít bản có dấu — từng điểm, từng đáp án, từng câu lập luận.
   Dùng lại đúng hàm compare() của phần A nên không bỏ sót thứ gì. */
function runC() {
  const rows = [], sum = { total: 0, pass: 0, fail: 0 };
  if (!newSolve) return { rows, sum };
  for (let i = 0; i < SAMPLES.length; i++) {
    const coDau = SAMPLES[i], khongDau = deaccent(coDau);
    sum.total++;
    let a, b;
    try { a = newSolve(coDau); b = newSolve(khongDau); } catch (e) {
      sum.fail++; rows.push({ i, status: 'LỖI', diffs: [String(e && e.stack || e)], text: khongDau }); continue;
    }
    const diffs = compare(a, b);
    if (diffs.length) { sum.fail++; rows.push({ i, status: 'LỆCH', diffs, text: khongDau }); }
    else { sum.pass++; rows.push({ i, status: 'ĐẠT', diffs: [], text: khongDau }); }
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
        if (!hit) diffs.push(`không thấy câu nào có "${key}" — hiện có: ${r.R.map(x => x.q).join(' | ') || '(không câu nào)'}`);
        else if (!hit.a.includes(mong)) diffs.push(`"${hit.q}": mong đáp án chứa "${mong}", thực tế "${hit.a}"`);
      }

      for (const [key, mong] of Object.entries(c.buoc || {})) {
        const hit = r.R.find(x => x.q.includes(key));
        if (!hit) diffs.push(`không thấy câu nào có "${key}"`);
        else if (!(hit.steps || []).some(s => s.includes(mong)))
          diffs.push(`"${hit.q}" thiếu bước chứa "${mong}" — các bước: ${(hit.steps || []).join(' · ') || '(không có)'}`);
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

/* ================= phần D: đo mốc ================= */

/* Không kiểm tra đúng/sai từng đáp án, chỉ đếm xem trong một rổ đề thật thì đọc hiểu được
   bao nhiêu. So bản cũ với bản mới, ở cả hai dạng gõ. Con số quan trọng nhất là cột
   "đề KHÔNG dấu": bản cũ gần như trượt sạch, còn bản mới phải ngang với đề có dấu. */
function runD() {
  const dong = [];
  const dem = (ten, fn, list) => {
    let nhanDang = 0, coDapAn = 0, tongCau = 0, chan = 0, loi = 0;
    for (const de of list) {
      let r;
      try { r = fn(de); } catch (e) { loi++; continue; }
      if (!r || r.error) continue;
      nhanDang++;
      const n = r.R ? r.R.length : 0;
      if (n) coDapAn++;
      tongCau += n;
      if (r.R) chan += r.R.filter(x => x.blocked).length;
    }
    dong.push({ ten, tong: list.length, nhanDang, coDapAn, tongCau, chan, loi });
  };

  const khongDau = CORPUS.map(deaccent);
  dem('Bản cũ · đề có dấu', refSolve, CORPUS);
  dem('Bản cũ · đề KHÔNG dấu', refSolve, khongDau);
  if (trustSolve) {
    dem('Bản mới · đề có dấu', trustSolve, CORPUS);
    dem('Bản mới · đề KHÔNG dấu', trustSolve, khongDau);
  }
  return dong;
}

/* ================= phần E: nét khuất ================= */

/* Toán thuần, không cần three.js. Kiểm bằng những sự thật hình học kiểm được chính xác,
   không phải bằng "nhìn thấy đúng đúng". */
async function runE() {
  const rows = [], sum = { total: 0, pass: 0, fail: 0 };
  let H;
  try { H = await import('../src/render/hidden.js'); } catch (e) {
    return { rows: [{ i: 0, status: 'LỖI', diffs: [String(e)], text: 'nạp hidden.js' }], sum: { total: 1, pass: 0, fail: 1 } };
  }
  const KHOA = (p, q) => [p, q].sort().join('|');

  const ca = (ten, fn) => {
    sum.total++;
    let diffs = [];
    try { diffs = fn() || []; } catch (e) { diffs = [String(e && e.stack || e)]; }
    if (diffs.length) { sum.fail++; rows.push({ i: rows.length, status: 'HỎNG', diffs, text: ten }); }
    else { sum.pass++; rows.push({ i: rows.length, status: 'ĐẠT', diffs: [], text: ten }); }
  };

  /* Hình lập phương nhìn từ một đỉnh: đúng 3 mặt quay về phía người nhìn, và 3 mặt đó
     có chung 3 cạnh, nên 3×4 − 3 = 9 cạnh nhìn thấy, 3 cạnh khuất. Con số cố định,
     không phụ thuộc cách cài đặt. */
  ca('Lập phương nhìn từ đỉnh: 9 cạnh thấy, 3 cạnh khuất', () => {
    const p = { A: [0,0,0], B: [1,0,0], C: [1,1,0], D: [0,1,0],
                E: [0,0,1], F: [1,0,1], G: [1,1,1], H: [0,1,1] };
    const faces = [['A','B','C','D'], ['E','F','G','H'], ['A','B','F','E'],
                   ['B','C','G','F'], ['C','D','H','G'], ['D','A','E','H']];
    const fd = H.faceData(p, faces);
    const k = 1 / Math.sqrt(3);
    const vis = H.visibleEdges(fd, [-k, -k, -k], KHOA);   // mắt ở phía đỉnh G
    const loi = [];
    if (fd.length !== 6) loi.push(`số mặt: ${fd.length} ≠ 6`);
    if (vis.size !== 9) loi.push(`cạnh nhìn thấy: ${vis.size} ≠ 9`);
    for (const c of ['C|G', 'F|G', 'G|H']) if (!vis.has(c)) loi.push(`cạnh ${c} ở đỉnh gần mắt nhất mà lại khuất`);
    for (const c of ['A|B', 'A|D', 'A|E']) if (vis.has(c)) loi.push(`cạnh ${c} ở đỉnh xa mắt nhất mà lại hiện`);
    return loi;
  });

  /* Pháp tuyến phải hướng ra ngoài, suy từ tâm khối chứ không từ thứ tự đỉnh. */
  ca('Pháp tuyến các mặt đều hướng ra ngoài', () => {
    const p = { A: [0,0,0], B: [2,0,0], C: [1,2,0], S: [1,.7,3] };
    const faces = [['A','B','C'], ['S','A','B'], ['S','B','C'], ['S','C','A']];
    const fd = H.faceData(p, faces);
    const tam = [1, .675, .75];
    return fd.filter(f => (f.n[0]*(f.c[0]-tam[0]) + f.n[1]*(f.c[1]-tam[1]) + f.n[2]*(f.c[2]-tam[2])) <= 0)
             .map(f => `mặt ${f.names.join('')} có pháp tuyến quay vào trong`);
  });

  /* Đoạn xuyên qua khối phải bị cắt thành khúc thấy và khúc khuất. */
  ca('Đoạn xuyên qua khối bị cắt đúng chỗ', () => {
    const p = { A: [0,0,0], B: [1,0,0], C: [1,1,0], D: [0,1,0],
                E: [0,0,1], F: [1,0,1], G: [1,1,1], H: [0,1,1] };
    const faces = [['A','B','C','D'], ['E','F','G','H'], ['A','B','F','E'],
                   ['B','C','G','F'], ['C','D','H','G'], ['D','A','E','H']];
    const fd = H.faceData(p, faces);
    const k = 1 / Math.sqrt(3), huong = [-k, -k, -k];
    // đoạn chạy dọc trục x, xuyên giữa khối, thò ra hai đầu
    const khuc = H.splitByView([-1, .5, .5], [2, .5, .5], fd, huong);
    const loi = [];
    if (khuc.length < 2) loi.push(`chỉ cắt được ${khuc.length} khúc — lẽ ra phải có cả khúc thấy lẫn khúc khuất`);
    if (!khuc.some(s => s.khuat)) loi.push('không khúc nào bị coi là khuất');
    if (!khuc.some(s => !s.khuat)) loi.push('không khúc nào được coi là thấy');
    const tong = khuc.reduce((a, s) => a + (s.t1 - s.t0), 0);
    if (Math.abs(tong - 1) > 1e-6) loi.push(`các khúc không phủ kín đoạn: tổng = ${tong.toFixed(4)}`);
    return loi;
  });

  /* Điểm ngoài khối vẫn có thể bị che nếu khối đứng chắn giữa nó và mắt. */
  ca('Điểm ngoài khối nhưng nấp sau khối thì vẫn khuất', () => {
    const p = { A: [0,0,0], B: [1,0,0], C: [1,1,0], D: [0,1,0],
                E: [0,0,1], F: [1,0,1], G: [1,1,1], H: [0,1,1] };
    const faces = [['A','B','C','D'], ['E','F','G','H'], ['A','B','F','E'],
                   ['B','C','G','F'], ['C','D','H','G'], ['D','A','E','H']];
    const fd = H.faceData(p, faces);
    const huong = [-1, 0, 0];                     // mắt ở phía x lớn, nhìn ngược trục x
    const loi = [];
    if (!H.hiddenAt([-1, .5, .5], fd, huong)) loi.push('điểm nấp ngay sau khối lại được coi là thấy');
    if (H.hiddenAt([2, .5, .5], fd, huong)) loi.push('điểm nằm giữa mắt và khối lại được coi là khuất');
    if (H.hiddenAt([-1, 5, .5], fd, huong)) loi.push('điểm lệch hẳn ra ngoài khối lại được coi là khuất');
    return loi;
  });

  return { rows, sum };
}

/* ================= phần F: tự dựng hình · chia sẻ · xuất ảnh ================= */

async function runF() {
  const rows = [], sum = { total: 0, pass: 0, fail: 0 };
  const ca = async (ten, fn) => {
    sum.total++;
    let diffs = [];
    try { diffs = (await fn()) || []; } catch (e) { diffs = [String(e && e.stack || e)]; }
    if (diffs.length) { sum.fail++; rows.push({ i: rows.length, status: 'HỎNG', diffs, text: ten }); }
    else { sum.pass++; rows.push({ i: rows.length, status: 'ĐẠT', diffs: [], text: ten }); }
  };

  /* Tự dựng hình soạn ra câu đề rồi đưa cho chính parser — nên mọi tổ hợp ô chọn đều phải
     ra một đề mà parser đọc được. Tổ hợp nào hỏng là giao diện hứa điều app không làm được. */
  await ca('Mọi tổ hợp ô chọn của Tự dựng hình đều ra đề đọc được', async () => {
    const dn = await import('../src/ui/dungnhanh.js');
    const loi = [];
    for (const k of dn.KHOI) {
      const days = dn.dayNaoDung(k.ma) || [{ ma: null }];
      for (const d of days) {
        const de = dn.soanDe({ khoi: k.ma, day: d.ma, c: 'a', c2: '2a', h: 'a√2', hoi: ['V', 'g', 'd'] });
        let r;
        try { r = newSolve(de); } catch (e) { loi.push(`${k.ma}/${d.ma}: vỡ — ${e.message}`); continue; }
        if (r.error) loi.push(`${k.ma}/${d.ma}: ${r.error}`);
        else if (!r.R.length) loi.push(`${k.ma}/${d.ma}: không ra câu trả lời nào — đề soạn ra là "${de.slice(0, 80)}…"`);
      }
    }
    return loi;
  });

  await ca('Tự dựng hình có thiết diện và giao tuyến đều dựng được', async () => {
    const dn = await import('../src/ui/dungnhanh.js');
    const loi = [];
    for (const k of ['chop4', 'chop3', 'chopdeu']) {
      const de = dn.soanDe({ khoi: k, day: 'vuong', c: 'a', c2: '2a', h: 'a', hoi: ['td', 'gt'] });
      const r = newSolve(de);
      if (r.error) { loi.push(`${k}: ${r.error}`); continue; }
      if (!r.R.some(x => x.q.startsWith('Thiết diện'))) loi.push(`${k}: không ra thiết diện`);
      if (!r.R.some(x => x.q.startsWith('Giao tuyến'))) loi.push(`${k}: không ra giao tuyến`);
    }
    return loi;
  });

  await ca('Mã đề: tạo rồi đọc lại phải khớp từng chữ, kể cả giá trị đã sửa tay', async () => {
    const sh = await import('../src/ui/share.js');
    const de = SAMPLES[5], sup = { 'chiều-cao': 1.7320508, 'vị-trí-M': .25 };
    const lai = sh.docMa(sh.taoMa(de, sup));
    const loi = [];
    if (lai.de !== de) loi.push('câu đề không khớp sau khi đọc lại mã');
    if (JSON.stringify(lai.supply) !== JSON.stringify(sup)) loi.push('giá trị đã sửa tay không khớp');
    let bat = false;
    try { sh.docMa('day khong phai ma de'); } catch (e) { bat = true; }
    if (!bat) loi.push('mã hỏng mà không báo lỗi');
    return loi;
  });

  await ca('Xuất SVG: dựng được ảnh có đủ nét liền, nét đứt và nhãn', async () => {
    const THREE = await import('three');
    const H = await import('../src/render/hidden.js');
    const EX = await import('../src/render/export.js');
    const KHOA = (p, q) => [p, q].sort().join('|');

    const res = newSolve(SAMPLES[5]);
    if (res.error) return ['không dựng được hình mẫu: ' + res.error];

    const cam = new THREE.OrthographicCamera(-2, 2, 2, -2, .01, 100);
    cam.position.set(2.2, 1.6, 2.6); cam.lookAt(0, .5, 0); cam.updateMatrixWorld();
    const v = new THREE.Vector3(); cam.getWorldDirection(v);
    const huong = [v.x, -v.z, v.y];
    const fd = H.faceData(res.pts, res.faces);

    const r = EX.xuatSVG({ res, fd, huong, camera: cam, hien: H.visibleEdges(fd, huong, KHOA), KHOA, selOv: -1, size: [900, 700] });
    const loi = [];
    if (!/^<svg /.test(r.svg)) loi.push('không phải SVG');
    if (!/stroke-dasharray/.test(r.svg)) loi.push('không có nét đứt nào — cạnh khuất bị mất');
    if ((r.svg.match(/<line /g) || []).length < 8) loi.push('quá ít nét vẽ');
    if (!/<text /.test(r.svg)) loi.push('không có nhãn điểm');
    if (!/fill="#ffffff"/.test(r.svg)) loi.push('nền không trắng — dán vào Word sẽ xấu');
    if (!(r.rong > 50 && r.cao > 50)) loi.push(`kích thước ảnh vô lý: ${r.rong}×${r.cao}`);
    return loi;
  });

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

function bangD(dong) {
  const pc = (x, n) => n ? Math.round(x * 100 / n) + '%' : '—';
  return `<h2>D · Đo mốc</h2><div class="lead">Đếm trên ${CORPUS.length} đề thật. Không chấm đúng/sai từng đáp án — chỉ xem đọc hiểu được bao nhiêu.</div>` +
    `<table class="bang"><tr><th>Bản</th><th>Nhận ra khối</th><th>Có đáp án</th><th>Tổng số câu</th><th>Câu bị chặn</th><th>Vỡ</th></tr>` +
    dong.map(d => `<tr><td>${esc(d.ten)}</td>` +
      `<td>${d.nhanDang}/${d.tong} <span class="n">${pc(d.nhanDang, d.tong)}</span></td>` +
      `<td>${d.coDapAn}/${d.tong} <span class="n">${pc(d.coDapAn, d.tong)}</span></td>` +
      `<td>${d.tongCau}</td><td>${d.chan}</td><td>${d.loi}</td></tr>`).join('') +
    `</table>`;
}

const A = runA(), B = runB(), C = runC(), D = runD(), E = await runE(), F = await runF();
document.getElementById('out').innerHTML =
  (loadError ? `<div class="sum bad">Không nạp được src/solve/engine.js: ${esc(loadError.message || loadError)}</div>` : '') +
  section('A · Không hồi quy', 'solveOnce() phải giống hệt bản tham chiếu đã đóng băng.', A.rows, A.sum) +
  section('B · Trung thực về dữ kiện', 'solve() phải chặn đúng chỗ thiếu, và không báo oan chỗ đề cố ý không cho số.', B.rows, B.sum) +
  section('C · Đề gõ không dấu', 'Cùng một đề, gỡ sạch dấu, phải ra kết quả trùng khít bản có dấu.', C.rows, C.sum) +
  section('E · Nét khuất', 'Kiểm bằng sự thật hình học đếm được, không bằng cảm nhận nhìn thấy đúng.', E.rows, E.sum) +
  section('F · Tự dựng hình · chia sẻ · xuất ảnh', 'Những gì giao diện hứa thì phần lõi phải làm được.', F.rows, F.sum) +
  bangD(D);

const fails = (rows, key) => rows.filter(r => r.status !== 'ĐẠT' && r.status !== 'CHỜ')
  .map(r => ({ i: r.i + 1, [key]: r.text, status: r.status, diffs: r.diffs }));

window.__RESULTS__ = {
  ready: true,
  A: { ...A.sum, failures: fails(A.rows, 'de') },
  B: { ...B.sum, failures: fails(B.rows, 'ten') },
  C: { ...C.sum, failures: fails(C.rows, 'de') },
  E: { ...E.sum, failures: fails(E.rows, 'ten') },
  F: { ...F.sum, failures: fails(F.rows, 'ten') },
  D,
  loadError: loadError ? String(loadError.message || loadError) : null,
};
console.log('[test] A', JSON.stringify(A.sum), 'B', JSON.stringify(B.sum), 'C', JSON.stringify(C.sum));
