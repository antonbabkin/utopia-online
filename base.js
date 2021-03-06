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
            width: 100,
            height: 100
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
        mobLimit: 100,
        bagLifetime: 60 * 1000,
        playerUpdateTime: 200,
        serverSaveTime: 60 * 60 * 1000,
        environmentUpdateTime: 60 * 1000,
        charTypes: {
            player: 0,
            mob: 1
        },
        maxInventory: 20,
        itemTypes: {
            equipment: 0,
            structure: 1,
            consumable: 2,
            material: 3,
            junk: 4
        },
        eqSlots: {
            torso: 0,
            legs: 1,
            hand: 2
        },
        objectTypes: {
            node: 0,
            structure: 1,
            facility: 2
        },
        stats: [
            'maxHp',
            'damage',
            'speed',
            'crafting',
            'gathering',
            'fighting'
        ]
    };


    // ------------------------------------------------------------------------------
    // Inventory items
    // ------------------------------------------------------------------------------
    var items = [];
    items[0] = {
        name: 'Log',
        image: 'log',
        type: constants.itemTypes.material
    };
    items[1] = {
        name: 'Leather',
        image: 'leather',
        type: constants.itemTypes.material
    };
    items[2] = {
        name: 'Leather shirt',
        image: 'leather_shirt',
        eqSlot: constants.eqSlots.torso,
        type: constants.itemTypes.equipment,
        bonus: {
            fighting: 20
        }
    };
    items[3] = {
        name: 'Leather pants',
        image: 'leather_pants',
        eqSlot: constants.eqSlots.legs,
        type: constants.itemTypes.equipment,
        bonus: {
            fighting: 10
        }
    };
    items[4] = {
        name: 'Wooden sword',
        image: 'wooden_sword',
        eqSlot: constants.eqSlots.hand,
        type: constants.itemTypes.equipment,
        bonus: {
            fighting: 10,
            damage: 1
        }
    };
    items[5] = {
        name: 'Bone',
        image: 'bone',
        eqSlot: constants.eqSlots.hand,
        type: constants.itemTypes.equipment,
        bonus: {
            fighting: 10
        }
    };
    items[6] = {
        name: 'Raw meat',
        image: 'raw_meat',
        type: constants.itemTypes.material
    };
    items[7] = {
        name: 'Claws',
        image: 'claws',
        type: constants.itemTypes.junk
    };
    items[8] = {
        name: 'Stone',
        image: 'stone',
        type: constants.itemTypes.material
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
        name: 'Player\'s ear',
        image: 'players_ear',
        type: constants.itemTypes.junk
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
        type: constants.itemTypes.consumable,
        heals: 1
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
            damage: 1,
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
            damage: 2,
            speed: 1,
            fighting: 30
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
    // Object types
    // ------------------------------------------------------------------------------
    var objects = [
        {
            name: 'Tree',
            image: 'tree',
            type: constants.objectTypes.node,
            durability: 0.8,
            output: itemId['Log'],
            skill: 'gathering',
            minLevel: 0
        },
        {
            name: 'Palm',
            image: 'palm',
            type: constants.objectTypes.node,
            durability: 0.9,
            output: itemId['Log'],
            skill: 'gathering',
            minLevel: 20
        },
        {
            name: 'Rock',
            image: 'rock',
            type: constants.objectTypes.node,
            durability: 0.95,
            output: itemId['Stone'],
            skill: 'gathering',
            minLevel: 30
        },
        {
            name: 'Wooden wall',
            image: 'wooden_wall',
            type: constants.objectTypes.structure,
            durability: 0.8,
            change: {
                p: 0.05
            }
        },
        {
            name: 'Wooden wall (hardened)',
            image: 'wooden_wall',
            type: constants.objectTypes.structure,
            durability: 0.8,
            change: {
                p: 0.05
            }
        },
        {
            name: 'Stone wall',
            image: 'stone_wall',
            type: constants.objectTypes.structure,
            durability: 0.9,
            change: {
                p: 0.02
            }
        },
        {
            name: 'Campfire',
            image: 'campfire',
            type: constants.objectTypes.facility,
            change: {
                p: 0.05
            }
        },
        {
            name: 'Workbench',
            image: 'workbench',
            type: constants.objectTypes.facility,
            change: {
                p: 0.02
            }
        }
    ];
    // add bids and lookup table
    var objectId = {};
    objects.forEach(function (object, index) {
        object.bid = index;
        objectId[object.name] = index;
    });


    // ------------------------------------------------------------------------------
    // Ground types
    // ------------------------------------------------------------------------------
    var grounds = [];
    grounds[0] = {
        name: 'Sand',
        image: 'sand',
        grow: {
            p: 0.02,
            bid: objectId['Palm']
        }
    };
    grounds[1] = {
        name: 'Grass',
        image: 'grass',
        grow: {
            p: 0.05,
            bid: objectId['Tree']
        }
    };
    // add bids and lookup table
    var groundId = {};
    grounds.forEach(function (ground, index) {
        ground.bid = index;
        groundId[ground.name] = index;
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