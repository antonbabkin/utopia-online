// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)
// Usage: node map_gen.js
// Generate random map and write it to a file. Server app then reads map data from that file.

/*jslint node: true, nomen: true */
'use strict';

let base = require('./base.js');

let map = [];

for (let x = 0; x < base.constants.world.width; x += 1) {
    map[x] = [];
    for (let y = 0; y < base.constants.world.height; y += 1) {
        map[x][y] = {};
        if (Math.random() < 0.3) {
            map[x][y].ground = base.grounds.sand;
            if (Math.random() < 0.1) {
                map[x][y].object = base.objects.palm;
            }
        } else {
            map[x][y].ground = base.grounds.grass;
            let r = Math.random();
            if (r < 0.1) {
                map[x][y].object = base.objects.rock;
            } else if (r < 0.3) {
                map[x][y].object = base.objects.tree;
            }
        }
    }
}

// package map object into JSON string and write to a file
let fs = require('fs');
fs.writeFile('map.json', JSON.stringify(map), function (err) {
    if (err) {
        console.error('Failed to write generated map to map.json');
        console.log(err);
    }
    console.log('map.json generated successfully');
});