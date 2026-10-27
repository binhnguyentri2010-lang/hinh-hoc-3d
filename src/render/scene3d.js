/* Vẽ hình lên màn hình bằng three.js.

   Giai đoạn 3 đổi hai thứ căn bản so với bản cũ:

   1. PHÉP CHIẾU SONG SONG (OrthographicCamera) làm mặc định. Hình biểu diễn trong sách giáo
      khoa là phép chiếu song song: hai cạnh song song trong không gian thì song song trên
      hình, trung điểm vẫn là trung điểm. Phép chiếu phối cảnh của bản cũ làm cạnh xa co lại,
      nhìn "thật" hơn nhưng lệch hẳn so với hình trong sách và không dán vào bài được.
      Vẫn giữ công tắc quay về phối cảnh khi muốn nhìn cho có chiều sâu.

   2. NÉT KHUẤT TÍNH ĐÚNG thay cho mẹo depthFunc. Xem src/render/hidden.js. Ngoài chuyện
      chính xác hơn, cái được lớn nhất là bây giờ MÁY BIẾT cạnh nào khuất — nhờ đó mới
      xuất được ảnh SVG/PNG đúng nét liền nét đứt. */

import { Scene, PerspectiveCamera, OrthographicCamera, WebGLRenderer, Group, Vector3, Vector2,
         Box3, Raycaster, SphereGeometry, MeshBasicMaterial, Mesh, BufferGeometry,
         Float32BufferAttribute, DoubleSide } from 'three';
import { OrbitControls } from '../../vendor/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from '../../vendor/CSS2DRenderer.js';
import { Line2 } from '../../vendor/lines/Line2.js';
import { LineMaterial } from '../../vendor/lines/LineMaterial.js';
import { LineGeometry } from '../../vendor/lines/LineGeometry.js';
import { sub, add, mul, dot, len, avg, closest } from '../core/vec.js';
import { faceData, visibleEdges, splitByView } from './hidden.js';

/* Toạ độ toán học [x, y, z] với z hướng lên → toạ độ three.js (y hướng lên). */
const V = p => new Vector3(p[0], p[2], -p[1]);
/* Ngược lại: hướng nhìn của three.js → hướng trong hệ toạ độ toán học. */
const huongToan = v => [v.x, -v.z, v.y];

const HUONG_NHIN = new Vector3(.9, .55, 1.25).normalize();   // góc nhìn quen thuộc kiểu SGK
const KHOA = (p, q) => [p, q].sort().join('|');

