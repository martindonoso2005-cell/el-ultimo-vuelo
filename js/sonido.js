/*
 * sonido.js — Audio procedural espacial (Web Audio API, sin archivos).
 * Capas ambientales continuas + efectos puntuales posicionados en 3D (HRTF)
 * + música generada (evolución y final épico).
 */
window.Sonido = (function () {
  'use strict';
  let ctx = null, master, sfx, music, amb, rev, noiseBuf;
  const layers = {};
  let rumble = null;

  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.3;
    master.connect(comp); comp.connect(ctx.destination);
    rev = ctx.createConvolver(); rev.buffer = impulse(3.4, 2.6);
    const revG = ctx.createGain(); revG.gain.value = 0.4; rev.connect(revG); revG.connect(master);
    noiseBuf = makeNoise(4);
    sfx = bus(1.0, 0.25); music = bus(0.5, 0.45); amb = bus(0.8, 0.15);
    buildLayers();
  }
  function bus(g, send) {
    const n = ctx.createGain(); n.gain.value = g; n.connect(master);
    const s = ctx.createGain(); s.gain.value = send; n.connect(s); s.connect(rev); return n;
  }
  function impulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec); const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function makeNoise(sec) {
    const len = Math.floor(ctx.sampleRate * sec); const b = ctx.createBuffer(1, len, ctx.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function noise() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; }
  function filt(type, f, q) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; }
  function gain(v) { const g = ctx.createGain(); g.gain.value = v; return g; }
  function setPos(p, v) {
    if (p.positionX) { p.positionX.value = v.x; p.positionY.value = v.y; p.positionZ.value = v.z; } else p.setPosition(v.x, v.y, v.z);
  }
  function panner(pos, dest, ref) {
    const p = ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse';
    p.refDistance = ref || 4; p.maxDistance = 3000; p.rolloffFactor = 0.6;
    setPos(p, pos); p.connect(dest || sfx); return p;
  }
  function env(g, t0, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  function buildLayers() {
    // selva: insectos pulsantes
    { const n = noise(), hp = filt('highpass', 5200), am = gain(0), lfo = ctx.createOscillator(), lg = gain(0.5), out = gain(0);
      lfo.frequency.value = 19; lfo.type = 'square'; lfo.connect(lg); lg.connect(am.gain); am.gain.value = 0.5;
      n.connect(hp); hp.connect(am); am.connect(out); out.connect(amb); n.start(); lfo.start(); layers.selva = out; }
    // viento
    { const n = noise(), bp = filt('bandpass', 450, 0.6), lfo = ctx.createOscillator(), lg = gain(220), out = gain(0);
      lfo.frequency.value = 0.13; lfo.connect(lg); lg.connect(bp.frequency); n.connect(bp); bp.connect(out); out.connect(amb); n.start(); lfo.start(); layers.viento = out; }
    // fuego
    { const n = noise(), lp = filt('lowpass', 700), out = gain(0); n.connect(lp); lp.connect(out); out.connect(amb); n.start(); layers.fuego = out; }
    // ceniza (siseo suave)
    { const n = noise(), bp = filt('bandpass', 6500, 1.5), out = gain(0); n.connect(bp); bp.connect(out); out.connect(amb); n.start(); layers.ceniza = out; }
    // dron grave (tensión / esperanza)
    { const out = gain(0); const lp = filt('lowpass', 400); lp.connect(out); out.connect(amb);
      [55, 82.4, 110.3].forEach(f => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(lp); o.start(); });
      layers.dron = out; }
    // estruendo del asteroide (fuente espacial que sigue al asteroide)
    { const n = noise(), lp = filt('lowpass', 120, 0.8), o = ctx.createOscillator(), og = gain(0.5), out = gain(0);
      o.type = 'sawtooth'; o.frequency.value = 36; const olp = filt('lowpass', 160);
      o.connect(olp); olp.connect(og); og.connect(out); n.connect(lp); lp.connect(out);
      const pan = panner({ x: 200, y: 150, z: -200 }, sfx, 60); out.connect(pan);
      n.start(); o.start(); rumble = { out, lp, o, pan }; }
  }

  function setLayer(name, v) { if (!ctx || !layers[name]) return; layers[name].gain.setTargetAtTime(v, ctx.currentTime, 0.12); }
  function setRumble(v, cutoff, pos) {
    if (!ctx) return;
    rumble.out.gain.setTargetAtTime(v, ctx.currentTime, 0.1);
    rumble.lp.frequency.setTargetAtTime(cutoff, ctx.currentTime, 0.1);
    rumble.o.frequency.setTargetAtTime(30 + cutoff * 0.03, ctx.currentTime, 0.1);
    if (pos) setPos(rumble.pan, pos);
  }
  function setListener(pos, fwd, up) {
    if (!ctx) return; const L = ctx.listener;
    if (L.positionX) {
      L.positionX.value = pos.x; L.positionY.value = pos.y; L.positionZ.value = pos.z;
      L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z;
      L.upX.value = up.x; L.upY.value = up.y; L.upZ.value = up.z;
    } else { L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z); }
  }

  // ---------- efectos puntuales ----------
  function rugido(pos, len) {
    if (!ctx) return; len = len || 2.2; const t0 = ctx.currentTime;
    const out = panner(pos, sfx, 8); const g = gain(0); g.connect(out);
    const lp = filt('lowpass', 400, 5); lp.frequency.setValueAtTime(350, t0); lp.frequency.linearRampToValueAtTime(1000, t0 + 0.5); lp.frequency.linearRampToValueAtTime(280, t0 + len); lp.connect(g);
    [52, 55.5, 104, 157].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = i === 3 ? 'square' : 'sawtooth';
      o.frequency.setValueAtTime(f * 1.35, t0); o.frequency.linearRampToValueAtTime(f, t0 + len);
      const v = ctx.createOscillator(), vg = gain(f * 0.05); v.frequency.value = 6 + i; v.connect(vg); vg.connect(o.frequency); v.start(t0); v.stop(t0 + len + 0.1);
      const og = gain(i === 3 ? 0.15 : 0.4); o.connect(og); og.connect(lp); o.start(t0); o.stop(t0 + len + 0.1);
    });
    const n = noise(), bp = filt('bandpass', 650, 1), ng = gain(0.7); n.connect(bp); bp.connect(ng); ng.connect(lp); n.start(t0); n.stop(t0 + len);
    env(g, t0, 0.3, 1.0, len);
  }
  function llamadaSaurop(pos) {
    if (!ctx) return; const t0 = ctx.currentTime, len = 2.6;
    const out = panner(pos, sfx, 15); const g = gain(0); g.connect(out); const lp = filt('lowpass', 420, 6); lp.connect(g);
    [62, 93].forEach(f => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t0); o.frequency.linearRampToValueAtTime(f * 0.82, t0 + len); o.connect(lp); o.start(t0); o.stop(t0 + len); });
    env(g, t0, 0.6, 0.45, len - 0.6);
  }
  function chillido(pos) {
    if (!ctx) return; const t0 = ctx.currentTime;
    const out = panner(pos, sfx, 10); const g = gain(0); g.connect(out); const bp = filt('bandpass', 1600, 3); bp.connect(g);
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(1500, t0); o.frequency.exponentialRampToValueAtTime(650, t0 + 0.45); o.connect(bp); o.start(t0); o.stop(t0 + 0.5);
    env(g, t0, 0.02, 0.25, 0.45);
  }
  function trino(pos, base, n, vol) {
    if (!ctx) return; base = base || 3200; n = n || 3; const t0 = ctx.currentTime;
    const out = panner(pos, sfx, 1.5);
    for (let k = 0; k < n; k++) {
      const t = t0 + k * (0.09 + Math.random() * 0.05); const o = ctx.createOscillator(); const g = gain(0);
      o.type = 'sine'; const b = base * (0.9 + Math.random() * 0.25);
      o.frequency.setValueAtTime(b, t); o.frequency.exponentialRampToValueAtTime(b * 1.45, t + 0.05); o.frequency.exponentialRampToValueAtTime(b * 0.95, t + 0.09);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.12); env(g, t, 0.01, vol || 0.25, 0.08);
    }
  }
  function impacto(pos, fuerza) {
    if (!ctx) return; const t0 = ctx.currentTime; fuerza = fuerza || 1;
    const out = panner(pos, sfx, 300); const direct = gain(0.6); direct.connect(sfx);
    // cuerpo grave
    const n = noise(), lp = filt('lowpass', 1400); lp.frequency.setValueAtTime(1400, t0); lp.frequency.exponentialRampToValueAtTime(60, t0 + 4);
    const g = gain(0); n.connect(lp); lp.connect(g); g.connect(out); g.connect(direct); n.start(t0); n.stop(t0 + 6); env(g, t0, 0.01, 1.4 * fuerza, 5);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(55, t0); o.frequency.exponentialRampToValueAtTime(22, t0 + 3); const og = gain(0);
    o.connect(og); og.connect(direct); og.connect(out); o.start(t0); o.stop(t0 + 5); env(og, t0, 0.02, 1.3 * fuerza, 4);
    // chasquido
    const c = noise(), hp = filt('highpass', 1500), cg = gain(0); c.connect(hp); hp.connect(cg); cg.connect(out); c.start(t0); c.stop(t0 + 0.6); env(cg, t0, 0.005, 0.9 * fuerza, 0.4);
  }
  function golpe(pos) {
    if (!ctx) return; const t0 = ctx.currentTime;
    const out = panner(pos, sfx, 6); const n = noise(), lp = filt('lowpass', 350), g = gain(0);
    n.connect(lp); lp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + 0.8); env(g, t0, 0.01, 0.8, 0.6);
  }
  function chasquido(pos) {
    if (!ctx) return; const t0 = ctx.currentTime;
    const out = panner(pos, sfx, 3); const n = noise(), hp = filt('highpass', 2600), g = gain(0);
    n.connect(hp); hp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + 0.08); env(g, t0, 0.002, 0.18 + Math.random() * 0.2, 0.04);
  }
  function rafaga(pos) {
    if (!ctx) return; const t0 = ctx.currentTime;
    const out = panner(pos, sfx, 2); const n = noise(), bp = filt('bandpass', 300, 1.2), g = gain(0);
    bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(2400, t0 + 1.4); bp.frequency.exponentialRampToValueAtTime(400, t0 + 2.2);
    n.connect(bp); bp.connect(g); g.connect(out); n.start(t0); n.stop(t0 + 2.4); env(g, t0, 1.2, 1.0, 1.1);
  }
  function campana(pos) { // "elección" del superviviente
    if (!ctx) return; const t0 = ctx.currentTime; const out = panner(pos, music, 2);
    [76, 83, 88].forEach((m, i) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(m); const g = gain(0); o.connect(g); g.connect(out); const t = t0 + i * 0.12; o.start(t); o.stop(t + 2.5); env(g, t, 0.01, 0.18, 2.2); });
  }

  // ---------- música ----------
  function pad(notes, t, dur, vol, cutoff, dest) {
    const lp = filt('lowpass', cutoff || 900, 0.7); const g = gain(0); lp.connect(g); g.connect(dest || music);
    notes.forEach(m => [-6, 6].forEach(det => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.6);
    }));
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.8, dur * 0.4)); g.gain.setValueAtTime(vol, t + dur - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.5);
    return lp;
  }
  function pluck(m, t, vol) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m); const g = gain(0); o.connect(g); g.connect(music); o.start(t); o.stop(t + 0.9); env(g, t, 0.005, vol || 0.12, 0.8);
  }
  function timbal(t, vol) {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.5); const g = gain(0);
    o.connect(g); g.connect(music); o.start(t); o.stop(t + 1.6); env(g, t, 0.005, vol || 0.8, 1.4);
    const n = noise(), lp = filt('lowpass', 900), ng = gain(0); n.connect(lp); lp.connect(ng); ng.connect(music); n.start(t); n.stop(t + 0.3); env(ng, t, 0.003, (vol || 0.8) * 0.4, 0.2);
  }
  function musicaEvolucion(offset) {
    if (!ctx) return; const t0 = ctx.currentTime - (offset || 0);
    const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67], [60, 64, 67, 71]]; // Am7 Fmaj7 G Cmaj7
    chords.forEach((c, i) => { const t = t0 + i * 3.5; if (t + 3.5 > ctx.currentTime) pad(c, Math.max(t, ctx.currentTime), 3.6, 0.05, 700 + i * 250); });
    const scale = [69, 72, 74, 76, 79, 81, 84, 86];
    let t = 0, step = 0.42, k = 0;
    while (t < 14) { const tt = t0 + t; if (tt >= ctx.currentTime) pluck(scale[(k * 3 + (k >> 2)) % scale.length], tt, 0.06 + t * 0.004); t += step; step = Math.max(0.13, step * 0.955); k++; }
  }
  function musicaEpica(offset) {
    if (!ctx) return; const t0 = ctx.currentTime - (offset || 0);
    const prog = [[50, 53, 57, 62], [46, 50, 53, 58], [53, 57, 60, 65], [48, 52, 55, 64], [50, 54, 57, 62, 66]]; // Dm Bb F C D
    prog.forEach((c, i) => {
      const t = t0 + i * 2; const dur = i === 4 ? 5.5 : 2.05;
      if (t + dur < ctx.currentTime) return;
      const lp = pad(c, Math.max(t, ctx.currentTime), dur, 0.07 + i * 0.012, 1200 + i * 300);
      pad([c[0] - 12], Math.max(t, ctx.currentTime), dur, 0.09, 300);
      void lp;
    });
    // melodía tipo metal
    const mel = [[69, 0, 1.9], [74, 2, 1.9], [72, 4, 1.9], [76, 6, 1.5], [78, 7.5, 4.5]];
    mel.forEach(([m, at, d]) => {
      const t = t0 + at; if (t < ctx.currentTime) return;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m);
      const v = ctx.createOscillator(), vg = gain(3); v.frequency.value = 5; v.connect(vg); vg.connect(o.detune); v.start(t); v.stop(t + d + 0.5);
      const lp = filt('lowpass', 1800, 1); const g = gain(0); o.connect(lp); lp.connect(g); g.connect(music); o.start(t); o.stop(t + d + 0.5);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.12); g.gain.setValueAtTime(0.09, t + d - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.4);
    });
    [0, 4, 6, 6.25, 6.5, 6.75, 7, 7.15, 7.3, 7.5].forEach((at, i) => { const t = t0 + at; if (t >= ctx.currentTime) timbal(t, i === 9 ? 1.2 : (i < 2 ? 0.7 : 0.35 + i * 0.05)); });
  }

  function stopAll() { if (ctx) { master.gain.setTargetAtTime(0, ctx.currentTime, 0.4); } }
  function resume() { if (ctx) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.05); } }

  return {
    init, setLayer, setRumble, setListener, rugido, llamadaSaurop, chillido, trino, impacto, golpe, chasquido, rafaga, campana,
    musicaEvolucion, musicaEpica, stopAll, resume,
    get ready() { return !!ctx; }
  };
})();
