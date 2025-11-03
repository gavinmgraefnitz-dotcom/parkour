
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
const world = new CANNON.World({ gravity: new CANNON.Vec3(0,-9.82,0) });

// --- Materials ---
const defaultMaterial = new CANNON.Material('default');
@@ -80,7 +78,7 @@
    position:new CANNON.Vec3(0,1,0),
    material: defaultMaterial
});
playerBody.fixedRotation = true;
playerBody.fixedRotation = true; // prevents tipping over
playerBody.updateMassProperties();
world.addBody(playerBody);

@@ -114,46 +112,46 @@
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
    let moveX = 0;
    let moveZ = 0;
    if(keys.w) moveZ -= speed;
    if(keys.s) moveZ += speed;
    if(keys.a) moveX -= speed;
    if(keys.d) moveX += speed;

    // Apply horizontal velocity
    playerBody.velocity.x = moveX;
    playerBody.velocity.z = moveZ;

    // Jumping
    const groundTolerance = 0.1; // how close to ground to allow jump
    if(keys.jump){
        // Cast ray down to see if on ground
        const ray = new CANNON.Ray(playerBody.position, new CANNON.Vec3(0,-1,0));
        const result = new CANNON.RaycastResult();
        ray.intersectWorld(world,{skipBackfaces:true},result);
        if(result.hasHit && result.distance < 1.05){
            playerBody.velocity.y = 7;
        if(Math.abs(playerBody.velocity.y) < groundTolerance){
            playerBody.velocity.y = 7; // jump strength
        }
        keys.jump=false;
    }

    // Step physics
    world.step(1/60, delta, 3);

    // Sync meshes
    // Sync Three.js meshes
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
