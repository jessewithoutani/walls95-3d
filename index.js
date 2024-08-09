import * as THREE from 'three';
import * as util from './util.mjs';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Level } from './levels.mjs';

const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(0.7);
renderer.setSize(window.innerWidth - 120, window.innerHeight - 120);
// renderer.sortObjects = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.07);
let camera = undefined;

let player = undefined;
let playerVelocity = 0;
let locked = false;

// GUI STUFF

function secretFound() {
    document.getElementById("secret").style.display = "block";
    setTimeout(() => {
        document.getElementById("secret").style.display = "none";
    }, 1500);
}


// OTEHR STUFF IDK


function setupCamera() {
    camera = new THREE.PerspectiveCamera(75, 
        (window.innerWidth - 120) / (window.innerHeight - 120), 
        0.1, 1000);
    camera.rotation.order = 'YXZ';
}
function setupPlayer() {
    setupCamera();
    player = new THREE.Object3D();
    player.position.set(0, 0, 0);
    scene.add(player);
    player.add(camera);
    const controls = new PointerLockControls(camera, document.body);
    controls.pointerSpeed = 0.6;
    controls.minPolarAngle = Math.PI/2;
    controls.maxPolarAngle = Math.PI/2;
    
    controls.addEventListener("lock", () => {
        // menu.style.display = "none";
        locked = true;
    });
    controls.addEventListener("unlock", () => {
        // menu.style.display = "block";
        locked = false;
    });
    document.body.addEventListener("click", () => {
        controls.lock();
    });

    player.name = "PLAYER";
}
let level = undefined;
function setupScene() {
    const directional = new THREE.DirectionalLight(0xffffff, 2.5);
    directional.position.set(0.5, 1, 0.1);
    scene.add(directional);
    const ambient = new THREE.AmbientLight(0x888899, 2);
    scene.add(ambient);

    // ======================================
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshPhongMaterial({
        map: util.loadTexture("floor.png", 500, 500)
    }));
    scene.add(ground);
    ground.rotation.x = -Math.PI / 2;

    // ======================================
    console.log(main);
    level = new Level(main, player);
    scene.add(level);
}
var pressedKeys = {};
window.onkeyup = function(event) { pressedKeys[event.key] = false; }
window.onkeydown = function(event) { pressedKeys[event.key] = true; }

// start() update runs once before the first frame
function start() {
    setupPlayer();
    setupScene();
}

const WALK_SPEED = 7;
const PLAYER_RADIUS = 0.5;
function updatePlayer(delta) {
    let walkMovement = 0;
    let strafeMovement = 0;
    if (pressedKeys.w || pressedKeys.W) walkMovement++;
    if (pressedKeys.s || pressedKeys.S) walkMovement--;
    if (pressedKeys.a || pressedKeys.A) strafeMovement--;
    if (pressedKeys.d || pressedKeys.D) strafeMovement++;

    const theta = camera.rotation.y;
    const walkVector = new THREE.Vector3(
        Math.sin(theta), 0, Math.cos(theta)); walkVector.multiplyScalar(WALK_SPEED * delta * -walkMovement);
    const strafeVector = new THREE.Vector3(
        Math.sin(theta + Math.PI / 2), 0, Math.cos(theta + Math.PI / 2)); strafeVector.multiplyScalar(WALK_SPEED * delta * strafeMovement);
    
    const moveVector = walkVector.clone().add(strafeVector).clampLength(0, WALK_SPEED * delta);
    // player.position.add(moveVector);
    camera.position.y = 2 + (Math.sin(timeElapsed * 12.5) * Math.max(Math.abs(walkMovement), Math.abs(strafeMovement)) * 0.07);

    // console.log(level.checkIntersection(player.position))
    const moveX = moveVector.clone(); moveX.z = 0;
    const moveZ = moveVector.clone(); moveZ.x = 0;

    level.checkTriggerIntersection(player.position, PLAYER_RADIUS, player);
    player.position.add(moveX);
    if (level.checkIntersection(player.position, PLAYER_RADIUS)) {
        player.position.sub(moveX);
    }
    player.position.add(moveZ);
    if (level.checkIntersection(player.position, PLAYER_RADIUS)) {
        player.position.sub(moveZ);
    }
}

const clock = new THREE.Clock();
let timeElapsed = 0;
// update() runs every frame
function update() {
    requestAnimationFrame(update);
    if (!level || !level.finished) {
        return;
    }

    if (!locked) pressedKeys = {};

    const delta = clock.getDelta();
    timeElapsed += delta;

    document.getElementById("user-data").innerHTML = JSON.stringify(player.userData)
        .replace("icecream", "<span id='ice-cream'>icecream</span>")
        .replace("document", "<span id='document'>document</span>");

    // update stuff
    updatePlayer(delta);
    level.update(delta);
    renderer.render(scene, camera);
}

let main = {
    secretFound
};

start();
update();