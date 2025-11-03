import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

// === Setup Scene ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// === Renderer ===
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === Camera ===
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// === Lighting ===
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(10, 10, 5);
scene.add(dirLight);

// === Physics ===
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });

// Materials
const playerMat = new CANNON.Material();
const groundMat = new CANNON.Material();
world.addContactMaterial(new CANNON.ContactMaterial(playerMat, groundMat, { friction: 0, restitution: 0 }));

// === Ground ===
const groundShape = new CANNON.Box(new CANNON.Vec3(10, 0.5, 10));
const groundBody = new CANNON.Body({ mass: 0, shape: groundShape, material: groundMat });
groundBody.position.set(0, -0.5, 0);
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(
  new THREE.BoxGeometry(20, 1, 20),
  new THREE.MeshStandardMaterial({ color: 0x228B22 })
);
groundMesh.position.copy(groundBody.position);
scene.add(groundMesh);

// === Platforms ===
function addPlatform(x, y, z) {
  const shape = new CANNON.Box(new CANNON.Vec3(2, 0.25, 2));
  const body = new CANNON.Body({ mass: 0, shape, material: groundMat });
  body.position.set(x, y, z);
  world.addBody(body);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(4, 0.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x0000ff })
  );
  mesh.position.copy(body.position);
  scene.add(mesh);
}
addPlatform(5, 2, 0);
addPlatform(-5, 4, -5);
addPlatform(0, 6, 5);

// === Player ===
const playerShape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
const playerBody = new CANNON.Body({ mass: 1, shape: playerShape, material: playerMat });
playerBody.position.set(0, 2, 0);
playerBody.fixedRotation = true;
world.addBody(playerBody);

// === Hands (visual only) ===
const hands = new THREE.Group();
camera.add(hands);
const handMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), handMat);
const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), handMat);
leftHand.position.set(-0.2, -0.3, -0.5);
rightHand.position.set(0.2, -0.3, -0.5);
hands.add(leftHand, rightHand);

// === Input ===
const keys = { w: false, a: false, s: false, d: false, space: false };
window.addEventListener("keydown", e => { if (e.key in keys) keys[e.key] = true; });
window.addEventListener("keyup", e => { if (e.key in keys) keys[e.key] = false; });

// === Mouse Look ===
let yaw = 0, pitch = 0;
const sensitivity = 0.002;
document.body.addEventListener("click", () => document.body.requestPointerLock());
document.addEventListener("mousemove", e => {
  if (document.pointerLockElement === document.body) {
    yaw -= e.movementX * sensitivity;
    pitch -= e.movementY * sensitivity;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
  }
});

// === Jump Detection ===
let canJump = false;
playerBody.addEventListener("collide", e => {
  if (e.contact.ni.y > 0.5) canJump = true;
});

// === Movement Settings ===
const moveSpeed = 100; // reduced from 200
const jumpPower = 6;

// === Animation Loop ===
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  world.step(1 / 60, delta, 3);

  // --- Movement ---
  const forward = new CANNON.Vec3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new CANNON.Vec3(Math.cos(yaw), 0, -Math.sin(yaw));
  const moveDir = new CANNON.Vec3(0, 0, 0);
  if (keys.w) moveDir.vadd(forward, moveDir);
  if (keys.s) moveDir.vsub(forward, moveDir);
  if (keys.a) moveDir.vsub(right, moveDir);
  if (keys.d) moveDir.vadd(right, moveDir);
  if (moveDir.length() > 0) {
    moveDir.normalize();
    playerBody.applyForce(moveDir.scale(moveSpeed), playerBody.position);
  }

  // --- Jump ---
  if (keys.space && canJump) {
    playerBody.velocity.y = jumpPower;
    canJump = false;
  }

  // --- Camera ---
  camera.rotation.set(pitch, yaw, 0); // lock roll to 0
  camera.position.copy(playerBody.position);
  camera.position.y += 1.6; // camera height follows player

  renderer.render(scene, camera);
}
animate();

// === Resize ===
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
