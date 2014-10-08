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
        npcs: [],
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
    common.base.WALK_DELAY = 1000;


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


    return common;
}



// to be launched on server:
var module = module || {};
module.exports = commonConstructor();
