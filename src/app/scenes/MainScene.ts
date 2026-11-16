import Phaser from "phaser";
import { Service } from "typedi";

import { Projectile } from "app/components/Projectile";
import { sound } from "app/sound";
import { touchControls } from "app/components/TouchControls";
import { Player } from "app/components/Player";
import {
    BRICK_WALL,
    CONCRETE_WALL,
    DAMAGED_BRICK_WALL,
    RUBBLE,
    WATER,
    BUSH,
    BOOSTER,
    WRECKAGE,
    AI_TANKS,
    isAiTile,
    PLAYER_TEAM,
    LEVELS,
    PLAYER,
    EMPTY,
    DEFAULT_SETTINGS,
    LevelDefinition,
} from "app/levels";
import { Enemy } from "app/components/Enemy";
import { Tank } from "app/components/Tank";
import { getPlayerControls } from "app/utils";
import EndScene, { EndSceneData } from "app/scenes/EndScene";
import MenuScene, { GameStartData } from "app/scenes/MenuScene";

interface TileEntity {
    sprite: Phaser.GameObjects.Sprite;
    type: number;
    traversedOnce?: boolean;
}

interface BoosterEntity {
    sprite: Phaser.GameObjects.Sprite;
    type: "speed" | "fireRate" | "damage" | "shield" | "repair";
}

@Service()
export default class MainScene extends Phaser.Scene {
    static readonly CELL_SIZE = 40;
    /** Pixels a tank may overlap a wall before it's considered "inside" it */
    static readonly WALL_OVERLAP_TOLERANCE = 3;

    private players: Player[] = [];
    private enemies: Enemy[] = [];
    private walls: Phaser.Physics.Arcade.StaticGroup;
    private projectiles: Projectile[] = [];

    private levelGrid: number[][] = [];
    private tileMap: Map<string, TileEntity> = new Map();
    private boosters: BoosterEntity[] = [];

    private statusText: Phaser.GameObjects.Text;
    private teamTexts = new Map<string, Phaser.GameObjects.Text>();
    private lastSafePositions = new Map<Tank, { x: number; y: number }>();
    private currentSettings = { ...DEFAULT_SETTINGS };

    private levelIndex = 0;
    /** Set when playing a level from the editor / custom list */
    private customLevel: LevelDefinition | null = null;
    private isRoundOver = false;
    private initialEnemyCount = 0;
    private roundStartTime = 0;

    constructor() {
        super({ key: "preload" });
    }

    init(data?: Partial<GameStartData>): void {
        if (data?.levelIndex !== undefined) this.levelIndex = data.levelIndex;
        if (data && "customLevel" in data)
            this.customLevel = data.customLevel ?? null;
        if (data?.playerCount !== undefined)
            this.currentSettings.playerCount = data.playerCount;
    }

    private get currentLevel(): LevelDefinition {
        return this.customLevel ?? LEVELS[this.levelIndex];
    }

    preload(): void {
        this.load.svg("tank", "assets/tank.svg", { width: 30, height: 30 });
        this.load.svg("tank-damage-1", "assets/tank-damage-1.svg", {
            width: 30,
            height: 30,
        });
        this.load.svg("tank-damage-2", "assets/tank-damage-2.svg", {
            width: 30,
            height: 30,
        });

        // Every enemy team has a base texture plus two damage states
        for (const team of Object.values(AI_TANKS)) {
            for (const suffix of ["", "-damage-1", "-damage-2"]) {
                const key = team.texture + suffix;
                this.load.svg(key, `assets/${key}.svg`, {
                    width: 30,
                    height: 30,
                });
            }
        }

        this.load.svg("wall", "assets/wall.svg", { width: 40, height: 40 });
        this.load.svg("concrete-wall", "assets/concrete-wall.svg", {
            width: 40,
            height: 40,
        });
        this.load.svg("damaged-wall", "assets/damaged-wall.svg", {
            width: 40,
            height: 40,
        });
        this.load.svg("rubble", "assets/rubble.svg", {
            width: 40,
            height: 40,
        });
        this.load.svg("water", "assets/water.svg", {
            width: 40,
            height: 40,
        });
        this.load.svg("bush", "assets/bush.svg", {
            width: 40,
            height: 40,
        });
        this.load.svg("wreckage", "assets/wreckage.svg", {
            width: 40,
            height: 40,
        });

        this.load.svg("booster-speed", "assets/booster-speed.svg", {
            width: 30,
            height: 30,
        });
        this.load.svg("booster-fire-rate", "assets/booster-fire-rate.svg", {
            width: 30,
            height: 30,
        });
        this.load.svg("booster-damage", "assets/booster-damage.svg", {
            width: 30,
            height: 30,
        });
        this.load.svg("booster-shield", "assets/booster-shield.svg", {
            width: 30,
            height: 30,
        });
        this.load.svg("booster-repair", "assets/booster-repair.svg", {
            width: 30,
            height: 30,
        });

        this.load.spritesheet("explosion", "assets/explosion.png", {
            frameWidth: 32,
            frameHeight: 32,
        });
    }

