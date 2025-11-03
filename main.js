import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === LIGHTING ===
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

// === PHYSICS WORLD ===
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// === PLAYER BODY ===
const playerShape = new CANNON.Sphere(0.5);
const playerBody = new CANNON.Body({
  mass: 1,
  shape: playerShape,
  position: new CANNON.Vec3(0, 3, 0),
  material: new CANNON.Material({ friction: 0 })
});
world.addBody(playerBody);

// === FLOOR ===
const groundMaterial = new CANNON.Material();
const groundBody = new CANNON.Body({
  mass: 0,
  material: groundMaterial,
  shape: new CANNON.Plane(),
});
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(groundBody);

// === PLATFORM EXAMPLE ===
const platformGeometry = new THREE.BoxGeometry(5, 0.5, 5);
const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
for (let i = 0; i < 5; i++) {
  const mesh = new THREE.Mesh(platformGeometry, platformMaterial);
  mesh.position.set(i * 8, Math.random() * 5 + 1, 0);
  scene.add(mesh);
  const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(2.5, 0.25, 2.5)) });
  body.position.copy(mesh.position);
  world.addBody(body);
}

// === HANDS ===
const handGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.4);
const handMaterial = new THREE.MeshStandardMaterial({ color: 0xffa07a });
const hands = new THREE.Group();
const leftHand = new THREE.Mesh(handGeometry, handMaterial);
const rightHand = new THREE.Mesh(handGeometry, handMaterial);
leftHand.position.set(-0.2, -0.4, -0.5);
rightHand.position.set(0.2, -0.4, -0.5);
hands.add(leftHand);
hands.add(rightHand);
camera.add(hands);
scene.add(camera);

// === LANDING MARKER ===
const markerGeometry = new THREE.CircleGeometry(0.3, 16);
const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
const landingMarker = new THREE.Mesh(markerGeometry, markerMaterial);
landingMarker.rotation.x = -Math.PI / 2;
scene.add(landingMarker);

// === CAMERA CONTROL ===
let pitch = 0;
let yaw = 0;
const sensitivity = 0.002;
document.body.addEventListener("click", () => document.body.requestPointerLock());
document.addEventListener("mousemove", e => {
  if (document.pointerLockElement === document.body) {
    yaw -= e.movementX * sensitivity;
    pitch -= e.movementY * sensitivity;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch)); // clamp up/down
  }
});

// === INPUT ===
const keys = {};
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

// === MOVEMENT ===
const speed = 10;
let canJump = false;
playerBody.addEventListener("collide", e => {
  if (e.contact.ni.y > 0.5) canJump = true;
});

// === CAMERA BOB ===
let bobTime = 0;
let jumpOffset = 0;

function applyCameraBob(delta, moving) {
  bobTime += delta * (moving ? 6 : 2);
  const bobOffset = moving ? Math.sin(bobTime) * 0.05 : 0;
  const targetJumpOffset = -playerBody.velocity.y * 0.02;
  jumpOffset += (targetJumpOffset - jumpOffset) * 0.1;
  camera.position.y = 1.6 + bobOffset + jumpOffset;
  hands.position.y = -0.4 + jumpOffset * 1.5;
  hands.rotation.x = moving ? Math.sin(bobTime * 1.5) * 0.05 + jumpOffset * 0.3 : jumpOffset * 0.3;
  hands.rotation.y = moving ? Math.sin(bobTime) * 0.1 : 0;
}

// === UPDATE LOOP ===
const clock = new THREE.Clock();
function animate() {
  const delta = Math.min(clock.getDelta(), 0.1);
  world.step(1 / 60, delta, 3);

  // Movement direction relative to camera yaw
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const move = new THREE.Vector3();

  if (keys['KeyW']) move.add(forward);
  if (keys['KeyS']) move.sub(forward);
  if (keys['KeyA']) move.sub(right);
  if (keys['KeyD']) move.add(right);
  move.normalize();

  playerBody.velocity.x = move.x * speed;
  playerBody.velocity.z = move.z * speed;

  if (keys['Space'] && canJump) {
    playerBody.velocity.y = 5;
    canJump = false;
  }

  // Update camera and marker
  camera.position.copy(playerBody.position);
  camera.position.y += 1.6;
  camera.rotation.set(pitch, yaw, 0);

  const ray = new CANNON.Ray(playerBody.position, new CANNON.Vec3(0, -1, 0));
  const result = new CANNON.RaycastResult();
  ray.intersectBodies(world.bodies, result);
  if (result.hasHit) {
    landingMarker.visible = true;
    landingMarker.position.set(
      result.hitPointWorld.x,
      result.hitPointWorld.y + 0.01,
      result.hitPointWorld.z
    );
  } else {
    landingMarker.visible = false;
  }

  applyCameraBob(delta, move.length() > 0);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// === RESIZE ===
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
