import Phaser from "phaser";
import { Service } from "typedi";

import { Projectile } from "app/components/Projectile";
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
    ENEMY,
    LEVEL_1,
    PLAYER,
    EMPTY,
    DEFAULT_SETTINGS,
} from "app/levels";
import { Enemy } from "app/components/Enemy";
import { Tank } from "app/components/Tank";
import { getPlayerControls } from "app/utils";

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

    private players: Player[] = [];
    private enemies: Enemy[] = [];
    private walls: Phaser.Physics.Arcade.StaticGroup;
    private projectiles: Projectile[] = [];

    private levelGrid: number[][] = [];
    private tileMap: Map<string, TileEntity> = new Map();
    private boosters: BoosterEntity[] = [];

    private statusText: Phaser.GameObjects.Text;
    private currentSettings = { ...DEFAULT_SETTINGS };

    constructor() {
        super({ key: "preload" });
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

        this.load.svg("enemy", "assets/enemy.svg", { width: 30, height: 30 });
        this.load.svg("enemy-damage-1", "assets/enemy-damage-1.svg", {
            width: 30,
            height: 30,
        });
        this.load.svg("enemy-damage-2", "assets/enemy-damage-2.svg", {
            width: 30,
            height: 30,
        });

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
        this.generateBulletTexture();
        this.createExplodeAnimation();

        // Deep copy level grid
        this.levelGrid = LEVEL_1.map((row) => [...row]);

        this.createMap(this.levelGrid);
        this.createStatusUI();

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
            "Players: " + this.players.length + " | P1: Arrow+Space | P2: WASD+F",
            {
                fontSize: "14px",
                color: "#ffffff",
                backgroundColor: "#000000aa",
                padding: { x: 8, y: 4 },
            }
        );
        this.statusText.setDepth(100);
    }

    update(time: number) {
        this.players = this.players.filter((item) => item.isActive);

        for (const player of this.players) {
            this.handleTerrainEffects(player);
            player.update();

            if (player.isFirePressed && time > player.lastFired + player.fireRate) {
                player.lastFired = time;
                this.fireProjectile(player, [...this.players, ...this.enemies]);
            }
        }

        this.enemies = this.enemies.filter((item) => item.isActive);

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
            if (opponent === origin) continue;

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
            for (let colIndex = 0; colIndex < level[rowIndex].length; colIndex++) {
                const cellType = level[rowIndex][colIndex];
                const x = colIndex * cellSize + cellSize / 2;
                const y = rowIndex * cellSize + cellSize / 2;

                if (cellType === PLAYER) {
                    playerCountInConfig++;
                    if (playerCountInConfig <= this.currentSettings.playerCount) {
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
                } else if (cellType === ENEMY) {
                    this.enemies.push(
                        new Enemy(
                            this.time,
                            this.physics,
                            this.tweens,
                            [colIndex, rowIndex],
                            [cellSize, cellSize],
                            "enemy",
                            this.levelGrid
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

                        enemy.findPathToNearestPlayer(
                            this.players,
                            () => {
                                if (this.time.now > enemy.lastFired + enemy.fireRate) {
                                    enemy.lastFired = this.time.now;
                                    this.fireProjectile(enemy, [
                                        ...this.players,
                                        ...this.enemies,
                                    ]);
                                }
                            },
                            activeBoosters
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
                this.physics.add.collider(allTanks[i].sprite, allTanks[j].sprite);
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
            return;
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

    private handleBulletAndTankCollision(
        projectile: Projectile,
        tank: Tank
    ) {
        if (!projectile.isActive || !tank.isActive) return;

        const bulletX = projectile.x;
        const bulletY = projectile.y;
        projectile.destroy();

        this.spawnExplosion(bulletX, bulletY);

        const isDead = tank.takeHit(projectile.damage);
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
        const types: Array<"speed" | "fireRate" | "damage" | "shield" | "repair"> = [
            "speed",
            "fireRate",
            "damage",
            "shield",
            "repair",
        ];
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
        const [c, r] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
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
                        booster.sprite.destroy();
                        this.boosters.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }
}
