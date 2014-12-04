// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

// This module contains common various helper functions

/*jslint node: true, browser: true, vars: true*/
/*global io*/

function utilsClosure() {
    var base;
    if (typeof module !== 'undefined') { // run on server
        base = require('./base.js')
    } else { // run in client
        base = baseClosure();
    }

    var utils = {};

    // wrap number around interval edges
    // x: point to wrap; a: low edge; d: interval length
    utils.wrap = function (x, a, d) {
        while (x < a || x >= a + d) {
            if (x < a) {
                x += d;
            } else { // x >= a + d
                x -= d;
            }
        }
        return x;
    };

    // wrap coordinate around world edges
    // attributes .x and .y of the original "obj" are modified
    utils.wrapOverWorld = function (obj) {
        obj.x = utils.wrap(obj.x, 0, base.constants.world.width);
        obj.y = utils.wrap(obj.y, 0, base.constants.world.height);
        return obj;
    };

    // returns a new coordinates object, offset from original ones
    utils.coordsOffset = function (coords, xOffset, yOffset) {
        return {
            x: coords.x + xOffset,
            y: coords.y + yOffset
        };
    };

    // coordinates of 4 tiles around the given coordinates
    utils.coordsAround = function (coords) {
        return {
            n: utils.wrapOverWorld(utils.coordsOffset(coords, 0, -1)),
            e: utils.wrapOverWorld(utils.coordsOffset(coords, 1, 0)),
            s: utils.wrapOverWorld(utils.coordsOffset(coords, 0, 1)),
            w: utils.wrapOverWorld(utils.coordsOffset(coords, -1, 0))
        };
    };

    // vector from point A to point B
    utils.vector = function (a, b) {
        var vec = {};
        ['x', 'y'].forEach(function (axis) {
            var ba1, ba2, wrap;
            if (typeof a[axis] !== 'number' || typeof b[axis] !== 'number') {
                console.log(a);
                console.log(b);
                throw 'Non-coordinate argument passed to util.vector(a, b)'
            }
            ba1 = b[axis] - a[axis];
            if (axis === 'x') {
                wrap = base.constants.world.width;
            } else {
                wrap = base.constants.world.height;
            }
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

    return utils;
}


if (typeof module !== 'undefined') {
    module.exports = utilsClosure();
}
