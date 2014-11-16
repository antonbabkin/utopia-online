// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

// This module contains common elements, used on both server and client sides.

/*jslint node: true, browser: true, vars: true*/
/*global io*/


function commonConstructor() {
    'use strict';

    // object to be returned by constructor
    var common = {};

    // empty game object
    common.game = {
        players: {},
        mobs: {},
        world: {}
    };

    // -------------------------
    // Constants
    // -------------------------
    common.base = {};

    common.base.COLORS = {
        MAP: '#c8f040',
        UI_PANEL: '#0ff'
    };

    // Tile size in pixels
    common.base.TILE = {
        WIDTH: 32,
        HEIGHT: 32
    };

    // World size in tiles and pixels
    common.base.WORLD = {
        WIDTH: 20,
        HEIGHT: 20
    };
    common.base.WORLD.SIZE = {
        x: common.base.WORLD.WIDTH,
        y: common.base.WORLD.HEIGHT
    };

     // visible part of the map
    common.base.VIEWPORT = {
        WIDTH: 15,
        HEIGHT: 15
    };
    common.base.VIEWPORT.WIDTH_P = common.base.VIEWPORT.WIDTH * common.base.TILE.WIDTH;
    common.base.VIEWPORT.HEIGHT_P = common.base.VIEWPORT.HEIGHT * common.base.TILE.HEIGHT;

    // UI sidepanel size in pixels
    common.base.UI_PANEL = {
        WIDTH: Math.floor(common.base.VIEWPORT.WIDTH_P / 2),
        HEIGHT: common.base.VIEWPORT.HEIGHT_P
    };



    // standard walk delay with 100% speed and good ground (road, grass...)
    // = time in ms to walk 1 tile
    common.base.ACTION_DELAY = 1000;


    // ground types
    common.base.GROUNDS = {
        SAND: 0,
        GRASS: 1
    };

    // object types
    common.base.OBJECTS = {
        TREE: 0,
        PALM: 1,
        ROCK: 2,
        WOOD: 3
    };

    // inventory items
    common.base.ITEMS = {
        WOOD: 0,
        LEATHER: 1
    };

    // inventory images
    common.base.ITEMS_IMAGES = {};
    common.base.ITEMS_IMAGES[common.base.ITEMS.WOOD] = 'wood';
    common.base.ITEMS_IMAGES[common.base.ITEMS.LEATHER] = 'leather';

    // -------------------------
    // Mobs database
    // -------------------------
    common.mobs = {};

    common.mobs['Sphere'] = {
        image: 'sphere',
        aggressive: false,
        speed: 1
    };

    common.mobs['Angry sphere'] = {
        image: 'angry_sphere',
        aggressive: true,
        speed: 2,
        radius: 10
    };


    // -------------------------
    // Various helper functions
    // -------------------------
    common.util = {};

    // wrap number around interval edges
    // x: point to wrap; a: low edge; d: interval length
    function wrap(x, a, d) {
        while (x < a || x >= a + d) {
            if (x < a) {
                x += d;
            } else { // x >= a + d
                x -= d;
            }
        }
        return x;
    }

    // wrap coordinate around world edges
    // attributies .x and .y of the original "obj" are modified
    common.util.wrapOverWorld = function (obj) {
        obj.x = wrap(obj.x, 0, common.base.WORLD.WIDTH);
        obj.y = wrap(obj.y, 0, common.base.WORLD.HEIGHT);
        return obj;
    };

    // returns a new coordinates object, offset from original ones
    common.util.coordsOffset = function (coords, xOffset, yOffset) {
        return {
            x: coords.x + xOffset,
            y: coords.y + yOffset
        };
    };

    // coordinates of 4 tiles around the given coordinates
    common.util.coordsAround = function (coords) {
        return {
            n: common.util.wrapOverWorld(common.util.coordsOffset(coords, 0, -1)),
            e: common.util.wrapOverWorld(common.util.coordsOffset(coords, 1, 0)),
            s: common.util.wrapOverWorld(common.util.coordsOffset(coords, 0, 1)),
            w: common.util.wrapOverWorld(common.util.coordsOffset(coords, -1, 0))
        };
    };

    // vector from point A to point B
    common.util.vector = function(a, b) {
        var vec = {};
        ['x', 'y'].forEach(function (axis) {
            var ba1, ba2, wrap;
            if (typeof a[axis] !== 'number' || typeof b[axis] !== 'number') {
                console.log(a);
                console.log(b);
                throw 'Non-coordinate argument passed to util.vector(a, b)'
            }
            ba1 = b[axis] - a[axis];
            wrap = common.base.WORLD.SIZE[axis];
            if (ba1 > 0) {
                wrap *= -1;
            }
            ba2 = ba1 + wrap;
            if (Math.abs(ba1) < Math.abs(ba2)) {
                vec[axis] = ba1;
            } else {
                vec[axis] = ba2;
            }
        });

        vec.norm = Math.abs(vec.x) + Math.abs(vec.y);
        return vec;
    };


    return common;
}



// to be launched on server:
var module = module || {};
module.exports = commonConstructor();
