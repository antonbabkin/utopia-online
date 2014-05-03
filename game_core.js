// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

/*jslint node: true, browser: true, vars: true*/
/*global io*/

var gameCoreConstructor = function (server) {
    'use strict';
    // Private properties
    var prv = {};
    
    
    // return a player with random characteristics
    prv.createPlayer = function () {
        var player = {};
        player.x = Math.random() * game.WORLD.WIDTH_P;
        player.y = Math.random() * game.WORLD.HEIGHT_P;
        player.tint = (0.5 + 0.5 * Math.random()) * 0xFFFFFF;
        return player;
    };
    
    
    
    // Game object to be returned by constructor
    var game = {};

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
        WIDTH: 15,
        HEIGHT: 15
    };
    game.WORLD.WIDTH_P = game.WORLD.WIDTH * game.TILE.WIDTH;
    game.WORLD.HEIGHT_P = game.WORLD.HEIGHT * game.TILE.HEIGHT;
    
    // UI sidepanel size in pixels
    game.UI_PANEL = {
        WIDTH: Math.floor(game.WORLD.WIDTH_P / 2),
        HEIGHT: game.WORLD.HEIGHT_P
    };
    
    
    
    
    game.server = server;
    
    
    game.players = {};
    game.playersCount = 0;
    game.createPlayer = prv.createPlayer;

    game.npcs = [];
    game.npcsCount = 0;
    game.createNpc = prv.createPlayer;

    
    
    game.wrapOverEdge = function (char) {
        function wrap(x0, a, b) {
            var x1;
            if (x0 < a) {
                x1 = b - (a - x0);
            } else if (x0 > b) {
                x1 = a + (x0 - b);
            } else {
                x1 = x0;
            }
            return x1;
        }
        
        char.x = wrap(char.x, 0, game.WORLD.WIDTH_P);
        char.y = wrap(char.y, 0, game.WORLD.HEIGHT_P);
        
        return char;  
    };

    


    
    
    return game;
};



// to be launched on server:
var module = module || {};
module.exports = gameCoreConstructor(true);