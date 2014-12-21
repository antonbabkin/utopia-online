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
            width: 20,
            height: 20
        },
        viewport: { // visible part of the map, size in tiles
            width: 15,
            height: 15
        },
        actionDelay: 1000,
        mobLimit: 5,
        bagLifetime: 60 * 1000,
        stateUpdateTime: 100,
        serverSaveTime: 5 * 60 * 1000,
        environmentUpdateTime: 60 * 1000,
        charTypes: {
            player: 0,
            mob: 1
        },
        maxInventory: 20
    };

    constants.viewport.widthP = constants.viewport.width * constants.tile.width;
    constants.viewport.heightP = constants.viewport.height * constants.tile.height;

    // UI sidepanel size in pixels
    constants.uiPanel = {
        width: Math.floor(constants.viewport.widthP / 2),
        height: constants.viewport.heightP
    };



    var images = {
        items: {}
    };

    // ------------------------------------------------------------------------------
    // Inventory items
    // ------------------------------------------------------------------------------
    var items = {
        wood: 0,
        leather: 1
    };
    images.items[items.wood] = 'wood';
    images.items[items.leather] = 'leather';

    // ------------------------------------------------------------------------------
    // Mobs
    // ------------------------------------------------------------------------------
    var mobs = {};
    mobs['Sphere'] = {
        image: 'sphere',
        aggressive: false,
        speed: 1,
        drops: [
            {
                id: items.leather,
                prob: 1
            }
        ]
    };
    mobs['Angry sphere'] = {
        image: 'angry_sphere',
        aggressive: true,
        speed: 1,
        radius: 5,
        drops: [
            {
                id: items.leather,
                prob: 1
            }
        ]
    };

    Object.keys(mobs).forEach(function (name) {
        mobs[name].name = name;
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
        items: items,
        grounds: grounds,
        objects: objects,
        images: images
    };
}


if (typeof module !== 'undefined') {
    module.exports = baseClosure();
}