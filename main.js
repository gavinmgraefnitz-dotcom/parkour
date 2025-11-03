import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";

// --- Scene & Renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// --- Lighting ---
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 20, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.3));

// --- Physics world ---
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });

// --- Ground ---
const groundBody = new CANNON.Body({ mass: 0 });
groundBody.addShape(new CANNON.Box(new CANNON.Vec3(10, 0.5, 10)));
groundBody.position.set(0, -0.5, 0);
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(
    new THREE.BoxGeometry(20, 1, 20),
    new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
groundMesh.position.copy(groundBody.position);
scene.add(groundMesh);

// --- Player body ---
const playerBody = new CANNON.Body({ mass: 1 });
playerBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5)));
playerBody.position.set(0, 2, 0);
playerBody.fixedRotation = true; // prevent tipping
playerBody.updateMassProperties();
world.addBody(playerBody);

// --- Player yaw object ---
const playerYaw = new THREE.Object3D();
scene.add(playerYaw);
playerYaw.add(camera);
camera.position.y = 1.6; // head height

// --- Input ---
const keys = { w: false, a: false, s: false, d: false, space: false };
window.addEventListener("keydown", e => {
    if (e.code === "KeyW") keys.w = true;
    if (e.code === "KeyA") keys.a = true;
    if (e.code === "KeyS") keys.s = true;
    if (e.code === "KeyD") keys.d = true;
    if (e.code === "Space") keys.space = true;
});
window.addEventListener("keyup", e => {
    if (e.code === "KeyW") keys.w = false;
    if (e.code === "KeyA") keys.a = false;
    if (e.code === "KeyS") keys.s = false;
    if (e.code === "KeyD") keys.d = false;
    if (e.code === "Space") keys.space = false;
});

// --- Jump check ---
let canJump = false;
playerBody.addEventListener("collide", e => {
    if (e.contact.ni.y > 0.5) canJump = true;
});

// --- Mouse look ---
let pitch = 0;
const sensitivity = 0.002;
document.body.addEventListener("click", () => document.body.requestPointerLock());
document.addEventListener("mousemove", e => {
    if (document.pointerLockElement === document.body) {
        playerYaw.rotation.y -= e.movementX * sensitivity; // yaw rotates player
        pitch -= e.movementY * sensitivity;
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
        camera.rotation.x = pitch; // pitch only rotates camera
    }
});

// --- Animate ---
const clock = new THREE.Clock();
const moveSpeed = 5;

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);

    // Step physics
    world.step(1 / 60, delta, 3);

    // --- Movement ---
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(playerYaw.rotation);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(playerYaw.rotation);
    const move = new THREE.Vector3();
    if (keys.w) move.add(forward);
    if (keys.s) move.add(forward.clone().negate());
    if (keys.a) move.add(right.clone().negate());
    if (keys.d) move.add(right);
    if (move.length() > 0) move.normalize().multiplyScalar(moveSpeed);

    playerBody.velocity.x = move.x;
    playerBody.velocity.z = move.z;

    // --- Jump ---
    if (keys.space && canJump) {
        playerBody.velocity.y = 6;
        canJump = false;
    }

    // --- Update yaw position ---
    playerYaw.position.copy(playerBody.position);

    renderer.render(scene, camera);
}
animate();

// --- Resize ---
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
