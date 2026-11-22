// Two climbers, one hollow tower, two ways of seeing it (close and wide).
// The rules live in world.js. This file draws them.
import * as THREE from 'three';
import * as W from './world.js';

const $ = (id) => document.getElementById(id);
const { TAU, TOP, R_IN, WALL } = W;

// PLACEHOLDER COLOURS, taken from Yiran's two reference images
// (cream stone, cool violet shade, lavender-to-peach sky, red scarf and crescent).
// A creative decision: change freely.
const PAL = {
  skyTop: 0x8f9bd4,     // lavender blue overhead
  skyHorizon: 0xf8dcc4, // peach at the horizon
  haze: 0xe4cdc9,       // far air
  ground: 0xdccfc4,
  stone: [0xeadfc9, 0xe3d5bb, 0xf0e6d2, 0xddcdb2, 0xe7dac2],
  dome: 0xe6dac4,
  peg: 0xf2e9d6,
  bridge: 0xf3ead8,     // what two climbers make together
  red: 0xc8452c,        // scarf, hood, crescent
  cloth: 0xefe5d2,
  hair: 0x2a2320,
  skin: 0xc99a78,
  chalk: 0xffffff,      // the white dust of the vault
  grip: 0xffd000,       // the breath line beside each climber
  gripLow: 0xe2452c,
  shaft: 0xffe9c4,
  spire: 0xd9c7c0,
  cloud: 0xfff3ea,
  deep: 0x7078ad,       // the blue the tower falls into, far up and far down
};

// PLACEHOLDER WORDING. Also a creative decision.
const TEXT = {
  bridge: 'A broken bridge. If you both stand at its ends, it joins.',
  tiring: 'You are out of breath. Reach a landing.',
  slipped: 'You lost your footing and slid to the landing below.',
  alone: 'no partner yet · Tab plays both',
  together: 'partner is here',
  copied: 'Link copied',
};

// ---------- who am I, which tower ----------
const q = new URLSearchParams(location.search);
const myRoute = q.get('p') === '2' ? 1 : 0;
let room = (q.get('room') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
if (!room) {
  room = Math.random().toString(36).slice(2, 7);
  q.set('room', room); q.set('p', String(myRoute + 1));
  try { history.replaceState(null, '', `?${q}`); } catch { /* some hosts do not allow it */ }
}

// ---------- scene ----------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const haze = new THREE.Color(PAL.haze);
scene.background = haze.clone();
scene.fog = new THREE.Fog(haze.clone(), 30, 620);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 2400);

// Sky: one big shell, lavender overhead fading to peach at the horizon.
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(2000, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(PAL.skyTop) }, horizon: { value: new THREE.Color(PAL.skyHorizon) }, haze: { value: haze } },
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 d; uniform vec3 top; uniform vec3 horizon; uniform vec3 haze;
      void main(){ float h = d.y; vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.38)) : mix(horizon, haze, clamp(-h * 6.0, 0.0, 1.0));
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
      }`,
  }),
);
sky.userData.flat = true;
scene.add(sky);

// Warm low sun with soft shadows. The shade is filled with cool sky light.
scene.add(new THREE.HemisphereLight(0xd6daff, 0xe0c9b2, 1.3));
const sun = new THREE.DirectionalLight(0xffd2a4, 2.5);
sun.position.set(0, 20, 0).add(new THREE.Vector3(30, 40, 75).normalize().multiplyScalar(150));
sun.target.position.set(0, 20, 0); scene.add(sun.target);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(matchMedia('(pointer: coarse)').matches ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 20, far: 320 });
sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.2; sun.shadow.radius = 3;
scene.add(sun);

// Plaster: soft uneven staining and a few fine cracks, also used as a slight relief.
function plasterTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const r = W.rng(7);
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 110;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, r() < 0.6 ? 'rgba(150,115,85,0.028)' : 'rgba(110,110,150,0.02)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(90,75,70,${0.012 + r() * 0.025})`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); }
  g.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    let x = r() * S, y = r() * S, a = r() * 6.283; g.beginPath(); g.moveTo(x, y);
    for (let k = 0, n = 8 + r() * 26; k < n; k++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * (4 + r() * 9); y += Math.sin(a) * (4 + r() * 9); g.lineTo(x, y); }
    g.strokeStyle = `rgba(95,72,62,${0.1 + r() * 0.14})`; g.lineWidth = 0.5 + r() * 0.7; g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
