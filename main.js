// main.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";
import * as CANNON from "https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js";
import { levels } from './levels.js';

// === Scene Setup ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// === Renderer ===
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// === Camera ===
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.6;

// === Lights ===
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// === Physics World ===
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
world.broadphase = new CANNON.NaiveBroadphase();

const groundMaterial = new CANNON.Material("ground");
const playerMaterial = new CANNON.Material("player");
const contactMaterial = new CANNON.ContactMaterial(playerMaterial, groundMaterial, {
    friction: 0.1,
    restitution: 0.1
});
world.addContactMaterial(contactMaterial);

// === Player Physics Body ===
const playerShape = new CANNON.Sphere(0.5);
const playerBody = new CANNON.Body({ mass: 5, material: playerMaterial });
playerBody.addShape(playerShape);
playerBody.position.set(0, 2, 0);
playerBody.linearDamping = 0.9;
world.addBody(playerBody);

// === Hands ===
const hands = new THREE.Group();
camera.add(hands);
const handMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), handMaterial);
const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), handMaterial);
leftHand.position.set(-0.2, -0.4, -0.5);
rightHand.position.set(0.2, -0.4, -0.5);
hands.add(leftHand, rightHand);

// === Ground Detection Function ===
function isOnGround() {
    const rayStart = new CANNON.Vec3(playerBody.position.x, playerBody.position.y, playerBody.position.z);
    const rayEnd = new CANNON.Vec3(playerBody.position.x, playerBody.position.y - 0.6, playerBody.position.z);
    const ray = new CANNON.Ray(rayStart, rayEnd);
    const result = new CANNON.RaycastResult();

    ray.intersectWorld(world, {
        collisionFilterMask: -1,
        skipBackfaces: true
    }, result);

    return result.hasHit && result.distance <= 0.6;
}

// === Level System ===
let currentLevel = 0;
const platforms = [];

function loadLevel(levelIndex) {
    platforms.forEach(p => {
        scene.remove(p.mesh);
        world.removeBody(p.body);
    });
    platforms.length = 0;

    const levelData = levels[levelIndex];
    levelData.forEach(p => {
        const shape = new CANNON.Box(new CANNON.Vec3(p.w/2, p.h/2, p.d/2));
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.set(p.x, p.y, p.z);
        world.addBody(body);

        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(p.w, p.h, p.d),
            new THREE.MeshStandardMaterial({ color: p.color })
        );
        mesh.position.set(p.x, p.y, p.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        platforms.push({ body, mesh });
    });

    playerBody.position.set(0, 2, 0);
    playerBody.velocity.set(0, 0, 0);
}

loadLevel(currentLevel);

function checkLevelComplete() {
    if (playerBody.position.x > 20 && currentLevel < levels.length - 1) {
        currentLevel++;
        loadLevel(currentLevel);
    }
    if (playerBody.position.y < -10) {
        loadLevel(currentLevel);
    }
}

// === Input ===
const keys = { w: false, a: false, s: false, d: false, space: false };
let canJump = true; // Jump lock to prevent infinite jump on hold

document.addEventListener("keydown", e => {
    if (e.code === "KeyW") keys.w = true;
    if (e.code === "KeyA") keys.a = true;
    if (e.code === "KeyS") keys.s = true;
    if (e.code === "KeyD") keys.d = true;
    if (e.code === "Space") keys.space = true;
});
document.addEventListener("keyup", e => {
    if (e.code === "KeyW") keys.w = false;
    if (e.code === "KeyA") keys.a = false;
    if (e.code === "KeyS") keys.s = false;
    if (e.code === "KeyD") keys.d = false;
    if (e.code === "Space") keys.space = false;
    canJump = true; // Reset jump lock on release
});

// === Mouse Look ===
let yaw = 0;
let pitch = 0;
const sensitivity = 0.002;
let isPointerLocked = false;
document.body.addEventListener("click", () => document.body.requestPointerLock());
document.addEventListener("pointerlockchange", () => {
    isPointerLocked = document.pointerLockElement === document.body;
});
document.addEventListener("mousemove", e => {
    if (isPointerLocked) {
        yaw -= e.movementX * sensitivity;
        pitch -= e.movementY * sensitivity;
        pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, pitch));
    }
});

// === Animation Loop ===
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = Math.min(clock.getDelta(), 0.05);

    world.step(1/60, deltaTime, 3);

    // --- Movement ---
    const speed = 5;
    const inputDirection = new THREE.Vector3();
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    if (keys.w) inputDirection.add(forward);
    if (keys.s) inputDirection.sub(forward);
    if (keys.a) inputDirection.sub(right);
    if (keys.d) inputDirection.add(right);
    if (inputDirection.length() > 0) inputDirection.normalize();

    playerBody.velocity.x = inputDirection.x * speed;
    playerBody.velocity.z = inputDirection.z * speed;

    // --- Jump with ground detection + jump lock ---
    if (keys.space) {
        if (isOnGround() && canJump) {
            playerBody.velocity.y = 7;
            canJump = false;
        }
    }

    // --- Camera ---
    camera.position.copy(playerBody.position);
    camera.position.y += 1.6;
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    camera.rotation.z = 0;

    // --- Level & reset check ---
    checkLevelComplete();

    renderer.render(scene, camera);
}

animate();

// --- Window Resize ---
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
