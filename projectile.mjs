import * as THREE from 'three';
import * as util from './util.mjs';

export function Projectile(level, theta, speed = 15) {
    const object = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), new THREE.MeshNormalMaterial);
    const spawnTime = Date.now();

    function awake() {}
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

    Object.assign(object, {
        awake, update, awaitingDeletion
    });
    return object;
}