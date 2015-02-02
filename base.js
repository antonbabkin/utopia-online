// Copyright (c) 2014 Anton Babkin
// Utopia Online - Sandbox MMORPG
// IDK Licensed. (I don't know what type of license I need, will decide later)

// This module contains a database of mobs, items, ground types and map objects.
// It also contains other constants like world size etc
// Later an excerpt of this base should be made to be accessible by the client

/*jslint node: true, browser: true, vars: true*/
/*global io*/
function baseClosure() {
    'use strict';
    // ------------------------------------------------------------------------------
    // all parameters that control the game
    // ------------------------------------------------------------------------------
    var constants = {
        tile: { // Tile size in pixels
            width: 32,
            height: 32
        },
        world: { // World size in tiles
            width: 30,
            height: 30
        },
        viewport: { // visible part of the map, size in tiles
            width: 15,
            height: 15
        },
        actionDelay: 1000,
        mobLimit: 10,
        bagLifetime: 60 * 1000,
        stateUpdateTime: 100,
        playerUpdateTime: 200,
        serverSaveTime: 60 * 60 * 1000,
        environmentUpdateTime: 10 * 60 * 1000,
        charTypes: {
            player: 0,
            mob: 1
        },
        maxInventory: 20,
        maxHp: 20,
        itemTypes: {
            equipment: 0,
            structure: 1,
            consumable: 2
        },
        eqSlots: {
            torso: 0,
            legs: 1,
            hand: 2
        },
        objectTypes: {
            node: 0,
            structure: 1
        }
    };

    constants.viewport.widthP = constants.viewport.width * constants.tile.width;
    constants.viewport.heightP = constants.viewport.height * constants.tile.height;
    constants.viewport.halfWidth = (constants.viewport.width - 1) / 2;
    constants.viewport.halfHeight = (constants.viewport.height - 1) / 2;

    // UI sidepanel size in pixels
    constants.uiPanel = {
        width: Math.floor(constants.viewport.widthP / 2),
        height: constants.viewport.heightP
    };



    // ------------------------------------------------------------------------------
    // Inventory items
    // ------------------------------------------------------------------------------
    var items = [];
    items[0] = {
        name: 'Log',
        image: 'log'
    };
    items[1] = {
        name: 'Leather',
        image: 'leather'
    };
    items[2] = {
        name: 'Leather shirt',
        image: 'leather_shirt',
        eqSlot: constants.eqSlots.torso,
        type: constants.itemTypes.equipment
    };
    items[3] = {
        name: 'Leather pants',
        image: 'leather_pants',
        eqSlot: constants.eqSlots.legs,
        type: constants.itemTypes.equipment
    };
    items[4] = {
        name: 'Wooden sword',
        image: 'wooden_sword',
        eqSlot: constants.eqSlots.hand,
        type: constants.itemTypes.equipment
    };
    items[5] = {
        name: 'Bone',
        image: 'bone',
        eqSlot: constants.eqSlots.hand,
        type: constants.itemTypes.equipment
    };
    items[6] = {
        name: 'Raw meat',
        image: 'raw_meat'
    };
    items[7] = {
        name: 'Claws',
        image: 'claws'
    };
    items[8] = {
        name: 'Stone',
        image: 'stone'
    };
    items[9] = {
        name: 'Wooden wall',
        image: 'wooden_wall',
        type: constants.itemTypes.structure
    };
    items[10] = {
        name: 'Stone wall',
        image: 'stone_wall',
        type: constants.itemTypes.structure
    };
    items[11] = {
        name: "Player's ear",
        image: 'players_ear'
    };
    items[12] = {
        name: 'Campfire',
        image: 'campfire',
        type: constants.itemTypes.structure
    };
    items[13] = {
        name: 'Workbench',
        image: 'workbench',
        type: constants.itemTypes.structure
    };
    items[14] = {
        name: 'Cooked meat',
        image: 'cooked_meat',
        type: constants.itemTypes.consumable
    };


    var itemId = {}; // lookup table "name: baseId"
    items.forEach(function (item, index) {
        item.bid = index;
        itemId[item.name] = index;
    });


    // ------------------------------------------------------------------------------
    // Mobs
    // ------------------------------------------------------------------------------
    var mobs = [];
    mobs[0] = {
        name: 'Sphere',
        image: 'sphere',
        aggressive: false,
        stats: {
            hp: 5,
            speed: 1,
            fighting: 0
        },
        drops: [
            {
                name: 'Leather',
                prob: 1
            },
            {
                name: 'Raw meat',
                prob: 1
            },
            {
                name: 'Bone',
                prob: 1
            }
        ]
    };
    mobs[1] = {
        name: 'Angry sphere',
        image: 'angry_sphere',
        aggressive: true,
        radius: 5,
        stats: {
            hp: 5,
            speed: 1,
            fighting: 20
        },
        drops: [
            {
                name: 'Leather',
                prob: 1
            },
            {
                name: 'Raw meat',
                prob: 1
            },
            {
                name: 'Bone',
                prob: 1
            },
            {
                name: 'Claws',
                prob: 1
            }
        ]
    };

    var mobId = {}; // lookup table "name: baseId"
    mobs.forEach(function (mob, index) {
        mob.bid = index;
        mobId[mob.name] = index;
        mob.drops.forEach(function (drop) {
            drop.bid = itemId[drop.name];
        });
    });

    // ------------------------------------------------------------------------------
    // Ground types
    // ------------------------------------------------------------------------------
    var grounds = [];
    grounds[0] = {
        name: 'Sand',
        image: 'sand'
    };
    grounds[1] = {
        name: 'Grass',
        image: 'grass'
    };
    // add bids and lookup table
    var groundId = {};
    grounds.forEach(function (ground, index) {
        ground.bid = index;
        groundId[ground.name] = index;
    });

    // ------------------------------------------------------------------------------
    // Object types
    // ------------------------------------------------------------------------------
    var objects = [];
    objects[0] = {
        name: 'Tree',
        image: 'tree',
        type: constants.objectTypes.node,
        output: itemId['Log'],
        skill: 'gathering',
        minLevel: 0
    };
    objects[1] = {
        name: 'Palm',
        image: 'palm',
        type: constants.objectTypes.node,
        output: itemId['Log'],
        skill: 'gathering',
        minLevel: 20
    };
    objects[2] = {
        name: 'Rock',
        image: 'rock',
        type: constants.objectTypes.node,
        output: itemId['Stone'],
        skill: 'gathering',
        minLevel: 30
    };
    objects[3] = {
        name: 'Wooden wall',
        image: 'wooden_wall',
        type: constants.objectTypes.structure
    };
    objects[4] = {
        name: 'Stone wall',
        image: 'stone_wall',
        type: constants.objectTypes.structure
    };
    objects[5] = {
        name: 'Campfire',
        image: 'campfire',
        type: constants.objectTypes.structure
    };
    objects[6] = {
        name: 'Workbench',
        image: 'workbench',
        type: constants.objectTypes.structure
    };
    // add bids and lookup table
    var objectId = {};
    objects.forEach(function (object, index) {
        object.bid = index;
        objectId[object.name] = index;
    });

    // ------------------------------------------------------------------------------
    // Crafting recipes
    // ------------------------------------------------------------------------------
    var crafts = [
        {
            output: {
                name: 'Leather shirt'
            },
            inputs: [
                {
                    name: 'Leather',
                    count: 2
                }
            ],
            skill: 'crafting',
            minLevel: 30
        },
        {
            output: {
                name: 'Leather pants'
            },
            inputs: [
                {
                    name: 'Leather',
                    count: 1
                }
            ],
            skill: 'crafting',
            minLevel: 0
        },
        {
            output: {
                name: 'Wooden sword'
            },
            inputs: [
                {
                    name: 'Log',
                    count: 1
                },
                {
                    name: 'Leather',
                    count: 1
                }
            ],
            skill: 'crafting',
            minLevel: 10
        },
        {
            output: {
                name: 'Wooden wall'
            },
            inputs: [
                {
                    name: 'Log',
                    count: 2
                }
            ],
            skill: 'crafting',
            minLevel: 20
        },
        {
            output: {
                name: 'Stone wall'
            },
            inputs: [
                {
                    name: 'Stone',
                    count: 2
                }
            ],
            skill: 'crafting',
            minLevel: 40,
            facility: objectId['Workbench']
        },
        {
            output: {
                name: 'Campfire'
            },
            inputs: [
                {
                    name: 'Log',
                    count: 1
                }
            ],
            skill: 'crafting',
            minLevel: 0
        },
        {
            output: {
                name: 'Workbench'
            },
            inputs: [
                {
                    name: 'Log',
                    count: 3
                },
                {
                    name: 'Stone',
                    count: 1
                }
            ],
            skill: 'crafting',
            minLevel: 30
        },
        {
            output: {
                name: 'Cooked meat'
            },
            inputs: [
                {
                    name: 'Raw meat',
                    count: 1
                }
            ],
            skill: 'crafting',
            minLevel: 0,
            facility: objectId['Campfire']
        }
    ];
    // add bids
    crafts.forEach(function (craft, index) {
        craft.bid = index;
        craft.output.bid = itemId[craft.output.name];
        craft.inputs.forEach(function (input) {
            input.bid = itemId[input.name];
        });
    });

    // global object to be exported
    return {
        constants: constants,
        mobs: mobs,
        mobId: mobId,
        items: items,
        itemId: itemId,
        grounds: grounds,
        groundId: groundId,
        objects: objects,
        objectId: objectId,
        crafts: crafts
    };
}


if (typeof module !== 'undefined') {
    module.exports = baseClosure();
}