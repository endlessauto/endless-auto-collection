import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.168.0/examples/jsm/controls/OrbitControls.js';
const MODE = window.PPF_MODE === 'front' ? 'front' : 'full';
const wrap = document.getElementById('ppf-stage');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070707);
scene.fog = new THREE.Fog(0x070707, 12, 28);
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
camera.position.set(5.2, 2.1, 6.4);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
wrap.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.7, 0);
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 4;
controls.maxDistance = 12;
scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x1a1a1a, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.6);
key.position.set(6, 8, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0x00f5ff, 0.35);
rim.position.set(-6, 3, -4);
scene.add(rim);
const ground = new THREE.Mesh(new THREE.CircleGeometry(18, 64), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const paint = new THREE.MeshPhysicalMaterial({ color: 0x1a1d22, metalness: 0.7, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
const film = new THREE.MeshPhysicalMaterial({ color: 0xb8eaff, metalness: 0.05, roughness: 0.12, transmission: 0.55, thickness: 0.4, transparent: true, opacity: 0, clearcoat: 1 });
function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  scene.add(m);
  return m;
}
box(4.2, 0.85, 1.9, paint, 0, 0.55, 0);
box(2.2, 0.7, 1.7, paint, -0.15, 1.2, 0);
box(1.35, 0.12, 1.7, paint, 1.35, 0.92, 0);
box(0.35, 0.4, 1.85, paint, 2.2, 0.45, 0);
box(0.28, 0.38, 1.8, paint, -2.15, 0.45, 0);
[[1.35, 0.32, 0.82], [1.35, 0.32, -0.82], [-1.35, 0.32, 0.82], [-1.35, 0.32, -0.82]].forEach(([x, y, z]) => {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 24), new THREE.MeshStandardMaterial({ color: 0x111 }));
  t.rotation.z = Math.PI / 2;
  t.position.set(x, y, z);
  scene.add(t);
});
const filmParts = [];
function addFilm(w, h, d, x, y, z) {
  const m = box(w, h, d, film.clone(), x, y, z);
  m.material.opacity = 0;
  filmParts.push(m);
}
addFilm(1.35, 0.13, 1.72, 1.35, 0.99, 0);
addFilm(0.36, 0.42, 1.88, 2.2, 0.52, 0);
if (MODE === 'full') {
  addFilm(4.22, 0.86, 1.92, 0, 0.56, 0);
  addFilm(2.22, 0.72, 1.72, -0.15, 1.21, 0);
}
let start = performance.now();
function resize() {
  const w = wrap.clientWidth, h = wrap.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();
function tick(now) {
  const t = (now - start) / 1000;
  const reveal = Math.min(1, Math.max(0, (t - 0.4) / 2.2));
  filmParts.forEach((m, i) => { m.material.opacity = reveal * (MODE === 'front' ? 0.72 : 0.55); });
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
document.getElementById('replay-wrap')?.addEventListener('click', () => { start = performance.now(); });
