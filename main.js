import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

// --- Light ---
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(10,20,10);
scene.add(dirLight);

// --- Physics ---
const world = new CANNON.World({ gravity: new CANNON.Vec3(0,-9.82,0) });
const playerMaterial = new CANNON.Material("player");
const groundMaterial = new CANNON.Material("ground");
world.addContactMaterial(new CANNON.ContactMaterial(playerMaterial, groundMaterial, { friction:0, restitution:0 }));

// --- Ground ---
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass:0, material:groundMaterial });
groundBody.addShape(groundShape);
groundBody.quaternion.setFromEuler(-Math.PI/2,0,0);
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(50,50),
  new THREE.MeshStandardMaterial({ color:0x228B22 })
);
groundMesh.rotation.x = -Math.PI/2;
scene.add(groundMesh);

// --- Player ---
const radius = 0.5;
const playerBody = new CANNON.Body({
  mass: 5,
  material: playerMaterial,
  position: new CANNON.Vec3(0,2,0),
  shape: new CANNON.Sphere(radius),
  linearDamping: 0.9
});
world.addBody(playerBody);

// --- Input ---
const keys = { w:false, a:false, s:false, d:false, space:false };
window.addEventListener("keydown", e=>{ if(e.code.toLowerCase() in keys) keys[e.code.toLowerCase()] = true; });
window.addEventListener("keyup", e=>{ if(e.code.toLowerCase() in keys) keys[e.code.toLowerCase()] = false; });

// --- Mouse look ---
let yaw=0, pitch=0;
const sensitivity = 0.002;
document.body.addEventListener("click", ()=>document.body.requestPointerLock());
document.addEventListener("mousemove", e=>{
  if(document.pointerLockElement === document.body){
    yaw -= e.movementX * sensitivity;
    pitch -= e.movementY * sensitivity;
    pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, pitch));
  }
});

// --- Ground detection ---
function checkGround(){
  const from = new CANNON.Vec3().copy(playerBody.position);
  const to = new CANNON.Vec3(playerBody.position.x, playerBody.position.y - radius - 0.1, playerBody.position.z);
  const ray = new CANNON.Ray(from, new CANNON.Vec3(0,-1,0));
  const result = new CANNON.RaycastResult();
  ray.intersectWorld(world, { skipBackfaces:true }, result);
  return result.hasHit && result.distance <= radius + 0.05;
}

// --- Animate ---
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(),0.05);

  // --- Physics step ---
  world.step(1/60, dt, 3);

  // --- Movement ---
  const moveSpeed = 5;
  const forward = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const moveDir = new THREE.Vector3();
  if(keys.w) moveDir.add(forward);
  if(keys.s) moveDir.sub(forward);
  if(keys.a) moveDir.sub(right);
  if(keys.d) moveDir.add(right);
  if(moveDir.lengthSq()>0) moveDir.normalize();

  // Directly set velocity while preserving y (jump/fall)
  playerBody.velocity.x = moveDir.x * moveSpeed;
  playerBody.velocity.z = moveDir.z * moveSpeed;

  // Jump
  if(keys.space && checkGround()){
    playerBody.velocity.y = 6;
  }

  // --- Camera follows ---
  camera.position.copy(playerBody.position);
  camera.position.y += 1.6;
  camera.rotation.set(pitch, yaw, 0);

  renderer.render(scene,camera);
}
animate();

// --- Resize ---
window.addEventListener("resize", ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
