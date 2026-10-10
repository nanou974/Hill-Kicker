// Visionneuse interactive des 20 véhicules (glisser pour tourner autour, molette ou pincement pour zoomer).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { car, CARS, ORDER, mat, carEnvironment } from '../src/assets3d.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const view = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
view.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
carEnvironment(renderer);
scene.add(new THREE.HemisphereLight(0xDDF1FF, 0x6A7ACA, 1.2));
const sun = new THREE.DirectionalLight(0xFFF4DE, 2.4);
sun.position.set(-6, 12, -4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 });
scene.add(sun);

const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.25, 64), mat(0xFFFFFF, { r: 0.4, flat: false }));
disc.position.y = -0.13; disc.receiveShadow = true; scene.add(disc);

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(-6.5, 3.6, -5.2);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.8, 0); controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 1.2;
controls.minDistance = 4; controls.maxDistance = 16; controls.maxPolarAngle = Math.PI / 2.05;

let current = null;
function show(key) {
  if (current) scene.remove(current);
  current = car(key); scene.add(current);
  document.getElementById('name').textContent = CARS[key].name;
  document.querySelectorAll('#bar button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.key === key)));
}

const bar = document.getElementById('bar');
for (const key of ORDER) {
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.key = key; b.textContent = CARS[key].name;
  b.addEventListener('click', () => show(key));
  bar.appendChild(b);
}

function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
show(ORDER[0]);
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
