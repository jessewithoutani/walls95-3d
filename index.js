import * as THREE from 'three';
import * as util from './util.mjs';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Level } from './levels.mjs';
import { Projectile } from './projectile.mjs';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/addons/postprocessing/GlitchPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';

THREE.Cache.clear();


const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(1.5);
renderer.setSize(window.innerWidth - 120, window.innerHeight - 120);
// renderer.sortObjects = true;
document.body.appendChild(renderer.domElement);


const scene = new THREE.Scene();
// sky: 0x86bde3
scene.fog = new THREE.FogExp2(0x000000, 0.05);
scene.background = new THREE.Color(0x86bde3);
let camera = undefined;

let player = undefined;
let playerVelocity = 0;
const MAX_HEALTH = 5;
let dead = false;
let locked = false;

let combatCooldown = 0.15;
let timeSinceLastShot = 999;

let theta = 0;

let hidingOverlay;
const hidingGradient = "radial-gradient(circle, transparent 0%, #000 100%)";
let hiddenWhenHiding = [];

// POST PROCESSING

// const composer = new EffectComposer(renderer);
// composer.addPass(new RenderPass(scene, camera));
// // const glitchPass = new GlitchPass(); composer.addPass(glitchPass);
// // composer.addPass(new SMAAPass(window.innerWidth, window.innerHeight));
// composer.addPass(new FilmPass(0.3));

// GUI STUFF

function secretFound() {
    document.getElementById("secret").style.display = "block";
    setTimeout(() => {
        document.getElementById("secret").style.display = "none";
    }, 1500);
}


// OTEHR STUFF IDK

function setupSky() {
    const skyGeometry = new THREE.SphereGeometry(1000);
    const skyMaterial = new THREE.MeshBasicMaterial({
        map: util.loadTexture("sky.png"),
        side: THREE.BackSide,
        fog: false
    })
    const skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(skyMesh);
    skyMesh.position.set(0, 0, 0);
}
function setupCamera() {
    camera = new THREE.PerspectiveCamera(75, 
        (window.innerWidth - 120) / (window.innerHeight - 120), 
        0.1, 7500);
    camera.rotation.order = 'YXZ';
}
let controls = null;
function setupPlayer() {
    setupCamera();
    setupSky();
    player = new THREE.Object3D();
    player.position.set(0, 0, 0);
    scene.add(player);
    player.add(camera);
    player.userData.hiding = false;
    player.userData.martinDamageTimer = 0;
    player.userData.health = 5;
    controls = new PointerLockControls(camera, document.body);
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
        if (dead) return;
        controls.lock();
    });

    // controls.lock();
    player.name = "PLAYER";

    hidingOverlay = document.getElementById("hiding-overlay");
    hiddenWhenHiding = document.querySelectorAll(".viewmodel, .viewmodel-orb, #crosshair");
}
let level = undefined;
let projectiles = [];
let attackPressed = false;

function setupScene() {
    const directional = new THREE.DirectionalLight(0xfff2b3, 2.5);
    directional.position.set(0.5, 1, 0.1);
    scene.add(directional);
    const ambient = new THREE.AmbientLight(0x777ca1, 2);
    scene.add(ambient);

    // ======================================
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshPhongMaterial({
        map: util.loadTexture("fancy_floor.png", 500, 500)
    })); ground.name = "GROUND";
    scene.add(ground);
    ground.rotation.x = -Math.PI / 2;

    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshPhongMaterial({
        map: util.loadTexture("fancy_floor.png", 500, 500)
    })); ceiling.name = "CEILING";
    scene.add(ceiling);
    ceiling.position.y = 4;
    ceiling.rotation.x = Math.PI / 2;

    // ======================================
    console.log(main);
    const urlParams = new URLSearchParams(window.location.search);
    const filePath = atob(urlParams.get("filePath"));
    // alert(filePath)
    level = new Level(main, player, filePath);
    level.name = "LEVEL";
    scene.add(level);
}
var pressedKeys = {};
window.onkeyup = function(event) { pressedKeys[event.key] = false; }
window.onkeydown = function(event) {
    if (dead && event.key == " ") {
        location.reload();
        return;
    }
    // if (event.key == "e") {
    //     window.onmousedown();
    // }
    if (event.key == " ") {
        player.userData.hiding = false;
    }
    pressedKeys[event.key] = true;
}
window.onmousedown = function(event) {
    attackPressed = true;
}

