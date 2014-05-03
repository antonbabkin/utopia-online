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
    
    
    
    server.createGame = function () {

        game = require('./game_core.js');
        
        game.npcs[0] = game.createNpc();
        game.npcsCount = 1;
        
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
            switch (dir) {
                case 'e':
                    p.x += 5;
                    break;
                case 'w':
                    p.x -= 5;
                    break;
                case 'n':
                    p.y -= 5;
                    break;
                case 's':
                    p.y += 5;
                    break;
            }
            
            p = game.wrapOverEdge(p);
            
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
        for (jn in game.npcs) {
            n = game.npcs[jn];
            n.x += Math.random() * 10 - 5;
            n.y += Math.random() * 10 - 5;
            n = game.wrapOverEdge(n);
        }
        
        
        
        
        var state = {
            players: game.players,
            npcs: game.npcs
        };
        
        
        
        sockets.emit('world_update', state);
        
        setTimeout(prv.update, 100);
    };

    
    return server;

};



module.exports = gameServerConstructor;
