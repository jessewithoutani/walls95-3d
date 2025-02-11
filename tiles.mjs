import * as THREE from 'three';
import * as util from './util.mjs';

const TILE_SIZE = 4;

const shineMaterial = new THREE.SpriteMaterial({ map: util.loadTexture("shine.png") });
const bobDormantMaterial = new THREE.SpriteMaterial({ map: util.loadTexture("bob_dormant.png") });
const bobHappyMaterial = new THREE.SpriteMaterial({ map: util.loadTexture("bob_happy.png") });
const exitMaterial = new THREE.SpriteMaterial({ map: util.loadTexture("exit.png") });


function inCylinderCollider(position, objectPosition, objectRadius, radius) {
    return ((position.x - objectPosition.x) ** 2 + (position.z - objectPosition.z) ** 2) <= (objectRadius + radius) ** 2;
}
function inSquareCollider(position, objectPosition, objectHalfLength, radius) {
    return Math.abs(position.x - objectPosition.x) <= objectHalfLength + radius
        && Math.abs(position.z - objectPosition.z) <= objectHalfLength + radius;
}


function Tile(collision = false, trigger = false, requiresUpdate = false, enemy = false) {
    const object = new THREE.Object3D();

    function colliding(position, radius = 0) {
        return false;
    }
    function inTrigger(position, radius = 0, player) {
        return false;
    }

    function awake() {}
    function update(delta) {}

    Object.assign(object, {
        collision, trigger, requiresUpdate, enemy,
        colliding, inTrigger, awake, update
    });
    return object;
}

function WallBlock(texture) {
    const object = new Tile(true); object.name = "TILE_WB";

    function colliding(position, radius = 0) {
        return inSquareCollider(position, object.position, 2, radius);
    }

    function awake() {
        object.add(
            new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, TILE_SIZE), 
            new THREE.MeshPhongMaterial({ map: texture })));
    }

    object.colliding = colliding;
    object.awake = awake;
    awake();
    
    return object;
}
function NormalWallBlock() {
    const object = new Tile(true); object.name = "TILE_NWB";

    function colliding(position, radius = 0) {
        return inSquareCollider(position, object.position, 2, radius);
    }

    function awake() {
        object.add(new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, TILE_SIZE), new THREE.MeshNormalMaterial));
    }

    object.colliding = colliding;
    object.awake = awake;
    awake();
    
    return object;
}
function Bob() {
    const object = new Tile(true, true, true); object.name = "ENTITY_BOB";
    let opened = false;
    let sprite;

    function colliding(position, radius = 0) {
        return !opened && inSquareCollider(position, object.position, 2, radius);
    }

    function inTrigger(position, radius = 0, player) {
        if (!opened && inSquareCollider(position, object.position, 2.2, radius) && "icecream" in player.userData && player.userData.icecream > 0) {
            opened = true;
            sprite.material = bobHappyMaterial;
            player.userData.icecream--;
            return true;
        }
        return false;
    }

    function awake() {
        sprite = new THREE.Sprite(bobDormantMaterial);
        object.add(sprite);
        object.scale.set(2, 2, 2);
    }
    function update(delta) {
        if (opened) {
            sprite.position.y -= 2.1 * delta;
            if (sprite.position.y <= -4) object.remove(sprite);
        }
    }
    
    object.colliding = colliding;
    object.inTrigger = inTrigger;
    object.awake = awake;
    object.update = update;
    awake();
    // object.clone = () => {
    //     const cloned = Object.create(Object.getPrototypeOf(object), Object.getOwnPropertyDescriptors(object));
    //     return cloned;
    // }
    return object;
}
function BlockDoor(texture) {
    const object = new Tile(true, true, true); object.name = "TILE_BLKD";
    let opened = false;
    let sprite;

    function colliding(position, radius = 0) {
        return sprite.position.y > -2 && inSquareCollider(position, object.position, 2, radius);
    }

    function inTrigger(position, radius = 0, player) {
        if (!opened && inSquareCollider(position, object.position, 2.2, radius)) {
            opened = true;
            return true;
        }
        return false;
    }

    function awake() {
        sprite = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, TILE_SIZE), new THREE.MeshPhongMaterial({
            map: texture}));
        object.add(sprite);
    }
    function update(delta) {
        if (opened) {
            sprite.position.y -= 2.1 * delta;
            if (sprite.position.y <= -4) object.remove(sprite);
        }
    }
    
    object.colliding = colliding;
    object.inTrigger = inTrigger;
    object.awake = awake;
    object.update = update;
    awake();
    // object.clone = () => {
    //     const cloned = Object.create(Object.getPrototypeOf(object), Object.getOwnPropertyDescriptors(object));
    //     return cloned;
    // }
    return object;
}

function Exit() {
    const object = new Tile(false, true, true); object.name = "ENTITY_EXIT";
    let opened = false;
    let sprite;

    function inTrigger(position, radius = 0, player) {
        if (opened && inSquareCollider(position, object.position, 2.2, radius)) {
            //
            return true;
        }
        return false;
    }

    function awake() {
        sprite = new THREE.Sprite(exitMaterial);
        object.add(sprite);
        object.scale.set(2, 2, 2);
    }
    function update(delta) {
        // if (opened) {
        //     sprite.position.y -= 2.1 * delta;
        //     if (sprite.position.y <= -4) object.remove(sprite);
        // }
    }
    
    object.inTrigger = inTrigger;
    object.awake = awake;
    object.update = update;
    awake();
    // object.clone = () => {
    //     const cloned = Object.create(Object.getPrototypeOf(object), Object.getOwnPropertyDescriptors(object));
    //     return cloned;
    // }
    return object;
}

