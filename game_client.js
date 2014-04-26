// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

/*jslint browser: true*/
/*global gameCoreConstructor*/



window.onload = function () {
    'use strict';
    
    // ----------------------
    // Initialize game and UI
    // ----------------------
    
    var game = gameCoreConstructor(false);
        
    var ui = {
        window: document.getElementById('game_window'),
        canvas: document.getElementById('canvas'),
        panel: document.getElementById('ui_panel')
    };
    
 
    ui.window.style.width = (game.world.width + 200) + 'px';
    ui.window.style.height = game.world.height + 'px';
    
    ui.canvas.width = game.world.width;
    ui.canvas.height = game.world.height;
    
    ui.panel.style.width = '200px';
    ui.panel.style.height = game.world.height + 'px';

    ui.ctx = ui.canvas.getContext('2d');
    
    
    
    // -------------------------
    // Listen to server events
    // -------------------------

    var socket = io.connect();

    
    function onConnected(data) {
        console.log('Connection established, client id: ' + data.id);
    }
    
    socket.on('onconnected', onConnected);
        

    function onNewPlayer(data) {
        console.log('New player joined: ' + data);
    }
    
    socket.on('new player', onNewPlayer);
    
    
        
    function onPlayersOnline(data) {
        console.log('Players online: ' + data);
        ui.panel.innerHTML = 'Players online: ' + data;
    }
    
    socket.on('players online', onPlayersOnline);
    
    
    function onWorldUpdate(state) {
        game.players = state.players;
        game.npcs = state.npcs;
    }
    
    socket.on('world_update', onWorldUpdate);
    
    
    
    // -------------------------
    // Client main update loop
    // -------------------------
    function update() {
        
        render();
        
        setTimeout(update, 100);
    }
    

    
    // ---------------------------
    // Drawing on canvas
    // ---------------------------
    var COLORS = {
        MAP: '#c8f040'
    };
    
    var TILE = {
        WIDTH: 20,
        HEIGHT: 20
    };
    
    function render() {
        drawMap();
        drawChars();
    }
    
    function drawMap() {
        ui.ctx.fillStyle = COLORS.MAP;
        ui.ctx.fillRect(0, 0, ui.canvas.width, ui.canvas.height);
    }
    
    
    function drawChar(char) {
        ui.ctx.fillStyle = char.color;
        ui.ctx.fillRect(char.x, char.y, TILE.WIDTH, TILE.HEIGHT);
    }
    
    
    function drawChars() {
        var i;
        for (i in game.players) {
            drawChar(game.players[i]);
        }
        for (i in game.npcs) {
            drawChar(game.npcs[i]);
        }
        
    }
    
    
    
    // ------------------------------------------------------------------------
    // keyboard controls
    var KEYBOARD = {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40
    };
    
    window.addEventListener('keydown', function (e) {
        var dir;
        switch (e.keyCode) {
        case KEYBOARD.UP:
            e.preventDefault();
            dir = 'n';
            break;
        case KEYBOARD.DOWN:
            e.preventDefault();
            dir = 's';
            break;
        case KEYBOARD.LEFT:
            e.preventDefault();
            dir = 'w';
            break;
        case KEYBOARD.RIGHT:
            e.preventDefault();
            dir = 'e';
            break;
        }
        
        socket.emit('input', dir);

    }, false);
    
    
    // ----------------------------------
    // Start client updates
    update();
    

};