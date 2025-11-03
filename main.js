import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

// === Scene & Camera ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === Light ===
const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(10,20,10);
scene.add(light);

// === Physics ===
const world = new CANNON.World({ gravity: new CANNON.Vec3(0,-9.82,0) });
world.broadphase = new CANNON.NaiveBroadphase();
world.allowSleep = true;
const material = new CANNON.Material();
world.defaultContactMaterial = new CANNON.ContactMaterial(material, material, { friction:0, restitution:0 });

// === Ground ===
const groundShape = new CANNON.Box(new CANNON.Vec3(10,0.5,10));
const groundBody = new CANNON.Body({ mass:0, shape: groundShape });
const groundBody = new CANNON.Body({ mass:0, shape: groundShape, material });
groundBody.position.set(0,-0.5,0);
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(
@@ -41,22 +40,20 @@
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(4,1,4), new THREE.MeshStandardMaterial({ color:0x0000ff }));
    mesh.position.copy(body.position);
    scene.add(mesh);
    return { mesh, body };
}

const platforms = [
    makePlatform(5,2,0),
    makePlatform(-5,4,-5),
    makePlatform(0,6,5),
    makePlatform(10,8,5),
    makePlatform(-10,10,0)
];
makePlatform(5,2,0);
makePlatform(-5,4,-5);
makePlatform(0,6,5);
makePlatform(10,8,5);
makePlatform(-10,10,0);

// === Player body ===
const playerShape = new CANNON.Box(new CANNON.Vec3(0.5,1,0.5));
const playerBody = new CANNON.Body({ mass:1, shape:playerShape });
const playerBody = new CANNON.Body({ mass:1, shape:playerShape, material });
playerBody.position.set(0,2,0);
playerBody.fixedRotation = true;
playerBody.updateMassProperties();
world.addBody(playerBody);

// === Hands ===
@@ -94,21 +91,28 @@
  if(e.code==="Space") keys.jump=false;
});

// === Mouse Look (Horizontal Only) ===
// === Mouse Look ===
let yaw = 0;
let pitch = 0;
const sensitivity = 0.002;
let verticalEnabled = false;

document.body.addEventListener("click", ()=>document.body.requestPointerLock());
document.addEventListener("mousemove", e=>{
window.addEventListener("mousedown", e => { if(e.button === 2) verticalEnabled = true; });
window.addEventListener("mouseup", e => { if(e.button === 2) verticalEnabled = false; });

document.addEventListener("mousemove", e => {
    if(document.pointerLockElement === document.body){
        yaw -= e.movementX * sensitivity;
        // pitch ignored for horizontal-only rotation
        if(verticalEnabled){
            pitch -= e.movementY * sensitivity;
            pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
        }
    }
});

// === Movement Settings ===
const moveSpeed = 10;
const airSpeed = 8;
const moveSpeed = 15;
const jumpSpeed = 9;
const damping = 0.1;

@@ -124,16 +128,15 @@
    return false;
}

// === Camera Bob & Hand Sway Variables ===
// === Camera Bob & Hand Sway ===
let bobTime = 0;
function applyCameraBob(delta, speed){
    bobTime += delta * speed * 5;
    const bobOffset = Math.sin(bobTime) * 0.05;
function applyCameraBob(delta, moving){
    bobTime += delta * (moving ? 6 : 2);
    const bobOffset = moving ? Math.sin(bobTime) * 0.05 : 0;
    camera.position.y = playerBody.position.y + 1.6 + bobOffset;

    // Hands sway
    hands.rotation.x = Math.sin(bobTime*1.5) * 0.05;
    hands.rotation.y = Math.sin(bobTime) * 0.1;
    hands.rotation.x = moving ? Math.sin(bobTime*1.5) * 0.05 : 0;
    hands.rotation.y = moving ? Math.sin(bobTime) * 0.1 : 0;
}

// === Game Loop ===
@@ -145,49 +148,56 @@
    world.step(1/60, delta,3);

    const grounded = isGrounded();
    const input = new CANNON.Vec3(0,0,0);

    if(keys.w) input.z -=1;
    if(keys.s) input.z +=1;
    if(keys.a) input.x -=1;
    if(keys.d) input.x +=1;

    if(input.length() > 0) input.normalize();

    // Rotate input by yaw
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const worldDir = new CANNON.Vec3(
        input.x * cos - input.z * sin,
        0,
        input.x * sin + input.z * cos
    );

    // Apply velocity smoothly
    const desired = worldDir.scale(moveSpeed);
    playerBody.velocity.x += (desired.x - playerBody.velocity.x) * 0.2;
    playerBody.velocity.z += (desired.z - playerBody.velocity.z) * 0.2;

    // Movement
    const dir = new CANNON.Vec3(0,0,0);
    if(keys.w) dir.z -=1;
    if(keys.s) dir.z +=1;
    if(keys.a) dir.x -=1;
    if(keys.d) dir.x +=1;
    if(dir.length()>0) dir.normalize();

    const sin=Math.sin(yaw), cos=Math.cos(yaw);
    const x = dir.x*cos - dir.z*sin;
    const z = dir.x*sin + dir.z*cos;
    dir.x = x; dir.z = z;

    const speed = grounded ? moveSpeed : airSpeed;
    const vel = dir.scale(speed);
    playerBody.velocity.x = vel.x;
    playerBody.velocity.z = vel.z;

    // Jump
    if(keys.jump && grounded){
        playerBody.velocity.y = jumpSpeed;
        keys.jump = false;
    }
    keys.jump = false;

    // Damping
    if(grounded && dir.length()===0){
        playerBody.velocity.x *= 1-damping;
        playerBody.velocity.z *= 1-damping;
    // Damping when idle
    if(input.length() === 0){
        playerBody.velocity.x *= 1 - damping;
        playerBody.velocity.z *= 1 - damping;
    }

    // Camera follows player + apply bob/sway
    applyCameraBob(delta, dir.length());
    camera.rotation.set(0, yaw, 0); // horizontal only
    // Camera follow
    camera.position.x = playerBody.position.x;
    camera.position.z = playerBody.position.z;
    camera.rotation.set(verticalEnabled ? pitch : 0, yaw, 0);

    // Camera bob + hands sway
    applyCameraBob(delta, input.length() > 0 && grounded);

    renderer.render(scene,camera);
}

animate();

// --- Window Resize ---
// Resize
window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