const grain = plasterTexture();
// Stone that is a little darker and cooler near the ground, paler near the vault,
// with faint vertical weathering streaks. Done in the shader so it costs no textures.
function weather(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float hh = clamp(vWPos.y / 39.0, 0.0, 1.0);
        diffuseColor.rgb *= mix(vec3(0.88, 0.84, 0.83), vec3(1.05, 1.03, 0.99), smoothstep(0.0, 1.0, hh));
        float ang = atan(vWPos.z, vWPos.x);
        float st = sin(ang * 37.0) * sin(ang * 11.0 + 2.0) * 0.5 + 0.5;
        st = smoothstep(0.72, 1.0, st) * (0.55 + 0.45 * sin(vWPos.y * 0.33 + ang * 5.0));
        diffuseColor.rgb *= 1.0 - 0.09 * st;`);
  };
  mat.customProgramCacheKey = () => 'weathered';
  return mat;
}
const stoneMat = (color, extra = {}) => weather(new THREE.MeshStandardMaterial({ color, map: grain, bumpMap: grain, bumpScale: 0.5, roughness: 0.96, metalness: 0, ...extra }));
// A block with softened edges, so steps and ledges do not read as sharp boxes.
function softBlock(w, h, d, b = 0.035) {
  const x = w / 2 - b, y = d / 2 - b, sh = new THREE.Shape();
  sh.moveTo(-x, -y); sh.lineTo(x, -y); sh.lineTo(x, y); sh.lineTo(-x, y); sh.lineTo(-x, -y);
  const g = new THREE.ExtrudeGeometry(sh, { depth: h - 2 * b, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 3 });
  g.rotateX(-Math.PI / 2); g.translate(0, -h / 2 + b, 0);
  return g;
}
const stones = PAL.stone.map((c) => stoneMat(c));
const faceOut = (a) => Math.PI / 2 - a; // turn a box so its depth points away from the centre

// ---------- ground and the far country ----------
const ground = new THREE.Mesh(new THREE.CircleGeometry(1900, 64), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, fog: false }));
{
  const n = ground.geometry.attributes.position.count, col = new Float32Array(n * 3);
  const near = new THREE.Color(PAL.ground), far = new THREE.Color(PAL.skyHorizon);
  for (let i = 0; i < n; i++) (i === 0 ? near : far).toArray(col, i * 3); // centre to rim
  ground.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
}
ground.rotation.x = -Math.PI / 2; ground.userData.noCast = true;
scene.add(ground);
{
  const r = W.rng(99);
  for (let i = 0; i < 16; i++) {
    const h = 40 + r() * 110, w = 9 + r() * 16;
    // The first seven stand behind the tower, where the wide frame looks.
    const a = i < 7 ? -Math.PI / 2 + (i - 3) * 0.13 + (r() - 0.5) * 0.06 : r() * TAU, d = 260 + r() * 420;
    // Far things take on the colour of the air.
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PAL.spire).lerp(haze, THREE.MathUtils.clamp((d - 150) / 650, 0, 0.85)), roughness: 1, flatShading: true, fog: false });
    let y = 0, rad = w;
    for (let k = 0; k < 4; k++) {
      const hh = h * [0.42, 0.28, 0.18, 0.12][k], top = rad * (0.45 + r() * 0.25);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(top, rad, hh, 5 + Math.floor(r() * 3)), mat);
      m.position.set(Math.cos(a) * d + (r() - 0.5) * w * 0.5, y + hh / 2, Math.sin(a) * d + (r() - 0.5) * w * 0.5);
      m.rotation.y = r() * 3; m.userData.flat = true; scene.add(m);
      y += hh; rad = top;
    }
  }
}

// ---------- a sea of cloud, in a few drifting layers ----------
function cloudTexture(seed) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), r = W.rng(seed);
  for (let i = 0; i < 46; i++) {
    const cx = r() * S, cy = r() * S;
    for (let k = 0; k < 7; k++) {
      const x = cx + (r() - 0.5) * 120, y = cy + (r() - 0.5) * 46, rad = 18 + r() * 46;
      for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { // wrap, so the tile repeats cleanly
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const clouds = [[0.6, 0.95, 16, 11, 0.004], [2.4, 0.55, 11, 12, -0.003], [4.6, 0.32, 8, 13, 0.002]].map(([y, opacity, repeat, seed, drift]) => {
  const tex = cloudTexture(seed); tex.repeat.set(repeat, repeat);
  const m = new THREE.Mesh(new THREE.RingGeometry(R_IN + WALL + 2.5, 1900, 64, 1),
    new THREE.MeshBasicMaterial({ map: tex, color: PAL.cloud, transparent: true, opacity, depthWrite: false, fog: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.userData.flat = true; m.userData.drift = drift; m.renderOrder = 2;
  scene.add(m); return m;
});

// ---------- the wall: smooth curved bays with arched openings ----------
const DOME_Y = 39, BAYS = 10, LEVELS = 6, LEVEL_H = DOME_Y / LEVELS, BAY_A = TAU / BAYS;
const rand = W.rng(20261122);
const BAY_W = BAY_A * (R_IN + WALL / 2); // width of one bay laid flat
// One flat panel with a hole, extruded to the wall thickness, then bent round the tower.
function bayGeometry(kind) {
  const w = BAY_W, h = LEVEL_H, N = 16, sh = new THREE.Shape();
  for (let i = 0; i <= N; i++) sh[i ? 'lineTo' : 'moveTo']((i / N) * w, 0);
  for (let i = N; i >= 0; i--) sh.lineTo((i / N) * w, h);
  const arch = (cx, half, sill, spring) => {
    const p = new THREE.Path();
    p.moveTo(cx - half, sill); p.lineTo(cx + half, sill); p.lineTo(cx + half, spring);
    p.absarc(cx, spring, half, 0, Math.PI, false); p.lineTo(cx - half, sill);
    sh.holes.push(p);
  };
  if (kind === 'arch') arch(w / 2, w * 0.24, 1.1, 3.7);
  if (kind === 'gate') arch(w / 2, w * 0.3, 0.05, 3.6);
  if (kind === 'twin') { arch(w * 0.3, w * 0.085, 1.8, 4.2); arch(w * 0.7, w * 0.085, 1.8, 4.2); }
  if (kind === 'eye') arch(w / 2, w * 0.11, 3.4, 4.3);
  const g = new THREE.ExtrudeGeometry(sh, { depth: WALL, bevelEnabled: false, curveSegments: 16 });
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = BAY_A * (1 - x / w), r = R_IN + z, ca = Math.cos(a), sa = Math.sin(a);
    pos.setXYZ(i, ca * r, y, sa * r);
    const nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
    nor.setXYZ(i, nx * sa + nz * ca, ny, -nx * ca + nz * sa); // normals follow the curve, so it shades smooth
    uv.setXY(i, x / 3.2, y / 3.2);
  }
  return g;
}
const bayGeo = { solid: bayGeometry('solid'), arch: bayGeometry('arch'), gate: bayGeometry('gate'), twin: bayGeometry('twin'), eye: bayGeometry('eye') };
// Where a route (or a climber on it, or a crescent above it) crosses a bay, how much of its height is taken.
const taken = new Map(); // "bay:level" -> [lowest, highest] taken, measured from the level's floor
for (const route of [0, 1]) for (let i = 0; i <= W.PEGS; i++) {
  const u = i / W.PEGS, a = (((W.angle(route, u) % TAU) + TAU) % TAU), f = (a / BAY_A) % 1;
  if (f < 0.12 || f > 0.88) continue; // the solid edge of a bay never has a hole anyway
  const atMark = W.GAPS.some((g) => Math.abs(u - g.u) < 0.012);
  for (const [lo, hi] of [[-0.3, atMark ? 3.5 : 2.1]]) {
    for (let l = Math.floor((u * TOP + lo) / LEVEL_H); l <= Math.floor((u * TOP + hi) / LEVEL_H); l++) {
      const k = `${Math.floor(a / BAY_A)}:${l}`, y0 = l * LEVEL_H, t = taken.get(k) || [99, -99];
      taken.set(k, [Math.min(t[0], u * TOP + lo - y0), Math.max(t[1], u * TOP + hi - y0)]);
    }
  }
}
const columns = []; // every piece of wall, with which way it faces
for (let l = 0; l < LEVELS; l++) for (let b = 0; b < BAYS; b++) {
  const t = taken.get(`${b}:${l}`), free = (lo, hi) => !t || t[1] < lo || t[0] > hi, roll = rand();
  let kind = 'solid';
  if (l === 0 && free(0, 5.2) && roll < 0.8) kind = 'gate';
  else if (free(0.9, 5.4) && roll < 0.9) kind = 'arch';
  else if (free(1.6, 5.2) && roll < 0.9) kind = 'twin';
  else if (free(3.2, 5.0) && roll < 0.85) kind = 'eye';
  const m = new THREE.Mesh(bayGeo[kind], stones[Math.floor(rand() * stones.length)]);
  m.rotation.y = -(b * BAY_A); m.position.y = l * LEVEL_H;
  m.userData.front = Math.sin((b + 0.5) * BAY_A);
  columns.push(m); scene.add(m);
}
// ---------- stepping stones, breaks, marks ----------
const pegMat = stoneMat(PAL.peg);
const pegGeo = softBlock(0.4, 0.17, 1.0);
for (const route of [0, 1]) {
  for (let i = 0; i <= W.PEGS; i++) {
    const u = i / W.PEGS, a = W.angle(route, u);
    const r = R_IN - 0.5 + (rand() - 0.5) * 0.12;
    const m = new THREE.Mesh(pegGeo, pegMat);
    m.position.set(Math.cos(a) * r, u * TOP - 0.08, Math.sin(a) * r);
    m.rotation.y = faceOut(a) + (rand() - 0.5) * 0.25;
    m.scale.set(0.8 + rand() * 0.6, 0.8 + rand() * 0.5, 1);
    m.userData.full = m.scale.clone();
    scene.add(m);
  }
}

// A red crescent on the wall marks each place to stand.
function crescentGeometry() {
  const r1 = 0.6, r2 = 0.5, d = 0.25, pts = [];
  const a1 = Math.atan2(0.491, 0.345), a2 = Math.atan2(0.491, 0.345 - d);
  for (let i = 0; i <= 28; i++) { const t = a1 + (i / 28) * (TAU - 2 * a1); pts.push(new THREE.Vector2(Math.cos(t) * r1, Math.sin(t) * r1)); }
  for (let i = 0; i <= 28; i++) { const t = (TAU - a2) - (i / 28) * (TAU - 2 * a2); pts.push(new THREE.Vector2(d + Math.cos(t) * r2, Math.sin(t) * r2)); }
  return new THREE.ShapeGeometry(new THREE.Shape(pts));
}
const crescentGeo = crescentGeometry();
const slabGeo = softBlock(1.5, 0.22, 1.3, 0.05);
const marks = new Map(); // gap id -> { edge, mark } crescents
function markAt(route, u, flip) {
  const a = W.angle(route, u), [x, y, z] = W.pos(route, u, R_IN - 0.62);
  const s = new THREE.Mesh(slabGeo, pegMat);
  s.position.set(x, y - 0.1, z); s.rotation.y = faceOut(a); scene.add(s);
  const c = new THREE.Mesh(crescentGeo, new THREE.MeshStandardMaterial({ color: PAL.red, roughness: 1, emissive: PAL.red, emissiveIntensity: 0, side: THREE.DoubleSide }));
  c.position.set(Math.cos(a) * (R_IN - 0.13), y + 2.35, Math.sin(a) * (R_IN - 0.13)); c.userData.noCast = true;
  c.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)); // facing the centre of the tower
  c.scale.set(flip ? -1.5 : 1.5, 1.5, 1.5); scene.add(c);
  return c;
}
for (const g of W.GAPS) marks.set(g.id, { edge: markAt(g.route, g.u - 0.006, false), mark: markAt(1 - g.route, g.u, true) });

// ---------- top: landing, vault, light ----------
const landing = new THREE.Mesh(new THREE.RingGeometry(3.9, R_IN, 48), stoneMat(PAL.stone[3], { side: THREE.DoubleSide }));
landing.rotation.x = -Math.PI / 2; landing.position.y = TOP - 0.02; scene.add(landing);

const WEDGES = 18;
const domeMat = stoneMat(PAL.dome, { side: THREE.DoubleSide });
const wedges = [];
for (let k = 0; k < WEDGES; k++) {
  const phi0 = (k / WEDGES) * TAU, dphi = TAU / WEDGES;
  const m = new THREE.Mesh(new THREE.SphereGeometry(R_IN + WALL, 5, 7, phi0, dphi, 0.3, Math.PI / 2 - 0.3), domeMat);
  m.scale.y = 0.78; m.position.y = DOME_Y;
  const mid = phi0 + dphi / 2;
  m.userData.out = new THREE.Vector3(-Math.cos(mid), 0.55, Math.sin(mid)).normalize();
  m.userData.front = Math.sin(mid);
  m.userData.spin = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5);
  wedges.push(m); scene.add(m);
}
const shaft = new THREE.Mesh(
  new THREE.CylinderGeometry(1.7, 2.5, DOME_Y, 28, 1, true),
  new THREE.MeshBasicMaterial({ color: PAL.shaft, transparent: true, opacity: 0.075, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
);
shaft.position.y = DOME_Y / 2; shaft.userData.flat = true; scene.add(shaft);

// ---------- climbers ----------
const Y = new THREE.Vector3(0, 1, 0), vd = new THREE.Vector3();
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const limbGeo = new THREE.CylinderGeometry(0.045, 0.04, 1, 10);
function setLimb(mesh, a, b) {
  vd.subVectors(b, a); const len = vd.length();
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  mesh.scale.y = len; mesh.quaternion.setFromUnitVectors(Y, vd.normalize());
}
function makeClimber(route) {
  const group = new THREE.Group();
  const flat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 1 });
  const cloth = flat(PAL.cloth), skin = flat(PAL.skin), red = flat(PAL.red), hair = flat(PAL.hair);
  const limb = (mat, thick) => { const m = new THREE.Mesh(limbGeo, mat); m.scale.set(thick, 1, thick); group.add(m); return m; };
  const c = {
    route, u: 0, target: 0, dust: 0, group, cloth, skin, red,
    base: new THREE.Color(PAL.cloth), skinBase: new THREE.Color(PAL.skin), redBase: new THREE.Color(PAL.red),
    torso: limb(cloth, 3.6), skirt: limb(cloth, 4.4), sash: limb(red, 3.9),
    armL: [limb(cloth, 1.2), limb(skin, 1)], armR: [limb(cloth, 1.2), limb(skin, 1)],
    legL: [limb(cloth, 1.5), limb(cloth, 1.15)], legR: [limb(cloth, 1.5), limb(cloth, 1.15)],
    head: new THREE.Mesh(new THREE.SphereGeometry(0.125, 10, 8), skin),
    // Climber 1 wears a red hood. Climber 2 has dark hair and a red scarf.
    cap: new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8, 0, TAU, 0, Math.PI * 0.62), route === 0 ? red : hair),
    scarf: limb(red, route === 0 ? 2.2 : 1.6),
    lamp: new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: PAL.red, fog: false })),
  };
  group.add(c.head); group.add(c.cap); group.add(c.lamp);
  // Breath: a thin yellow line beside the climber. Rules are in verticalGame/gamerulesMD-Claude/rules.md.
  const barGeo = new THREE.BoxGeometry(0.028, 1, 0.028); barGeo.translate(0, 0.5, 0);
  c.bar = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: PAL.grip, fog: false }));
  c.bar.position.set(-0.34, 0.92, 0.02); c.bar.userData.flat = true; group.add(c.bar); // on the side of the open drop
  c.grip = 1; c.sliding = false; c.slideTo = 0; c.slippedAt = -99; c.facing = 1;
  c.lamp.visible = false; c.lamp.userData.flat = true; // only shown in the wide frame
  const light = new THREE.PointLight(0xffd9a8, 2.2, 9, 2); light.position.set(-1.4, 1.8, -0.6); group.add(light);
  scene.add(group);
  return c;
}
function poseClimber(c) {
  // Walking up a spiral stair: facing along the steps, legs stepping, arms swinging.
  const ph = c.u * W.PATH_LEN * 3.4, s = Math.sin(ph), bob = 0.03 * Math.abs(Math.cos(ph));
  const lean = 0.07;
  const hip = V(0, 0.88 + bob, 0), neck = V(0, 1.42 + bob, lean);
  setLimb(c.torso, hip, neck);
  setLimb(c.skirt, V(0, 0.62 + bob, -0.01), V(0, 0.95 + bob, 0.01));
  setLimb(c.sash, V(0, 0.92 + bob, 0.005), V(0, 1.0 + bob, 0.012));
  c.head.position.set(0, 1.6 + bob, lean + 0.03);
  c.cap.position.set(0, 1.62 + bob, lean + 0.01); c.cap.rotation.x = -0.25;
  const sway = 0.1 * Math.sin(ph * 0.7);
  if (c.route === 0) setLimb(c.scarf, V(0, 1.52 + bob, lean - 0.08), V(0.02 + sway * 0.3, 1.2 + bob, lean - 0.2));
  else setLimb(c.scarf, V(0, 1.47 + bob, lean - 0.06), V(sway * 0.5, 1.4 + bob + sway * 0.4, lean - 0.55));
  for (const [side, arm, leg, k] of [[-1, c.armL, c.legL, s], [1, c.armR, c.legR, -s]]) {
    // k > 0: this leg is the one stepping forward and up
    const hp = V(side * 0.09, 0.86 + bob, 0);
    const foot = V(side * 0.1, 0.05 + 0.24 * Math.max(0, k), 0.24 * k);
    const knee = V(side * 0.11, (hp.y + foot.y) / 2 + 0.05, (hp.z + foot.z) / 2 + 0.16);
    setLimb(leg[0], hp, knee); setLimb(leg[1], knee, foot);
    const sh = V(side * 0.18, 1.38 + bob, lean);
    const hand = V(side * 0.24, 0.96 + bob + 0.05 * Math.max(0, -k), -0.2 * k);
    const elbow = V(side * 0.25, (sh.y + hand.y) / 2, (sh.z + hand.z) / 2 - 0.07);
    setLimb(arm[0], sh, elbow); setLimb(arm[1], elbow, hand);
  }
  const a = W.angle(c.route, c.u), [x, y, z] = W.pos(c.route, c.u);
  c.group.position.set(x, y, z);
  c.group.rotation.y = -a + (c.facing < 0 ? Math.PI : 0); // facing up the stair, or down it
  c.cloth.color.copy(c.base).lerp(chalk, c.dust * 0.9);
  c.skin.color.copy(c.skinBase).lerp(chalk, c.dust * 0.5);
  c.red.color.copy(c.redBase).lerp(chalk, c.dust * 0.78); // the red goes chalky
  c.bar.scale.y = Math.max(0.02, c.grip * 0.55); c.bar.material.color.set(c.grip < 0.25 ? PAL.gripLow : PAL.grip);
}
const chalk = new THREE.Color(PAL.chalk);
const climbers = [makeClimber(0), makeClimber(1)];

// ---------- what has been mended ----------
// At every break, a half bridge reaches out from each side of the void and stops short.
// When both climbers are in place the two halves grow and meet. They stay met.
const bridges = new Set();
const OPEN = 0.7; // how far each half reaches before it is mended (1 = the centre)
const HELD = 1.9; // the frame stays on a bridge a moment after it joins
function halfSpanGeometry() {
  const L = R_IN, sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.lineTo(L, 0); sh.lineTo(L, -0.2);
  sh.quadraticCurveTo(L * 0.42, -0.28, 0, -2.0); sh.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1.05, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3, curveSegments: 14 });
  g.translate(0, 0, -0.525);
  return g;
}
const spanGeo = halfSpanGeometry(), spanMat = stoneMat(PAL.bridge);
const spans = new Map(); // gap id -> { halves: [mesh, mesh], t }
for (const g of W.GAPS) {
  const halves = [g.route, 1 - g.route].map((route) => {
    const a = W.angle(route, g.u), m = new THREE.Mesh(spanGeo, spanMat);
    m.position.set(Math.cos(a) * R_IN, g.u * TOP - 0.22, Math.sin(a) * R_IN);
    m.rotation.y = Math.PI - a; // pointing at the centre
    m.scale.x = OPEN; scene.add(m);
    return m;
  });
  spans.set(g.id, { halves, t: 0, on: false });
}
function addBridge(id, announce) {
  if (bridges.has(id)) return;
  const g = W.GAPS.find((x) => x.id === id); if (!g) return;
  bridges.add(id);
  spans.get(id).on = true;
  if (announce) sendState();
}
function growThings(dt) {
  for (const sp of spans.values()) {
    if (!sp.on || sp.t >= HELD) continue;
    sp.t = Math.min(HELD, sp.t + dt / 1.6);
    const e = 1 - Math.pow(1 - Math.min(1, sp.t), 3);
    for (const m of sp.halves) m.scale.x = OPEN + (1.004 - OPEN) * e;
  }
}

// ---------- two devices ----------
let net = null, relays = 0, lastSeen = -1e9, circuit = 0, lastPosSent = 0, lastStateSent = 0;
const now = () => performance.now() / 1000;
const partnerHere = () => now() - lastSeen < 3.5;
function sendState() { lastStateSent = now(); if (net) net.send('s', { b: [...bridges] }); }
function onMessage(sub, d) {
  if (sub === `p/${1 - myRoute}`) {
    lastSeen = now();
    const c = climbers[1 - myRoute];
    if (typeof d.u === 'number') c.target = Math.min(1, Math.max(0, d.u));
    if (typeof d.d === 'number') c.dust = d.d;
    if (typeof d.g === 'number') c.grip = d.g;
  } else if (sub === 's') {
    for (const id of d.b || []) addBridge(id, false);
  }
}
import('./net.js')
  .then((m) => { net = m.connect({ room, onMessage, onStatus: (n) => { relays = n; } }); })
  .catch(() => { relays = -1; }); // the game still works alone

// ---------- input ----------
let active = myRoute;   // the climber this device is moving right now
let mode = 'in';        // 'in' = close, 'out' = wide
let snap = true;        // a cut: jump the camera, do not glide
const held = { up: false, down: false };
function cut() { mode = mode === 'in' ? 'out' : 'in'; snap = true; }
function swap() { if (!partnerHere()) { active = 1 - active; snap = true; } }
addEventListener('keydown', (e) => {
  if (e.key === 'Tab') { e.preventDefault(); swap(); return; }
  if (e.repeat) return;
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') held.up = true;
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') held.down = true;
  if (e.key === ' ' || e.key === 'c' || e.key === 'C') { e.preventDefault(); cut(); }
});
addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') held.up = false;
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') held.down = false;
});
addEventListener('blur', () => { held.up = held.down = false; });
function holdButton(id, key) {
  const b = $(id);
  const on = (e) => { e.preventDefault(); held[key] = true; b.classList.add('held'); };
  const off = () => { held[key] = false; b.classList.remove('held'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
  b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
}
holdButton('t-up', 'up'); holdButton('t-down', 'down');
$('b-cut').onclick = cut;
$('b-swap').onclick = swap;
$('b-invite').onclick = async () => {
  const url = `${location.origin}${location.pathname}?room=${room}&p=${myRoute === 0 ? 2 : 1}`;
  try { await navigator.clipboard.writeText(url); $('b-invite').textContent = TEXT.copied; }
  catch { window.prompt('Send this link to the other climber', url); }
  setTimeout(() => { $('b-invite').textContent = 'Invite'; }, 1800);
};

// ---------- opening the vault ----------
let breaking = 0, resetDone = false, breaker = null;
function startBreak(c) { if (!breaking) { breaking = 0.0001; resetDone = false; breaker = c; } }
function runBreak(dt) {
  if (!breaking) return;
  breaking += dt; const t = breaking;
  const e = Math.min(1, t / 1.5), ease = e * e;
  if (!resetDone) for (const w of wedges) {
    w.position.set(0, DOME_Y, 0).addScaledVector(w.userData.out, ease * 11);
    w.rotation.set(w.userData.spin.x * ease * 2, w.userData.spin.y * ease * 2, w.userData.spin.z * ease * 2);
  }
  if (t > 0.9) $('fade').classList.add('on');
  if (t > 1.9 && !resetDone) {
    resetDone = true;
    // Through the vault, and out at the ground where they began. The dust stays on them.
    { const c = breaker; c.u = c.target = 0; c.dust = 1; c.grip = 1; c.sliding = false; } // only the one who went through
    for (const w of wedges) { w.position.set(0, DOME_Y, 0); w.rotation.set(0, 0, 0); }
    mode = 'in'; snap = true;
  }
  if (t > 2.3) $('fade').classList.remove('on');
  if (t > 3.2) breaking = 0;
}

// ---------- camera: two frames ----------
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
let shotKey = '';
function frameCamera() {
  const wide = mode === 'out';
  // A break the active climber is standing level with, until it has joined.
  const me = climbers[active];
  const them = climbers[1 - active];
  const atBridge = wide ? null : W.GAPS.find((g) => Math.abs(me.u - g.u) <= 0.03 && Math.abs(them.u - g.u) <= 0.05 && spans.get(g.id).t < HELD) || null;
  const key = wide ? 'wide' : atBridge ? `bridge${atBridge.id}` : 'follow';
  if (key !== shotKey) { shotKey = key; snap = true; }
  if (wide) {
    wantPos.set(0, DOME_Y * 0.52, 118); wantLook.set(0, DOME_Y * 0.54, 0);
  } else if (atBridge) {
    // Side-on to the broken bridge, so both halves and both climbers are in the frame.
    const a = W.angle(atBridge.route, atBridge.u) + Math.PI / 2, y = atBridge.u * TOP;
    wantPos.set(Math.cos(a) * 5.6, y + 1.3, Math.sin(a) * 5.6); wantLook.set(0, y + 0.5, 0);
  } else {
    const c = climbers[active], a = W.angle(c.route, c.u), [x, y, z] = W.pos(c.route, c.u);
    const rx = Math.cos(a), rz = Math.sin(a), tx = -rz, tz = rx; // away from centre, and up the route
    // Low and behind, looking up the wall, so the height and the sky are in the frame.
    wantPos.set(x - rx * 4.1 - tx * 2.4, y + 0.9, z - rz * 4.1 - tz * 2.4);
    wantLook.set(x + tx * 0.9 + rx * 0.2, y + 2.6, z + tz * 0.9 + rz * 0.2);
  }
  if (snap) {
    camPos.copy(wantPos); camLook.copy(wantLook);
    camera.fov = wide ? 26 : atBridge ? 72 : 58; camera.updateProjectionMatrix();
    scene.fog.color.set(wide ? PAL.haze : PAL.deep); scene.fog.near = wide ? 500 : 16; scene.fog.far = wide ? 5000 : 150;
    for (const col of columns) col.visible = !(wide && col.userData.front > 0.12);
    for (const w of wedges) w.visible = !(wide && w.userData.front > 0.12);
    for (const c of climbers) { c.lamp.visible = wide; c.lamp.scale.setScalar(5); }
    shaft.visible = !wide;
    snap = false;
  } else { camPos.lerp(wantPos, 0.1); camLook.lerp(wantLook, 0.12); }
  camera.position.copy(camPos); camera.lookAt(camLook);
  sky.position.copy(camPos);
}

// ---------- words on screen ----------
let lastPrompt = null, lastStatus = null;
function updateWords(t) {
  const me = climbers[active];
  let p = '';
  if (!breaking) {
    const near = W.GAPS.find((g) => !bridges.has(g.id) && Math.abs(me.u - g.u) <= 0.02);
    if (t - me.slippedAt < 2.5) p = TEXT.slipped;
    else if (me.grip < 0.25 && !W.onLedge(me.route, me.u)) p = TEXT.tiring;
    else if (near) p = TEXT.bridge;
  }
  if (p !== lastPrompt) { $('prompt').textContent = p; lastPrompt = p; }
  const link = relays > 0 ? (partnerHere() ? TEXT.together : TEXT.alone) : relays < 0 ? 'offline · Tab plays both' : 'connecting · Tab plays both';
  const s = `climber ${active + 1} · room ${room} · ${link} · bridges ${bridges.size}/${W.GAPS.length}${circuit ? ` · circuit ${circuit + 1}` : ''}`;
  if (s !== lastStatus) { $('status').textContent = s; lastStatus = s; }
  $('b-swap').style.display = partnerHere() ? 'none' : '';
}

// ---------- lens effects: soft shade in corners and seams, a little glow ----------
// Loaded separately, so the game still runs if they fail. Add ?fx=0 to the address to switch them off.
let composer = null;
if (q.get('fx') !== '0' && !matchMedia('(pointer: coarse)').matches) (async () => {
  try {
    const [{ EffectComposer }, { RenderPass }, { GTAOPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/GTAOPass.js'), import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/OutputPass.js'),
    ]);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const c = new EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 }));
    c.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, size.x, size.y);
    ao.updateGtaoMaterial({ radius: 0.85, distanceExponent: 1.3, thickness: 1.2, scale: 1.3, samples: 12 });
    ao.blendIntensity = 0.9;
    // Sky, cloud and light are not solid: keep them out of the shade pass.
    const airy = []; scene.traverse((o) => { if (o.userData.flat) airy.push(o); });
    const hide = ao._overrideVisibility.bind(ao), show = ao._restoreVisibility.bind(ao);
    ao._overrideVisibility = () => { hide(); for (const o of airy) { o.userData.was = o.visible; o.visible = false; } };
    ao._restoreVisibility = () => { for (const o of airy) o.visible = o.userData.was; show(); };
    c.addPass(ao);
    c.addPass(new UnrealBloomPass(size.clone(), 0.1, 0.5, 1.25));
    c.addPass(new OutputPass());
    composer = c; resize();
  } catch (e) { console.warn('lens effects off', e); }
})();

// ---------- loop ----------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
}
addEventListener('resize', resize); resize();

scene.traverse((o) => { if (o.isMesh && !o.userData.flat) { o.castShadow = !o.userData.noCast; o.receiveShadow = true; } });

let last = now();
renderer.setAnimationLoop(() => {
  const t = now(), dt = Math.min(0.1, t - last); last = t;
  const together = partnerHere();
  if (together && active !== myRoute) { active = myRoute; snap = true; }

  if (!breaking) {
    const c = climbers[active], step = (W.SPEED / W.PATH_LEN) * dt;
    if (c.sliding) {
      // Slipped: slide down to the nearest ledge below.
      c.u = c.target = Math.max(c.slideTo, c.u - W.SLIDE * step);
      if (c.u <= c.slideTo + 1e-6) { c.sliding = false; c.slippedAt = t; }
    } else {
      const dir = (held.up ? 1 : 0) - (held.down ? 1 : 0);
      if (dir) { c.u = W.move(c.route, c.u, dir * step); c.target = c.u; c.facing = dir; }
      const resting = W.onLedge(c.route, c.u);
      c.grip = W.nextGrip(c.grip, dir !== 0, resting, dt);
      if (c.grip <= 0 && !resting) { c.sliding = true; c.slideTo = W.ledgeBelow(c.route, c.u); }
    }
  }
  if (together) { const r = climbers[1 - myRoute]; if (Math.abs(r.target - r.u) > 0.0015) r.facing = r.target > r.u ? 1 : -1; r.u += (r.target - r.u) * Math.min(1, dt * 10); }

  const us = [climbers[0].u, climbers[1].u];
  for (const id of W.mend(us, bridges)) addBridge(id, true);
  if (!breaking && W.atSummit(climbers[active].u)) { circuit += 1; startBreak(climbers[active]); }

  for (const g of W.GAPS) {
    const mk = marks.get(g.id), me = us[g.route], partner = us[1 - g.route];
    if (bridges.has(g.id)) { mk.edge.material.emissiveIntensity = mk.mark.material.emissiveIntensity = 0.55; continue; }
    mk.edge.material.emissiveIntensity = Math.abs(me - (g.u - 0.006)) <= W.MARK ? 0.8 : 0;
    mk.mark.material.emissiveIntensity = Math.abs(partner - g.u) <= W.MARK ? 0.8 : 0;
  }

  if (net) {
    if (t - lastPosSent > 0.1) { lastPosSent = t; const c = climbers[myRoute]; net.send(`p/${myRoute}`, { u: +c.u.toFixed(4), d: c.dust, g: +c.grip.toFixed(2) }); }
    if (t - lastStateSent > 2) sendState();
  }

  for (const c of clouds) c.material.map.offset.x += c.userData.drift * dt;
  runBreak(dt); growThings(dt);
  for (const c of climbers) poseClimber(c);
  frameCamera(); updateWords(t);
  if (composer) composer.render(); else renderer.render(scene, camera);
});

// Handy for testing from the console.
window.__tower = { climbers, bridges, W, cut, swap, get mode() { return mode; }, get circuit() { return circuit; } };