export function initViewer(view) {
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setClearColor(0x0f1420);
  view.appendChild(renderer.domElement);

  const lr = new CSS2DRenderer();
  Object.assign(lr.domElement.style, { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' });
  view.appendChild(lr.domElement);

  const scene = new Scene();
  const camP = new PerspectiveCamera(40, 1, .01, 1000);
  const camO = new OrthographicCamera(-1, 1, 1, -1, .01, 1000);
  let camera = camO, songSong = true;
  let controls = null;

  const group = new Group();
  scene.add(group);

  let lineMats = [], faceMeshes = [], labels = [], overlays = [], selOv = -1;
  let toggles = { faces: true, labels: true, rotate: false };
  let buocHien = -1;          // −1 = hiện trọn lời giải; ≥0 = chỉ tới bước đó
  let lastFrame = null;
  let res = null, fd = [], canh = [], phu = [], huongCu = null;

  const size = () => [Math.max(1, view.clientWidth), Math.max(1, view.clientHeight)];
  const degenerate = (w, h) => w <= 2 || h <= 2;

  /* ---------- camera ---------- */

  function makeControls() {
    if (controls) controls.dispose();
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotateSpeed = 1.5;
    controls.autoRotate = toggles.rotate;
    if (lastFrame) controls.target.copy(lastFrame.c);
    controls.addEventListener('change', capNhatKhuat);
  }

  /* Đặt camera sao cho toàn khối lọt khung. U là đường chéo hộp bao. */
  function frame(c, U) {
    const [w, h] = size();
    lastFrame = { c: c.clone(), U, degenerate: degenerate(w, h) };

    const kc = U * 2.2;
    camera.position.copy(c).add(HUONG_NHIN.clone().multiplyScalar(kc));
    if (songSong) {
      const nua = U * .60, aspect = w / h;
      camO.left = -nua * aspect; camO.right = nua * aspect;
      camO.top = nua; camO.bottom = -nua;
      camO.near = .01; camO.far = kc * 4;
      camO.zoom = 1;
    } else {
      const fovY = 20 * Math.PI / 180;
      const nua = Math.min(fovY, Math.atan(Math.tan(fovY) * w / h));
      camP.position.copy(c).add(HUONG_NHIN.clone().multiplyScalar(U * .6 / Math.sin(nua)));
      camP.near = U * .01; camP.far = U * 50;
    }
    camera.updateProjectionMatrix();
    if (controls) { controls.target.copy(c); controls.update(); }
    huongCu = null;
    capNhatKhuat();
  }

  function resize() {
    const [w, h] = size();
    renderer.setSize(w, h); lr.setSize(w, h);
    if (songSong) {
      const nua = (camO.top - camO.bottom) / 2, aspect = w / h;
      camO.left = -nua * aspect; camO.right = nua * aspect;
    } else {
      camP.aspect = w / h;
    }
    camera.updateProjectionMatrix();
    lineMats.forEach(m => m.resolution.set(w, h));
    /* Khung ngắm tính lúc cửa sổ còn bẹp thì vô dụng: hoặc camera là NaN, hoặc bị đẩy ra xa
       tít để nhét vừa một khung rộng 1 pixel. Có kích thước thật rồi thì ngắm lại — chỉ đúng
       lần chuyển đó, không phải mọi lần resize, kẻo mất góc nhìn người dùng vừa xoay. */
    if (lastFrame && (lastFrame.degenerate || !Number.isFinite(camera.position.x)) && !degenerate(w, h))
      frame(lastFrame.c, lastFrame.U);
  }
  addEventListener('resize', resize);

  /* ---------- nét khuất ---------- */

  function capNhatKhuat() {
    if (!fd.length) return;
    const v = new Vector3();
    camera.getWorldDirection(v);
    const huong = huongToan(v);
    /* Chỉ tính lại khi hướng nhìn đổi đáng kể — xoay chuột đổi hướng từng chút một,
       dựng lại hình học mỗi khung hình là phí. */
    if (huongCu) {
      const d = Math.abs(huong[0] - huongCu[0]) + Math.abs(huong[1] - huongCu[1]) + Math.abs(huong[2] - huongCu[2]);
      if (d < .012) return;
    }
    huongCu = huong;

    const hien = visibleEdges(fd, huong, KHOA);
    for (const e of canh) {
      const thay = hien.has(e.key);
      e.lien.visible = thay;
      e.dut.visible = !thay;
    }
    for (const p of phu) veLaiPhu(p, huong);
  }

  /* ---------- dựng ---------- */

  /* depthTest tắt cho MỌI đường: đã tính được đường nào khuất thì cứ vẽ đúng chừng ấy đường,
     không cần bộ đệm chiều sâu phân xử nữa. Trước khi tắt, các mặt (có ghi chiều sâu) che mất
     toàn bộ nét đứt — cạnh khuất biến mất khỏi hình thay vì hiện nét đứt. Đây cũng chính là
     cách vẽ của hình trong sách: nét khuất vẫn nằm trên mặt giấy, chỉ khác kiểu nét. */
  function segLine(a, b, color, w, dashed, U) {
    const g = new LineGeometry();
    g.setPositions([...V(a).toArray(), ...V(b).toArray()]);
    const m = new LineMaterial({
      color, linewidth: dashed ? w * .85 : w, transparent: true,
      dashed, dashSize: U * .022, gapSize: U * .016, opacity: dashed ? .75 : 1,
      depthTest: false, depthWrite: false,
    });
    const l = new Line2(g, m);
    if (dashed) l.computeLineDistances();
    l.renderOrder = dashed ? 3 : 2;
    lineMats.push(m);
    return l;
  }

  /* Đường phụ có thể xuyên qua khối, nên phải cắt thành khúc trong (khuất) và khúc ngoài. */
  function veLaiPhu(p, huong) {
    p.g.clear();
    for (const o of p.cu) { o.geometry?.dispose(); o.material?.dispose?.(); }
    p.cu = [];
    for (const k of splitByView(p.a, p.b, fd, huong)) {
      const a = add(p.a, mul(sub(p.b, p.a), k.t0));
      const b = add(p.a, mul(sub(p.b, p.a), k.t1));
      if (len(sub(a, b)) < 1e-9) continue;
      const l = segLine(a, b, p.color, p.w, k.khuat, p.U);
      p.g.add(l); p.cu.push(l);
    }
  }

  /* giuGocNhin: dựng lại hình nhưng giữ nguyên camera. Cần cho việc kéo thanh trượt —
     ngắm lại camera mỗi nấc kéo thì hình giật liên tục. */
  function build(nres, giuGocNhin = false) {
    res = nres;
    group.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); });
    group.clear();
    lineMats = []; faceMeshes = []; labels = []; canh = []; phu = [];

    const { pts } = res, all = Object.values(pts).concat(res.feet);
    const box = new Box3();
    all.forEach(p => box.expandByPoint(V(p)));
    const c = box.getCenter(new Vector3()), U = Math.max(box.getSize(new Vector3()).length(), 1e-3);
    const P = p => typeof p === 'string' ? pts[p] : p;

    fd = faceData(pts, res.faces);

    function poly(ns, color, op, writeDepth, par = group) {
      const ps = ns.map(n => V(P(n))), arr = [];
      for (let i = 1; i < ps.length - 1; i++) arr.push(...ps[0].toArray(), ...ps[i].toArray(), ...ps[i + 1].toArray());
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(arr, 3));
      const mat = new MeshBasicMaterial({ color, transparent: true, opacity: op, side: DoubleSide,
                                          depthWrite: writeDepth, depthTest: writeDepth,
                                          polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 });
      const mesh = new Mesh(g, mat); mesh.renderOrder = 1; par.add(mesh);
      return mesh;
    }

    res.faces.forEach(f => faceMeshes.push(poly(f, 0x6ea8ff, .07, true)));
    const seen = new Set();
    res.planesHi.forEach(pl => {
      const k = pl.join('');
      if (!seen.has(k)) { seen.add(k); poly(pl, 0x7ee0a1, .18, false); }
    });

    /* Cạnh của khối: dựng sẵn cả nét liền lẫn nét đứt, mỗi lần đổi góc nhìn chỉ bật/tắt. */
    res.edges.forEach(([a, b]) => {
      const lien = segLine(pts[a], pts[b], 0x9cc2ff, 2.6, false, U);
      const dut = segLine(pts[a], pts[b], 0x9cc2ff, 2.6, true, U);
      group.add(lien); group.add(dut);
      canh.push({ key: KHOA(a, b), a: pts[a], b: pts[b], lien, dut });
    });

    /* Đường phụ: mỗi đoạn một nhóm riêng, nội dung dựng lại khi đổi góc nhìn. */
    res.aux.forEach(([a, b]) => {
      const pa = P(a), pb = P(b);
      if (!pa || !pb || len(sub(pa, pb)) < 1e-9) return;
      const g = new Group(); group.add(g);
      phu.push({ a: pa, b: pb, color: 0xffb454, w: 2, U, g, cu: [] });
    });

    const sph = new SphereGeometry(U * .009, 12, 8);
    const dot3 = (p, col, par = group) => {
      const s = new Mesh(sph, new MeshBasicMaterial({ color: col, depthTest: false, depthWrite: false }));
      s.position.copy(V(p)); s.renderOrder = 4; par.add(s);
    };
    const cen = V(avg(Object.values(pts)));

    /* Hướng đặt nhãn: đẩy ra xa các điểm LÂN CẬN, không phải cứ đẩy thẳng ra từ tâm hình.
       Đẩy từ tâm thì hai điểm gần nhau sẽ có nhãn cùng hướng và chồng lên nhau — thiết diện
       thêm I, J, K vào là thấy ngay. Không có điểm nào ở gần thì mới quay về cách cũ. */
    const moiDiem = Object.values(pts).map(V);
    function huongNhan(v3) {
      const d = new Vector3();
      let n = 0;
      for (const q of moiDiem) {
        const w = v3.clone().sub(q);
        const l = w.length();
        if (l < 1e-9 || l > U * .42) continue;
        d.add(w.normalize().multiplyScalar(1 / Math.max(l, U * .03)));
        n++;
      }
      if (!n || d.length() < 1e-9) d.copy(v3).sub(cen);
      if (d.length() < 1e-6) d.set(0, 1, 0);
      return d.normalize();
    }

    for (const [n, p] of Object.entries(pts)) {
      const d = res.derived.includes(n);
      dot3(p, d ? 0xffd166 : 0xffffff);
      const el = document.createElement('div');
      el.className = 'lbl' + (d ? ' d' : '');
      el.textContent = n;
      const o = new CSS2DObject(el), v = V(p);
      o.position.copy(v.clone().add(huongNhan(v).multiplyScalar(U * .04)));
      group.add(o); labels.push(o);
    }
    res.feet.forEach(p => dot3(p, 0xff6b8b));

    /* Lớp phủ của từng câu hỏi. Mỗi phần tử nhớ nó thuộc BƯỚC thứ mấy, để trình chiếu từng
       bước chỉ hiện đúng phần của bước đó — thay vì phơi cả lời giải ra ngay từ đầu. */
    overlays = res.R.map(r => {
      if (!r.ov) return null;
      const g = new Group(), labs = [], phanTu = [];
      group.add(g);
      r.ov.planes.forEach((pl, i) => poly(pl, [0x7ee0a1, 0xc792ea, 0xffd166][i % 3], .2, false, g));
      r.ov.segs.forEach(([a, b, k, bc]) => {
        if (len(sub(a, b)) < 1e-9) return;
        const l = segLine(a, b, k === 'inter' ? 0xff5fa2 : 0xffb454, k === 'inter' ? 3.6 : 2, false, U);
        g.add(l); phanTu.push({ o: l, buoc: bc });
      });
      for (const [n, p] of Object.entries(r.ov.names)) {
        const bc = r.ov.buocTen ? r.ov.buocTen[n] : undefined;
        const s = new Mesh(sph, new MeshBasicMaterial({ color: 0xff5fa2, depthTest: false, depthWrite: false }));
        s.position.copy(V(p)); s.renderOrder = 4; g.add(s);
        const el = document.createElement('div');
        el.className = 'lbl'; el.style.color = '#ff8fc0'; el.textContent = n;
        const o = new CSS2DObject(el), v = V(p);
        o.position.copy(v.clone().add(huongNhan(v).multiplyScalar(U * .04)));
        g.add(o); labs.push(o);
        phanTu.push({ o: s, buoc: bc }, { o, nhan: true, buoc: bc });
      }
      return { g, labs, phanTu, soBuoc: r.ov.soBuoc };
    });
    selOv = res.R.findIndex(r => r.ov);
    buocHien = -1;

    if (!controls) makeControls();
    if (giuGocNhin && lastFrame) { huongCu = null; capNhatKhuat(); }
    else frame(c, U);
    applyToggles(); resize();
  }

  function applyToggles() {
    faceMeshes.forEach(m => m.visible = toggles.faces);
    labels.forEach(o => o.element.style.display = toggles.labels ? '' : 'none');
    labels.forEach(o => o.visible = toggles.labels);
    if (controls) controls.autoRotate = toggles.rotate;
    overlays.forEach((o, i) => {
      if (!o) return;
      const on = selOv === -1 || selOv === i;
      o.g.visible = on;
      o.labs.forEach(l => l.visible = on && toggles.labels);
      (o.phanTu || []).forEach(p => {
        const hien = on && (buocHien < 0 || p.buoc === undefined || p.buoc <= buocHien);
        p.o.visible = hien && (!p.nhan || toggles.labels);
      });
    });
  }

  /* ---------- kéo điểm tự do trên hình ---------- */

  /* Đề chỉ nói "M nằm trên cạnh AB" thì vị trí M là tự do — kéo được. Đây là cách trực quan
     nhất để thấy "khi nào thiết diện đổi dạng", thứ mà nhìn hình tĩnh không thấy được.

     Chọn điểm bằng khoảng cách TRÊN MÀN HÌNH chứ không raycast vào quả cầu: quả cầu rất nhỏ
     nên raycast đòi bấm quá chính xác, còn trên điện thoại thì gần như không bấm trúng. */
  const rc = new Raycaster();
  const mang = v => [v.x, v.y, v.z];
  let keoList = [], khiKeo = null, dangKeo = null, ctrlCu = true;

  function viTriManHinh(p) {
    const r = renderer.domElement.getBoundingClientRect();
    const v = V(p).project(camera);
    return { x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height, r };
  }

  function xuongTay(ev) {
    if (!keoList.length || ev.button !== 0) return;
    const r = renderer.domElement.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    let gan = null, dmin = 18;
    for (const k of keoList) {
      const s = viTriManHinh(k.p);
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < dmin) { dmin = d; gan = k; }
    }
    if (!gan) return;
    dangKeo = gan;
    ctrlCu = controls.enabled;
    controls.enabled = false;                  // không xoay hình trong lúc kéo điểm
    renderer.domElement.setPointerCapture(ev.pointerId);
    renderer.domElement.style.cursor = 'grabbing';
  }

  function ruaTay(ev) {
    if (!dangKeo) {
      if (keoList.length) {
        const r = renderer.domElement.getBoundingClientRect();
        const x = ev.clientX - r.left, y = ev.clientY - r.top;
        const gan = keoList.some(k => { const s = viTriManHinh(k.p); return Math.hypot(s.x - x, s.y - y) < 18; });
        renderer.domElement.style.cursor = gan ? 'grab' : '';
      }
      return;
    }
    const r = renderer.domElement.getBoundingClientRect();
    rc.setFromCamera(new Vector2(
      ((ev.clientX - r.left) / r.width) * 2 - 1,
      -((ev.clientY - r.top) / r.height) * 2 + 1), camera);

    /* Điểm trên cạnh gần tia chuột nhất — dùng lại closest() của core/vec.js. */
    const A = mang(V(dangKeo.a)), B = mang(V(dangKeo.b));
    const o = mang(rc.ray.origin);
    const d = mang(rc.ray.direction.clone().multiplyScalar(1e4).add(rc.ray.origin));
    const [tren] = closest(A, B, o, d);
    const ab = sub(B, A);
    const t = dot(sub(tren, A), ab) / dot(ab, ab);
    if (khiKeo) khiKeo(dangKeo.id, Math.max(.03, Math.min(.97, t)));
  }

  function nhacTay(ev) {
    if (!dangKeo) return;
    dangKeo = null;
    controls.enabled = ctrlCu;
    try { renderer.domElement.releasePointerCapture(ev.pointerId); } catch (e) { /* đã nhả */ }
    renderer.domElement.style.cursor = '';
  }

  renderer.domElement.addEventListener('pointerdown', xuongTay);
  renderer.domElement.addEventListener('pointermove', ruaTay);
  renderer.domElement.addEventListener('pointerup', nhacTay);
  renderer.domElement.addEventListener('pointercancel', nhacTay);

  /* Vẽ đúng một khung hình, không qua requestAnimationFrame. Cần cho kiểm thử tự động
     (khung trình duyệt bị ẩn thì rAF không chạy) và cho việc xuất ảnh PNG. */
  function renderOnce() {
    if (controls) controls.update();
    renderer.render(scene, camera);
    lr.render(scene, camera);
  }

  (function loop() { requestAnimationFrame(loop); renderOnce(); })();

  return {
    build, resize, renderOnce,
    setToggles(next) { toggles = { ...toggles, ...next }; applyToggles(); },
    setOverlay(i) { selOv = i; buocHien = -1; applyToggles(); },
    getOverlay() { return selOv; },
    setBuoc(k) { buocHien = k; applyToggles(); },
    setKeoDuoc(list, cb) { keoList = list || []; khiKeo = cb; },
    getBuoc() { return buocHien; },
    soBuocCuaLop(i) { return overlays[i] && overlays[i].soBuoc; },
    laSongSong() { return songSong; },
    setPhepChieu(ss) {
      if (ss === songSong) return;
      songSong = ss;
      camera = ss ? camO : camP;
      makeControls();
      if (lastFrame) frame(lastFrame.c, lastFrame.U);
      resize();
    },
    /* Dữ liệu cho render/export.js: mọi thứ cần để vẽ lại hình ra SVG. */
    duLieuXuat() {
      const v = new Vector3(); camera.getWorldDirection(v);
      return {
        res, fd, huong: huongToan(v), camera, V,
        hien: visibleEdges(fd, huongToan(v), KHOA), KHOA,
        selOv, size: size(),
      };
    },
    _inner: { scene, get camera() { return camera; }, get controls() { return controls; }, renderer, group, get labels() { return labels; }, get fd() { return fd; } },
  };
}
