import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

// === SCENE ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

// === PHYSICS WORLD ===
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });

// Materials (very low friction so we don’t “stick”)
const slipperyMaterial = new CANNON.Material("slippery");
const contact = new CANNON.ContactMaterial(slipperyMaterial, slipperyMaterial, {
  friction: 0.0, // 🔥 remove ground friction
  restitution: 0.0,
});
world.defaultContactMaterial = contact;

// === GROUND ===
const groundShape = new CANNON.Box(new CANNON.Vec3(10, 0.5, 10));
const groundBody = new CANNON.Body({
  type: CANNON.Body.STATIC,
  shape: groundShape,
  position: new CANNON.Vec3(0, -0.5, 0),
  material: slipperyMaterial,
});
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(
  new THREE.BoxGeometry(20, 1, 20),
  new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
scene.add(groundMesh);

// === PLATFORMS ===
const platforms = [];
const platformBodies = [];
function createPlatform(x, y, z) {
  const shape = new CANNON.Box(new CANNON.Vec3(2, 0.5, 2));
  const body = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape,
    position: new CANNON.Vec3(x, y, z),
    material: slipperyMaterial,
  });
  world.addBody(body);
  platformBodies.push(body);

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(4, 1, 4),
    new THREE.MeshStandardMaterial({ color: 0x0000ff })
  );
  mesh.position.copy(body.position);
  scene.add(mesh);
  platforms.push(mesh);
}

createPlatform(5, 2, 0);
createPlatform(-5, 4, -5);
createPlatform(0, 6, 5);
createPlatform(10, 8, 5);
createPlatform(-10, 10, 0);

// === PLAYER ===
const playerShape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
const playerBody = new CANNON.Body({
  mass: 1,
  shape: playerShape,
  position: new CANNON.Vec3(0, 2, 0),
  material: slipperyMaterial,
});
playerBody.fixedRotation = true;
playerBody.updateMassProperties();
world.addBody(playerBody);

const playerMesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 2, 1),
  new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
scene.add(playerMesh);

// === CONTROLS ===
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

// === MOVEMENT SETTINGS ===
const moveSpeed = 10;   // 🔥 Faster running
const airSpeed = 8;     // Good control mid-air
const jumpSpeed = 9;
const damping = 0.1;

// === GAME LOOP ===
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  world.step(1 / 60, delta, 3);

  // === MOVEMENT ===
  const moveDir = new CANNON.Vec3(0, 0, 0);
  if (keys.w) moveDir.z -= 1;
  if (keys.s) moveDir.z += 1;
  if (keys.a) moveDir.x -= 1;
  if (keys.d) moveDir.x += 1;
  if (moveDir.length() > 0) moveDir.normalize();

  // Check if grounded
  const ray = new CANNON.Ray(playerBody.position, new CANNON.Vec3(0, -1, 0));
  const result = new CANNON.RaycastResult();
  ray.intersectWorld(world, { skipBackfaces: true }, result);
  const onGround = result.hasHit && result.distance <= 1.1;

  // Apply velocity directly instead of impulses
  const desiredSpeed = onGround ? moveSpeed : airSpeed;
  const targetVel = moveDir.scale(desiredSpeed);
  playerBody.velocity.x = targetVel.x;
  playerBody.velocity.z = targetVel.z;

  // Jump
  if (keys.jump && onGround) {
    playerBody.velocity.y = jumpSpeed;
  }
  keys.jump = false;

  // Apply slight drag
  if (onGround && moveDir.length() === 0) {
    playerBody.velocity.x *= 1 - damping;
    playerBody.velocity.z *= 1 - damping;
  }

  // === CAMERA FOLLOW ===
  const camTarget = new THREE.Vector3().copy(playerBody.position);
  const desiredOffset = new THREE.Vector3(0, 4, 10);
  const desiredPos = camTarget.clone().add(desiredOffset);
  camera.position.lerp(desiredPos, delta * 4);
  camera.lookAt(camTarget);

  // === SYNC MESHES ===
  playerMesh.position.copy(playerBody.position);
  groundMesh.position.copy(groundBody.position);
  for (let i = 0; i < platforms.length; i++) {
    platforms[i].position.copy(platformBodies[i].position);
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
