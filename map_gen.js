// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)
// Usage: node map_gen.js
// Generate random map and write it to a file. Server app then reads map data from that file.

/*jslint node: true, nomen: true */
'use strict';

let base = require('./db.js');

let grid = [];

for (let x = 0; x < base.constants.world.width; x += 1) {
    grid[x] = [];
    for (let y = 0; y < base.constants.world.height; y += 1) {
        grid[x][y] = {};
        if (Math.random() < 0.3) {
            grid[x][y].g = base.groundId['Sand'];
            if (Math.random() < 0.1) {
                grid[x][y].o = base.objectId['Palm'];
            }
        } else {
            grid[x][y].g = base.groundId['Grass'];
            let r = Math.random();
            if (r < 0.1) {
                grid[x][y].o = base.objectId['Rock'];
            } else if (r < 0.3) {
                grid[x][y].o = base.objectId['Tree'];
            }
        }
    }
}

// package map object into JSON string and write to a file
let fs = require('fs');
fs.writeFile('map.json', JSON.stringify({grid: grid, privateObjects: {}}), function (err) {
    if (err) {
        console.error('Failed to write generated map to map.json');
        console.log(err);
    }
    console.log('map.json generated successfully');
});

// erase players data
fs.writeFile('players.json', JSON.stringify({}), function (err) {
    if (err) {
        console.error('Failed to write empty object to players.json');
        console.log(err);
    }
    console.log('players.json erased');
});