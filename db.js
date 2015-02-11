function baseClosure() {
    "use strict";
    return {
        "constants": {
            "world": {"width": 100, "height": 100},
            "viewport": {"width": 15, "height": 15, "centerX": 7, "centerY": 7, "widthP": 480, "heightP": 480},
            "actionDelay": 1000,
            "mobLimit": 100,
            "bagLifetime": 60000,
            "playerUpdateTime": 125,
            "serverSaveTime": 3600000,
            "environmentUpdateTime": 60000,
            "maxInventory": 20,
            "eqSlots": ["torso", "legs", "hand"],
            "stats": ["maxHp", "damage", "speed", "crafting", "gathering", "fighting"]
        },
        "groundId": {"Sand": 0, "Grass": 1},
        "itemId": {
            "Log": 0,
            "Leather": 1,
            "Leather shirt": 2,
            "Leather pants": 3,
            "Wooden sword": 4,
            "Bone": 5,
            "Raw meat": 6,
            "Claws": 7,
            "Stone": 8,
            "Wooden wall": 9,
            "Stone wall": 10,
            "Player's ear": 11,
            "Campfire": 12,
            "Workbench": 13,
            "Cooked meat": 14
        },
        "objectId": {
            "Tree": 0,
            "Palm": 1,
            "Rock": 2,
            "Wooden wall": 3,
            "Wooden wall (hardened)": 4,
            "Stone wall": 5,
            "Stone wall (hardened)": 6,
            "Campfire": 7,
            "Workbench": 8
        },
        "mobId": {"Sphere": 0, "Angry sphere": 1},
        "grounds": [{
            "name": "Sand",
            "image": "sand",
            "grow": {"name": "Palm", "p": 0.02, "bid": 1},
            "bid": 0
        }, {"name": "Grass", "image": "grass", "grow": {"name": "Tree", "p": 0.05, "bid": 0}, "bid": 1}],
        "items": [{"name": "Log", "image": "log", "type": "material", "bid": 0}, {
            "name": "Leather",
            "image": "leather",
            "type": "material",
            "bid": 1
        }, {
            "name": "Leather shirt",
            "image": "leather_shirt",
            "type": "equipment",
            "eqSlot": "torso",
            "bonuses": [{"stat": "fighting", "value": 20}],
            "bid": 2
        }, {
            "name": "Leather pants",
            "image": "leather_pants",
            "type": "equipment",
            "eqSlot": "legs",
            "bonuses": [{"stat": "fighting", "value": 10}],
            "bid": 3
        }, {
            "name": "Wooden sword",
            "image": "wooden_sword",
            "type": "equipment",
            "eqSlot": "hand",
            "bonuses": [{"stat": "fighting", "value": 10}, {"stat": "damage", "value": 1}],
            "bid": 4
        }, {
            "name": "Bone",
            "image": "bone",
            "type": "equipment",
            "eqSlot": "hand",
            "bonuses": [{"stat": "fighting", "value": 5}],
            "bid": 5
        }, {"name": "Raw meat", "image": "raw_meat", "type": "material", "bid": 6}, {
            "name": "Claws",
            "image": "claws",
            "type": "equipment",
            "eqSlot": "torso",
            "bonuses": [{"stat": "fighting", "value": 100}, {"stat": "gathering", "value": 100}, {
                "stat": "crafting",
                "value": 100
            }],
            "bid": 7
        }, {"name": "Stone", "image": "stone", "type": "material", "bid": 8}, {
            "name": "Wooden wall",
            "image": "wooden_wall",
            "type": "structure",
            "bid": 9
        }, {"name": "Stone wall", "image": "stone_wall", "type": "structure", "bid": 10}, {
            "name": "Player's ear",
            "image": "players_ear",
            "type": "junk",
            "bid": 11
        }, {"name": "Campfire", "image": "campfire", "type": "facility", "bid": 12}, {
            "name": "Workbench",
            "image": "workbench",
            "type": "facility",
            "bid": 13
        }, {"name": "Cooked meat", "image": "cooked_meat", "type": "consumable", "heals": 1, "bid": 14}],
        "objects": [{
            "name": "Tree",
            "image": "tree",
            "type": "resource",
            "durability": 0.8,
            "output": 0,
            "skill": "gathering",
            "level": 0,
            "bid": 0
        }, {
            "name": "Palm",
            "image": "palm",
            "type": "resource",
            "durability": 0.9,
            "output": 0,
            "skill": "gathering",
            "level": 20,
            "bid": 1
        }, {
            "name": "Rock",
            "image": "rock",
            "type": "resource",
            "durability": 0.95,
            "output": 8,
            "skill": "gathering",
            "level": 30,
            "bid": 2
        }, {
            "name": "Wooden wall",
            "image": "wooden_wall",
            "type": "facility",
            "change": {"name": "Wooden wall (hardened)", "p": 1, "bid": 4},
            "bid": 3
        }, {
            "name": "Wooden wall (hardened)",
            "image": "wooden_wall",
            "type": "structure",
            "durability": 0.8,
            "change": {"p": 0.05},
            "bid": 4
        }, {
            "name": "Stone wall",
            "image": "stone_wall",
            "type": "facility",
            "change": {"name": "Stone wall (hardened)", "p": 1, "bid": 6},
            "bid": 5
        }, {
            "name": "Stone wall (hardened)",
            "image": "stone_wall",
            "type": "structure",
            "durability": 0.9,
            "change": {"p": 0.02},
            "bid": 6
        }, {
            "name": "Campfire",
            "image": "campfire",
            "type": "facility",
            "change": {"p": 0.05},
            "bid": 7
        }, {"name": "Workbench", "image": "workbench", "type": "facility", "change": {"p": 0.02}, "bid": 8}],
        "mobs": [{
            "name": "Sphere",
            "image": "sphere",
            "aggressive": false,
            "stats": {"hp": 5, "speed": 1, "fighting": 0},
            "drops": [{"name": "Leather", "p": 1, "bid": 1}, {"name": "Raw meat", "p": 1, "bid": 6}, {
                "name": "Bone",
                "p": 1,
                "bid": 5
            }],
            "bid": 0
        }, {
            "name": "Angry sphere",
            "image": "angry_sphere",
            "aggressive": true,
            "radius": 5,
            "stats": {"hp": 5, "damage": 2, "speed": 1, "fighting": 30},
            "drops": [{"name": "Leather", "p": 1, "bid": 1}, {"name": "Raw meat", "p": 1, "bid": 6}, {
                "name": "Bone",
                "p": 1,
                "bid": 5
            }, {"name": "Claws", "p": 0.5, "bid": 7}],
            "bid": 1
        }],
        "crafts": [{
            "output": 2,
            "inputs": [{"name": "Leather", "count": 2, "bid": 1}],
            "skill": "crafting",
            "level": 30,
            "bid": 0
        }, {
            "output": 3,
            "inputs": [{"name": "Leather", "count": 1, "bid": 1}],
            "skill": "crafting",
            "level": 0,
            "bid": 1
        }, {
            "output": 4,
            "inputs": [{"name": "Log", "count": 1, "bid": 0}, {"name": "Leather", "count": 1, "bid": 1}],
            "skill": "crafting",
            "level": 10,
            "bid": 2
        }, {
            "output": 9,
            "inputs": [{"name": "Log", "count": 2, "bid": 0}],
            "skill": "crafting",
            "level": 20,
            "bid": 3
        }, {
            "output": 10,
            "inputs": [{"name": "Stone", "count": 2, "bid": 8}],
            "skill": "crafting",
            "level": 40,
            "facility": 8,
            "bid": 4
        }, {
            "output": 12,
            "inputs": [{"name": "Log", "count": 1, "bid": 0}],
            "skill": "crafting",
            "level": 0,
            "bid": 5
        }, {
            "output": 13,
            "inputs": [{"name": "Log", "count": 3, "bid": 0}, {"name": "Stone", "count": 1, "bid": 8}],
            "skill": "crafting",
            "level": 30,
            "bid": 6
        }, {
            "output": 14,
            "inputs": [{"name": "Raw meat", "count": 1, "bid": 6}],
            "skill": "crafting",
            "level": 0,
            "facility": 7,
            "bid": 7
        }]
    };
}

if (typeof module !== "undefined") {
    module.exports = baseClosure();
}
