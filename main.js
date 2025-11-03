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
camera.position.y = 1.6; // eye height

// --- Lights ---
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10,20,10);
scene.add(dirLight);

// --- Physics ---
const world = new CANNON.World({ gravity: new CANNON.Vec3(0,-9.82,0) });
const groundMat = new CANNON.Material("ground");
const playerMat = new CANNON.Material("player");
const contactMat = new CANNON.ContactMaterial(playerMat, groundMat, { friction:0, restitution:0 });
world.addContactMaterial(contactMat);
world.defaultContactMaterial = contactMat;

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

// --- Player Body ---
const playerShape = new CANNON.Sphere(0.5);
const playerBody = new CANNON.Body({ mass:5, material:playerMat });
playerBody.addShape(playerShape);
playerBody.position.set(0,2,0);
playerBody.linearDamping = 0.9; // slows sliding
world.addBody(playerBody);

// --- Input ---
const keys = { w:false, a:false, s:false, d:false, space:false };
window.addEventListener("keydown", e => { if(e.code.toLowerCase() in keys) keys[e.code.toLowerCase()] = true; });
window.addEventListener("keyup", e => { if(e.code.toLowerCase() in keys) keys[e.code.toLowerCase()] = false; });

// --- Mouse look ---
let yaw = 0, pitch = 0;
const sensitivity = 0.002;
document.body.addEventListener("click", ()=>document.body.requestPointerLock());
document.addEventListener("mousemove", e=>{
  if(document.pointerLockElement===document.body){
    yaw -= e.movementX*sensitivity;
    pitch -= e.movementY*sensitivity;
    pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, pitch));
  }
});

// --- Jump detection ---
let canJump = false;
playerBody.addEventListener("collide", e=>{
  if(e.contact && e.contact.ni.y > 0.5) canJump = true;
});

// --- Animate ---
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // --- Physics step ---
  world.step(1/60, dt, 3);

  // --- Movement ---
  const forward = new CANNON.Vec3(-Math.sin(yaw),0,-Math.cos(yaw));
  const right = new CANNON.Vec3(Math.cos(yaw),0,-Math.sin(yaw));
  let move = new CANNON.Vec3(0,0,0);

  if(keys.w) move.vadd(forward, move);
  if(keys.s) move.vsub(forward, move);
  if(keys.a) move.vsub(right, move);
  if(keys.d) move.vadd(right, move);

  if(move.length()>0) move.normalize();
  const speed = 5;
  playerBody.velocity.x += (move.x*speed - playerBody.velocity.x)*0.2;
  playerBody.velocity.z += (move.z*speed - playerBody.velocity.z)*0.2;

  // Jump
  if(keys.space && canJump){
    playerBody.velocity.y = 6;
    canJump = false;
  }

  // --- Camera follows player ---
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
