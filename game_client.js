// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

/*jslint browser: true, vars: true*/
/*global commonConstructor, io, PIXI*/

/*jslint devel: true*/ // check code without this for production



window.addEventListener('load', function clientLoader() {
    'use strict';


    // ----------------------
    // Initialize game, PIXI.js and UI
    // ----------------------

    var common = commonConstructor();
    var game = common.game;
    game.viewport = {};
    var base = common.base;
    var util = common.util;

    var stage = new PIXI.Stage(0xc8f040);

    var ui = {
        window: document.getElementById('game_window'),
        canvasDiv: document.getElementById('canvas_div'),
        panel: document.getElementById('ui_panel')
    };

    ui.window.style.width = (base.VIEWPORT.WIDTH_P + base.UI_PANEL.WIDTH) + 'px';
    ui.window.style.height = base.UI_PANEL.HEIGHT + 'px';

    ui.canvasDiv.style.width = base.VIEWPORT.WIDTH_P + 'px';
    ui.canvasDiv.style.height = base.VIEWPORT.HEIGHT_P + 'px';

    var renderer = PIXI.autoDetectRenderer(base.VIEWPORT.WIDTH_P, base.VIEWPORT.HEIGHT_P);
    ui.canvasDiv.appendChild(renderer.view);

    ui.panel.style.width = base.UI_PANEL.WIDTH + 'px';
    ui.panel.style.height = base.UI_PANEL.HEIGHT + 'px';
    ui.panel.style.backgroundColor = base.COLORS.UI_PANEL;

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
    // PIXI assets
    // -------------------------
    var textures = {
        ground: {},
        objects: {},
        hero: PIXI.Texture.fromImage('public/hero.png'),
        npc: PIXI.Texture.fromImage('public/sphere.png')
    };

    textures.ground[base.GROUNDS.GRASS] = PIXI.Texture.fromImage('public/grass.png');
    textures.ground[base.GROUNDS.SAND] = PIXI.Texture.fromImage('public/sand.png');
    textures.objects[base.OBJECTS.TREE] = PIXI.Texture.fromImage('public/tree.png');
    textures.objects[base.OBJECTS.PALM] = PIXI.Texture.fromImage('public/palm.png');
    textures.objects[base.OBJECTS.ROCK] = PIXI.Texture.fromImage('public/rock.png');
    textures.objects[base.OBJECTS.WOOD] = PIXI.Texture.fromImage('public/wood.png');


    // collection of character sprites
    var sprites = {};



    // -------------------------
    // Listen to server events
    // -------------------------

    var socket = io();

    socket.on('onconnected', function onConnected(data) {
        console.log('Connection established, client id: ' + data.id);
        game.selfId = data.id;
    });

    socket.on('new player', function onNewPlayer(data) {
        console.log('New player joined: ' + data);
    });

    socket.on('players online', function onPlayersOnline(data) {
        uiPlayers.innerHTML = 'Players online: ' + data;
    });

    socket.on('world_update', function onWorldUpdate(state) {
        game.players = state.players || game.players;
        game.npcs = state.npcs || game.npcs;
        game.world = state.world || game.world;
    });



    // Check ping every 5 seconds
    var pingTime, latency;

    function ping() {
        pingTime = Date.now();
        socket.emit('ping');
        setTimeout(ping, 5000);
    }

    socket.on('pong', function onPong() {
        latency = Date.now() - pingTime;
    });

    ping();



    // transform world coords into viewport coords
    function worldToViewport(obj) {
        var x = obj.x;
        var y = obj.y;
        if (x < game.viewport.corner.x) {
            x += base.WORLD.WIDTH;
        }
        if (y < game.viewport.corner.y) {
            y += base.WORLD.HEIGHT;
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
            x: game.players[game.selfId].x - Math.floor(base.VIEWPORT.WIDTH / 2),
            y: game.players[game.selfId].y - Math.floor(base.VIEWPORT.HEIGHT / 2)
        };
        util.wrapOverWorld(game.viewport.corner);

        // world coords of the current viewport tile
        var cur = {};

        // ground and objects
        sprites.ground = sprites.ground || [];
        sprites.objects = sprites.objects || [];
        for (i = 0; i < base.VIEWPORT.WIDTH; i += 1) {
            sprites.ground[i] = sprites.ground[i] || [];
            sprites.objects[i] = sprites.objects[i] || [];

            cur.x = game.viewport.corner.x + i;

            for (j = 0; j < base.VIEWPORT.HEIGHT; j += 1) {

                cur.y = game.viewport.corner.y + j;
                util.wrapOverWorld(cur);


                c = game.world.ground[cur.x][cur.y];
                s = sprites.ground[i][j];

                if (typeof s !== 'object') {
                    s = new PIXI.Sprite(textures.ground[c]);
                    s.position.x = i * base.TILE.WIDTH;
                    s.position.y = j * base.TILE.HEIGHT;
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
                        s.position.x = i * base.TILE.WIDTH;
                        s.position.y = j * base.TILE.HEIGHT;
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
            if (game.players.hasOwnProperty(i)) {
                c = game.players[i];
                s = sprites.players[i];

                if (typeof s !== 'object') {
                    s = new PIXI.Sprite(textures.hero);
                    s.tint = c.tint;
                    stage.addChild(s);
                    sprites.players[i] = s;
                }

                cur = worldToViewport(c);
                s.position.x = cur.x * base.TILE.WIDTH;
                s.position.y = cur.y * base.TILE.HEIGHT;
            }
        }

        // remove old
        for (i in sprites.players) {
            if (sprites.players.hasOwnProperty(i)) {
                if (typeof game.players[i] !== 'object' && typeof sprites.players[i] === 'object') {
                    stage.removeChild(sprites.players[i]);
                    delete sprites.players[i];
                }
            }
        }

        // NPCs
        sprites.npcs = sprites.npcs || {};

        // add new / update
        for (i in game.npcs) {
            if (game.npcs.hasOwnProperty(i)) {
                c = game.npcs[i];
                s = sprites.npcs[i];


                if (typeof s !== 'object') {
                    s = new PIXI.Sprite(textures.npc);
                    s.tint = c.tint;
                    stage.addChild(s);
                    sprites.npcs[i] = s;
                }

                cur = worldToViewport(c);
                s.position.x = cur.x * base.TILE.WIDTH;
                s.position.y = cur.y * base.TILE.HEIGHT;
            }
        }

        // remove old
        for (i in sprites.npcs) {
            if (sprites.npcs.hasOwnProperty(i)) {
                if (typeof game.npcs[i] !== 'object' && typeof sprites.npcs[i] === 'object') {
                    stage.removeChild(sprites.npcs[i]);
                    delete sprites.npcs[i];
                }
            }
        }
    }





    // -------------------------
    // Client main animation loop
    // -------------------------
    var lastAnimTime, fps;

    function animate() {
        var newTime, deltaTime;


        window.requestAnimationFrame(animate);

        updateViewport();

        renderer.render(stage);


        // Measure FPS
        if (!lastAnimTime) {
            lastAnimTime = Date.now();
            fps = 0;
        } else {
            newTime = Date.now();
            deltaTime = newTime - lastAnimTime;
            lastAnimTime = newTime;
            fps = 1000 / deltaTime;
        }


        // player position on UI panel
        if (game.selfId && game.players[game.selfId]) {
            uiPos.innerHTML = 'Player coordinates: ' + game.players[game.selfId].x + ',' + game.players[game.selfId].y;
        }

    }

    // start main animation loop
    window.requestAnimationFrame(animate);



    // Update latency and FPS every second
    function debugUpdate() {
        uiDebug.innerHTML = 'FPS: ' + Math.round(fps) + ', latency: ' + latency;
        setTimeout(debugUpdate, 1000);
    }

    debugUpdate();








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





}, false);



