import * as THREE from 'three';
import * as util from './util.mjs';

const projectileMaterial = new THREE.SpriteMaterial({ map: util.loadTexture("projectile.png") });

export function Projectile(level, theta, speed = 15) {
    // const object = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), new THREE.MeshNormalMaterial);
    const object = new THREE.Object3D();
    const spawnTime = Date.now();

    function awake() {
        const sprite = new THREE.Sprite(projectileMaterial);
        object.add(sprite);
        object.scale.set(0.5, 0.5, 0.5);
    }
    function update(delta) {
        console.log(`${theta} ${speed} ${delta}`)
        const newDirectionVector = new THREE.Vector3(-Math.sin(theta) * speed * delta, 0, -Math.cos(theta) * speed * delta);
        console.log(newDirectionVector)
        object.position.add(newDirectionVector);
        level.checkIntersection(object.position, 0.1);
    }
    function awaitingDeletion() {
        return Math.abs(spawnTime - Date.now()) / 1000 >= 30;
    }

    awake();

    Object.assign(object, {
        awake, update, awaitingDeletion
    });
    return object;
}