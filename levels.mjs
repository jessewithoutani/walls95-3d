import * as THREE from 'three';
import * as util from './util.mjs';
import * as tiles from './tiles.mjs';

const TILE_SIZE = 4;

export function Level(main, player, filePath = "welcome.w95") {
    let object = new THREE.Object3D();
    let tilePalette = {
        "t": () => { return new tiles.WallBlock(util.loadTexture("tutorialbob.png")); },
    
        "W": () => { return new tiles.WallBlock(util.loadTexture("default.png", 4, 4)); },
        "P": () => { return new tiles.WallBlock(util.loadTexture("paintingwall.png")); },
        "M": () => { return new tiles.WallBlock(util.loadTexture("metal.png")); },
        "E": () => { return new tiles.Exit(); },
        "N": () => { return new tiles.NormalWallBlock(); },
    
        "Md": () => { return new tiles.BlockDoor(util.loadTexture("metal.png")); },
        "Pd": () => { return new tiles.BlockDoor(util.loadTexture("paintingwall.png")); },
        "B": () => { return new tiles.Bob(); },
    
        "d": () => { return new tiles.ItemPedestal("document") },
        "i": () => { return new tiles.ItemPedestal("icecream") },

        "p": () => { return new tiles.PlantPot() },
    
        "*": () => { return new tiles.SecretTrigger(main); },

        "eG": () => { // Gob
            return new tiles.RusherEnemy(object, 
                [util.loadTexture("entities/bog/bog1.png"), util.loadTexture("entities/bog/bog2.png")], 
                util.loadTexture("entities/bog/bogdead.png"), 13.5, 1, player);
        },
        "eS": () => { // Sniffer
            return new tiles.RusherEnemy(object, 
                [util.loadTexture("entities/sniffer/sniffer1.png"), util.loadTexture("entities/sniffer/sniffer2.png")], 
                util.loadTexture("entities/sniffer/sniffer1.png"), 6.5, 1, player, 8, 4, 1000000000);
        }
    }


    let finished = false;

    let colliders = [];
    let enemyColliders = [];
    let triggers = [];
    let requiresUpdate = [];

    fetch(filePath).then((response) => {
        response.text().then((contents) => {
            loadLevel(contents);
        });
    });

    function loadLevel(contents) {
        let rows = contents.split("\n");
        let x = 0; let z = 0;
        rows.forEach(row => {
            x = 0;
            let rowSplit = row.split(" ");
            rowSplit.forEach(char => {
                char = char.replace("\r", "")
                if (char in tilePalette) {
                    const newTile = tilePalette[char]();
                    newTile.position.set(x * TILE_SIZE, TILE_SIZE / 2, z * TILE_SIZE);
                    object.add(newTile);
                    // add to respective lists
                    if (newTile.collision) {
                        if (newTile.enemy) {
                            enemyColliders.push(newTile);
                        }
                        else {
                            colliders.push(newTile);
                        }
                    }
                    if (newTile.trigger) triggers.push(newTile);
                    if (newTile.requiresUpdate) requiresUpdate.push(newTile);
                }
                else if (char == "^") player.position.set(x * TILE_SIZE, 0, z * TILE_SIZE)
                x++;
            });
            z++;
        });
        finished = true;
    }
    function checkIntersection(position, radius, enemiesOnly = false) {
        const checkedColliders = (enemiesOnly) ? enemyColliders : colliders;
        for (let i = 0; i < checkedColliders.length; i++) {
            const _object = checkedColliders[i];
            if (_object.colliding(position, radius)) {
                return _object;
            }
        }
        return false;
    }
    function checkTriggerIntersection(position, radius, player) {
        //triggers
        for (let i = 0; i < triggers.length; i++) {
            const _object = triggers[i];
            if (_object.inTrigger(position, radius, player)) {
                console.log("trigger");
            }
        }
    }
    function update(delta) {
        //triggers
        for (let i = 0; i < requiresUpdate.length; i++) {
            requiresUpdate[i].update(delta);
        }
    }
    const RAYCAST_PERCISION = 0.03;
    function raycast(a, b, max = 9999, radius = 0.025) {
        const originalDistance = Math.min(a.distanceTo(b), max); // clamp distance to travel
        const direction = b.clone().sub(a).normalize().multiplyScalar(RAYCAST_PERCISION);
        console.log(direction)
        let remainingDistance = originalDistance;
        let checkPosition = a.clone();
        while (remainingDistance > 0) {
            remainingDistance -= RAYCAST_PERCISION;
            checkPosition.add(direction);
            if (checkIntersection(checkPosition, radius)) {
                console.log("intersect")
                return checkPosition;
            }
        }
        return null;
    }

    Object.defineProperty(object, "finished", {
        get() { return finished; }
    });
    Object.assign(object, {
        checkIntersection, checkTriggerIntersection, update, raycast
    })
    return object;
}