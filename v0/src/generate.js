// Turns one phrase of movement into one floor of the tower.
// Every mesh carries `userData.explain`, so it can say why it exists.
import { analyse, JOINT_NAMES } from './motion.js';

// PLACEHOLDER WORDING. These sentences are a creative decision; edit freely.
export const RULES = {
  slab: 'The floor ends just past the furthest point the body reached.',
  column: 'Where a foot lands, a column rises.',
  rib: 'The path of a hand stays in the air as a rib of light.',
  wall: 'Where the body never reached, the wall stays closed. Where it reached, the wall opens.',
  stair: 'Nobody chose this. It is a default.',
};

// PLACEHOLDER COLOURS. Also a creative decision.
export const PALETTE = {
  stone: 0xc9a26b,
  wall: 0xa87f52,
  ribLeft: 0xff7a3d,
  ribRight: 0x4dd6ff,
  fallback: 0x5a5a5e,
};

export const FLOOR_HEIGHT = 3;
const BINS = 24;
const TAU = Math.PI * 2;

export function buildFloor(THREE, phrase, index) {
  const a = analyse(phrase, BINS);
  const H = FLOOR_HEIGHT;
  const R = a.maxReach + 0.6;
  const group = new THREE.Group();
  group.userData = { index, phrase, analysis: a, radius: R };
  const n = index + 1;

  const add = (mesh, explain) => {
    mesh.userData.explain = { floor: n, ...explain };
    mesh.castShadow = false;
    group.add(mesh);
    return mesh;
  };
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });

  // 1. Floor plate
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.18, 64), mat(PALETTE.stone));
  slab.position.y = -0.09;
  add(slab, {
    kind: 'slab', human: true, title: 'Floor', by: 'the whole body', when: [0, phrase.seconds],
    rule: RULES.slab,
    detail: `Furthest reach was ${a.maxReach.toFixed(2)} m from the centre, so this floor is ${R.toFixed(2)} m in radius.`,
  });

  // 2. Columns, one per place a foot landed (nearby landings merge and thicken)
  const clusters = [];
  for (const l of a.landings) {
    const c = clusters.find((k) => Math.hypot(k.pos[0] - l.pos[0], k.pos[1] - l.pos[1]) < 0.3);
    if (c) { c.hits.push(l); } else clusters.push({ pos: l.pos, hits: [l] });
  }
  for (const c of clusters) {
    const rad = 0.045 + 0.02 * Math.min(c.hits.length, 5);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.15, H - 0.18, 12), mat(PALETTE.stone));
    col.position.set(c.pos[0], (H - 0.18) / 2, c.pos[1]);
    const first = c.hits[0];
    const times = c.hits.map((h) => `${h.t.toFixed(1)}s`).join(', ');
    add(col, {
      kind: 'column', human: true, title: 'Column', by: JOINT_NAMES[first.joint],
      when: [Math.max(0, first.t - 0.6), Math.min(phrase.seconds, first.t + 0.6)],
      rule: RULES.column,
      detail: c.hits.length === 1
        ? `The ${JOINT_NAMES[first.joint]} landed here at ${times}.`
        : `A foot landed here ${c.hits.length} times (${times}), so it is thicker.`,
    });
  }

  // 3. Ribs, the hand paths cut into 2-second pieces
  const WINDOW = 2;
  for (const j of ['lw', 'rw']) {
    const pts = a.paths[j];
    for (let t0 = 0; t0 < phrase.seconds - 0.01; t0 += WINDOW) {
      const seg = pts.filter((q) => q.t >= t0 && q.t <= t0 + WINDOW + 1e-6);
      if (seg.length < 4) continue;
      let len = 0;
      for (let i = 1; i < seg.length; i++) len += Math.hypot(seg[i].p[0] - seg[i - 1].p[0], seg[i].p[1] - seg[i - 1].p[1], seg[i].p[2] - seg[i - 1].p[2]);
      const speed = len / (seg[seg.length - 1].t - seg[0].t);
      const curve = new THREE.CatmullRomCurve3(seg.filter((_, i) => i % 2 === 0 || i === seg.length - 1).map((q) => new THREE.Vector3(q.p[0], q.p[1], q.p[2])));
      const color = j === 'lw' ? PALETTE.ribLeft : PALETTE.ribRight;
      const rib = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 48, 0.022, 6, false),
        mat(color, { emissive: color, emissiveIntensity: 0.5 + Math.min(speed, 3) * 0.5, roughness: 0.4 }),
      );
      add(rib, {
        kind: 'rib', human: true, title: 'Rib', by: JOINT_NAMES[j], when: [t0, Math.min(phrase.seconds, t0 + WINDOW)],
        rule: RULES.rib,
        detail: `The ${JOINT_NAMES[j]} travelled ${len.toFixed(2)} m here, at ${speed.toFixed(2)} m/s. Faster movement glows brighter.`,
      });
    }
  }

  // 4. Wall, closed where the body did not go
  const panelW = ((TAU * R) / BINS) * 0.9;
  for (let b = 0; b < BINS; b++) {
    const open = a.reach[b] / a.maxReach;
    const h = (H - 0.18) * Math.pow(1 - open, 0.8);
    if (h < 0.25) continue;
    const ang = ((b + 0.5) / BINS) * TAU;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, h, 0.1), mat(PALETTE.wall));
    panel.position.set(Math.cos(ang) * R, h / 2, Math.sin(ang) * R);
    panel.rotation.y = -ang + Math.PI / 2;
    add(panel, {
      kind: 'wall', human: true, title: 'Wall', by: 'the whole body', when: [0, phrase.seconds],
      rule: RULES.wall,
      detail: `Toward this side the body reached ${a.reach[b].toFixed(2)} m of a possible ${a.maxReach.toFixed(2)} m, so the wall is ${Math.round((h / (H - 0.18)) * 100)}% closed.`,
    });
  }

  // 5. Stair to the next floor. Not derived from anyone. Shown as a default on purpose.
  const STEPS = 12;
  const start = (index * 0.9) % TAU;
  for (let s = 0; s < STEPS; s++) {
    const ang = start + (s / STEPS) * 1.2;
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.7), mat(PALETTE.fallback));
    step.position.set(Math.cos(ang) * (R + 0.4), ((s + 1) / STEPS) * H - 0.2, Math.sin(ang) * (R + 0.4));
    step.rotation.y = Math.PI / 2 - ang;
    add(step, {
      kind: 'stair', human: false, title: 'Stair', by: 'no one', when: null,
      rule: RULES.stair,
      detail: 'The tower needs a way up, so the system added one. No movement produced it.',
    });
  }

  return group;
}

export function countParts(group) {
  let human = 0, fallback = 0;
  for (const c of group.children) {
    if (!c.userData.explain) continue;
    if (c.userData.explain.human) human++; else fallback++;
  }
  return { human, fallback };
}
