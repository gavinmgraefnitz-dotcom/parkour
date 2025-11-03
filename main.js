import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

let camera, scene, renderer, controls;
let world, playerBody, floorBody;
let keys = {};
let canJump = false;

// Setup physics
world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

const groundMaterial = new CANNON.Material('ground');
const playerMaterial = new CANNON.Material('player');

const contactMaterial = new CANNON.ContactMaterial(groundMaterial, playerMaterial, {
  friction: 0.0,
  restitution: 0.0,
});
world.addContactMaterial(contactMaterial);

// Setup scene
scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light);

// Player body (invisible)
const playerShape = new CANNON.Sphere(1);
playerBody = new CANNON.Body({
  mass: 5,
  material: playerMaterial,
  shape: playerShape,
  position: new CANNON.Vec3(0, 5, 0),
});
playerBody.linearDamping = 0.9;
world.addBody(playerBody);

// Ground
const floorShape = new CANNON.Plane();
floorBody = new CANNON.Body({
  mass: 0,
  material: groundMaterial,
});
floorBody.addShape(floorShape);
floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floorBody);

const floorMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 100),
  new THREE.MeshLambertMaterial({ color: 0x228B22 })
);
floorMesh.rotation.x = -Math.PI / 2;
scene.add(floorMesh);

// Platforms
const platformGeometry = new THREE.BoxGeometry(5, 0.5, 5);
const platformMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
const platformMesh = new THREE.Mesh(platformGeometry, platformMaterial);
platformMesh.position.set(0, 3, -10);
scene.add(platformMesh);

const platformBody = new CANNON.Body({
  mass: 0,
  material: groundMaterial,
  shape: new CANNON.Box(new CANNON.Vec3(2.5, 0.25, 2.5)),
  position: new CANNON.Vec3(0, 3, -10),
});
world.addBody(platformBody);

// Controls
controls = new PointerLockControls(camera, document.body);
document.addEventListener('click', () => {
  controls.lock();
});

document.addEventListener('keydown', (event) => {
  keys[event.code] = true;
});

document.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

// Detect ground contact
playerBody.addEventListener('collide', (e) => {
  if (Math.abs(e.contact.ni.y) > 0.5) {
    canJump = true;
  }
});

function movePlayer() {
  const velocity = playerBody.velocity;
  const speed = 5; // ← Normal walking speed

  let forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  let right = new THREE.Vector3();
  right.crossVectors(forward, camera.up).normalize();

  if (keys['KeyW']) {
    velocity.x += forward.x * speed * 0.1;
    velocity.z += forward.z * speed * 0.1;
  }
  if (keys['KeyS']) {
    velocity.x -= forward.x * speed * 0.1;
    velocity.z -= forward.z * speed * 0.1;
  }
  if (keys['KeyA']) {
    velocity.x -= right.x * speed * 0.1;
    velocity.z -= right.z * speed * 0.1;
  }
  if (keys['KeyD']) {
    velocity.x += right.x * speed * 0.1;
    velocity.z += right.z * speed * 0.1;
  }

  if (keys['Space'] && canJump) {
    velocity.y = 6; // jump strength
    canJump = false;
  }
}

function animate() {
  requestAnimationFrame(animate);

  movePlayer();
  world.step(1 / 60);

  camera.position.copy(playerBody.position);
  camera.position.y += 1.6; // height of the eyes

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
