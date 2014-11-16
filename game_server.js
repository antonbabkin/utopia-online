// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

/*jslint node: true, nomen: true, vars: true*/
'use strict';


function gameServer(io) {

    var fs = require('fs');

    var clients = {};

    // module of common objects shared with client
    var common = require('./game_common.js');
    var game = common.game;
    var base = common.base;
    var util = common.util;
    var MOBS = common.mobs;


    var WORLD = {
        MOB_LIMIT: 6 // max number of mobs in the world
    };


    // server main update loop
    function update() {

        // Mobs actions: moves, attacks
        let timestamp = Date.now();
        Object.keys(game.mobs).forEach(function (id) {
            let mob = game.mobs[id];
            if (mob.lastAction + base.ACTION_DELAY / mob.speed < timestamp) {
                let possibleMoves = util.coordsAround(mob);
                let xy;

                // aggressive mobs attack nearby player
                let attacked = false;
                if (mob.aggressive) {
                    ['n', 'e', 's', 'w'].forEach(function (dir) {
                        xy = possibleMoves[dir];
                        let player = game.world.players[xy.x][xy.y];
                        if (player) {
                            clients[player.id].emit('hit', mob.name + ' hits you');
                            mob.lastAction = timestamp;
                            attacked = true;
                        }
                    });
                }

                // this mob does not move
                if (attacked) {
                    return;
                }

                // look at 4 directions to see which of them are not blocked by objects, other mobs or players
                ['n', 'e', 's', 'w'].forEach(function (dir) {
                    xy = possibleMoves[dir];
                    let obj = game.world.objects[xy.x][xy.y];
                    let mob = game.world.mobs[xy.x][xy.y];
                    let player = game.world.players[xy.x][xy.y];
                    if (typeof obj === 'number' || mob || player) {
                        delete possibleMoves[dir];
                    }
                });
                let namesOfMoves = Object.keys(possibleMoves);
                let numOfMoves = namesOfMoves.length;

                // chose one of clear directions
                if (numOfMoves > 0) {
                    // aggressive mob moves towards player
                    if (mob.aggressive) {
                        Object.keys(game.players).every(function (pid) {
                            let player = game.players[pid];
                            let dist = util.vector(mob, player).norm;

                            // player within mob's radius
                            if (dist <= mob.radius) {
                                // find shortest distance from all possible moves
                                let shortestDist = mob.radius + 1;
                                namesOfMoves.forEach(function (dir) {
                                    let xy2 = possibleMoves[dir];
                                    dist = util.vector(xy2, player).norm;

                                    if (dist < shortestDist) {
                                        shortestDist = dist;
                                        xy = xy2;
                                    }
                                });

                                return false; // exit loop through players
                            }

                            return true; // continue loop through players
                        });
                    } else {
                        xy = possibleMoves[namesOfMoves[Math.floor(Math.random() * numOfMoves)]];
                    }
                    delete game.world.mobs[mob.x][mob.y];
                    mob.x = xy.x;
                    mob.y = xy.y;
                    game.world.mobs[mob.x][mob.y] = mob;
                }
                // in any case, make walk delay until next move attempt
                mob.lastAction = timestamp;
            }
        });




        var state = {
            players: game.players,
            mobs: game.mobs,
            world: game.world
        };



        io.emit('world_update', state);

        setTimeout(update, 100);
    }


    // environment update loop
    function updateEnvironment() {

        // new trees grow and wood is broken
        for (let i = 0; i < base.WORLD.WIDTH; i += 1) {
            for (let j = 0; j < base.WORLD.HEIGHT; j += 1) {
                if (Math.random() < 0.02) {
                    if (game.world.objects[i][j] === base.OBJECTS.WOOD) {
                        // wood is broken
                        delete game.world.objects[i][j];
                    } else if (typeof game.world.objects[i][j] !== 'number') {
                        // tree grows
                        if (game.world.ground[i][j] === base.GROUNDS.GRASS) {
                            game.world.objects[i][j] = base.OBJECTS.TREE;
                        } else if (game.world.ground[i][j] === base.GROUNDS.SAND) {
                            game.world.objects[i][j] = base.OBJECTS.PALM;
                        }
                    }
                }
            }
        }


        // new monsters respawn
        spawnMobs();


        // update after regularly at given frequency
        setTimeout(updateEnvironment, 60 * 1000);
    }


    // write server state to the disk every minute
    function saveServer() {

        console.log('Server backup: ', Date());

        // save ground and objects into map.json
        fs.writeFile('map.json', JSON.stringify(game.world), function (err) {
            if (err) {
                console.error('Failed to write generated map to map.json');
                console.log(err);
            }
            console.log('---- map.json saved successfully');
        });

        setTimeout(saveServer, 60 * 1000);
    }


    // return a player with random characteristics
    function createPlayer() {
        var player = {};
        player.x = Math.floor(Math.random() * base.WORLD.WIDTH);
        player.y = Math.floor(Math.random() * base.WORLD.HEIGHT);
        player.tint = (0.5 + 0.5 * Math.random()) * 0xFFFFFF;
        player.lastAction = Date.now();
        player.speed = 5;
        player.inventory = [];
        return player;
    }


    //

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

    let spawnTable = createSpawnTable();


    // function to create random mobs
    function createMob(id) {

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
            console.log(spawnTable);
            console.log('rnd = ' + rnd);
            throw 'Error reading from spawn table'
        }

        let mob = Object.create(MOBS[spawnName]);
        mob.name = spawnName;
        mob.x = Math.floor(Math.random() * base.WORLD.WIDTH);
        mob.y = Math.floor(Math.random() * base.WORLD.HEIGHT);
        mob.tint = (0.5 + 0.5 * Math.random()) * 0xFFFFFF;
        mob.lastAction = Date.now();
        mob.id = id;

        return mob;
    }


    // async read map file into the object
    // start server update loops after map has been loaded
    function readMap() {
        fs.readFile('map.json', 'utf8', function (err, data) {
            if (err) {
                console.log('Error reading map.json');
                console.log(err);
            }

            console.log('map.json read successfully');
            var w = JSON.parse(data);
            game.world.ground = w.ground;
            game.world.objects = w.objects;

            // after map is loaded, start server update loops
            update();
            setTimeout(saveServer, 60 * 1000);
            setTimeout(updateEnvironment, 60 * 1000);
        });
    }






    // spawned mobs counter = id
    let nextMobId = 0;

    function spawnMobs() {
        let mobIds = Object.keys(game.mobs);
        for (let i = mobIds.length; i < WORLD.MOB_LIMIT; i += 1) {
            let mob = createMob(nextMobId);
            game.mobs[nextMobId] = mob;
            game.world.mobs[mob.x][mob.y] = mob;
            nextMobId += 1;
        }
    }




    // add player on connection
    function addPlayer(client) {
        clients[client.id] = client;
        let player = createPlayer();
        player.id = client.id;
        game.players[client.id] = player;
        game.world.players[player.x][player.y] = player;
        var playersCount = Object.keys(game.players).length;
        console.log('Player ' + client.id + ' joined the game. Current number of players: ' + playersCount);

        client.broadcast.emit('new player', client.id);
        io.emit('players online', playersCount);

    }

    // remove player on disconnection
    function removePlayer(client) {
        delete clients[client.id];
        let player = game.players[client.id];
        delete game.players[client.id];
        delete game.world.players[player.x][player.y];
        var playersCount = Object.keys(game.players).length;
        console.log('Player ' + client.id + ' left the game. Current number of players: ' + playersCount);
        client.broadcast.emit('players online', playersCount);
    }


    // listen for connection of new clients
    io.on('connection', function (client) {


        console.log('\t socket.io:: player ' + client.id + ' connected');

        client.emit('connected', {id: client.id});


        addPlayer(client);

        // Remove player from game on disconnect
        client.on('disconnect', function () {
            console.log('\t socket.io:: client disconnected ' + client.id);

            removePlayer(client);
        });


        // Inputs listener
        client.on('input', function onInput(key) {
            let player = game.players[client.id];


            const timestamp = Date.now();
            if (player.lastAction + base.ACTION_DELAY / player.speed < timestamp) {

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

                    util.wrapOverWorld(newPos);

                    let obj = game.world.objects[newPos.x][newPos.y];
                    let mob = game.world.mobs[newPos.x][newPos.y];

                    if (mob) {
                        // attack if there is mob at destination
                        delete game.mobs[mob.id];
                        delete game.world.mobs[newPos.x][newPos.y];
                        let item = common.base.ITEMS.LEATHER;
                        player.inventory.push(item);
                        client.emit('addItem', item);
                        client.emit('hit', 'You hit ' + mob.name);

                    } else if (typeof obj === 'number') {
                        // interact if there is object at destination
                        if (obj === base.OBJECTS.TREE || obj === base.OBJECTS.PALM || obj === base.OBJECTS.WOOD) {
                            let item = common.base.ITEMS.WOOD;
                            delete game.world.objects[newPos.x][newPos.y];
                            player.inventory.push(item);
                            client.emit('addItem', item);
                        }
                    } else {
                        // walk if there is no object at destination
                        delete game.world.players[player.x][player.y];
                        player.x = newPos.x;
                        player.y = newPos.y;
                        game.world.players[player.x][player.y] = player;
                    }
                } else if (key === 'a') { // action
                    if (typeof game.world.objects[player.x][player.y] !== 'number') {
                        let item = common.base.ITEMS.WOOD;
                        let index = player.inventory.indexOf(item);
                        if (index >= 0) {
                            game.world.objects[player.x][player.y] = base.OBJECTS.WOOD;
                            player.inventory.splice(index, 1);
                            client.emit('removeItem', item);
                        }
                    }

                }

                player.lastAction = timestamp;

            }

        });


        // Respond to ping request
        client.on('ping', function () {
            client.emit('pong');
        });


    });


    // -------------------------------------------------------------
    // Start game server
    // -------------------------------------------------------------
    (function startServer() {

        readMap();

        // grids for locations of mobs, players and loot bags
        game.world.mobs = [];
        game.world.players = [];
        game.world.bags = [];
        for (let i = 0; i < base.WORLD.WIDTH; i += 1) {
            game.world.mobs[i] = [];
            game.world.players[i] = [];
            game.world.bags[i] = [];
        }

        spawnMobs();

        console.log('Server start successful');

    }());

}



module.exports = gameServer;
