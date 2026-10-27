/* Vẽ hình lên màn hình bằng three.js.
   Trích nguyên văn từ legacy/index.html dòng 551–626. Khác một điểm duy nhất: trạng thái
   công tắc (mặt / nhãn / tự xoay) nay truyền vào qua setToggles() thay vì đọc thẳng
   checkbox trong DOM — để module render không dính vào giao diện.

   TODO Giai đoạn 3:
     · đổi sang OrthographicCamera (phép chiếu song song) cho đúng hình biểu diễn SGK
     · thay mẹo GreaterDepth bằng luật nét khuất thật: với khối lồi, một cạnh nhìn thấy
       được khi và chỉ khi có ít nhất một mặt kề quay về phía người nhìn
     · giãn nhãn điểm cho khỏi chồng lên nhau khi thiết diện thêm I, J, K… vào hình */

import { Scene, PerspectiveCamera, WebGLRenderer, Group, Vector3, Box3,
         SphereGeometry, MeshBasicMaterial, Mesh, BufferGeometry,
         Float32BufferAttribute, DoubleSide, GreaterDepth } from 'three';
import { OrbitControls } from '../../vendor/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from '../../vendor/CSS2DRenderer.js';
import { Line2 } from '../../vendor/lines/Line2.js';
import { LineMaterial } from '../../vendor/lines/LineMaterial.js';
import { LineGeometry } from '../../vendor/lines/LineGeometry.js';
import { sub, len, avg } from '../core/vec.js';

/* Toạ độ toán học [x, y, z] với z hướng lên → toạ độ three.js (y hướng lên). */
const V = p => new Vector3(p[0], p[2], -p[1]);

