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

    // ===============================================
    // PATHFINDING STUFF
    const STRAIGHT_COST = 1;
    const DIAGONAL_COST = sqrt(2);
    const P = 1 / 1000; // (min cost of taking one step) / (max expected path length)

    function heuristic(from, to) {
        const dx = Math.abs(from.x - to.x);
        const dy = Math.abs(from.y - to.y);
        return STRAIGHT_COST * (dx + dy) + (DIAGONAL_COST - 2 * STRAIGHT_COST) * Math.min(dx, dy)
            * (1 + P);
    }
    function pathCost(from, to) {
        // this assumes that the differences of the x and y distances are at most 1
        return Math.sqrt(Math.abs(from.x - to.x) + Math.abs(from.y - to.y));
    }
    function getAdjacentTiles(node) {
        const possibilities = [
            new THREE.Vector2(node.x + 1, node.y),
            new THREE.Vector2(node.x - 1, node.y),
            new THREE.Vector2(node.x, node.y + 1),
            new THREE.Vector2(node.x, node.y - 1),

            new THREE.Vector2(node.x + 1, node.y + 1),
            new THREE.Vector2(node.x + 1, node.y - 1),
            new THREE.Vector2(node.x - 1, node.y + 1),
            new THREE.Vector2(node.x - 1, node.y - 1)
        ];
        const result = [];
        possibilities.forEach((possibility) => {
            if (checkTileTraversable(possibility)) {
                result.push(possibility);
            }
        })
        return result;
    }
    // https://theory.stanford.edu/~amitp/GameProgramming/ImplementationNotes.html
    function aStar(object, from, to) {
        const curNode = tileToWorldCenter(object.position);
        let open = new Set([vector2ToTileKey(curNode)]); // "canidates for examining"
        let closed = new Set([]); // "already examined"
        // while lowest rank in OPEN is not the GOAL:
        //     current = remove lowest rank item from OPEN
        //     add current to CLOSED
        //     for neighbors of current:
        //         cost = g(current) + movementcost(current, neighbor)
        //         if neighbor in OPEN and cost less than g(neighbor):
        //         remove neighbor from OPEN, because new path is better
        //         if neighbor in CLOSED and cost less than g(neighbor): ⁽²⁾
        //         remove neighbor from CLOSED
        //         if neighbor not in OPEN and neighbor not in CLOSED:
        //         set g(neighbor) to cost
        //         add neighbor to OPEN
        //         set priority queue rank to g(neighbor) + h(neighbor)
        //         set neighbor's parent to current
        function getLowestScored() {
            let lowestCost = 1e7;
            let lowestNode = {};
            open.forEach((rawNode) => {
                const node = keyToVector2(rawNode);
                const cost = heuristic(curNode, to) + pathCost(curNode, node);
                if (cost < lowestCost) {
                    lowestCost = cost;
                    lowestNode = node;
                }
            })
            return lowestNode;
        }
        let lowestScored = curNode;
        let lowestScoredKey = vector2ToTileKey(lowestScored);
        const goalKey = vector2ToTileKey(to);
        while (lowestScoredKey != goalKey) {
            // mark node as closed
            open.delete(lowestScoredKey);
            closed.delete(lowestScoredKey);

            getAdjacentTiles(curNode).forEach((neighbor) => { // node is a vector2
                const neighborKey = vector2ToTileKey(neighbor);
                const cost = heuristic(curNode, to) + pathCost(curNode, neighbor);

                const neighborInOpen = open.has(neighborKey);
                const neighborInClosed = closed.has(neighborKey);

                if (neighborInOpen && cost < heuristic(neighbor, to)) {
                    // remove neighbor from open; new path better
                    open.delete(neighborKey);
                }
                if (neighborInClosed && cost < heuristic(neighbor, to)) {
                    closed.delete(neighborKey);
                }
                if (neighborInOpen && neighborInClosed) {
                    //x
                }
            })
        }
    }

    Object.defineProperty(object, "finished", {
        get() { return finished; }
    });
    Object.defineProperty(object, "traversableNodes", {
        get() { return traversableNodes; }
    })
    Object.assign(object, {
        checkIntersection, checkTriggerIntersection, update, raycast,
        vector2ToTileKey, keyToVector2, checkTileTraversable
    })
    return object;
}