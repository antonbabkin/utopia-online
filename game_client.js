// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

/*jslint browser: true, vars: true*/
/*global gameCoreConstructor, PIXI*/



window.addEventListener('load', function clientLoader() {
    'use strict';


    // ----------------------
    // Initialize game, PIXI.js and UI
    // ----------------------
    var game = gameCoreConstructor(false);

    var stage = new PIXI.Stage(0xc8f040);
    
    var ui = {
        window: document.getElementById('game_window'),
        canvasDiv: document.getElementById('canvas_div'),
        panel: document.getElementById('ui_panel')
    };
    
    ui.window.style.width = (game.WORLD.WIDTH_P + game.UI_PANEL.WIDTH) + 'px';
    ui.window.style.height = game.UI_PANEL.HEIGHT + 'px';
    
    ui.canvasDiv.style.width = game.WORLD.WIDTH_P + 'px';
    ui.canvasDiv.style.height = game.WORLD.HEIGHT_P + 'px';

    var renderer = PIXI.autoDetectRenderer(game.WORLD.WIDTH_P, game.WORLD.HEIGHT_P);
    ui.canvasDiv.appendChild(renderer.view);
    
    ui.panel.style.width = game.UI_PANEL.WIDTH + 'px';
    ui.panel.style.height = game.UI_PANEL.HEIGHT + 'px';
    ui.panel.style.backgroundColor = game.COLORS.UI_PANEL;
    
    var uiPlayers = document.createElement('p');
    ui.panel.appendChild(uiPlayers);
    
    var uiDebug = document.createElement('p');
    ui.panel.appendChild(uiDebug);
    
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
        uiPlayers.innerHTML = 'Players online: ' + data;
    }
    
    socket.on('players online', onPlayersOnline);
    
    
    function onWorldUpdate(state) {
        game.players = state.players;
        game.npcs = state.npcs;
    }
    
    socket.on('world_update', onWorldUpdate);
    
    
    
    // Check ping every 5 seconds
    var pingTime, latency;
    
    function ping() {
        pingTime = timestamp();
        socket.emit('ping');
        setTimeout(ping, 5000);
    }
    
    function onPong() {
        latency = timestamp() - pingTime;
    }
    
    socket.on('pong', onPong);
    
    ping();
        
    
    
    
    // -------------------------
    // Client main animation loop
    // -------------------------
    var lastAnimTime, fps;
    
    
    function animate() {
        var newTime, deltaTime;
        
        
        requestAnimationFrame(animate); 
        
        drawChars();
        
        renderer.render(stage);
        
        
        // Measure FPS
        if (!lastAnimTime) {
            lastAnimTime = timestamp();
            fps = 0;
        } else {
            newTime = timestamp();
            deltaTime = newTime - lastAnimTime;
            lastAnimTime = timestamp();
            fps = 1000 / deltaTime;
        }

    }
    
    
    // Update latency and FPS every second
    function debugUpdate() {
        uiDebug.innerHTML = 'FPS: ' + Math.round(fps) + ', latency: ' + latency;
        setTimeout(debugUpdate, 1000);
    }
    
    debugUpdate();
    

    // ---------------------------
    // PIXI drawing
    // ---------------------------

    
    function drawMap() {
        var i, j;
        var sprite;
        
        var mapGround = new PIXI.DisplayObjectContainer();
        
        mapGround.position.x = 0;
        mapGround.position.y = 0;
        stage.addChild(mapGround);

        
        for (i = 0; i < game.WORLD.WIDTH; i += 1) {

            for (j = 0; j < game.WORLD.HEIGHT; j += 1) {
                // fill ground with grass
                sprite = new PIXI.Sprite(textures.grass);
                sprite.position.x = i * game.TILE.WIDTH;
                sprite.position.y = j * game.TILE.HEIGHT;
                mapGround.addChild(sprite);
                
            }
        }
    }
    
    
    function drawChars() {
        var i, c, s;
        
        for (i in game.players) {
            c = game.players[i];
            s = sprites.players[i];
            // add new sprite to stage if it does not exist yet
            if (s === undefined) {
                s = new PIXI.Sprite(textures.hero);
                s.tint = c.tint;
                stage.addChild(s);
                sprites.players[i] = s;
            }
            s.position.x = c.x;
            s.position.y = c.y;
        }
        
        for (i in game.npcs) {
            c = game.npcs[i];
            s = sprites.npcs[i];
            // add new sprite to stage if it does not exist yet
            if (s === undefined) {
                s = new PIXI.Sprite(textures.npc);
                s.tint = c.tint;
                stage.addChild(s);
                sprites.npcs[i] = s;
            }
            s.position.x = c.x;
            s.position.y = c.y;
        }
        
        // remove chars that left
        for (i in sprites.players) {
            if (game.players[i] === undefined) {
                stage.removeChild(sprites.players[i]);
                delete sprites.players[i];
            }
        }
            
        for (i in sprites.npcs) {
            if (game.npcs[i] === undefined) {
                stage.removeChild(sprites.npcs[i]);
                delete sprites.npcs[i];
            }
        }
        
        
    }
    
    
    
    // ------------------------------------------------------------------------
    // keyboard controls
    // ----------------------------------
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
    // Initialize PIXI stage and start animation loop
    // ------------------------------------
    
    var textures = {
        grass: PIXI.Texture.fromImage('public/grass.png'),
        hero: PIXI.Texture.fromImage('public/hero.png'),
        npc: PIXI.Texture.fromImage('public/tree.png')
    };
    
    drawMap();
    
    // collection of character sprites
    var sprites = {
        players: {},
        npcs: {}
    };
    
    drawChars();
    
    animate();
    

}, false);
    

    
function timestamp() {
    return new Date().getTime();
}