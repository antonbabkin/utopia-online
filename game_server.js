// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

/*jslint node: true, nomen: true, vars: true*/
'use strict';

var verbose = true;



// returns a new server object
function gameServerConstructor(io) {
    // create an object to be returned
    // properties of this object will be a public interface that has access to private properties
    var server = {};

    var fs = require('fs');

    var clients = {};

    // module of common objects shared with client
    var common = require('./game_common.js');
    var game = common.game;
    var base = common.base;
    var util = common.util;


    var WORLD = {
        NPC_LIMIT: 5 // max number of npcs in the world
    };


    // server main update loop
    function update() {

        // Do some random movement of NPCs
        var n;
        var possibleMoves, namesOfMoves, numOfMoves;
        var coords;
        var timestamp = Date.now();
        game.npcs.forEach(function (npc) {
            if (npc.lastAction + base.ACTION_DELAY / npc.speed < timestamp) {
                // look at 4 directions to see which of them are not blocked by objects
                possibleMoves = util.coordsAround(npc);
                ['n', 'e', 's', 'w'].forEach(function (dir) {
                    coords = possibleMoves[dir];
                    if (typeof game.world.objects[coords.x][coords.y] === 'number') {
                        delete possibleMoves[dir];
                    }
                });
                namesOfMoves = Object.keys(possibleMoves);
                numOfMoves = namesOfMoves.length;

                // if at least one direction is clear, choose randomly
                if (numOfMoves > 0) {
                    coords = possibleMoves[namesOfMoves[Math.floor(Math.random() * numOfMoves)]];
                    delete game.world.npcs[npc.x][npc.y];
                    npc.x = coords.x;
                    npc.y = coords.y;
                    game.world.npcs[npc.x][npc.y] = npc;
                }
                // in any case, make walk delay until next move attempt
                npc.lastAction = timestamp;
            }
        });




        var state = {
            players: game.players,
            npcs: game.npcs,
            world: game.world
        };



        io.emit('world_update', state);

        setTimeout(update, 100);
    }


    // environment update loop
    function updateEnvironment() {

        // new trees grow and wood is broken with probability 10%
        for (let i = 0; i < base.WORLD.WIDTH; i += 1) {
            for (let j = 0; j < base.WORLD.HEIGHT; j += 1) {
                if (Math.random() < 0.1) {
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
        spawnNpcs();


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

    // function to create random NPC
    function createNpc() {
        var npc = {};
        npc.x = Math.floor(Math.random() * base.WORLD.WIDTH);
        npc.y = Math.floor(Math.random() * base.WORLD.HEIGHT);
        npc.tint = (0.5 + 0.5 * Math.random()) * 0xFFFFFF;
        npc.lastAction = Date.now();
        npc.speed = 1;
        return npc;
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





    // create an instance of the game and read  map
    server.createGame = function () {

        readMap();

        // grids for locations of npcs, players and loot bags
        game.world.npcs = [];
        game.world.players = [];
        game.world.bags = [];
        for (let i = 0; i < base.WORLD.WIDTH; i += 1) {
            game.world.npcs[i] = [];
            game.world.players[i] = [];
            game.world.bags[i] = [];
        }

        spawnNpcs();

        console.log('game created');

    };


    function spawnNpcs() {
        for (let i = game.npcs.length; i < WORLD.NPC_LIMIT; i += 1) {
            let npc = createNpc();
            game.npcs.push(npc);
            game.world.npcs[npc.x][npc.y] = npc;
        }
    }




    // add player on connection
    function addPlayer(client) {
        clients[client.id] = client;
        let player = createPlayer();
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

                    const obj = game.world.objects[newPos.x][newPos.y];
                    const npc = game.world.npcs[newPos.x][newPos.y];

                    if (npc) {
                        // attack if there is npc at destination
                        const npcIndex = game.npcs.indexOf(npc);
                        game.npcs.splice(npcIndex, 1);
                        delete game.world.npcs[newPos.x][newPos.y];
                        const item = common.base.ITEMS.LEATHER;
                        player.inventory.push(item);
                        client.emit('addItem', item);
                        client.emit('hit', 'You hit the monster')

                    } else if (typeof obj === 'number') {
                        // interact if there is object at destination
                        if (obj === base.OBJECTS.TREE || obj === base.OBJECTS.PALM || obj === base.OBJECTS.WOOD) {
                            const item = common.base.ITEMS.WOOD;
                            delete game.world.objects[newPos.x][newPos.y];
                            player.inventory.push(item);
                            client.emit('addItem', item);
                        }
                    } else {
                        // walk if there is no object at destination
                        player.x = newPos.x;
                        player.y = newPos.y;
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

    return server;

}



module.exports = gameServerConstructor;
