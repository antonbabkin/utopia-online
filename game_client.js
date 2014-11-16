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
    var MOBS = common.mobs;

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

    // Player inventory
    ui.inventory = {
        div: document.createElement('div'),
        p: document.createElement('p'),
        update: function () {
            var inv = 'Inventory:<br>';
            game.players[game.selfId].inventory.forEach(function (item) {
                inv += '<img src="public/' +
                    common.base.ITEMS_IMAGES[item] +
                    '.png">'
            });
            ui.inventory.p.innerHTML = inv;
        }
    };
    ui.inventory.p.innerHTML = 'Inventory:<br>';
    ui.inventory.div.appendChild(ui.inventory.p);
    ui.panel.appendChild(ui.inventory.div);

    // -------------------------
    // Audio
    // -------------------------
    var snd = {
        hit: new Audio('public/hit.mp3')
    };

    // -------------------------
    // PIXI assets
    // -------------------------
    var textures = {
        ground: {},
        objects: {},
        hero: PIXI.Texture.fromImage('public/hero.png'),
        mobs: {}
    };

    textures.ground[base.GROUNDS.GRASS] = PIXI.Texture.fromImage('public/grass.png');
    textures.ground[base.GROUNDS.SAND] = PIXI.Texture.fromImage('public/sand.png');
    textures.objects[base.OBJECTS.TREE] = PIXI.Texture.fromImage('public/tree.png');
    textures.objects[base.OBJECTS.PALM] = PIXI.Texture.fromImage('public/palm.png');
    textures.objects[base.OBJECTS.ROCK] = PIXI.Texture.fromImage('public/rock.png');
    textures.objects[base.OBJECTS.WOOD] = PIXI.Texture.fromImage('public/wood.png');
    Object.keys(MOBS).forEach(function (name) {
        textures.mobs[name] = PIXI.Texture.fromImage('public/' + MOBS[name].image +'.png');
    });

    // collection of character sprites
    var sprites = {};



    // -------------------------
    // Listen to server events
    // -------------------------

    var socket = io();

    socket.on('connected', function onConnected(data) {
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
        game.mobs = state.mobs || game.mobs;
        game.world = state.world || game.world;
    });

    socket.on('addItem', function onAddItem(item) {
        var inv = game.players[game.selfId].inventory;
        inv.push(item);
        ui.inventory.update();
    });

    socket.on('removeItem', function onRemoveItem(item) {
        var inv = game.players[game.selfId].inventory;
        var index = inv.indexOf(item);
        inv.splice(index, 1);
        ui.inventory.update();
    });

    socket.on('hit', function onHit(msg) {
        snd.hit.play();
        console.log(msg);
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

        var i, j, tile, sprite;


        // world coords of the top-left corner of the viewport
        game.viewport.corner = {
            x: game.players[game.selfId].x - Math.floor(base.VIEWPORT.WIDTH / 2),
            y: game.players[game.selfId].y - Math.floor(base.VIEWPORT.HEIGHT / 2)
        };
        util.wrapOverWorld(game.viewport.corner);

        // world coords of the current viewport tile
        var xy = {};

        // ground and objects
        sprites.ground = sprites.ground || [];
        sprites.objects = sprites.objects || [];
        for (i = 0; i < base.VIEWPORT.WIDTH; i += 1) {
            sprites.ground[i] = sprites.ground[i] || [];
            sprites.objects[i] = sprites.objects[i] || [];
            xy.x = game.viewport.corner.x + i;

            for (j = 0; j < base.VIEWPORT.HEIGHT; j += 1) {
                xy.y = game.viewport.corner.y + j;
                util.wrapOverWorld(xy);

                // create or update ground sprites
                tile = game.world.ground[xy.x][xy.y];
                sprite = sprites.ground[i][j];

                if (typeof sprite !== 'object') {
                    sprite = new PIXI.Sprite(textures.ground[tile]);
                    sprite.position.x = i * base.TILE.WIDTH;
                    sprite.position.y = j * base.TILE.HEIGHT;
                    stage.addChild(sprite);
                    sprites.ground[i][j] = sprite;
                } else {
                    sprite.texture = textures.ground[tile];
                }

                // create or update object sprites
                tile = game.world.objects[xy.x][xy.y];
                sprite = sprites.objects[i][j];

                if (typeof tile !== 'number') {
                    if (typeof sprite === 'object') {
                        stage.removeChild(sprites.objects[i][j]);
                        delete sprites.objects[i][j];
                    }
                } else {
                    if (typeof sprite !== 'object') {
                        sprite = new PIXI.Sprite(textures.objects[tile]);
                        sprite.position.x = i * base.TILE.WIDTH;
                        sprite.position.y = j * base.TILE.HEIGHT;
                        stage.addChild(sprite);
                        sprites.objects[i][j] = sprite;
                    } else {
                        sprite.texture = textures.objects[tile];
                    }
                }


            }
        }


        // players
        sprites.players = sprites.players || {};

        // add new / update
        Object.keys(game.players).forEach(function (id) {
            var player = game.players[id];
            var sprite = sprites.players[id];

            if (typeof sprite !== 'object') {
                sprite = new PIXI.Sprite(textures.hero);
                sprite.tint = player.tint;
                stage.addChild(sprite);
                sprites.players[id] = sprite;
            }

            var xy = worldToViewport(player);
            sprite.position.x = xy.x * base.TILE.WIDTH;
            sprite.position.y = xy.y * base.TILE.HEIGHT;
        });

        // remove old
        Object.keys(sprites.players).forEach(function (id) {
            if (typeof game.players[id] !== 'object') {
                stage.removeChild(sprites.players[id]);
                delete sprites.players[id];
            }
        });

        // mobs
        sprites.mobs = sprites.mobs || {};

        // add new / update
        Object.keys(game.mobs).forEach(function (id) {
            var mob = game.mobs[id];
            var sprite = sprites.mobs[id];

            if (typeof sprite !== 'object') {
                sprite = new PIXI.Sprite(textures.mobs[mob.name]);
                sprite.tint = mob.tint;
                stage.addChild(sprite);
                sprites.mobs[id] = sprite;
            }

            var xy = worldToViewport(mob);
            sprite.position.x = xy.x * base.TILE.WIDTH;
            sprite.position.y = xy.y * base.TILE.HEIGHT;
        });

        // remove old
        Object.keys(sprites.mobs).forEach(function (id) {
            if (typeof game.mobs[id] !== 'object') {
                stage.removeChild(sprites.mobs[id]);
                delete sprites.mobs[id];
            }
        });
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
        uiDebug.innerHTML = 'FPS: ' + Math.round(fps) + ', latency (2-way): ' + latency;
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



