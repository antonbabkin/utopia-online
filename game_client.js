// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

/*jslint browser: true, vars: true*/
/*global commonConstructor, io, PIXI*/

/*jslint devel: true*/ // check code without this for production



window.addEventListener('load', function clientLoader() {
    'use strict';

    var gameKeyboard = false; // switch between game controls and text-field modes

    var socket = io();

    socket.on('connected', function onConnected() {
        console.log('Connection established');
        document.getElementById('loginButton').style.color = 'black';
        document.getElementById('loginButton').addEventListener('click', function () {
            socket.emit('login', document.getElementById('loginName').value);
        }, false);
    });

    socket.on('login', function onLogin(data) {
        if (data.success) {
            console.log('Login successful');
            document.getElementById('loginBackground').style.display = 'none';
            document.getElementById('stat_name').innerHTML = data.name;
            gameKeyboard = true;
        } else {
            document.getElementById('loginStatus').innerHTML = data.msg;
        }
    });

    var base = baseClosure();
    var utils = utilsClosure();


    var self, inventory, equipment;
    var viewport;
    var i, j;

    // -----------------------
    // Append client-specific base objects
    // -----------------------
    base.constants.tile = { // Tile size in pixels
        width: 32,
        height: 32
    };

    // -----------------------
    // Append client-specific utils
    // -----------------------
    utils.worldToViewport = function (pos) {
        // Convert world coordinates to viewport position, based on coordinates of player's character.
        var vec = utils.vector(self, pos);
        return {
            x: base.constants.viewport.centerX + vec.x,
            y: base.constants.viewport.centerY + vec.y
        };
    };

    utils.itemInfo = function (bid) {
        // Generate a string describing item
        var item = base.items[bid];
        var info = item.type;
        var bonusText = '';
        if (item.type === 'equipment') {
            info += ': ' + item.eqSlot + '. ';
            item.bonuses.forEach(function (bonus, index) {
                bonusText += bonus.stat + ': ' + bonus.value;
                if (index < item.bonuses.length - 1) {
                    bonusText += ', ';
                }
            });
            info += 'Bonuses: ' + (bonusText.length > 0 ? bonusText : 'none');
        } else if (typeof item.heals !== 'undefined') {
            info += 'Heals: ' + item.heals;
        }
        info += '.';
        return info;
    };


    // ----------------------
    // Initialize UI
    // ----------------------


    // web page <div> elements
    var div = {
        canvas: document.getElementById('canvasDiv'),
        panel: document.getElementById('uiPanel'),
        debug: document.getElementById('debug'),
        notifications: document.getElementById('notifications'),
        chat: document.getElementById('chat'),
        groundPanel: document.getElementById('groundPanel'),
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
            },
            settings: {
                tab: document.getElementById('tabSettings'),
                panel: document.getElementById('panelSettings')
            }
        },
        crafts: document.getElementById('crafts'),
        bag: document.getElementById('bag_window'),
        bagTable: document.getElementById('bag_window_items')
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
    // Inventory tab and context menu
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

    // click events for menu options
    document.getElementById('item_use').addEventListener('click', function () {
        socket.emit('invUse', ui.inventory.menuSlot);
        //document.getElementById('itemMenu').style.display = 'none';
    }, false);
    document.getElementById('item_info').addEventListener('click', function () {
        var item = base.items[inventory[ui.inventory.menuSlot]];
        ui.notifications.push(item.name + ': ' + utils.itemInfo(item.bid));
        //document.getElementById('itemMenu').style.display = 'none';
    }, false);
    document.getElementById('item_drop').addEventListener('click', function () {
        socket.emit('drop', ui.inventory.menuSlot);
        //document.getElementById('itemMenu').style.display = 'none';
    }, false);

    // left click anywhere hides item menu
    document.addEventListener('click', function () {
        document.getElementById('itemMenu').style.display = 'none';
    });

    // click events for inventory slots
    for (i = 0; i <= 19; i += 1) {
        document.getElementById('inv' + i).addEventListener('contextmenu', (function (slot) {
            // right click: remember clicked slot and show menu
            // this closure "remembers" particular value of @i in local variable @slot
            return function (event) {
                event.preventDefault();
                if (typeof inventory[slot] !== 'undefined') {
                    ui.inventory.menuSlot = slot;
                    var item = base.items[inventory[slot]];
                    document.getElementById('item_name').innerHTML = item.name;

                    var menu = document.getElementById('itemMenu');

                    menu.style.top = (70 + document.getElementById('inv' + slot).offsetTop) + 'px';
                    menu.style.left = (10 + document.getElementById('inv' + slot).offsetLeft) + 'px';
                    menu.style.display = 'block';
                }
            }
        }(i)), false);
        document.getElementById('inv' + i).addEventListener('click', (function (slot) {
            // left click
            // this closure "remembers" particular value of @i in local variable @slot
            return function () {
                if (typeof inventory[slot] !== 'undefined') {
                    if (div.bag.style.display === 'none') {
                        socket.emit('invUse', slot);
                    } else {
                        socket.emit('drop', slot);
                    }
                }
            }
        }(i)), false);

    }

    // --------------------------
    // Equipment tab
    // --------------------------
    ui.equipment = {
        update: function () {
            var slot, bid, url;
            base.constants.eqSlots.forEach(function (slot) {
                bid = equipment[slot];
                url = 'url(public/';
                if (typeof bid !== 'undefined') {
                    url += base.items[bid].image;
                } else {
                    url += '/eq_' + slot;
                }
                url += '.png)';
                document.getElementById('eq_' + slot).style.backgroundImage = url;
            });
        }
    };
    // click events for equipment slots
    base.constants.eqSlots.forEach(function (slot) {
        document.getElementById('eq_' + slot).addEventListener('click', function () {
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
        // todo: add "craft all" button
        var liCraft = document.createElement('li');
        var pName = document.createElement('p');
        var pInfo = document.createElement('p');
        //var spanA = document.createElement('span');
        var span1 = document.createElement('span');
        liCraft.style.listStyleType = 'disc';
        pName.innerHTML = base.items[craft.output].name;
        pName.style.cursor = 'pointer';
        //spanA.innerHTML = 'A';
        span1.innerHTML = '1';
        pInfo.style.display = 'none';
        pInfo.innerHTML = utils.itemInfo(craft.output) + '<br>';
        pInfo.innerHTML += 'Skill: ' + craft.skill + ', level: ' + craft.level + '<br>';
        if (typeof craft.facility !== 'undefined') {
            pInfo.innerHTML += 'Facility: <img src="public/' + base.objects[craft.facility].image + '.png"><br>';
        }
        craft.inputs.forEach(function (input, index) {
            pInfo.innerHTML += '<img src="public/' + base.items[input.bid].image + '.png">';
            pInfo.innerHTML += 'x' + input.count;
            pInfo.innerHTML += (index < craft.inputs.length - 1 ? ' + ' : ' = ');
        });
        pInfo.innerHTML += '<img src="public/' + base.items[craft.output].image + '.png">';

        span1.addEventListener('click', function (event) {
            socket.emit('craft', craft.bid);
            event.stopPropagation();
        }, false);
        pName.addEventListener('click', function () {
            if (pInfo.style.display === 'none') {
                pInfo.style.display = '';
                liCraft.style.listStyleType = 'circle';
            } else {
                pInfo.style.display = 'none';
                liCraft.style.listStyleType = 'disc';
            }
        }, false);

        pName.appendChild(span1);
        liCraft.appendChild(pName);
        liCraft.appendChild(pInfo);
        div.crafts.appendChild(liCraft);
    });

    // -------------------------
    // Settings tab
    // -------------------------
    ui.settings = {
        sounds: document.getElementById('setSounds').checked,
        interior: document.getElementById('setInterior').checked
    };
    document.getElementById('setSounds').addEventListener('change', function () {
        ui.settings.sounds = document.getElementById('setSounds').checked;
    });
    document.getElementById('setInterior').addEventListener('change', function () {
        ui.settings.interior = document.getElementById('setInterior').checked;
    });

    // --------------------------
    // Bag on the ground
    // --------------------------
    ui.ground = {
        slot0: 0, // bag item in the left-most slot of the panel, used for scrolling through bags with more than 3 items
        left: document.getElementById('groundLeftArrow'),
        right: document.getElementById('groundRightArrow'),
        update: function () {
            var i, slot, item;
            var bag = viewport[base.constants.viewport.centerX][base.constants.viewport.centerY].bag;
            if (typeof bag !== 'undefined') {
                div.groundPanel.style.display = '';
                for (i = 0; i <= 2; i += 1) {
                    slot = document.getElementById('ground' + i);
                    item = bag.items[ui.ground.slot0 + i];
                    if (typeof item !== 'undefined') {
                        slot.style.backgroundImage = 'url(public/' + base.items[item].image + '.png)';
                    } else {
                        slot.style.backgroundImage = '';
                    }
                }
                if (bag.items.length > 3) {
                    ui.ground.left.style.display = '';
                    ui.ground.right.style.display = '';
                } else {
                    ui.ground.slot0 = 0;
                    ui.ground.left.style.display = 'none';
                    ui.ground.right.style.display = 'none';
                }
            } else {
                ui.ground.slot0 = 0;
                div.groundPanel.style.display = 'none';
            }
        }
    };
    // click events for ground bag slots
    for (i = 0; i <= 2; i += 1) {
        document.getElementById('ground' + i).addEventListener('click', (function (slot) {
            // this closure "remembers" particular value of @i in local variable @slot
            return function () {
                var bag = viewport[base.constants.viewport.centerX][base.constants.viewport.centerY].bag;
                if (typeof bag !== 'undefined' && typeof bag.items[ui.ground.slot0 + slot] !== 'undefined') {
                    socket.emit('pick', ui.ground.slot0 + slot);
                }
            }
        }(i)), false);
    }
    // click left-right arrows
    ui.ground.left.addEventListener('click', function () {
        if (ui.ground.slot0 > 0) {
            ui.ground.slot0 -= 3;
            ui.ground.update();
        }
    }, false);
    ui.ground.right.addEventListener('click', function () {
        if (ui.ground.slot0 + 3 < viewport[base.constants.viewport.centerX][base.constants.viewport.centerY].bag.items.length) {
            ui.ground.slot0 += 3;
            ui.ground.update();
        }
    }, false);

    // -------------------------
    // Bag window
    // -------------------------
    ui.bag = {
        slot0: 0,
        left: document.getElementById('bag_window_left_arrow'),
        right: document.getElementById('bag_window_right_arrow'),
        update: function () {
            // todo: creates list of slots every time. it is not reliable
            // need to change
            var bag = viewport[base.constants.viewport.centerX][base.constants.viewport.centerY].bag,
                i, itemBid, slot;

            if (typeof bag === 'undefined') {
                for (i = 0; i < 25; i += 1) {
                    document.getElementById('bag_' + i).style.backgroundImage = '';
                }
                ui.bag.left.style.display = 'none';
                ui.bag.right.style.display = 'none';
            } else {
                if (bag.items.length < 26) {
                    ui.bag.left.style.display = 'none';
                    ui.bag.right.style.display = 'none';
                } else {
                    ui.bag.left.style.display = '';
                    ui.bag.right.style.display = '';
                }
                for (i = 0; i < 25; i += 1) {
                    slot = ui.bag.slot0 + i;
                    itemBid = bag.items[slot];

                    if (typeof itemBid === 'undefined') {
                        document.getElementById('bag_' + i).style.backgroundImage = '';
                    } else {
                        document.getElementById('bag_' + i).style.backgroundImage =
                            'url(public/' + base.items[bag.items[slot]].image + '.png)';
                    }

                }
            }
        }
    };
    // click left-right arrows
    ui.bag.left.addEventListener('click', function () {
        if (ui.bag.slot0 > 0) {
            ui.bag.slot0 -= 25;
            ui.bag.update();
        }
    }, false);
    ui.bag.right.addEventListener('click', function () {
        if (ui.bag.slot0 + 25 < viewport[base.constants.viewport.centerX][base.constants.viewport.centerY].bag.items.length) {
            ui.bag.slot0 += 25;
            ui.bag.update();
        }
    }, false);

    document.getElementById('bag_window_open').addEventListener('click', function () {
        div.bag.style.display = 'block';
        ui.bag.slot0 = 0;
        ui.bag.update();
    }, false);
    document.getElementById('bag_window_close').addEventListener('click', function () {
        div.bag.style.display = 'none';
    }, false);

    (function () {
        // fill bag window table with clickable cells
        var i, j, tr, td, slot;
        for (i = 0; i < 5; i += 1) {
            tr = document.createElement('tr');
            div.bagTable.appendChild(tr);
            for (j = 0; j < 5; j += 1) {
                slot = i * 5 + j;
                td = document.createElement('td');
                td.id = 'bag_' + slot;
                td.className = 'invSlot';
                td.addEventListener('click', (function (s) {
                    // this closure "remembers" particular value of @slot in local variable @s
                    return function () {
                        socket.emit('pick', ui.bag.slot0 + s);
                    }
                }(slot)), false);
                tr.appendChild(td);
            }
        }
    }());


    // --------------------------
    // Notifications and chat
    // --------------------------
    ui.notifications = {
        push: function (msg) {
            div.notifications.innerHTML += '<br>' + msg;
            div.notifications.scrollTop = div.notifications.scrollHeight;
        }
    };

    div.chat.addEventListener('focus', function () {
        gameKeyboard = false;
    }, false);
    div.chat.addEventListener('blur', function () {
        gameKeyboard = true;
    }, false);
    div.chat.addEventListener('keyup', function (event) {
        event.stopPropagation();
        if (event.keyCode === KEYBOARD.enter) {
            if (div.chat.value !== '') {
                socket.emit('chat', div.chat.value);
                div.chat.value = '';
            }
            div.chat.blur();
        }
    }, false);

    // -------------------------
    // Audio
    // -------------------------
    var sounds = {
        hit: new Audio('public/hit.mp3'),
        play: function (snd) {
            if (ui.settings.sounds === true) {
                snd.play();
            }
        }
    };


    // -------------------------
    // Hit marks
    // -------------------------
    var hitMarks = (function () {
        // This creates an object with public methods necessary to work with hit marks.
        // Marks are objects that are kept in a dynamic array - @stack.
        // New marks are created and added to array as needed.
        // Used marks are returned back to array.

        var stack = []; // storage for inactive marks, ready to be displayed
        var lifetime = 1500; // how long the mark is visible
        var frames = 20; // number of animation frames
        var frameDuration = lifetime / frames;

        function createNew() {
            // create new hitMark object
            var txt = new PIXI.Text('', {font: 'bold 14px Arial', fill: 'white', align: 'center', stroke: 'black', strokeThickness: 3});
            txt.anchor.x = 0.5;
            txt.anchor.y = 0.5;
            var animTimer;

            function animate() {
                // text floats up
                txt.position.y -= 2;
                txt.position.x += 1;
                animTimer = setTimeout(animate, frameDuration);
            }

            return {
                show: function (x, y, dmg) {
                    txt.setText(dmg.toString());
                    txt.position.x = base.constants.tile.width * (0.5 + x);
                    txt.position.y = base.constants.tile.height * (0.5 + y);
                    stage.addChild(txt);
                    animTimer = setTimeout(animate, frameDuration);
                },
                hide: function () {
                    stage.removeChild(txt);
                    clearTimeout(animTimer);
                }
            };
        }

        // return hitMarks interface
        return {
            show: function (x, y, dmg) {
                // get new mark from stack or create new if stack is empty
                // show mark at the tile specified by x, y with damage dmg
                // start animation
                // hide and return mark to stack after certain period
                var mark = stack.pop() || createNew();
                mark.show(x, y, dmg);
                setTimeout(function () {
                    mark.hide();
                    stack.push(mark);
                }, lifetime);
            }
        };
    }());


    // -------------------------
    // Listen to server events
    // -------------------------


    socket.on('msg', function onMsg(msg) {
        ui.notifications.push(msg);
    });

    socket.on('viewport', function onViewport(view) {
        viewport = view;
        self = viewport[base.constants.viewport.centerX][base.constants.viewport.centerY].char;
        updateViewport();
        ui.ground.update();
        if (div.bag.style.display !== 'none') {
            ui.bag.update();
        }
    });

    socket.on('inventory', function onInventory(inv) {
        inventory = inv;
        ui.inventory.update();
    });
    socket.on('equipment', function onEquipment(eq) {
        equipment = eq;
        ui.equipment.update();
    });
    socket.on('stats', function onStats(st) {
        document.getElementById('stat_hp').innerHTML = st.hp;
        base.constants.stats.forEach(function (statName) {
            document.getElementById('stat_' + statName).innerHTML = st[statName];
            if (st.bonus[statName] > 0) {
                document.getElementById('stat_' + statName).innerHTML += '(+' + st.bonus[statName] + ')';
            }
        });
    });

    socket.on('hit', function onHit(data) {
        var pos = utils.worldToViewport(data);
        hitMarks.show(pos.x, pos.y, data.dmg);
        sounds.play(sounds.hit);
    });

    // Check ping every 5 seconds
    // @latency: time it takes to send data to server and back
    var pingTime, latency;

    (function ping() {
        pingTime = Date.now();
        socket.emit('ping');
        setTimeout(ping, 5000);
    }());

    socket.on('pong', function onPong() {
        latency = Date.now() - pingTime;
    });

    // -------------------------
    // PIXI
    // -------------------------
    var stage = new PIXI.Stage(0xc8f040);
    var renderer = PIXI.autoDetectRenderer(base.constants.viewport.widthP, base.constants.viewport.heightP);
    div.canvas.appendChild(renderer.view);


    var textures = {
        grounds: [],
        objects: [],
        mobs: [],
        hero: PIXI.Texture.fromImage('public/hero.png'),
        bag: PIXI.Texture.fromImage('public/bag.png')
    };
    ['grounds', 'objects', 'mobs'].forEach(function (type) {
        base[type].forEach(function (unit) {
            textures[type][unit.bid] = PIXI.Texture.fromImage('public/' + unit.image +'.png');
        });
    });




    var sprites = [], // 2-dim grid for PIXI sprites
        sprite,
        spriteTypes = [
            'ground',
            'object',
            'bag',
            'char'
        ];
    // fill grid with PIXI sprites for each type
    for (i = 0; i < base.constants.viewport.width; i += 1) {
        sprites[i] = [];
        for (j = 0; j < base.constants.viewport.height; j += 1) {
            sprites[i][j] = {};
            spriteTypes.forEach(function (type) {
                sprite = new PIXI.Sprite(textures.bag); // initial texture will replaced on viewport update
                sprite.position.x = i * base.constants.tile.width;
                sprite.position.y = j * base.constants.tile.height;
                stage.addChild(sprite);
                sprites[i][j][type] = sprite;
            });
            sprite = new PIXI.Graphics();
            sprite.beginFill(0xFF0000, 0.5);
            sprite.drawRect(25 + i * base.constants.tile.width, 25 + j * base.constants.tile.height, 5, 5);
            stage.addChild(sprite);
            sprites[i][j].mark = sprite;
        }
    }

    // hide, show sprites or update their textures
    function updateViewport() {
        // only update if connection established and at least one viewport state received from server
        if (typeof viewport === 'undefined') {
            return;
        }

        var i, j, cell, sprite, texture;
        for (i = 0; i < base.constants.viewport.width; i += 1) {
            for (j = 0; j < base.constants.viewport.height; j += 1) {
                cell = viewport[i][j];

                // ground
                // all cells have this attribute of type "number"
                sprites[i][j].ground.texture = textures.grounds[cell.ground];

                // objects
                // if present, attribute is of type "number"
                // if empty, attribute is undefined
                if (typeof cell.object !== 'undefined') {
                    sprites[i][j].object.visible = true;
                    sprites[i][j].object.texture = textures.objects[cell.object];
                } else {
                    sprites[i][j].object.visible = false;
                }

                // bags
                // if present, attribute is of type "object"
                // if empty, attribute is undefined
                sprites[i][j].bag.visible = (typeof cell.bag !== 'undefined' && cell.object !== base.objectId['Chest']);


                // characters
                // if present, attribute is of type "object"
                // if empty, attribute is undefined
                if (typeof cell.char !== 'undefined') {
                    sprites[i][j].char.visible = true;
                    sprites[i][j].char.tint = cell.char.tint;
                    if (cell.char.type === 'player') {
                        sprites[i][j].char.texture = textures.hero;
                    } else if (cell.char.type === 'mob') {
                        sprites[i][j].char.texture = textures.mobs[cell.char.bid];
                    }
                } else {
                    sprites[i][j].char.visible = false;
                }


                // enclosure marks
                sprites[i][j].mark.visible = (ui.settings.interior === true && cell.interior === true);
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
            fps = 0.95 * fps + 0.05 * 1000 / deltaTime; // moving average
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
        enter: 13,
        a: 65,
        w: 87,
        d: 68,
        s: 83
    };

    window.addEventListener('keyup', function (event) {
        event.preventDefault();
        if (!gameKeyboard) {
            return;
        }
        var dir;

        if (event.keyCode === KEYBOARD.enter) {
            div.chat.focus();
        } else {
            switch (event.keyCode) {
                case KEYBOARD.w:
                    dir = 'n';
                    break;
                case KEYBOARD.s:
                    dir = 's';
                    break;
                case KEYBOARD.a:
                    dir = 'w';
                    break;
                case KEYBOARD.d:
                    dir = 'e';
                    break;
            }
            if (typeof dir !== 'undefined') {
                socket.emit('walk', dir);
            }
        }
    }, false);


}, false);



