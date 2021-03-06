function baseClosure() {
    "use strict";
    return {
        "constants": {
            "world": {"width": 20, "height": 20},
            "viewport": {"width": 15, "height": 15, "centerX": 7, "centerY": 7, "widthP": 480, "heightP": 480},
            "actionDelay": 1000,
            "mobLimit": 4,
            "bagLifetime": 60000,
            "playerUpdateTime": 125,
            "serverSaveTime": 3000000,
            "environmentUpdateTime": 300000,
            "maxInventory": 20,
            "eqSlots": ["torso", "legs", "hand"],
            "stats": ["maxHp", "damage", "speed", "crafting", "gathering", "fighting"],
            "wallBids": [3, 4, 5, 6, 9]
        },
        "groundId": {"Sand": 0, "Grass": 1, "Dirt": 2, "Wooden floor": 3, "Stone floor": 4, "Water": 5},
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
            "Cooked meat": 14,
            "Wooden door": 15,
            "Home claim": 16,
            "Chest": 17,
            "Wooden shovel": 18,
            "Dirt": 19,
            "Sand": 20,
            "Wooden floor": 21,
            "Stone floor": 22,
            "Grass": 23,
            "Fish": 24,
            "Bed": 25
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
            "Workbench": 8,
            "Wooden door": 9,
            "Chest": 10,
            "Fish": 11,
            "Bed": 12
        },
        "mobId": {"Sphere": 0, "Angry sphere": 1},
        "grounds": [{
            "name": "Sand",
            "image": "sand",
            "grow": {"name": "Palm", "p": 0.02, "bid": 1},
            "type": "resource",
            "level": 10,
            "output": 20,
            "mod": 2,
            "bid": 0
        }, {
            "name": "Grass",
            "image": "grass",
            "grow": {"name": "Tree", "p": 0.02, "bid": 0},
            "type": "resource",
            "level": 0,
            "output": 19,
            "mod": 1.5,
            "bid": 1
        }, {
            "name": "Dirt",
            "image": "dirt",
            "change": {"name": "Grass", "p": 0.5, "bid": 1},
            "type": "resource",
            "level": 0,
            "output": 19,
            "mod": 1.5,
            "bid": 2
        }, {
            "name": "Wooden floor",
            "image": "wooden_floor",
            "change": {"name": "Dirt", "p": 0.02, "bid": 2},
            "type": "cover",
            "mod": 1,
            "bid": 3
        }, {
            "name": "Stone floor",
            "image": "stone_floor",
            "change": {"name": "Dirt", "p": 0.01, "bid": 2},
            "type": "cover",
            "mod": 1,
            "bid": 4
        }, {
            "name": "Water",
            "image": "water",
            "grow": {"name": "Fish", "p": 0.1, "bid": 11},
            "type": "resource",
            "level": 20,
            "output": 20,
            "mod": 3,
            "bid": 5
        }],
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
        }, {
            "name": "Cooked meat",
            "image": "cooked_meat",
            "type": "consumable",
            "heals": 1,
            "bid": 14
        }, {"name": "Wooden door", "image": "wooden_door", "type": "facility", "bid": 15}, {
            "name": "Home claim",
            "image": "home_claim",
            "type": "tool",
            "bid": 16
        }, {"name": "Chest", "image": "chest", "type": "facility", "bid": 17}, {
            "name": "Wooden shovel",
            "image": "wooden_shovel",
            "type": "tool",
            "durability": 0.9,
            "bid": 18
        }, {"name": "Dirt", "image": "dirt", "type": "ground", "bid": 19}, {
            "name": "Sand",
            "image": "sand",
            "type": "ground",
            "bid": 20
        }, {"name": "Wooden floor", "image": "wooden_floor", "type": "ground", "bid": 21}, {
            "name": "Stone floor",
            "image": "stone_floor",
            "type": "ground",
            "bid": 22
        }, {"name": "Grass", "image": "grass", "type": "ground", "bid": 23}, {
            "name": "Fish",
            "image": "fish",
            "type": "material",
            "bid": 24
        }, {"name": "Bed", "image": "bed", "type": "facility", "bid": 25}],
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
            "durability": 0.9,
            "change": {"p": 0.02},
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
            "durability": 0.95,
            "change": {"p": 0.01},
            "bid": 6
        }, {
            "name": "Campfire",
            "image": "campfire",
            "type": "facility",
            "change": {"p": 0.05},
            "bid": 7
        }, {
            "name": "Workbench",
            "image": "workbench",
            "type": "facility",
            "change": {"p": 0.02},
            "bid": 8
        }, {
            "name": "Wooden door",
            "image": "wooden_door",
            "type": "private",
            "durability": 0.95,
            "bid": 9
        }, {"name": "Chest", "image": "chest", "type": "private", "durability": 0.95, "bid": 10}, {
            "name": "Fish",
            "image": "fish",
            "type": "resource",
            "durability": 0.6,
            "output": 24,
            "skill": "gathering",
            "level": 0,
            "change": {"p": 0.1},
            "bid": 11
        }, {"name": "Bed", "image": "bed", "type": "private", "durability": 0.8, "bid": 12}],
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
            "inputs": [{"name": "Log", "count": 1, "bid": 0}],
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
        }, {
            "output": 15,
            "inputs": [{"name": "Log", "count": 1, "bid": 0}],
            "skill": "crafting",
            "level": 0,
            "bid": 8
        }, {
            "output": 16,
            "inputs": [{"name": "Leather", "count": 1, "bid": 1}],
            "skill": "crafting",
            "level": 0,
            "bid": 9
        }, {
            "output": 17,
            "inputs": [{"name": "Log", "count": 1, "bid": 0}],
            "skill": "crafting",
            "level": 0,
            "bid": 10
        }, {
            "output": 21,
            "inputs": [{"name": "Log", "count": 1, "bid": 0}],
            "skill": "crafting",
            "level": 0,
            "bid": 11
        }, {
            "output": 22,
            "inputs": [{"name": "Stone", "count": 1, "bid": 8}],
            "skill": "crafting",
            "level": 0,
            "bid": 12
        }, {
            "output": 18,
            "inputs": [{"name": "Log", "count": 1, "bid": 0}],
            "skill": "crafting",
            "level": 0,
            "bid": 13
        }, {
            "output": 25,
            "inputs": [{"name": "Log", "count": 1, "bid": 0}, {"name": "Leather", "count": 1, "bid": 1}],
            "skill": "crafting",
            "level": 0,
            "bid": 14
        }]
    };
}

if (typeof module !== "undefined") {
    module.exports = baseClosure();
}
