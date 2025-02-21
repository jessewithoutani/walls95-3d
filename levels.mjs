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
            return new tiles.Sniffer(object, player);
        }
    }


    let finished = false;

    let colliders = [];
    let enemyColliders = [];
    let triggers = [];
    let requiresUpdate = [];
    let traversableNodes = new Set([]);

    fetch(filePath).then((response) => {
        response.text().then((contents) => {
            loadLevel(contents);
        });
    });

    function createTraversableNode(position) {
        traversableNodes.add(vector2ToTileKey(position));
        const indicatorPosition = tileToWorldCenter(position);
        indicatorPosition.y = 0;
        console.log(indicatorPosition)
        const indicatorMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 4), new THREE.MeshNormalMaterial);
        indicatorMesh.position.copy(indicatorPosition);
        object.add(indicatorMesh);
    }
    const vector2ToTileKey = JSON.stringify;
    const keyToVector2 = JSON.parse;
    function checkTileTraversable(position) {
        traversableNodes.has(vector2ToTileKey(position));
    }

    function loadLevel(contents) {
        traversableNodes.clear();
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
                else if (char == "^") {
                    createTraversableNode(new THREE.Vector2(x, z));
                    player.position.set(x * TILE_SIZE, 0, z * TILE_SIZE);
                }
                else {
                    createTraversableNode(new THREE.Vector2(x, z));
                }
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
        // console.log(direction)
        let remainingDistance = originalDistance;
        let checkPosition = a.clone();
        while (remainingDistance > 0) {
            remainingDistance -= RAYCAST_PERCISION;
            checkPosition.add(direction);
            if (checkIntersection(checkPosition, radius)) {
                // console.log("intersect")
                return checkPosition;
            }
        }
        return null;
    }

    function worldToTile(position) {
        return new THREE.Vector2(Math.floor(position.x / TILE_SIZE), Math.floor(position.z / TILE_SIZE));
    }
    function tileToWorldCenter(position) {
        return new THREE.Vector3(position.x * TILE_SIZE, 0, position.y * TILE_SIZE);
    }
    function tileToWorldCorner(position) {
        return new THREE.Vector3(position.x * TILE_SIZE, 0, position.y * TILE_SIZE);
    }

    Object.defineProperty(object, "finished", {
        get() { return finished; }
    });
    Object.defineProperty(object, "traversableNodes", {
        get() { return traversableNodes; }
    })
    Object.assign(object, {
        checkIntersection, checkTriggerIntersection, update, raycast,
        vector2ToTileKey, keyToVector2
    })
    return object;
}