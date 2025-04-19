# Tanks

This is a 2D arcade tank game.

## Levels

The levels are created from a 2D matrix. Each number represents different block type - empty, concrete wall, brick wall, damaged brick wall, player, enemy, etc.

Some tiles are undestructuble. Some have have effects on the player or the NPC when on it. For example, water and bush tiles slow down the tanks when crossing. Some tiles can transform into other tiles e.g. brick wall will become damaged brick wall when hit once, and the damaged brick wall will become a rubble when hit another time. Rubbles will become empty tiles if a tank moves on top of it once. The first pass is slower.

## Players and enemies

## Players

The game supports multiple players and AI enemies. The number of enemies is determined by the level matrix (how many enemy tiles are present). The number of players is a setting. The spawn point of each player is determined by the level configuration. If there are three player tiles, the first player spawns on the first one, the second - on the second one. If only two players are selected, the third player tile is an empty tile.

## Enemies

The enemy tanks are aware of the player positions. They should find the shortest path to the player and move towards it. If the shortest path includes destroying breakable tiles (walls), the enemy tank will fire to break them. When the enemy has a clear sight to one of the players or to a tile next to it (future player positions), the enemy should open fire.

## Controls

In Single-player mode the controls are the arrows and the space button, in 2-player mode the controls are changed so 2 players can play comfortably on a single keyboard. The game supports joysticks and custom key configuration.

## Boosters

On the map there are randomly placed boosters. These boosters can spawn on any empty tile. When the booster is reached by a tank, the boost is applied. Example boosters are - higher rate of fire, more powerful projectiles, shield (the tank can handle one more hit) or repair - restores the tank health.
