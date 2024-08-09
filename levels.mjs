import * as THREE from 'three';
import * as util from './util.mjs';
import * as tiles from './tiles.mjs';

const TILE_SIZE = 4;

function Level(main, player, filePath = "testing.w95") {

    let tilePalette = {
        "t": () => { return new tiles.WallBlock(this, util.loadTexture("tutorialbob.png")); },
    
        "W": () => { return new tiles.WallBlock(util.loadTexture("default.png", 4, 4)); },
        "P": () => { return new tiles.WallBlock(util.loadTexture("paintingwall.png")); },
        "M": () => { return new tiles.WallBlock(util.loadTexture("metal.png")); },
        "E": () => { return new tiles.WallBlock(util.loadTexture("exit.png")); },
        "N": () => { return new tiles.NormalWallBlock(); },
    
        "Md": () => { return new tiles.BlockDoor(util.loadTexture("metal.png")); },
        "Pd": () => { return new tiles.BlockDoor(util.loadTexture("paintingwall.png")); },
        "B": () => { return new tiles.Bob(); },
    
        "d": () => { return new tiles.ItemPedestal("document") },
        "i": () => { return new tiles.ItemPedestal("icecream") },
    
        "*": () => { return new tiles.SecretTrigger(main); }
    }



    let object = new THREE.Object3D();
    let finished = false;

    let colliders = [];
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
                    if (newTile.collision) colliders.push(newTile);
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
    function checkIntersection(position, radius) {
        for (let i = 0; i < colliders.length; i++) {
            const _object = colliders[i];
            if (_object.colliding(position, radius)) {
                return true;
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

    Object.defineProperty(object, "finished", {
        get() { return finished; }
    });
    Object.assign(object, {
        checkIntersection, checkTriggerIntersection, update
    })
    return object;
}

export {
    Level
}