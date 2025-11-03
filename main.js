const world = new CANNON.World({ gravity: new CANNON.Vec3(0,-9.82,0) });
world.broadphase = new CANNON.NaiveBroadphase();
world.allowSleep = true;

// Physics materials
const material = new CANNON.Material();
world.defaultContactMaterial = new CANNON.ContactMaterial(material, material, { friction:0, restitution:0 });

// === Ground ===
const groundShape = new CANNON.Box(new CANNON.Vec3(10,0.5,10));
const groundBody = new CANNON.Body({ mass:0, shape:groundShape });
const groundBody = new CANNON.Body({ mass:0, shape: groundShape });
world.addBody(groundBody);

const groundMesh = new THREE.Mesh(
@@ -96,15 +94,15 @@ window.addEventListener("keyup", e=>{
  if(e.code==="Space") keys.jump=false;
});

// === Mouse Look ===
let yaw=0, pitch=0;
// === Mouse Look (Horizontal Only) ===
let yaw = 0;
const sensitivity = 0.002;
document.body.addEventListener("click",()=>document.body.requestPointerLock());

document.body.addEventListener("click", ()=>document.body.requestPointerLock());
document.addEventListener("mousemove", e=>{
    if(document.pointerLockElement===document.body){
    if(document.pointerLockElement === document.body){
        yaw -= e.movementX * sensitivity;
        pitch -= e.movementY * sensitivity;
        pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
        // pitch ignored for horizontal-only rotation
    }
});

@@ -157,9 +155,9 @@ function animate(){
    if(dir.length()>0) dir.normalize();

    const sin=Math.sin(yaw), cos=Math.cos(yaw);
    const x=dir.x*cos - dir.z*sin;
    const z=dir.x*sin + dir.z*cos;
    dir.x=x; dir.z=z;
    const x = dir.x*cos - dir.z*sin;
    const z = dir.x*sin + dir.z*cos;
    dir.x = x; dir.z = z;

    const speed = grounded ? moveSpeed : airSpeed;
    const vel = dir.scale(speed);
@@ -170,7 +168,7 @@ function animate(){
    if(keys.jump && grounded){
        playerBody.velocity.y = jumpSpeed;
    }
    keys.jump=false;
    keys.jump = false;

    // Damping
    if(grounded && dir.length()===0){
@@ -180,15 +178,15 @@ function animate(){

    // Camera follows player + apply bob/sway
    applyCameraBob(delta, dir.length());
    camera.rotation.set(pitch, yaw, 0);
    camera.rotation.set(0, yaw, 0); // horizontal only

    renderer.render(scene,camera);
}

animate();

// --- Window Resize ---
window.addEventListener("resize",()=>{
window.addEventListener("resize", ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
