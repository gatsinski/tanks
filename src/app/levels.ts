export const EMPTY = 0;
export const BRICK_WALL = 1;
export const PLAYER = 2;
export const ENEMY = 3;
export const CONCRETE_WALL = 4;
export const DAMAGED_BRICK_WALL = 5;
export const RUBBLE = 6;
export const WATER = 7;
export const BUSH = 8;
export const BOOSTER = 9;
export const WRECKAGE = 10;

// Enemy teams. ENEMY (3) is the red team; the others are separate rival teams.
// Enemies attack the players and every tank from another team, never their own.
export const ENEMY_RED = ENEMY;
export const ENEMY_BLUE = 11;
export const ENEMY_PURPLE = 12;
export const ENEMY_STEEL = 13;

export const PLAYER_TEAM = "player";

export interface TeamDefinition {
    id: string;
    name: string;
    /** Base texture key; damage states append "-damage-1" / "-damage-2" */
    texture: string;
    /** Color for minimap/HUD (STYLE.md team "light" tone) */
    color: number;
}

export const ENEMY_TEAMS: Record<number, TeamDefinition> = {
    [ENEMY_RED]: { id: "red", name: "Red", texture: "enemy", color: 0xef5350 },
    [ENEMY_BLUE]: { id: "blue", name: "Blue", texture: "enemy-blue", color: 0x42a5f5 },
    [ENEMY_PURPLE]: { id: "purple", name: "Purple", texture: "enemy-purple", color: 0xba68c8 },
    [ENEMY_STEEL]: { id: "steel", name: "Steel", texture: "enemy-steel", color: 0xb0bec5 },
};

export const isEnemyTile = (tile: number) => ENEMY_TEAMS[tile] !== undefined;

// Ally: AI-controlled tank on the player's team. It hunts every enemy team,
// is never hit by player shots, and doesn't count towards winning or losing.
export const ALLY = 14;

export const ALLY_TEAM: TeamDefinition = {
    id: PLAYER_TEAM,
    name: "Allies",
    texture: "ally",
    color: 0x4db6ac,
};

/** Every AI-controlled tank type, keyed by tile */
export const AI_TANKS: Record<number, TeamDefinition> = {
    ...ENEMY_TEAMS,
    [ALLY]: ALLY_TEAM,
};

export const isAiTile = (tile: number) => AI_TANKS[tile] !== undefined;

export interface GameSettings {
    playerCount: number;
}

export const DEFAULT_SETTINGS: GameSettings = {
    playerCount: 1,
};

// 28 cols x 17 rows
export const LEVEL_1 = [
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 3, 0, 1, 0, 0, 0, 0, 8, 8, 0, 0, 0, 1, 1, 1, 1, 0, 0, 8, 8, 0, 0, 0, 1, 0, 11, 4],
    [4, 1, 0, 1, 1, 0, 7, 7, 8, 8, 0, 1, 1, 1, 1, 1, 1, 0, 7, 7, 8, 0, 1, 1, 1, 0, 1, 4],
    [4, 1, 0, 1, 1, 0, 7, 7, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 7, 7, 0, 0, 1, 1, 0, 1, 1, 4],
    [4, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 9, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 4],
    [4, 1, 0, 1, 1, 0, 1, 4, 1, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 4, 1, 0, 1, 1, 0, 1, 1, 4],
    [4, 1, 0, 1, 1, 0, 1, 4, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 4, 1, 0, 1, 1, 0, 1, 1, 4],
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 4, 1, 0, 0, 1, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
    [4, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 4, 1, 0, 0, 1, 4, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 4],
    [4, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 9, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 4],
    [4, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 4],
    [4, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 7, 7, 7, 7, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 4],
    [4, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 7, 7, 7, 7, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 4],
    [4, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 4],
    [4, 1, 1, 1, 1, 1, 14, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 4],
    [4, 2, 0, 1, 0, 0, 2, 1, 0, 0, 0, 0, 1, 4, 4, 1, 0, 0, 0, 0, 1, 2, 0, 1, 0, 0, 11, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

// 28 cols x 17 rows
export const LEVEL_2 = [
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 3, 0, 0, 0, 1, 1, 0, 0, 0, 8, 8, 0, 0, 0, 0, 8, 8, 0, 0, 0, 1, 1, 0, 0, 0, 11, 4],
    [4, 0, 1, 1, 0, 1, 1, 0, 1, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4, 1, 0, 1, 1, 0, 1, 1, 0, 4],
    [4, 3, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 9, 9, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 11, 4],
    [4, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 4],
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
    [4, 8, 8, 8, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 8, 8, 8, 4],
    [4, 7, 7, 7, 7, 7, 0, 7, 7, 7, 7, 7, 7, 0, 0, 7, 7, 7, 7, 7, 7, 0, 7, 7, 7, 7, 7, 4],
    [4, 7, 7, 7, 7, 7, 0, 7, 7, 7, 7, 7, 7, 0, 0, 7, 7, 7, 7, 7, 7, 0, 7, 7, 7, 7, 7, 4],
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
    [4, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 4],
    [4, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 9, 9, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4],
    [4, 0, 1, 0, 4, 4, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 4, 4, 0, 1, 0, 4],
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 13, 4],
    [4, 8, 8, 8, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 8, 8, 8, 4],
    [4, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 2, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

// 28 cols x 17 rows
export const LEVEL_3 = [
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 4, 0, 13, 0, 0, 13, 0, 4, 0, 0, 0, 0, 1, 0, 0, 11, 4],
    [4, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 4, 1, 1, 1, 1, 1, 1, 4, 0, 1, 0, 1, 0, 1, 1, 0, 4],
    [4, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 4, 1, 1, 1, 1, 1, 1, 4, 0, 1, 0, 0, 0, 0, 1, 0, 4],
    [4, 3, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 11, 4],
    [4, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 9, 9, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 4],
    [4, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 4, 4, 0, 0, 0, 0, 4, 4, 1, 1, 1, 1, 1, 0, 1, 1, 4],
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
    [4, 0, 8, 8, 8, 0, 1, 1, 1, 0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 1, 1, 1, 0, 8, 8, 8, 4],
    [4, 0, 8, 8, 8, 0, 1, 0, 0, 0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 0, 0, 1, 0, 8, 8, 8, 4],
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
    [4, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 4],
    [4, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 9, 9, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 4],
    [4, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 4, 4, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 4],
    [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 14, 14, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
    [4, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 2, 4],
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

export interface LevelDefinition {
    name: string;
    description: string;
    grid: number[][];
}

export const LEVELS: LevelDefinition[] = [
    { name: "Outpost", description: "Red and Blue fight over the lake.", grid: LEVEL_1 },
    { name: "Crossroads", description: "Four teams fight over the bridges.", grid: LEVEL_2 },
    { name: "Fortress", description: "Steel holds the stronghold.", grid: LEVEL_3 },
];
