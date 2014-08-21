// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)
// Usage: node map_gen.js
// Generate random map and write it to a file. Server app then reads map data from that file.

/*jslint node: true, nomen: true */
'use strict';

// import game_core to have access to constants like game.OBJECTS etc
var game = require('./game_core.js');

var map = {};
var i, j, r;
map.ground = [];
map.objects = [];

for (i = 0; i < game.WORLD.WIDTH; i += 1) {
    map.ground[i] = [];
    map.objects[i] = [];
    for (j = 0; j < game.WORLD.HEIGHT; j += 1) {
        if (Math.random() < 0.3) {
            map.ground[i][j] = game.GROUNDS.SAND;
            if (Math.random() < 0.1) {
                map.objects[i][j] = game.OBJECTS.PALM;
            }
        } else {
            map.ground[i][j] = game.GROUNDS.GRASS;
            r = Math.random();
            if (r < 0.1) {
                map.objects[i][j] = game.OBJECTS.ROCK;
            } else if (r < 0.3) {
                map.objects[i][j] = game.OBJECTS.TREE;
            }
        }
    }
}

// package map object into JSON string and write to a file
var fs = require('fs');
fs.writeFile('map.json', JSON.stringify(map), function (err) {
    if (err) {
        console.error('Failed to write generated map to map.json');
        console.log(err);
    }
    console.log('map.json generated successfully');
});