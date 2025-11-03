import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

// === Scene & Renderer ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === Camera (head) ===
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
scene.add(camera);

// === Lighting ===
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

// === Physics World ===
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
const material = new CANNON.Material();
world.defaultContactMaterial = new CANNON.ContactMaterial(material, material, { friction: 0, restitution: 0 });

// === Ground ===
const groundShape = new CANNON.Box(new CANNON.Vec3(10, 0.5, 10));
const groundBody = new CANNON.Body({ mass: 0, shape: groundShape, material });
groundBody.position.set(0, -0.5, 0);
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(
    new THREE.BoxGeometry(20, 1, 20),
    new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
groundMesh.position.copy(groundBody.position);
scene.add(groundMesh);

// === Platforms ===
function makePlatform(x, y, z) {
    const shape = new CANNON.Box(new CANNON.Vec3(2, 0.5, 2));
    const body = new CANNON.Body({ type: CANNON.Body.STATIC, shape, position: new CANNON.Vec3(x, y, z), material });
    world.addBody(body);
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(4, 1, 4),
        new THREE.MeshStandardMaterial({ color: 0x0000ff })
    );
    mesh.position.copy(body.position);
    scene.add(mesh);
}
makePlatform(5,2,0);
makePlatform(-5,4,-5);
makePlatform(0,6,5);
makePlatform(10,8,5);
makePlatform(-10,10,0);

// === Player Physics Body ===
const playerShape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
const playerBody = new CANNON.Body({ mass: 1, shape: playerShape, material });
playerBody.position.set(0, 2, 0);
playerBody.fixedRotation = true;
playerBody.updateMassProperties();
world.addBody(playerBody);

// === Input ===
const keys = { w:false, a:false, s:false, d:false, Space:false };
window.addEventListener("keydown", e => { if(e.code in keys) keys[e.code]=true; });
window.addEventListener("keyup", e => { if(e.code in keys) keys[e.code]=false; });

// === Mouse look ===
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

// === Hands ===
const hands = new THREE.Group();
camera.add(hands);
const handMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.4,0.15), handMaterial);
const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.4,0.15), handMaterial);
leftHand.position.set(-0.2,-0.4,-0.5);
rightHand.position.set(0.2,-0.4,-0.5);
hands.add(leftHand);
hands.add(rightHand);

// === Legs & Feet (visible in front of camera) ===
const legsGroup = new THREE.Group();
scene.add(legsGroup);

const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.8,0.2), new THREE.MeshStandardMaterial({ color:0x333333 }));
leftLeg.position.set(-0.15,-0.4,0);
legsGroup.add(leftLeg);

const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.8,0.2), new THREE.MeshStandardMaterial({ color:0x333333 }));
rightLeg.position.set(0.15,-0.4,0);
legsGroup.add(rightLeg);

const leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.25,0.1,0.4), new THREE.MeshStandardMaterial({ color:0x555555 }));
leftFoot.position.set(-0.15,-0.85,0.1);
legsGroup.add(leftFoot);

const rightFoot = new THREE.Mesh(new THREE.BoxGeometry(0.25,0.1,0.4), new THREE.MeshStandardMaterial({ color:0x555555 }));
rightFoot.position.set(0.15,-0.85,0.1);
legsGroup.add(rightFoot);

// === Movement Settings ===
const moveSpeed = 8, jumpSpeed = 6;
let canJump = false;
playerBody.addEventListener("collide", e => { if(e.contact.ni.y > 0.5) canJump = true; });

// === Animation / Bobbing ===
let bobTime = 0;
function applyBobbing(delta, moving){
    bobTime += delta*(moving?6:2);
    const bob = moving?Math.sin(bobTime)*0.05:0;

    camera.position.y = 1.6 + bob;
    hands.position.y = -0.4 + bob;
    hands.rotation.x = moving?Math.sin(bobTime*1.5)*0.05:0;

    leftLeg.rotation.x = moving?Math.sin(bobTime*2)*0.3:0;
    rightLeg.rotation.x = moving?Math.sin(bobTime*2+Math.PI)*0.3:0;
    leftFoot.rotation.x = moving?Math.sin(bobTime*2+Math.PI)*0.2:0;
    rightFoot.rotation.x = moving?Math.sin(bobTime*2)*0.2:0;
}

// === Main Loop ===
const clock = new THREE.Clock();
function animate(){
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(),0.05);

    // --- Physics ---
    world.step(1/60, delta, 3);

    // --- Movement ---
    const forward = new CANNON.Vec3(-Math.sin(yaw),0,-Math.cos(yaw));
    const right = new CANNON.Vec3(Math.cos(yaw),0,-Math.sin(yaw));
    const moveDir = new CANNON.Vec3(0,0,0);
    if(keys.w) moveDir.vadd(forward, moveDir);
    if(keys.s) moveDir.vsub(forward, moveDir);
    if(keys.a) moveDir.vsub(right, moveDir);
    if(keys.d) moveDir.vadd(right, moveDir);
    if(moveDir.length()>0) moveDir.normalize();
    const desired = moveDir.scale(moveSpeed);
    playerBody.velocity.x += (desired.x - playerBody.velocity.x)*0.2;
    playerBody.velocity.z += (desired.z - playerBody.velocity.z)*0.2;

    if(keys.Space && canJump){
        playerBody.velocity.y = jumpSpeed;
        canJump = false;
    }

    // --- Camera ---
    camera.position.copy(playerBody.position);
    camera.position.y += 1.6;
    camera.rotation.x = pitch;
    camera.rotation.y = yaw;

    // --- Legs position ---
    legsGroup.position.copy(playerBody.position);
    legsGroup.position.y += 0.5;
    legsGroup.position.z -= 0.5;
    legsGroup.rotation.y = yaw;

    applyBobbing(delta, moveDir.length()>0);

    renderer.render(scene,camera);
}
animate();

// === Resize ===
window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
