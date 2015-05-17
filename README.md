Utopia Online
=============================
Sandbox MMORPG in HTML5, Javascript, Node.js and Socket.IO.

Train skills, change terrain, build houses and cities, craft items and invent new recipies, fight monsters and other players in a persistent world.


First release: version 0.1
=============================
This is planned to be the first release that can be shown to the public and actually played.

To get to that stage, I am not adding new complicated features, but instead building up "meat" on existing functionality and polishing to a reasonable degree.

Things to add, modify and expand:
- Player authentication, database and backup.
- 10+ monster types with ranging difficulty and reward, including rare bosses.
- 5+ equipment types for each slot, a few wall and floor types, several foods.
- Beds to save respawn position. Must be indoors.
- Some benefits for being indoors, depending on the size of the building.
- Some usage for PvP trophies such as ears.
- Equipment on avatar sprite.
- Simple animation of mobs and players, maybe some objects and grounds (water?).
- Movement speed depends on ground type.
- *Add water: slow to move over (maybe swimming skill?), spawns fish, can be replaced by ground or expanded by digging shores.*
- Smoother interface, "craft all", hot buttons for items and recipes.
- Touch-screen support (if that is not too difficult to design and implement).
- Some simple terrain-generation algorithm (rivers, plains, forests, deserts, mountains).
- Towers to guard buildings from aggressive players (if that is not too difficult).
- Multiple resource tiers: different kinds of trees, ores, fish.
- Skills: gathering (-> digging, woodcutting, mining, fishing), crafting (-> building, tailoring, smithing, tinkering?), fighting (-> offense, defense), swimming(?).
- Balance stats and training rates.
- Write game manual.
- Minimal character customization: heads, colors etc.

After all above is finished, do code refactoring and minor optimization:
- Separate code visibility to client and server (object properties etc).
- Deployment: minification, obfuscation, "make-file".
- Make a clear, neat code that is easy to read, understand, maintain and extend.
- Try to get it work smoothly with 1000x1000 map, 1000 mobs and 10 players.