    create(): void {
        // Reset state: the same scene instance is reused on restart
        this.players = [];
        this.enemies = [];
        this.projectiles = [];
        this.tileMap = new Map();
        this.boosters = [];
        this.lastSafePositions = new Map();
        this.isRoundOver = false;

        if (!this.textures.exists("bullet")) this.generateBulletTexture();
        if (!this.anims.exists("explode")) this.createExplodeAnimation();

        // Deep copy level grid
        this.levelGrid = this.currentLevel.grid.map((row) => [...row]);

        this.createMap(this.levelGrid);
        this.fitCameraToMap();
        this.createStatusUI();

        // Touch joystick panel is visible only while a round is on screen
        document.body.classList.add("playing");
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
            document.body.classList.remove("playing")
        );

        if (touchControls.isSupported && this.players[0]) {
            this.players[0].touch = touchControls;
            // No ESC key on mobile: tap the status bar to leave
            this.statusText
                .setText(this.statusText.text.replace("ESC: Menu", "☰ Menu"))
                .setInteractive({ useHandCursor: true })
                .on("pointerdown", () => {
                    if (!this.isRoundOver) this.scene.start(MenuScene.KEY);
                });
        }

        this.initialEnemyCount = this.hostileEnemies.length;
        this.roundStartTime = this.time.now;

        this.input.keyboard.on("keydown-ESC", () => {
            if (!this.isRoundOver) this.scene.start(MenuScene.KEY);
        });

