/* global AFRAME, LP, Sonido */
/*
 * experiencia.js — «66 millones de años: el último vuelo»
 * Línea de tiempo de 60 s. Todo lo visual es función del tiempo t (se puede saltar con ?t=SEG).
 * Única variable de estado: el superviviente elegido por el espectador.
 */
(function () {
  'use strict';
  const T = AFRAME.THREE;
  const DUR = 60;
  const IMPACT = new T.Vector3(-25, 0, -120);
  const C = new T.Vector3(0, 0, 4);          // lugar del superviviente / centro de la regeneración
  const LAG = LP.LAG;
  const sm = LP.smooth;
  const clamp01 = x => Math.min(1, Math.max(0, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const win = (t, a, b, f) => sm(a, a + (f || 0.5), t) * (1 - sm(b - (f || 0.5), b, t)); // ventana con fundido

  function trackN(keys) {
    return t => {
      if (t <= keys[0][0]) return keys[0][1];
      for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const a = keys[i - 1], b = keys[i]; return lerp(a[1], b[1], sm(a[0], b[0], t)); }
      return keys[keys.length - 1][1];
    };
  }
  function trackC(keys) {
    const ks = keys.map(k => [k[0], new T.Color(k[1])]); const out = new T.Color();
    return t => {
      if (t <= ks[0][0]) return out.copy(ks[0][1]);
      for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) { const a = ks[i - 1], b = ks[i]; return out.copy(a[1]).lerp(b[1], sm(a[0], b[0], t)); }
      return out.copy(ks[ks.length - 1][1]);
    };
  }

  // ---------- paleta ambiental por escena ----------
  const ENV = {
    skyTop: trackC([[0, '#6f86b5'], [10, '#6f86b5'], [13.5, '#a5674f'], [14.95, '#ffe9c4'], [15.6, '#ffd9a0'], [16.5, '#7a2e14'], [21, '#2a1610'], [23, '#15120f'], [34, '#15120f'], [42, '#5c79a8'], [48, '#3f7fcf'], [60, '#3f7fcf']]),
    skyHor: trackC([[0, '#f2c3a8'], [10, '#f2c3a8'], [13.5, '#ffb070'], [14.95, '#ffffff'], [15.6, '#fff1d8'], [16.5, '#ff7a2a'], [21, '#4a2618'], [23, '#2b2520'], [34, '#2b2520'], [42, '#f3cf9f'], [48, '#d9ecf7'], [60, '#d9ecf7']]),
    skyBot: trackC([[0, '#c9a48e'], [14.95, '#ffffff'], [16.5, '#8a3b1f'], [21, '#2a1d16'], [34, '#201c18'], [42, '#c8b090'], [48, '#b9d3e3'], [60, '#b9d3e3']]),
    fogC: trackC([[0, '#dcb9a3'], [10, '#dcb9a3'], [14.95, '#fff4e0'], [16.5, '#b0522a'], [21, '#3a2a20'], [23, '#2a2420'], [34, '#2a2420'], [42, '#cdb99a'], [48, '#c9dcea'], [60, '#c9dcea']]),
    fogNear: trackN([[0, 45], [15, 40], [16.5, 30], [21, 4], [23, 1.5], [34, 1.5], [42, 20], [48, 70], [60, 70]]),
    fogFar: trackN([[0, 340], [15, 320], [16.5, 260], [21, 40], [23, 30], [33, 36], [42, 160], [48, 420], [60, 420]]),
    sunI: trackN([[0, 2.2], [10, 2.2], [14.95, 5], [16.5, 1.8], [21, 0.35], [23, 0.08], [34, 0.15], [42, 1.8], [48, 2.6], [60, 2.6]]),
    sunC: trackC([[0, '#ffcf9e'], [14.95, '#ffffff'], [16.5, '#ff8a4a'], [21, '#8a4a30'], [23, '#7a6a5a'], [34, '#7a6a5a'], [42, '#ffe2b8'], [48, '#fff6e8'], [60, '#fff6e8']]),
    hemiI: trackN([[0, 1.2], [14.95, 2.5], [16.5, 1.1], [21, 0.45], [23, 0.22], [34, 0.28], [42, 1.0], [48, 1.3], [60, 1.3]]),
    hemiSky: trackC([[0, '#ffe8d6'], [16.5, '#ffb08a'], [21, '#6a5244'], [34, '#5a5048'], [42, '#ffeedd'], [48, '#e4f1ff'], [60, '#e4f1ff']]),
    hemiGnd: trackC([[0, '#4a5a2a'], [15.5, '#4a5a2a'], [17, '#ff5a20'], [21, '#4a2014'], [23, '#2a2420'], [34, '#2a2420'], [44, '#4a5a2a'], [60, '#4a5a2a']]),
    ash: trackN([[0, 0], [19, 0], [22.5, 1], [60, 1]]),
    regrow: trackN([[0, 0], [34.5, 0], [40, 22], [46, 140], [48, 300], [60, 300]]),
    burn: trackN([[0, 0], [17, 0], [21, 1], [35, 1], [44, 0], [60, 0]]),
    mountTint: trackC([[0, '#ffffff'], [16, '#ffffff'], [21, '#6a5850'], [34, '#5a504a'], [44, '#ffffff'], [60, '#ffffff']]),
    snow: trackN([[0, 0], [45.5, 0], [49.5, 1], [60, 1]]),
    water: trackC([[0, '#4f7f8f'], [16, '#4f7f8f'], [17, '#c8643a'], [21, '#3a3430'], [34, '#2f2b28'], [44, '#4f7f8f'], [48, '#5b93ad'], [60, '#5b93ad']]),
    sunVis: trackN([[0, 1], [12, 1], [14, 0], [42, 0], [46, 1], [60, 1]]),
    shake: trackN([[0, 0], [14.9, 0], [15.05, 0.22], [16.5, 0.06], [18.9, 0.04], [19.1, 0.32], [20.5, 0.08], [22, 0], [60, 0]]),
    ashFall: trackN([[0, 0], [19, 0], [21.5, 1], [34, 1], [38, 0.25], [41, 0], [60, 0]]),
    embers: trackN([[0, 0], [15.6, 0], [16.5, 1], [21, 0.8], [24, 0], [60, 0]])
  };

  // ---------- textos en pantalla (solo lectura, sin voz) ----------
  const LINEAS = [
    [0.6, 4.9, 'Hace 66 millones de años, la Tierra era de los dinosaurios.'],
    [5.0, 9.7, 'Entre ellos, pequeños dinosaurios cubiertos de plumas.'],
    [10.6, 13.8, 'Hasta que un día, el cielo se encendió.'],
    [15.7, 19.9, 'Un asteroide de diez kilómetros impactó en Yucatán.'],
    [20.0, 22.6, 'El polvo cubrió el planeta.'],
    [23.0, 27.0, 'Sin sol, tres de cada cuatro especies desaparecieron.'],
    [27.3, 32.6, 'Pero algunos, pequeños y emplumados, resistieron.'],
    [34.4, 37.7, 'Eran dinosaurios avianos.'],
    [38.0, 43.4, 'En millones de años, sus descendientes cambiaron de forma, de pico, de plumaje…'],
    [43.6, 47.7, '…y conquistaron cada rincón del planeta.'],
    [48.6, 51.2, 'Hoy los llamamos aves.'],
    [51.4, 55.3, 'El cóndor, el flamenco, el picaflor: dinosaurios que nunca se fueron.']
  ];

  const DESTINO = [
    { sp: 'condor', nombre: 'Cóndor andino', modo: 'display' },
    { sp: 'pinguino', nombre: 'Pingüino de Humboldt', modo: 'stand' },
    { sp: 'picaflor', nombre: 'Picaflor', modo: 'hover' }
  ];

  // ---------- HUD (texto en el campo visual, funciona en VR) ----------
  function HUD(camObj) {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
    const ctx = cv.getContext('2d');
    const tex = new T.CanvasTexture(cv); if (T.SRGBColorSpace) tex.colorSpace = T.SRGBColorSpace;
    const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false });
    const plane = new T.Mesh(new T.PlaneGeometry(1.8, 0.9), mat); plane.position.set(0, 0, -1.2); plane.renderOrder = 1000; camObj.add(plane);
    const fmat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false });
    const fade = new T.Mesh(new T.PlaneGeometry(6, 6), fmat); fade.position.set(0, 0, -0.15); fade.renderOrder = 999; camObj.add(fade);
    let key = '';
    function spaced(text, x, y, sp) { if ('letterSpacing' in ctx) { ctx.letterSpacing = sp + 'px'; ctx.fillText(text, x, y); ctx.letterSpacing = '0px'; } else ctx.fillText(text, x, y); }
    function wrap(text, maxW) {
      const words = text.split(' '); const lines = []; let cur = '';
      words.forEach(w => { const test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; });
      if (cur) lines.push(cur); return lines;
    }
    function draw(s) {
      ctx.clearRect(0, 0, 1024, 512); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 2;
      if (s.top && s.top.a > 0) { ctx.globalAlpha = s.top.a; ctx.fillStyle = '#f7e9d4'; ctx.font = '600 21px Montserrat, Arial, sans-serif'; spaced(s.top.text.toUpperCase(), 512, 48, 4); }
      if (s.date && s.date.a > 0) {
        ctx.globalAlpha = s.date.a; ctx.fillStyle = '#ffffff'; ctx.font = '700 58px Cinzel, Georgia, serif'; ctx.fillText(s.date.big, 512, 74);
        ctx.font = '500 23px Montserrat, Arial, sans-serif'; ctx.fillStyle = '#f3dfbf'; spaced(s.date.small.toUpperCase(), 512, 116, 3);
      }
      (s.center || []).forEach(l => { if (l.a <= 0) return; ctx.globalAlpha = l.a; ctx.fillStyle = l.color || '#fff'; ctx.font = l.font; if (l.sp) spaced(l.text, 512, l.y, l.sp); else ctx.fillText(l.text, 512, l.y); });
      if (s.prompt && s.prompt.a > 0) {
        ctx.globalAlpha = s.prompt.a; ctx.fillStyle = '#ffe7a8'; ctx.font = '600 28px Montserrat, Arial, sans-serif'; ctx.fillText(s.prompt.text, 512, 330);
        if (s.prompt.small) { ctx.font = '400 21px Montserrat, Arial, sans-serif'; ctx.fillStyle = '#f5ead8'; ctx.fillText(s.prompt.small, 512, 366); }
      }
      if (s.sub && s.sub.a > 0) {
        ctx.globalAlpha = s.sub.a; ctx.font = '500 30px Montserrat, Arial, sans-serif'; ctx.fillStyle = '#ffffff';
        const lines = wrap(s.sub.text, 860); lines.forEach((ln, i) => ctx.fillText(ln, 512, 462 - (lines.length - 1 - i) * 40));
      }
      ctx.globalAlpha = 1; tex.needsUpdate = true;
    }
    return {
      plane, fade,
      set(s) { const k = JSON.stringify(s); if (k !== key) { key = k; draw(s); } },
      redraw() { key = ''; },
      setFade(color, a) { fmat.color.set(color); fmat.opacity = a; fade.visible = a > 0.001; }
    };
  }

  function dotTexture() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64); return new T.CanvasTexture(cv);
  }

  AFRAME.registerComponent('ultimo-vuelo', {
    init: function () {
      this.T = 0; this.running = false; this.ended = false; this.choice = -1; this.choiceT = -1; this.hover = -1;
      this.root = new T.Group(); this.el.object3D.add(this.root);
      this.rig = document.getElementById('rig'); this.cam = document.getElementById('cam'); this.reticle = document.getElementById('reticula');
      this.v1 = new T.Vector3(); this.v2 = new T.Vector3(); this.v3 = new T.Vector3(); this.q = new T.Quaternion();
      this.dot = dotTexture();
      this.buildEnvironment(); this.buildLife(); this.buildFX();
      this.hud = HUD(this.cam.object3D);
      this.buildEvents();
      this.actualizar(0, 0);
      window.UV = this;
      this.el.addEventListener('enter-vr', () => { if (!this.running && !this.ended) { document.getElementById('inicio').classList.add('oculto'); this.start(0); } });
    },

    // ======================= ENTORNO =======================
    buildEnvironment: function () {
      const root = this.root;
      // cielo degradado por vértices
      const sg = new T.SphereGeometry(650, 32, 16); const sp = sg.attributes.position; const sc = new Float32Array(sp.count * 3); this.skyH = new Float32Array(sp.count);
      for (let i = 0; i < sp.count; i++) this.skyH[i] = sp.getY(i) / 650;
      sg.setAttribute('color', new T.BufferAttribute(sc, 3)); this.skyGeo = sg; this.skyKey = '';
      const sky = new T.Mesh(sg, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
      sky.renderOrder = -10; root.add(sky);
      // sol
      this.sunDir = new T.Vector3(0.55, 0.16, -0.82).normalize();
      this.sunDisk = new T.Mesh(new T.CircleGeometry(20, 12), new T.MeshBasicMaterial({ color: '#fff3dc', fog: false, transparent: true }));
      this.sunDisk.position.copy(this.sunDir).multiplyScalar(600); this.sunDisk.lookAt(0, 0, 0); root.add(this.sunDisk);
      this.sunGlow = new T.Sprite(new T.SpriteMaterial({ map: this.dot, color: '#ffd9a8', transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      this.sunGlow.scale.set(200, 200, 1); this.sunGlow.position.copy(this.sunDir).multiplyScalar(590); root.add(this.sunGlow);
      // luces
      this.hemi = new T.HemisphereLight('#ffe8d6', '#4a5a2a', 1.2); root.add(this.hemi);
      this.sun = new T.DirectionalLight('#ffcf9e', 2.2); this.sun.position.copy(this.sunDir).multiplyScalar(100); root.add(this.sun);
      this.fog = new T.Fog('#dcb9a3', 45, 340); this.el.object3D.fog = this.fog;
      // terreno, montañas, agua
      this.terrain = LP.terrain(C); root.add(this.terrain.mesh);
      this.mount = LP.mountains(5); root.add(this.mount.obj);
      this.waterMat = LP.msm('#4f7f8f', { roughness: 0.35, metalness: 0.1 });
      const water = LP.mesh(new T.CircleGeometry(LAG.r + 0.6, 14), this.waterMat, [LAG.x, -0.55, LAG.z], [-Math.PI / 2, 0, 0]); root.add(water);
      // vegetación
      const r = LP.rng(42); this.trees = []; this.ferns = [];
      const ok = (x, z, pad) => {
        if (Math.abs(x) < 4.5 + pad && z > -6 && z < 28) return false;
        if (Math.hypot(x - C.x, z - C.z) < 5 + pad) return false;
        if (Math.hypot(x - LAG.x, z - LAG.z) < LAG.r + 1 + pad) return false;
        if (Math.hypot(x - 9, z + 2) < 4) return false;
        return true;
      };
      let n = 0;
      while (n < 85) {
        const a = r() * Math.PI * 2, d = 7 + Math.pow(r(), 0.8) * 85; const x = Math.cos(a) * d, z = Math.sin(a) * d - 5;
        if (!ok(x, z, 1)) continue;
        const kind = r(); const tr = kind < 0.62 ? LP.palm(n * 7 + 1) : LP.araucaria(n * 7 + 1);
        tr.obj.position.set(x, LP.heightAt(x, z) - 0.2, z); const s = 0.8 + r() * 0.6; tr.obj.scale.setScalar(s);
        tr.base = s; tr.d = Math.hypot(x - C.x, z - C.z); tr.sway = r() * 6; root.add(tr.obj); this.trees.push(tr); n++;
      }
      n = 0;
      while (n < 70) {
        const a = r() * Math.PI * 2, d = 3 + Math.pow(r(), 1.2) * 40; const x = C.x + Math.cos(a) * d, z = C.z + Math.sin(a) * d;
        if (Math.abs(x) < 2.2 && z > 5 && z < 28) continue;
        if (Math.hypot(x - C.x, z - C.z) < 6.5 || Math.hypot(x - LAG.x, z - LAG.z) < LAG.r) continue;
        const f = LP.fern(n * 3 + 5, 0.7 + r() * 0.8); f.obj.position.set(x, LP.heightAt(x, z), z); f.base = f.obj.scale.x; f.d = Math.hypot(x - C.x, z - C.z);
        root.add(f.obj); this.ferns.push(f); n++;
      }
      // rocas y mesetas (como en la referencia)
      for (let i = 0; i < 26; i++) {
        const a = r() * Math.PI * 2, d = 10 + r() * 70; const x = Math.cos(a) * d, z = Math.sin(a) * d - 5;
        if (!ok(x, z, 0)) continue;
        const k = LP.rock(i + 100, 1 + r() * 2.5, 0.6 + r() * 1.4, 1 + r() * 2.5, r() < 0.5 ? LP.M.rock : LP.M.rock2);
        k.position.set(x, LP.heightAt(x, z), z); k.rotation.y = r() * 6; root.add(k);
      }
      [[-28, -34, 9, 4, 7], [26, -20, 7, 3, 6], [-40, 10, 8, 5, 6]].forEach((m, i) => {
        const o = LP.mesa(i + 300, m[2], m[3], m[4]); o.position.set(m[0], LP.heightAt(m[0], m[1]) + m[3] / 2 - 0.6, m[1]); root.add(o);
      });
      // roca de los pingüinos
      this.penguinRock = new T.Vector3(9, 0, -2);
      [[0, 0, 2.2, 0.9, 1.8], [1.8, 0.4, 1.3, 0.7, 1.2], [-1.6, 0.7, 1.4, 0.6, 1.3]].forEach((q, i) => {
        const k = LP.rock(i + 200, q[2], q[3], q[4], LP.M.rock2); k.position.set(9 + q[0], 0.1, -2 + q[1]); this.root.add(k);
      });
    },

    // ======================= SERES VIVOS =======================
    buildLife: function () {
      const root = this.root;
      const add = o => { root.add(o); return o; };
      // titanosaurios
      this.sauros = [
        { p0: [-24, -2], dir: [0.25, -1], sp: 0.8, c: '#8a5d48', s: 1 },
        { p0: [-33, -14], dir: [0.3, -1], sp: 0.7, c: '#7d5a4c', s: 1.15 },
        { p0: [-18, -24], dir: [0.2, -1], sp: 0.75, c: '#94664f', s: 0.9 },
        { p0: [30, -34], dir: [-1, -0.2], sp: 0.6, c: '#80604c', s: 1.1 }
      ].map((d, i) => { const s = LP.sauropod(i + 11, d.c); s.obj.scale.setScalar(d.s); add(s.obj); return Object.assign(s, d); });
      // terópodo principal (el de la referencia) y uno lejano
      this.trex = LP.theropod(3, '#8b5a3c'); add(this.trex.obj); this.trex.obj.scale.setScalar(1.1);
      this.trex2 = LP.theropod(4, '#6f4a33'); add(this.trex2.obj); this.trex2.obj.position.set(-10, 0, -34); this.trex2.obj.rotation.y = 0.6;
      // pterosaurios
      this.pteros = [0, 1, 2, 3, 4, 5].map(i => { const p = LP.pterosaur(i + 1); p.obj.scale.setScalar(1.6); add(p.obj); p.ph = i * 1.05; p.r = 22 + i * 4; p.h = 24 + (i % 3) * 6; return p; });
      // dinosaurios emplumados no avianos (dromeosaurios)
      const rcols = ['#7b5136', '#6a4a35', '#85603e', '#5e4632', '#7a5a3a'];
      this.raptors = rcols.map((c, i) => { const b = LP.bird(LP.preset('raptor', { body: c }), 30 + i); add(b.obj); b.base = [7 + (i % 3) * 1.8, 9 + Math.floor(i / 2) * 1.6]; b.ph = i * 1.3; return b; });

      // supervivientes (entidades A-Frame para poder mirarlos / tocarlos)
      this.survSpots = [new T.Vector3(-1.0, 0, 4.6), new T.Vector3(0, 0, 4.1), new T.Vector3(1.0, 0, 4.6)];
      this.survFrom = [new T.Vector3(-4, 0, 1.0), new T.Vector3(0.5, 0, 0.0), new T.Vector3(4, 0, 1.2)];
      this.survS1 = [new T.Vector3(-3.4, 0, 17.0), new T.Vector3(-2.4, 0, 18.3), new T.Vector3(-4.3, 0, 18.8)];
      this.surv = ['survA', 'survB', 'survC'].map((name, i) => {
        const b = LP.bird(LP.preset(name), 50 + i);
        const el = document.createElement('a-entity'); el.classList.add('superviviente');
        this.el.appendChild(el);
        el.setObject3D('mesh', b.obj);
        b.el = el; b.base = LP.preset(name); b.i = i;
        b.early = Object.assign({}, b.base, LP.SP.early);
        b.target = LP.preset(DESTINO[i].sp);
        el.addEventListener('click', () => this.choose(i));
        el.addEventListener('mouseenter', () => { this.hover = i; });
        el.addEventListener('mouseleave', () => { if (this.hover === i) this.hover = -1; });
        return b;
      });
      this.tmpP = {};

      // S4: diversificación (incluye especies fósiles de Chile/Sudamérica)
      this.spawns = [
        { sp: 'early', at: 37.5, pos: [-2.6, 1.4], mode: 'walk', col: { body: '#7d6a55', belly: '#cbb89a', wing: '#4d3e30', head: '#6b5a48' } },
        { sp: 'chincol', at: 39.5, pos: [2.6, 2.4], mode: 'stand' },
        { sp: 'chincol', at: 40.2, pos: [-3.2, 4.4], mode: 'stand', col: { body: '#6f7a5a' } },
        { sp: 'pinguinoGigante', at: 41, pos: [4.6, -2.6], mode: 'stand', label: ['Pingüino gigante', 'fósil hallado en Chile'] },
        { sp: 'fororraco', at: 41.5, pos: [-9, -3], to: [6, -7], mode: 'run', label: ['Ave del terror', 'Sudamérica'] },
        { sp: 'flamenco', at: 43, pos: [-5.5, 0.5], mode: 'stand' },
        { sp: 'pelagornis', at: 38.5, fly: { c: [0, 13, 0], r: 13, w: 0.32 }, mode: 'glide', label: ['Pelagornis chilensis', '¡5 m de envergadura!'] }
      ].map((d, i) => {
        const b = LP.bird(LP.preset(d.sp, d.col), 80 + i); add(b.obj); b.obj.visible = false;
        if (d.label) { b.lab = LP.label(d.label[0], d.label[1]); add(b.lab); }
        return Object.assign(b, d);
      });
      // bandada en vuelo durante la evolución
      this.flockEvo = [0, 1, 2, 3, 4, 5].map(i => { const b = LP.bird(LP.preset(i % 2 ? 'chincol' : 'gaviota', { size: 0.9 }), 120 + i); add(b.obj); b.obj.visible = false; return b; });

      // S5: el presente (Chile)
      this.present = [];
      const P = (sp, over, mode, pos, extra) => { const b = LP.bird(LP.preset(sp, over), 200 + this.present.length); add(b.obj); b.obj.visible = false; Object.assign(b, { mode, pos, sp }, extra || {}); this.present.push(b); return b; };
      [[-9.5, -6.5], [-11, -5], [-14, -4.5], [-16, -7.5], [-12.5, -8.5]].forEach((q, i) => P('flamenco', null, 'stand', q, { yaw: 1 + i * 0.7, y: -0.5 }));
      [[8.6, -2.3, 0.95], [9.6, -1.6, 0.95], [10.6, -1.7, 0.75], [7.6, -1.4, 0.7]].forEach((q, i) => P('pinguino', null, 'stand', [q[0], q[1]], { yaw: 1.6 + i * 0.4, y: q[2] }));
      [[-2.6, 7.2], [-3.4, 8.0], [-1.9, 8.4]].forEach((q, i) => P('chincol', null, 'walk', q, { yaw: i * 2, wander: true }));
      [0, 1].forEach(i => P('condor', null, 'glide', null, { circle: { c: [0, 28, -18], r: 20 + i * 6, w: 0.22, ph: i * 3 } }));
      [0, 1, 2, 3, 4, 5, 6].forEach(i => P('gaviota', null, 'fly', null, { vflock: i }));
      this.pica = P('picaflor', null, 'hover', null, { hoverCam: true });
      this.hero = P('condor', null, 'glide', null, { heroe: true });
      this.labels = {
        flamenco: LP.label('Flamenco chileno'), pinguino: LP.label('Pingüino de Humboldt'), condor: LP.label('Cóndor andino'),
        picaflor: LP.label('Picaflor'), chincol: LP.label('Chincol'),
        tita: LP.label('Titanosaurio', 'saurópodo'), trex: LP.label('Tiranosaurio', 'terópodo'), avianos: LP.label('Dinosaurios avianos', 'pequeños y emplumados'),
        tuyo: LP.label('Tu superviviente', '')
      };
      Object.values(this.labels).forEach(l => add(l));
    },

    // ======================= EFECTOS =======================
    buildFX: function () {
      const root = this.root;
      // asteroide
      this.ast = new T.Group(); root.add(this.ast);
      this.ast.add(LP.mesh(LP.jitter(new T.IcosahedronGeometry(4, 1), 1.4, 9), new T.MeshStandardMaterial({ color: '#3a2a22', emissive: '#ff7a2a', emissiveIntensity: 0.7, flatShading: true, fog: false })));
      const tg = new T.ConeGeometry(4.5, 90, 10, 1, true); tg.translate(0, 45, 0); tg.rotateX(-Math.PI / 2);
      this.trail = new T.Mesh(tg, new T.MeshBasicMaterial({ color: '#ffb060', transparent: true, opacity: 0.75, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }));
      this.trailG = new T.Group(); this.trailG.add(this.trail); root.add(this.trailG);
      this.astGlow = new T.Sprite(new T.SpriteMaterial({ map: this.dot, color: '#ffc27a', transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      this.astGlow.scale.set(60, 60, 1); this.ast.add(this.astGlow);
      // bola de fuego + hongo
      this.fire = new T.Group(); this.fire.position.copy(IMPACT); root.add(this.fire);
      this.fireMat = new T.MeshBasicMaterial({ color: '#fff2c0', fog: false });
      this.ball = LP.mesh(LP.jitter(new T.IcosahedronGeometry(1, 2), 0.12, 4), this.fireMat); this.fire.add(this.ball);
      this.stemMat = new T.MeshBasicMaterial({ color: '#ff7b2e', fog: false });
      const stemG = LP.jitter(new T.CylinderGeometry(0.7, 1.2, 1, 8, 3), 0.15, 5); stemG.translate(0, 0.5, 0);
      this.stem = LP.mesh(stemG, this.stemMat); this.fire.add(this.stem);
      this.cap = LP.mesh(LP.jitter(new T.IcosahedronGeometry(1, 1), 0.3, 6), this.stemMat); this.fire.add(this.cap);
      this.fireGlow = new T.Sprite(new T.SpriteMaterial({ map: this.dot, color: '#ffcc88', transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      this.fire.add(this.fireGlow);
      // onda expansiva
      const rg = new T.RingGeometry(0.9, 1, 64); rg.rotateX(-Math.PI / 2);
      this.ring = new T.Mesh(rg, new T.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }));
      this.ring.position.copy(IMPACT).setY(1.5); root.add(this.ring);
      // muro de polvo
      this.dustMat = new T.MeshStandardMaterial({ color: '#6e4b35', transparent: true, opacity: 0.92, flatShading: true, side: T.DoubleSide, depthWrite: false });
      this.dust = LP.mesh(LP.jitter(new T.IcosahedronGeometry(1, 3), 0.06, 8), this.dustMat); this.dust.position.copy(IMPACT); root.add(this.dust);
      // eyecciones incandescentes
      const r = LP.rng(77); this.ejecta = [];
      const ejMat = new T.MeshBasicMaterial({ color: '#ffb04a', fog: false });
      const fireConeMat = new T.MeshBasicMaterial({ color: '#ff8a2a', transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false });
      for (let i = 0; i < 26; i++) {
        const land = new T.Vector3(-55 + r() * 110, 0, -45 + r() * 60);
        if (Math.abs(land.x) < 6 && land.z > -2) land.x += land.x < 0 ? -8 : 8;
        land.y = LP.heightAt(land.x, land.z);
        const m = LP.mesh(LP.jitter(new T.IcosahedronGeometry(1, 0), 0.4, i), ejMat); m.scale.setScalar(0.8 + r() * 1.2); root.add(m);
        const fl = LP.mesh(LP.G.coneUp, fireConeMat, [land.x, land.y, land.z], null, [1, 2.5, 1]); root.add(fl);
        const tr = new T.Group(); const tm = new T.Mesh(tg, this.trail.material); tm.scale.set(0.12, 0.12, 0.25); tr.add(tm); root.add(tr);
        this.ejecta.push({ m, fl, tr, land, ts: 15.7 + i * 0.2 + r() * 0.3, dur: 2.4 + r() * 0.8, peak: 70 + r() * 90 });
      }
      // partículas: ceniza y brasas
      const mkPts = (count, color, size, blend) => {
        const g = new T.BufferGeometry(); const a = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) { a[i * 3] = (Math.random() - 0.5) * 30; a[i * 3 + 1] = (Math.random() - 0.5) * 14; a[i * 3 + 2] = (Math.random() - 0.5) * 30; }
        g.setAttribute('position', new T.BufferAttribute(a, 3));
        const m = new T.PointsMaterial({ color, size, map: this.dot, transparent: true, opacity: 0, depthWrite: false, blending: blend || T.NormalBlending, sizeAttenuation: true });
        const p = new T.Points(g, m); p.frustumCulled = false; root.add(p); return p;
      };
      this.ashPts = mkPts(2600, '#b9b2a8', 0.09);
      this.emberPts = mkPts(700, '#ff8a3a', 0.12, T.AdditiveBlending);
      // ===== rayo de luz que atraviesa el polvo y cae sobre los supervivientes =====
      this.beam = new T.Group(); root.add(this.beam);
      const beamGeo = (rTop, rBot, h) => {
        const g = new T.CylinderGeometry(rTop, rBot, h, 24, 6, true); g.translate(0, h / 2, 0);
        const p = g.attributes.position, c = new Float32Array(p.count * 3);
        for (let i = 0; i < p.count; i++) { const k = Math.pow(1 - p.getY(i) / h, 1.6); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k; }
        g.setAttribute('color', new T.BufferAttribute(c, 3)); return g;
      };
      const beamMat = () => new T.MeshBasicMaterial({ color: '#ffe3a6', vertexColors: true, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide });
      this.beamOuter = new T.Mesh(beamGeo(0.9, 2.2, 30), beamMat()); this.beam.add(this.beamOuter);
      this.beamCore = new T.Mesh(beamGeo(0.5, 1.5, 24), beamMat()); this.beam.add(this.beamCore);
      this.beam.rotation.set(-0.2, 0, -0.1); // ligeramente inclinado, como luz que entra entre nubes
      // charco de luz en el suelo
      const pool = new T.CircleGeometry(1, 32); pool.rotateX(-Math.PI / 2);
      this.pool = new T.Mesh(pool, new T.MeshBasicMaterial({ map: this.dot, color: '#ffdd99', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      root.add(this.pool);
      // luz real que ilumina a las aves (y nada más)
      this.spot = new T.SpotLight('#ffe2a8', 0, 0, 0.2, 0.55, 0);
      this.spotTarget = new T.Object3D(); root.add(this.spot, this.spotTarget); this.spot.target = this.spotTarget;
      // motas de polvo brillando dentro del rayo
      { const n = 320, g = new T.BufferGeometry(), a = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { const r = Math.sqrt(Math.random()) * 2.2, an = Math.random() * 6.283; a[i * 3] = Math.cos(an) * r; a[i * 3 + 1] = Math.random() * 9; a[i * 3 + 2] = Math.sin(an) * r; }
        g.setAttribute('position', new T.BufferAttribute(a, 3));
        this.motes = new T.Points(g, new T.PointsMaterial({ color: '#ffe9b8', size: 0.06, map: this.dot, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
        this.motes.frustumCulled = false; root.add(this.motes); }
      // anillos en el suelo que indican que las aves se pueden elegir
      const ringG = new T.RingGeometry(0.34, 0.42, 40); ringG.rotateX(-Math.PI / 2);
      this.markers = [0, 1, 2].map(() => { const m = new T.Mesh(ringG, new T.MeshBasicMaterial({ color: '#ffe7a8', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false })); root.add(m); return m; });
      // brillo bajo el elegido
      this.halo = new T.Sprite(new T.SpriteMaterial({ map: this.dot, color: '#ffd98a', transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      root.add(this.halo);
      this.beamC = new T.Vector3();
    },

    // ======================= EVENTOS PUNTUALES =======================
    buildEvents: function () {
      const S = Sonido; const self = this;
      const p = (x, y, z) => new T.Vector3(x, y, z);
      const ev = [
        [0.0, () => S.trino(p(-3, 0.5, 17), 3600, 3, 0.15)],
        [1.6, () => S.llamadaSaurop(p(-24, 8, -4))],
        [3.2, () => S.chillido(p(10, 26, -6))],
        [4.6, () => S.trino(p(-3, 0.5, 18), 3200, 4, 0.2)],
        [6.6, () => S.llamadaSaurop(p(-32, 8, -18))],
        [8.2, () => S.chillido(p(-14, 28, -10))],
        [11.0, () => S.rugido(self.trex.obj.position.clone().setY(5), 2.4)],
        [15.0, () => S.impacto(IMPACT.clone(), 1.2)],
        [16.2, () => S.chillido(p(6, 20, -4))],
        [19.0, () => S.impacto(p(0, 2, -6), 0.9)],
        [19.2, () => S.rafaga(p(0, 2, 2))],
        [34.0, () => S.musicaEvolucion(self.T - 34)],
        [48.0, () => S.musicaEpica(self.T - 48)],
        [53.4, () => S.rafaga(self.heroPos ? self.heroPos.clone() : p(0, 10, -30))]
      ];
      this.ejecta.forEach(e => ev.push([e.ts + e.dur, () => S.golpe(e.land)]));
      this.events = ev.sort((a, b) => a[0] - b[0]);
      this.evI = 0;
    },

    // ======================= CONTROL =======================
    start: function (t0) {
      Sonido.init(); Sonido.resume();
      this.T = t0 || 0; this.running = true; this.ended = false;
      if (this.T < 24) { this.choice = -1; this.choiceT = -1; }
      this.evI = 0; while (this.evI < this.events.length && this.events[this.evI][0] < this.T) this.evI++;
      this.hud.redraw();
      document.getElementById('fin').classList.add('oculto');
    },
    restart: function () { this.choice = -1; this.choiceT = -1; this.start(0); },
    seek: function (t) { this.T = t; this.evI = 0; while (this.evI < this.events.length && this.events[this.evI][0] < t) this.evI++; this.actualizar(t, 0); },
    choose: function (i) {
      if (this.choice >= 0 || this.T < 24 || this.T > 33.4) return;
      this.choice = i; this.choiceT = this.T;
      const pos = this.surv[i].el.object3D.position;
      Sonido.trino(pos.clone().setY(0.4), 3800, 5, 0.35); Sonido.campana(pos.clone().setY(0.6));
    },

    tick: function (time, dtMs) {
      if (!this.running) { if (!this.ended) this.actualizar(this.T, 0); return; }
      const dt = Math.min(0.05, (dtMs || 16) / 1000);
      this.T += dt;
      while (this.evI < this.events.length && this.events[this.evI][0] <= this.T) { try { this.events[this.evI][1](); } catch (e) { console.warn(e); } this.evI++; }
      if (this.T >= DUR) { this.T = DUR; this.running = false; this.ended = true; this.actualizar(DUR, dt); Sonido.stopAll(); document.getElementById('fin').classList.remove('oculto'); return; }
      this.actualizar(this.T, dt);
    },

    actualizar: function (t, dt) {
      this.updateEnv(t);
      this.updateCamera(t);
      this.updateDinos(t);
      this.updateSurvivors(t, dt);
      this.updateBirds(t);
      this.updateFX(t, dt);
      this.updateHUD(t);
      if (Sonido.ready && this.running) this.updateAudio(t, dt);
    },

    // ======================= ENTORNO =======================
    updateEnv: function (t) {
      const top = ENV.skyTop(t).clone(), hor = ENV.skyHor(t).clone(), bot = ENV.skyBot(t).clone();
      const key = top.getHexString() + hor.getHexString() + bot.getHexString();
      if (key !== this.skyKey) {
        this.skyKey = key; const c = this.skyGeo.attributes.color; const tmp = new T.Color();
        for (let i = 0; i < this.skyH.length; i++) {
          const h = this.skyH[i];
          if (h >= 0) tmp.copy(hor).lerp(top, Math.pow(h, 0.55)); else tmp.copy(hor).lerp(bot, sm(0, 0.25, -h));
          c.setXYZ(i, tmp.r, tmp.g, tmp.b);
        }
        c.needsUpdate = true;
      }
      this.fog.color.copy(ENV.fogC(t)); this.fog.near = ENV.fogNear(t); this.fog.far = ENV.fogFar(t);
      this.sun.intensity = ENV.sunI(t); this.sun.color.copy(ENV.sunC(t));
      this.hemi.intensity = ENV.hemiI(t); this.hemi.color.copy(ENV.hemiSky(t)); this.hemi.groundColor.copy(ENV.hemiGnd(t));
      const sv = ENV.sunVis(t); this.sunDisk.visible = this.sunGlow.visible = sv > 0.01; this.sunDisk.material.opacity = sv; this.sunGlow.material.opacity = sv * 0.8;
      // sol más alto en el presente
      const hi = sm(42, 48, t); this.sunDir.set(0.55 - hi * 0.15, 0.16 + hi * 0.4, -0.82).normalize();
      this.sunDisk.position.copy(this.sunDir).multiplyScalar(600); this.sunDisk.lookAt(0, 0, 0);
      this.sunGlow.position.copy(this.sunDir).multiplyScalar(590); this.sun.position.copy(this.sunDir).multiplyScalar(100);
      this.terrain.setState(ENV.ash(t), ENV.regrow(t));
      this.mount.mat.color.copy(ENV.mountTint(t)); this.mount.setSnow(ENV.snow(t));
      this.waterMat.color.copy(ENV.water(t));
      // vegetación: arde, se encoge, rebrota desde el superviviente
      const burn = ENV.burn(t), R = ENV.regrow(t);
      const fol = this._fol || (this._fol = { palm: new T.Color('#4f7a35'), palm2: new T.Color('#62903c'), arau: new T.Color('#2f5a35'), fern: new T.Color('#6f9a3f'), trunk: new T.Color('#6b4a33') });
      const burnt = new T.Color('#1d1814'), ember = new T.Color('#5a2a14');
      const glow = win(t, 16, 22, 1.5);
      ['palm', 'palm2', 'arau', 'fern', 'trunk'].forEach(k => { LP.M[k].color.copy(fol[k]).lerp(burnt, burn); if (glow > 0) LP.M[k].emissive.copy(ember).multiplyScalar(glow * 0.6); else LP.M[k].emissive.setRGB(0, 0, 0); });
      const wind = sm(18.9, 19.3, t) * (1 - sm(19.6, 21.5, t));
      this.trees.forEach(tr => {
        const back = 1 - sm(R - 20, R, tr.d);
        const leaf = t < 34 ? 1 - 0.75 * sm(18, 22, t) : 0.25 + 0.75 * back;
        tr.crown.scale.setScalar(Math.max(0.05, leaf));
        tr.obj.rotation.x = wind * 0.35 + Math.sin(t * 0.8 + tr.sway) * 0.015;
      });
      this.ferns.forEach(f => {
        const back = 1 - sm(R - 10, R, f.d);
        const s = t < 34 ? 1 - sm(17.5, 21, t) : back;
        f.obj.scale.setScalar(f.base * Math.max(0.001, s)); f.obj.visible = s > 0.01;
      });
    },

    // ======================= CÁMARA =======================
    rigAt: function (t, out) {
      let x, y, z, yaw;
      if (t < 10) { const u = sm(0, 10, t); x = 0; y = 0; z = lerp(24, 13, u); yaw = lerp(0.42, 0.02, u); }
      else if (t < 22) { const u = sm(10, 13, t); x = 0; y = 0.2 * u; z = lerp(13, 12, u); yaw = lerp(0.02, 0.17, u); }
      else if (t < 34) { const u = sm(22, 29, t); x = 0; y = lerp(0.2, -0.95, u); z = lerp(12, 6.6, u); yaw = lerp(0.17, 0, u); }
      else if (t < 48) {
        const u = clamp01((t - 34) / 14); const a = sm(0, 1, u) * 1.1; const R = 2.5 + this.orbitGrow() * u;
        x = C.x + Math.sin(a) * R; z = C.z + Math.cos(a) * R; y = lerp(-0.95, -0.25, u); yaw = a;
      } else {
        const a0 = 1.1, R0 = 2.5 + this.orbitGrow(); const sx = C.x + Math.sin(a0) * R0, sz = C.z + Math.cos(a0) * R0;
        const u = sm(48, 53, t), w = sm(53, 54.2, t);
        x = lerp(sx, 2.5, u); z = lerp(sz, 10, u); y = lerp(-0.25, 0, u); yaw = lerp(lerp(1.1, 0.62, u), 0.2, w);
      }
      out.set(x, y, z); return yaw;
    },
    orbitGrow: function () { return this.choice === 2 ? -0.7 : this.choice === 1 ? 1.0 : 2.2; },
    updateCamera: function (t) {
      const p = this.v1; const yaw = this.rigAt(t, p);
      const sh = ENV.shake(t) * (this.el.is('vr-mode') ? 0.3 : 1);
      if (sh > 0) { p.x += Math.sin(t * 47) * sh * 0.6 + Math.sin(t * 91) * sh * 0.3; p.y += Math.sin(t * 63) * sh * 0.5; p.z += Math.cos(t * 53) * sh * 0.4; }
      this.rig.object3D.position.copy(p); this.rig.object3D.rotation.y = yaw;
      this.rigYaw = yaw;
      this.eye = this.eye || new T.Vector3(); this.eye.copy(p).add(new T.Vector3(0, 1.6, 0));
    },

    // ======================= DINOSAURIOS NO AVIANOS =======================
    updateDinos: function (t) {
      const alive = t < 21.2;
      const flee = sm(15.3, 16.5, t);
      this.sauros.forEach((s, i) => {
        s.obj.visible = alive; if (!alive) return;
        const run = Math.max(0, t - 15.5) * 1.8;
        const x = s.p0[0] + s.dir[0] * s.sp * t + s.dir[0] * run, z = s.p0[1] + s.dir[1] * s.sp * t + s.dir[1] * run;
        s.obj.position.set(x, LP.heightAt(x, z), z); s.obj.rotation.y = Math.atan2(-s.dir[1], s.dir[0]);
        s.anim(t + i, 1 + flee * 1.2);
      });
      this.trex2.obj.visible = alive; if (alive) this.trex2.anim(t, 0, 0);
      // T. rex: cruza, mira al cielo y ruge, huye; después yace como fósil
      const tr = this.trex; const o = tr.obj;
      if (t < 21.2) {
        o.visible = true; o.rotation.set(0, 0, 0);
        let x = 15 - Math.min(t, 10) * 0.8, z = 2.5, speed = t < 10 ? 1 : 0, roar = 0, yaw = Math.PI;
        if (t >= 10 && t < 15.5) { roar = win(t, 10.9, 13.6, 0.4); yaw = Math.PI + sm(10, 11, t) * 0.5; }
        if (t >= 15.5) { const k = t - 15.5; const d = new T.Vector3(-1, 0, -0.35).normalize(); x = 7 + d.x * k * 7; z = 2.5 + d.z * k * 7; speed = 2; yaw = Math.atan2(-d.z, d.x); }
        o.position.set(x, LP.heightAt(x, z), z); o.rotation.y = yaw; tr.anim(t, speed, roar);
        tr.mats[0].color.set('#ffffff');
      } else if (t < 40) {
        o.visible = true; o.rotation.set(Math.PI / 2, 0.4, 0); tr.anim(0, 0, 0.3);
        o.position.set(8, 1.1 - sm(34, 40, t) * 3.5, -9);
        tr.mats[0].color.set('#3a3330');
      } else o.visible = false;
      // pterosaurios
      this.pteros.forEach(p => {
        p.obj.visible = t < 20.5; if (!p.obj.visible) return;
        const esc = Math.max(0, t - 15.2) * 9;
        const a = t * 0.25 + p.ph; const x = Math.cos(a) * (p.r + esc), z = Math.sin(a) * (p.r + esc) - 8, y = p.h + esc * 0.6;
        p.obj.position.set(x, y, z); p.obj.rotation.set(0, -a - Math.PI, -0.25); p.anim(t * (t > 15.2 ? 2.4 : 1));
      });
      // dromeosaurios emplumados
      this.raptors.forEach((b, i) => {
        b.obj.visible = alive; if (!alive) return;
        let x, z, mode = 'walk', yaw;
        if (t < 15.4) { const a = t * 0.45 + b.ph; x = b.base[0] + Math.cos(a) * 1.3; z = b.base[1] + Math.sin(a) * 1.3; yaw = -a - Math.PI / 2; if (Math.sin(t * 0.6 + i) > 0.6) mode = 'stand'; }
        else { const k = t - 15.4; x = b.base[0] + k * 6; z = b.base[1] - k * 2; yaw = Math.atan2(2, 6); mode = 'run'; }
        b.obj.position.set(x, LP.heightAt(x, z), z); b.obj.rotation.y = yaw; b.anim(t, mode);
      });
    },

    // ======================= SUPERVIVIENTES =======================
    updateSurvivors: function (t, dt) {
      const auto = t >= 33.4 && this.choice < 0;
      if (auto && this.running) { this.choice = 1; this.choiceT = 33.4; this.autoChoice = true; }
      const ch = this.choice;
      this.surv.forEach((b, i) => {
        const o = b.el.object3D; let mode = 'stand', yaw = 0, s = 1; const pos = this.v2;
        if (t < 21) {
          // en el bosque del Cretácico, junto al camino
          const sp = this.survS1[i];
          if (t < 15.4) { pos.set(sp.x + Math.sin(t * 0.7 + i) * 0.3, 0, sp.z + Math.cos(t * 0.5 + i * 2) * 0.3); yaw = 1.2 + Math.sin(t * 0.3 + i) * 0.8; mode = Math.sin(t * 0.9 + i * 2) > 0.3 ? 'walk' : 'stand'; }
          else { const k = t - 15.4; pos.set(sp.x - k * 3, 0, sp.z + k * 1.5); yaw = Math.atan2(-1.5, -3); mode = 'run'; }
        } else if (t < 34) {
          // emergen de la ceniza
          const u = sm(23.2, 26.2, t + i * 0.4); pos.copy(this.survFrom[i]).lerp(this.survSpots[i], u);
          mode = u < 0.98 ? 'walk' : 'stand';
          yaw = u < 0.98 ? Math.atan2(-(this.survSpots[i].z - this.survFrom[i].z), this.survSpots[i].x - this.survFrom[i].x) : -Math.PI / 2 + Math.sin(t * 0.6 + i * 2) * 0.9;
          if (ch === i && t - this.choiceT < 1.4) mode = 'flutter';
          if (this.hover === i && ch < 0 && t > 24) { const hs = 1 + Math.sin(t * 10) * 0.04; s = hs; }
        } else {
          if (i === ch) {
            const u = sm(34, 36, t); pos.copy(this.survSpots[i]).lerp(C, u); mode = u < 0.98 ? 'walk' : 'stand';
            yaw = u < 0.98 ? Math.atan2(-(C.z - this.survSpots[i].z), C.x - this.survSpots[i].x + 1e-4) : this.rigYaw + Math.PI / 2 + Math.sin(t * 0.4) * 0.5;
            const d = DESTINO[i];
            if (t > 45.5) mode = d.modo;
            if (d.modo === 'hover') pos.y = sm(44, 46.5, t) * 0.7;
          } else {
            const u = sm(34.5, 39, t); const away = new T.Vector3(i < ch || ch < 0 ? -5 : 5, 0, -1.5);
            pos.copy(this.survSpots[i]).lerp(away, u); mode = 'walk'; yaw = Math.atan2(-(away.z - this.survSpots[i].z), away.x - this.survSpots[i].x);
            s = 1 - sm(37.5, 39.5, t);
          }
        }
        o.visible = s > 0.01;
        o.position.copy(pos); if (pos.y === 0) o.position.y = LP.heightAt(pos.x, pos.z);
        o.rotation.y = yaw; o.scale.setScalar(s);
        // evolución continua del elegido
        if (i === ch && t >= 34) {
          const u = clamp01((t - 34.5) / 13);
          if (u < 0.45) LP.lerpParams(b.base, b.early, sm(0, 0.45, u), this.tmpP); else LP.lerpParams(b.early, b.target, sm(0.45, 1, u), this.tmpP);
          b.apply(this.tmpP);
        } else if (t < 34) b.apply(b.base);
        // brillo al elegir / al apuntar
        // brillo: un leve contorno cálido dentro del rayo, más fuerte al apuntar y al elegir
        const inBeam = win(t, 23.4, 34.5, 1) * (ch < 0 || ch === i ? 1 : 1 - sm(this.choiceT, this.choiceT + 1.2, t));
        const glow = inBeam * 0.14 + ((this.hover === i && ch < 0 && t > 24 && t < 33.4) ? 0.35 : (i === ch && t > 24 && t < 36 ? win(t, this.choiceT, this.choiceT + 3, 0.3) * 0.7 : 0));
        b.mats.body.emissive.setRGB(glow * 0.6, glow * 0.4, glow * 0.15); b.mats.wing.emissive.copy(b.mats.body.emissive);
        b.mats.head.emissive.copy(b.mats.body.emissive); b.mats.belly.emissive.copy(b.mats.body.emissive);
        b.anim(t, mode);
        // anillo indicador bajo cada ave mientras se puede elegir
        const mk = this.markers[i]; const ma = (t > 24.2 && t < 33.6 && ch < 0) ? sm(24.2, 25, t) * (0.45 + 0.25 * Math.sin(t * 4 + i * 2) + (this.hover === i ? 0.4 : 0)) : 0;
        mk.material.opacity = ma; mk.visible = ma > 0.01; mk.position.set(o.position.x, o.position.y + 0.03, o.position.z);
      });
      // rayo de luz: llega por el polvo y envuelve a los tres; al elegir se cierra sobre uno
      const narrow = ch >= 0 ? sm(this.choiceT, this.choiceT + 1.5, t) : 0;
      const chosenPos = ch >= 0 ? this.surv[ch].el.object3D.position : this.survSpots[1];
      this.beamC.set(0, 0, 4.45).lerp(this.v3.set(chosenPos.x, 0, chosenPos.z), narrow);
      const bA = sm(22.6, 24.2, t) * (1 - sm(34.5, 38.5, t));
      const flick = 1 + Math.sin(t * 2.3) * 0.05 + Math.sin(t * 5.1) * 0.03;
      const wide = 1 - narrow * 0.55;
      this.beam.visible = this.pool.visible = this.motes.visible = bA > 0.003;
      this.beam.position.copy(this.beamC); this.beam.scale.set(wide, 1, wide);
      this.beamOuter.material.opacity = bA * 0.07 * flick; this.beamCore.material.opacity = bA * 0.09 * flick;
      this.pool.position.set(this.beamC.x, 0.02, this.beamC.z); this.pool.scale.setScalar(2.8 * wide); this.pool.material.opacity = bA * 0.22;
      this.motes.position.copy(this.beamC); this.motes.scale.set(wide, 1, wide); this.motes.material.opacity = bA * 0.9;
      const ma = this.motes.geometry.attributes.position.array;
      for (let k = 1; k < ma.length; k += 3) { ma[k] -= dt * 0.25; if (ma[k] < 0) ma[k] += 9; }
      this.motes.geometry.attributes.position.needsUpdate = true;
      this.spot.intensity = bA * 3.2 * flick; this.spot.visible = bA > 0.003;
      this.spot.angle = 0.2 - narrow * 0.09;
      this.spot.position.set(this.beamC.x + 1.6, 14, this.beamC.z - 3.5); this.spotTarget.position.copy(this.beamC);
      const ha = ch >= 0 ? win(t, this.choiceT, this.choiceT + 3.5, 0.4) * 0.8 : 0;
      this.halo.material.opacity = ha; this.halo.visible = ha > 0.01; this.halo.position.set(chosenPos.x, 0.35, chosenPos.z); this.halo.scale.setScalar(1.6);
      // retícula: solo durante la interacción
      const show = t > 24.2 && t < 33.4 && this.choice < 0;
      if (this.reticle && this.reticle.object3D.visible !== show) this.reticle.object3D.visible = show;
    },

    // ======================= AVES: DIVERSIFICACIÓN Y PRESENTE =======================
    updateBirds: function (t) {
      // S4: especies que aparecen durante la aceleración del tiempo
      this.spawns.forEach((b, i) => {
        const vis = t > b.at && t < 48.4; b.obj.visible = vis;
        if (b.lab) { const a = win(t, b.at + 1, Math.min(b.at + 5.5, 48), 0.5); b.lab.material.opacity = a; b.lab.visible = a > 0.01; }
        if (!vis) return;
        const s = sm(b.at, b.at + 1.2, t) * (1 - sm(47.4, 48.4, t));
        b.obj.scale.setScalar(Math.max(0.001, s));
        let x, y = 0, z, yaw;
        if (b.fly) { const a = t * b.fly.w + i; x = b.fly.c[0] + Math.cos(a) * b.fly.r; z = C.z + b.fly.c[2] + Math.sin(a) * b.fly.r; y = b.fly.c[1]; yaw = -a - Math.PI / 2; b.obj.rotation.z = 0.15; }
        else if (b.to) { const u = clamp01((t - b.at) / 7); x = lerp(b.pos[0], b.to[0], u); z = C.z + lerp(b.pos[1], b.to[1], u); yaw = Math.atan2(-(b.to[1] - b.pos[1]), b.to[0] - b.pos[0]); }
        else { x = C.x + b.pos[0]; z = C.z + b.pos[1]; yaw = Math.atan2(-(this.eye.z - z), this.eye.x - x) + Math.sin(t * 0.5 + i) * 0.8; }
        b.obj.position.set(x, y || LP.heightAt(x, z), z); b.obj.rotation.y = yaw;
        b.anim(t, b.mode);
        if (b.lab) b.lab.position.set(x, (y || 0) + (b.fly ? -1.2 : b.params.size * (b.params.legLen + 0.45) + 0.4), z);
      });
      this.flockEvo.forEach((b, i) => {
        const vis = t > 42 && t < 48.2; b.obj.visible = vis; if (!vis) return;
        const k = t - 42; const x = -30 + k * 9 + (i % 3) * 1.5, y = 9 + i * 0.6 + Math.sin(k + i) * 0.4, z = -6 - i * 1.8;
        b.obj.position.set(x, y, z); b.obj.rotation.y = 0; b.anim(t, 'fly');
      });
      // S5: el presente en Chile
      const pres = sm(47.8, 49.2, t);
      const fwd = this.v3.set(-Math.sin(this.rigYaw), 0, -Math.cos(this.rigYaw));
      const right = new T.Vector3(Math.cos(this.rigYaw), 0, -Math.sin(this.rigYaw));
      this.present.forEach((b, i) => {
        let vis = t > 47.8 && t < 60.5; let x = 0, y = 0, z = 0, yaw = b.yaw || 0, mode = b.mode, s = pres;
        if (b.pos) { x = b.pos[0]; z = b.pos[1]; y = b.y !== undefined ? b.y : LP.heightAt(x, z); if (b.wander) { x += Math.sin(t * 0.8 + i) * 0.6; z += Math.cos(t * 0.6 + i) * 0.5; yaw = t * 0.8 + i; mode = Math.sin(t * 1.3 + i) > 0 ? 'walk' : 'stand'; } else yaw += Math.sin(t * 0.3 + i) * 0.3; }
        if (b.circle) { const a = t * b.circle.w + b.circle.ph; x = b.circle.c[0] + Math.cos(a) * b.circle.r; z = b.circle.c[2] + Math.sin(a) * b.circle.r; y = b.circle.c[1]; yaw = -a - Math.PI / 2; b.obj.rotation.z = 0.2; }
        if (b.vflock !== undefined) {
          const k = t - 48; const row = Math.ceil(b.vflock / 2), side = b.vflock % 2 ? 1 : -1;
          x = -60 + k * 10 - row * 2.2; z = -35 + side * row * 2.2; y = 22 + row * 0.3; yaw = 0;
        }
        if (b.hoverCam) {
          vis = t > 48.8 && t < 53.6;
          const inn = sm(48.8, 49.8, t), out = sm(52.8, 53.6, t);
          const P = this.eye.clone().addScaledVector(fwd, 1.0).addScaledVector(right, 0.28 * Math.sin(t * 1.4) + (1 - inn) * 3).add(new T.Vector3(0, -0.12 + Math.sin(t * 2.3) * 0.06 + out * 3, 0));
          x = P.x; y = P.y; z = P.z; s = 1;
          yaw = Math.atan2(-(right.z), right.x) + 0.5 + Math.sin(t * 1.1) * 0.4; mode = 'hover';
        }
        if (b.heroe) {
          vis = t > 52.8 && t < 55.75; s = 1;
          const end = this.eye.clone().addScaledVector(fwd, 0.05).add(new T.Vector3(0, -0.15, 0));
          const start = this.eye.clone().addScaledVector(fwd, 60).addScaledVector(right, -14).add(new T.Vector3(0, 16, 0));
          const u = clamp01((t - 52.8) / 2.75); const e = u * u * (1.6 - 0.6 * u);
          const P = start.clone().lerp(end, e); P.y += Math.sin(u * Math.PI) * 3;
          x = P.x; y = P.y; z = P.z; this.heroPos = P;
          const d = end.clone().sub(start); yaw = Math.atan2(-d.z, d.x); mode = u > 0.6 ? 'fly' : 'glide';
          b.obj.rotation.z = -0.12;
        }
        b.obj.visible = vis && s > 0.01; if (!b.obj.visible) return;
        b.obj.position.set(x, y, z); b.obj.rotation.y = yaw; b.obj.scale.setScalar(Math.max(0.001, s));
        b.anim(t, mode);
      });
      // etiquetas del presente
      const L = this.labels;
      const setL = (lab, a, pos) => { lab.material.opacity = a; lab.visible = a > 0.01; if (pos) lab.position.copy(pos); };
      const fl = this.present[0].obj.position, pg = this.present[5].obj.position, cn = this.present[12].obj.position, chn = this.present[9].obj.position;
      setL(L.flamenco, win(t, 49.5, 54.5, 0.5), this.v2.copy(fl).setY(fl.y + 3.4));
      setL(L.pinguino, win(t, 50, 54.6, 0.5), this.v2.copy(pg).setY(pg.y + 1.9));
      setL(L.condor, win(t, 50.5, 54.6, 0.5), this.v2.copy(cn).setY(cn.y - 2.2));
      setL(L.chincol, win(t, 49.2, 53.5, 0.5), this.v2.copy(chn).setY(chn.y + 0.9)); L.chincol.scale.set(1.2, 0.3, 1);
      const pc = this.pica.obj.position; setL(L.picaflor, win(t, 49.6, 52.8, 0.4), this.v2.copy(pc).setY(pc.y + 0.22)); L.picaflor.scale.set(0.5, 0.125, 1);
      [L.flamenco, L.pinguino].forEach(l => l.scale.set(2.4, 0.6, 1)); L.condor.scale.set(5, 1.25, 1);
      // etiquetas del Cretácico
      const tpos = this.sauros[0].obj.position; setL(L.tita, win(t, 1.2, 5.6, 0.5), this.v2.copy(tpos).setY(tpos.y + 14)); L.tita.scale.set(9, 2.25, 1);
      const rpos = this.trex.obj.position; setL(L.trex, win(t, 6, 10.2, 0.5), this.v2.copy(rpos).setY(rpos.y + 7)); L.trex.scale.set(3.2, 0.8, 1);
      const apos = this.surv[0].el.object3D.position; setL(L.avianos, win(t, 5.2, 9.8, 0.5), this.v2.copy(apos).setY(apos.y + 1.1)); L.avianos.scale.set(1.6, 0.4, 1);
      // etiqueta del superviviente elegido en el presente
      if (this.choice >= 0) {
        const cp = this.surv[this.choice].el.object3D.position; const d = DESTINO[this.choice];
        if (L.tuyo._txt !== d.nombre) { this.root.remove(L.tuyo); L.tuyo = LP.label('Tu superviviente hoy', d.nombre); L.tuyo._txt = d.nombre; this.root.add(L.tuyo); }
        const hgt = this.surv[this.choice].params.size * 0.9 + 0.5 + cp.y;
        setL(L.tuyo, win(t, 48.7, 52.6, 0.5), this.v2.copy(cp).setY(hgt)); L.tuyo.scale.set(2.6, 0.65, 1);
      } else setL(L.tuyo, 0);
    },

    // ======================= EFECTOS =======================
    updateFX: function (t, dt) {
      // asteroide
      const av = t > 10.2 && t < 15.02; this.ast.visible = this.trailG.visible = av;
      if (av) {
        const A0 = this.v2.set(230, 150, -210); const u = Math.pow(clamp01((t - 10.2) / 4.8), 1.6);
        this.ast.position.copy(A0).lerp(IMPACT, u);
        this.ast.rotation.x += 0.02; this.ast.rotation.y += 0.03;
        this.trailG.position.copy(this.ast.position); this.trailG.lookAt(IMPACT);
        const g = 0.6 + u * 1.6; this.astGlow.scale.set(60 * g, 60 * g, 1);
        this.trail.scale.set(1 + u, 1 + u, 1 + u * 1.5);
      }
      // bola de fuego y hongo
      const fv = t > 14.98 && t < 24; this.fire.visible = fv;
      if (fv) {
        const b = sm(14.98, 16.2, t); const fadeBall = 1 - sm(16.5, 19, t);
        this.ball.scale.setScalar(Math.max(0.01, b * 42 * (0.4 + fadeBall * 0.6))); this.ball.visible = fadeBall > 0.01;
        this.fireMat.color.set('#ffd070').lerp(new T.Color('#ff5a14'), sm(15.05, 16.2, t));
        const h = sm(15.4, 21, t) * 140; this.stem.scale.set(16 + h * 0.05, Math.max(0.1, h), 16 + h * 0.05);
        this.cap.position.y = h; const cs = sm(15.6, 21, t); this.cap.scale.set(10 + cs * 55, 8 + cs * 26, 10 + cs * 55);
        this.stemMat.color.set('#ff8a3a').lerp(new T.Color('#3a2418'), sm(16, 21, t));
        const gl = win(t, 14.98, 18, 0.15); this.fireGlow.material.opacity = gl; this.fireGlow.scale.setScalar(160 + b * 200); this.fireGlow.position.y = 20;
      }
      // onda expansiva
      const rv = t > 15.1 && t < 19.3; this.ring.visible = rv;
      if (rv) { const u = (t - 15.1) / 4.1; const r = u * 150; this.ring.scale.set(r, 1, r); this.ring.material.opacity = 0.9 * (1 - u * 0.6); }
      // muro de polvo
      const dv = t > 15.5 && t < 23; this.dust.visible = dv;
      if (dv) { const r = Math.pow(sm(15.5, 22, t), 1.25) * 170 + 1; this.dust.scale.set(r, r * 0.55, r); this.dust.rotation.y += dt * 0.05; this.dustMat.opacity = 0.92 * (1 - sm(21.5, 23, t)); }
      // eyecciones
      this.ejecta.forEach(e => {
        const u = (t - e.ts) / e.dur; const fly = u > 0 && u < 1; e.m.visible = e.tr.visible = fly;
        if (fly) {
          const start = this.v2.copy(IMPACT).setY(40);
          const P = this.v3.copy(start).lerp(e.land, u); P.y += Math.sin(u * Math.PI) * e.peak;
          const prev = new T.Vector3().copy(start).lerp(e.land, Math.max(0, u - 0.02)); prev.y += Math.sin(Math.max(0, u - 0.02) * Math.PI) * e.peak;
          e.m.position.copy(P); e.tr.position.copy(P); e.tr.lookAt(prev.sub(P).multiplyScalar(-1).add(P));
        }
        const fa = t > e.ts + e.dur && t < 24.5; e.fl.visible = fa;
        if (fa) { const k = 1 - sm(22, 24.5, t); e.fl.scale.set(1.2 * k, (2 + Math.sin(t * 17 + e.ts * 9) * 0.6) * k, 1.2 * k); }
      });
      // partículas alrededor del espectador
      const eye = this.eye;
      const aA = ENV.ashFall(t); this.ashPts.material.opacity = aA * 0.85; this.ashPts.visible = aA > 0.01;
      if (this.ashPts.visible) this.movePts(this.ashPts, dt, -0.6, 0.25, eye);
      const eA = ENV.embers(t); this.emberPts.material.opacity = eA; this.emberPts.visible = eA > 0.01;
      if (this.emberPts.visible) this.movePts(this.emberPts, dt, 1.4, 0.8, eye);
    },
    movePts: function (pts, dt, vy, drift, center) {
      pts.position.copy(center);
      const a = pts.geometry.attributes.position.array; const tt = this.T;
      for (let i = 0; i < a.length; i += 3) {
        a[i] += Math.sin(tt * 0.7 + i) * drift * dt; a[i + 1] += vy * dt * (0.6 + (i % 7) * 0.08); a[i + 2] += Math.cos(tt * 0.5 + i) * drift * dt;
        if (a[i + 1] < -7) a[i + 1] += 14; if (a[i + 1] > 7) a[i + 1] -= 14;
      }
      pts.geometry.attributes.position.needsUpdate = true;
    },

    // ======================= TEXTO EN PANTALLA =======================
    updateHUD: function (t) {
      const r2 = x => Math.round(x * 50) / 50;
      const s = {};
      // ubicación
      if (t < 6) s.top = { text: 'Período Cretácico · hace 66 millones de años', a: r2(win(t, 0.3, 5.6, 0.6)) };
      else if (t > 13 && t < 19) s.top = { text: 'Península de Yucatán · impacto de Chicxulub', a: r2(win(t, 13.4, 18.6, 0.5)) };
      else if (t > 22.5 && t < 27) s.top = { text: 'Extinción masiva · K-Pg', a: r2(win(t, 22.8, 26.8, 0.6)) };
      else if (t > 48 && t < 53) s.top = { text: 'Hoy · Chile', a: r2(win(t, 48.3, 52.6, 0.5)) };
      // contador de tiempo profundo
      if (t > 34 && t < 49) {
        const u = clamp01((t - 34.3) / 13.4); const ma = Math.round(66 * Math.pow(1 - sm(0, 1, u), 1.15));
        const ep = ma > 56 ? 'Paleoceno' : ma > 34 ? 'Eoceno' : ma > 23 ? 'Oligoceno' : ma > 5 ? 'Mioceno' : ma > 0 ? 'Plioceno · Pleistoceno' : 'Holoceno';
        s.date = { big: ma > 0 ? '− ' + ma + ' M años' : 'HOY', small: ep, a: r2(win(t, 34.3, 48.8, 0.5)) };
      }
      // interacción
      if (t > 24.2 && t < 33.4 && this.choice < 0) {
        s.prompt = { text: 'Elige a un superviviente', small: this.el.is('vr-mode') ? 'Míralo fijamente o apúntalo con el control' : 'Tócalo, haz clic o míralo fijamente', a: r2(sm(24.2, 24.8, t) * (0.75 + 0.25 * Math.sin(t * 4))) };
      } else if (this.choice >= 0 && t - this.choiceT < 2.6 && t < 36) {
        s.prompt = { text: this.autoChoice ? 'El linaje continúa…' : 'Tu superviviente seguirá su linaje', a: r2(win(t, this.choiceT, this.choiceT + 2.6, 0.3)) };
      }
      // subtítulos
      for (const l of LINEAS) if (l[2] && t >= l[0] - 0.2 && t <= l[1] + 0.3) { s.sub = { text: l[2], a: r2(win(t, l[0] - 0.2, l[1] + 0.3, 0.25)) }; break; }
      // cierre
      if (t > 55.6) {
        const f = (a, b) => r2(sm(a, a + 0.6, t));
        s.center = [
          { text: '66 millones de años después,', y: 150, font: '300 32px Montserrat, Arial, sans-serif', color: '#f3e6d2', a: f(55.8) },
          { text: 'los dinosaurios siguen entre nosotros.', y: 192, font: '300 32px Montserrat, Arial, sans-serif', color: '#f3e6d2', a: f(56.3) },
          { text: 'Las aves son sus descendientes.', y: 240, font: '500 32px Montserrat, Arial, sans-serif', color: '#ffffff', a: f(56.9) },
          { text: 'Son los últimos dinosaurios.', y: 290, font: '700 36px Montserrat, Arial, sans-serif', color: '#ffd98a', a: f(57.4) },
          { text: '66 MILLONES DE AÑOS', y: 372, font: '700 46px Cinzel, Georgia, serif', color: '#ffffff', a: f(58.0), sp: 4 },
          { text: 'EL ÚLTIMO VUELO', y: 422, font: '500 30px Cinzel, Georgia, serif', color: '#ffd98a', a: f(58.3), sp: 8 }
        ];
        if (this.ended) s.center.push({ text: 'Aves, los últimos dinosaurios · Chile Re-Descubre', y: 478, font: '400 18px Montserrat, Arial, sans-serif', color: '#bfb2a0', a: 1, sp: 2 });
      }
      this.hud.set(s);
      // fundidos
      let fc = '#000000', fa = 0;
      const flash = sm(14.95, 15.05, t) * (1 - sm(15.1, 15.7, t)); if (flash > 0) { fc = '#fff6e6'; fa = flash; }
      const dust = win(t, 20.6, 23.6, 1.2) * 0.75; if (dust > fa) { fc = '#3a2a20'; fa = dust; }
      const jump = win(t, 47.6, 48.6, 0.5) * 0.55; if (jump > fa) { fc = '#fffaf0'; fa = jump; }
      const fin = sm(55.25, 55.75, t) * (1 - sm(55.75, 56.1, t) * 0.12); if (fin > fa) { fc = '#07090d'; fa = fin; }
      this.hud.setFade(fc, fa);
      // escala del HUD según el ancho de pantalla
      const cam = this.cam.getObject3D('camera');
      if (cam) { const vis = 2 * 1.2 * Math.tan(cam.fov * Math.PI / 360) * cam.aspect; this.hud.plane.scale.setScalar(Math.min(1, vis * 0.97 / 1.8)); }
    },

    // ======================= AUDIO CONTINUO =======================
    updateAudio: function (t, dt) {
      const S = Sonido;
      S.setLayer('selva', win(t, 0, 13, 1.2) * 0.35);
      S.setLayer('viento', 0.12 + win(t, 15.5, 22.5, 1.5) * 0.5 + win(t, 22, 34, 1) * 0.12);
      S.setLayer('fuego', win(t, 16, 24, 1.5) * 0.55);
      S.setLayer('ceniza', win(t, 21, 37, 1.5) * 0.25);
      S.setLayer('dron', win(t, 22.5, 36, 2) * 0.12);
      const rv = t > 10 && t < 22 ? (t < 15 ? sm(10, 14.95, t) : 0.7 * (1 - sm(15, 22, t))) : 0;
      S.setRumble(rv * 0.9, t < 15 ? lerp(70, 900, sm(10, 15, t)) : 140, this.ast.visible ? this.ast.position : IMPACT);
      // oyente = cabeza del espectador
      const co = this.cam.object3D; co.getWorldPosition(this.v1); co.getWorldQuaternion(this.q);
      const fwd = new T.Vector3(0, 0, -1).applyQuaternion(this.q), up = new T.Vector3(0, 1, 0).applyQuaternion(this.q);
      S.setListener(this.v1, fwd, up);
      // trinos y crepitar aleatorios
      const rate = t < 10 ? 0.6 : t > 24 && t < 33.4 ? 0.7 : t > 36 ? lerp(0.4, 3.0, clamp01((t - 36) / 18)) : 0;
      if (Math.random() < rate * dt) {
        if (t > 24 && t < 34) { const b = this.surv[Math.floor(Math.random() * 3)].el.object3D.position; S.trino(this.v2.copy(b).setY(0.3), 3000 + Math.random() * 1500, 2 + Math.floor(Math.random() * 3), 0.22); }
        else { const a = Math.random() * Math.PI * 2; S.trino(this.v2.set(this.eye.x + Math.cos(a) * 12, 3 + Math.random() * 6, this.eye.z + Math.sin(a) * 12), 2400 + Math.random() * 3000, 2 + Math.floor(Math.random() * 4), 0.12); }
      }
      if (t > 16 && t < 24 && Math.random() < 14 * dt) { const a = Math.random() * Math.PI * 2; S.chasquido(this.v2.set(this.eye.x + Math.cos(a) * 6, 0.5, this.eye.z + Math.sin(a) * 6)); }
    }
  });

  // ---------- interfaz HTML ----------
  window.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    const btn = document.getElementById('btn-comenzar');
    const params = new URLSearchParams(location.search);
    const t0 = parseFloat(params.get('t') || '0') || 0;
    const ready = () => {
      btn.disabled = false; btn.textContent = 'Comenzar el viaje';
      const comp = scene.components['ultimo-vuelo'];
      if (t0) comp.seek(t0);
      if (params.get('auto')) { document.getElementById('inicio').classList.add('oculto'); comp.start(t0); }
    };
    if (scene.hasLoaded) ready(); else scene.addEventListener('loaded', ready);
    btn.addEventListener('click', () => {
      document.getElementById('inicio').classList.add('oculto');
      const comp = scene.components['ultimo-vuelo'];
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().catch(() => {});
      comp.start(t0);
    });
    document.getElementById('btn-repetir').addEventListener('click', () => scene.components['ultimo-vuelo'].restart());
    ['triggerdown'].forEach(evn => scene.addEventListener(evn, () => { const c = scene.components['ultimo-vuelo']; if (c.ended) c.restart(); }));
  });
})();
