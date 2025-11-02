// Player
const playerGeometry = new THREE.BoxGeometry(1,2,1);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.y = 1;
scene.add(player);

// Movement
const move = { forward: false, backward: false, left: false, right: false, jump: false };
const velocity = new THREE.Vector3();
const speed = 0.1;
const jumpForce = 0.2;

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
