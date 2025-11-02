import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

// === SCENE & CAMERA ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

// === RENDERER ===
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === LIGHT ===
const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(10,20,10);
scene.add(light);

// === PHYSICS WORLD ===
const world = new CANNON.World({ gravity: new CANNON.Vec3(0,-9.82,0) });
world.broadphase = new CANNON.NaiveBroadphase();
world.allowSleep = true;

const material = new CANNON.Material();
const contact = new CANNON.ContactMaterial(material, material, { friction:0, restitution:0 });
world.addContactMaterial(contact);
world.defaultContactMaterial = contact;

// === GROUND ===
const groundShape = new CANNON.Box(new CANNON.Vec3(10,0.5,10));
const groundBody = new CANNON.Body({ type:CANNON.Body.STATIC, shape:groundShape, position:new CANNON.Vec3(0,-0.5,0), material });
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(new THREE.BoxGeometry(20,1,20), new THREE.MeshStandardMaterial({ color:0x00ff00 }));
scene.add(groundMesh);

// === PLATFORMS ===
function makePlatform(x,y,z){
    const shape = new CANNON.Box(new CANNON.Vec3(2,0.5,2));
    const body = new CANNON.Body({ type:CANNON.Body.STATIC, shape, position:new CANNON.Vec3(x,y,z), material });
    world.addBody(body);
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

// === PLAYER ===
const playerShape = new CANNON.Box(new CANNON.Vec3(0.5,1,0.5));
const playerBody = new CANNON.Body({ mass:1, shape:playerShape, position:new CANNON.Vec3(0,2,0), material });
playerBody.fixedRotation = true;
world.addBody(playerBody);

// Hide player mesh, first-person view doesn't need body visible

// === PLAYER HANDS ===
const handsGroup = new THREE.Group();
camera.add(handsGroup); // attach to camera

const leftHand = new THREE.Mesh(
    new THREE.BoxGeometry(0.3,0.8,0.3),
    new THREE.MeshStandardMaterial({ color:0xffcc99 })
);
leftHand.position.set(-0.35,-0.5,-0.5);

const rightHand = new THREE.Mesh(
    new THREE.BoxGeometry(0.3,0.8,0.3),
    new THREE.MeshStandardMaterial({ color:0xffcc99 })
);
rightHand.position.set(0.35,-0.5,-0.5);

handsGroup.add(leftHand);
handsGroup.add(rightHand);

// === CONTROLS ===
const keys = { w:false, a:false, s:false, d:false, jump:false };
window.addEventListener("keydown",(e)=>{
    if(e.code==="KeyW") keys.w=true;
    if(e.code==="KeyA") keys.a=true;
    if(e.code==="KeyS") keys.s=true;
    if(e.code==="KeyD") keys.d=true;
    if(e.code==="Space") keys.jump=true;
});
window.addEventListener("keyup",(e)=>{
    if(e.code==="KeyW") keys.w=false;
    if(e.code==="KeyA") keys.a=false;
    if(e.code==="KeyS") keys.s=false;
    if(e.code==="KeyD") keys.d=false;
    if(e.code==="Space") keys.jump=false;
});

// === MOUSE LOOK ===
let yaw=0,pitch=0;
const sensitivity = 0.002;

document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
document.body.addEventListener("click",()=>document.body.requestPointerLock());

document.addEventListener("mousemove",(event)=>{
    if(document.pointerLockElement===document.body){
        yaw -= event.movementX * sensitivity;
        pitch -= event.movementY * sensitivity;
        pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
    }
});

// === MOVEMENT SETTINGS ===
const moveSpeed = 10;
const airSpeed = 8;
const jumpSpeed = 9;
const damping = 0.1;

// === GROUND DETECTION ===
function isGrounded(){
    const playerBottomY = playerBody.position.y - 1;
    const epsilon = 0.15;
    let grounded=false;
    world.contacts.forEach(c=>{
        if(c.bi===playerBody || c.bj===playerBody){
            const contactNormal = c.ni.clone();
            if(c.bi===playerBody) contactNormal.negate(contactNormal);
            if(contactNormal.y>0.5){
                const contactPoint = c.bi===playerBody ? c.rj.vadd(c.bj.position) : c.ri.vadd(c.bi.position);
                const dist = playerBottomY - contactPoint.y;
                if(dist<=epsilon) grounded=true;
            }
        }
    });
    return grounded;
}

// === GAME LOOP ===
const clock = new THREE.Clock();

function animate(){
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(),0.05);
    world.step(1/60, delta,3);

    const grounded = isGrounded();

    // === MOVEMENT ===
    const moveDir = new CANNON.Vec3(0,0,0);
    if(keys.w) moveDir.z -=1;
    if(keys.s) moveDir.z +=1;
    if(keys.a) moveDir.x -=1;
    if(keys.d) moveDir.x +=1;
    if(moveDir.length()>0) moveDir.normalize();

    // Rotate movement by camera yaw
    const sin=Math.sin(yaw), cos=Math.cos(yaw);
    const rotatedX = moveDir.x*cos - moveDir.z*sin;
    const rotatedZ = moveDir.x*sin + moveDir.z*cos;
    moveDir.x=rotatedX; moveDir.z=rotatedZ;

    const speed = grounded ? moveSpeed : airSpeed;
    const targetVel = moveDir.scale(speed);
    playerBody.velocity.x = targetVel.x;
    playerBody.velocity.z = targetVel.z;

    if(keys.jump && grounded) playerBody.velocity.y=jumpSpeed;
    keys.jump=false;

    if(grounded && moveDir.length()===0){
        playerBody.velocity.x *= 1 - damping;
        playerBody.velocity.z *= 1 - damping;
    }

    // === CAMERA ===
    camera.position.copy(playerBody.position);
    camera.position.y += 1.6; // head height
    camera.rotation.set(pitch, yaw, 0);

    renderer.render(scene,camera);
}

animate();

window.addEventListener("resize",()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