function ItemPedestal(id) {
    const object = new Tile(true, true, true); object.name = "TILE_PDSTL";
    let item;
    let timeElapsed = 0;
    let collected = false;

    function colliding(position, radius = 0) {
        return inCylinderCollider(position, object.position, 0.5, radius);
    }
    function inTrigger(position, radius = 0, player) {
        if (!collected && inCylinderCollider(position, object.position, 0.7, radius)) {
            collected = true;
            object.remove(item);
            if (id in player.userData) {
                player.userData[id]++;
            }
            else {
                player.userData[id] = 1;
            }
            return true;
        }
        return false;
    }

    function awake() {
        item = new THREE.Sprite(new THREE.SpriteMaterial({ map: util.loadTexture(`collectibles/${id}.png`) }));
        object.add(item);
        
        const pedestal = new THREE.Sprite(new THREE.SpriteMaterial({ map: util.loadTexture("pillar.png") }));
        object.add(pedestal);
        pedestal.scale.set(4, 4, 4);
    }
    function update(delta) {
        timeElapsed += delta;
        item.position.y = 0.03 * Math.sin(timeElapsed * 7);
    }
    
    object.colliding = colliding;
    object.inTrigger = inTrigger;
    object.awake = awake;
    object.collectibleId = id;
    object.update = update;
    awake();

    return object;
}

function PlantPot() {
    const object = new Tile(true, false, false); object.name = "TILE_PDSTL";
    let item;
    let timeElapsed = 0;
    let collected = false;

    function colliding(position, radius = 0) {
        return inCylinderCollider(position, object.position, 0.5, radius);
    }

    function awake() {        
        const pedestal = new THREE.Sprite(new THREE.SpriteMaterial({ map: util.loadTexture("plant.png") }));
        object.add(pedestal);
        pedestal.scale.set(4, 4, 4);
    }
    
    object.colliding = colliding;
    object.awake = awake;
    awake();

    return object;
}

function SecretTrigger(main) {
    const object = new Tile(false, true); object.name = "TILE_STRIGG";
    let alreadyFound = false;

    function inTrigger(position, radius = 0, player) {
        if (!alreadyFound && inSquareCollider(position, object.position, 2, radius)) {
            alreadyFound = true;
            main.secretFound();
            return true;
        }
        return false;
    }

    object.inTrigger = inTrigger;
    return object;
}

function RusherEnemy(level, textures, deathTexture, speed, damage, player, fps = 8, scale = 2, maxHealth = 2, cooldown = 0.75, detectionRadius = 30, attackRadius = 2, _radius = 1) {
    const object = new Tile(true, true, true, true);
    let sprite;
    const animationStartTime = Math.random() * 10;
    let timeElapsed = 0;
    let dead = false;
    let health = maxHealth;
    let deathVelocity = 0;

    const spf = 1 / fps;
    let timeSinceLastAttack = 999;
    let sprites = [];

    function colliding(position, radius = 0, _player) {
        return !dead && inCylinderCollider(position, object.position, _radius, radius);
    }

    function inTrigger(position, radius = 0, _player) {
        const _inTrigger = !dead && inCylinderCollider(position, object.position, attackRadius, radius);
        if (_player && _inTrigger && timeSinceLastAttack >= cooldown) {
            _player.userData.health -= damage;
            timeSinceLastAttack = 0;
        }
        return _inTrigger;
    }

    function awake() {
        for (let i = 0; i < textures.length; i++) {
            sprites.push(new THREE.SpriteMaterial({ map: textures[i] }));
        }
        sprite = new THREE.Sprite(sprites[0]);
        object.add(sprite);
        sprite.scale.set(scale, scale, scale);
    }

    function update(delta) {
        if (dead) {
            deathVelocity += 37.5 * delta;
            object.position.y -= deathVelocity * delta;
            return;
        }
        timeElapsed += delta;
        timeSinceLastAttack += delta;

        // animate
        sprite.material = sprites[Math.floor((animationStartTime + timeElapsed) / spf) % sprites.length];

        const moveVector = player.position.clone().sub(object.position).normalize().multiplyScalar(speed * delta);
        const distance = player.position.distanceTo(object.position);
        moveVector.y = 0;
        if (distance >= 0.5 && distance <= detectionRadius && level.raycast(object.position, player.position) == null) {
            // object.position.add(direction);
            const moveX = moveVector.clone(); moveX.z = 0;
            const moveZ = moveVector.clone(); moveZ.x = 0;

            object.position.add(moveX);
            if (level.checkIntersection(object.position, _radius)) {
                object.position.sub(moveX);
            }
            object.position.add(moveZ);
            if (level.checkIntersection(object.position, _radius)) {
                object.position.sub(moveZ);
            }
        }
    }

    function _damage(amount) {
        if (dead) return;
        health -= amount;
        if (health <= 0) {
            deathVelocity = -12.5;
            sprite.material = new THREE.SpriteMaterial({ map: deathTexture });
            dead = true;
        }
    }
    
    object.colliding = colliding;
    object.awake = awake;
    object.update = update;
    object.inTrigger = inTrigger;
    object.damage = _damage;
    awake();

    return object;
}

export {
    WallBlock, Bob, ItemPedestal, NormalWallBlock, BlockDoor, SecretTrigger, Exit, PlantPot, RusherEnemy
}