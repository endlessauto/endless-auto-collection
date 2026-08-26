import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const CDN = 'https://cdn.jsdelivr.net/gh/kidscancode/3d_car_sphere@main/assets/kenney_car_kit/';
export const CARS = [
  { id: 'sedan', file: 'models/sedan.glb', cdn: CDN + 'sedan.glb', label: 'Sedan', note: 'Daily four-door' },
  { id: 'sedan-sports', file: 'models/sedan-sports.glb', cdn: CDN + 'sedanSports.glb', label: 'Sports sedan', note: 'Lower stance' },
  { id: 'hatchback-sports', file: 'models/hatchback-sports.glb', cdn: CDN + 'hatchbackSports.glb', label: 'Hatchback', note: 'Compact hatch' },
  { id: 'race', file: 'models/race.glb', cdn: CDN + 'race.glb', label: 'Race coupe', note: 'Track body' },
  { id: 'suv', file: 'models/suv.glb', cdn: CDN + 'suv.glb', label: 'SUV', note: 'Crossover height' },
  { id: 'suv-luxury', file: 'models/suv-luxury.glb', cdn: CDN + 'suvLuxury.glb', label: 'Luxury SUV', note: 'Tall body' }
];

const SKIP = /wheel|tire|rim|glass|window|light|lamp|interior|seat|steering|brake|caliper|disc|hub/i;

function makeAsphaltTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b1b1d';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 18 + Math.random() * 30;
    ctx.fillStyle = `rgba(${v},${v},${v + 2},${0.25 + Math.random() * 0.35})`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  const laneW = size * 0.05;
  const dashLen = size * 0.09;
  const gapLen = size * 0.07;
  ctx.fillStyle = 'rgba(232,224,204,0.85)';
  for (let y = -dashLen; y < size + dashLen; y += dashLen + gapLen) {
    ctx.fillRect(size / 2 - laneW / 2, y, laneW, dashLen);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.3, 4);
  tex.anisotropy = 4;
  return tex;
}

export function finishToMaterial(finish) {
  const family = finish.family || 'gloss';
  const color = new THREE.Color(finish.hex || '#111111');
  const mat = {
    color,
    map: null,
    roughness: 0.28,
    metalness: 0.18,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
    iridescence: 0,
    iridescenceIOR: 1.3,
    envMapIntensity: 1.15
  };
  if (family === 'gloss') {
    mat.roughness = 0.12; mat.clearcoat = 1; mat.clearcoatRoughness = 0.04; mat.metalness = 0.12;
  } else if (family === 'satin') {
    mat.roughness = 0.42; mat.clearcoat = 0.28; mat.clearcoatRoughness = 0.32; mat.metalness = 0.16;
  } else if (family === 'matte') {
    mat.roughness = 0.88; mat.clearcoat = 0; mat.metalness = 0.04; mat.envMapIntensity = 0.35;
  } else if (family === 'metallic') {
    mat.roughness = 0.22; mat.metalness = 0.72; mat.clearcoat = 0.55;
  } else if (family === 'shift') {
    mat.roughness = 0.18; mat.metalness = 0.45; mat.iridescence = 1; mat.iridescenceIOR = 1.5; mat.clearcoat = 0.8;
  } else if (family === 'chrome') {
    mat.roughness = 0.05; mat.metalness = 1; mat.clearcoat = 1; mat.clearcoatRoughness = 0.02; mat.envMapIntensity = 1.7;
  } else if (family === 'texture') {
    mat.roughness = 0.55; mat.metalness = 0.55; mat.clearcoat = 0.15;
  }
  return mat;
}

function isPaintMesh(mesh) {
  const n = (mesh.name || '') + ' ' + ((mesh.parent && mesh.parent.name) || '');
  if (SKIP.test(n)) return false;
  const mat = mesh.material;
  if (!mat) return false;
  const mats = Array.isArray(mat) ? mat : [mat];
  return mats.some((m) => {
    const name = (m.name || '').toLowerCase();
    if (/rubber|tire|wheel|glass/.test(name)) return false;
    return true;
  });
}

function frameObject(obj, camera, controls) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const max = Math.max(size.x, size.y, size.z) || 1;
  camera.position.set(center.x + max * 1.6, center.y + max * 0.7, center.z + max * 1.8);
  controls.target.copy(center);
  controls.update();
}

export function createWrapStudio(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070707);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 80);

  const env = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.04).texture;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(6, 10, 4);
  key.castShadow = true;
  scene.add(key);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(10, 48),
    new THREE.MeshStandardMaterial({ map: makeAsphaltTexture(), roughness: 0.92, metalness: 0.05 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.06;
  controls.minDistance = 2;
  controls.maxDistance = 18;

  const loader = new GLTFLoader();
  const cache = new Map();
  let car = new THREE.Group();
  scene.add(car);
  let currentFinish = { family: 'gloss', hex: '#c8102e', name: 'Gloss Racing Red' };

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || 420;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  function applyToCar(finish) {
    currentFinish = finish;
    const params = finishToMaterial(finish);
    car.traverse((obj) => {
      if (!obj.isMesh || !obj.userData.wrapPaint) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        Object.assign(m, params);
        m.color = params.color.clone();
        m.map = null;
        m.needsUpdate = true;
      });
    });
  }

  function mountModel(gltf) {
    scene.remove(car);
    car = gltf.scene.clone(true);
    car.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const paint = isPaintMesh(obj);
      obj.userData.wrapPaint = paint;
      if (paint) {
        const src = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        obj.material = new THREE.MeshPhysicalMaterial({
          color: src && src.color ? src.color.clone() : new THREE.Color('#888')
        });
      }
    });
    const box = new THREE.Box3().setFromObject(car);
    const size = box.getSize(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z) || 1;
    car.scale.setScalar(3.4 / max);
    box.setFromObject(car);
    const c = box.getCenter(new THREE.Vector3());
    car.position.sub(c);
    car.position.y -= new THREE.Box3().setFromObject(car).min.y;
    scene.add(car);
    frameObject(car, camera, controls);
    applyToCar(currentFinish);
  }

  async function loadCar(id) {
    const spec = CARS.find((c) => c.id === id) || CARS[0];
    if (!cache.has(spec.id)) {
      cache.set(spec.id, loader.loadAsync(spec.file).catch(() => loader.loadAsync(spec.cdn)));
    }
    const gltf = await cache.get(spec.id);
    mountModel(gltf);
    return spec;
  }

  function tick() {
    requestAnimationFrame(tick);
    car.rotation.y += 0.004;
    controls.update();
    renderer.render(scene, camera);
  }
  tick();

  return { cars: CARS, loadCar, applyFinish: applyToCar, resize };
}
