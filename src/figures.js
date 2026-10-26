// Animated exercise figures: a side-view body driven by joint angles, interpolated between two key poses.
// Angles in degrees. Arms/legs in "hip" mode: 0 = straight down, +90 = pointing forward (right), 180 = up.
// "foot" mode keeps the feet planted: knee = forward lean of the shin, thigh = how far the hip sits back.
const FIG = (() => {
  const L = { thigh: 40, shin: 38, torso: 46, upper: 27, fore: 25, neck: 11, head: 8.5, foot: 13 };
  const G = 158; // ground line
  const rad = d => d * Math.PI / 180;
  const add = (p, len, ang) => [p[0] + len * Math.sin(rad(ang)), p[1] + len * Math.cos(rad(ang))];   // ang from straight down, + forward
  const up = (p, len, ang) => [p[0] + len * Math.sin(rad(ang)), p[1] - len * Math.cos(rad(ang))];    // ang from straight up, + forward

  function solve(P) {
    const J = {};
    if (P.mode === "foot") {
      J.an = [P.x, G - 3]; J.toe = [P.x + L.foot, G - 2];
      J.kn = up(J.an, L.shin, P.knee || 0);
      J.hip = up(J.kn, L.thigh, -(P.hipBack || 0));
      J.kn2 = [J.kn[0] - 3, J.kn[1]]; J.an2 = [J.an[0] - 3, J.an[1]]; J.toe2 = [J.toe[0] - 3, J.toe[1]];
    } else {
      J.hip = [P.x, P.y];
      J.kn = add(J.hip, L.thigh, P.th ?? 0); J.an = add(J.kn, L.shin, P.sh ?? 0);
      J.kn2 = add(J.hip, L.thigh, P.th2 ?? P.th ?? 0); J.an2 = add(J.kn2, L.shin, P.sh2 ?? P.sh ?? 0);
      const fa = P.footAng ?? 90, fa2 = P.footAng2 ?? P.footAng ?? 90;
      J.toe = add(J.an, L.foot, fa); J.toe2 = add(J.an2, L.foot, fa2);
    }
    const t = P.torso || 0;
    J.sh = up(J.hip, L.torso, t);
    J.neck = up(J.sh, 4, t);
    J.head = up(J.sh, L.neck + L.head - 2, t + (P.headTilt || 0));
    J.el = add(J.sh, L.upper, P.a ?? 0); J.ha = add(J.el, L.fore, P.b ?? P.a ?? 0);
    J.el2 = add(J.sh, L.upper, P.a2 ?? P.a ?? 0); J.ha2 = add(J.el2, L.fore, P.b2 ?? P.b ?? P.a2 ?? P.a ?? 0);
    J.foreAng = P.b ?? P.a ?? 0; J.foreAng2 = P.b2 ?? P.b ?? P.a2 ?? P.a ?? 0;
    return J;
  }
  const lerp = (a, b, k) => a + (b - a) * k;
  function mix(A, B, k) {
    const o = { mode: A.mode };
    for (const key of new Set([...Object.keys(A), ...Object.keys(B)])) {
      if (key === "mode") continue;
      const va = A[key] ?? B[key], vb = B[key] ?? A[key];
      o[key] = typeof va === "number" ? lerp(va, vb, k) : (k < .5 ? va : vb);
    }
    return o;
  }
  const seg = (p, q, cls, w) => `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${q[0].toFixed(1)}" y2="${q[1].toFixed(1)}" class="${cls}" stroke-width="${w}"/>`;
  function kb(p, dirAng = 0, scale = 1) {
    // handle at the hand, bell continues along the forearm direction (or hangs)
    const c = add(p, 11 * scale, dirAng);
    return `<g class="eq"><circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(8.5 * scale).toFixed(1)}"/><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(4 * scale).toFixed(1)}" class="eq-h"/></g>`;
  }
  function db(p) { return `<g class="eq"><rect x="${(p[0] - 9).toFixed(1)}" y="${(p[1] - 3).toFixed(1)}" width="18" height="6" rx="2"/><rect x="${(p[0] - 11).toFixed(1)}" y="${(p[1] - 6).toFixed(1)}" width="6" height="12" rx="2"/><rect x="${(p[0] + 5).toFixed(1)}" y="${(p[1] - 6).toFixed(1)}" width="6" height="12" rx="2"/></g>`; }
  function draw(def, P) {
    const J = solve(P);
    const eq = def.equip || [];
    let back = "", front = "";
    // static props behind the body
    for (const e of eq) {
      if (e === "bench") back += `<g class="prop"><rect x="44" y="${(P.y + 5).toFixed(1)}" width="104" height="9" rx="3"/><rect x="58" y="${(P.y + 14).toFixed(1)}" width="7" height="${(G - P.y - 14).toFixed(1)}"/><rect x="128" y="${(P.y + 14).toFixed(1)}" width="7" height="${(G - P.y - 14).toFixed(1)}"/></g>`;
      if (e === "seat") back += `<g class="prop"><rect x="${(P.x - 22).toFixed(1)}" y="${(P.y + 6).toFixed(1)}" width="40" height="8" rx="3"/><rect x="${(P.x - 6).toFixed(1)}" y="${(P.y + 14).toFixed(1)}" width="7" height="${(G - P.y - 14).toFixed(1)}"/></g>`;
      if (e === "rowbench") back += `<g class="prop"><rect x="${(J.ha2[0] - 30).toFixed(1)}" y="${(J.ha2[1] + 2).toFixed(1)}" width="62" height="8" rx="3"/><rect x="${(J.ha2[0] - 4).toFixed(1)}" y="${(J.ha2[1] + 10).toFixed(1)}" width="7" height="${(G - J.ha2[1] - 10).toFixed(1)}"/></g>`;
      if (e === "tower") back += `<g class="prop"><rect x="${def.tower[0]}" y="10" width="8" height="${G - 10}" rx="2"/></g>`;
      if (e === "pad") back += `<g class="prop"><rect x="${(J.kn[0] - 8).toFixed(1)}" y="${(J.kn[1] - 12).toFixed(1)}" width="16" height="7" rx="3"/></g>`;
      if (e === "mat") back += `<g class="prop"><rect x="20" y="${G - 4}" width="180" height="4" rx="2"/></g>`;
    }
    // far limbs (dimmer), torso, near limbs
    let body = "";
    body += seg(J.hip, J.kn2, "far", 9) + seg(J.kn2, J.an2, "far", 8) + seg(J.an2, J.toe2, "far", 6);
    body += seg(J.sh, J.el2, "far", 7.5) + seg(J.el2, J.ha2, "far", 6.5);
    body += seg(J.hip, J.sh, "body", 15);
    body += `<circle cx="${J.head[0].toFixed(1)}" cy="${J.head[1].toFixed(1)}" r="${L.head}" class="headc"/>`;
    body += seg(J.hip, J.kn, "near", 10) + seg(J.kn, J.an, "near", 9) + seg(J.an, J.toe, "near", 6.5);
    let eqFar = "", eqNear = "";
    for (const e of eq) {
      if (e === "kb") eqNear += kb(J.ha, P.kbAng ?? 0);
      if (e === "kb2") eqFar += kb(J.ha2, P.kbAng ?? 0, .95);
      if (e === "kbFwd") eqNear += kb(J.ha, J.foreAng);
      if (e === "kbRack") eqNear += kb(J.ha, (P.kbAng ?? 200));
      if (e === "goblet") eqNear += `<g class="eq"><circle cx="${(J.ha[0] + 4).toFixed(1)}" cy="${(J.ha[1] + 9).toFixed(1)}" r="9"/></g>`;
      if (e === "db") eqNear += db(J.ha);
      if (e === "db2") eqFar += db(J.ha2);
      if (e === "trap") { const y = J.ha[1]; eqNear += `<g class="eq"><rect x="${(J.ha[0] - 30).toFixed(1)}" y="${(y - 2).toFixed(1)}" width="60" height="4" rx="2"/><circle cx="${(J.ha[0] - 22).toFixed(1)}" cy="${y.toFixed(1)}" r="16" class="plate"/><circle cx="${(J.ha[0] + 22).toFixed(1)}" cy="${y.toFixed(1)}" r="16" class="plate"/></g>`; }
      if (e === "cable") { const a = def.anchor; front += `<line x1="${a[0]}" y1="${a[1]}" x2="${J.ha[0].toFixed(1)}" y2="${J.ha[1].toFixed(1)}" class="cable"/><circle cx="${a[0]}" cy="${a[1]}" r="4" class="pulley"/>`; eqNear += `<rect x="${(J.ha[0] - 4).toFixed(1)}" y="${(J.ha[1] - 4).toFixed(1)}" width="8" height="8" rx="2" class="eq"/>`; }
      if (e === "latbar") { const a = def.anchor; front += `<line x1="${a[0]}" y1="${a[1]}" x2="${J.ha[0].toFixed(1)}" y2="${(J.ha[1] - 2).toFixed(1)}" class="cable"/><circle cx="${a[0]}" cy="${a[1]}" r="4" class="pulley"/>`; eqNear += `<rect x="${(J.ha[0] - 22).toFixed(1)}" y="${(J.ha[1] - 2.5).toFixed(1)}" width="44" height="5" rx="2.5" class="eq"/>`; }
    }
    const arms = seg(J.sh, J.el, "near", 8.5) + seg(J.el, J.ha, "near", 7.5);
    return `<line x1="8" y1="${G}" x2="212" y2="${G}" class="ground"/>${back}${front}${eqFar}${body}${arms}${eqNear}`;
  }

  // ---- the moves ----
  const stand = { mode: "foot", x: 108, knee: 0, hipBack: 0, torso: 0, a: 0, b: 0 };
  const walkA = { mode: "hip", x: 108, y: 79, th: 18, sh: 8, th2: -16, sh2: -2, torso: 0, a: 4, b: 4, a2: 4, b2: 4, footAng: 85, footAng2: 95 };
  const walkB = { mode: "hip", x: 108, y: 79, th: -16, sh: -2, th2: 18, sh2: 8, torso: 0, a: 4, b: 4, a2: 4, b2: 4, footAng: 95, footAng2: 85 };
  const D = {
    swing: { label: "Kettlebell Swing", equip: ["kbFwd"], frames: [
      { ...stand, x: 96, knee: 14, hipBack: 30, torso: 72, a: -28, b: -34, headTilt: -25 },
      { ...stand, x: 96, torso: -4, a: 92, b: 92 }] },
    kbdl: { label: "Kettlebell Deadlift", equip: ["kb"], frames: [
      { ...stand, x: 100, knee: 22, hipBack: 48, torso: 58, a: 0, b: 0, headTilt: -20 },
      { ...stand, x: 100 }] },
    goblet: { label: "Goblet Squat", equip: ["goblet"], frames: [
      { ...stand, x: 104, a: 22, b: 168 },
      { ...stand, x: 104, knee: 38, hipBack: 92, torso: 34, a: 40, b: 186, headTilt: -24 }] },
    rdl: { label: "Romanian Deadlift", equip: ["kb"], frames: [
      { ...stand, x: 100 },
      { ...stand, x: 100, knee: 10, hipBack: 26, torso: 74, a: 0, b: 0, headTilt: -24 }] },
    bench: { label: "Kurzhantel-Bankdrücken", equip: ["bench", "db"], frames: [
      { mode: "hip", x: 72, y: 104, th: -72, sh: -8, torso: 90, a: 30, b: 176, footAng: 90 },
      { mode: "hip", x: 72, y: 104, th: -72, sh: -8, torso: 90, a: 180, b: 180, footAng: 90 }] },
    row: { label: "Einarmiges Rudern", equip: ["rowbench", "kb"], frames: [
      { ...stand, x: 88, knee: 14, hipBack: 30, torso: 72, a: 0, b: 0, a2: 48, b2: 40, headTilt: -20 },
      { ...stand, x: 88, knee: 14, hipBack: 30, torso: 72, a: -72, b: 0, a2: 48, b2: 40, headTilt: -20 }] },
    farmer: { label: "Farmer's Carry", equip: ["kb", "kb2"], walk: true, frames: [walkA, walkB] },
    suitcase: { label: "Suitcase Carry", equip: ["kb"], walk: true, frames: [walkA, walkB] },
    lunge: { label: "Reverse Lunge", equip: ["db"], frames: [
      { mode: "hip", x: 104, y: 79, th: 0, sh: 0, th2: 0, sh2: 0, torso: 0, a: 0, b: 0, footAng: 90, footAng2: 90 },
      { mode: "hip", x: 104, y: 118, th: 82, sh: -4, th2: -22, sh2: -82, torso: 6, a: 0, b: 0, footAng: 90, footAng2: 180 }] },
    hkpress: { label: "Halb kniende Overhead Press", equip: ["kbRack"], frames: [
      { mode: "hip", x: 100, y: 116, th: 0, sh: -90, th2: 88, sh2: 0, footAng: 180, footAng2: 90, torso: 0, a: 6, b: 148, kbAng: 262 },
      { mode: "hip", x: 100, y: 116, th: 0, sh: -90, th2: 88, sh2: 0, footAng: 180, footAng2: 90, torso: 0, a: 178, b: 180, kbAng: 262 }] },
    latpull: { label: "Latzug", equip: ["seat", "pad", "latbar"], anchor: [118, 8], frames: [
      { mode: "hip", x: 100, y: 108, th: 88, sh: 4, torso: -8, a: 168, b: 172, footAng: 90 },
      { mode: "hip", x: 100, y: 108, th: 88, sh: 4, torso: -14, a: 22, b: 168, footAng: 90 }] },
    pallof: { label: "Pallof Press", equip: ["tower", "cable"], tower: 18, anchor: [22, 64], frames: [
      { mode: "hip", x: 112, y: 80, th: 6, sh: 0, th2: -6, sh2: 0, torso: 0, a: 28, b: 128, footAng: 90 },
      { mode: "hip", x: 112, y: 80, th: 6, sh: 0, th2: -6, sh2: 0, torso: 0, a: 90, b: 90, footAng: 90 }] },
    clean: { label: "Kettlebell Clean", equip: ["kbRack"], frames: [
      { ...stand, x: 98, knee: 18, hipBack: 40, torso: 56, a: -8, b: -8, kbAng: 0, headTilt: -20 },
      { ...stand, x: 98, a: 6, b: 148, kbAng: 262 }] },
    trapbar: { label: "Trap-Bar Deadlift", equip: ["trap"], frames: [
      { ...stand, x: 104, knee: 30, hipBack: 62, torso: 44, a: 0, b: 0, headTilt: -16 },
      { ...stand, x: 104 }] },
    pushup: { label: "Liegestütze", equip: ["mat"], frames: [
      { mode: "hip", x: 98, y: 106, th: -78, sh: -78, torso: 78, a: 4, b: 2, footAng: 0 },
      { mode: "hip", x: 98, y: 132, th: -84, sh: -84, torso: 86, a: -64, b: 26, footAng: 0 }] },
    cablerow: { label: "Sitzendes Kabelrudern", equip: ["cable"], anchor: [200, 132], frames: [
      { mode: "hip", x: 78, y: 140, th: 84, sh: 62, torso: 16, a: 82, b: 86, footAng: 170 },
      { mode: "hip", x: 78, y: 140, th: 84, sh: 62, torso: -4, a: -32, b: 82, footAng: 170 }] },
  };
  return { D, draw, mix };
})();
