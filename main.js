import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

// === Scene Setup ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === Camera Setup (Yaw + Pitch separation to prevent tilt) ===
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const pitchObject = new THREE.Object3D();
pitchObject.add(camera);
const yawObject = new THREE.Object3D();
yawObject.add(pitchObject);
scene.add(yawObject);

// === Lighting ===
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

// === Physics World ===
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
const material = new CANNON.Material();
world.defaultContactMaterial = new CANNON.ContactMaterial(material, material, {
  friction: 0,
  restitution: 0,
});

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
  const body = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape,
    position: new CANNON.Vec3(x, y, z),
    material,
  });
  world.addBody(body);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1, 4),
    new THREE.MeshStandardMaterial({ color: 0x0000ff })
  );
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

// === Hands (smaller, better positioned) ===
const hands = new THREE.Group();
camera.add(hands);

const handMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });

const leftHand = new THREE.Mesh(
  new THREE.BoxGeometry(0.15, 0.4, 0.15),
  handMaterial
);
leftHand.position.set(-0.2, -0.4, -0.5);
hands.add(leftHand);

const rightHand = new THREE.Mesh(
  new THREE.BoxGeometry(0.15, 0.4, 0.15),
  handMaterial
);
rightHand.position.set(0.2, -0.4, -0.5);
hands.add(rightHand);

// === Input Handling ===
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
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)); // clamp look
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

// === Camera & Hand Bob (with jump/land bounce) ===
let bobTime = 0;
let jumpOffset = 0;

function applyCameraBob(delta, moving) {
  bobTime += delta * (moving ? 6 : 2);
  const bobOffset = moving ? Math.sin(bobTime) * 0.05 : 0;

  // Bounce hands & camera when jumping/falling
  const targetJumpOffset = -playerBody.velocity.y * 0.02;
  jumpOffset += (targetJumpOffset - jumpOffset) * 0.1;

  camera.position.y = 1.6 + bobOffset + jumpOffset;
  hands.position.y = -0.4 + jumpOffset * 1.5;
  hands.rotation.x = moving
    ? Math.sin(bobTime * 1.5) * 0.05 + jumpOffset * 0.3
    : jumpOffset * 0.3;
  hands.rotation.y = moving ? Math.sin(bobTime) * 0.1 : 0;
}

// === Main Loop ===
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  world.step(1 / 60, delta, 3);

  const grounded = isGrounded();

  // Camera rotation objects
  yawObject.rotation.y = yaw;
  pitchObject.rotation.x = pitch;

  // Movement relative to camera yaw
  const forward = new CANNON.Vec3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new CANNON.Vec3(Math.cos(yaw), 0, -Math.sin(yaw));

  const moveDir = new CANNON.Vec3(0, 0, 0);
  if (keys.w) moveDir.vadd(forward, moveDir);
  if (keys.s) moveDir.vsub(forward, moveDir);
  if (keys.a) moveDir.vsub(right, moveDir);
  if (keys.d) moveDir.vadd(right, moveDir);

  if (moveDir.length() > 0) moveDir.normalize();

  const desired = moveDir.scale(moveSpeed);
  playerBody.velocity.x += (desired.x - playerBody.velocity.x) * 0.2;
  playerBody.velocity.z += (desired.z - playerBody.velocity.z) * 0.2;

  if (keys.jump && grounded) {
    playerBody.velocity.y = jumpSpeed;
    keys.jump = false;
  }

  if (moveDir.length() === 0) {
    playerBody.velocity.x *= 1 - damping;
    playerBody.velocity.z *= 1 - damping;
  }

  // Camera follows player
  yawObject.position.copy(playerBody.position);
  yawObject.position.y += 1.6;

  applyCameraBob(delta, moveDir.length() > 0 && grounded);

  renderer.render(scene, camera);
}

animate();

// === Resize Handling ===
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
