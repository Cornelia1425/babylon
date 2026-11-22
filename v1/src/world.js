// The rules of the climb, with no drawing code.
// Two climbers go up two spiral routes on the inside of a hollow tower.
// Each climber can reach the top alone: nothing one climber does holds the other back.
// At five heights a broken bridge reaches across the void. It joins only while the two
// climbers stand at its two ends. Joining is a choice, not a gate. Once joined it stays.

export const TAU = Math.PI * 2;
export const TOP = 36;            // height of the climb, metres
export const R_IN = 6;            // inner radius of the tower wall
export const WALL = 1.2;          // wall thickness
export const TURNS = 1.75;        // how many times each route winds round
export const PATH_R = R_IN - 0.55; // where a climber's feet are
export const PATH_LEN = Math.hypot(TURNS * TAU * PATH_R, TOP);
export const PEGS = 132;          // stepping stones per route
export const SPEED = 2.1;         // metres per second along the route

// Where each route is broken. `u` runs 0 (ground) to 1 (top).
export const GAPS = [
  { id: 0, route: 0, u: 0.18 },
  { id: 1, route: 1, u: 0.34 },
  { id: 2, route: 0, u: 0.50 },
  { id: 3, route: 1, u: 0.66 },
  { id: 4, route: 0, u: 0.82 },
];
export const GAP_W = 0.036;       // length of a break, in u
export const EDGE = 0.03;         // how close to the break counts as "at the edge"
export const MARK = 0.016;        // how close to the mark counts as "on the mark"
export const SUMMIT = 0.995;

export const angle = (route, u) => route * Math.PI + u * TURNS * TAU;

export function pos(route, u, r = PATH_R) {
  const a = angle(route, u);
  return [Math.cos(a) * r, u * TOP, Math.sin(a) * r];
}

// The first break on this route that has not been mended yet.
export function nextBreak(route, bridges) {
  let best = null;
  for (const g of GAPS) {
    if (g.route !== route || bridges.has(g.id)) continue;
    if (!best || g.u < best.u) best = g;
  }
  return best;
}

// Move a climber. The route is whole: a climber never has to wait for the other.
export function move(route, u, du) {
  return Math.min(1, Math.max(0, u + du));
}

// Is this climber stopped at a break right now?
export function stoppedAt(route, u, bridges) {
  const b = nextBreak(route, bridges);
  return b && u >= b.u - EDGE ? b : null;
}

// Which breaks get mended, given where both climbers are. us = [uRoute0, uRoute1]
export function mend(us, bridges) {
  const made = [];
  for (const g of GAPS) {
    if (bridges.has(g.id)) continue;
    const me = us[g.route], partner = us[1 - g.route];
    if (Math.abs(me - (g.u - 0.006)) <= MARK && Math.abs(partner - g.u) <= MARK) made.push(g.id);
  }
  return made;
}

// ---- breath and losing your footing (rules: verticalGame/gamerulesMD-Claude/rules.md) ----
// Breath (called grip in the code) drains on the stair, faster while moving. It refills on a
// landing. At zero you lose your footing and slide down to the nearest landing below.
// Nothing else can go wrong: no enemies, no timer.
export const LEDGE = 0.014;        // how close to a ledge counts as standing on it
export const DRAIN_MOVING = 0.13;  // per second
export const DRAIN_HANGING = 0.05; // per second
export const REFILL = 0.6;         // per second
export const SLIDE = 3.2;          // sliding speed, as a multiple of climbing speed

// Ledges on a route: the ground, both sides of every break, and the top landing.
export function ledges(route) {
  return [0, ...GAPS.map((g) => (g.route === route ? g.u - 0.006 : g.u)), 1];
}
export function onLedge(route, u) {
  return u >= 0.985 || ledges(route).some((p) => Math.abs(u - p) <= LEDGE);
}
export function ledgeBelow(route, u) {
  let best = 0;
  for (const p of ledges(route)) if (p < u - LEDGE && p > best) best = p;
  return best;
}
export function nextGrip(grip, moving, resting, dt) {
  const rate = resting ? REFILL : -(moving ? DRAIN_MOVING : DRAIN_HANGING);
  return Math.min(1, Math.max(0, grip + rate * dt));
}

export const atSummit = (u) => u >= SUMMIT;

// Same numbers on every device, so everyone sees the same tower.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
