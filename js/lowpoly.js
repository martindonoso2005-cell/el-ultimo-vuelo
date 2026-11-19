/* global AFRAME */
/*
 * lowpoly.js — Generadores procedurales de geometría Low Poly.
 * Todo se construye con primitivas de three.js (sin modelos externos):
 * terreno, montañas, vegetación, dinosaurios no avianos y un "ave paramétrica"
 * capaz de transformarse de dinosaurio aviano del Cretácico a ave moderna.
 */
window.LP = (function () {
  'use strict';
  const T = AFRAME.THREE;

  // ---------- utilidades ----------
  function rng(seed) {
    let a = (seed * 2654435761) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // Desplaza vértices de forma coherente (los vértices coincidentes se mueven juntos)
  function jitter(geo, amt, seed) {
    const r = rng(seed || 7); const p = geo.attributes.position; const map = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = Math.round(p.getX(i) * 1000) + '|' + Math.round(p.getY(i) * 1000) + '|' + Math.round(p.getZ(i) * 1000);
      let d = map.get(k);
      if (!d) { d = [(r() - 0.5) * amt, (r() - 0.5) * amt, (r() - 0.5) * amt]; map.set(k, d); }
      p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2]);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function msm(color, extra) {
    return new T.MeshStandardMaterial(Object.assign({ color: color, flatShading: true, roughness: 0.93, metalness: 0 }, extra || {}));
  }
  function mesh(geo, mat, pos, rot, scl) {
    const m = new T.Mesh(geo, mat);
    if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    if (scl !== undefined && scl !== null) { if (typeof scl === 'number') m.scale.setScalar(scl); else m.scale.set(scl[0], scl[1], scl[2]); }
    return m;
  }

  // ---------- geometrías base compartidas ----------
  const G = {};
  G.ico0 = new T.IcosahedronGeometry(1, 0);
  G.ico1 = new T.IcosahedronGeometry(1, 1);
  G.coneUp = new T.ConeGeometry(1, 1, 5); G.coneUp.translate(0, 0.5, 0);           // base en 0, punta en +y
  G.coneDown = new T.ConeGeometry(1, 1, 4); G.coneDown.rotateX(Math.PI); G.coneDown.translate(0, -0.5, 0);
  G.coneX = new T.ConeGeometry(1, 1, 4); G.coneX.translate(0, 0.5, 0); G.coneX.rotateZ(-Math.PI / 2);      // punta en +x
  G.coneNegX = new T.ConeGeometry(1, 1, 5); G.coneNegX.translate(0, 0.5, 0); G.coneNegX.rotateZ(Math.PI / 2); // punta en -x
  G.cylUp = new T.CylinderGeometry(0.75, 1, 1, 5); G.cylUp.translate(0, 0.5, 0);
  G.cylDown = new T.CylinderGeometry(1, 0.7, 1, 5); G.cylDown.translate(0, -0.5, 0);
  G.feather = new T.BoxGeometry(1, 0.02, 0.07); G.feather.translate(-0.5, 0, 0);
  G.leaf = new T.ConeGeometry(1, 1, 3); G.leaf.translate(0, 0.5, 0);
  G.wing = (function () {
    const s = new T.Shape();
    s.moveTo(0.18, 0); s.lineTo(0.16, 0.45); s.lineTo(0.06, 1.0); s.lineTo(-0.08, 0.86); s.lineTo(-0.16, 0.72);
    s.lineTo(-0.12, 0.6); s.lineTo(-0.3, 0.44); s.lineTo(-0.24, 0.32); s.lineTo(-0.36, 0.14); s.lineTo(-0.24, 0); s.lineTo(0.18, 0);
    const g = new T.ShapeGeometry(s); g.rotateX(Math.PI / 2); return g;
  })();
  G.membrane = (function () {
    const s = new T.Shape();
    s.moveTo(0.35, 0); s.lineTo(0.3, 1.4); s.lineTo(0.05, 2.8); s.lineTo(-0.15, 1.9); s.lineTo(-0.3, 1.0); s.lineTo(-0.45, 0); s.lineTo(0.35, 0);
    const g = new T.ShapeGeometry(s); g.rotateX(Math.PI / 2); return g;
  })();

  // ---------- terreno ----------
  const LAG = { x: -13, z: -9, r: 10 };     // laguna
  function heightAt(x, z) {
    const d = Math.sqrt(x * x + z * z);
    let h = Math.sin(x * 0.045 + 1.3) * Math.cos(z * 0.05) * 4 + Math.sin(x * 0.12 + z * 0.07) * 1.5 + Math.cos(z * 0.15 - x * 0.04) * 1.0;
    h *= smooth(16, 60, d);
    h += smooth(70, 190, d) * 18;
    const dl = Math.hypot(x - LAG.x, z - LAG.z);
    h -= (1 - smooth(4, 11, dl)) * 1.6;
    return h;
  }

  function terrain(center) {
    const size = 440, seg = 88, r = rng(3);
    let g = new T.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      p.setY(i, heightAt(x + (r() - 0.5) * 0.0, z) + (r() - 0.5) * 0.35);
    }
    g = g.toNonIndexed(); g.computeVertexNormals();
    const pos = g.attributes.position; const n = pos.count;
    const lush = new Float32Array(n * 3), ash = new Float32Array(n * 3), dist = new Float32Array(n);
    const greens = ['#5e7b38', '#6a8a3e', '#56733a', '#738f45', '#4f6a30', '#66843a'].map(c => new T.Color(c));
    const ashes = ['#45403b', '#3a3632', '#4d4741', '#2f2b28', '#403a35'].map(c => new T.Color(c));
    const rock = [new T.Color('#a08576'), new T.Color('#8f7a6a'), new T.Color('#b0907f')];
    const mud = new T.Color('#6b5a48'); const sandy = new T.Color('#c4a283');
    for (let f = 0; f < n; f += 3) {
      const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3;
      const cx = (pos.getX(f) + pos.getX(f + 1) + pos.getX(f + 2)) / 3;
      const cz = (pos.getZ(f) + pos.getZ(f + 1) + pos.getZ(f + 2)) / 3;
      let c;
      if (cy < -0.7) c = mud;
      else if (cy < -0.25 && Math.hypot(cx - LAG.x, cz - LAG.z) < 13) c = sandy;
      else if (cy > 13) c = rock[Math.floor(r() * 3)];
      else if (cy > 8 && r() < 0.5) c = rock[Math.floor(r() * 3)];
      else c = greens[Math.floor(r() * greens.length)];
      const a = ashes[Math.floor(r() * ashes.length)];
      const d = Math.hypot(cx - center.x, cz - center.z);
      for (let k = 0; k < 3; k++) {
        lush.set([c.r, c.g, c.b], (f + k) * 3); ash.set([a.r, a.g, a.b], (f + k) * 3); dist[f + k] = d;
      }
    }
    const col = new Float32Array(lush);
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 }));
    let last = '';
    // ashAmt: ceniza global (0..1); regrowR: radio de regeneración desde el centro
    function setState(ashAmt, regrowR) {
      const key = ashAmt.toFixed(3) + '|' + regrowR.toFixed(1);
      if (key === last) return; last = key;
      for (let i = 0; i < n; i++) {
        // regeneración radial: dentro del radio vuelve el verde
        const k = regrowR > 0 ? ashAmt * smooth(0, 14, dist[i] - regrowR + 14) : ashAmt;
        const j = i * 3;
        col[j] = lush[j] + (ash[j] - lush[j]) * k;
        col[j + 1] = lush[j + 1] + (ash[j + 1] - lush[j + 1]) * k;
        col[j + 2] = lush[j + 2] + (ash[j + 2] - lush[j + 2]) * k;
      }
      g.attributes.color.needsUpdate = true;
    }
    return { mesh: m, setState: setState };
  }

  // ---------- montañas (con nieve para los Andes del presente) ----------
  function mountains(seed) {
    const r = rng(seed); const grp = new T.Group();
    const mat = msm('#ffffff', { vertexColors: true });
    const list = [];
    const low = new T.Color('#6f8a4a'), mid = new T.Color('#9c8574'), high = new T.Color('#b39a8e'), snow = new T.Color('#f4f6fa');
    for (let i = 0; i < 17; i++) {
      const a = i / 17 * Math.PI * 2 + r() * 0.25; const d = 150 + r() * 70;
      const h = 45 + r() * 80; const rad = 32 + r() * 30;
      let geo = jitter(new T.ConeGeometry(rad, h, 7, 4), 6, seed * 13 + i);
      geo = geo.toNonIndexed(); geo.computeVertexNormals();
      const pos = geo.attributes.position; const n = pos.count;
      const cA = new Float32Array(n * 3), cB = new Float32Array(n * 3);
      for (let f = 0; f < n; f += 3) {
        const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3; const u = cy / h + 0.5;
        const v = 0.92 + r() * 0.16;
        const c = (u < 0.3 ? low : u < 0.65 ? mid : high).clone().multiplyScalar(v);
        const s = (u > 0.62 && h > 70) || (u > 0.75) ? snow.clone().multiplyScalar(0.95 + r() * 0.05) : c;
        for (let k = 0; k < 3; k++) { cA.set([c.r, c.g, c.b], (f + k) * 3); cB.set([s.r, s.g, s.b], (f + k) * 3); }
      }
      const col = new Float32Array(cA); geo.setAttribute('color', new T.BufferAttribute(col, 3));
      const m = mesh(geo, mat, [Math.cos(a) * d, h / 2 - 4, Math.sin(a) * d]);
      grp.add(m); list.push({ geo, cA, cB, col });
    }
    let last = -1;
    function setSnow(s) {
      if (Math.abs(s - last) < 0.002) return; last = s;
      list.forEach(o => { for (let i = 0; i < o.col.length; i++) o.col[i] = o.cA[i] + (o.cB[i] - o.cA[i]) * s; o.geo.attributes.color.needsUpdate = true; });
    }
    return { obj: grp, mat: mat, setSnow: setSnow };
  }

  // ---------- vegetación ----------
  const M = {
    trunk: msm('#6b4a33'), palm: msm('#4f7a35'), palm2: msm('#62903c'), arau: msm('#2f5a35'),
    fern: msm('#6f9a3f'), rock: msm('#a8877a'), rock2: msm('#8f7468')
  };
  function palm(seed) {
    const r = rng(seed); const g = new T.Group(); const h = 4 + r() * 4; let y = 0, x = 0; const segs = 4;
    for (let i = 0; i < segs; i++) {
      g.add(mesh(G.cylUp, M.trunk, [x, y, 0], [0, 0, -0.06 * i], [0.24 - 0.035 * i, h / segs + 0.05, 0.24 - 0.035 * i]));
      y += h / segs * 0.98; x += 0.09 * i;
    }
    const crown = new T.Group(); crown.position.set(x, y, 0); g.add(crown);
    const n = 7;
    for (let i = 0; i < n; i++) {
      const f = new T.Group(); f.rotation.y = i / n * Math.PI * 2 + r() * 0.3;
      f.add(mesh(G.leaf, i % 2 ? M.palm : M.palm2, null, [0, 0, -(1.25 + r() * 0.6)], [0.55, 2.6 + r() * 0.9, 0.12]));
      crown.add(f);
    }
    g.rotation.y = r() * Math.PI * 2;
    return { obj: g, crown: crown };
  }
  function araucaria(seed) {
    const r = rng(seed); const g = new T.Group(); const h = 9 + r() * 6;
    g.add(mesh(G.cylUp, M.trunk, [0, 0, 0], null, [0.32, h, 0.32]));
    const crown = new T.Group(); crown.position.set(0, h, 0); g.add(crown);
    for (let i = 0; i < 3; i++) {
      const w = 3.4 - i * 0.9;
      crown.add(mesh(jitter(new T.ConeGeometry(1, 1, 7), 0.12, seed + i), M.arau, [0, -1.8 + i * 0.85, 0], null, [w, 1.2, w]));
    }
    return { obj: g, crown: crown };
  }
  function fern(seed, s) {
    const r = rng(seed); const g = new T.Group(); const n = 6;
    for (let i = 0; i < n; i++) {
      const f = new T.Group(); f.rotation.y = i / n * Math.PI * 2 + r() * 0.4;
      f.add(mesh(G.leaf, M.fern, null, [0, 0, -(0.8 + r() * 0.5)], [0.32, 1.1 + r() * 0.6, 0.07]));
      g.add(f);
    }
    g.scale.setScalar(s || 1);
    return { obj: g, crown: g };
  }
  function rock(seed, sx, sy, sz, mat) {
    return mesh(jitter(new T.IcosahedronGeometry(1, 0), 0.45, seed), mat || M.rock, null, null, [sx, sy, sz]);
  }
  function mesa(seed, sx, sy, sz) {
    return mesh(jitter(new T.CylinderGeometry(1, 1.25, 1, 7, 2), 0.18, seed), M.rock, null, null, [sx, sy, sz]);
  }

  // ---------- dinosaurios no avianos (más realistas) ----------
  // Piel: dorso oscuro, flancos, vientre claro y rayas, horneado en colores de vértice
  const _a = new T.Vector3(), _b = new T.Vector3(), _c = new T.Vector3(), _n = new T.Vector3(), _e = new T.Vector3();
  function skin(geo, pal, seed, stripeF) {
    geo = geo.index ? geo.toNonIndexed() : geo; geo.computeVertexNormals();
    const p = geo.attributes.position, n = p.count, col = new Float32Array(n * 3);
    const top = new T.Color(pal.top), side = new T.Color(pal.side), belly = new T.Color(pal.belly), c = new T.Color(); const r = rng(seed || 3);
    for (let f = 0; f < n; f += 3) {
      _a.fromBufferAttribute(p, f); _b.fromBufferAttribute(p, f + 1); _c.fromBufferAttribute(p, f + 2);
      _n.subVectors(_b, _a).cross(_e.subVectors(_c, _a)).normalize();
      const ny = _n.y, cx = (_a.x + _b.x + _c.x) / 3;
      if (ny > 0) c.copy(side).lerp(top, smooth(-0.05, 0.75, ny)); else c.copy(side).lerp(belly, smooth(0.05, 0.6, -ny));
      if (stripeF && ny > 0.05 && Math.sin(cx * stripeF + (seed || 0)) > 0.5) c.multiplyScalar(0.7);
      c.multiplyScalar(0.93 + r() * 0.14);
      for (let k = 0; k < 3; k++) { col[(f + k) * 3] = c.r; col[(f + k) * 3 + 1] = c.g; col[(f + k) * 3 + 2] = c.b; }
    }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    return geo;
  }
  function ell(rx, ry, rz, det, jit, seed) { const g = new T.IcosahedronGeometry(1, det === undefined ? 1 : det); g.scale(rx, ry, rz); return jitter(g, jit || 0, seed || 1); }
  function seg(len, r0, r1, radial) { const g = new T.CylinderGeometry(r1, r0, len, radial || 7, 2); g.translate(0, len / 2, 0); g.rotateZ(-Math.PI / 2); return g; }
  function skinMat() { return msm('#ffffff', { vertexColors: true }); }
  // cadena articulada (cuello, cola, patas): cada segmento cuelga del anterior
  function chain(parent, segs, mat, pal, seed, stripe) {
    let cur = parent; const joints = [];
    segs.forEach((s, i) => {
      const j = new T.Group(); if (i > 0) j.position.x = segs[i - 1].len * 0.94;
      if (s.rot) j.rotation.set(s.rot[0], s.rot[1], s.rot[2]); j.userData.base = j.rotation.clone();
      cur.add(j);
      j.add(new T.Mesh(skin(jitter(seg(s.len, s.r0, s.r1, s.radial), Math.min(s.r0, s.r1) * 0.12, seed + i * 7), pal, seed + i, stripe), mat));
      j.add(new T.Mesh(skin(ell(s.r0 * 1.03, s.r0 * 1.03, s.r0 * 1.03, 1, s.r0 * 0.05, seed + i), pal, seed + i * 3, stripe), mat));
      joints.push(j); cur = j;
    });
    return joints;
  }
  function palette(color) {
    const base = new T.Color(color);
    return { top: '#' + base.clone().multiplyScalar(0.55).getHexString(), side: '#' + base.getHexString(), belly: '#' + base.clone().lerp(new T.Color('#e8d6b4'), 0.6).getHexString() };
  }

  // Titanosaurio (saurópodo): cuello largo curvado, patas columnares, osteodermos
  function sauropod(seed, color) {
    const pal = palette(color || '#8a5d48'); const mb = skinMat(); const r = rng(seed);
    const root = new T.Group(); const body = new T.Group(); body.position.set(0, 5.0, 0); root.add(body);
    const add = (g, pos, rot) => { const m = new T.Mesh(skin(g, pal, seed, 1.3), mb); if (pos) m.position.set(pos[0], pos[1], pos[2]); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); body.add(m); return m; };
    add(ell(3.6, 2.0, 1.8, 1, 0.18, seed), [0, 0.25, 0], [0, 0, 0.07]);
    add(ell(1.9, 2.0, 1.75, 1, 0.12, seed + 1), [2.2, 0.55, 0]);
    add(ell(1.7, 1.8, 1.65, 1, 0.12, seed + 2), [-2.3, 0.15, 0]);
    for (let i = 0; i < 7; i++) add(ell(0.35, 0.18, 0.3, 0, 0.05, seed + 10 + i), [-2.4 + i * 0.85, 2.2 - Math.abs(i - 3) * 0.08, (r() - 0.5) * 0.9]);
    const neckBase = new T.Group(); neckBase.position.set(3.3, 1.2, 0); body.add(neckBase);
    const neck = chain(neckBase, [0, 1, 2, 3, 4, 5].map(i => ({ len: 1.6, r0: 1.05 - i * 0.12, r1: 0.95 - i * 0.12, rot: [0, 0, i === 0 ? 0.55 : 0.05] })), mb, pal, seed + 20, 1.6);
    const head = new T.Group(); head.position.x = 1.55; head.rotation.z = -0.82; neck[5].add(head);
    head.add(new T.Mesh(skin(jitter(seg(1.15, 0.42, 0.26, 6).scale(1, 1.1, 0.85), 0.04, seed), pal, seed), mb));
    const eyeM = new T.MeshBasicMaterial({ color: '#141010' });
    for (const s of [1, -1]) head.add(mesh(G.ico0, eyeM, [0.35, 0.18, s * 0.3], null, 0.06));
    const tailBase = new T.Group(); tailBase.position.set(-3.5, 0.35, 0); tailBase.rotation.y = Math.PI; body.add(tailBase);
    const tail = chain(tailBase, [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ len: 1.5, r0: Math.max(0.12, 1.0 - i * 0.12), r1: Math.max(0.08, 0.9 - i * 0.12), rot: [0, 0, i === 0 ? -0.32 : 0.045] })), mb, pal, seed + 40, 1.6);
    const legs = [[2.3, 1.15], [2.3, -1.15], [-2.3, 1.1], [-2.3, -1.1]].map(([x, z], i) => {
      const g = new T.Group(); g.position.set(x, -0.2, z); body.add(g);
      const j = chain(g, [{ len: 2.6, r0: 0.66, r1: 0.52, rot: [0, 0, -Math.PI / 2] }, { len: 2.2, r0: 0.5, r1: 0.48 }], mb, pal, seed + 60 + i * 5, 0);
      const pad = new T.Mesh(skin(jitter(new T.CylinderGeometry(0.6, 0.66, 0.3, 7), 0.03, seed), pal, seed), mb); pad.position.set(2.1, 0, 0); pad.rotation.z = Math.PI / 2; j[1].add(pad);
      return j;
    });
    return {
      obj: root, mats: [mb, mb],
      anim(t, speed) {
        const ph = t * 1.5;
        legs.forEach((l, i) => { const a = Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * speed; l[0].rotation.z = -Math.PI / 2 + a * 0.2; l[1].rotation.z = Math.max(0, a) * 0.25; });
        body.position.y = 5.0 + Math.abs(Math.sin(ph)) * 0.1 * speed;
        neck.forEach((j, i) => { j.rotation.y = Math.sin(t * 0.6 + seed - i * 0.4) * 0.05; j.rotation.z = j.userData.base.z + Math.sin(t * 0.5 + seed) * 0.02; });
        tail.forEach((j, i) => { j.rotation.y = Math.sin(t * 1.1 + seed - i * 0.55) * (0.04 + i * 0.012); });
      }
    };
  }

  // Tiranosaurio (terópodo): cráneo profundo con mandíbula, patas digitígradas, cola articulada
  function theropod(seed, color) {
    const r = rng(seed);
    const pal = palette(color || '#8b5a3c'); const mb = skinMat(); const md = msm('#2a1d16'), mt = msm('#efe6d2'), mc = msm('#2b2420');
    const root = new T.Group(); const body = new T.Group(); body.position.set(0, 3.45, 0); root.add(body);
    const add = (g, pos, rot, par) => { const m = new T.Mesh(skin(g, pal, seed, 1.8), mb); if (pos) m.position.set(pos[0], pos[1], pos[2]); if (rot) m.rotation.set(rot[0], rot[1], rot[2]); (par || body).add(m); return m; };
    add(ell(1.9, 1.1, 0.9, 1, 0.1, seed), [0.5, 0.2, 0], [0, 0, 0.14]);
    add(ell(1.05, 1.0, 0.95, 1, 0.08, seed + 1), [1.6, 0.4, 0], [0, 0, 0.3]);
    add(ell(1.1, 1.05, 0.85, 1, 0.08, seed + 2), [-0.6, 0.05, 0]);
    // cuello y cabeza
    const neckBase = new T.Group(); neckBase.position.set(2.2, 0.75, 0); body.add(neckBase);
    const neck = chain(neckBase, [{ len: 0.85, r0: 0.72, r1: 0.62, rot: [0, 0, 0.75] }, { len: 0.6, r0: 0.62, r1: 0.56, rot: [0, 0, -0.55] }], mb, pal, seed + 5, 1.8);
    const head = new T.Group(); head.position.x = 0.55; head.rotation.z = -0.3; neck[1].add(head);
    add(seg(1.95, 0.6, 0.34, 6).scale(1, 1.3, 0.82), [-0.25, 0.12, 0], null, head);
    const iris = new T.MeshBasicMaterial({ color: '#e0901f' }), pupil = new T.MeshBasicMaterial({ color: '#0d0905' });
    for (const s of [1, -1]) {
      add(ell(0.32, 0.12, 0.13, 0, 0.02, seed + 3), [0.35, 0.68, s * 0.27], null, head);
      head.add(mesh(G.ico0, iris, [0.4, 0.48, s * 0.35], null, 0.085));
      head.add(mesh(G.ico0, pupil, [0.46, 0.48, s * 0.39], null, 0.04));
      head.add(mesh(G.ico0, mc, [1.55, 0.22, s * 0.16], null, 0.05));
      for (let i = 0; i < 5; i++) { const x = 0.45 + i * 0.24; head.add(mesh(G.coneDown, mt, [x, -0.2, s * (0.3 - (x - 0.4) * 0.11)], null, [0.04, 0.17, 0.04])); }
    }
    const jaw = new T.Group(); jaw.position.set(-0.15, -0.22, 0); head.add(jaw);
    jaw.add(new T.Mesh(skin(jitter(seg(1.75, 0.38, 0.2, 6).scale(1, 0.72, 0.85), 0.02, seed + 4), { top: pal.side, side: pal.side, belly: pal.belly }, seed), mb));
    for (const s of [1, -1]) for (let i = 0; i < 4; i++) { const x = 0.6 + i * 0.25; jaw.add(mesh(G.coneUp, mt, [x, 0.12, s * (0.22 - i * 0.03)], null, [0.035, 0.13, 0.035])); }
    // cola
    const tailBase = new T.Group(); tailBase.position.set(-1.45, 0.15, 0); tailBase.rotation.y = Math.PI; body.add(tailBase);
    const tail = chain(tailBase, [1.25, 1.2, 1.15, 1.1, 1.0, 0.9].map((len, i) => ({ len, r0: 0.85 - i * 0.13, r1: 0.74 - i * 0.12, rot: [0, 0, i === 0 ? -0.06 : 0.02] })), mb, pal, seed + 10, 1.8);
    // plumas oscuras en el dorso (como la referencia)
    for (let i = 0; i < 9; i++) { const x = -1.2 + i * 0.45; body.add(mesh(G.coneUp, md, [x, 1.15 + Math.sin(i) * 0.05 - Math.abs(x - 0.6) * 0.12, (r() - 0.5) * 0.25], [(r() - 0.5) * 0.5, 0, 0.75], [0.07, 0.45 + r() * 0.35, 0.07])); }
    for (let i = 0; i < 4; i++) neck[0].add(mesh(G.coneUp, md, [0.15 + i * 0.2, 0.62, (r() - 0.5) * 0.2], [0, 0, 0.9], [0.06, 0.4 + r() * 0.2, 0.06]));
    // brazos diminutos
    for (const s of [1, -1]) {
      const g = new T.Group(); g.position.set(2.0, -0.25, s * 0.62); body.add(g);
      const a = chain(g, [{ len: 0.45, r0: 0.13, r1: 0.1, rot: [0, 0, -1.3] }, { len: 0.35, r0: 0.09, r1: 0.06, rot: [0, 0, 1.0] }], mb, pal, seed + 30, 0);
      for (const k of [1, -1]) a[1].add(mesh(G.coneX, mc, [0.33, 0, k * 0.04], [0, 0, -0.5], [0.12, 0.03, 0.03]));
    }
    // patas digitígradas: muslo, tibia, metatarso y 3 dedos
    const legs = [1, -1].map(s => {
      const g = new T.Group(); g.position.set(-0.25, -0.1, s * 0.75); body.add(g);
      const j = chain(g, [
        { len: 1.5, r0: 0.55, r1: 0.36, rot: [0, 0, -Math.PI / 2 + 0.35] },
        { len: 1.3, r0: 0.32, r1: 0.22, rot: [0, 0, -0.7] },
        { len: 0.85, r0: 0.2, r1: 0.16, rot: [0, 0, 0.6] }
      ], mb, pal, seed + 40 + s, 0);
      const thigh = new T.Mesh(skin(ell(0.85, 0.58, 0.48, 1, 0.05, seed + 50), pal, seed, 1.8), mb); thigh.position.set(0.45, 0.05, 0); j[0].add(thigh);
      const foot = new T.Group(); foot.position.x = 0.8; foot.rotation.z = Math.PI / 2 - 0.25; j[2].add(foot);
      [-0.32, 0, 0.32].forEach(a => foot.add(mesh(G.coneX, mc, [0, -0.1, 0], [0, a, 0], [0.55, 0.11, 0.11])));
      return j;
    });
    return {
      obj: root, mats: [mb, md],
      anim(t, speed, roar) {
        roar = roar || 0;
        const ph = t * (speed > 1.5 ? 9 : 3.2);
        const amp = Math.min(1, speed) * (speed > 1.5 ? 0.6 : 0.38);
        legs.forEach((l, i) => {
          const a = Math.sin(ph + i * Math.PI);
          l[0].rotation.z = -Math.PI / 2 + 0.35 + a * amp;
          l[1].rotation.z = -0.7 - Math.max(0, -a) * amp * 0.9;
          l[2].rotation.z = 0.6 + Math.max(0, -a) * amp * 0.6;
        });
        body.position.y = 3.45 + Math.abs(Math.sin(ph)) * 0.12 * Math.min(1, speed) - (speed > 1.5 ? 0.15 : 0);
        body.rotation.z = Math.sin(ph * 2) * 0.015 * speed - (speed > 1.5 ? 0.06 : 0);
        neck[0].rotation.z = 0.75 + roar * 0.4 + Math.sin(t * 1.3) * 0.03;
        head.rotation.z = -0.3 + roar * 0.25 + Math.sin(t * 1.7) * 0.03;
        head.rotation.y = Math.sin(t * 0.7 + seed) * 0.12 * (1 - roar);
        jaw.rotation.z = -roar * (0.5 + Math.sin(t * 30) * 0.04) - Math.max(0, Math.sin(t * 0.9)) * 0.04;
        tail.forEach((j, i) => { j.rotation.y = Math.sin(ph * 0.5 - i * 0.6) * (0.04 + i * 0.015) + Math.sin(t * 0.8 - i * 0.4) * 0.03; });
      }
    };
  }

  function pterosaur(seed) {
    const mb = msm('#c98a3e'), mw = msm('#d99a4a', { side: T.DoubleSide });
    const root = new T.Group();
    root.add(mesh(G.ico0, mb, null, null, [0.7, 0.24, 0.26]));
    const head = new T.Group(); head.position.set(0.75, 0.1, 0); root.add(head);
    head.add(mesh(G.ico0, mb, null, null, [0.25, 0.15, 0.12]));
    head.add(mesh(G.coneX, mb, [0.15, 0, 0], null, [1.2, 0.08, 0.06]));
    head.add(mesh(G.coneNegX, mb, [0, 0.12, 0], [0, 0, -0.3], [0.8, 0.07, 0.03]));
    const wl = new T.Group(), wr = new T.Group(); root.add(wl, wr);
    wl.add(mesh(G.membrane, mw)); wr.add(mesh(G.membrane, mw, null, null, [1, 1, -1]));
    return {
      obj: root,
      anim(t) { const f = Math.sin(t * 3.2 + seed) * 0.5; wl.rotation.x = -f; wr.rotation.x = f; }
    };
  }

  // ---------- ave paramétrica (dinosaurio aviano → ave moderna) ----------
  const BIRD_DEFAULT = {
    size: 1, bodyLen: 0.5, bodyH: 1, bodyW: 1, neckLen: 0.12, neckAngle: 0.5, neckThick: 1, headSize: 1,
    beakLen: 0.12, beakThick: 1, beakBend: 0, teeth: 0, crest: 0, collar: 0, tailLen: 0.05, tailUp: 0.1, tailFan: 0.5,
    wingSpan: 1, wingChord: 1, legLen: 0.2, legThick: 1, pitch: 0.1, flapSpeed: 14,
    body: '#888888', belly: '#cccccc', wing: '#555555', head: '#777777', beak: '#333333', leg: '#444444'
  };
  const COLOR_KEYS = ['body', 'belly', 'wing', 'head', 'beak', 'leg'];

  const SP = {
    raptor: { size: 1.7, bodyLen: 0.55, neckLen: 0.16, neckAngle: 0.7, beakLen: 0.17, beakThick: 1.6, teeth: 1, tailLen: 0.8, tailFan: 0.2, wingSpan: 0.55, legLen: 0.32, crest: 0.4, pitch: 0.05, body: '#7b5136', belly: '#b98e62', wing: '#4b3324', head: '#6e4630', beak: '#5a3b2a', leg: '#3d2f25' },
    survA: { size: 1.0, bodyLen: 0.45, neckLen: 0.1, neckAngle: 0.55, beakLen: 0.13, beakThick: 1.15, teeth: 1, tailLen: 0.42, tailFan: 0.35, wingSpan: 0.9, wingChord: 0.9, legLen: 0.18, crest: 0.25, body: '#9a5530', belly: '#d9a774', wing: '#5b2d18', head: '#7a3d20', beak: '#4a3528', leg: '#4a3a30' },
    survB: { size: 1.0, bodyLen: 0.45, neckLen: 0.1, neckAngle: 0.55, beakLen: 0.13, beakThick: 1.15, teeth: 1, tailLen: 0.42, tailFan: 0.35, wingSpan: 0.9, wingChord: 0.9, legLen: 0.18, crest: 0.25, body: '#5c6b7a', belly: '#c9d2d8', wing: '#36414d', head: '#2f3842', beak: '#3a3a3a', leg: '#3a3a3a' },
    survC: { size: 1.0, bodyLen: 0.45, neckLen: 0.1, neckAngle: 0.55, beakLen: 0.13, beakThick: 1.15, teeth: 1, tailLen: 0.42, tailFan: 0.35, wingSpan: 0.9, wingChord: 0.9, legLen: 0.18, crest: 0.25, body: '#4f7a4a', belly: '#cfd8a8', wing: '#2f5a3a', head: '#3a6a55', beak: '#353a30', leg: '#3a3a30' },
    early: { size: 1.05, bodyLen: 0.48, neckLen: 0.11, neckAngle: 0.5, beakLen: 0.15, beakThick: 1.05, teeth: 0, tailLen: 0.06, tailFan: 0.7, wingSpan: 1.25, wingChord: 1, legLen: 0.2, crest: 0.15 },
    condor: { size: 2.4, bodyLen: 0.6, bodyH: 1.05, neckLen: 0.12, neckAngle: 0.45, headSize: 1.05, beakLen: 0.11, beakThick: 1.6, beakBend: 0.35, teeth: 0, crest: 0.55, collar: 1, tailLen: 0, tailFan: 0.6, wingSpan: 2.5, wingChord: 1.25, legLen: 0.17, legThick: 1.4, pitch: 0.25, flapSpeed: 5, body: '#1c1c21', belly: '#25252c', wing: '#2b2b33', head: '#9e5a52', beak: '#d8ccb0', leg: '#7a7570' },
    pinguino: { size: 1.3, bodyLen: 0.5, bodyH: 1.6, bodyW: 1.1, neckLen: 0.03, neckAngle: 0.2, beakLen: 0.13, beakThick: 1.2, teeth: 0, tailLen: 0, tailFan: 0.1, wingSpan: 0.45, wingChord: 0.55, legLen: 0.05, legThick: 1.5, pitch: 1.35, crest: 0, collar: 0.7, flapSpeed: 8, body: '#23262c', belly: '#f1f0ea', wing: '#23262c', head: '#23262c', beak: '#2a2a2a', leg: '#e0a0a0' },
    picaflor: { size: 0.5, bodyLen: 0.32, bodyH: 0.85, neckLen: 0.04, beakLen: 0.42, beakThick: 0.45, teeth: 0, tailLen: 0, tailFan: 0.55, wingSpan: 1.0, wingChord: 0.55, legLen: 0.06, legThick: 0.6, pitch: 0.35, crest: 0, flapSpeed: 48, body: '#2f9e63', belly: '#d8e8c8', wing: '#2a4a3a', head: '#1f8a7a', beak: '#1b1b1b', leg: '#1b1b1b' },
    flamenco: { size: 1.5, bodyLen: 0.45, neckLen: 0.75, neckAngle: 0.25, neckThick: 0.7, beakLen: 0.14, beakThick: 1.3, beakBend: 0.9, legLen: 0.85, legThick: 0.6, tailFan: 0.3, wingSpan: 1.3, pitch: 0.05, body: '#f3a0b4', belly: '#f7c0cc', wing: '#e2506f', head: '#f3a0b4', beak: '#2a2a2a', leg: '#e88ea4' },
    chincol: { size: 0.55, bodyLen: 0.38, neckLen: 0.05, beakLen: 0.08, beakThick: 1.2, crest: 0.7, tailLen: 0, tailFan: 0.7, wingSpan: 0.9, legLen: 0.12, body: '#8a6b4f', belly: '#d9cbb3', wing: '#5e4a38', head: '#7f7f7f', beak: '#3a3a3a', leg: '#c9a07a' },
    gaviota: { size: 1.2, bodyLen: 0.45, beakLen: 0.12, beakThick: 1.1, wingSpan: 2.2, wingChord: 0.9, tailFan: 0.5, legLen: 0.15, flapSpeed: 6, body: '#f2f2f2', belly: '#fafafa', wing: '#9aa3ab', head: '#f6f6f6', beak: '#f0c23a', leg: '#e9b04a' },
    pelagornis: { size: 4.2, bodyLen: 0.5, beakLen: 0.45, beakThick: 1.3, teeth: 1, wingSpan: 3.3, wingChord: 0.8, tailFan: 0.4, legLen: 0.1, flapSpeed: 3, body: '#e7e2d6', belly: '#f2efe7', wing: '#5a5752', head: '#e7e2d6', beak: '#b9a17a', leg: '#888888' },
    fororraco: { size: 3.0, bodyLen: 0.55, bodyH: 1.2, neckLen: 0.32, neckAngle: 0.25, neckThick: 1.6, headSize: 1.6, beakLen: 0.26, beakThick: 2.4, beakBend: 0.3, teeth: 0, tailLen: 0, tailFan: 0.4, wingSpan: 0.35, legLen: 0.55, legThick: 2, crest: 0.3, body: '#6b5640', belly: '#a68d6c', wing: '#4d3e2e', head: '#6b5640', beak: '#d9c48c', leg: '#8a7b5a' },
    pinguinoGigante: { size: 2.3, bodyLen: 0.5, bodyH: 1.7, bodyW: 1.1, neckLen: 0.04, neckAngle: 0.2, beakLen: 0.22, beakThick: 1.2, tailLen: 0, tailFan: 0.1, wingSpan: 0.45, wingChord: 0.55, legLen: 0.05, legThick: 1.5, pitch: 1.35, body: '#3a3a42', belly: '#e4e1d8', wing: '#3a3a42', head: '#3a3a42', beak: '#3a3a3a', leg: '#7a6a6a' }
  };
  function preset(name, over) { return Object.assign({}, BIRD_DEFAULT, SP[name], over || {}); }

  const tmpA = new T.Color(), tmpB = new T.Color();
  function lerpParams(a, b, u, out) {
    out = out || {};
    for (const k in BIRD_DEFAULT) {
      if (COLOR_KEYS.indexOf(k) >= 0) {
        tmpA.set(a[k]); tmpB.set(b[k]);
        out[k] = '#' + tmpA.lerp(tmpB, u).getHexString();
      } else out[k] = a[k] + (b[k] - a[k]) * u;
    }
    return out;
  }

  function bird(p0, seed) {
    const p = Object.assign({}, BIRD_DEFAULT, p0);
    const mats = {};
    COLOR_KEYS.forEach(k => { mats[k] = msm(p[k], k === 'wing' ? { side: T.DoubleSide } : null); });
    const mWhite = msm('#f2efe6'), mEye = new T.MeshBasicMaterial({ color: '#0d0d0d' });
    const root = new T.Group(); const inner = new T.Group(); root.add(inner);
    const hips = new T.Group(); inner.add(hips);
    const torso = new T.Group(); hips.add(torso);
    const body = mesh(jitter(new T.IcosahedronGeometry(1, 1), 0.16, seed || 1), mats.body); torso.add(body);
    const belly = mesh(G.ico0, mats.belly); torso.add(belly);
    const neck = new T.Group(); torso.add(neck);
    const neckM = mesh(G.cylUp, mats.body); neck.add(neckM);
    const collar = mesh(G.ico0, mWhite); neck.add(collar);
    const head = new T.Group(); neck.add(head);
    const skull = mesh(G.ico0, mats.head); head.add(skull);
    const beakG = new T.Group(); head.add(beakG);
    const beak = mesh(G.coneX, mats.beak); beakG.add(beak);
    const teeth = [0, 1, 2].map(() => { const m = mesh(G.coneDown, mWhite); beakG.add(m); return m; });
    const eyes = [1, -1].map(() => { const m = mesh(G.ico0, mEye); head.add(m); return m; });
    const crest = mesh(G.coneUp, mats.head); head.add(crest);
    const tail = new T.Group(); torso.add(tail);
    const tailBone = mesh(G.coneNegX, mats.body); tail.add(tailBone);
    const fan = [-1, 0, 1].map(i => { const m = mesh(G.feather, mats.wing); m.rotation.y = i * 0.35; tail.add(m); return m; });
    const wingL = new T.Group(), wingR = new T.Group(); torso.add(wingL, wingR);
    const wL = mesh(G.wing, mats.wing), wR = mesh(G.wing, mats.wing); wingL.add(wL); wingR.add(wR);
    const legs = [1, -1].map(() => {
      const g = new T.Group(); inner.add(g);
      const m = mesh(G.cylDown, mats.leg); g.add(m);
      const f = mesh(G.ico0, mats.leg); g.add(f);
      return { g, m, f };
    });
    // esfera invisible para facilitar la selección con la mirada
    const hit = new T.Mesh(new T.SphereGeometry(1, 8, 6), new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    root.add(hit);

    function apply(q) {
      Object.assign(p, q || {});
      inner.scale.setScalar(p.size);
      const L = p.legLen;
      hips.position.set(0, L + 0.1 * p.bodyH, 0);
      torso.rotation.z = p.pitch;
      body.scale.set(p.bodyLen * 0.5, 0.17 * p.bodyH, 0.15 * p.bodyW);
      belly.scale.set(p.bodyLen * 0.42, 0.14 * p.bodyH, 0.13 * p.bodyW); belly.position.set(0.03, -0.04 * p.bodyH, 0);
      neck.position.set(p.bodyLen * 0.38, 0.06 * p.bodyH, 0); neck.rotation.z = -p.neckAngle;
      neckM.scale.set(0.055 * p.neckThick, p.neckLen + 0.05, 0.05 * p.neckThick);
      collar.scale.setScalar(0.09 * p.collar + 0.0001); collar.position.y = 0.03; collar.visible = p.collar > 0.02;
      head.position.set(0, p.neckLen + 0.05, 0); head.rotation.z = p.neckAngle - p.pitch;
      const hs = p.headSize;
      skull.scale.set(0.11 * hs * (1 + 0.15 * (p.beakThick - 1)), 0.09 * hs, 0.085 * hs);
      beakG.position.set(0.08 * hs, -0.015 * hs, 0); beakG.rotation.z = -p.beakBend * 0.6;
      beak.scale.set(p.beakLen + 0.001, 0.035 * p.beakThick, 0.03 * p.beakThick);
      teeth.forEach((m, i) => { m.position.set(p.beakLen * (0.3 + 0.2 * i), -0.02 * p.beakThick, 0); m.scale.set(0.012, 0.035, 0.012).multiplyScalar(Math.max(0.001, p.teeth)); m.visible = p.teeth > 0.03; });
      eyes.forEach((m, i) => { m.position.set(0.05 * hs, 0.025 * hs, (i ? -1 : 1) * 0.07 * hs); m.scale.setScalar(0.018 * hs); });
      crest.position.set(-0.03 * hs, 0.06 * hs, 0); crest.rotation.z = 0.6; crest.scale.set(0.03, 0.14 * p.crest + 0.001, 0.025); crest.visible = p.crest > 0.02;
      tail.position.set(-p.bodyLen * 0.42, 0.02, 0); tail.rotation.z = p.tailUp;
      tailBone.scale.set(p.tailLen + 0.001, 0.05, 0.045); tailBone.visible = p.tailLen > 0.02;
      fan.forEach(m => { m.position.x = -p.tailLen * 0.8; m.scale.set(0.12 + 0.3 * p.tailFan, 1, 1 + p.tailFan); m.visible = p.tailFan > 0.02; });
      wingL.position.set(0.04, 0.07 * p.bodyH, 0.1 * p.bodyW); wingR.position.set(0.04, 0.07 * p.bodyH, -0.1 * p.bodyW);
      wL.scale.set(0.5 * p.wingChord, 1, 0.55 * p.wingSpan); wR.scale.set(0.5 * p.wingChord, 1, -0.55 * p.wingSpan);
      legs.forEach((l, i) => {
        l.g.position.set(0, L, (i ? -1 : 1) * 0.06 * p.bodyW);
        l.m.scale.set(0.02 * p.legThick, L, 0.02 * p.legThick);
        l.f.position.set(0.03, -L, 0); l.f.scale.set(0.05, 0.012, 0.035);
      });
      hit.scale.setScalar(0.35 * p.size + 0.1); hit.position.y = (L + 0.15) * p.size;
      COLOR_KEYS.forEach(k => mats[k].color.set(p[k]));
    }
    apply();

    // modo: 'stand' | 'walk' | 'fly' | 'glide' | 'hover'
    function anim(t, mode, amt) {
      const s = (seed || 1) * 1.37;
      let fold = 1, flap = 0, legSwing = 0, bob = 0, pitchAdd = 0;
      if (mode === 'fly') { fold = 0; flap = Math.sin(t * p.flapSpeed + s) * 0.8; }
      else if (mode === 'glide') { fold = 0; flap = Math.sin(t * 1.5 + s) * 0.08 + 0.05; }
      else if (mode === 'hover') { fold = 0; flap = Math.sin(t * p.flapSpeed + s) * 1.0; pitchAdd = 0.75; }
      else if (mode === 'flutter') { fold = 0.2; flap = Math.sin(t * 22 + s) * 0.9; }
      else if (mode === 'display') { fold = 0.05; flap = Math.sin(t * 2.2 + s) * 0.25 - 0.15; }
      else if (mode === 'walk' || mode === 'run') {
        const f = mode === 'run' ? 16 : 7;
        legSwing = Math.sin(t * f + s) * (mode === 'run' ? 0.8 : 0.5); bob = Math.abs(Math.cos(t * f + s)) * 0.02;
      }
      if (amt !== undefined) fold = Math.min(1, Math.max(0, fold + amt));
      torso.rotation.z = p.pitch + pitchAdd;
      wingL.rotation.set(-flap * (1 - fold), -1.35 * fold, 0);
      wingR.rotation.set(flap * (1 - fold), 1.35 * fold, 0);
      const flying = mode === 'fly' || mode === 'glide' || mode === 'hover';
      legs.forEach((l, i) => { l.g.rotation.z = flying ? -1.1 : (i ? -legSwing : legSwing); });
      hips.position.y = p.legLen + 0.1 * p.bodyH + bob;
      // cabeza: mirar alrededor / picotear
      const peck = mode === 'stand' ? Math.max(0, Math.sin(t * 1.7 + s * 3) - 0.85) * 4 : 0;
      head.rotation.y = mode === 'stand' ? Math.sin(t * 0.9 + s) * 0.5 : 0;
      head.rotation.z = p.neckAngle - p.pitch - pitchAdd - peck * 0.8;
      tail.rotation.y = Math.sin(t * 2 + s) * 0.08;
    }
    return { obj: root, params: p, apply, anim, mats, hit };
  }

  // ---------- etiquetas 3D ----------
  function label(text, sub) {
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 160;
    const c = cv.getContext('2d');
    function draw() {
      c.clearRect(0, 0, 640, 160);
      c.fillStyle = 'rgba(12,10,8,0.55)';
      const w = 600, h = sub ? 118 : 84, x = 20, y = (160 - h) / 2, r = 40;
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.fill();
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff6e6';
      c.font = '600 40px Montserrat, Arial, sans-serif'; c.fillText(text, 320, sub ? 62 : 80);
      if (sub) { c.font = '400 26px Montserrat, Arial, sans-serif'; c.fillStyle = '#f0d9b5'; c.fillText(sub, 320, 106); }
      tex.needsUpdate = true;
    }
    const tex = new T.CanvasTexture(cv);
    if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false, opacity: 0 }));
    sp.renderOrder = 50; sp.scale.set(2, 0.5, 1);
    draw();
    if (document.fonts) document.fonts.ready.then(draw);
    return sp;
  }

  return { T, rng, smooth, jitter, msm, mesh, G, M, LAG, heightAt, terrain, mountains, palm, araucaria, fern, rock, mesa, sauropod, theropod, pterosaur, bird, preset, lerpParams, SP, label };
})();
