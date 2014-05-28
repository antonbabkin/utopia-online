// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

/*jslint node: true, nomen: true, vars: true*/
'use strict';

var verbose = true;



// returns a new server object
var gameServerConstructor = function (sockets) {
    // create an object to be returned
    // properties of this object will be a public interface that has access to private properties
    var server = {};
    
    // namespace for private properties
    var prv = {};
    prv.clients = {};
    
    var game;
    
    
    prv.createMap = function () {
        var i, j, r;
        game.world.ground = [];
        game.world.objects = [];

        for (i = 0; i < game.WORLD.WIDTH; i += 1) {
            game.world.ground[i] = [];
            game.world.objects[i] = [];
            for (j = 0; j < game.WORLD.HEIGHT; j += 1) {
                if (Math.random() < 0.3) {
                    game.world.ground[i][j] = game.GROUNDS.SAND;
                    if (Math.random() < 0.1) {
                        game.world.objects[i][j] = game.OBJECTS.PALM;
                    }
                } else {
                    game.world.ground[i][j] = game.GROUNDS.GRASS;
                    r = Math.random();
                    if (r < 0.1) {
                        game.world.objects[i][j] = game.OBJECTS.ROCK;
                    } else if (r < 0.3) {
                        game.world.objects[i][j] = game.OBJECTS.TREE;
                    }
                }
            }
        }
    };
    
    
    
    server.createGame = function () {

        game = require('./game_core.js');
        
        game.npcs[0] = game.createNpc();
        game.npcsCount = 1;
        
        prv.createMap();
        
        prv.update();
        
        console.log('game created');
    };
    
    
    prv.addPlayer = function (client) {
        prv.clients[client.id] = client;
        game.players[client.id] = game.createPlayer();
        game.playersCount += 1;
        console.log('Player ' + client.id + ' joined the game. Current number of players: ' + game.playersCount);
        
        client.broadcast.emit('new player', client.id);
        sockets.emit('players online', game.playersCount);

    };
    
    
    prv.removePlayer = function (client) {
        delete prv.clients[client.id];
        delete game.players[client.id];
        game.playersCount -= 1;
        console.log('Player ' + client.id + ' left the game. Current number of players: ' + game.playersCount);
        client.broadcast.emit('players online', game.playersCount);
    };
    
    
    // listen for connection of new clients
    sockets.on('connection', function (client) {
        
        
        console.log('\t socket.io:: player ' + client.id + ' connected');
    
        client.emit('onconnected', {id: client.id});
    
    
        prv.addPlayer(client);
        
        // Remove player from game on disconnect
        client.on('disconnect', function () {
            console.log('\t socket.io:: client disconnected ' + client.id);
            
            prv.removePlayer(client);
        });
        
        
        // Inputs listener
        client.on('input', function (dir) {
            var p = game.players[client.id];
            var newPos = {
                x: p.x,
                y: p.y
            };
            
            var timestamp = Date.now();
            if (p.lastWalk + game.WALK_DELAY / p.speed < timestamp) {

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

                game.wrapOverWorld(newPos);
                
                if (typeof game.world.objects[newPos.x][newPos.y] !== 'number') {
                    p.lastWalk = timestamp;
                    p.x = newPos.x;
                    p.y = newPos.y;
                }
            }
            
        });

        
        // Listen for client's messages and handle them by gameServer
        client.on('message', function (m) {
            prv.onMessage(client, m);
        });
        
        
        // Respond to ping request
        client.on('ping', function () {
            client.emit('pong');
        });

     
    });
    


    prv.onMessage = function (client, message) {
        console.log('message from ' + client.id);
    };
    
    
    // server main update loop
    prv.update = function () {
        
        // Do some random movement of NPCs
        var jn, n;
        var newPos;
        var r;
        var timestamp = Date.now();
        for (jn in game.npcs) {
            n = game.npcs[jn];

            if (n.lastWalk + game.WALK_DELAY / n.speed < timestamp) {
                do {
                    newPos = {
                        x: n.x,
                        y: n.y
                    }
                    r = 1 - 2 * Math.round(Math.random());
                    if (Math.random() < 0.5) {
                        newPos.x += r;
                    } else {
                        newPos.y += r;
                    }
                    game.wrapOverWorld(newPos);
                } while (typeof game.world.objects[newPos.x][newPos.y] === 'number');
                
                n.lastWalk = timestamp;
                n.x = newPos.x;
                n.y = newPos.y;
            }
        }
        
        
        
        
        var state = {
            players: game.players,
            npcs: game.npcs,
            world: game.world
        };
        
        
        
        sockets.emit('world_update', state);
        
        setTimeout(prv.update, 100);
    };

    
    return server;

};



module.exports = gameServerConstructor;
