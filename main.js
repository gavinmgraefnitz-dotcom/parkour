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

// --- Lights ---
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

// --- Physics world ---
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// --- Materials ---
const groundMaterial = new CANNON.Material("ground");
const playerMaterial = new CANNON.Material("player");
const contactMaterial = new CANNON.ContactMaterial(playerMaterial, groundMaterial, { friction: 0.0, restitution: 0 });
world.addContactMaterial(contactMaterial);
world.defaultContactMaterial = contactMaterial;

// --- Ground ---
const groundShape = new CANNON.Plane();
const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
groundBody.addShape(groundShape);
groundBody.quaternion.setFromEuler(-Math.PI/2, 0, 0);
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x228B22 })
);
groundMesh.rotation.x = -Math.PI/2;
scene.add(groundMesh);

// --- Player ---
const playerShape = new CANNON.Sphere(1);
const playerBody = new CANNON.Body({ mass: 5, material: playerMaterial });
playerBody.addShape(playerShape);
playerBody.position.set(0, 2, 0);
playerBody.linearDamping = 0.9;
world.addBody(playerBody);

// --- Controls ---
const keys = { w:false, a:false, s:false, d:false, space:false };
window.addEventListener("keydown", e => { if(e.code.toLowerCase() in keys) keys[e.code.toLowerCase()] = true; });
window.addEventListener("keyup", e => { if(e.code.toLowerCase() in keys) keys[e.code.toLowerCase()] = false; });

// --- Mouse look ---
let yaw = 0, pitch = 0;
const sensitivity = 0.002;
document.body.addEventListener("click", ()=>document.body.requestPointerLock());
document.addEventListener("mousemove", e => {
    if(document.pointerLockElement === document.body){
        yaw -= e.movementX * sensitivity;
        pitch -= e.movementY * sensitivity;
        pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
    }
});

// --- Jump detection ---
let canJump = false;
playerBody.addEventListener("collide", e => {
    if(e.contact && e.contact.ni.y > 0.5) canJump = true;
});

// --- Animate ---
const clock = new THREE.Clock();
function animate(){
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    // --- Movement ---
    const forward = new CANNON.Vec3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new CANNON.Vec3(Math.cos(yaw), 0, -Math.sin(yaw));
    const moveDir = new CANNON.Vec3(0,0,0);
    if(keys.w) moveDir.vadd(forward, moveDir);
    if(keys.s) moveDir.vsub(forward, moveDir);
    if(keys.a) moveDir.vsub(right, moveDir);
    if(keys.d) moveDir.vadd(right, moveDir);
    if(moveDir.length() > 0) moveDir.normalize();
    const speed = 5;
    const desired = moveDir.scale(speed);
    playerBody.velocity.x += (desired.x - playerBody.velocity.x) * 0.2;
    playerBody.velocity.z += (desired.z - playerBody.velocity.z) * 0.2;

    if(keys.space && canJump){
        playerBody.velocity.y = 6;
        canJump = false;
    }

    // --- Physics step ---
    world.step(1/60, delta, 3);

    // --- Camera follows ---
    camera.position.copy(playerBody.position);
    camera.position.y += 1.6;
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
