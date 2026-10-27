/* Điểm vào của toàn bộ phần lõi: đề bài (chuỗi) → hình + đáp án.

   Hai lớp:
     solveOnce()  dựng hình và giải một lượt, đúng như bản cũ
     solve()      chạy solveOnce nhiều lượt với các con số máy tự chọn bị đổi đi,
                  để biết đáp án nào phụ thuộc vào chúng → chặn hoặc ghi chú

   Xem src/solve/trust.js để hiểu vì sao phải làm vậy. */

import { LEN, norm, lenVal, findUnit } from '../parse/normalize.js';
import { runDefs } from '../build/points.js';
import { detectSolid } from '../build/scene.js';
import { bindPlanes } from '../build/planes.js';
import { runQueries } from './queries.js';
import { KIND, makeGuess, jitterFor, answerKey } from './trust.js';

export function solveOnce(raw, opts = {}) {
  const t = norm(raw), W = [], lens = {};
  const K = (p, q) => [p, q].sort().join('|');
  const L = (p, q) => lens[K(p, q)];

  /* Độ dài cho sẵn: "AB = a", "SA = BC = a√2" (một giá trị gán cho nhiều đoạn) */
  for (const m of t.matchAll(new RegExp(`((?:(?<![A-Z'])[A-Z]'?[A-Z]'?\\s*(?:=|bằng)\\s*)+)${LEN}`, 'g'))) {
    const v = lenVal(m[2], m[3], m[4]);
    for (const q of m[1].matchAll(/([A-Z]'?)([A-Z]'?)\s*(?:=|bằng)/g)) lens[K(q[1], q[2])] = v;
  }

  const num1 = re => { const m = t.match(new RegExp(re + LEN)); return m ? lenVal(m[1], m[2], m[3]) : undefined; };
  const baseSide = num1("cạnh\\s*(?:đáy\\s*)?(?:đều\\s*)?(?:bằng|là|=|có độ dài(?:\\s*bằng)?)?\\s*");
  const lateral = num1("cạnh bên\\s*(?:đều\\s*)?(?:bằng|là|=|có độ dài(?:\\s*bằng)?)?\\s*");
  const heightV = num1("(?:chiều cao|đường cao)[^.;,=]{0,25}?(?:bằng|là|=)?\\s*");

  const ctx = {
    t, W, lens, K, L,
    baseSide, lateral, heightV,
    pts: {}, faces: [], S: { kind: null, apex: null, base: [], top: [] },
    derived: [], structNames: new Set(),
    aux: [], auxExt: [], planesHi: [], feet: [],
    frI: 0,
    edges: null,
    guesses: [],
    unit: findUnit(t) || 'a',
  };
  ctx.guess = makeGuess(ctx, opts.jitter, opts.supply);

  const err = detectSolid(ctx);
  if (err) return err;

  runDefs(ctx);

  /* Kho tên điểm dùng chung. Phải đặt ở đây, trước bindPlanes, vì cả đỉnh thiết diện lẫn
     giao điểm sinh ra khi tìm giao tuyến đều lấy tên từ kho này — hai bên mà có kho riêng
     thì sẽ đặt trùng tên nhau. */
  ctx.usedNames = new Set(Object.keys(ctx.pts));
  ctx.newName = () => {
    for (const c of 'IJKEFHGOPQRTXYZUVW') if (!ctx.usedNames.has(c)) { ctx.usedNames.add(c); return c; }
    return '?';
  };

  bindPlanes(ctx);   // sau runDefs: định nghĩa "(α) qua M, N, P" cần M, N, P đã dựng xong

  const { R, edges } = runQueries(ctx);

  return {
    pts: ctx.pts,
    faces: ctx.faces,
    edges: [...edges].map(k => k.split('|')),
    aux: ctx.aux,
    planesHi: ctx.planesHi,
    feet: ctx.feet,
    derived: ctx.derived,
    R, W: ctx.W, S: ctx.S,
    guesses: ctx.guesses,
  };
}

const ROUNDS = [0, 1];  // hai lần nhiễu khác nhau, để loại trùng hợp ngẫu nhiên

export function solve(raw, opts = {}) {
  const supply = opts.supply || {};
  const base = solveOnce(raw, { supply });
  if (base.error) return base;

  const guesses = base.guesses || [];
  /* Chỉ thử nhiễu những đại lượng máy tự chọn. Cái nào người dùng đã gõ bù thì coi như
     đề cho — không nhiễu, không chặn. */
  const canThu = guesses.filter(g => g.kind === KIND.MISSING || g.kind === KIND.FREE);
  const coDoan = canThu.length > 0;
  base.trust = {
    guesses, blocked: 0, missingUsed: [], freeUsed: [],
    level: coDoan ? 'biểu-diễn' : 'đủ',
  };
  if (!canThu.length || !base.R.length) return base;

  /* Với từng con số máy tự chọn: dựng lại toàn bộ hình với riêng nó đổi đi, rồi so đáp án.
     Nhiễu riêng từng cái để biết đáp án phụ thuộc đúng cái nào, chứ không chỉ biết
     "phụ thuộc một cái gì đó". */
  const keys = base.R.map(answerKey);
  const deps = base.R.map(() => new Set());

  for (const g of canThu) {
    for (const round of ROUNDS) {
      let probe;
      try {
        probe = solveOnce(raw, { supply, jitter: { [g.id]: jitterFor(g, round) } });
      } catch (e) {
        base.R.forEach((_, i) => deps[i].add(g.id));   // đổi số là vỡ → coi như phụ thuộc
        break;
      }
      if (probe.error || probe.R.length !== base.R.length) {
        base.R.forEach((_, i) => deps[i].add(g.id));
        break;
      }
      probe.R.forEach((pr, i) => { if (answerKey(pr) !== keys[i]) deps[i].add(g.id); });
    }
  }

  const byId = Object.fromEntries(guesses.map(g => [g.id, g]));
  const missingUsed = new Set(), freeUsed = new Set();

  base.R.forEach((r, i) => {
    const ds = [...deps[i]].map(id => byId[id]);
    const miss = ds.filter(g => g.kind === KIND.MISSING);
    const free = ds.filter(g => g.kind === KIND.FREE);
    r.depends = [...deps[i]];

    if (miss.length) {
      miss.forEach(g => missingUsed.add(g.id));
      r.blocked = true;
      r.rawA = r.a;
      r.a = 'Không tính được — thiếu ' + miss.map(g => g.label).join(', ');
      base.trust.blocked++;
    } else if (free.length) {
      free.forEach(g => freeUsed.add(g.id));
      r.note = 'ứng với ' + free.map(g => g.label).join(' và ') + ' đang chọn — kéo để đổi';
    }
  });

  base.trust.missingUsed = [...missingUsed].map(id => byId[id]);
  base.trust.freeUsed = [...freeUsed].map(id => byId[id]);

  /* Mức độ tin cậy của HÌNH (khác với của từng đáp án):
       'đủ'      mọi kích thước đều từ đề → hình đúng tỉ lệ
       'biểu-diễn' có con số máy tự chọn nhưng không câu nào phụ thuộc → hình biểu diễn
                   bình thường như trong sách, không việc gì phải báo động
       'thiếu'   có câu bị chặn → hình sai tỉ lệ VÀ đề thiếu dữ kiện thật */
  base.trust.level = base.trust.blocked ? 'thiếu' : coDoan ? 'biểu-diễn' : 'đủ';
  return base;
}
