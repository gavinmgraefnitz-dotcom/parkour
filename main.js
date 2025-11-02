import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Light
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10);
scene.add(light);

// Ground
const groundGeo = new THREE.BoxGeometry(20, 1, 20);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.y = -0.5;
scene.add(ground);

// Platforms
const platformGeo = new THREE.BoxGeometry(4, 1, 4);
const platformMat = new THREE.MeshStandardMaterial({ color: 0x0000ff });

const platforms = [];

function createPlatform(x, y, z) {
    const plat = new THREE.Mesh(platformGeo, platformMat);
    plat.position.set(x, y, z);
    scene.add(plat);
    platforms.push(plat);
}

// Create some platforms
createPlatform(5, 1, 0);
createPlatform(-6, 2, -5);

// Player
const playerGeo = new THREE.BoxGeometry(1, 2, 1);
const playerMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.y = 1;
scene.add(player);

// Movement
const move = { forward: false, backward: false, left: false, right: false, jump: false };
const velocity = new THREE.Vector3();
const speed = 0.1;
const jumpForce = 0.2;
const gravity = -0.01;

// Input
window.addEventListener('keydown', e => {
    if(e.code === 'KeyW') move.forward = true;
    if(e.code === 'KeyS') move.backward = true;
    if(e.code === 'KeyA') move.left = true;
    if(e.code === 'KeyD') move.right = true;
    if(e.code === 'Space') move.jump = true;
});

window.addEventListener('keyup', e => {
    if(e.code === 'KeyW') move.forward = false;
    if(e.code === 'KeyS') move.backward = false;
    if(e.code === 'KeyA') move.left = false;
    if(e.code === 'KeyD') move.right = false;
    if(e.code === 'Space') move.jump = false;
});

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Collision helper
function checkPlatformCollision(px, py, pz) {
    for(const plat of platforms.concat([ground])) {
        const hw = plat.geometry.parameters.width / 2;
        const hh = plat.geometry.parameters.height / 2;
        const hd = plat.geometry.parameters.depth / 2;

        const minX = plat.position.x - hw;
        const maxX = plat.position.x + hw;
        const minY = plat.position.y - hh;
        const maxY = plat.position.y + hh;
        const minZ = plat.position.z - hd;
        const maxZ = plat.position.z + hd;

        // Check XZ overlap
        if(px + 0.5 > minX && px - 0.5 < maxX &&
           pz + 0.5 > minZ && pz - 0.5 < maxZ) {

            // Check if falling onto platform
            if(py - 1 >= minY && py - 1 + velocity.y <= maxY) {
                return maxY + 1; // top of platform + half player height
            }
        }
    }
    return null;
}

// Animate
function animate() {
    requestAnimationFrame(animate);

    // Horizontal movement
    let newX = player.position.x;
    let newZ = player.position.z;
    if(move.forward) newZ -= speed;
    if(move.backward) newZ += speed;
    if(move.left) newX -= speed;
    if(move.right) newX += speed;

    player.position.x = newX;
    player.position.z = newZ;

    // Gravity
    velocity.y += gravity;
    player.position.y += velocity.y;

    // Collision
    const platformTop = checkPlatformCollision(player.position.x, player.position.y, player.position.z);
    if(platformTop !== null) {
        player.position.y = platformTop;
        velocity.y = 0;
        if(move.jump) {
            velocity.y = jumpForce;
        }
    }

    // Camera
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 10;
    camera.lookAt(player.position);

    renderer.render(scene, camera);
}
animate();
