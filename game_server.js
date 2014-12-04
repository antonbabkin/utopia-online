// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

/*jslint node: true, nomen: true, vars: true*/
'use strict';



function gameServer(io) {

    let fs = require('fs');
    let base = require('./base.js');
    let utils = require('./utils.js');

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

            // after map is loaded, start server update loops
            setTimeout(update, base.constants.stateUpdateTime);
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

    // server state update loop
    function update() {
        // todo: each player gets a limited chunk of grid around him
        Object.keys(players).forEach(function (pid) {
            let player = players[pid];
            let state = {
                grid: grid,
                self: {
                    x: player.x,
                    y: player.y
                }
            };
            try {
                player.emit('world_update', state);
            } catch (e) {
                console.log('update fail: ' + e);
            }
        });

        setTimeout(update, base.constants.stateUpdateTime);
    }

    // environment update loop
    function updateEnvironment() {
        // new trees grow and wood is broken
        grid.forEach(function (column) {
            column.forEach(function (cell) {
                if (cell.object === null && Math.random() < 0.02) {
                    if (cell.ground === base.grounds.grass) {
                        cell.object = base.objects.tree;
                    } else if (cell.ground === base.grounds.sand) {
                        cell.object = base.objects.palm;
                    }
                } else if (cell.object === base.objects.wood && Math.random() < 0.02) {
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
        // todo: change mob indexing to work through integer ID's instead of names
        // draw a random entry from spawnTable
        let rnd = Math.random();
        let spawnName = '';
        spawnTable.every(function (mob) {
            if (mob.cumP > rnd) {
                spawnName = mob.name;
                return false;
            }
            return true;
        });

        if (spawnName === '') {
            console.error('Failed to get mob name from spawn table (rnd = ' + rnd + '):\n' + spawnTable);
            return;
        }

        let x, y, cellEmpty;
        do {
            x = Math.floor(Math.random() * base.constants.world.width);
            y = Math.floor(Math.random() * base.constants.world.height);
            cellEmpty = (typeof grid[x][y].char === 'undefined');
            // can still spawn on top of objects
        } while (!cellEmpty);

        let mob = Object.create(base.mobs[spawnName]);
        mob.type = base.constants.charTypes.mob;
        mob.x = x;
        mob.y = y;
        mob.name = spawnName; // rewrite property from database, so it becomes own property and is transferred to clients
        mob.tint = (0.5 + 0.5 * Math.random()) * 0xFFFFFF;

        let actionDelay = base.constants.actionDelay / mob.speed;

        // find empty walkable tiles around self
        function findEmptyTilesAround() {
            let emptyTiles = utils.coordsAround(mob);

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
                moveOnGrid(mob, newPos);
            }
        }

        // move 1 tile towards specified destination
        // naive path-finding algorithm
        function moveTowards(destination) {
            let shortestDistance = utils.vector(mob, destination).norm;
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
                moveOnGrid(mob, newPos);
            }
        }

        // choose and perform an action: move or attack
        function action() {
            if (mob.aggressive) {
                // attack if there is a player nearby
                let around = utils.coordsAround(mob);
                let noAttack = Object.keys(around).every(function (dir) {
                    let xy = around[dir];
                    let other = grid[xy.x][xy.y].char;
                    if (typeof other !== 'undefined' && other.type === base.constants.charTypes.player) {
                        other.emit('hit', mob.name + ' hits you');
                        return false; // break .every loop
                    } else {
                        return true; // continue .every loop
                    }
                });

                if (noAttack) {
                    // move to the first player found within mob's radius
                    let noPlayerInRadius = Object.keys(players).every(function (pid) {
                        let player = players[pid];
                        let distance = utils.vector(mob, player).norm;
                        if (distance <= mob.radius) {
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

        // start action loop when mob is created
        let actionTimer = setTimeout(actionLoop, actionDelay);
        function actionLoop() {
            action();
            actionTimer = setTimeout(actionLoop, actionDelay);
        }

        // interrupt action loop and delete mob object from global lists
        function destroy() {
            clearTimeout(actionTimer);
            removeFromGrid(mob);
        }

        mob.destroy = destroy;

        // add new mob object to global lists
        mob.id = nextMobId;
        nextMobId += 1;
        addToGrid(mob);
    }

    // Keep mobs population at the specified maximum
    function spawnMobs() {
        let mobsCount = Object.keys(mobs).length;
        for (let i = mobsCount; i < base.constants.mobLimit; i += 1) {
            createMob(worldSpawnTable);
        }
    }

    // constructor for bags on the ground
    function createBag(spec) {
        let bag = {
            x: spec.x,
            y: spec.y,
            items: []
        };

        // generate items from random drop table
        spec.items.forEach(function (item) {
            if (Math.random() < item.prob) {
                bag.items.push(item.id);
            }
        });

        let lifetimeTimer;

        function destroy() {
            clearTimeout(lifetimeTimer);
            delete grid[bag.x][bag.y].bag;
            console.log('destroy bag at ', bag.x, ' ', bag.y)
        }

        // add new bag object to global lists
        if (bag.items.length > 0) {
            lifetimeTimer = setTimeout(destroy, base.constants.bagLifetime);
            grid[bag.x][bag.y].bag = bag;
            console.log('create bag at ', bag.x, ' ', bag.y)
        }
    }

    // listen for connection of new clients
    io.on('connection', function onConnection(socket) {
        socket.emit('connected', {id: socket.id});

        // todo: players as objects similar to mobs
        let player = {};
        player.id = socket.id;
        //player.socket = socket; // creates circular structure
        player.emit = function (msg, data) {
            socket.emit(msg, data);
        };
        player.type = base.constants.charTypes.player;
        let x, y, cellEmpty;
        do {
            x = Math.floor(Math.random() * base.constants.world.width);
            y = Math.floor(Math.random() * base.constants.world.height);
            cellEmpty = (typeof grid[x][y].char === 'undefined');
            // can still spawn on top of objects
        } while (!cellEmpty);
        player.x = x;
        player.y = y;
        player.tint = (0.5 + 0.5 * Math.random()) * 0xFFFFFF;
        player.name = 'Player ' + Math.round(1000 *Math.random());
        player.lastAction = Date.now();
        player.speed = 5;
        player.inventory = [];

        addToGrid(player);
        let playersCount = Object.keys(players).length;
        console.log('Player connected: ' + socket.id);
        console.log('Current number of players: ' + playersCount);
        io.emit('msg', player.name + ' joined the game. Players online: ' + playersCount);

        // Remove player from game on disconnect
        socket.on('disconnect', function onDisconnect() {
            removeFromGrid(player);
            playersCount = Object.keys(players).length;
            io.emit('msg',  player.name + ' left the game. Players online: ' + playersCount);
            console.log('Player disconnected: ' + socket.id);
            console.log('Current number of players: ' + playersCount);
        });

        // Inputs listener
        socket.on('input', function onInput(key) {
            let timestamp = Date.now();
            if (player.lastAction + base.constants.actionDelay / player.speed < timestamp) {
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

                    let object = grid[newPos.x][newPos.y].object;
                    let other = grid[newPos.x][newPos.y].char;

                    if (typeof other !== 'undefined') {
                        // attack if there is another char at destination
                        socket.emit('hit', 'You hit ' + other.name);

                        if (other.type === base.constants.charTypes.player) {
                            other.emit('hit', player.name + ' hits you!');
                        } else if (other.type === base.constants.charTypes.mob) {
                            createBag({
                                x: newPos.x,
                                y: newPos.y,
                                items: other.drops
                            });
                            other.destroy();
                            //let item = common.base.ITEMS.LEATHER;
                            //player.inventory.push(item);
                            //client.emit('addItem', item);
                        }
                    } else if (typeof object === 'number') {
                        // interact if there is object at destination
                        if (object === base.objects.tree
                            || object === base.objects.palm
                            || object === base.objects.wood) {
                            let item = base.items.wood;
                            delete grid[newPos.x][newPos.y].object;
                            player.inventory.push(item);
                            //player.socket.emit('addItem', item);
                        }
                    } else {
                        // walk if destination cell is empty
                        moveOnGrid(player, newPos);
                    }
                } else if (key === 'a') { // action
                    if (typeof grid[player.x][player.y].object !== 'number') {
                        let item = base.items.wood;
                        let index = player.inventory.indexOf(item);
                        if (index >= 0) {
                            grid[player.x][player.y].object = base.objects.wood;
                            player.inventory.splice(index, 1);
                            //player.socket.emit('removeItem', item);
                        }
                    }
                }

                player.lastAction = timestamp;
            }
        });

        // Respond to ping request
        socket.on('ping', function onPing() {
            socket.emit('pong');
        });
    });
}

module.exports = gameServer;
