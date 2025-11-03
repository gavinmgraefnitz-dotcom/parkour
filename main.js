import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

// === Scene & Camera ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === Light ===
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

// === Physics ===
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
const material = new CANNON.Material();
world.defaultContactMaterial = new CANNON.ContactMaterial(material, material, { friction: 0, restitution: 0 });

// === Ground ===
const groundShape = new CANNON.Box(new CANNON.Vec3(10, 0.5, 10));
const groundBody = new CANNON.Body({ mass: 0, shape: groundShape, material });
groundBody.position.set(0, -0.5, 0);
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(
  new THREE.BoxGeometry(20, 1, 20),
  new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
scene.add(groundMesh);

// === Platforms ===
function makePlatform(x, y, z) {
  const shape = new CANNON.Box(new CANNON.Vec3(2, 0.5, 2));
  const body = new CANNON.Body({ type: CANNON.Body.STATIC, shape, position: new CANNON.Vec3(x, y, z), material });
  world.addBody(body);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 4), new THREE.MeshStandardMaterial({ color: 0x0000ff }));
  mesh.position.copy(body.position);
  scene.add(mesh);
}

makePlatform(5, 2, 0);
makePlatform(-5, 4, -5);
makePlatform(0, 6, 5);
makePlatform(10, 8, 5);
makePlatform(-10, 10, 0);

// === Player Body ===
const playerShape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
const playerBody = new CANNON.Body({ mass: 1, shape: playerShape, material });
playerBody.position.set(0, 2, 0);
playerBody.fixedRotation = true;
playerBody.updateMassProperties();
world.addBody(playerBody);

// === Hands ===
const hands = new THREE.Group();
camera.add(hands);

const leftHand = new THREE.Mesh(
  new THREE.BoxGeometry(0.3, 0.8, 0.3),
  new THREE.MeshStandardMaterial({ color: 0xffcc99 })
);
leftHand.position.set(-0.35, -0.5, -0.5);
hands.add(leftHand);

const rightHand = new THREE.Mesh(
  new THREE.BoxGeometry(0.3, 0.8, 0.3),
  new THREE.MeshStandardMaterial({ color: 0xffcc99 })
);
rightHand.position.set(0.35, -0.5, -0.5);
hands.add(rightHand);

// === Controls ===
const keys = { w: false, a: false, s: false, d: false, jump: false };
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyW") keys.w = true;
  if (e.code === "KeyA") keys.a = true;
  if (e.code === "KeyS") keys.s = true;
  if (e.code === "KeyD") keys.d = true;
  if (e.code === "Space") keys.jump = true;
});
window.addEventListener("keyup", (e) => {
  if (e.code === "KeyW") keys.w = false;
  if (e.code === "KeyA") keys.a = false;
  if (e.code === "KeyS") keys.s = false;
  if (e.code === "KeyD") keys.d = false;
  if (e.code === "Space") keys.jump = false;
});

// === Mouse Look ===
let yaw = 0;
let pitch = 0;
const sensitivity = 0.002;

document.body.addEventListener("click", () => document.body.requestPointerLock());

document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === document.body) {
    yaw -= e.movementX * sensitivity;
    pitch -= e.movementY * sensitivity;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)); // clamp up/down look
  }
});

// === Movement Settings ===
const moveSpeed = 15;
const jumpSpeed = 9;
const damping = 0.1;

// === Ground Check ===
function isGrounded() {
  for (let c of world.contacts) {
    if (c.bi === playerBody || c.bj === playerBody) {
      const n = c.ni.clone();
      if (c.bi === playerBody) n.negate(n);
      if (n.y > 0.5) return true;
    }
  }
  return false;
}

// === Camera Bob & Hand Sway ===
let bobTime = 0;
function applyCameraBob(delta, moving) {
  bobTime += delta * (moving ? 6 : 2);
  const bobOffset = moving ? Math.sin(bobTime) * 0.05 : 0;
  camera.position.y = playerBody.position.y + 1.6 + bobOffset;

  hands.rotation.x = moving ? Math.sin(bobTime * 1.5) * 0.05 : 0;
  hands.rotation.y = moving ? Math.sin(bobTime) * 0.1 : 0;
}

// === Game Loop ===
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  world.step(1 / 60, delta, 3);

  const grounded = isGrounded();

  // === Directional movement relative to camera yaw ===
  const forward = new CANNON.Vec3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new CANNON.Vec3(Math.cos(yaw), 0, -Math.sin(yaw));

  const moveDir = new CANNON.Vec3(0, 0, 0);
  if (keys.w) moveDir.vadd(forward, moveDir);
  if (keys.s) moveDir.vsub(forward, moveDir);
  if (keys.a) moveDir.vsub(right, moveDir);
  if (keys.d) moveDir.vadd(right, moveDir);

  if (moveDir.length() > 0) moveDir.normalize();

  // Apply movement smoothly
  const desired = moveDir.scale(moveSpeed);
  playerBody.velocity.x += (desired.x - playerBody.velocity.x) * 0.2;
  playerBody.velocity.z += (desired.z - playerBody.velocity.z) * 0.2;

  if (keys.jump && grounded) {
    playerBody.velocity.y = jumpSpeed;
    keys.jump = false;
  }

  // Damping when idle
  if (moveDir.length() === 0) {
    playerBody.velocity.x *= 1 - damping;
    playerBody.velocity.z *= 1 - damping;
  }

  // Camera follow
  camera.position.x = playerBody.position.x;
  camera.position.z = playerBody.position.z;
  camera.rotation.set(pitch, yaw, 0); // no roll (z = 0)

  // Camera bob + hands sway
  applyCameraBob(delta, moveDir.length() > 0 && grounded);

  renderer.render(scene, camera);
}

animate();

// === Resize ===
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
