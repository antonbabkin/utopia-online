// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)
// Usage: node app.js

/*jslint node: true, nomen: true */
'use strict';


// ----
// Set up Express server
// ----
var express = require('express');
var app = express();

app.set('port', process.env.PORT || 5000);

var server = app.listen(app.get('port'), function() {
    console.log("Node app is running at localhost:" + server.address().port)
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/game_common.js', function (req, res) {
    res.sendFile(__dirname + '/game_common.js');
});

app.get('/game_client.js', function (req, res) {
    res.sendFile(__dirname + '/game_client.js');
});

app.get('/pixi.js', function (req, res) {
    res.sendFile(__dirname + '/pixi.js');
});

app.get('/pixi.dev.js', function (req, res) {
    res.sendFile(__dirname + '/pixi.dev.js');
});

// Beware: Everything requested from /public/ folder will be served. Don't put sensitive data there.
app.use('/public', express.static(__dirname + '/public'));



// ----
// Run server on socket.io
// ----
var io = require('socket.io')(server);

require('./game_server.js')(io);

