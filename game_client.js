// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

/*jslint browser: true, vars: true*/
/*global commonConstructor, io, PIXI*/

/*jslint devel: true*/ // check code without this for production



window.addEventListener('load', function clientLoader() {
    'use strict';

    var base = baseClosure();
    var utils = utilsClosure();

    // object "base" is loaded in base.js
    var CONSTANTS = base.constants;
    var OBJECTS = base.objects;
    var GROUNDS = base.grounds;


    var self, inventory, equipment;
    var viewport;
    var i;


    // ----------------------
    // Initialize UI
    // ----------------------


    // web page <div> elements
    var div = {
        canvas: document.getElementById('canvasDiv'),
        panel: document.getElementById('uiPanel'),
        debug: document.getElementById('debug'),
        notifications: document.getElementById('notifications'),
        groundContainer: document.getElementById('groundContainer'),
        ground: document.getElementById('ground'),
        tabs: {
            inv: {
                tab: document.getElementById('tabInv'),
                panel: document.getElementById('panelInv')
            },
            equips: {
                tab: document.getElementById('tabEquips'),
                panel: document.getElementById('panelEquips')
            },
            stats: {
                tab: document.getElementById('tabStats'),
                panel: document.getElementById('panelStats')
            },
            craft: {
                tab: document.getElementById('tabCraft'),
                panel: document.getElementById('panelCraft')
            }
        },
        crafts: document.getElementById('crafts')
    };

    var ui = {};
    // -----------------------------------------------
    // Switching tabs
    // -----------------------------------------------
    ui.clickTab = function (tab) {
        // @tab must be one of @div.tabs
        if (tab !== ui.activeTab) {
            ui.activeTab.tab.style.borderColor = 'darkgray';
            ui.activeTab.panel.style.zIndex = 0;
            tab.tab.style.borderColor = 'coral';
            tab.panel.style.zIndex = 1;
            ui.activeTab = tab;
        }
    };
    Object.keys(div.tabs).forEach(function (tabName) {
        div.tabs[tabName].tab.addEventListener('click', function () {
            ui.clickTab(div.tabs[tabName]);
        });
    });
    ui.activeTab = div.tabs.inv;

    // -----------------------------------------------
    // Inventory tab
    // -----------------------------------------------
    ui.inventory = {
        update: function () {
            var i, item, slot;
            for (i = 0; i < base.constants.maxInventory; i += 1) {
                item = inventory[i];
                slot = document.getElementById('inv' + i);
                if (typeof item === 'undefined') {
                    slot.style.backgroundImage = '';
                } else {
                    slot.style.backgroundImage = 'url(public/' + base.items[item].image + '.png)';
                }
            }
        }
    };
    // click events for inventory slots
    for (i = 0; i <= 19; i += 1) {
        document.getElementById('inv' + i).addEventListener('click', (function (slot) {
            // this closure "remembers" particular value of @i in local variable @slot
            return function () {
                if (typeof inventory[slot] !== 'undefined') {
                    socket.emit('invUse', slot);
                }
            }
        }(i)));
    }

    // --------------------------
    // Equipment tab
    // --------------------------
    ui.equipment = {
        update: function () {
            var slot, bid, url;
            Object.keys(base.constants.eqSlots).forEach(function (slotName) {
                slot = base.constants.eqSlots[slotName];
                bid = equipment[slot];
                url = 'url(public/';
                if (typeof bid !== 'undefined') {
                    url += base.items[bid].image;
                } else {
                    url += '/eq_' + slotName;
                }
                url += '.png)';
                document.getElementById('eq' + slot).style.backgroundImage = url;
            });
        }
    };
    // click events for equipment slots
    Object.keys(base.constants.eqSlots).forEach(function (slotName) {
        var slot = base.constants.eqSlots[slotName];
        document.getElementById('eq' + slot).addEventListener('click', function () {
            if (typeof equipment[slot] !== 'undefined') {
                socket.emit('unequip', slot);
            }
        });
    });

    // --------------------------
    // Crafts tab
    // --------------------------
    // create list of recipes from base
    base.crafts.forEach(function (craft) {
        var newLi = document.createElement('li');
        newLi.id = 'craft' + craft.bid;
        newLi.addEventListener('click', function () {
            socket.emit('craft', craft.bid);
        });
        newLi.style.cursor = 'pointer';
        newLi.innerHTML = craft.output.name;
        div.crafts.appendChild(newLi);
    });


    // todo: make it work with multiple items in a bag
    ui.ground = {
        item: document.getElementById('groundItem'),
        update: function () {
            var bag = viewport[base.constants.viewport.halfWidth][base.constants.viewport.halfHeight].bag;
            if (typeof bag !== 'undefined') {
                div.groundContainer.style.display = 'initial';
                ui.ground.item.src = 'public/' + base.items[bag.items[0]].image + '.png';
            } else {
                div.groundContainer.style.display = 'none';
            }
        }
    };
    ui.ground.item.addEventListener('click', function () {
        socket.emit('pick', 0);
    });

    ui.notifications = {
        push: function (msg) {
            div.notifications.innerHTML += '<br>' + msg;
            div.notifications.scrollTop = div.notifications.scrollHeight;
        }
    };

    ui.settings = {
        mute: true
    };

    // -------------------------
    // Audio
    // -------------------------
    var sounds = {
        hit: new Audio('public/hit.mp3'),
        play: function (snd) {
            if (!ui.settings.mute) {
                snd.play();
            }
        }
    };

    // -------------------------
    // PIXI
    // -------------------------
    var stage = new PIXI.Stage(0xc8f040);
    var renderer = PIXI.autoDetectRenderer(CONSTANTS.viewport.widthP, CONSTANTS.viewport.heightP);
    div.canvas.appendChild(renderer.view);


    var textures = {
        ground: {},
        objects: {},
        hero: PIXI.Texture.fromImage('public/hero.png'),
        mobs: {}
    };
    textures.ground[GROUNDS.grass] = PIXI.Texture.fromImage('public/grass.png');
    textures.ground[GROUNDS.sand] = PIXI.Texture.fromImage('public/sand.png');
    textures.objects[OBJECTS.tree] = PIXI.Texture.fromImage('public/tree.png');
    textures.objects[OBJECTS.palm] = PIXI.Texture.fromImage('public/palm.png');
    textures.objects[OBJECTS.rock] = PIXI.Texture.fromImage('public/rock.png');
    textures.objects[OBJECTS.wood] = PIXI.Texture.fromImage('public/wood.png');
    textures.bag = PIXI.Texture.fromImage('public/bag.png');
    base.mobs.forEach(function (mob) {
        textures.mobs[mob.bid] = PIXI.Texture.fromImage('public/' + mob.image +'.png');
    });

    // 2-dim array containers for sprites
    var sprites = {
        ground: [],
        objects: [],
        bags: [],
        chars: []
    };
    (function () {
        var i;
        for (i = 0; i < CONSTANTS.viewport.width; i += 1) {
            Object.keys(sprites).forEach(function (elem) {
                sprites[elem][i] = [];
            });
        }
    }());


    // -------------------------
    // Listen to server events
    // -------------------------
    var socket = io();

    socket.on('connected', function onConnected(data) {
        console.log('Connection established, client id: ' + data.id);
    });

    socket.on('msg', function (msg) {
        ui.notifications.push(msg);
    });

    socket.on('viewport', function onViewport(view) {
        viewport = view;
        self = viewport[base.constants.viewport.halfWidth][base.constants.viewport.halfHeight].char;
        updateViewport();
        ui.ground.update();
    });

    socket.on('inventory', function onInventory(inv) {
        inventory = inv;
        ui.inventory.update();
    });
    socket.on('equipment', function onEquipment(eq) {
        equipment = eq;
        ui.equipment.update();
    });

    socket.on('hit', function onHit(msg) {
        sounds.play(sounds.hit);
        ui.notifications.push(msg);
    });

    // Check ping every 5 seconds
    var pingTime, latency;

    (function ping() {
        pingTime = Date.now();
        socket.emit('ping');
        setTimeout(ping, 5000);
    }());

    socket.on('pong', function onPong() {
        latency = Date.now() - pingTime;
    });


    // create PIXI sprites or update their properties
    function updateViewport() {
        // only update if connection established and at least one world state received from server
        if (typeof viewport === 'undefined') {
            return;
        }

        var i, j, cell, sprite, texture;
        for (i = 0; i < CONSTANTS.viewport.width; i += 1) {
            for (j = 0; j < CONSTANTS.viewport.height; j += 1) {
                cell = viewport[i][j];

                // ground
                // all cells have this attribute of type "number"
                sprite = sprites.ground[i][j];
                if (typeof sprite !== 'object') {
                    sprite = new PIXI.Sprite(textures.ground[cell.ground]);
                    sprite.position.x = i * CONSTANTS.tile.width;
                    sprite.position.y = j * CONSTANTS.tile.height;
                    stage.addChild(sprite);
                    sprites.ground[i][j] = sprite;
                } else {
                    sprite.texture = textures.ground[cell.ground];
                }

                // objects
                // if present, attribute is of type "number"
                // if empty, attribute is not defined
                sprite = sprites.objects[i][j];
                if (typeof cell.object !== 'undefined') {
                    if (typeof sprite !== 'object') {
                        sprite = new PIXI.Sprite(textures.objects[cell.object]);
                        sprite.position.x = i * CONSTANTS.tile.width;
                        sprite.position.y = j * CONSTANTS.tile.height;
                        stage.addChild(sprite);
                        sprites.objects[i][j] = sprite;
                    } else {
                        sprite.texture = textures.objects[cell.object];
                    }
                } else {
                    if (typeof sprite === 'object') {
                        stage.removeChild(sprites.objects[i][j]);
                        delete sprites.objects[i][j];
                    }
                }

                // bags
                // if present, attribute is of type "object"
                // if empty, attribute is not defined
                sprite = sprites.bags[i][j];
                if (typeof cell.bag !== 'undefined') {
                    if (typeof sprite !== 'object') {
                        sprite = new PIXI.Sprite(textures.bag);
                        sprite.position.x = i * CONSTANTS.tile.width;
                        sprite.position.y = j * CONSTANTS.tile.height;
                        stage.addChild(sprite);
                        sprites.bags[i][j] = sprite;
                    }
                } else {
                    if (typeof sprite === 'object') {
                        stage.removeChild(sprites.bags[i][j]);
                        delete sprites.bags[i][j];
                    }
                }

                // characters
                // if present, attribute is of type "object"
                // if empty, attribute is not defined
                sprite = sprites.chars[i][j];
                if (typeof cell.char !== 'undefined') {
                    if (cell.char.type === CONSTANTS.charTypes.player) {
                        texture = textures.hero;
                    } else if (cell.char.type === CONSTANTS.charTypes.mob) {
                        texture = textures.mobs[cell.char.bid];
                    }
                    if (typeof sprite !== 'object') {
                        sprite = new PIXI.Sprite(texture);
                        sprite.position.x = i * CONSTANTS.tile.width;
                        sprite.position.y = j * CONSTANTS.tile.height;
                        sprite.tint = cell.char.tint;
                        stage.addChild(sprite);
                        sprites.chars[i][j] = sprite;
                    } else {
                        sprite.texture = texture;
                    }

                } else {
                    if (typeof sprite === 'object') {
                        stage.removeChild(sprites.chars[i][j]);
                        delete sprites.chars[i][j];
                    }
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

        renderer.render(stage);

        // Measure FPS
        if (!lastAnimTime) {
            lastAnimTime = Date.now();
            fps = 0;
        } else {
            newTime = Date.now();
            deltaTime = newTime - lastAnimTime;
            lastAnimTime = newTime;
            fps = 0.9 * fps + 0.1 * 1000 / deltaTime; // moving average
        }

    }

    // start main animation loop
    window.requestAnimationFrame(animate);

    // Update latency and FPS every second
    (function debugUpdate() {
        div.debug.innerHTML = 'FPS: ' + Math.round(fps) + ', latency (2-way): ' + latency;
        setTimeout(debugUpdate, 1000);
    }());


    // ------------------------------------------------------------------------
    // keyboard controls
    // ----------------------------------
    var KEYBOARD = {
        left: 37,
        up: 38,
        right: 39,
        down: 40,
        space: 32,
        a: 65,
        w: 87,
        d: 68,
        s: 83
    };

    window.addEventListener('keydown', function (e) {
        var key;
        switch (e.keyCode) {
        case KEYBOARD.w:
            e.preventDefault();
            key = 'n';
            break;
        case KEYBOARD.s:
            e.preventDefault();
            key = 's';
            break;
        case KEYBOARD.a:
            e.preventDefault();
            key = 'w';
            break;
        case KEYBOARD.d:
            e.preventDefault();
            key = 'e';
            break;
        case KEYBOARD.space:
            key = 'a';
            break;
        }

        socket.emit('input', key);

    }, false);


}, false);



