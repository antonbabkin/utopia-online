// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

/*jslint node: true, browser: true, vars: true*/
/*global io*/

var gameCoreConstructor = function (server) {
    'use strict';
    // Private properties
    var prv = {};
    
    prv.randomColor = function () {
        return '#' + (Math.random() * 0xFFFFFF << 0).toString(16);
    };
    
    // return a player with random characteristics
    prv.createPlayer = function () {
        var player = {};
        player.x = Math.random() * game.world.width;
        player.y = Math.random() * game.world.height;
        player.color = prv.randomColor();
        return player;
    };
    
    
    
    // Game object to be returned by constructor
    var game = {};
    
    game.server = server;
    
    game.world = {
        height: 20 * 15,
        width: 20 * 15
    };
    
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
        
        char.x = wrap(char.x, 0, game.world.width);
        char.y = wrap(char.y, 0, game.world.height);
        
        return char;  
    };

    


    
    
    return game;
};



// to be launched on server:
var module = module || {};
module.exports = gameCoreConstructor(true);