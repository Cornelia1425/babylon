// A "phrase" is a few seconds of one body moving, stored as frames.
// Units are metres, y is up, (0,0) is the centre of the stage.
// Real webcam data will be converted into this same shape later,
// so everything downstream (analysis, architecture, replay) stays the same.

export const JOINTS = ['head', 'neck', 'ls', 'rs', 'le', 're', 'lw', 'rw', 'hip', 'lk', 'rk', 'la', 'ra'];

export const BONES = [
  ['head', 'neck'], ['neck', 'ls'], ['neck', 'rs'],
  ['ls', 'le'], ['le', 'lw'], ['rs', 're'], ['re', 'rw'],
  ['neck', 'hip'], ['hip', 'lk'], ['lk', 'la'], ['hip', 'rk'], ['rk', 'ra'],
];

export const JOINT_NAMES = {
  lw: 'left hand', rw: 'right hand', la: 'left foot', ra: 'right foot',
  hip: 'hips', head: 'head',
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;
const mid = (a, b, dy = 0, dz = 0) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + dy, (a[2] + b[2]) / 2 + dz];

// Stand-in dancer. Used until the webcam is connected.
export function samplePhrase(seed, seconds = 8, fps = 15) {
  const r = rng(seed * 9973 + 17);
  const tempo = 0.36 + r() * 0.4;
  const roam = 0.5 + r() * 1.5;
  const armAmp = 0.35 + r() * 0.5;
  const f1 = 0.08 + r() * 0.16, f2 = 0.06 + r() * 0.14, ph = r() * TAU;
  const af = [0.3 + r() * 0.7, 0.25 + r() * 0.8, 0.2 + r() * 0.7, 0.3 + r() * 0.8];
  const aph = [r() * TAU, r() * TAU, r() * TAU, r() * TAU];

  const hipAt = (t) => [
    roam * Math.sin(TAU * f1 * t + ph) * Math.cos(TAU * f2 * t * 0.7),
    roam * Math.sin(TAU * f2 * t + ph * 0.7),
  ];

  const h0 = hipAt(0);
  const feet = { la: [h0[0] - 0.16, h0[1]], ra: [h0[0] + 0.16, h0[1]] };
  const from = { la: [...feet.la], ra: [...feet.ra] };
  const to = { la: [...feet.la], ra: [...feet.ra] };
  let swing = 'la';
  let stepStart = -tempo; // forces a first step at t = 0

  const frames = [];
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) {
    const t = i / fps;
    if (t - stepStart >= tempo) {
      feet[swing] = [...to[swing]];
      swing = swing === 'la' ? 'ra' : 'la';
      stepStart = t;
      const next = hipAt(t + tempo);
      const side = swing === 'la' ? -1 : 1;
      from[swing] = [...feet[swing]];
      to[swing] = [next[0] + side * 0.17 + (r() - 0.5) * 0.35, next[1] + (r() - 0.5) * 0.35];
    }
    const u = Math.min(1, (t - stepStart) / tempo);
    const e = u * u * (3 - 2 * u);
    const foot = (name) => {
      if (name !== swing) return [feet[name][0], 0.08, feet[name][1]];
      return [
        from[name][0] + (to[name][0] - from[name][0]) * e,
        0.08 + 0.2 * Math.sin(Math.PI * u),
        from[name][1] + (to[name][1] - from[name][1]) * e,
      ];
    };
    const [hx, hz] = hipAt(t);
    const bounce = 0.04 * Math.sin((TAU * t) / tempo);
    const hip = [hx, 0.95 + bounce, hz];
    const neck = [hx, 1.45 + bounce, hz];
    const head = [hx, 1.66 + bounce, hz];
    const ls = [hx - 0.2, 1.42 + bounce, hz];
    const rs = [hx + 0.2, 1.42 + bounce, hz];
    const arm = (s, k, side) => [
      s[0] + armAmp * (side * 0.35 + 0.8 * Math.sin(TAU * af[k] * t + aph[k])),
      Math.max(0.45, s[1] - 0.15 + armAmp * 1.1 * Math.sin(TAU * af[k + 1] * t + aph[k + 1])),
      s[2] + armAmp * 0.7 * Math.cos(TAU * af[k] * t + aph[k]),
    ];
    const lw = arm(ls, 0, -1), rw = arm(rs, 2, 1);
    const la = foot('la'), ra = foot('ra');
    frames.push({
      t,
      joints: {
        head, neck, ls, rs, hip, lw, rw, la, ra,
        le: mid(ls, lw, -0.08, -0.06), re: mid(rs, rw, -0.08, -0.06),
        lk: mid(hip, la, 0.04, 0.12), rk: mid(hip, ra, 0.04, 0.12),
      },
    });
  }
  return { source: 'stand-in dancer', seed, seconds, fps, frames };
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Reads a phrase and pulls out the facts the architecture is built from.
// Nothing here is random: same movement in, same numbers out.
export function analyse(phrase, bins = 24) {
  const { frames, fps } = phrase;
  const landings = [];
  for (const j of ['la', 'ra']) {
    landings.push({ joint: j, t: 0, pos: [frames[0].joints[j][0], frames[0].joints[j][2]] });
    let moving = false;
    for (let i = 1; i < frames.length; i++) {
      const speed = dist(frames[i].joints[j], frames[i - 1].joints[j]) * fps;
      if (!moving && speed > 0.6) moving = true;
      else if (moving && speed < 0.25) {
        moving = false;
        landings.push({ joint: j, t: frames[i].t, pos: [frames[i].joints[j][0], frames[i].joints[j][2]] });
      }
    }
  }
  landings.sort((a, b) => a.t - b.t);

  const reach = new Array(bins).fill(0);
  let energy = 0, travel = 0, maxReach = 0;
  for (let i = 0; i < frames.length; i++) {
    const J = frames[i].joints;
    for (const name of JOINTS) {
      const p = J[name];
      const rad = Math.hypot(p[0], p[2]);
      const b = Math.floor((((Math.atan2(p[2], p[0]) + TAU) % TAU) / TAU) * bins) % bins;
      if (rad > reach[b]) reach[b] = rad;
      if (rad > maxReach) maxReach = rad;
    }
    if (i > 0) {
      const P = frames[i - 1].joints;
      for (const name of ['lw', 'rw', 'la', 'ra']) energy += dist(J[name], P[name]) * fps;
      travel += dist(J.hip, P.hip);
    }
  }
  energy /= (frames.length - 1) * 4;

  const paths = {};
  for (const j of ['lw', 'rw']) paths[j] = frames.map((f) => ({ t: f.t, p: f.joints[j] }));

  return { landings, reach, maxReach, energy, travel, paths };
}
