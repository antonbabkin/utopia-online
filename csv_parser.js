// Convert .csv databases into base.js format to be read by main program.

'use strict';

var csv = require('csv'),
    fs = require('fs'),
    db = {},
    parsedCount = 0,
    dbList = ['grounds', 'items', 'objects', 'mobs', 'crafts'];

function parseType(str) {
    if (/\d+/.test(str)) {
        return parseInt(str);
    } else if (/\d*\.\d+/.test(str)) {
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

dbList.forEach(function (section) {
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
            parsedCount += 1;
            if (parsedCount === dbList.length) {
                afterParse();
            }
        });
    });
});
