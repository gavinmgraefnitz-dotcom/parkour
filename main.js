import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';

// Three.js scene
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

// Cannon.js world
const world = new CANNON.World({
    gravity: new CANNON.Vec3(0,-9.82,0) // gravity
});

// Materials
const physicsMaterial = new CANNON.Material("default");

// Ground
const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Box(new CANNON.Vec3(10,0.5,10)),
    position: new CANNON.Vec3(0,-0.5,0),
    material: physicsMaterial
});
world.addBody(groundBody);

const groundGeo = new THREE.BoxGeometry(20,1,20);
const groundMat = new THREE.MeshStandardMaterial({color:0x00ff00});
const groundMesh = new THREE.Mesh(groundGeo,groundMat);
groundMesh.position.copy(groundBody.position);
scene.add(groundMesh);

// Platforms
const platforms = [];
const platformBodies = [];

function createPlatform(x,y,z){
    const platShape = new CANNON.Box(new CANNON.Vec3(2,0.5,2));
    const platBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: platShape,
        position: new CANNON.Vec3(x,y,z)
    });
    world.addBody(platBody);
    platformBodies.push(platBody);

    const platGeo = new THREE.BoxGeometry(4,1,4);
    const platMat = new THREE.MeshStandardMaterial({color:0x0000ff});
    const platMesh = new THREE.Mesh(platGeo,platMat);
    scene.add(platMesh);
    platforms.push(platMesh);
}

// Create sample platforms
createPlatform(5,1,0);
createPlatform(-6,2,-5);

// Player
const playerShape = new CANNON.Box(new CANNON.Vec3(0.5,1,0.5));
const playerBody = new CANNON.Body({
    mass: 1,
    shape: playerShape,
    position: new CANNON.Vec3(0,1,0),
    material: physicsMaterial
});
playerBody.fixedRotation = true; // prevent tipping
playerBody.updateMassProperties();
world.addBody(playerBody);

const playerGeo = new THREE.BoxGeometry(1,2,1);
const playerMat = new THREE.MeshStandardMaterial({color:0xff0000});
const playerMesh = new THREE.Mesh(playerGeo,playerMat);
scene.add(playerMesh);

// Controls
const move = {forward:false,backward:false,left:false,right:false,jump:false};
window.addEventListener('keydown',e=>{
    if(e.code==='KeyW') move.forward=true;
    if(e.code==='KeyS') move.backward=true;
    if(e.code==='KeyA') move.left=true;
    if(e.code==='KeyD') move.right=true;
    if(e.code==='Space') move.jump=true;
});
window.addEventListener('keyup',e=>{
    if(e.code==='KeyW') move.forward=false;
    if(e.code==='KeyS') move.backward=false;
    if(e.code==='KeyA') move.left=false;
    if(e.code==='KeyD') move.right=false;
    if(e.code==='Space') move.jump=false;
});

// Animation loop
function animate(){
    requestAnimationFrame(animate);

    // Apply horizontal movement
    const velocity = playerBody.velocity;
    const speed = 5;
    if(move.forward) velocity.z = -speed;
    if(move.backward) velocity.z = speed;
    if(move.left) velocity.x = -speed;
    if(move.right) velocity.x = speed;

    // Jump
    if(move.jump){
        // Only allow jump if roughly on the ground
        const ray = new CANNON.Ray(playerBody.position, new CANNON.Vec3(0,-1,0));
        const result = new CANNON.RaycastResult();
        ray.intersectWorld(world,{collisionFilterMask:-1, skipBackfaces:true},result);
        if(result.hasHit && result.distance < 1.05){
            playerBody.velocity.y = 7; // jump strength
        }
        move.jump=false;
    }

    // Step physics
    world.step(1/60);

    // Sync Three.js meshes
    playerMesh.position.copy(playerBody.position);
    playerMesh.quaternion.copy(playerBody.quaternion);
    for(let i=0;i<platforms.length;i++){
        platforms[i].position.copy(platformBodies[i].position);
        platforms[i].quaternion.copy(platformBodies[i].quaternion);
    }
    groundMesh.position.copy(groundBody.position);
    groundMesh.quaternion.copy(groundBody.quaternion);

    // Camera follows
    camera.position.x = playerMesh.position.x;
    camera.position.z = playerMesh.position.z + 10;
    camera.lookAt(playerMesh.position);

    renderer.render(scene,camera);
}
animate();
