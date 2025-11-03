// main.js - Minimal, tested first-person + Cannon-es
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

// --- Scene & Renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Camera & playerYaw (yaw parent to avoid camera roll) ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 1000);
const playerYaw = new THREE.Object3D();
playerYaw.add(camera);
scene.add(playerYaw);
const HEAD_HEIGHT = 1.6;
camera.position.set(0, HEAD_HEIGHT, 0);

// --- Lights ---
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(10, 20, 10);
scene.add(dir);

// --- Physics world ---
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;

// Materials (low friction)
const playerMaterial = new CANNON.Material();
const groundMaterial = new CANNON.Material();
const contact = new CANNON.ContactMaterial(playerMaterial, groundMaterial, { friction: 0.0, restitution: 0.0 });
world.addContactMaterial(contact);
world.defaultContactMaterial = contact;

// --- Ground ---
const groundShape = new CANNON.Box(new CANNON.Vec3(10, 0.5, 10));
const groundBody = new CANNON.Body({ mass: 0, shape: groundShape, material: groundMaterial });
groundBody.position.set(0, -0.5, 0);
world.addBody(groundBody);
const groundMesh = new THREE.Mesh(new THREE.BoxGeometry(20, 1, 20), new THREE.MeshStandardMaterial({ color: 0x00aa00 }));
groundMesh.position.copy(groundBody.position);
scene.add(groundMesh);

// --- Simple platforms ---
function makePlatform(x, y, z) {
  const shape = new CANNON.Box(new CANNON.Vec3(2, 0.25, 2));
  const body = new CANNON.Body({ mass: 0, shape, material: groundMaterial });
  body.position.set(x, y, z);
  world.addBody(body);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 4), new THREE.MeshStandardMaterial({ color: 0x0000ff }));
  mesh.position.copy(body.position);
  scene.add(mesh);
}
makePlatform(5, 2, 0);
makePlatform(-5, 4, -5);
makePlatform(0, 6, 5);

// --- Player physics body ---
const playerShape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5)); // width, halfheight, depth
const playerBody = new CANNON.Body({ mass: 1, shape: playerShape, material: playerMaterial });
playerBody.position.set(0, 2, 0);
playerBody.fixedRotation = true; // prevents tipping over
playerBody.linearDamping = 0.1;
playerBody.updateMassProperties();
world.addBody(playerBody);

// --- Simple hands (visual) ---
const hands = new THREE.Group();
camera.add(hands);
const handMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), handMat);
const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.12), handMat);
leftHand.position.set(-0.18, -0.35, -0.45);
rightHand.position.set(0.18, -0.35, -0.45);
hands.add(leftHand, rightHand);

// --- Input handling (use e.code) ---
const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false, Space: false };
window.addEventListener("keydown", (e) => { if (e.code in keys) keys[e.code] = true; });
window.addEventListener("keyup",   (e) => { if (e.code in keys) keys[e.code] = false; });

// --- Mouse look: yaw on playerYaw, pitch on camera; lock roll to 0 ---
let pitch = 0;
const sensitivity = 0.002;
document.body.addEventListener("click", () => document.body.requestPointerLock());
document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === document.body) {
    playerYaw.rotation.y -= e.movementX * sensitivity; // yaw
    pitch -= e.movementY * sensitivity;                // pitch
    pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
    camera.rotation.x = pitch;
    camera.rotation.z = 0; // enforce no roll
  }
});

// --- Jump detection ---
let canJump = false;
playerBody.addEventListener("collide", (ev) => {
  // contact normal in world frame, check if collision came from below
  if (ev.contact && ev.contact.ni && ev.contact.ni.y > 0.5) canJump = true;
});

// --- Movement parameters ---
const MOVE_SPEED = 5;    // horizontal speed (tweak this)
const JUMP_SPEED = 6;

// --- Simple bob (tiny) ---
let bobTime = 0;
function applyBobbing(moving, delta) {
  bobTime += delta * (moving ? 6 : 2);
  const bob = moving ? Math.sin(bobTime) * 0.025 : 0;
  // hands relative to camera
  hands.position.y = -0.35 + bob;
  hands.rotation.x = moving ? Math.sin(bobTime * 1.5) * 0.03 : 0;
}

// --- Render loop ---
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // step physics
  world.step(1 / 60, dt, 3);

  // build forward/right from playerYaw rotation (Three.Vector3, world space)
  const yaw = playerYaw.rotation.y;
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

  // movement direction
  const move = new THREE.Vector3();
  if (keys.KeyW) move.add(forward);
  if (keys.KeyS) move.add(forward.clone().negate());
  if (keys.KeyA) move.add(right.clone().negate());
  if (keys.KeyD) move.add(right);

  const moving = move.lengthSq() > 0;
  if (moving) move.normalize();

  // preserve vertical velocity, compute desired horizontal velocity, assign directly
  const vy = playerBody.velocity.y;
  const desiredVX = move.x * MOVE_SPEED;
  const desiredVZ = move.z * MOVE_SPEED;

  // smooth toward desired horizontal velocity to avoid snappy jitter (lerp factor)
  const LERP = 0.4;
  playerBody.velocity.x += (desiredVX - playerBody.velocity.x) * LERP;
  playerBody.velocity.z += (desiredVZ - playerBody.velocity.z) * LERP;
  playerBody.velocity.y = vy; // ensure we don't stomp Y

  // jump
  if (keys.Space && canJump) {
    playerBody.velocity.y = JUMP_SPEED;
    canJump = false;
  }

  // Camera follows player body position (including jump) and respects yaw/pitch; lock roll
  playerYaw.position.set(playerBody.position.x, playerBody.position.y, playerBody.position.z);
  camera.position.set(0, HEAD_HEIGHT, 0); // camera is child of playerYaw, so local pos
  camera.rotation.z = 0; // enforce no roll

  // apply small bob to hands
  applyBobbing(moving, dt);

  // render
  renderer.render(scene, camera);
}
animate();

// --- Resize handler ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
