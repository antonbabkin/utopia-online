function baseClosure() {
    "use strict";
    return {
        "grounds": [{"name": "Sand", "image": "sand", "grow": {"name": "Palm", "p": 0}}, {
            "name": "Grass",
            "image": "grass",
            "grow": {"name": "Tree", "p": 0}
        }],
        "items": [{"name": "Log", "image": "log", "type": "material"}, {
            "name": "Leather",
            "image": "leather",
            "type": "material"
        }, {
            "name": "Leather shirt",
            "image": "leather_shirt",
            "type": "equipment",
            "eqSlot": "torso",
            "bonuses": [{"stat": "fighting", "value": 20}]
        }, {
            "name": "Leather pants",
            "image": "leather_pants",
            "type": "equipment",
            "eqSlot": "legs",
            "bonuses": [{"stat": "fighting", "value": 10}]
        }, {
            "name": "Wooden sword",
            "image": "wooden_sword",
            "type": "equipment",
            "eqSlot": "hand",
            "bonuses": [{"stat": "fighting", "value": 10}, {"stat": "damage", "value": 1}]
        }, {
            "name": "Bone",
            "image": "bone",
            "type": "equipment",
            "eqSlot": "hand",
            "bonuses": [{"stat": "fighting", "value": 5}]
        }, {"name": "Raw meat", "image": "raw_meat", "type": "material"}, {
            "name": "Claws",
            "image": "claws",
            "type": "junk"
        }, {"name": "Stone", "image": "stone", "type": "material"}, {
            "name": "Wooden wall",
            "image": "wooden_wall",
            "type": "structure"
        }, {"name": "Stone wall", "image": "stone_wall", "type": "structure"}, {
            "name": "Player's ear",
            "image": "players_ear",
            "type": "junk"
        }, {"name": "Campfire", "image": "campfire", "type": "facility"}, {
            "name": "Workbench",
            "image": "workbench",
            "type": "facility"
        }, {"name": "Cooked meat", "image": "cooked_meat", "type": "consumable", "heals": 1}],
        "objects": [{
            "name": "Tree",
            "image": "tree",
            "type": "resource",
            "durability": 0,
            "output": {"name": "Log"},
            "skill": "gathering",
            "level": 0
        }, {
            "name": "Palm",
            "image": "palm",
            "type": "resource",
            "durability": 0,
            "output": {"name": "Log"},
            "skill": "gathering",
            "level": 20
        }, {
            "name": "Rock",
            "image": "rock",
            "type": "resource",
            "durability": 0,
            "output": {"name": "Stone"},
            "skill": "gathering",
            "level": 30
        }, {
            "name": "Wooden wall",
            "image": "wooden_wall",
            "type": "facility",
            "change": {"name": "Wooden wall (hardened)", "p": 1}
        }, {
            "name": "Wooden wall (hardened)",
            "image": "wooden_wall",
            "type": "structure",
            "durability": 0,
            "change": {"p": 0}
        }, {
            "name": "Stone wall",
            "image": "stone_wall",
            "type": "facility",
            "change": {"name": "Stone wall (hardened)", "p": 1}
        }, {
            "name": "Stone wall (hardened)",
            "image": "stone_wall",
            "type": "structure",
            "durability": 0,
            "change": {"p": 0}
        }, {"name": "Campfire", "image": "campfire", "type": "facility", "change": {"p": 0}}, {
            "name": "Workbench",
            "image": "workbench",
            "type": "facility",
            "change": {"p": 0}
        }],
        "mobs": [{
            "name": "Sphere",
            "image": "sphere",
            "aggressive": false,
            "stats": {"hp": 5, "speed": 1, "fighting": 0},
            "drops": [{"name": "Leather", "p": 1}, {"name": "Raw meat", "p": 1}, {"name": "Bone", "p": 1}]
        }, {
            "name": "Angry sphere",
            "image": "angry_sphere",
            "aggressive": true,
            "radius": 5,
            "stats": {"hp": 5, "damage": 2, "speed": 1, "fighting": 30},
            "drops": [{"name": "Leather", "p": 1}, {"name": "Raw meat", "p": 1}, {
                "name": "Bone",
                "p": 1
            }, {"name": "Claws", "p": 0}]
        }],
        "crafts": [{
            "output": {"name": "Leather shirt"},
            "inputs": [{"name": "Leather", "count": 2}],
            "skill": "crafting",
            "level": 30
        }, {
            "output": {"name": "Leather pants"},
            "inputs": [{"name": "Leather", "count": 1}],
            "skill": "crafting",
            "level": 0
        }, {
            "output": {"name": "Wooden sword"},
            "inputs": [{"name": "Log", "count": 1}, {"name": "Leather", "count": 1}],
            "skill": "crafting",
            "level": 10
        }, {
            "output": {"name": "Wooden wall"},
            "inputs": [{"name": "Log", "count": 2}],
            "skill": "crafting",
            "level": 20
        }, {
            "output": {"name": "Stone wall"},
            "inputs": [{"name": "Stone", "count": 2}],
            "skill": "crafting",
            "level": 40,
            "facility": "Workbench"
        }, {
            "output": {"name": "Campfire"},
            "inputs": [{"name": "Log", "count": 1}],
            "skill": "crafting",
            "level": 0
        }, {
            "output": {"name": "Workbench"},
            "inputs": [{"name": "Log", "count": 3}, {"name": "Stone", "count": 1}],
            "skill": "crafting",
            "level": 30
        }, {
            "output": {"name": "Cooked meat"},
            "inputs": [{"name": "Raw meat", "count": 1}],
            "skill": "crafting",
            "level": 0,
            "facility": "Campfire"
        }]
    };
}

if (typeof module !== "undefined") {
    module.exports = baseClosure();
}