// start() update runs once before the first frame
function start() {
    setupPlayer();
    setupScene();
    healthIcons = document.querySelectorAll("#health .icon");
    previousHealth = player.userData.health;

    setTimeout(() => {
        document.getElementById("loading-overlay").remove();
    }, 300);
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

    if (player.userData.hiding) {
        walkMovement = 0;
        strafeMovement = 0;
    }

    theta = camera.rotation.y;
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

function updateAttacking(delta) {
    if ((attackPressed || pressedKeys.e) && timeSinceLastShot >= combatCooldown) {
        const newProjectile = new Projectile(level, theta);
        newProjectile.position.copy(player.position);
        newProjectile.position.y = 1.85;
        projectiles.push(newProjectile);
        scene.add(newProjectile);
        timeSinceLastShot = 0;
        attackPressed = false;
    }
    else {
        timeSinceLastShot += delta;
    }
}

function updateHiding(delta) {
    hiddenWhenHiding.forEach((element) => {
        if (player.userData.hiding) {
            element.classList.add("hidden");
        }
        else {
            element.classList.remove("hidden");
        }
    });
    if (player.userData.hiding) {
        hidingOverlay.classList.remove("hidden");
        if (player.userData.martinDamageTimer < 0.5) {
            hidingOverlay.classList.remove("hiding-1");
            hidingOverlay.classList.add("hiding-2");
        }
        else if (player.userData.martinDamageTimer < 1.75) {
            hidingOverlay.classList.remove("hiding-2");
            hidingOverlay.classList.add("hiding-1");
        }
        else {
            hidingOverlay.classList.remove("hiding-1");
            hidingOverlay.classList.remove("hiding-2");
        }
    }
    else {
        hidingOverlay.classList.add("hidden");
    }
}

const clock = new THREE.Clock();
let timeElapsed = 0;
// update() runs every frame
function updateProjectiles(delta, theta) {
    if (projectiles.length > 0 && projectiles[0].awaitingDeletion()) {
        scene.remove(projectiles[0]);
        projectiles.shift();
    }
    projectiles.forEach(projectile => {
        projectile.update(delta);
        // console.log(projectile.position)
    });
}
let healthIcons = null;
let previousHealth = 0;
let damageOverlayTransparency = 0;
let healOverlayTransparency = 0;

function update() {
    requestAnimationFrame(update);
    if (!level || !level.finished || dead) {
        return;
    }

    if (!locked) pressedKeys = {};

    const delta = clock.getDelta();
    timeElapsed += delta;

    document.getElementById("user-data").innerHTML = JSON.stringify(player.userData)
        .replace("icecream", "<span id='ice-cream'>icecream</span>")
        .replace("document", "<span id='document'>document</span>");

    let iconIndex = 0;
    healthIcons.forEach((element) => {
        if (player.userData.health <= iconIndex) {
            element.classList.add("blacked-icon");
        }
        else {
            element.classList.remove("blacked-icon");
        }
        iconIndex++;
    })
    
    if (timeSinceLastShot <= 0.12) {
        document.getElementById("right-hand").src = "textures/right_hand_fire.png";
    }
    else {
        document.getElementById("right-hand").src = "textures/right_hand.png";
    }

    player.userData.health = util.clamp(player.userData.health, 0, MAX_HEALTH);
    damageOverlayTransparency = util.lerp(damageOverlayTransparency, (1 - player.userData.health / MAX_HEALTH) * 0.6, 0.075);
    healOverlayTransparency *= 0.8;
    if (player.userData.health <= 0) {
        document.getElementById("death-screen").classList.remove("hidden");
        dead = true;
        controls.unlock();
        document.querySelector("canvas").remove();
        setTimeout(() => { document.getElementById("bsod-1").classList.remove("hidden"); }, 100);
        setTimeout(() => { document.getElementById("bsod-2").classList.remove("hidden"); }, 250);
        setTimeout(() => { document.getElementById("bsod-3").classList.remove("hidden"); }, 500);
        return;
    }
    else if (player.userData.health != previousHealth) {
        if (player.userData.health < previousHealth) {
            damageOverlayTransparency = 1;
        }
        else {
            healOverlayTransparency = 1;
        }
    }
    previousHealth = player.userData.health;
    document.getElementById("damage-overlay").style.opacity = damageOverlayTransparency;
    document.getElementById("heal-overlay").style.opacity = healOverlayTransparency;

    // update stuff
    updatePlayer(delta);
    updateHiding(delta);
    updateAttacking(delta);
    level.update(delta);
    updateProjectiles(delta, theta);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    // composer.render();
}

let main = {
    secretFound
};

document.body.onload = () => {
    start();
    update();
}