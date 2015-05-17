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
    let privateObjects = {}, // map objects that are tied to particular players
        walls; // object for enclosure detection mechanics

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
            } else if ((item.type === 'structure' || item.type === 'facility') && typeof grid[player.x][player.y].object === 'undefined'
            && grid[player.x][player.y].ground !== base.groundId['Water']) {
                utils.inventory.removeItem(player, itemBid);
                player.delayedAction(function () {
                    let objectId = base.objectId[item.name];
                    grid[player.x][player.y].object = objectId;
                    if (base.objects[objectId].type === 'private') {
                        privateObjects[player.x + '.' + player.y] = player.name;
                    }

                    // Update walls and check for new interiors when building walls
                    if (walls.isWall(grid[player.x][player.y])) {
                        walls.addWall({x: player.x, y: player.y});
                    }
                });
            } else if (typeof item.heals !== 'undefined') {
                let stats = player.getStats();
                stats.hp = Math.min(stats.maxHp, stats.hp + item.heals);
                player.emit('stats', stats);
                utils.inventory.removeItem(player, itemBid);
            } else if (item.type === 'ground') {
                utils.inventory.removeItem(player, itemBid);
                player.delayedAction(function () {
                    grid[player.x][player.y].ground = base.groundId[item.name];
                });
            } else if (item.name === 'Wooden shovel') {
                if (!utils.inventory.full(player)) {
                    let cell = grid[player.x][player.y],
                        ground = base.grounds[cell.ground];
                    if (ground.type === 'cover') {
                        // pick up floor and such
                        player.delayedAction(function () {
                            utils.inventory.addItem(player, base.itemId[ground.name]);
                            cell.ground = ground.change.bid;
                        });
                    } else if (ground.type === 'resource') {
                        let req = {
                            skill: 'gathering',
                            min: ground.level
                        };
                        if (utils.skill.canUse(player, req)) {
                            player.emit('msg', 'You try gathering...');
                            player.delayedAction(function () {
                                // give item if skill succeeds
                                if (utils.skill.use(player, req)) {
                                    utils.inventory.addItem(player, ground.output);
                                    player.emit('msg', 'Success!');
                                } else{
                                    player.emit('msg', 'Fail!');
                                }
                                if (Math.random() > item.durability) {
                                    player.emit('msg', 'You shovel breaks');
                                    utils.inventory.removeItem(player, itemBid);
                                }
                            });
                        }
                    }

                    // After digging flood cell with water if there is an adjacent water cell
                    let around = utils.grid.cellsAround(player);
                    let noFlood = Object.keys(around).every(function (dir) {
                        return (around[dir].ground !== base.groundId['Water']);
                    });
                    if (noFlood === false) {
                        cell.ground = base.groundId['Water'];
                    }
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
                noFacilityNear && player.emit('msg', 'No facility near');
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

    // Create object with clojure for enclosure detection mechanics
    walls = (function wallsClojure() {
        const wNone = 0,
            wUnvisited = 1,
            wVisited = 2;
        let wGrid, // grid for detected walls
            xx, yy, // grid dimensions
            x, y; // temporary index variables

        function isWall(cell) {
            if (typeof cell.object === 'undefined') {
                return false;
            } else {
                return !base.constants.wallBids.every(function (bid) {
                    return cell.object !== bid;
                });
            }
        }

        function findConnectedWalls(sxy) {
            // Start at sxy and flood all walls connected on 4 sides (no diagonals)
            // Returns array of coordinate strings of form "x.y"
            // Array will be empty if sxy is not a wall
            let cw;
            cw = [];
            (function flood(xy) {
                if (wGrid[xy.x][xy.y] !== wNone) {
                    let str;
                    str = xy.x + '.' + xy.y;
                    if (cw.indexOf(str) === -1) {
                        let around;
                        cw.push(str);
                        around = utils.coordsAround(xy);
                        Object.keys(around).forEach(function (dir) {
                            flood(around[dir]);
                        });
                    }
                }
            }(sxy));
            return cw;
        }


        function findRect(cw) {
            // Coordinates of rectangle that covers connected walls, +1 on each side
            // Algorithm uses fact that cw array is filled by flooding, so the next segment is connected to one of the earlier added segments
            // Can do this inside of findConnectedWalls() loop, to save time maybe
            // Fails if walls cover the whole map in at least one dimension, so there is an overlap
            let xy, x, y, n, e, s, w;
            xy = cw[0].split('.');
            x = +xy[0];
            y = +xy[1];
            w = x;
            e = x;
            n = y;
            s = y;
            cw.forEach(function (str, i) {
                if (i === 0) {
                    return;
                }
                xy = str.split('.');
                x = +xy[0];
                y = +xy[1];
                if (x === (e + 1) % xx) {
                    e = x;
                } else if (w === (x + 1) % xx) {
                    w = x;
                } else if (y === (s + 1) % yy) {
                    s = y;
                } else if (n === (y + 1) % yy) {
                    n = y;
                }
            });
            return {
                n: (n - 1 + yy) % yy,
                e: (e + 1) % xx,
                s: (s + 1) % yy,
                w: (w - 1 + xx) % xx
            };
        }

        function findInterior(cw, m) {
            // Finds interior enclosed by a given set of connected walls.
            // Floods the outside, starting from a NW corner of rectangle around walls.
            // Returns array of interior coordinates of format {x,y} or empty array if no interior detected.

            let r = findRect(cw, m),
                width = (r.e - r.w + xx) % xx + 1,
                height = (r.s - r.n + yy) % yy + 1,
                out, interior,
                i, j, x, y, str;

            if (cw.length < 8 || width < 5 || height < 5) {
                return [];
            }

            out = [];
            for (i = 0; i < width; i += 1) {
                out[i] = [];
            }

            (function flood(i, j) {
                // skip if out of rectangle borders or already visited
                if (i < 0 || j < 0 || i >= width || j >= height || out[i][j] === true) {
                    return;
                }
                x = (r.w + i) % xx;
                y = (r.n + j) % yy;
                str = x + '.' + y;
                // mark and flood around if not a wall
                if (cw.indexOf(str) === -1) {
                    out[i][j] = true;
                    flood(i, j - 1);
                    flood(i + 1, j);
                    flood(i, j + 1);
                    flood(i - 1, j);
                    flood(i - 1, j - 1);
                    flood(i + 1, j - 1);
                    flood(i + 1, j + 1);
                    flood(i - 1, j + 1);
                }
            }(0, 0));


            interior = [];
            for (i = 0; i < width; i += 1) {
                for (j = 0; j < height; j += 1) {
                    x = (r.w + i) % xx;
                    y = (r.n + j) % yy;
                    if (out[i][j] !== true && wGrid[x][y] === wNone){
                        interior.push({x: x, y: y});
                    }
                }
            }
            return interior;
        }

        function findUnvisitedWall() {
            // Finds wall that has not yet been checked for enclosure
            // Return {x, y} coordinates of that wall or undefined if all walls have already been checked
            let x, y;
            for (x = 0; x < xx; x += 1) {
                for (y = 0; y < yy; y += 1) {
                    if (wGrid[x][y] === wUnvisited) {
                        return {x: x, y: y};
                    }
                }
            }
            return;
        }

        function markEnclosure(s) {
            // Mark walls as checked on wGrid and mark interior on grid, beginning with wall at s.
            let cw = findConnectedWalls(s);
            cw.forEach(function (str) {
                let xy = str.split('.');
                wGrid[xy[0]][xy[1]] = wVisited;
            });
            findInterior(cw).forEach(function (xy) {
                grid[xy.x][xy.y].interior = true;
            });
        }

        function addWall(xy) {
            // Add a wall to the wGrid at xy and check for new interiors.
            // This can potentially be more efficient without re-visiting previously detected walls.
            if (grid[xy.x][xy.y].interior === true) {
                delete grid[xy.x][xy.y].interior;
            }
            wGrid[xy.x][xy.y] = wUnvisited;
            markEnclosure(xy);
        }

        function eraseInterior(s) {
            // Erase connected interior starting from s.
            // Connection can be diagonal as well.
            (function flood(xy) {
                if (grid[xy.x][xy.y].interior === true) {
                    delete grid[xy.x][xy.y].interior;
                    let around = utils.coordsAround(xy, true);
                    Object.keys(around).forEach(function (dir) {
                        flood(around[dir]);
                    });
                }
            }(s));
        }

        function removeWall(xy) {
            // Remove wall at xy from the wGrid and erase any broken interiors.
            let hole, ins, wCount, around;
            hole = false;
            ins = [];
            wCount = 0;
            around = utils.coordsAround(xy, true);
            Object.keys(around).forEach(function (dir) {
                let xy = around[dir];
                if (wGrid[xy.x][xy.y] === wNone) {
                    if (grid[xy.x][xy.y].interior === true) {
                        ins.push(xy);
                    } else {
                        hole = true;
                    }
                } else {
                    wCount += 1;
                }
            });

            wGrid[xy.x][xy.y] = wNone;

            // No hole and connected interior -> new interior
            // 8 walls around removed wall -> new interior inside.
            if ((hole === false && ins.length > 0) || wCount === 8) {
                grid[xy.x][xy.y].interior = true;
            }

            if (hole === true && ins.length > 0) {
                ins.forEach(function (xy) {
                    eraseInterior(xy);
                });
            }
        }



        function readGrid() {
            let unvisited;

            // Initialization of private properties of walls object
            xx = grid.length;
            yy = grid[0].length;
            wGrid = [];

            // First pass: mark wall cells as 1, and non-wall cells as 0
            grid.forEach(function (column, x) {
                wGrid[x] = [];
                column.forEach(function (cell, y) {
                    wGrid[x][y] = (isWall(cell) ? wUnvisited : wNone);
                });
            });

            // Second pass: check walls for enclosures and mark visited walls with 2
            while (typeof (unvisited = findUnvisitedWall()) !== 'undefined') {
                markEnclosure(unvisited);
            }
        }




        // Return public properties of walls object
        return {
            isWall: isWall,
            readGrid: readGrid,
            addWall: addWall,
            removeWall: removeWall
        };
    }());


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
                }
            }

            // Detect all walls and interiors.
            walls.readGrid();

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
        // gound changes it's type
        // new trees grow and wood is broken
        grid.forEach(function (column, x) {
            column.forEach(function (cell, y) {
                let ground = base.grounds[cell.ground];
                if (typeof ground.change !== 'undefined' && Math.random() < ground.change.p) {
                    cell.ground = ground.change.bid;
                }
                if (typeof cell.object === 'undefined') {
                    // no object: can grow
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
                            if (walls.isWall(cell)) {
                                walls.removeWall({x: x, y: y});
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
            aggressive,
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
            if (player.inside) {
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
            updateInsideStatus();
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

        function updateInsideStatus() {
            let inside = (grid[player.x][player.y].interior === true);
            if (player.inside !== inside) {
                player.inside = inside;
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

        aggressive = false;

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
        updateViewport(); // will also call updateInsideStatus(), create .inHome property, updateStats() and emit 'stats'
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

            function checkWallBreak() {
                // Do this for picking up "soft" walls (facility), breaking hardened walls (structure) and doors (private)
                if (walls.isWall(grid[newPos.x][newPos.y])) {
                    walls.removeWall(newPos);
                    // todo: updateInsideStatus() for all relevant players
                }
            }

            function pickupObject(object) {
                if (!utils.inventory.full(player)) {
                    delayedAction(function () {
                        utils.inventory.addItem(player, base.itemId[object.name]);
                        checkWallBreak();
                        delete grid[newPos.x][newPos.y].object;
                    });
                }
            }


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
                // always attack NPCs, only attack players in aggressive mode
                if (other.type === 'mob' || aggressive === true) {
                    utils.combat.hit(player, other);
                    delay();
                }
            } else if (typeof objectBid === 'number') {
                let object = base.objects[objectBid];
                // interact if there is object at destination
                if (object.type === 'facility' && aggressive === true) {
                    // facilities are picked up in aggressive mode, nothing happens otherwise
                    pickupObject(object);
                } else if (object.type === 'structure' && aggressive === true) {
                    // structures are attacked in aggressive mode and destroyed on success
                    // nothing happens if not aggressive
                    emit('msg', 'You hit ' + object.name);
                    delay();
                    if (Math.random() > object.durability) {
                        checkWallBreak();
                        delete grid[newPos.x][newPos.y].object;
                    }
                } else if (object.type === 'private') {
                    // not aggressive: owner walks through, nothing happens for others
                    // aggressive: owner picks up object, others try to break it
                    if (privateObjects[newPos.x + '.' + newPos.y] === player.name) {
                        if (aggressive === true) {
                            pickupObject(object);
                        } else {
                            moveOnGrid(player, newPos);
                            updateViewport();
                            delay();
                        }
                    } else {
                        if (aggressive === true) {
                            emit('msg', 'You hit ' + privateObjects[newPos.x + '.' + newPos.y] + '\'s ' + object.name);
                            delay();
                            if (Math.random() > object.durability) {
                                checkWallBreak();
                                if (object.name === 'Chest' && typeof grid[newPos.x][newPos.y].bag !== 'undefined') {
                                    grid[newPos.x][newPos.y].bag.renewTimer();
                                }
                                delete grid[newPos.x][newPos.y].object;
                            }
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

        // change of aggressive switch
        socket.on('agro', function onAgro(status) {
            aggressive = status;
            emit('msg', 'Aggressive mode ' + (aggressive === true ? 'on.' : 'off.'));
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
