import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.module.js";

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Camera ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.y = 1.6;

// --- Lights ---
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// --- Ground ---
const groundGeometry = new THREE.BoxGeometry(50, 1, 50);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.position.y = -0.5;
scene.add(groundMesh);

// --- Platforms ---
const platforms = [];
function makePlatform(x, y, z) {
    const geo = new THREE.BoxGeometry(4, 1, 4);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    platforms.push(mesh);
}
makePlatform(5, 2, 0);
makePlatform(-5, 4, -5);
makePlatform(0, 6, 5);
makePlatform(10, 8, 5);
makePlatform(-10, 10, 0);

// --- Player ---
const player = {
    position: new THREE.Vector3(0, 2, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    speed: 5,
    jumpSpeed: 6,
    onGround: false,
    height: 1.6,
};

// --- Input ---
const keys = { w:false, a:false, s:false, d:false, space:false };
window.addEventListener("keydown", e=>{ if(e.code.toLowerCase() in keys) keys[e.code.toLowerCase()] = true; });
window.addEventListener("keyup", e=>{ if(e.code.toLowerCase() in keys) keys[e.code.toLowerCase()] = false; });

// --- Mouse look ---
let yaw=0, pitch=0;
const sensitivity = 0.002;
document.body.addEventListener("click", ()=>document.body.requestPointerLock());
document.addEventListener("mousemove", e=>{
    if(document.pointerLockElement === document.body){
        yaw -= e.movementX * sensitivity;
        pitch -= e.movementY * sensitivity;
        pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, pitch));
    }
});

// --- Helper: simple collision ---
function checkCollisions(pos) {
    player.onGround = false;

    // Ground check
    if(pos.y <= 1.6) {
        pos.y = 1.6;
        player.velocity.y = 0;
        player.onGround = true;
    }

    // Platform collision
    platforms.forEach(p => {
        const px = p.position.x;
        const py = p.position.y + 0.5; // top surface
        const pz = p.position.z;
        const half = 2; // half width
        if(pos.x > px - half && pos.x < px + half && pos.z > pz - half && pos.z < pz + half){
            if(pos.y <= py + 0.1 && pos.y >= py - 1){
                pos.y = py + 0.1;
                player.velocity.y = 0;
                player.onGround = true;
            }
        }
    });
}

// --- Animate ---
const clock = new THREE.Clock();
function animate(){
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // --- Movement ---
    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    if(keys.w) direction.add(forward);
    if(keys.s) direction.sub(forward);
    if(keys.a) direction.sub(right);
    if(keys.d) direction.add(right);
    if(direction.lengthSq() > 0) direction.normalize();

    player.velocity.x = direction.x * player.speed;
    player.velocity.z = direction.z * player.speed;

    // Gravity
    player.velocity.y -= 9.82 * dt;

    // Jump
    if(keys.space && player.onGround){
        player.velocity.y = player.jumpSpeed;
    }

    // Apply velocity
    player.position.addScaledVector(player.velocity, dt);

    // Check collisions
    checkCollisions(player.position);

    // --- Camera ---
    camera.position.copy(player.position);
    camera.position.y += player.height;
    camera.rotation.set(pitch, yaw, 0);

    renderer.render(scene, camera);
}
animate();

// --- Resize ---
window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