        // Spawn periodic boosters
        this.time.addEvent({
            delay: 15000,
            loop: true,
            callback: () => this.spawnRandomBooster(),
        });
    }

    private createStatusUI() {
        this.statusText = this.add.text(
            10,
            10,
            (this.customLevel
                ? `Custom: ${this.customLevel.name} | `
                : `Level ${this.levelIndex + 1}: ${
                      this.currentLevel.name
                  } | `) +
                (this.players.length > 1
                    ? "P1: Arrows+Space | P2: WASD+F"
                    : "Arrows+Space") +
                " | ESC: Menu",
            {
                fontSize: "14px",
                color: "#ffffff",
                backgroundColor: "#000000aa",
                padding: { x: 8, y: 4 },
            }
        );
        this.statusText.setDepth(100);
        this.pinToScreen(this.statusText);

        // Scoreboard: remaining tanks per enemy team present in this level
        this.teamTexts = new Map();
        const teams = Object.values(AI_TANKS).filter((team) =>
            this.enemies.some((e) => e.team === team.id)
        );
        let x = this.scale.width - 10;
        for (const team of [...teams].reverse()) {
            const text = this.add
                .text(x, 10, "", {
                    fontSize: "14px",
                    fontStyle: "bold",
                    color: "#" + team.color.toString(16).padStart(6, "0"),
                    backgroundColor: "#000000aa",
                    padding: { x: 8, y: 4 },
                })
                .setOrigin(1, 0)
                .setDepth(100);
            this.teamTexts.set(team.id, text);
            this.updateTeamText(team.id, team.name);
            x -= text.width + 6;
        }
        this.teamTexts.forEach((text) => this.pinToScreen(text));
    }

    /** Zoom the camera so the map fills the canvas (the map is smaller) */
    private fitCameraToMap() {
        const mapW = this.levelGrid[0].length * MainScene.CELL_SIZE;
        const mapH = this.levelGrid.length * MainScene.CELL_SIZE;
        const cam = this.cameras.main;
        cam.setZoom(
            Math.min(this.scale.width / mapW, this.scale.height / mapH)
        );
        cam.centerOn(mapW / 2, mapH / 2);
    }

    /**
     * Keep a HUD object at its given screen position and size regardless of
     * camera zoom (the zoom scales around the canvas center).
     */
    private pinToScreen(obj: Phaser.GameObjects.Text) {
        const cam = this.cameras.main;
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        obj.setScrollFactor(0)
            .setScale(1 / cam.zoom)
            .setPosition(
                cx + (obj.x - cx) / cam.zoom,
                cy + (obj.y - cy) / cam.zoom
            );
    }

    private updateTeamText(teamId: string, name?: string) {
        const text = this.teamTexts.get(teamId);
        if (!text) return;
        const label = name ?? text.getData("name");
        text.setData("name", label);
        const alive = this.enemies.filter(
            (e) => e.isActive && e.team === teamId
        ).length;
        text.setText(`${label}: ${alive}`);
        text.setAlpha(alive > 0 ? 1 : 0.4);
    }

    update(time: number) {
        this.players = this.players.filter((item) => item.isActive);
        this.enforceWallBounds();

        for (const player of this.players) {
            this.handleTerrainEffects(player);
            player.update();

            if (
                player.isFirePressed &&
                time > player.lastFired + player.fireRate
            ) {
                player.lastFired = time;
                this.fireProjectile(player, [...this.players, ...this.enemies]);
            }
        }

        const enemyCountBefore = this.enemies.length;
        this.enemies = this.enemies.filter((item) => item.isActive);
        if (this.enemies.length !== enemyCountBefore) {
            this.teamTexts.forEach((_, teamId) => this.updateTeamText(teamId));
        }

        for (const enemy of this.enemies) {
            this.handleTerrainEffects(enemy);
            enemy.update();
        }

        this.projectiles = this.projectiles.filter((item) => item.isActive);

        for (const projectile of this.projectiles) {
            projectile.update();
            this.handleProjectileRubbleOverlap(projectile);
        }

        // Check booster pickups
        this.checkBoosterCollisions();

        this.checkRoundEnd();
    }

    /** Tiles currently held by any active tank other than `self` */
    private getOccupiedTiles(self: Tank) {
        const occupied = new Set<string>();
        for (const tank of [...this.players, ...this.enemies]) {
            if (tank === self || !tank.isActive) continue;
            const mapX = Math.floor(tank.x / MainScene.CELL_SIZE);
            const mapY = Math.floor(tank.y / MainScene.CELL_SIZE);
            occupied.add(`${mapX},${mapY}`);
        }
        return occupied;
    }

    /**
     * Safety net against tunnelling: if a tank ends a physics step inside a
     * wall (e.g. squeezed by another tank), Arcade physics may give up on
     * separating it. Snap it back to its last valid position instead.
     */
    private enforceWallBounds() {
        for (const tank of [...this.players, ...this.enemies]) {
            if (!tank.isActive) continue;
            const body = tank.sprite.body;

            if (this.overlapsSolidTile(body)) {
                const safe = this.lastSafePositions.get(tank);
                if (safe) body.reset(safe.x, safe.y);
            } else {
                this.lastSafePositions.set(tank, { x: tank.x, y: tank.y });
            }
        }
    }

    private overlapsSolidTile(body: Phaser.Physics.Arcade.Body) {
        const tolerance = MainScene.WALL_OVERLAP_TOLERANCE;
        const size = MainScene.CELL_SIZE;
        const left = Math.floor((body.left + tolerance) / size);
        const right = Math.floor((body.right - tolerance) / size);
        const top = Math.floor((body.top + tolerance) / size);
        const bottom = Math.floor((body.bottom - tolerance) / size);

        for (let row = top; row <= bottom; row++) {
            for (let col = left; col <= right; col++) {
                const tile = this.levelGrid[row]?.[col];
                if (
                    tile === undefined ||
                    tile === BRICK_WALL ||
                    tile === DAMAGED_BRICK_WALL ||
                    tile === CONCRETE_WALL
                ) {
                    return true;
                }
            }
        }
        return false;
    }

    /** AI tanks that are against the player (excludes allies) */
    private get hostileEnemies() {
        return this.enemies.filter((e) => e.team !== PLAYER_TEAM);
    }

    private checkRoundEnd() {
        if (this.isRoundOver) return;

        let won: boolean;
        if (this.players.length === 0) {
            won = false; // Game over takes priority if both sides die at once
        } else if (
            this.hostileEnemies.length === 0 &&
            this.initialEnemyCount > 0
        ) {
            won = true;
        } else {
            return;
        }

        this.isRoundOver = true;
        const data: EndSceneData = {
            won,
            levelIndex: this.levelIndex,
            hasNextLevel:
                !this.customLevel && this.levelIndex + 1 < LEVELS.length,
            isCustom: !!this.customLevel,
            enemiesDestroyed:
                this.initialEnemyCount - this.hostileEnemies.length,
            timeMs: this.time.now - this.roundStartTime,
        };

        // Let the final explosion play out, then freeze the battlefield
        this.time.delayedCall(1200, () => {
            this.scene.pause();
            this.scene.launch(EndScene.KEY, data);
        });
    }

    private handleTerrainEffects(tank: Tank) {
        const mapX = Math.floor(tank.x / MainScene.CELL_SIZE);
        const mapY = Math.floor(tank.y / MainScene.CELL_SIZE);
        const tileType = this.levelGrid[mapY]?.[mapX];
        const key = `${mapX},${mapY}`;
        const tileEntity = this.tileMap.get(key);

        let modifier = 1.0;

        if (tileType === WATER) {
            modifier = 0.5; // Water slows down
            // Submersion visual effect: partial transparency
            tank.sprite.setAlpha(0.65);
        } else if (tileType === BUSH) {
            modifier = 0.65; // Bush slows down
            // Foliage submersion visual effect: partial transparency to simulate being inside bushes
            tank.sprite.setAlpha(0.7);
        } else {
            tank.sprite.setAlpha(1.0);
        }

        if (tileType === RUBBLE || tileType === WRECKAGE) {
            modifier = 0.8; // Rubble and tank wreckage slow down tanks slightly (80% speed)
        }

        (tank as any).speedModifier = modifier;
    }

    private handleProjectileRubbleOverlap(projectile: Projectile) {
        if (!projectile.isActive) return;

        const mapX = Math.floor(projectile.x / MainScene.CELL_SIZE);
        const mapY = Math.floor(projectile.y / MainScene.CELL_SIZE);
        const tileType = this.levelGrid[mapY]?.[mapX];

        if (tileType === RUBBLE || tileType === WRECKAGE) {
            const tileKey = `${mapX},${mapY}`;
            if (!projectile.rubbleCheckedTiles.has(tileKey)) {
                projectile.rubbleCheckedTiles.add(tileKey);
                // Blocks projectile on random: 1 of every 3 passes through (2/3 chance blocked)
                const passes = Math.random() < 1 / 3;
                if (!passes) {
                    const bx = projectile.x;
                    const by = projectile.y;
                    projectile.destroy();
                    this.spawnExplosion(bx, by, 0.7);
                }
            }
        }
    }

    private generateBulletTexture() {
        const graphics = new Phaser.GameObjects.Graphics(this);
        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(0, 0, 3, 10);
        graphics.generateTexture("bullet", 3, 10);
    }

    private createExplodeAnimation() {
        this.anims.create({
            key: "explode",
            frames: this.anims.generateFrameNumbers("explosion", {
                start: 0,
                end: 3,
            }),
            frameRate: 20,
            repeat: 0,
        });
    }

    private fireProjectile(origin: Tank, opponents: Tank[]) {
        sound.play("shoot");
        const angle = origin.angle - 90;
        const turretOffset = this.physics.velocityFromAngle(angle, 25);

        const projectile = new Projectile(
            this.physics,
            origin.x + turretOffset.x,
            origin.y + turretOffset.y,
            origin.angle,
            "bullet",
            origin.projectileDamage,
            origin
        );

        this.physics.add.overlap(
            projectile.image,
            this.walls,
            (projImg, wallObj) => {
                this.handleBulletAndWallCollision(
                    projectile,
                    wallObj as Phaser.Types.Physics.Arcade.GameObjectWithStaticBody
                );
            },
            null,
            this
        );

        for (const opponent of opponents) {
            // No friendly fire: shots pass through teammates
            if (opponent === origin || opponent.team === origin.team) continue;

            this.physics.add.overlap(
                projectile.image,
                opponent.sprite,
                () => {
                    this.handleBulletAndTankCollision(projectile, opponent);
                },
                null,
                this
            );
        }

        this.projectiles.push(projectile);
    }

    private createMap(level: number[][]) {
        const cellSize = MainScene.CELL_SIZE;
        this.walls = this.physics.add.staticGroup();

        let playerCountInConfig = 0;

        for (let rowIndex = 0; rowIndex < level.length; rowIndex++) {
            for (
                let colIndex = 0;
                colIndex < level[rowIndex].length;
                colIndex++
            ) {
                const cellType = level[rowIndex][colIndex];
                const x = colIndex * cellSize + cellSize / 2;
                const y = rowIndex * cellSize + cellSize / 2;

                if (cellType === PLAYER) {
                    playerCountInConfig++;
                    if (
                        playerCountInConfig <= this.currentSettings.playerCount
                    ) {
                        const controls = getPlayerControls(
                            this.players.length,
                            this.input
                        );
                        this.players.push(
                            new Player(
                                controls,
                                this.physics,
                                [colIndex, rowIndex],
                                [cellSize, cellSize],
                                "tank"
                            )
                        );
                    } else {
                        // Empty tile if player count setting is lower than available spawns
                        this.levelGrid[rowIndex][colIndex] = EMPTY;
                    }
                } else if (isAiTile(cellType)) {
                    // Enemies of every team and allies share the same AI
                    const team = AI_TANKS[cellType];
                    this.enemies.push(
                        new Enemy(
                            this.time,
                            this.physics,
                            this.tweens,
                            [colIndex, rowIndex],
                            [cellSize, cellSize],
                            team.texture,
                            this.levelGrid,
                            team.id
                        )
                    );
                } else if (cellType === BRICK_WALL) {
                    const wallSprite = this.walls.create(x, y, "wall");
                    this.tileMap.set(`${colIndex},${rowIndex}`, {
                        sprite: wallSprite,
                        type: BRICK_WALL,
                    });
                } else if (cellType === CONCRETE_WALL) {
                    this.walls.create(x, y, "concrete-wall");
                } else if (cellType === WATER) {
                    const sprite = this.add.sprite(x, y, "water");
                    sprite.setDepth(1);
                    this.tileMap.set(`${colIndex},${rowIndex}`, {
                        sprite,
                        type: WATER,
                    });
                } else if (cellType === BUSH) {
                    const sprite = this.add.sprite(x, y, "bush");
                    sprite.setDepth(1); // Render behind tanks (tanks are at depth 5)
                    this.tileMap.set(`${colIndex},${rowIndex}`, {
                        sprite,
                        type: BUSH,
                    });
                } else if (cellType === BOOSTER) {
                    this.createBoosterAt(colIndex, rowIndex);
                }
            }
        }

        // Setup AI timers and collisions
        for (const enemy of this.enemies) {
            this.physics.add.collider(enemy.sprite, this.walls);

            this.time.addEvent({
                delay: 600,
                repeat: -1,
                callback: () => {
                    if (enemy.isActive) {
                        const activeBoosters = this.boosters.map((b) => ({
                            x: b.sprite.x,
                            y: b.sprite.y,
                            type: b.type,
                        }));

                        const hostiles = [
                            ...this.players,
                            ...this.enemies,
                        ].filter((t) => t.isActive && t.team !== enemy.team);

                        enemy.findPathToNearestTarget(
                            hostiles,
                            () => {
                                if (
                                    this.time.now >
                                    enemy.lastFired + enemy.fireRate
                                ) {
                                    enemy.lastFired = this.time.now;
                                    this.fireProjectile(enemy, [
                                        ...this.players,
                                        ...this.enemies,
                                    ]);
                                }
                            },
                            activeBoosters,
                            this.getOccupiedTiles(enemy)
                        );
                    }
                },
            });
        }

        for (const player of this.players) {
            this.physics.add.collider(player.sprite, this.walls);
        }

        // Enable collisions between all tanks (players and enemies)
        const allTanks = [...this.players, ...this.enemies];
        for (let i = 0; i < allTanks.length; i++) {
            for (let j = i + 1; j < allTanks.length; j++) {
                this.physics.add.collider(
                    allTanks[i].sprite,
                    allTanks[j].sprite
                );
            }
        }
    }

    private handleBulletAndWallCollision(
        projectile: Projectile,
        element: Phaser.Types.Physics.Arcade.GameObjectWithStaticBody
    ) {
        if (!projectile.isActive) return;

        const bulletX = projectile.x;
        const bulletY = projectile.y;
        projectile.destroy();

        this.spawnExplosion(bulletX, bulletY);

        const sprite = element as Phaser.GameObjects.Sprite;
        const wallMapX = Math.floor(sprite.x / MainScene.CELL_SIZE);
        const wallMapY = Math.floor(sprite.y / MainScene.CELL_SIZE);
        const key = `${wallMapX},${wallMapY}`;

        const wallType = sprite.texture.key;

        if (wallType === "concrete-wall") {
            // Indestructible
            sound.play("ricochet");
            return;
        }

        if (wallType === "wall" || wallType === "damaged-wall") {
            sound.play("wallBreak");
        }

        if (wallType === "wall") {
            sprite.destroy();

            // If projectile has double damage (2+), skip damaged brick and destroy directly to rubble in 1 hit!
            if (projectile.damage >= 2) {
                this.levelGrid[wallMapY][wallMapX] = RUBBLE;

                const rubbleSprite = this.add.sprite(
                    wallMapX * MainScene.CELL_SIZE + MainScene.CELL_SIZE / 2,
                    wallMapY * MainScene.CELL_SIZE + MainScene.CELL_SIZE / 2,
                    "rubble"
                );
                rubbleSprite.setDepth(2);

                this.tileMap.set(key, {
                    sprite: rubbleSprite,
                    type: RUBBLE,
                    traversedOnce: false,
                });
            } else {
                // Normal projectile transforms brick wall into damaged brick wall
                this.levelGrid[wallMapY][wallMapX] = DAMAGED_BRICK_WALL;

                const damagedWall = this.walls.create(
                    wallMapX * MainScene.CELL_SIZE + MainScene.CELL_SIZE / 2,
                    wallMapY * MainScene.CELL_SIZE + MainScene.CELL_SIZE / 2,
                    "damaged-wall"
                );

                this.tileMap.set(key, {
                    sprite: damagedWall,
                    type: DAMAGED_BRICK_WALL,
                });
            }
        } else if (wallType === "damaged-wall") {
            // Damaged brick wall becomes rubble
            sprite.destroy();
            this.levelGrid[wallMapY][wallMapX] = RUBBLE;

            const rubbleSprite = this.add.sprite(
                wallMapX * MainScene.CELL_SIZE + MainScene.CELL_SIZE / 2,
                wallMapY * MainScene.CELL_SIZE + MainScene.CELL_SIZE / 2,
                "rubble"
            );
            rubbleSprite.setDepth(2);

            this.tileMap.set(key, {
                sprite: rubbleSprite,
                type: RUBBLE,
                traversedOnce: false,
            });
        }
    }

    private handleBulletAndTankCollision(projectile: Projectile, tank: Tank) {
        if (!projectile.isActive || !tank.isActive) return;

        const bulletX = projectile.x;
        const bulletY = projectile.y;
        projectile.destroy();

        this.spawnExplosion(bulletX, bulletY);

        const isDead = tank.takeHit(projectile.damage);
        sound.play(isDead ? "tankDestroyed" : "hit");
        if (isDead) {
            this.spawnExplosion(tank.x, tank.y, 1.5);

            // Turn tank location into permanent wreckage
            const mapX = Math.floor(tank.x / MainScene.CELL_SIZE);
            const mapY = Math.floor(tank.y / MainScene.CELL_SIZE);
            const key = `${mapX},${mapY}`;

            // Update level grid so AI and movement treat it as wreckage
            this.levelGrid[mapY][mapX] = WRECKAGE;

            const wreckageSprite = this.add.sprite(
                mapX * MainScene.CELL_SIZE + MainScene.CELL_SIZE / 2,
                mapY * MainScene.CELL_SIZE + MainScene.CELL_SIZE / 2,
                "wreckage"
            );
            wreckageSprite.setDepth(2);

            this.tileMap.set(key, {
                sprite: wreckageSprite,
                type: WRECKAGE,
            });

            tank.sprite.destroy();
        }
    }

    private spawnExplosion(x: number, y: number, scale = 1.0) {
        const explosion = this.physics.add.sprite(x, y, "explosion");
        explosion.setScale(scale);
        explosion.anims.play("explode", true);
        explosion.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            explosion.destroy();
        });
    }

    private createBoosterAt(col: number, row: number) {
        const types: Array<
            "speed" | "fireRate" | "damage" | "shield" | "repair"
        > = ["speed", "fireRate", "damage", "shield", "repair"];
        const chosenType = types[Math.floor(Math.random() * types.length)];

        const textureMap: Record<string, string> = {
            speed: "booster-speed",
            fireRate: "booster-fire-rate",
            damage: "booster-damage",
            shield: "booster-shield",
            repair: "booster-repair",
        };

        const x = col * MainScene.CELL_SIZE + MainScene.CELL_SIZE / 2;
        const y = row * MainScene.CELL_SIZE + MainScene.CELL_SIZE / 2;

        const sprite = this.add.sprite(x, y, textureMap[chosenType]);
        sprite.setDepth(5);

        this.tweens.add({
            targets: sprite,
            scale: { from: 0.85, to: 1.15 },
            duration: 600,
            yoyo: true,
            repeat: -1,
        });

        this.boosters.push({ sprite, type: chosenType });
    }

    private spawnRandomBooster() {
        const emptyCells: [number, number][] = [];
        for (let r = 0; r < this.levelGrid.length; r++) {
            for (let c = 0; c < this.levelGrid[r].length; c++) {
                if (this.levelGrid[r][c] === EMPTY) {
                    emptyCells.push([c, r]);
                }
            }
        }

        if (emptyCells.length === 0) return;
        const [c, r] =
            emptyCells[Math.floor(Math.random() * emptyCells.length)];
        this.createBoosterAt(c, r);
    }

    private checkBoosterCollisions() {
        const allTanks = [...this.players, ...this.enemies];

        for (let i = this.boosters.length - 1; i >= 0; i--) {
            const booster = this.boosters[i];
            for (const tank of allTanks) {
                if (!tank.isActive) continue;

                const distance = Phaser.Math.Distance.Between(
                    tank.x,
                    tank.y,
                    booster.sprite.x,
                    booster.sprite.y
                );

                if (distance < 25) {
                    // Check if tank can accept this booster type
                    if (tank.canAcceptBooster(booster.type)) {
                        tank.applyBooster(booster.type);
                        sound.play("booster");
                        booster.sprite.destroy();
                        this.boosters.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }
}
