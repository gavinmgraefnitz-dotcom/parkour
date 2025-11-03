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
const playerYaw = new THREE.Object3D();
playerYaw.add(camera);
scene.add(playerYaw);
camera.position.y = 1.6; // eye height

// --- Light ---
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10,20,10);
scene.add(dirLight);

// --- Physics world ---
const world = new CANNON.World({ gravity: new CANNON.Vec3(0,-9.82,0) });
const groundMaterial = new CANNON.Material("ground");
const playerMaterial = new CANNON.Material("player");
const contactMat = new CANNON.ContactMaterial(playerMaterial, groundMaterial, { friction:0.0, restitution:0 });
world.addContactMaterial(contactMat);
world.defaultContactMaterial = contactMat;

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
const playerShape = new CANNON.Sphere(1);
const playerBody = new CANNON.Body({ mass:5, material:playerMaterial });
playerBody.addShape(playerShape);
playerBody.position.set(0,2,0);
playerBody.linearDamping = 0.9;
world.addBody(playerBody);

// --- Input ---
const keys = { w:false, a:false, s:false, d:false, space:false };
window.addEventListener("keydown", e => { if(e.code.toLowerCase() in keys) keys[e.code.toLowerCase()] = true; });
window.addEventListener("keyup", e => { if(e.code.toLowerCase() in keys) keys[e.code.toLowerCase()] = false; });

// --- Mouse look ---
let yaw=0, pitch=0;
const sensitivity = 0.002;
document.body.addEventListener("click", ()=>document.body.requestPointerLock());
document.addEventListener("mousemove", e=>{
  if(document.pointerLockElement===document.body){
    yaw -= e.movementX * sensitivity;
    pitch -= e.movementY * sensitivity;
    pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, pitch));
  }
});

// --- Jump detection ---
let canJump=false;
playerBody.addEventListener("collide", e=>{
  if(e.contact && e.contact.ni.y > 0.5) canJump=true;
});

// --- Animate ---
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(),0.05);

  // Step physics
  world.step(1/60, dt, 3);

  // Movement
  const forward = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
  const right = new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0), yaw);
  const moveDir = new THREE.Vector3();
  if(keys.w) moveDir.add(forward);
  if(keys.s) moveDir.sub(forward);
  if(keys.a) moveDir.sub(right);
  if(keys.d) moveDir.add(right);
  if(moveDir.lengthSq()>0) moveDir.normalize();

  const speed = 5;
  playerBody.velocity.x += (moveDir.x*speed - playerBody.velocity.x)*0.2;
  playerBody.velocity.z += (moveDir.z*speed - playerBody.velocity.z)*0.2;

  // Jump
  if(keys.space && canJump){
    playerBody.velocity.y = 6;
    canJump = false;
  }

  // Camera follows
  playerYaw.position.copy(playerBody.position);
  camera.rotation.x = pitch;
  playerYaw.rotation.y = yaw;

  renderer.render(scene,camera);
}
animate();

// --- Resize ---
window.addEventListener("resize", ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
