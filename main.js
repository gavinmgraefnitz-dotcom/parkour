import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Light ---
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);

// --- Physics ---
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
world.broadphase = new CANNON.NaiveBroadphase();
world.allowSleep = true;

const material = new CANNON.Material();
world.defaultContactMaterial = new CANNON.ContactMaterial(material, material, { friction: 0, restitution: 0 });

// --- Ground ---
const groundShape = new CANNON.Box(new CANNON.Vec3(10, 0.5, 10));
const groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(
  new THREE.BoxGeometry(20, 1, 20),
  new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
scene.add(groundMesh);

// --- Player (invisible) ---
const playerShape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
const playerBody = new CANNON.Body({ mass: 1, shape: playerShape });
playerBody.position.set(0, 2, 0);
playerBody.fixedRotation = true;
world.addBody(playerBody);

// --- Hands ---
const handsGroup = new THREE.Group();
camera.add(handsGroup);

const leftHand = new THREE.Mesh(
  new THREE.BoxGeometry(0.3, 0.8, 0.3),
  new THREE.MeshStandardMaterial({ color: 0xffcc99 })
);
leftHand.position.set(-0.35, -0.5, -0.5);

const rightHand = new THREE.Mesh(
  new THREE.BoxGeometry(0.3, 0.8, 0.3),
  new THREE.MeshStandardMaterial({ color: 0xffcc99 })
);
rightHand.position.set(0.35, -0.5, -0.5);

handsGroup.add(leftHand);
handsGroup.add(rightHand);

// --- Controls ---
const keys = { w:false, a:false, s:false, d:false, jump:false };
window.addEventListener("keydown", (e)=>{ if(e.code==="KeyW") keys.w=true; if(e.code==="KeyA") keys.a=true; if(e.code==="KeyS") keys.s=true; if(e.code==="KeyD") keys.d=true; if(e.code==="Space") keys.jump=true; });
window.addEventListener("keyup", (e)=>{ if(e.code==="KeyW") keys.w=false; if(e.code==="KeyA") keys.a=false; if(e.code==="KeyS") keys.s=false; if(e.code==="KeyD") keys.d=false; if(e.code==="Space") keys.jump=false; });

// --- Mouse Look ---
let yaw = 0, pitch = 0;
const sensitivity = 0.002;

document.body.addEventListener("click",()=>document.body.requestPointerLock());
document.addEventListener("mousemove",(e)=>{
  if(document.pointerLockElement===document.body){
    yaw -= e.movementX * sensitivity;
    pitch -= e.movementY * sensitivity;
    pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
  }
});

// --- Movement ---
const moveSpeed = 10;
const airSpeed = 8;
const jumpSpeed = 9;
const damping = 0.1;

function isGrounded(){
  const epsilon = 0.15;
  for(let c of world.contacts){
    if(c.bi===playerBody || c.bj===playerBody){
      const n = c.ni.clone();
      if(c.bi===playerBody) n.negate(n);
      if(n.y>0.5) return true;
    }
  }
  return false;
}

// --- Game Loop ---
const clock = new THREE.Clock();

function animate(){
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  world.step(1/60, delta,3);

  const grounded = isGrounded();

  // Movement
  const dir = new CANNON.Vec3(0,0,0);
  if(keys.w) dir.z -=1;
  if(keys.s) dir.z +=1;
  if(keys.a) dir.x -=1;
  if(keys.d) dir.x +=1;
  if(dir.length()>0) dir.normalize();

  // Rotate by yaw
  const sin=Math.sin(yaw), cos=Math.cos(yaw);
  const x=dir.x*cos - dir.z*sin;
  const z=dir.x*sin + dir.z*cos;
  dir.x=x; dir.z=z;

  const speed = grounded ? moveSpeed : airSpeed;
  const vel = dir.scale(speed);
  playerBody.velocity.x = vel.x;
  playerBody.velocity.z = vel.z;

  if(keys.jump && grounded) playerBody.velocity.y = jumpSpeed;
  keys.jump=false;

  if(grounded && dir.length()===0){
    playerBody.velocity.x *= 1 - damping;
    playerBody.velocity.z *= 1 - damping;
  }

  // Camera follows player
  camera.position.copy(playerBody.position);
  camera.position.y += 1.6; // eye height
  camera.rotation.set(pitch, yaw, 0);

  renderer.render(scene,camera);
}

animate();

window.addEventListener("resize",()=>{
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