export function initViewer(view) {
  const renderer = new WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setClearColor(0x0f1420);
  view.appendChild(renderer.domElement);

  const lr = new CSS2DRenderer();
  Object.assign(lr.domElement.style, { position: 'absolute', top: 0, left: 0, pointerEvents: 'none' });
  view.appendChild(lr.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, .01, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotateSpeed = 1.5;
  const group = new Group();
  scene.add(group);

  let lineMats = [], faceMeshes = [], labels = [], overlays = [], selOv = -1;
  let toggles = { faces: true, labels: true, rotate: false };
  let lastFrame = null;   // khung ngắm gần nhất, để dựng lại nếu camera hỏng

  /* Kích thước khung nhìn, luôn ≥ 1 pixel.

     SỬA LỖI so với bản cũ: khi trang được mở trong tab nền, trong cửa sổ thu nhỏ, hay
     trước khi trình duyệt kịp dàn trang, clientWidth bằng 0. Bản cũ chỉ chặn chiều cao
     (Math.max(1, clientHeight)) mà quên chiều rộng, nên công thức đặt camera chia cho
     sin(atan(tan20° × 0 / h)) = chia cho 0 → toạ độ camera thành NaN. Và vì NaN không tự
     khỏi, khung nhìn đen vĩnh viễn kể cả sau khi cửa sổ đã rộng trở lại. */
  const size = () => [Math.max(1, view.clientWidth), Math.max(1, view.clientHeight)];

  function resize() {
    const [w, h] = size();
    renderer.setSize(w, h); lr.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    lineMats.forEach(m => m.resolution.set(w, h));
    /* Khung ngắm tính lúc cửa sổ còn bẹp thì vô dụng: hoặc camera là NaN, hoặc nó bị đẩy
       ra xa tít để nhét vừa một khung rộng 1 pixel. Khi cửa sổ có kích thước thật, ngắm lại.
       Chỉ làm đúng lần chuyển đó, không phải mọi lần resize — nếu không thì mỗi lần người
       dùng kéo cửa sổ là mất luôn góc nhìn họ vừa xoay. */
    if (lastFrame && (lastFrame.degenerate || !Number.isFinite(camera.position.x)) && !degenerate(w, h))
      frame(lastFrame.c, lastFrame.U);
  }

  const degenerate = (w, h) => w <= 2 || h <= 2;
  addEventListener('resize', resize);

  /* Đặt camera sao cho toàn khối lọt khung. */
  function frame(c, U) {
    const [w, h] = size();
    const fovY = 20 * Math.PI / 180;
    const half = Math.min(fovY, Math.atan(Math.tan(fovY) * w / h));
    lastFrame = { c: c.clone(), U, degenerate: degenerate(w, h) };
    controls.target.copy(c);
    camera.position.copy(c).add(new Vector3(.9, .55, 1.25).normalize().multiplyScalar(U * .6 / Math.sin(half)));
    camera.near = U * .01;
    camera.far = U * 50;
    camera.updateProjectionMatrix();
  }

  function applyToggles() {
    faceMeshes.forEach(m => m.visible = toggles.faces);
    labels.forEach(o => o.element.style.display = toggles.labels ? '' : 'none');
    labels.forEach(o => o.visible = toggles.labels);
    controls.autoRotate = toggles.rotate;
    overlays.forEach((o, i) => {
      if (!o) return;
      const on = selOv === -1 || selOv === i;
      o.g.visible = on;
      o.labs.forEach(l => l.visible = on && toggles.labels);
    });
  }

  function build(res) {
    group.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); });
    group.clear();
    lineMats = []; faceMeshes = []; labels = [];

    const { pts } = res, all = Object.values(pts).concat(res.feet);
    const box = new Box3();
    all.forEach(p => box.expandByPoint(V(p)));
    const c = box.getCenter(new Vector3()), U = Math.max(box.getSize(new Vector3()).length(), 1e-3);
    const P = p => typeof p === 'string' ? pts[p] : p;

    /* Mỗi đoạn vẽ hai lần: nét liền cho phần nhìn thấy, nét đứt mờ cho phần bị che.
       Bản vẽ thứ hai dùng depthFunc GreaterDepth nên chỉ hiện ở chỗ bị khuất. */
    function seg(a, b, color, w, par = group) {
      const g = new LineGeometry();
      g.setPositions([...V(a).toArray(), ...V(b).toArray()]);
      const m1 = new LineMaterial({ color, linewidth: w, transparent: true });
      const l1 = new Line2(g, m1); l1.renderOrder = 2; par.add(l1);
      const m2 = new LineMaterial({ color, linewidth: w * .8, dashed: true, dashSize: U * .025,
                                    gapSize: U * .018, transparent: true, opacity: .7, depthWrite: false });
      m2.depthFunc = GreaterDepth;
      const l2 = new Line2(g, m2); l2.computeLineDistances(); l2.renderOrder = 3; par.add(l2);
      lineMats.push(m1, m2);
    }

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
    res.edges.forEach(([a, b]) => seg(pts[a], pts[b], 0x9cc2ff, 2.6));
    res.aux.forEach(([a, b]) => {
      const pa = P(a), pb = P(b);
      if (pa && pb && len(sub(pa, pb)) > 1e-9) seg(pa, pb, 0xffb454, 2);
    });

    const sph = new SphereGeometry(U * .009, 12, 8);
    const dot3 = (p, col) => {
      const s = new Mesh(sph, new MeshBasicMaterial({ color: col }));
      s.position.copy(V(p)); s.renderOrder = 4; group.add(s);
    };
    const cen = V(avg(Object.values(pts)));
    for (const [n, p] of Object.entries(pts)) {
      const d = res.derived.includes(n);
      dot3(p, d ? 0xffd166 : 0xffffff);
      const el = document.createElement('div');
      el.className = 'lbl' + (d ? ' d' : '');
      el.textContent = n;
      const o = new CSS2DObject(el), v = V(p), dir = v.clone().sub(cen);
      if (dir.length() < 1e-6) dir.set(0, 1, 0);
      o.position.copy(v.add(dir.normalize().multiplyScalar(U * .035)));
      group.add(o); labels.push(o);
    }
    res.feet.forEach(p => dot3(p, 0xff6b8b));

    /* Lớp phủ riêng cho từng câu hỏi giao tuyến / giao điểm */
    overlays = res.R.map(r => {
      if (!r.ov) return null;
      const g = new Group(), labs = [];
      group.add(g);
      r.ov.planes.forEach((pl, i) => poly(pl, [0x7ee0a1, 0xc792ea, 0xffd166][i % 3], .2, false, g));
      r.ov.segs.forEach(([a, b, k]) => {
        if (len(sub(a, b)) > 1e-9) seg(a, b, k === 'inter' ? 0xff5fa2 : 0xffb454, k === 'inter' ? 3.6 : 2, g);
      });
      for (const [n, p] of Object.entries(r.ov.names)) {
        const s = new Mesh(sph, new MeshBasicMaterial({ color: 0xff5fa2 }));
        s.position.copy(V(p)); s.renderOrder = 4; g.add(s);
        const el = document.createElement('div');
        el.className = 'lbl'; el.style.color = '#ff8fc0'; el.textContent = n;
        const o = new CSS2DObject(el), v = V(p), dir = v.clone().sub(cen);
        if (dir.length() < 1e-6) dir.set(0, 1, 0);
        o.position.copy(v.add(dir.normalize().multiplyScalar(U * .035)));
        g.add(o); labs.push(o);
      }
      return { g, labs };
    });
    selOv = res.R.findIndex(r => r.ov);

    frame(c, U);
    applyToggles(); resize();
  }

  /* Vẽ đúng một khung hình, không qua requestAnimationFrame.
     Cần cho hai việc: kiểm thử tự động (khung trình duyệt bị ẩn thì rAF không hề chạy,
     nên vòng lặp dưới đứng im và không thể kiểm tra được gì), và sau này là xuất ảnh
     ở Giai đoạn 3. */
  function renderOnce() {
    controls.update();
    renderer.render(scene, camera);
    lr.render(scene, camera);
  }

  (function loop() {
    requestAnimationFrame(loop);
    renderOnce();
  })();

  return {
    build,
    resize,
    renderOnce,
    setToggles(next) { toggles = { ...toggles, ...next }; applyToggles(); },
    setOverlay(i) { selOv = i; applyToggles(); },
    getOverlay() { return selOv; },
    /* Cửa sổ soi trạng thái, dùng cho kiểm thử và gỡ lỗi. */
    _inner: { scene, camera, controls, renderer, group, get labels() { return labels; } },
  };
}
