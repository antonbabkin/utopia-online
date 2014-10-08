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

    // server main update loop
    function update() {

        // Do some random movement of NPCs
        var n;
        var possibleMoves, namesOfMoves, numOfMoves;
        var coords;
        var timestamp = Date.now();
        game.npcs.forEach(function (n) {
            if (n.lastWalk + base.WALK_DELAY / n.speed < timestamp) {
                // look at 4 directions to see which of them are not blocked by objects
                possibleMoves = util.coordsAround(n);
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
                    n.x = coords.x;
                    n.y = coords.y;
                }
                // in any case, make walk delay until next move attempt
                n.lastWalk = timestamp;
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
        var i, j;

        // new trees grow and wood is broken with probability 10%
        for (i = 0; i < base.WORLD.WIDTH; i += 1) {
            for (j = 0; j < base.WORLD.HEIGHT; j += 1) {
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


        // new monsters respawn, so the total number is always 5


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
        player.lastWalk = Date.now();
        player.speed = 3;
        return player;
    }

    // function to create random NPC
    var createNpc = createPlayer;


    // async read map file into the object
    // start server update loops after map has been loaded
    function readMap() {
        fs.readFile('map.json', 'utf8', function (err, data) {
            if (err) {
                console.log('Error reading map.json');
                console.log(err);
            }

            console.log('map.json read successfully');
            game.world = JSON.parse(data);

            // after map is loaded, start server update loops
            update();
            setTimeout(saveServer, 60 * 1000);
            setTimeout(updateEnvironment, 60 * 1000);
        });
    }





    // create an instance of the game and read  map
    server.createGame = function () {

        game.npcs[0] = createNpc();
        game.npcs[1] = createNpc();
        game.npcs[2] = createNpc();

        console.log('game created');

        readMap();
    };






    // add player on connection
    function addPlayer(client) {
        clients[client.id] = client;
        game.players[client.id] = createPlayer();
        var playersCount = Object.keys(game.players).length;
        console.log('Player ' + client.id + ' joined the game. Current number of players: ' + playersCount);

        client.broadcast.emit('new player', client.id);
        io.emit('players online', playersCount);

    }

    // remove player on disconnection
    function removePlayer(client) {
        delete clients[client.id];
        delete game.players[client.id];
        var playersCount = Object.keys(game.players).length;
        console.log('Player ' + client.id + ' left the game. Current number of players: ' + playersCount);
        client.broadcast.emit('players online', playersCount);
    }


    // listen for connection of new clients
    io.on('connection', function (client) {


        console.log('\t socket.io:: player ' + client.id + ' connected');

        client.emit('onconnected', {id: client.id});


        addPlayer(client);

        // Remove player from game on disconnect
        client.on('disconnect', function () {
            console.log('\t socket.io:: client disconnected ' + client.id);

            removePlayer(client);
        });


        // Inputs listener
        client.on('input', function (key) {
            var p = game.players[client.id];
            var newPos = {
                x: p.x,
                y: p.y
            };

            var timestamp = Date.now();
            if (p.lastWalk + base.WALK_DELAY / p.speed < timestamp) {

                if (key !== 'a') { // non-action

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

                    var obj = game.world.objects[newPos.x][newPos.y];

                    if (typeof obj !== 'number') {
                        p.lastWalk = timestamp;
                        p.x = newPos.x;
                        p.y = newPos.y;
                    } else {
                        if (obj === base.OBJECTS.TREE || obj === base.OBJECTS.PALM || obj === base.OBJECTS.WOOD) {
                            delete game.world.objects[newPos.x][newPos.y];
                        }
                    }
                } else { // action
                    if (typeof game.world.objects[p.x][p.y] !== 'number') {
                        game.world.objects[p.x][p.y] = base.OBJECTS.WOOD;
                    }

                }

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
