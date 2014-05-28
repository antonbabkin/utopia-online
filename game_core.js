// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

/*jslint node: true, browser: true, vars: true*/
/*global io*/

var gameCoreConstructor = function (server) {
    'use strict';
    // Private properties
    var prv = {};
    
        
    // Game object to be returned by constructor
    var game = {};

    // return a player with random characteristics
    prv.createPlayer = function () {
        var player = {};
        player.x = Math.floor(Math.random() * game.WORLD.WIDTH);
        player.y = Math.floor(Math.random() * game.WORLD.HEIGHT);
        player.tint = (0.5 + 0.5 * Math.random()) * 0xFFFFFF;
        player.lastWalk = Date.now();
        player.speed = 3;
        return player;
    };
    
    

    // -------------------------
    // Constants
    // -------------------------
    game.COLORS = {
        MAP: '#c8f040',
        UI_PANEL: '#0ff'
    };
    
    // Tile size in pixels
    game.TILE = {
        WIDTH: 32,
        HEIGHT: 32
    };
    
    // World size in tiles and pixels
    game.WORLD = {
        WIDTH: 30,
        HEIGHT: 30
    };
    
     // visible part of the map
    game.VIEWPORT = {
        WIDTH: 15,
        HEIGHT: 15
    };    
    game.VIEWPORT.WIDTH_P = game.VIEWPORT.WIDTH * game.TILE.WIDTH;
    game.VIEWPORT.HEIGHT_P = game.VIEWPORT.HEIGHT * game.TILE.HEIGHT;
    
    // UI sidepanel size in pixels
    game.UI_PANEL = {
        WIDTH: Math.floor(game.VIEWPORT.WIDTH_P / 2),
        HEIGHT: game.VIEWPORT.HEIGHT_P
    };
    
    
   

    
    // standard walk delay with 100% speed and good ground (road, grass...)
    // = time in ms to walk 1 tile
    game.WALK_DELAY = 1000;
    
    
    // ground types
    game.GROUNDS = {
        SAND: 0,
        GRASS: 1
    };
    
    // object types
    game.OBJECTS = {
        TREE: 0,
        PALM: 1,
        ROCK: 2
    };
    
    
    
    game.server = server;
    
    
    game.world = {};
    game.viewport = {};

    
    
    game.players = {};
    game.playersCount = 0;
    game.createPlayer = prv.createPlayer;

    game.npcs = [];
    game.npcsCount = 0;
    game.createNpc = prv.createPlayer;
    

    // wrap coordinate around box edges
    // x: point to wrap; a: low edge coordinate; d: box dimension
    game.wrap = function (x, a, d) {
        while (x < a || x >= a + d) {
            if (x < a) {
                x += d;
            } else { // x >= a + d
                x -= d;
            }
        }
        return x;
    };
    
    game.wrapOverWorld = function (obj) {
        obj.x = game.wrap(obj.x, 0, game.WORLD.WIDTH);
        obj.y = game.wrap(obj.y, 0, game.WORLD.HEIGHT);
        return obj;
    };
    

    
    

    


    
    
    return game;
};



// to be launched on server:
var module = module || {};
module.exports = gameCoreConstructor(true);