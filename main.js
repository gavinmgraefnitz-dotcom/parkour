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
playerBody.linearDamping = 0.9;
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
  if(document.pointerLockElement===document.body){
    yaw -= e.movementX*sensitivity;
    pitch -= e.movementY*sensitivity;
    pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, pitch));
  }
});

// --- Ground check ---
function isOnGround(){
  const ray = new CANNON.Ray(playerBody.position, new CANNON.Vec3(0,-1,0));
  const result = new CANNON.RaycastResult();
  ray.intersectWorld(world, { collisionFilterMask: -1, skipBackfaces:true }, result);
  if(result.hasHit && result.distance <= 0.51) return true;
  return false;
}

// --- Animate ---
const clock = new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(),0.05);

  // Step physics
  world.step(1/60, dt, 3);

  // --- Movement ---
  const speed = 10;
  let inputDir = new THREE.Vector3();
  const forward = new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
  if(keys.w) inputDir.add(forward);
  if(keys.s) inputDir.sub(forward);
  if(keys.a) inputDir.sub(right);
  if(keys.d) inputDir.add(right);
  if(inputDir.length()>0) inputDir.normalize();

  // Apply force for movement
  const velocity = new CANNON.Vec3(inputDir.x*speed, playerBody.velocity.y, inputDir.z*speed);
  playerBody.velocity.x = velocity.x;
  playerBody.velocity.z = velocity.z;

  // Jump
  if(keys.space && isOnGround()){
    playerBody.velocity.y = 6;
  }

  // Camera follows
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
