import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { samplePhrase, BONES } from './motion.js';
import { buildFloor, countParts, FLOOR_HEIGHT } from './generate.js';

const H = FLOOR_HEIGHT;
const START_FLOORS = 9;
const $ = (id) => document.getElementById(id);

// ---------- scene ----------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0a0d);
scene.fog = new THREE.Fog(0x0b0a0d, 16, 55);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
camera.position.set(8.5, 2.6, 8.5);

const controls = new OrbitControls(camera, canvas);
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = true;
controls.minPolarAngle = 0.95;
controls.maxPolarAngle = 1.8;
controls.target.set(0, 1.5, 0);

scene.add(new THREE.HemisphereLight(0xb9c6ff, 0x2a1c10, 1.1));
const sun = new THREE.DirectionalLight(0xffe2b8, 1.6);
sun.position.set(8, 14, 6);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.CylinderGeometry(60, 60, 0.2, 64),
  new THREE.MeshStandardMaterial({ color: 0x15120f, roughness: 1 }),
);
ground.position.y = -0.3;
scene.add(ground);

// ---------- tower ----------
const floors = []; // { group, phrase, figure, window:[t0,t1], offset }
const pickables = [];

function makeFigure() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BONES.length * 6), 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffffff }));
  lines.frustumCulled = false;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  lines.add(head);
  return { lines, head, geo };
}

function poseFigure(fig, frame) {
  const arr = fig.geo.attributes.position.array;
  let k = 0;
  for (const [a, b] of BONES) {
    const A = frame.joints[a], B = frame.joints[b];
    arr[k++] = A[0]; arr[k++] = A[1]; arr[k++] = A[2];
    arr[k++] = B[0]; arr[k++] = B[1]; arr[k++] = B[2];
  }
  fig.geo.attributes.position.needsUpdate = true;
  const h = frame.joints.head;
  fig.head.position.set(h[0], h[1], h[2]);
}

function addFloor(phrase) {
  const index = floors.length;
  const group = buildFloor(THREE, phrase, index);
  group.position.y = index * H;
  scene.add(group);

  const figure = makeFigure();
  group.add(figure.lines);

  const lamp = new THREE.PointLight(new THREE.Color().setHSL((0.07 + index * 0.11) % 1, 0.7, 0.6), 22, 10, 2);
  lamp.position.set(0, H - 0.5, 0);
  group.add(lamp);

  for (const c of group.children) if (c.userData.explain) pickables.push(c);
  floors.push({ group, phrase, figure, window: [0, phrase.seconds], offset: Math.random() * phrase.seconds });
  updateHud();
  return index;
}

function updateHud() {
  let human = 0, fallback = 0;
  for (const f of floors) { const c = countParts(f.group); human += c.human; fallback += c.fallback; }
  $('hud').innerHTML = `<b>${floors.length}</b> floors · <b>${human}</b> parts made by a body · <b>${fallback}</b> defaults`;
}

for (let i = 0; i < START_FLOORS; i++) addFloor(samplePhrase(i + 1));

// ---------- climbing ----------
let climb = 1.5;          // where the camera is looking (height)
let wrapping = false;
const topY = () => floors.length * H;

function shiftView(dy) { controls.target.y += dy; camera.position.y += dy; }

function wrapTo(y) {
  // Climb through the top and you arrive at the ground again.
  wrapping = true;
  $('fade').classList.add('on');
  setTimeout(() => {
    shiftView(y - controls.target.y);
    climb = y;
    $('fade').classList.remove('on');
    setTimeout(() => { wrapping = false; }, 450);
  }, 480);
}

function setClimb(y) {
  if (wrapping) return;
  if (y > topY() + 1.2) return wrapTo(1.5);
  if (y < -0.8) return wrapTo(topY() - 1.5);
  climb = y;
}

function zoomBy(factor) {
  const off = camera.position.clone().sub(controls.target);
  const len = THREE.MathUtils.clamp(off.length() * factor, 3, 40);
  camera.position.copy(controls.target).add(off.setLength(len));
}

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (e.shiftKey || e.ctrlKey) zoomBy(1 + Math.sign(e.deltaY || e.deltaX) * 0.06);
  else setClimb(climb - e.deltaY * 0.004);
}, { passive: false });

addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') setClimb(climb + H);
  if (e.key === 'ArrowDown') setClimb(climb - H);
  if (e.key === '+' || e.key === '=') zoomBy(0.9);
  if (e.key === '-') zoomBy(1.1);
  if (e.key === 'Escape') select(null);
});
$('up').onclick = () => setClimb(climb + H);
$('down').onclick = () => setClimb(climb - H);
$('add').onclick = () => {
  const i = addFloor(samplePhrase(floors.length + 1 + Math.floor(Math.random() * 1000)));
  climb = i * H + 1.5;
};

// ---------- asking "why is this here?" ----------
const raycaster = new THREE.Raycaster();
let selected = null;
let down = null;

canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  const r = canvas.getBoundingClientRect();
  const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(p, camera);
  const hit = raycaster.intersectObjects(pickables, false)[0];
  select(hit ? hit.object : null);
});

function select(mesh) {
  if (selected) {
    selected.material.emissive.copy(selected.userData.prevEmissive);
    selected.material.emissiveIntensity = selected.userData.prevIntensity;
  }
  selected = mesh;
  for (const f of floors) f.window = [0, f.phrase.seconds];
  if (!mesh) { $('panel').hidden = true; return; }

  mesh.userData.prevEmissive = mesh.material.emissive.clone();
  mesh.userData.prevIntensity = mesh.material.emissiveIntensity;
  mesh.material.emissive.set(0xffffff);
  mesh.material.emissiveIntensity = 0.85;

  const x = mesh.userData.explain;
  $('p-eyebrow').textContent = `Floor ${x.floor}`;
  $('p-title').textContent = x.title;
  $('p-tag').hidden = x.human;
  $('p-by').textContent = x.by;
  $('p-when').textContent = x.when ? `${x.when[0].toFixed(1)}s to ${x.when[1].toFixed(1)}s of this floor's phrase` : 'never';
  $('p-rule').textContent = x.rule;
  $('p-detail').textContent = x.detail;
  $('p-replay').hidden = !x.when;
  $('panel').hidden = false;
  if (x.when) replay();
}

function replay() {
  if (!selected || !selected.userData.explain.when) return;
  const f = floors[selected.userData.explain.floor - 1];
  f.window = [...selected.userData.explain.when];
  f.offset = -performance.now() / 1000; // restart the loop at the start of the window
}
$('p-replay').onclick = replay;
$('p-close').onclick = () => select(null);

// ---------- loop ----------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

renderer.setAnimationLoop(() => {
  const now = performance.now() / 1000;
  shiftView((climb - controls.target.y) * 0.1);
  controls.update();
  for (const f of floors) {
    const [t0, t1] = f.window;
    const span = Math.max(0.2, t1 - t0);
    const t = t0 + ((((now + f.offset) % span) + span) % span);
    const i = Math.min(f.phrase.frames.length - 1, Math.floor(t * f.phrase.fps));
    poseFigure(f.figure, f.phrase.frames[i]);
  }
  renderer.render(scene, camera);
});
