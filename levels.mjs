import * as THREE from 'three';
import * as util from './util.mjs';
import * as tiles from './tiles.mjs';

const TILE_SIZE = 4;
const INDICATE_NODES = false;

export function Level(main, scene, player, listener, filePath = "./levels/welcome.json") {
    let object = new THREE.Object3D();
    let tilePalette = {
        "BOB_TUTORIAL_TEXT": () => { return new tiles.WallBlock(util.loadTexture("tutorialbob.png")); },
    
        "PURPLE_TILED_WALL": () => { return new tiles.WallBlock(util.loadTexture("default.png", 4, 4)); },
        "PURPLE_TILED_WALL_PAINTING": () => { return new tiles.WallBlock(util.loadTexture("paintingwall.png")); },
        "METAL_WALL": () => { return new tiles.WallBlock(util.loadTexture("metal.png")); },
        "EXIT": () => { return new tiles.Exit(); },
        "NORMAL_WALL": () => { return new tiles.NormalWallBlock(); },
        // "Y": () => { return new tiles.WallBlock(util.loadTexture("wallpaper.png", 4, 4)); },
        "WALLPAPER_WALL": () => { return new tiles.WallBlock(util.loadTexture("wallpaper.png")); },
        "WALLPAPER_WALL_DECORATED": () => { return new tiles.RandomizedWallBlock([
            util.loadTexture("wallpaper_painting.png"),
            util.loadTexture("wallpaper_painting2.png"),
        ])},
    
        "METAL_DOOR": () => { return new tiles.BlockDoor(util.loadTexture("metal.png"), listener); },
        "PURPLE_TILED_WALL_PAINTING_DOOR": () => { return new tiles.BlockDoor(util.loadTexture("paintingwall.png"), listener); },
        "BOB_ENTITY": () => { return new tiles.Bob(); },
        "MARTIN_ENTITY": () => { return new tiles.Martin(player); },
    
        "DOCUMENT_PEDESTAL": () => { return new tiles.ItemPedestal(listener, "document") },
        "ICECREAM_PEDESTAL": () => { return new tiles.ItemPedestal(listener, "icecream") },

        "PLANT_POT": () => { return new tiles.PlantPot() },
    
        "SECRET_TRIGGER": () => { return new tiles.SecretTrigger(main); },

        "GOB_ENTITY": () => { // Gob
            return new tiles.RusherEnemy(object, listener,
                [util.loadTexture("entities/bog/bog1.png"), util.loadTexture("entities/bog/bog2.png")], 
                util.loadTexture("entities/bog/bogdead.png"), 13.5, 1, player);
        },
        "SNIFFER_ENTITY": () => { // Sniffer
            return new tiles.Sniffer(object, player, listener);
        }
    }

    /*
    ".": "EMPTY",
    "^": "PLAYER_SPAWN",

    "t": "BOB_TUTORIAL_TEXT",

    "W": "PURPLE_TILED_WALL",
    "P": "PURPLE_TILED_WALL_PAINTING",
    "M": "METAL_WALL",
    "E": "EXIT",
    "N": "NORMAL_WALL",
    "Y": "WALLPAPER_WALL",
    "YP": "WALLPAPER_WALL_DECORATED",
    "Md": "METAL_DOOR",
    "Pd": "PURPLE_TILED_WALL_PAINTING_DOOR",
    "p": "PLANT_POT",
    "*": "SECRET_TRIGGER",

    "d": "DOCUMENT_PEDESTAL",
    "i": "ICECREAM_PEDESTAL",

    "B": "BOB_ENTITY",
    "m": "MARTIN_ENTITY",
    "eG": "GOB_ENTITY",
    "eS": "SNIFFER_ENTITY"
    */


    let finished = false;

    let colliders = [];
    let enemyColliders = [];
    let triggers = [];
    let requiresUpdate = [];
    let traversableNodes = new Set([]);

    fetch(filePath).then((response) => {
        response.text().then((contents) => {
            console.log(contents)
            loadLevel(JSON.parse(contents));
        });
    });

    function createTraversableNode(position) {
        traversableNodes.add(vector2ToTileKey(position));
        const indicatorPosition = tileToWorldCenter(position);
        indicatorPosition.y = 0;
        // console.log(indicatorPosition)
        if (INDICATE_NODES) {
            const indicatorMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 4), new THREE.MeshNormalMaterial);
            indicatorMesh.position.copy(indicatorPosition);
            object.add(indicatorMesh);
        }
    }
    const vector2ToTileKey = JSON.stringify;
    const keyToVector2 = JSON.parse;
    function checkTileTraversable(position) {
        return traversableNodes.has(vector2ToTileKey(position));
    }

    function loadLevel(contents) {
        traversableNodes.clear();
        let rows = contents["content"];
        let x = 0; let z = 0;
        rows.forEach(row => {
            x = 0;
            // console.log(row)
            // let rowSplit = row.split(" ");
            row.forEach(tileName => {
                tileName = tileName.replace("\r", "")
                if (tileName in tilePalette) {
                    const newTile = tilePalette[tileName]();
                    newTile.position.set(x * TILE_SIZE, TILE_SIZE / 2, z * TILE_SIZE);

                    object.add(newTile);
                    // add to respective lists
                    if (newTile.collision) {
                        if (newTile.enemy) {
                            enemyColliders.push(newTile);
                            createTraversableNode(new THREE.Vector2(x, z));
                        }
                        else {
                            colliders.push(newTile);
                        }

                        if (newTile.traversable) {
                            createTraversableNode(new THREE.Vector2(x, z));
                        }
                    }
                    if (newTile.trigger) triggers.push(newTile);
                    if (newTile.requiresUpdate) requiresUpdate.push(newTile);
                }
                else if (tileName == "PLAYER_SPAWN") {
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

        //
        scene.fog = new THREE.FogExp2(contents.fogColor, contents.fogDensity);
        const directional = new THREE.DirectionalLight(
            contents.directionalLightColor, contents.directionalLightIntensity);
        directional.position.set(0.5, 1, 0.1);
        scene.add(directional);
        const ambient = new THREE.AmbientLight(contents.ambientLightColor, contents.ambientLightIntensity);
        scene.add(ambient);
    
        // ======================================
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshPhongMaterial({
            map: util.loadTexture(contents.floorTexturePath, 500, 500),
        })); ground.name = "GROUND";
        scene.add(ground);
        ground.rotation.x = -Math.PI / 2;
    
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshPhongMaterial({
            map: util.loadTexture(contents.ceilingTexturePath, 500, 500),
        })); ceiling.name = "CEILING";
        if (contents.ceilingPresent) scene.add(ceiling);
        ceiling.position.y = 4;
        ceiling.rotation.x = Math.PI / 2;

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
        return new THREE.Vector2(Math.floor((position.x + TILE_SIZE * 0.5) / TILE_SIZE), 
            Math.floor((position.z + TILE_SIZE * 0.5) / TILE_SIZE));
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
    const DIAGONAL_COST = Math.sqrt(2);
    const P = 1 / 1000; // (min cost of taking one step) / (max expected path length)

    function hCost(from, to) { // heuristic
        const dx = Math.abs(from.x - to.x);
        const dy = Math.abs(from.y - to.y);
        return STRAIGHT_COST * (dx + dy) + (DIAGONAL_COST - 2 * STRAIGHT_COST) * Math.min(dx, dy)
            * (1 + P);
    }
    function gCost(from, to) { // distance from end node
        // this assumes that the differences of the x and y distances are at most 1
        return Math.sqrt(Math.abs(from.x - to.x) + Math.abs(from.y - to.y));
    }
    function fCost(from, next, to) {
        return gCost(from, next) + hCost(next, to);
    }
    function getAdjacentTiles(node) {
        const possibilities = [
            new THREE.Vector2(node.x + 1, node.y),
            new THREE.Vector2(node.x - 1, node.y),
            new THREE.Vector2(node.x, node.y + 1),
            new THREE.Vector2(node.x, node.y - 1),

            // new THREE.Vector2(node.x + 1, node.y + 1),
            // new THREE.Vector2(node.x + 1, node.y - 1),
            // new THREE.Vector2(node.x - 1, node.y + 1),
            // new THREE.Vector2(node.x - 1, node.y - 1)
        ];
        const result = [];
        possibilities.forEach((possibility) => {
            // console.log(vector2ToTileKey(possibility));
            // console.log(traversableNodes);
            if (checkTileTraversable(possibility)) {
                result.push(possibility);
            }
        });
        return result;
    }
    // https://theory.stanford.edu/~amitp/GameProgramming/ImplementationNotes.html
    function aStar(from, to, returnWorldPosition = true) {
        let open = new Map(); // "canidates for examining"
        let closed = new Map(); // "already examined"
        open.set(vector2ToTileKey(from), null);

        function lowestCostNode() {
            let lowestFCost = 1e7;
            let lowestNode = {};
            // get lowest cost node
            open.forEach((nodeParent, rawNode) => {
                // console.log(rawNode)
                const node = keyToVector2(rawNode);
                // const fCost = gCost(from, node) + hCost(node, to);
                const _fCost = fCost(from, node, to);
                if (_fCost < lowestFCost) {
                    lowestFCost = _fCost;
                    lowestNode = node;
                }
            });
            return lowestNode;
        }

        let lowestNode;
        let toKey = vector2ToTileKey(to);
        let nodeCount = 0;
        for (let i = 0; i < 1000; i++) {
            lowestNode = lowestCostNode();
            const lowestNodeKey = vector2ToTileKey(lowestNode);

            // console.log("poo")
            nodeCount++;
            const goalReached = lowestNodeKey == toKey;
            // console.log(`node: ${lowestNodeKey} : ${toKey}`);

            // close lowest node
            closed.set(lowestNodeKey, open.get(lowestNodeKey));
            open.delete(lowestNodeKey);

            getAdjacentTiles(lowestNode).forEach((neighbor) => {
                const neighborKey = vector2ToTileKey(neighbor);
                const gCostNeighbor = gCost(from, neighbor);
                const hCostNeighbor = hCost(neighbor, to);
                const fCostNeighbor = fCost(from, neighbor, to);

                const neighborInOpen = open.has(neighborKey);
                const neighborInClosed = closed.has(neighborKey);

                if (!neighborInOpen && !neighborInClosed) { // if unexplored, add to frontier
                    open.set(neighborKey, lowestNodeKey);
                }
            });

            if (goalReached || open.size == 0) {
                console.log("pathfind end");
                break;
            }
        }
        console.log(`iterations: ${nodeCount}`);

        // reconstruct path
        let path = [];
        let node = to;
        let nodeKey = vector2ToTileKey(node);
        while (nodeKey != vector2ToTileKey(from)) {
            // console.log(`${nodeKey} : ${vector2ToTileKey(to)}`);
            // console.log(closed)
            // console.log(`${nodeKey} : ${vector2ToTileKey(from)}`);
            // path.push(node);
            if (returnWorldPosition) {
                path.unshift(new THREE.Vector3(node.x * TILE_SIZE, 0, node.y * TILE_SIZE));
            }
            else {
                path.unshift(node);
            }
            nodeKey = closed.get(nodeKey); // set next node to parent
            if (!nodeKey) {
                console.log("end path");
                break;
            }
            node = keyToVector2(nodeKey);
        }
        return path;
    }

    Object.defineProperty(object, "finished", {
        get() { return finished; }
    });
    Object.defineProperty(object, "traversableNodes", {
        get() { return traversableNodes; }
    })
    Object.assign(object, {
        checkIntersection, checkTriggerIntersection, update, raycast,
        vector2ToTileKey, keyToVector2, checkTileTraversable, aStar,
        tileToWorldCenter, worldToTile, tileToWorldCorner, getAdjacentTiles
    })
    return object;
}