// main.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js';

// Scene & Camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

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

const platform1 = new THREE.Mesh(platformGeo, platformMat);
platform1.position.set(5, 1, 0);
scene.add(platform1);

const platform2 = new THREE.Mesh(platformGeo, platformMat);
platform2.position.set(-6, 2, -5);
scene.add(platform2);

// Player
const playerGeo = new THREE.BoxGeometry(1, 2, 1);
const playerMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.y = 1;
scene.add(player);

// Movement variables
const move = { forward: false, backward: false, left: false, right: false, jump: false };
const velocity = new THREE.Vector3();
const speed = 0.1;
const jumpForce = 0.2;
const gravity = -0.01;

window.addEventListener('keydown', (e) => {
    if(e.code === 'KeyW') move.forward = true;
    if(e.code === 'KeyS') move.backward = true;
    if(e.code === 'KeyA') move.left = true;
    if(e.code === 'KeyD') move.right = true;
    if(e.code === 'Space') move.jump = true;
});

window.addEventListener('keyup', (e) => {
    if(e.code === 'KeyW') move.forward = false;
    if(e.code === 'KeyS') move.backward = false;
    if(e.code === 'KeyA') move.left = false;
    if(e.code === 'KeyD') move.right = false;
    if(e.code === 'Space') move.jump = false;
});

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animate loop
function animate() {
    requestAnimationFrame(animate);

    // Horizontal movement
    if(move.forward) player.position.z -= speed;
    if(move.backward) player.position.z += speed;
    if(move.left) player.position.x -= speed;
    if(move.right) player.position.x += speed;

    // Jump & gravity
    if(move.jump && player.position.y <= 1.01) velocity.y = jumpForce;
    velocity.y += gravity;
    player.position.y += velocity.y;
    if(player.position.y < 1) { 
        player.position.y = 1; 
        velocity.y = 0; 
    }

    // Camera follows player
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 10;
    camera.lookAt(player.position);

    renderer.render(scene, camera);
}
animate();
