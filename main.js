import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

// --- Three.js scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0,5,10);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff,1);
light.position.set(10,10,10);
scene.add(light);

// --- Cannon.js world ---
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0,-9.82,0) // gravity
});

// --- Materials ---
const defaultMaterial = new CANNON.Material('default');
const contactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
    friction: 0.4,
    restitution: 0.0
});
world.defaultContactMaterial = contactMaterial;

// --- Ground ---
const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Box(new CANNON.Vec3(10,0.5,10)),
    position: new CANNON.Vec3(0,-0.5,0),
    material: defaultMaterial
});
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(
    new THREE.BoxGeometry(20,1,20),
    new THREE.MeshStandardMaterial({color:0x00ff00})
);
groundMesh.position.copy(groundBody.position);
scene.add(groundMesh);

// --- Platforms ---
const platforms = [];
const platformBodies = [];

function createPlatform(x,y,z){
    const platBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(2,0.5,2)),
        position: new CANNON.Vec3(x,y,z),
        material: defaultMaterial
    });
    world.addBody(platBody);
    platformBodies.push(platBody);

    const platMesh = new THREE.Mesh(
        new THREE.BoxGeometry(4,1,4),
        new THREE.MeshStandardMaterial({color:0x0000ff})
    );
    scene.add(platMesh);
    platforms.push(platMesh);
}

// Sample platforms
createPlatform(5,1,0);
createPlatform(-6,2,-5);
createPlatform(0,3,5);

// --- Player ---
const playerShape = new CANNON.Box(new CANNON.Vec3(0.5,1,0.5));
const playerBody = new CANNON.Body({
    mass:1,
    shape:playerShape,
    position:new CANNON.Vec3(0,1,0),
    material: defaultMaterial
});
playerBody.fixedRotation = true;
playerBody.updateMassProperties();
world.addBody(playerBody);

const playerMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1,2,1),
    new THREE.MeshStandardMaterial({color:0xff0000})
);
scene.add(playerMesh);

// --- Controls ---
const keys = {w:false,s:false,a:false,d:false,jump:false};
window.addEventListener('keydown',e=>{
    if(e.code==='KeyW') keys.w=true;
    if(e.code==='KeyS') keys.s=true;
    if(e.code==='KeyA') keys.a=true;
    if(e.code==='KeyD') keys.d=true;
    if(e.code==='Space') keys.jump=true;
});
window.addEventListener('keyup',e=>{
    if(e.code==='KeyW') keys.w=false;
    if(e.code==='KeyS') keys.s=false;
    if(e.code==='KeyA') keys.a=false;
    if(e.code==='KeyD') keys.d=false;
    if(e.code==='Space') keys.jump=false;
});

// --- Animation loop ---
const clock = new THREE.Clock();
function animate(){
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Horizontal movement
    const velocity = playerBody.velocity;
    const speed = 5;
    velocity.x = 0;
    velocity.z = 0;
    if(keys.w) velocity.z = -speed;
    if(keys.s) velocity.z = speed;
    if(keys.a) velocity.x = -speed;
    if(keys.d) velocity.x = speed;

    // Jumping
    if(keys.jump){
        // Cast ray down to see if on ground
        const ray = new CANNON.Ray(playerBody.position, new CANNON.Vec3(0,-1,0));
        const result = new CANNON.RaycastResult();
        ray.intersectWorld(world,{skipBackfaces:true},result);
        if(result.hasHit && result.distance < 1.05){
            playerBody.velocity.y = 7;
        }
        keys.jump=false;
    }

    // Step physics
    world.step(1/60, delta, 3);

    // Sync meshes
    playerMesh.position.copy(playerBody.position);
    playerMesh.quaternion.copy(playerBody.quaternion);
    for(let i=0;i<platforms.length;i++){
        platforms[i].position.copy(platformBodies[i].position);
        platforms[i].quaternion.copy(platformBodies[i].quaternion);
    }
    groundMesh.position.copy(groundBody.position);
    groundMesh.quaternion.copy(groundBody.quaternion);

    // Camera follow
    camera.position.x = playerMesh.position.x;
    camera.position.z = playerMesh.position.z + 10;
    camera.position.y = playerMesh.position.y + 5;
    camera.lookAt(playerMesh.position);

    renderer.render(scene,camera);
}
animate();
