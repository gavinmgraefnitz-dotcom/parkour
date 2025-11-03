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
camera.position.y = 1.6;

// --- Lights ---
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10,20,10);
scene.add(dirLight);

// --- Physics ---
const world = new CANNON.World({ gravity: new CANNON.Vec3(0,-9.82,0) });
const playerMat = new CANNON.Material("player");
const groundMat = new CANNON.Material("ground");
world.addContactMaterial(new CANNON.ContactMaterial(playerMat, groundMat, { friction:0.0, restitution:0 }));

// --- Ground ---
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass:0, material:groundMat });
groundBody.addShape(groundShape);
groundBody.quaternion.setFromEuler(-Math.PI/2,0,0);
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(50,50),
  new THREE.MeshStandardMaterial({ color:0x228B22 })
);
groundMesh.rotation.x = -Math.PI/2;
scene.add(groundMesh);

// --- Player Capsule ---
const radius = 0.3;
const height = 1.2;
const capsuleBody = new CANNON.Body({ mass:5, material:playerMat });
const sphereShape = new CANNON.Sphere(radius);
capsuleBody.addShape(sphereShape, new CANNON.Vec3(0, height/2, 0));
capsuleBody.addShape(sphereShape, new CANNON.Vec3(0, -height/2, 0));
const cylinderShape = new CANNON.Cylinder(radius, radius, height, 8);
capsuleBody.addShape(cylinderShape, new CANNON.Vec3(0,0,0), new CANNON.Quaternion().setFromEuler(Math.PI/2,0,0));
capsuleBody.position.set(0, 2, 0);
capsuleBody.fixedRotation = true; // Prevent tipping
capsuleBody.updateMassProperties();
capsuleBody.linearDamping = 0.9;
world.addBody(capsuleBody);

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
    yaw -= e.movementX*sensitivity;
    pitch -= e.movementY*sensitivity;
    pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, pitch));
  }
});

// --- Ground check ---
function onGround() {
  const start = new CANNON.Vec3().copy(capsuleBody.position);
  const end = new CANNON.Vec3(capsuleBody.position.x, capsuleBody.position.y - height/2 - 0.1, capsuleBody.position.z);
  const result = new CANNON.RaycastResult();
  const ray = new CANNON.Ray(start, new CANNON.Vec3(0,-1,0));
  ray.intersectWorld(world, { skipBackfaces:true }, result);
  return result.hasHit && result.distance <= height/2 + 0.05;
}

// --- Animate ---
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Step physics
  world.step(1/60, dt, 3);

  // --- Movement ---
  const speed = 4;
  const forward = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  const moveDir = new THREE.Vector3();
  if(keys.w) moveDir.add(forward);
  if(keys.s) moveDir.sub(forward);
  if(keys.a) moveDir.sub(right);
  if(keys.d) moveDir.add(right);
  if(moveDir.lengthSq()>0) moveDir.normalize();

  capsuleBody.velocity.x = moveDir.x * speed;
  capsuleBody.velocity.z = moveDir.z * speed;

  // Jump
  if(keys.space && onGround()){
    capsuleBody.velocity.y = 5;
  }

  // --- Camera follows ---
  camera.position.copy(capsuleBody.position);
  camera.position.y += 0.9 + height/2; // eye height
  camera.rotation.set(pitch, yaw, 0);

  renderer.render(scene, camera);
}
animate();

// --- Resize ---
window.addEventListener("resize", ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
