import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
scene.add(camera);

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10,20,10);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff,0.3));

const world = new CANNON.World({ gravity: new CANNON.Vec3(0,-9.82,0) });

// --- Ground ---
const groundBody = new CANNON.Body({ mass:0, shape: new CANNON.Box(new CANNON.Vec3(10,0.5,10)) });
groundBody.position.set(0,-0.5,0);
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(new THREE.BoxGeometry(20,1,20), new THREE.MeshStandardMaterial({ color:0x00ff00 }));
groundMesh.position.copy(groundBody.position);
scene.add(groundMesh);

// --- Player ---
const playerBody = new CANNON.Body({ mass:1, shape:new CANNON.Box(new CANNON.Vec3(0.5,1,0.5)) });
playerBody.position.set(0,2,0);
playerBody.fixedRotation = true;
playerBody.updateMassProperties();
world.addBody(playerBody);

// --- Movement ---
const keys = { w:false, a:false, s:false, d:false, Space:false };
window.addEventListener("keydown", e => { if(e.code in keys) keys[e.code]=true; });
window.addEventListener("keyup", e => { if(e.code in keys) keys[e.code]=false; });

let canJump = false;
playerBody.addEventListener("collide", e => { if(e.contact.ni.y>0.5) canJump = true; });

let yaw=0, pitch=0;
const sensitivity = 0.002;
document.body.addEventListener("click",()=>document.body.requestPointerLock());
document.addEventListener("mousemove", e=>{
    if(document.pointerLockElement===document.body){
        yaw -= e.movementX*sensitivity;
        pitch -= e.movementY*sensitivity;
        pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
    }
});

// --- Main Loop ---
const clock = new THREE.Clock();
function animate(){
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(),0.05);

    world.step(1/60, delta, 3);

    // Movement
    const forward = new CANNON.Vec3(-Math.sin(yaw),0,-Math.cos(yaw));
    const right = new CANNON.Vec3(Math.cos(yaw),0,-Math.sin(yaw));
    const moveDir = new CANNON.Vec3(0,0,0);
    if(keys.w) moveDir.vadd(forward, moveDir);
    if(keys.s) moveDir.vsub(forward, moveDir);
    if(keys.a) moveDir.vsub(right, moveDir);
    if(keys.d) moveDir.vadd(right, moveDir);
    if(moveDir.length()>0) moveDir.normalize();
    const speed = 8;
    const desired = moveDir.scale(speed);
    playerBody.velocity.x += (desired.x - playerBody.velocity.x)*0.2;
    playerBody.velocity.z += (desired.z - playerBody.velocity.z)*0.2;

    if(keys.Space && canJump){
        playerBody.velocity.y = 6;
        canJump = false;
    }

    camera.position.copy(playerBody.position);
    camera.position.y += 1.6;
    camera.rotation.x = pitch;
    camera.rotation.y = yaw;

    renderer.render(scene,camera);
}
animate();
