// Convert .csv databases into base.js format to be read by main program.

'use strict';

var csv = require('csv'),
    fs = require('fs'),
    db = {},
    parsedCount = 0,
    dbList = ['grounds', 'items', 'objects', 'mobs', 'crafts'],
    lookupList = ['groundId', 'itemId', 'objectId', 'mobId'];

function parseType(str) {
    if (/^\d+$/.test(str)) {
        return parseInt(str);
    } else if (/^\d*\.\d+$/.test(str)) {
        return parseFloat(str);
    } else if (str === 'true') {
        return true;
    } else if (str === 'false') {
        return false;
    } else {
        return str;
    }
}

function afterParse() {
    var out = '';

    // Add bids for fields that use names
    db.grounds.forEach(function (ground) {
        if (typeof ground.grow !== 'undefined') {
            ground.grow.bid = db.objectId[ground.grow.name];
        }
        if (typeof ground.change !== 'undefined') {
            ground.change.bid = db.groundId[ground.change.name];
        }
        if (typeof ground.output !== 'undefined') {
            ground.output = db.itemId[ground.output];
        }
    });
    db.objects.forEach(function (object) {
        if (typeof object.output !== 'undefined') {
            object.output = db.itemId[object.output];
        }
        if (typeof object.change !== 'undefined' && typeof object.change.name !== 'undefined') {
            object.change.bid = db.objectId[object.change.name];
        }
    });
    db.mobs.forEach(function (mob) {
        if (typeof mob.drops !== 'undefined') {
            mob.drops.forEach(function (drop) {
                drop.bid = db.itemId[drop.name];
            });
        }
    });
    db.crafts.forEach(function (craft) {
        craft.output = db.itemId[craft.output];
        if (typeof craft.facility !== 'undefined') {
            craft.facility = db.objectId[craft.facility];
        }
        craft.inputs.forEach(function (input) {
            input.bid = db.itemId[input.name];
        })
    });

    db.constants.wallBids = [
        db.objectId['Wooden wall'],
        db.objectId['Wooden wall (hardened)'],
        db.objectId['Stone wall'],
        db.objectId['Stone wall (hardened)'],
        db.objectId['Wooden door']
    ];


    out += 'function baseClosure() {\n';
    out += '\t"use strict";\n';
    out += '\treturn ' + JSON.stringify(db) + ';\n';
    out += '}\n\n';
    out += 'if (typeof module !== "undefined") {module.exports = baseClosure();}\n';
    fs.writeFile('db.js', out, function (err) {
        if (err) {
            console.error('Failed to write db.js');
            console.log(err);
        } else {
            console.log('db.js write success');
        }
    });
}

db.constants = {
    world: { // World size in tiles
        width: 40,
        height: 40
    },
    viewport: { // visible part of the map, size in tiles
        width: 15,
        height: 15,
        centerX: 7,
        centerY: 7,
        widthP: 15 * 32,
        heightP: 15 * 32
    },
    actionDelay: 1000,
    mobLimit: 16,
    bagLifetime: 60 * 1000,
    playerUpdateTime: 125,
    serverSaveTime: 50 * 60 * 1000,
    environmentUpdateTime: 5 * 60 * 1000,
    maxInventory: 20,
    eqSlots: [
        'torso',
        'legs',
        'hand'
    ],
    stats: [
        'maxHp',
        'damage',
        'speed',
        'crafting',
        'gathering',
        'fighting'
    ]
};

lookupList.forEach(function (section) {
    db[section] = {};
});

dbList.forEach(function (section, isection) {
    db[section] = [];
    fs.readFile('data/' + section + '.csv', 'utf8', function (err, data) {
        csv.parse(data, {columns: true}, function (err, output) {
            var keys, nextKey, obj, nested;
            output.forEach(function (row) {
                obj = {};
                Object.keys(row).forEach(function (col) {
                    if (row[col] === '') {
                        return;
                    }
                    nested = obj;
                    keys = col.split('.');
                    keys.forEach(function (key, ikey) {
                        nextKey = keys[ikey + 1];
                        if (typeof nextKey === 'undefined') {
                            // this is the last key: write value
                            nested[key] = parseType(row[col]);
                        } else {
                            if (/\d+/.test(nextKey)) {
                                // next key is an integer: entering array
                                nested[key] = nested[key] || [];
                            } else {
                                // next key is a string: entering object
                                nested[key] = nested[key] || {};
                            }
                            nested = nested[key];
                        }
                    });
                });
                db[section].push(obj);
            });
            // create bids and lookup tables
            db[section].forEach(function (elem, index) {
                elem.bid = index;
                if (typeof elem.name !== 'undefined') {
                    // all except crafts
                    db[lookupList[isection]][elem.name] = index;
                }
            });
            parsedCount += 1;
            if (parsedCount === dbList.length) {
                afterParse();
            }
        });
    });
});
