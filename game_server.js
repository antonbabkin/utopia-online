// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

/*jslint node: true, nomen: true, vars: true*/
'use strict';



function gameServer(io) {

    let fs = require('fs');
    let base = require('./db.js');
    let utils = require('./utils.js');
    let playersData = {}; // players' data stored by name, available while server is running
    let privateObjects = {}; // map objects that are tied to particular players

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
            };
        },
        cellsAround: function (center) {
            // center = {x, y}
            // return 4 grid cells around @center
            let cells = utils.coordsAround(center);
            Object.keys(cells).forEach(function (dir) {
                cells[dir] = grid[cells[dir].x][cells[dir].y];
            });
            return cells;
        },
        isWall: function(cell) {
            if (typeof cell.object === 'undefined') {
                return false;
            } else {
                return !base.constants.wallBids.every(function (bid) {
                    return cell.object !== bid;
                });
            }
        },
        markHome: function (start) {
            // check if territory around start is enclosed by rectangular shaped wall
            // if it is, mark all interior sells as home
            // now only rectangular shape and only within viewport
            // todo: add claiming item, erase claimed area if one of the walls falls

            let walls = {};


            // find walls around start
            function findWall(dx, dy) {
                // find wall in the direction of vector dx, dy
                // one of directions must be = 0, another 1 or -1
                let xy = start;
                for (let i = 1; i < 8; i += 1) {
                    xy = utils.coordsOffset(xy, dx, dy);
                    if (utils.grid.isWall(grid[xy.x][xy.y])) {
                        if (dy === 0) {
                            return xy.x;
                        } else {
                            return xy.y;
                        }
                    }
                }
                return false;
            }

            walls.n = findWall(0, -1);
            walls.e = findWall(1, 0);
            walls.s = findWall(0, 1);
            walls.w = findWall(-1, 0);

            let hasWallsAroundStart = ['n', 'e', 's', 'w'].every(function (dir) {
                return walls[dir] !== false;
            });

            if (!hasWallsAroundStart) {
                return false;
            }

            // check if all 4 walls are solid
            let xy = {x: walls.w, y: walls.n};
            while (true) {
                // north and south walls
                if (!utils.grid.isWall(grid[xy.x][walls.n]) || !utils.grid.isWall(grid[xy.x][walls.s])) {
                    return false;
                }
                if (xy.x === walls.e) {
                    break;
                }
                xy = utils.coordsOffset(xy, 1, 0);
            }
            xy = utils.coordsOffset({x: walls.w, y: walls.n}, 0, 1);
            while (true) {
                // west and east walls
                if (!utils.grid.isWall(grid[walls.w][xy.y]) || !utils.grid.isWall(grid[walls.e][xy.y])) {
                    return false;
                }
                if (xy.y === walls.s) {
                    break;
                }
                xy = utils.coordsOffset(xy, 0, 1);
            }

            // all good: claim territory
            let diag = utils.vector(
                {x: walls.w, y: walls.n},
                {x: walls.e, y: walls.s}
            );

            let nw = {x: walls.w, y: walls.n};
            for (let x = 0; x <= diag.x; x += 1) {
                for (let y = 0; y <= diag.y; y +=1) {
                    xy = utils.coordsOffset(nw, x, y);
                    grid[xy.x][xy.y].home = true;
                }
            }
            return true;
        },
        eraseHome: function (start) {
            // erase all home cells starting from @start
            delete grid[start.x][start.y].home;
            (function eraseNeighbors(cell) {
                let neighbors = utils.coordsAround(cell),
                    neighbor;
                ['n', 'e', 's', 'w'].forEach(function (dir) {
                    neighbor = neighbors[dir];
                    if (grid[neighbor.x][neighbor.y].home === true) {
                        delete grid[neighbor.x][neighbor.y].home;
                        eraseNeighbors(neighbor);
                    }
                });
            }(start));
        }



        /*
        todo: this is unfinished function that automatically detects area enclosed by walls
        does not work, because grid cell objects don't have x, y properties
        could be redone with coordsAround...
        For now going for a simple approach in markHome + eraseHome
        ,
        markEnclosure: function (start) {
            // Detects and marks "inside" cells of the grid, including walls
            // If start cell is a wall, begin with it
            // If start cell is empty, begin with any neighboring wall
            // This function should be called on empty cell if that cell was known to be a part of enclosure
            function isWall(cell) {
                if (typeof cell.object === 'undefined') {
                    return false;
                } else {
                    return !base.constants.wallBids.every(function (bid) {
                        return cell.object !== bid;
                    });
                }
            }

            // Find all walls connected with start
            let connectedWalls = [];
            if (isWall(start)) {
                connectedWalls.push(start);
            }
            (function addNeighborWalls(cell) {
                let neighbors = utils.grid.cellsAround(cell),
                    neighbor;
                ['n', 'e', 's', 'w'].forEach(function (dir) {
                    neighbor = neighbors[dir];
                    if (isWall(neighbor) && connectedWalls.indexOf(neighbor) === -1) {
                        // if it is a wall and not in the list yet, then add and continue adding from it recursively
                        connectedWalls.push(neighbor);
                        addNeighborWalls(neighbor);
                    }
                });
            }(start));

            // remove "dead ends" - parts of the wall that stand out
            // they only have one connection
            (function removeDeadEnds() {
                let neighbors, connections, neighbor, deadEnds = [];

                connectedWalls.forEach(function (cell) {
                    neighbors = utils.grid.cellsAround(cell);
                    connections = 0;
                    ['n', 'e', 's', 'w'].forEach(function (dir) {
                        neighbor = neighbors[dir];
                        if (isWall(neighbor)) {
                            connections += 1;
                        }
                    });
                    if (connections < 2) {
                        deadEnds.push(cell);
                    }
                });

                if (deadEnds.length > 0) {
                    deadEnds.forEach(function (cell) {
                        connectedWalls.splice(connectedWalls.indexOf(cell), 1);
                    });
                    // recursive call: some cells could now become dead ends
                    removeDeadEnds();
                }
            }());

            if (connectedWalls.length === 0) {
                return;
            }

            // grid borders of a minimal rectangle that encompasses all walls
            let left, right, top, bottom;
            connectedWalls.forEach(function (cell) {

            });
        }*/
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
            if (typeof itemBid === 'undefined') {
                return;
            }

            let item = base.items[itemBid];
            if (item.type === 'equipment') {
                let equipment = player.getEquipment();
                let equippedBid = equipment[item.eqSlot]; // previously equipped in that slot
                equipment[item.eqSlot] = item.bid;
                utils.inventory.removeItem(player, itemBid);
                if (typeof equippedBid !== 'undefined') {
                    utils.inventory.addItem(player, equippedBid);
                }
                player.updateStats();
                player.emit('equipment', equipment);
            } else if ((item.type === 'structure' || item.type === 'facility') && typeof grid[player.x][player.y].object === 'undefined') {
                utils.inventory.removeItem(player, itemBid);
                player.delayedAction(function () {
                    let objectId = base.objectId[item.name];
                    grid[player.x][player.y].object = objectId;
                    if (base.objects[objectId].type === 'private') {
                        privateObjects[player.x + '.' + player.y] = player.name;
                    }
                });
            } else if (typeof item.heals !== 'undefined') {
                let stats = player.getStats();
                stats.hp = Math.min(stats.maxHp, stats.hp + item.heals);
                player.emit('stats', stats);
                utils.inventory.removeItem(player, itemBid);
            } else if (item.name === 'Home claim') {
                if (utils.grid.markHome(player)) {
                    player.emit('msg', 'Claim successful');
                    utils.inventory.removeItem(player, itemBid);
                    //todo: updateInHome()
                } else {
                    player.emit('msg', 'Claim failed');
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
                player.updateStats();
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

            !enoughInputs && player.emit('msg', 'Not enough materials');

            if (typeof craft.facility !== 'undefined') {
                let around = utils.grid.cellsAround(player);
                let noFacilityNear = Object.keys(around).every(function (dir) {
                    return around[dir].object !== craft.facility;
                });
                !noFacilityNear && player.emit('msg', 'No facility near');
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
                min: craft.level
            };
            if (utils.craft.possible(player, craftBid) && utils.skill.canUse(player, req)) {
                player.emit('msg', 'Trying to craft ' + base.items[craft.output].name + '...');
                player.delayedAction(function () {
                    craft.inputs.forEach(function (input) {
                        utils.inventory.removeItem(player, input.bid, input.count);
                    });
                    if (utils.skill.use(player, req)) {
                        utils.inventory.addItem(player, craft.output);
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
            let increaseP = 1 - 0.01 * stats.base[req.skill];
            increaseP *= (success ? 1 : 0.5);
            if (Math.random() < increaseP) {
                utils.skill.increase(player, req.skill);
            }
            return success;
        },
        increase: function (player, skill) {
            let stats = player.getStats();
            if (stats.base[skill] < 100) {
                stats.base[skill] += 1;
                player.updateStats();
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
            if (attacker.type === 'player') {
                let increaseP = 1 - 0.01 * aStats.fighting;
                increaseP *= (success ? 1 : 0.5);
                if (Math.random() < increaseP) {
                    utils.skill.increase(attacker, 'fighting');
                }
            }

            // damage is dealt
            if (success) {
                let hitData = {
                    x: defender.x,
                    y: defender.y,
                    dmg: aStats.damage
                };
                Object.keys(players).forEach(function (pid) {
                    // broadcast hit events to all players that see defender in their viewport
                    if (utils.vector(defender, players[pid]).normMax() <= base.constants.viewport.centerX) {
                        players[pid].emit('hit', hitData);
                    }
                });

                dStats.hp -= aStats.damage;
                if (defender.type === 'player') {
                    defender.emit('stats', dStats);
                }

                if (dStats.hp <= 0) {
                    defender.die();
                    if (defender.type === 'player') {
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

    readData();

    spawnMobs();

    console.log('Server started');

    // -------------------------------------------------------------
    // Function definitions
    // -------------------------------------------------------------

    // Helper functions to add, remove and move chars on grid:
    // update grid and corresponding list
    function addToGrid(char) {
        grid[char.x][char.y].char = char;
        if (char.type === 'player') {
            players[char.id] = char;
        } else if (char.type === 'mob') {
            mobs[char.id] = char;
        }
    }

    function removeFromGrid(char) {
        delete grid[char.x][char.y].char;
        if (char.type === 'player') {
            delete players[char.id];
        } else if (char.type === 'mob') {
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
    function readData() {
        fs.readFile('map.json', 'utf8', function (err, data) {
            if (err) {
                console.error('Failed to read map.json');
                console.log(err);
                return;
            }

            console.log('map.json read successfully');
            let map = JSON.parse(data);
            for (let x = 0; x < base.constants.world.width; x += 1) {
                for (let y = 0; y < base.constants.world.height; y += 1) {
                    grid[x][y].ground = map.grid[x][y].g;
                    if (typeof map.grid[x][y].o !== 'undefined') {
                        grid[x][y].object = map.grid[x][y].o;
                    }
                    if (typeof map.grid[x][y].b !== 'undefined') {
                        createBag({
                            x: x,
                            y: y,
                            items: map.grid[x][y][2]
                        });
                    }
                    if (map.grid[x][y].h === true) {
                        grid[x][y].home = true;
                    }
                }
            }

            privateObjects = map.privateObjects;

            // after map is loaded, start server loops
            setTimeout(saveServer, base.constants.serverSaveTime);
            setTimeout(updateEnvironment, base.constants.environmentUpdateTime);

            // read players database
            fs.readFile('players.json', 'utf8', function (err, data) {
                if (err) {
                    console.error('Failed to read players.json');
                    console.log(err);
                    return;
                }
                playersData = JSON.parse(data);
            });

        });
    }

    // write server state to the disk at regular time
    function saveServer() {

        console.log('Server backup: ', Date());

        // save ground and objects into map.json
        let map = {
            grid: [],
            privateObjects: privateObjects
        };

        grid.forEach(function (column, x) {
            map.grid[x] = [];
            column.forEach(function (cell, y) {
                map.grid[x][y] = {};
                map.grid[x][y].g = cell.ground;
                if (typeof cell.object !== 'undefined') {
                    map.grid[x][y].o = cell.object;
                }
                if (typeof cell.bag !== 'undefined') {
                    map.grid[x][y].b = cell.bag.items;
                }
                if (cell.h === true) {
                    map.grid[x][y].h = true;
                }
            });
        });

        fs.writeFile('map.json', JSON.stringify(map), function (err) {
            if (err) {
                console.error('Failed to write current map to map.json');
                console.log(err);
                return;
            }
            console.log('---- map.json saved successfully');
        });

        fs.writeFile('players.json', JSON.stringify(playersData), function (err) {
            if (err) {
                console.error('Failed to write playersData');
                console.log(err);
                return;
            }
            console.log('---- playersData saved successfully');
        });

        setTimeout(saveServer, base.constants.serverSaveTime);
    }

    // environment update loop
    function updateEnvironment() {
        // new trees grow and wood is broken
        grid.forEach(function (column, x) {
            column.forEach(function (cell, y) {
                if (typeof cell.object === 'undefined') {
                    // no object: can grow
                    let ground = base.grounds[cell.ground];
                    if (typeof ground.grow !== 'undefined' && Math.random() < ground.grow.p) {
                        cell.object = ground.grow.bid;
                    }
                } else {
                    // some object: can change
                    let object = base.objects[cell.object];
                    if (typeof object.change !== 'undefined' && Math.random() < object.change.p) {
                        if (typeof object.change.bid !== 'undefined') {
                            cell.object = object.change.bid;
                        } else {
                            // object dies
                            if (cell.home === true && utils.grid.isWall(cell)) {
                                utils.grid.eraseHome({x: x, y: y});
                                // todo: also should do updateInHome() for all relevant players
                            }
                            delete cell.object;
                        }
                    }
                }
            });
        });

        // new monsters respawn
        spawnMobs();

        // update regularly at given frequency
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
            type: 'mob',
            x: pos.x,
            y: pos.y,
            tint: (0.5 + 0.5 * Math.random()) * 0xFFFFFF
        };
        nextMobId += 1;

        // private attributes
        let prv = {
            stats: {
                hp: base.mobs[spawnId].stats.hp,
                damage: base.mobs[spawnId].stats.damage,
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
            let shortestDistance = utils.vector(pub, destination).normSum();
            let stayOnTile = true; // if all possible moves lead away from destination, don't move
            let newPos;

            // loop through possible moves and select the one closest to destination
            let moves = findEmptyTilesAround();
            Object.keys(moves).forEach(function (dir) {
                let xy = moves[dir];
                let distance = utils.vector(xy, destination).normSum();
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
                    if (typeof other !== 'undefined' && other.type === 'player') {
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
                        let distance = utils.vector(pub, player).normSum();
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
                if (Math.random() < item.p) {
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
            lifetimeTimer = setTimeout(lifetime, base.constants.bagLifetime);
            grid[bag.x][bag.y].bag = bag;
        }

        function lifetime() {
            clearTimeout(lifetimeTimer);
            if (grid[bag.x][bag.y].object === base.objectId['Chest']) {
                // bag stays as long as there is a chest object on the tile
                lifetimeTimer = setTimeout(lifetime, base.constants.bagLifetime);
            } else {
                delete grid[bag.x][bag.y].bag;
                console.log('bag dies at ', bag.x, bag.y); // debug quick death of bag when chest is destroyed
            }
        }

        function renewTimer() {
            clearTimeout(lifetimeTimer);
            lifetimeTimer = setTimeout(lifetime, base.constants.bagLifetime);
            console.log('renew bag timer at  ', bag.x, bag.y); // debug quick death of bag when chest is destroyed
        }

        function getItem(itemNumber) {
            bag.items.splice(itemNumber, 1);
            if (bag.items.length === 0) {
                clearTimeout(lifetimeTimer);
                delete grid[bag.x][bag.y].bag;
            } else {
                renewTimer();
            }
        }

        function addItems(items) {
            // @items: array of item bids
            bag.items = bag.items.concat(items);
            renewTimer();
        }

        bag.renewTimer = renewTimer;
    }

    function createPlayer(socket, name) {
        // Player constructor, which is run when new connection logs in

        // -----------------------------------------------------------
        // Private variables
        // -----------------------------------------------------------
        let player, // only this object becomes public
            inventory,
            equipment,
            stats,
            actionDelay,
            onDelay,
            delayTimer,
            viewport,
            emitViewportTimer;

        // -----------------------------------------------------------
        // Private functions
        // -----------------------------------------------------------
        function emit(msg, data) {
            socket.emit(msg, data);
        }

        function updateStats() {
            base.constants.stats.forEach(function (stat) {
                stats.bonus[stat] = 0;
            });
            Object.keys(equipment).forEach(function (slot) {
                let itemBonuses = base.items[equipment[slot]].bonuses;
                if (typeof itemBonuses !== 'undefined') {
                    itemBonuses.forEach(function (bonus) {
                        stats.bonus[bonus.stat] += bonus.value;
                    });
                }
            });
            if (player.inHome) {
                stats.bonus.crafting += 100;
            }
            base.constants.stats.forEach(function (stat) {
                stats[stat] = stats.base[stat] + stats.bonus[stat];
            });
            emit('stats', stats);
        }

        function getInventory() {
            // @inventory getter: used to manipulate @inventory from outside of player object
            // @inventory still remains a private property and is not emitted to client
            return inventory;
        }

        function getEquipment() {
            // @equipment getter
            return equipment;
        }

        function getStats() {
            // @stats getter
            return stats;
        }

        function updateViewport() {
            // part of the grid visible to player, that is emitted on update
            // this function needs to be called when player changes location
            viewport = [];
            let x1, y1, xy;
            let xl = player.x - base.constants.viewport.centerX;
            let xh = player.x + base.constants.viewport.centerX;
            let yl = player.y - base.constants.viewport.centerY;
            let yh = player.y + base.constants.viewport.centerY;
            for (x1 = xl; x1 <= xh; x1 += 1) {
                viewport[x1 - xl] = [];
                for (y1 = yl; y1 <= yh; y1 += 1) {
                    xy = {x: x1, y: y1};
                    utils.wrapOverWorld(xy);
                    viewport[x1 - xl][y1 - yl] = grid[xy.x][xy.y];
                }
            }
            updateInHome();
        }

        function delay() {
            // put player on delay
            onDelay = true;
            delayTimer = setTimeout(function () {
                onDelay = false;
            }, actionDelay);
        }

        function delayedAction(callback) {
            // perform action with delay: gathering, building, crafting
            if (!onDelay) {
                onDelay = true;
                delayTimer = setTimeout(function () {
                    onDelay = false;
                    callback();
                }, actionDelay);
            }
        }

        function die() {
            // Lose all inventory items and equipment from a randomly chosen slot.
            // Player is then taken to a random spot in the map.
            let loot = inventory.concat(base.itemId["Player's ear"]);
            inventory = [];
            let loseSlot = base.constants.eqSlots[Math.floor(Math.random() * base.constants.eqSlots.length)];
            if (typeof equipment[loseSlot] !== 'undefined') {
                loot.push(equipment[loseSlot]);
                delete equipment[loseSlot];
            }
            createBag({
                x: player.x,
                y: player.y,
                items: loot
            });

            updateStats();
            stats.hp = stats.maxHp;
            moveOnGrid(player, utils.grid.getRandomEmptyCell());
            updateViewport();
            emit('inventory', inventory);
            emit('equipment', equipment);
            emit('stats', stats);
            emit('msg', 'Oh dear, you are dead!')
        }

        function destroy() {
            // interrupt timer loops and delete player object from global lists
            clearTimeout(delayTimer);
            clearTimeout(emitViewportTimer);
            removeFromGrid(player);
        }

        function emitViewportLoop() {
            emit('viewport', viewport);
            emitViewportTimer = setTimeout(emitViewportLoop, base.constants.playerUpdateTime);
        }

        function updateInHome() {
            let homeCell = (grid[player.x][player.y].home === true);
            if (player.inHome !== homeCell) {
                player.inHome = homeCell;
                updateStats();
            }
        }

        // -----------------------------------------------------------
        // Initialize variables
        // -----------------------------------------------------------
        if (typeof playersData[name] === 'undefined') {
            // create new player
            let pos = utils.grid.getRandomEmptyCell();
            player = {
                x: pos.x,
                y: pos.y,
                tint: (0.5 + 0.5 * Math.random()) * 0xFFFFFF
            };
            inventory = [];
            equipment = {};
            stats = {
                hp: 20,
                base: {
                    maxHp: 20,
                    damage: 1,
                    speed: 4,
                    gathering: 0,
                    crafting: 0,
                    fighting: 0
                },
                bonus: {
                    maxHp: 0,
                    damage: 0,
                    speed: 0,
                    gathering: 0,
                    crafting: 0,
                    fighting: 0
                }
                // total stats are added to this object by updateStats()
            };
        } else {
            // load player from storage
            let p = playersData[name];
            player = {
                x: p.x,
                y: p.y,
                tint: p.tint
            };
            inventory = p.inventory;
            equipment = p.equipment;
            stats = p.stats;
        }

        player.name = name;
        player.type = 'player';
        player.id = socket.id;
        player.emit = emit;
        player.updateStats = updateStats;
        player.getInventory = getInventory;
        player.getEquipment = getEquipment;
        player.getStats = getStats;
        player.delayedAction = delayedAction;
        player.die = die;
        player.destroy = destroy;

        addToGrid(player); // add new player object to global lists

        actionDelay = base.constants.actionDelay / stats.speed;
        onDelay = false;
        emit('login', {success: true, name: player.name});
        emit('inventory', inventory);
        emit('equipment', equipment);
        updateViewport(); // will also call updateInHome(), create .inHome property, updateStats() and emit 'stats'
        emitViewportLoop(); // start update loop

        console.log('Player connected: ' + player.name);
        console.log('Current number of players: ' + Object.keys(players).length);
        io.emit('msg', player.name + ' joined the game. Players online: ' + Object.keys(players).length);

        // -----------------------------------------------------------
        // Socket listeners
        // -----------------------------------------------------------
        socket.on('walk', function onWalk(dir) {
            if (onDelay || (dir !== 'e' && dir !== 'w' && dir !== 'n' && dir !== 's')) {
                return;
            }

            // walking and attacking are instant, but other actions require delay
            let newPos = {
                x: player.x,
                y: player.y
            };

            switch (dir) {
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
                delay()
            } else if (typeof objectBid === 'number') {
                let object = base.objects[objectBid];
                // interact if there is object at destination
                if (object.type === 'facility') {
                    // facilities are picked up
                    if (!utils.inventory.full(player)) {
                        delayedAction(function () {
                            utils.inventory.addItem(player, base.itemId[object.name]);
                            if (grid[newPos.x][newPos.y].home === true && utils.grid.isWall(grid[newPos.x][newPos.y])) {
                                utils.grid.eraseHome(newPos);
                                updateInHome();
                            }
                            delete grid[newPos.x][newPos.y].object;
                        });
                    }
                } else if (object.type === 'structure') {
                    // structures are attacked and destroyed on success
                    emit('msg', 'You hit ' + object.name);
                    delay();
                    if (Math.random() > object.durability) {
                        if (grid[newPos.x][newPos.y].home === true && utils.grid.isWall(grid[newPos.x][newPos.y])) {
                            utils.grid.eraseHome(newPos);
                            updateInHome();
                        }
                        delete grid[newPos.x][newPos.y].object;
                    }
                } else if (object.type === 'private') {
                    // owner of the structure can walk through, other try to break
                    if (privateObjects[newPos.x + '.' + newPos.y] === player.name) {
                        moveOnGrid(player, newPos);
                        updateViewport();
                        delay();
                    } else {
                        emit('msg', 'You hit ' + privateObjects[newPos.x + '.' + newPos.y] + '\'s ' + object.name);
                        delay();
                        if (Math.random() > object.durability) {
                            if (grid[newPos.x][newPos.y].home === true && utils.grid.isWall(grid[newPos.x][newPos.y])) {
                                utils.grid.eraseHome(newPos);
                                updateInHome();
                            }
                            if (object.name === 'Chest' && typeof grid[newPos.x][newPos.y].bag !== 'undefined') {
                                grid[newPos.x][newPos.y].bag.renewTimer();
                            }

                            delete grid[newPos.x][newPos.y].object;
                        }
                    }
                } else if (object.type === 'resource') {
                    let req = {
                        skill: object.skill,
                        min: object.level
                    };
                    if (!utils.inventory.full(player) && utils.skill.canUse(player, req)) {
                        emit('msg', 'You try ' + object.skill + '...');
                        delayedAction(function () {
                            // give item if skill succeeds
                            if (utils.skill.use(player, req)) {
                                utils.inventory.addItem(player, object.output);
                                emit('msg', 'Success!');
                            } else{
                                emit('msg', 'Fail!');
                            }
                            if (Math.random() > object.durability) {
                                delete grid[newPos.x][newPos.y].object;
                            }
                        });
                    }
                }
            } else {
                // walk if destination cell is empty
                moveOnGrid(player, newPos);
                updateViewport();
                delay();
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

        // sent chat message
        socket.on('chat', function onChat(msg) {
            io.emit('msg', player.name + ': ' + msg);
        });

        // Remove player from game on disconnect
        socket.on('disconnect', function onDisconnect() {
            // save player data to storage
            playersData[name] = {
                x: player.x,
                y: player.y,
                tint: player.tint,
                inventory: inventory,
                equipment: equipment,
                stats: stats
            };

            destroy();
            let playersCount = Object.keys(players).length;
            io.emit('msg', player.name + ' left the game. Players online: ' + playersCount);
            console.log('Player disconnected: ' + player.name);
            console.log('Current number of players: ' + playersCount);
        });

        // Respond to ping request
        socket.on('ping', function onPing() {
            socket.emit('pong');
        });
    }





    // listen for connection of new clients
    io.on('connection', function onConnection(socket) {
        socket.emit('connected');
        socket.on('login', function (name) {
            // check if player with such name is already playing
            if (Object.keys(players).every(function (pid) {
                return players[pid].name !== name;
            })) {
                createPlayer(socket, name);
            } else {
                socket.emit('login', {success: false, msg: 'Player with name "' + name + '" is already in game.'});
            }
        });
    });
}

module.exports = gameServer;
