// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

// This module contains a database of mobs, items, ground types and map objects.
// It also contains other constants like world size etc
// Later an excerpt of this base should be made to be accessible by the client

/*jslint node: true, browser: true, vars: true*/
/*global io*/
function baseClosure() {
    'use strict';
    // ------------------------------------------------------------------------------
    // all parameters that control the game
    // ------------------------------------------------------------------------------
    var constants = {
        tile: { // Tile size in pixels
            width: 32,
            height: 32
        },
        world: { // World size in tiles
            width: 100,
            height: 100
        },
        viewport: { // visible part of the map, size in tiles
            width: 15,
            height: 15
        },
        actionDelay: 1000,
        mobLimit: 50,
        bagLifetime: 60 * 1000,
        stateUpdateTime: 100,
        playerUpdateTime: 200,
        serverSaveTime: 60 * 60 * 1000,
        environmentUpdateTime: 10 * 60 * 1000,
        charTypes: {
            player: 0,
            mob: 1
        },
        maxInventory: 20
    };

    constants.viewport.widthP = constants.viewport.width * constants.tile.width;
    constants.viewport.heightP = constants.viewport.height * constants.tile.height;
    constants.viewport.halfWidth = (constants.viewport.width - 1) / 2;
    constants.viewport.halfHeight = (constants.viewport.height - 1) / 2;

    // UI sidepanel size in pixels
    constants.uiPanel = {
        width: Math.floor(constants.viewport.widthP / 2),
        height: constants.viewport.heightP
    };



    // ------------------------------------------------------------------------------
    // Inventory items
    // ------------------------------------------------------------------------------
    var items = [];
    items[0] = {
        name: 'Wood',
        image: 'wood'
    };
    items[1] = {
        name: 'Leather',
        image: 'leather'
    };

    var itemId = {}; // lookup table "name: baseId"
    items.forEach(function (item, index) {
        item.bid = index;
        itemId[item.name] = index;
    });


    // ------------------------------------------------------------------------------
    // Mobs
    // ------------------------------------------------------------------------------
    var mobs = [];
    mobs[0] = {
        name: 'Sphere',
        image: 'sphere',
        aggressive: false,
        speed: 1,
        drops: [
            {
                name: 'Leather',
                prob: 1
            }
        ]
    };
    mobs[1] = {
        name: 'Angry sphere',
        image: 'angry_sphere',
        aggressive: true,
        speed: 1,
        radius: 5,
        drops: [
            {
                name: 'Leather',
                prob: 1
            }
        ]
    };

    var mobId = {}; // lookup table "name: baseId"
    mobs.forEach(function (mob, index) {
        mob.bid = index;
        mobId[mob.name] = index;
        mob.drops.forEach(function (drop) {
            drop.bid = itemId[drop.name];
        });
    });

    // ------------------------------------------------------------------------------
    // Ground types
    // ------------------------------------------------------------------------------
    var grounds = {
        sand: 0,
        grass: 1
    };

    // ------------------------------------------------------------------------------
    // Map types
    // ------------------------------------------------------------------------------
    var objects = {
        tree: 0,
        palm: 1,
        rock: 2,
        wood: 3,
        bag: 4
    };

    // global object to be exported
    return {
        constants: constants,
        mobs: mobs,
        mobId: mobId,
        items: items,
        itemId: itemId,
        grounds: grounds,
        objects: objects
    };
}


if (typeof module !== 'undefined') {
    module.exports = baseClosure();
}