// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

/*jslint node: true, nomen: true, vars: true*/
'use strict';



function gameServer(io) {

    let fs = require('fs');
    let base = require('./base.js');
    let utils = require('./utils.js');

    // Augment utils with server-only functions
    utils.grid = {
        getRandomEmptyCell: function () {
            // Return a random cell from grid that has no characters on it (can have objects)
            let x, y, cellEmpty;
            do {
                x = Math.floor(Math.random() * base.constants.world.width);
                y = Math.floor(Math.random() * base.constants.world.height);
                cellEmpty = (typeof grid[x][y].char === 'undefined');
                // can still spawn on top of objects
            } while (!cellEmpty);
            return {
                x: x,
                y: y
            }
        },
        cellsAround: function (center) {
            // center = {x, y}
            // return 4 grid cells around @center
            let cells = utils.coordsAround(center);
            Object.keys(cells).forEach(function (dir) {
                cells[dir] = grid[cells[dir].x][cells[dir].y];
            });
            return cells;
        }
    };


    utils.inventory = {
        full: function (player) {
            return (player.getInventory().length === base.constants.maxInventory);
        },
        countItem: function (player, itemBid) {
            let count = 0;
            player.getInventory().forEach(function (invItemBid) {
                if (invItemBid === itemBid) {
                    count += 1;
                }
            });
            return count;
        },
        addItem: function (player, itemBid) {
            let inventory = player.getInventory();
            if (inventory.length < base.constants.maxInventory) {
                inventory.push(itemBid);
                player.emit('inventory', inventory);
                return true;
            } else {
                player.emit('msg', 'Inventory full');
                return false;
            }
        },
        removeItem: function (player, itemBid, quantity) {
            quantity = quantity || 1; // default to 1 if @quantity is omitted
            let inventory = player.getInventory();
            let count = utils.inventory.countItem(player, itemBid);
            if (count >= quantity) {
                let removeCounter = 0;
                for (let i = inventory.length - 1; i >= 0; i -= 1) {
                    if (inventory[i] === itemBid) {
                        inventory.splice(i, 1);
                        removeCounter += 1;
                        if (removeCounter === quantity) {
                            break;
                        }
                    }
                }
                player.emit('inventory', inventory);
                return true;
            } else {
                return false;
            }
        },
        useItem: function (player, invSlot) {
            let inventory = player.getInventory();
            let itemBid = inventory[invSlot];
            if (typeof itemBid !== 'undefined') {
                let item = base.items[itemBid];
                if (item.type === base.constants.itemTypes.equipment) {
                    let equipment = player.getEquipment();
                    let equippedBid = equipment[item.eqSlot]; // previously equipped in that slot
                    equipment[item.eqSlot] = item.bid;
                    utils.inventory.removeItem(player, itemBid);
                    if (typeof equippedBid !== 'undefined') {
                        utils.inventory.addItem(player, equippedBid);
                    }
                    player.emit('equipment', equipment);
                } else if (item.type === base.constants.itemTypes.structure && typeof grid[player.x][player.y].object !== 'number') {
                    utils.inventory.removeItem(player, itemBid);
                    player.delayedAction(function () {
                        grid[player.x][player.y].object = base.objectId[item.name];
                    });
                }
            }
        },
        dropItem: function (player, invSlot) {
            let inventory = player.getInventory();
            let itemBid = inventory[invSlot];
            utils.inventory.removeItem(player, itemBid);
            createBag({
                x: player.x,
                y: player.y,
                items: [itemBid]
            });
        }
    };

    utils.equipment = {
        uneqip: function (player, eqSlot) {
            let equipment = player.getEquipment();
            // addItem checks if there is enough room in inventory
            if (typeof equipment[eqSlot] !== 'undefined' && utils.inventory.addItem(player, equipment[eqSlot])) {
                delete equipment[eqSlot];
                player.emit('equipment', equipment);
            }
        }
    };

    utils.craft = {
        possible: function (player, craftBid) {
            // check if chosen recipe is valid: enough inputs in inventory, standing near required facility
            // todo: this check should run on client side before sending request to server
            let craft = base.crafts[craftBid];
            let enoughInputs = craft.inputs.every(function (input) {
                return (input.count <= utils.inventory.countItem(player, input.bid));
            });

            if (typeof craft.facility !== 'undefined') {
                let around = utils.grid.cellsAround(player);
                let noFacilityNear = Object.keys(around).every(function (dir) {
                    return around[dir].object !== craft.facility;
                });
                return (enoughInputs && !noFacilityNear);
            } else {
                return enoughInputs;
            }
        },
        perform: function (player, craftBid) {
            // craft chosen recipe if it is valid
            let craft = base.crafts[craftBid];
            let req = {
                skill: craft.skill,
                min: craft.minLevel
            };
            if (utils.craft.possible(player, craftBid) && utils.skill.canUse(player, req)) {
                player.emit('msg', 'Trying to craft ' + craft.output.name + '...')
                player.delayedAction(function () {
                    craft.inputs.forEach(function (input) {
                        utils.inventory.removeItem(player, input.bid, input.count);
                    });
                    if (utils.skill.use(player, req)) {
                        utils.inventory.addItem(player, craft.output.bid);
                        player.emit('msg', 'Success!');
                    } else {
                        player.emit('msg', 'Fail!');
                    }
                });
            }
        }
    };

    utils.skill = {
        canUse: function (player, req) {
            // req = {skill, min}
            if (player.getStats()[req.skill] < req.min) {
                player.emit('msg', 'Your ' + req.skill + ' is not high enough.');
                return false;
            } else {
                return true;
            }
        },
        use: function (player, req) {
            // req = {skill, min}
            // Tests whether player succeeds or not at @skill that requires level @min
            // Success probability = (Player skill level - minimum level)%
            // Increases used skill level with some probability
            // Increase probability = (100 - Player skill level)%, if success
            // 0.5 * (100 - Player skill level)%, if fail
            let stats = player.getStats();
            let success = (Math.random() < 0.01 * (stats[req.skill] - req.min));
            let increaseP = 1 - 0.01 * stats[req.skill];
            increaseP *= (success ? 1 : 0.5);
            if (Math.random() < increaseP) {
                utils.skill.increase(player, req.skill);
            }
            return success;
        },
        increase: function (player, skill) {
            let stats = player.getStats();
            if (stats[skill] < 100) {
                stats[skill] += 1;
                player.emit('stats', stats);
                player.emit('msg', 'You feel better at ' + skill);
            }
        }
    };

    utils.combat = {
        hit: function (attacker, defender) {
            let aStats = attacker.getStats();
            let dStats = defender.getStats();

            // determine if the hit is successful
            let success = (aStats.fighting + 100 * Math.random() > dStats.fighting + 100 * Math.random());

            // attacker's fighting skill might increase
            if (attacker.type === base.constants.charTypes.player) {
                let increaseP = 1 - 0.01 * aStats.fighting;
                increaseP *= (success ? 1 : 0.5);
                if (Math.random() < increaseP) {
                    utils.skill.increase(attacker, 'fighting');
                }
            }

            // damage is dealt
            if (success) {
                dStats.hp -= 1;
                // todo: broadcast hit event to other players in view
                if (defender.type === base.constants.charTypes.player) {
                    defender.emit('hit', defender);
                    defender.emit('stats', dStats);
                } else if (attacker.type === base.constants.charTypes.player) {
                    attacker.emit('hit', defender);
                }

                if (dStats.hp <= 0) {
                    defender.die();
                    if (defender.type === base.constants.charTypes.player) {
                        io.emit('msg', defender.name + ' was killed by ' + attacker.name);
                    }
                }
            }
        }
    };

    // grid of map coordinates that works as a reference to all objects, players, mobs, bags and grounds
    // coordinates are of form grid[x][y], i.e. (column, row)
    let grid = [];
    for (let x = 0; x < base.constants.world.width; x += 1) {
        grid[x] = [];
        for (let y = 0; y < base.constants.world.height; y += 1) {
            grid[x][y] = {};
        }
    }

    // Players and mobs from the grid are also referenced in these two lists.
    // These lists help to access players/mobs by their ID and to loop through them quickly
    let players = {};
    let mobs = {};


    // -------------------------------------------------------------
    // Start game server
    // -------------------------------------------------------------

    // spawned mobs counter = id
    let nextMobId = 0;
    let worldSpawnTable = createSpawnTable();

    readMap();

    spawnMobs();

    console.log('Server started');

    // -------------------------------------------------------------
    // Function definitions
    // -------------------------------------------------------------

    // Helper functions to add, remove and move chars on grid:
    // update grid and corresponding list
    function addToGrid(char) {
        grid[char.x][char.y].char = char;
        if (char.type === base.constants.charTypes.player) {
            players[char.id] = char;
        } else if (char.type === base.constants.charTypes.mob) {
            mobs[char.id] = char;
        }
    }

    function removeFromGrid(char) {
        delete grid[char.x][char.y].char;
        if (char.type === base.constants.charTypes.player) {
            delete players[char.id];
        } else if (char.type === base.constants.charTypes.mob) {
            delete mobs[char.id];
        }
    }

    function moveOnGrid(char, destination) {
        delete grid[char.x][char.y].char;
        char.x = destination.x;
        char.y = destination.y;
        grid[char.x][char.y].char = char;
    }



    // Load ground and object data from disk into grid cells
    // and start server loops upon completion
    function readMap() {
        fs.readFile('map.json', 'utf8', function (err, data) {
            if (err) {
                console.error('Failed to read map.json');
                console.log(err);
            }

            console.log('map.json read successfully');
            let map = JSON.parse(data);
            for (let x = 0; x < base.constants.world.width; x += 1) {
                for (let y = 0; y < base.constants.world.height; y += 1) {
                    grid[x][y].ground = map[x][y].ground;
                    if (typeof map[x][y].object === 'number') {
                        grid[x][y].object = map[x][y].object;
                    }
                }
            }

            // after map is loaded, start server loops
            setTimeout(saveServer, base.constants.serverSaveTime);
            setTimeout(updateEnvironment, base.constants.environmentUpdateTime);
        });
    }

    // write server state to the disk at regular time
    function saveServer() {

        console.log('Server backup: ', Date());

        // save ground and objects into map.json
        let map = [];

        grid.forEach(function (column, x) {
            map[x] = [];
            column.forEach(function (cell, y) {
                map[x][y] = {};
                map[x][y].ground = cell.ground;
                if (typeof cell.object === 'number') {
                    map[x][y].object = cell.object;
                }
            });
        });

        fs.writeFile('map.json', JSON.stringify(map), function (err) {
            if (err) {
                console.error('Failed to write generated map to map.json');
                console.log(err);
            }
            console.log('---- map.json saved successfully');
        });

        setTimeout(saveServer, base.constants.serverSaveTime);
    }

    // environment update loop
    function updateEnvironment() {
        // new trees grow and wood is broken
        grid.forEach(function (column) {
            column.forEach(function (cell) {
                if (cell.object === null && Math.random() < 0.02) {
                    if (cell.ground === base.groundId['Grass']) {
                        cell.object = base.objectId['Tree'];
                    } else if (cell.ground === base.groundId['Sand']) {
                        cell.object = base.objectId['Palm'];
                    }
                } else if (cell.object === base.objectId['Wood'] && Math.random() < 0.02) {
                    delete cell.object;
                }
            });
        });

        // new monsters respawn
        spawnMobs();

        // update after regularly at given frequency
        setTimeout(updateEnvironment, base.constants.environmentUpdateTime);
    }

    // Create spawn spawn probability table
    function createSpawnTable() {
        // relative frequency
        let table = [
            {
                name: 'Angry sphere',
                freq: 1
            },
            {
                name: 'Sphere',
                freq: 1
            }
        ];

        // sum of frequencies
        let sumF = 0;
        table.forEach(function (mob) {
            mob.bid = base.mobId[mob.name];
            sumF += mob.freq;
        });

        // cumulative probability
        let cumP = 0;
        table.forEach(function (mob) {
            mob.cumP = cumP + mob.freq / sumF;
            cumP = mob.cumP;
        });

        return table;
    }

    // Create random mob from spawn probability table
    function createMob(spawnTable) {
        // draw a random entry from spawnTable
        let rnd = Math.random();
        let spawnId;
        spawnTable.every(function (mob) {
            if (mob.cumP > rnd) {
                spawnId = mob.bid;
                return false;
            }
            return true;
        });

        if (typeof spawnId === 'undefined') {
            console.error('Failed to get mob from spawn table (rnd = ' + rnd + '):\n' + spawnTable);
            return;
        }

        let pos = utils.grid.getRandomEmptyCell();

        // public attributes
        let pub = {
            id: nextMobId,
            bid: spawnId,
            name: base.mobs[spawnId].name,
            type: base.constants.charTypes.mob,
            x: pos.x,
            y: pos.y,
            tint: (0.5 + 0.5 * Math.random()) * 0xFFFFFF
        };
        nextMobId += 1;

        // private attributes
        let prv = {
            stats: {
                hp: base.mobs[spawnId].stats.hp,
                speed: base.mobs[spawnId].stats.speed,
                fighting: base.mobs[spawnId].stats.fighting
            },
            aggressive: base.mobs[spawnId].aggressive,
            radius: base.mobs[spawnId].radius,
            actionDelay: base.constants.actionDelay
        };
        prv.actionDelay /= prv.stats.speed;

        // getters for some private attributes
        function getStats() {
            return prv.stats;
        }
        pub.getStats = getStats;


        function findEmptyTilesAround() {
            // find empty walkable tiles around self
            let emptyTiles = utils.coordsAround(pub);

            Object.keys(emptyTiles).forEach(function (dir) {
                let xy = emptyTiles[dir];
                if (typeof grid[xy.x][xy.y].object !== 'undefined'
                    || typeof grid[xy.x][xy.y].char !== 'undefined') {
                    delete emptyTiles[dir];
                }
            });

            return emptyTiles;
        }

        // move randomly to one of empty tiles around self
        function moveRandom() {
            let moves = findEmptyTilesAround();
            let names = Object.keys(moves);
            let count = names.length;

            if (count > 0) {
                // choose random direction
                let newPos = moves[names[Math.floor(Math.random() * count)]];
                moveOnGrid(pub, newPos);
            }
        }

        // move 1 tile towards specified destination
        // naive path-finding algorithm
        function moveTowards(destination) {
            let shortestDistance = utils.vector(pub, destination).norm;
            let stayOnTile = true; // if all possible moves lead away from destination, don't move
            let newPos;

            // loop through possible moves and select the one closest to destination
            let moves = findEmptyTilesAround();
            Object.keys(moves).forEach(function (dir) {
                let xy = moves[dir];
                let distance = utils.vector(xy, destination).norm;
                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    newPos = xy;
                    stayOnTile = false;
                }
            });

            if (!stayOnTile) {
                moveOnGrid(pub, newPos);
            }
        }

        // choose and perform an action: move or attack
        function action() {
            if (prv.aggressive) {
                // attack if there is a player nearby
                let around = utils.coordsAround(pub);
                let noAttack = Object.keys(around).every(function (dir) {
                    let xy = around[dir];
                    let other = grid[xy.x][xy.y].char;
                    if (typeof other !== 'undefined' && other.type === base.constants.charTypes.player) {
                        utils.combat.hit(pub, other);
                        return false; // break .every loop
                    } else {
                        return true; // continue .every loop
                    }
                });

                if (noAttack) {
                    // move to the first player found within mob's radius
                    let noPlayerInRadius = Object.keys(players).every(function (pid) {
                        let player = players[pid];
                        let distance = utils.vector(pub, player).norm;
                        if (distance <= prv.radius) {
                            moveTowards(player);
                            return false; // exit .every loop
                        }
                        return true; // continue .every loop
                    });
                    if (noPlayerInRadius) {
                        moveRandom();
                    }
                }

            } else { // non-aggressive mob
                moveRandom();
            }
        }

        function die() {
            // mob is removed from grid and drops loot
            let loot = [];
            // generate items from random drop table
            base.mobs[pub.bid].drops.forEach(function (item) {
                if (Math.random() < item.prob) {
                    loot.push(item.bid);
                }
            });
            if (loot.length > 0) {
                createBag({
                    x: pub.x,
                    y: pub.y,
                    items: loot
                });
            }
            destroy();
        }
        pub.die = die;

        // start action loop when mob is created
        let actionTimer = setTimeout(actionLoop, prv.actionDelay);
        function actionLoop() {
            action();
            actionTimer = setTimeout(actionLoop, prv.actionDelay);
        }

        // interrupt action loop and delete mob object from global lists
        function destroy() {
            clearTimeout(actionTimer);
            removeFromGrid(pub);
        }
        pub.destroy = destroy;

        // add new mob object to global lists
        addToGrid(pub);
    }

    // Keep mobs population at the specified maximum
    function spawnMobs() {
        let mobsCount = Object.keys(mobs).length;
        for (let i = mobsCount; i < base.constants.mobLimit; i += 1) {
            createMob(worldSpawnTable);
        }
    }


    function createBag(spec) {
        // spec = {x, y, items}
        // constructor for bags on the ground
        // bags disappear after a certain time
        // adding/removing items restarts the timer
        // If there is already a bag there, items are added to it.

        let bag = grid[spec.x][spec.y].bag;
        let lifetimeTimer;

        if (typeof bag !== 'undefined') {
            bag.addItems(spec.items);
        } else {
            bag = {
                x: spec.x,
                y: spec.y,
                items: spec.items
            };
            bag.getItem = getItem;
            bag.addItems = addItems;
            lifetimeTimer = setTimeout(destroy, base.constants.bagLifetime);
            grid[bag.x][bag.y].bag = bag;
        }

        function destroy() {
            clearTimeout(lifetimeTimer);
            delete grid[bag.x][bag.y].bag;
        }

        function renewTimer() {
            clearTimeout(lifetimeTimer);
            lifetimeTimer = setTimeout(destroy, base.constants.bagLifetime);
        }

        function getItem(itemNumber) {
            bag.items.splice(itemNumber, 1);
            if (bag.items.length === 0) {
                destroy();
            } else {
                renewTimer();
            }
        }

        function addItems(items) {
            // @items: array of item bids
            bag.items = bag.items.concat(items);
            renewTimer();
        }
    }

    function createPlayer(socket) {
        let pos = utils.grid.getRandomEmptyCell();

        // public properties and methods
        let player = {
            x: pos.x,
            y: pos.y,
            tint: (0.5 + 0.5 * Math.random()) * 0xFFFFFF,
            name: 'Player ' + Math.round(Math.random() * 100),
            type: base.constants.charTypes.player,
            id: socket.id
        };

        player.emit = function (msg, data) {
            socket.emit(msg, data);
        };

        // private properties and methods
        let inventory = [];
        let equipment = {};
        let stats = {
            hp: base.constants.maxHp,
            speed: 5,
            gathering: 0,
            crafting: 0,
            fighting: 0
        };
        let speed = 5;
        let actionDelay = base.constants.actionDelay / speed;

        let onDelay = false;
        let delayTimer;

        // @inventory getter: used to manipulate @inventory from outside of player object
        // @inventory still remains a private property and is not emitted to client
        function getInventory() {
            return inventory;
        }
        player.getInventory = getInventory;
        // @equipment getter
        function getEquipment() {
            return equipment;
        }
        player.getEquipment = getEquipment;
        // @stats getter
        function getStats() {
            return stats;
        }
        player.getStats = getStats;

        // part of the grid visible to player, that is emitted on update
        let viewport = [];
        function updateViewport() {
            let x1, y1, xy;
            let xl = player.x - base.constants.viewport.halfWidth;
            let xh = player.x + base.constants.viewport.halfWidth;
            let yl = player.y - base.constants.viewport.halfHeight;
            let yh = player.y + base.constants.viewport.halfHeight;
            for (x1 = xl; x1 <= xh; x1 += 1) {
                viewport[x1 - xl] = [];
                for (y1 = yl; y1 <= yh; y1 += 1) {
                    xy = {x: x1, y: y1};
                    utils.wrapOverWorld(xy);
                    viewport[x1 - xl][y1 - yl] = grid[xy.x][xy.y];
                }
            }
        }
        updateViewport();

        // run update loop
        let updateTimer;
        (function updateLoop() {
            socket.emit('viewport', viewport);
            updateTimer = setTimeout(updateLoop, base.constants.playerUpdateTime);
        }());

        // perform action with delay: gathering, building, crafting
        function delayedAction(callback) {
            if (!onDelay) {
                onDelay = true;
                setTimeout(function () {
                    onDelay = false;
                    callback();
                }, actionDelay);
            }
        }
        player.delayedAction = delayedAction;

        function die() {
            // Lose all inventory items and equipment from a randomly chosen slot.
            // Player is then taken to a random spot in the map.
            let loot = inventory.concat(base.itemId["Player's ear"]);
            inventory = [];
            let loseSlot = Math.floor(Math.random() * Object.keys(base.constants.eqSlots).length);
            if (typeof equipment[loseSlot] !== 'undefined') {
                loot.push(equipment[loseSlot]);
                delete equipment[loseSlot];
            }
            createBag({
                x: player.x,
                y: player.y,
                items: loot
            });

            stats.hp = base.constants.maxHp;
            moveOnGrid(player, utils.grid.getRandomEmptyCell());
            updateViewport();
            socket.emit('inventory', inventory);
            socket.emit('equipment', equipment);
            socket.emit('stats', stats);
            socket.emit('msg', 'Oh dear, you are dead!')
        }
        player.die = die;


        // Inputs listener
        socket.on('input', function onInput(key) {
            // walking and attacking are instant, but other actions require delay
            if (!onDelay) {
                if (key === 'e' || key === 'w' || key === 'n' || key === 's') { // move
                    let newPos = {
                        x: player.x,
                        y: player.y
                    };

                    switch (key) {
                        case 'e':
                            newPos.x += 1;
                            break;
                        case 'w':
                            newPos.x -= 1;
                            break;
                        case 'n':
                            newPos.y -= 1;
                            break;
                        case 's':
                            newPos.y += 1;
                            break;
                    }

                    utils.wrapOverWorld(newPos);

                    let objectBid = grid[newPos.x][newPos.y].object;
                    let other = grid[newPos.x][newPos.y].char;

                    if (typeof other !== 'undefined') {
                        // attack if there is another char at destination
                        utils.combat.hit(player, other);
                        onDelay = true;
                        delayTimer = setTimeout(function () {
                            onDelay = false;
                        }, actionDelay);
                    } else if (typeof objectBid === 'number') {
                        let object = base.objects[objectBid];
                        // interact if there is object at destination
                        if (object.type === base.constants.objectTypes.structure) {
                            if (!utils.inventory.full(player)) {
                                delayedAction(function () {
                                    utils.inventory.addItem(player, base.itemId[object.name]);
                                    delete grid[newPos.x][newPos.y].object;
                                });
                            }
                        } else if (object.type === base.constants.objectTypes.node) {
                            let req = {
                                skill: object.skill,
                                min: object.minLevel
                            };
                            if (!utils.inventory.full(player) && utils.skill.canUse(player, req)) {
                                player.emit('msg', 'You try ' + object.skill + '...');
                                delayedAction(function () {
                                    // give item if skill succeeds
                                    if (utils.skill.use(player, req)) {
                                        utils.inventory.addItem(player, object.output);
                                        player.emit('msg', 'Success!');
                                    } else{
                                        player.emit('msg', 'Fail!');
                                    }
                                    // todo: probability to destroy object depends on player's skill
                                    if (Math.random() < 0.2) {
                                        delete grid[newPos.x][newPos.y].object;
                                    }
                                });
                            }
                        }
                    } else {
                        // walk if destination cell is empty
                        moveOnGrid(player, newPos);
                        updateViewport();
                        onDelay = true;
                        delayTimer = setTimeout(function () {
                            onDelay = false;
                        }, actionDelay);
                    }
                }
            }
        });

        // left-clicked @invSlot
        socket.on('invUse', function onInvUse(invSlot) {
            utils.inventory.useItem(player, invSlot);
        });
        // right-clicked @invSlot
        socket.on('drop', function onDrop(invSlot) {
            utils.inventory.dropItem(player, invSlot);
        });

        // clicked @eqSlot
        socket.on('unequip', function onUnequip(eqSlot) {
            utils.equipment.uneqip(player, eqSlot);
        });

        // clicked item # bagItem on the ground
        socket.on('pick', function onPick(bagItem) {
            let bag = grid[player.x][player.y].bag;
            if (typeof bag !== 'undefined') { // make sure that request is legit
                let item = bag.items[bagItem];
                // only add item if item with such number exists in the bag and player's inventory is not full
                if (typeof item !== 'undefined' && utils.inventory.addItem(player, item)) {
                    bag.getItem(bagItem);
                }
            }
        });

        // clicked recipe
        socket.on('craft', function onCraft(craftBid) {
            utils.craft.perform(player, craftBid);
        });

        // interrupt action loop and delete mob object from global lists
        function destroy() {
            clearTimeout(delayTimer);
            clearTimeout(updateTimer);
            removeFromGrid(player);
        }
        player.destroy = destroy;

        // add new player object to global lists and return player object
        addToGrid(player);
        return player;
    }





    // listen for connection of new clients
    io.on('connection', function onConnection(socket) {
        let player = createPlayer(socket);
        player.emit('connected', {id: player.id});
        player.emit('inventory', player.getInventory());
        player.emit('equipment', player.getEquipment());
        player.emit('stats', player.getStats());

        let playersCount = Object.keys(players).length;
        console.log('Player connected: ' + socket.id);
        console.log('Current number of players: ' + playersCount);
        io.emit('msg', player.name + ' joined the game. Players online: ' + playersCount);

        // Remove player from game on disconnect
        socket.on('disconnect', function onDisconnect() {
            player.destroy();
            playersCount = Object.keys(players).length;
            io.emit('msg',  player.name + ' left the game. Players online: ' + playersCount);
            console.log('Player disconnected: ' + socket.id);
            console.log('Current number of players: ' + playersCount);
        });

        // Respond to ping request
        socket.on('ping', function onPing() {
            socket.emit('pong');
        });
    });
}

module.exports = gameServer;
