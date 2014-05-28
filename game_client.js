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
    
    ui.window.style.width = (game.VIEWPORT.WIDTH_P + game.UI_PANEL.WIDTH) + 'px';
    ui.window.style.height = game.UI_PANEL.HEIGHT + 'px';
    
    ui.canvasDiv.style.width = game.VIEWPORT.WIDTH_P + 'px';
    ui.canvasDiv.style.height = game.VIEWPORT.HEIGHT_P + 'px';

    var renderer = PIXI.autoDetectRenderer(game.VIEWPORT.WIDTH_P, game.VIEWPORT.HEIGHT_P);
    ui.canvasDiv.appendChild(renderer.view);
    
    ui.panel.style.width = game.UI_PANEL.WIDTH + 'px';
    ui.panel.style.height = game.UI_PANEL.HEIGHT + 'px';
    ui.panel.style.backgroundColor = game.COLORS.UI_PANEL;
    
    var uiInfo = document.createElement('p');
    ui.panel.appendChild(uiInfo);
    uiInfo.innerHTML = 'WASD to move. SPACEBAR to place wood. Walk into tree or wood to remove it.';
    
    var uiPlayers = document.createElement('p');
    ui.panel.appendChild(uiPlayers);
    
    var uiDebug = document.createElement('p');
    ui.panel.appendChild(uiDebug);
    
    var uiPos = document.createElement('p');
    ui.panel.appendChild(uiPos);
    
    // -------------------------
    // Listen to server events
    // -------------------------

    var socket = io.connect();

    
    function onConnected(data) {
        console.log('Connection established, client id: ' + data.id);
        game.selfId = data.id;
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
        game.players = state.players || game.players;
        game.npcs = state.npcs || game.npcs;
        game.world = state.world || game.world;
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
        
        updateViewport();
        
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
        
        
        // player position on UI panel
        if (game.selfId && game.players[game.selfId]) {
            uiPos.innerHTML = 'Player coordinates: ' + game.players[game.selfId].x + ',' + game.players[game.selfId].y;
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
    
    // transform world coords into 
    function worldToViewport(obj) {
        var x = obj.x;
        var y = obj.y;
        if (x < game.viewport.corner.x) {
            x += game.WORLD.WIDTH;
        }
        if (y < game.viewport.corner.y) {
            y += game.WORLD.HEIGHT;
        }
        x -= game.viewport.corner.x;
        y -= game.viewport.corner.y;
        return {x: x, y: y};
    }
    
    
    
    // create PIXI sprites or update their properties
    function updateViewport() {
        
        // only update if connection established and at least one world state received from server
        if (!game.selfId || !game.world.ground) {
            return;
        }
        
        var i, j, c, s;

        
        // world coords of the top-left corner of the viewport
        game.viewport.corner = {
            x: game.players[game.selfId].x - Math.floor(game.VIEWPORT.WIDTH / 2),
            y: game.players[game.selfId].y - Math.floor(game.VIEWPORT.HEIGHT / 2)
        };
        game.wrapOverWorld(game.viewport.corner);
        
        // world coords of the current viewport tile
        var cur = {};

        
        // ground and objects
        sprites.ground = sprites.ground || [];
        sprites.objects = sprites.objects || [];
        for (i = 0; i < game.VIEWPORT.WIDTH; i += 1) {
            sprites.ground[i] = sprites.ground[i] || [];
            sprites.objects[i] = sprites.objects[i] || [];
            
            cur.x = game.viewport.corner.x + i;
            
            for (j = 0; j < game.VIEWPORT.HEIGHT; j += 1) {
                
                cur.y = game.viewport.corner.y + j;
                game.wrapOverWorld(cur);
                
                
                c = game.world.ground[cur.x][cur.y];
                s = sprites.ground[i][j];               
                
                if (typeof s !== 'object') {
                    s = new PIXI.Sprite(textures.ground[c]);
                    s.position.x = i * game.TILE.WIDTH;
                    s.position.y = j * game.TILE.HEIGHT;
                    stage.addChild(s);               
                    sprites.ground[i][j] = s;
                } else {
                    s.texture = textures.ground[c];
                }
                
                
                c = game.world.objects[cur.x][cur.y];
                s = sprites.objects[i][j];
                
                if (typeof c !== 'number') {
                    if (typeof s === 'object') {
                        stage.removeChild(sprites.objects[i][j]);
                        delete sprites.objects[i][j];
                    }
                } else {
                    if (typeof s !== 'object') {
                        s = new PIXI.Sprite(textures.objects[c]);
                        s.position.x = i * game.TILE.WIDTH;
                        s.position.y = j * game.TILE.HEIGHT;
                        stage.addChild(s);               
                        sprites.objects[i][j] = s;
                    } else {
                        s.texture = textures.objects[c];
                    }
                }
                

            }
        }
        
        
        // players
        sprites.players = sprites.players || {};
        
        // add new / update
        for (i in game.players) {
            c = game.players[i];
            s = sprites.players[i];
            
            if (typeof s !== 'object') {
                s = new PIXI.Sprite(textures.hero);
                s.tint = c.tint;
                stage.addChild(s);               
                sprites.players[i] = s;
            }
            
            cur = worldToViewport(c);
            s.position.x = cur.x * game.TILE.WIDTH;
            s.position.y = cur.y * game.TILE.HEIGHT;           
        }
        
        // remove old
        for (i in sprites.players) {
            if (typeof game.players[i] !== 'object' && typeof sprites.players[i] === 'object') {
                stage.removeChild(sprites.players[i]);
                delete sprites.players[i];
            }
        }
        
        // NPCs
        sprites.npcs = sprites.npcs || {};
            
        // add new / update
        for (i in game.npcs) {
            c = game.npcs[i];
            s = sprites.npcs[i];
            

            if (typeof s !== 'object') {
                s = new PIXI.Sprite(textures.npc);
                s.tint = c.tint;
                stage.addChild(s);               
                sprites.npcs[i] = s;
            }

            cur = worldToViewport(c);
            s.position.x = cur.x * game.TILE.WIDTH;
            s.position.y = cur.y * game.TILE.HEIGHT;
            
        }
        
        // remove old
        for (i in sprites.npcs) {           
            if (typeof game.npcs[i] !== 'object' && typeof sprites.npcs[i] === 'object') {
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
        DOWN: 40,
        SPACEBAR: 32,
        A: 65,
        W: 87,
        D: 68,
        S: 83
    };
    
    window.addEventListener('keydown', function (e) {
        var key;
        switch (e.keyCode) {
        case KEYBOARD.W:
            e.preventDefault();
            key = 'n';
            break;
        case KEYBOARD.S:
            e.preventDefault();
            key = 's';
            break;
        case KEYBOARD.A:
            e.preventDefault();
            key = 'w';
            break;
        case KEYBOARD.D:
            e.preventDefault();
            key = 'e';
            break;
        case KEYBOARD.SPACEBAR:
            key = 'a';
            break;
        }
        
        socket.emit('input', key);

    }, false);
    
    
    // ----------------------------------
    // Initialize PIXI stage and start animation loop
    // ------------------------------------
    
    var textures = {
        ground: {},
        objects: {},
        hero: PIXI.Texture.fromImage('public/hero.png'),
        npc: PIXI.Texture.fromImage('public/sphere.png')
    };
    
    textures.ground[game.GROUNDS.GRASS] = PIXI.Texture.fromImage('public/grass.png');
    textures.ground[game.GROUNDS.SAND] = PIXI.Texture.fromImage('public/sand.png');
    textures.objects[game.OBJECTS.TREE] = PIXI.Texture.fromImage('public/tree.png');
    textures.objects[game.OBJECTS.PALM] = PIXI.Texture.fromImage('public/palm.png');
    textures.objects[game.OBJECTS.ROCK] = PIXI.Texture.fromImage('public/rock.png');
    textures.objects[game.OBJECTS.WOOD] = PIXI.Texture.fromImage('public/wood.png');
    
    
    // collection of character sprites
    var sprites = {};
    
    animate();
    

}, false);
    

    
function timestamp() {
    return new Date().getTime();
}