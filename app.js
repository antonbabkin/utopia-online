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
var app = require('express')();
var gameport = 5000;

var server = app.listen(gameport, function () {
    console.log('Listening on port ' + server.address().port);
});


app.get('/', function (req, res) {
    console.log('trying to load ' + __dirname + '/index.html');
    res.sendFile(__dirname + '/index.html');
});

app.get('/game_common.js', function (req, res, next) {
    res.sendFile(__dirname + '/game_common.js');
});

app.get('/game_client.js', function (req, res, next) {
    res.sendFile(__dirname + '/game_client.js');
});

app.get('/pixi.js', function (req, res, next) {
    res.sendFile(__dirname + '/pixi.js');
});

app.get('/pixi.dev.js', function (req, res, next) {
    res.sendFile(__dirname + '/pixi.dev.js');
});

// Beware: Everything requested from /public/ folder will be served. Don't put sensitive data there.
app.get(/(^\/public\/.+)/, function (req, res, next) {
    var file = req.params[0];
    console.log('request file ' + file);
    res.sendFile(__dirname + file);
});



// ----
// Socket.io setup
// ----
var io = require('socket.io')(server);

// Don't really know how this works...
/*
io.configure(function () {
    io.set('log level', 0);

    io.set('authorization', function (handshakeData, callback) {
        callback(null, true);
    });
});
*/

// Enter the game server code. The game server handles
// client connections looking for a game, creating games,
// leaving games, joining games and ending games when they leave.
var gameServer = require('./game_server.js')(io);

gameServer.createGame();

