// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)
// Usage: node app.js

/*jslint node: true, nomen: true */
'use strict';

var verbose = true;

// ----
// Set up Express server
// ----
var express = require('express');
var http = require('http');
var gameport = 4000;
var app = express();
var server = http.createServer(app);

server.listen(gameport);
console.log('\t :: Express :: Listening on port ' + gameport);

app.get('/', function (req, res) {
    console.log('trying to load ' + __dirname + '/index.html');
    res.sendfile(__dirname + '/index.html');
});

app.get('/game_core.js', function (req, res, next) {
    res.sendfile(__dirname + '/game_core.js');
});

app.get('/game_client.js', function (req, res, next) {
    res.sendfile(__dirname + '/game_client.js');
});



// ----
// Socket.io setup
// ----
var io = require('socket.io').listen(server);

io.configure(function () {
    io.set('log level', 0);

    io.set('authorization', function (handshakeData, callback) {
        callback(null, true);
    });
});

// Enter the game server code. The game server handles
// client connections looking for a game, creating games,
// leaving games, joining games and ending games when they leave.
var gameServer = require('./game_server.js');
gameServer = gameServer(io.sockets);

gameServer.createGame();

