import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

// --- Scene & Renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
scene.add(camera);

// --- Lighting ---
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10,20,10);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

// --- Physics World ---
const world = new CANNON.World({ gravity: new CANNON.Vec3(0,-9.82,0) });

// --- Ground ---
const groundBody = new CANNON.Body({ mass:0 });
groundBody.addShape(new CANNON.Box(new CANNON.Vec3(10,0.5,10)));
groundBody.position.set(0,-0.5,0);
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(
    new THREE.BoxGeometry(20,1,20),
    new THREE.MeshStandardMaterial({ color:0x00ff00 })
);
groundMesh.position.copy(groundBody.position);
scene.add(groundMesh);

// --- Player Body ---
const playerBody = new CANNON.Body({ mass:1 });
playerBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5,1,0.5)));
playerBody.position.set(0,2,0);
playerBody.fixedRotation = true;
playerBody.updateMassProperties();
world.addBody(playerBody);

// --- Input ---
const keys = { w:false, a:false, s:false, d:false, space:false };
window.addEventListener("keydown", e => {
    if(e.code === "KeyW") keys.w = true;
    if(e.code === "KeyA") keys.a = true;
    if(e.code === "KeyS") keys.s = true;
    if(e.code === "KeyD") keys.d = true;
    if(e.code === "Space") keys.space = true;
});
window.addEventListener("keyup", e => {
    if(e.code === "KeyW") keys.w = false;
    if(e.code === "KeyA") keys.a = false;
    if(e.code === "KeyS") keys.s = false;
    if(e.code === "KeyD") keys.d = false;
    if(e.code === "Space") keys.space = false;
});

// --- Jump Check ---
let canJump = false;
playerBody.addEventListener("collide", e => {
    if(e.contact.ni.y > 0.5) canJump = true;
});

// --- Mouse Look ---
let yaw = 0, pitch = 0;
const sensitivity = 0.002;
document.body.addEventListener("click", ()=>document.body.requestPointerLock());
document.addEventListener("mousemove", e=>{
    if(document.pointerLockElement===document.body){
        yaw -= e.movementX*sensitivity;
        pitch -= e.movementY*sensitivity;
        pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
    }
});

// --- Animate ---
const clock = new THREE.Clock();
function animate(){
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(),0.05);

    // --- Physics Step ---
    world.step(1/60, delta, 3);

    // --- Movement ---
    const speed = 8;
    const forward = new CANNON.Vec3(-Math.sin(yaw),0,-Math.cos(yaw));
    const right = new CANNON.Vec3(Math.cos(yaw),0,-Math.sin(yaw));
    const move = new CANNON.Vec3(0,0,0);
    if(keys.w) move.vadd(forward, move);
    if(keys.s) move.vsub(forward, move);
    if(keys.a) move.vsub(right, move);
    if(keys.d) move.vadd(right, move);
    if(move.length()>0) move.normalize();
    const desired = move.scale(speed);
    playerBody.velocity.x = desired.x;
    playerBody.velocity.z = desired.z;

    // --- Jump ---
    if(keys.space && canJump){
        playerBody.velocity.y = 6;
        canJump = false;
    }

    // --- Update Camera ---
    camera.position.copy(playerBody.position);
    camera.position.y += 1.6;
    camera.rotation.x = pitch;
    camera.rotation.y = yaw;

    renderer.render(scene,camera);
}
animate();

// --- Resize ---
window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
