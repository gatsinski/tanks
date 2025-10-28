import Phaser from "phaser";
import { Service } from "typedi";

import { Projectile } from "app/components/Projectile";
import { Player } from "app/components/Player";
import { BRICK_WALL, CONCRETE_WALL, ENEMY, LEVEL_1, PLAYER } from "app/levels";
import { Enemy } from "app/components/Enemy";
import { Tank } from "app/components/Tank";
import { getPlayerControls } from "app/utils";

@Service()
export default class MainScene extends Phaser.Scene {
    static readonly CELL_SIZE = 40;

    private players: Player[] = [];
    private enemies: Enemy[] = [];
    private walls: Phaser.Physics.Arcade.StaticGroup;
    private projectiles: Projectile[] = [];

    constructor() {
        super({ key: "preload" });
    }

    preload(): void {
        this.load.svg("tank", "assets/tank.svg", { width: 30, height: 30 });
        this.load.svg("enemy", "assets/enemy.svg", { width: 30, height: 30 });
        this.load.svg("wall", "assets/wall.svg", { width: 40, height: 40 });
        this.load.svg("concrete-wall", "assets/concrete-wall.svg", {
            width: 40,
            height: 40,
        });
        this.load.spritesheet("explosion", "assets/explosion.png", {
            frameWidth: 32,
            frameHeight: 32,
        });
    }

    create(): void {
        this.generateBulletTexture();
        this.createExplodeAnimation();

        this.createMap(LEVEL_1);
    }

    update() {
        this.players = this.players.filter((item) => item.isActive);

        for (const player of this.players) {
            player.update();

            if (player.isFirePressed) {
                this.fireProjectile(player, [...this.players, ...this.enemies]);
            }
        }

        this.enemies = this.enemies.filter((item) => item.isActive);

        for (const enemy of this.enemies) {
            enemy.update();
        }

        this.projectiles = this.projectiles.filter((item) => item.isActive);

        for (const projectile of this.projectiles) {
            projectile.update();
        }
    }

    private generateBulletTexture() {
        const graphics = new Phaser.GameObjects.Graphics(this);

        graphics.fillStyle(0xffffff, 1);
        graphics.fillRect(0, 0, 1, 10);

        graphics.generateTexture("bullet", 1, 10);
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
            "bullet"
        );

        this.physics.add.overlap(
            projectile.image,
            this.walls,
            this.handleBulletAndWallCollision,
            null,
            this
        );

        for (const opponent of opponents) {
            if (opponent === origin) {
                continue;
            }

            this.physics.add.overlap(
                projectile.image,
                opponent.sprite,
                this.handleBulletAndTankCollision,
                null,
                this
            );
        }

        this.projectiles.push(projectile);
    }

    private createMap(level: number[][]) {
        const wallImage = this.textures.get("wall").getSourceImage();

        this.walls = this.physics.add.staticGroup();

        for (let rowIndex = 0; rowIndex < level.length; rowIndex++) {
            for (
                let colIndex = 0;
                colIndex < level[rowIndex].length;
                colIndex++
            ) {
                const cellType = level[rowIndex][colIndex];

                if (cellType === PLAYER) {
                    const controls = getPlayerControls(
                        this.players.length,
                        this.input
                    );
                    this.players.push(
                        new Player(
                            controls,
                            this.physics,
                            [colIndex, rowIndex],
                            [wallImage.width, wallImage.height],
                            "tank"
                        )
                    );
                } else if (cellType === ENEMY) {
                    this.enemies.push(
                        new Enemy(
                            this.time,
                            this.physics,
                            this.tweens,
                            [colIndex, rowIndex],
                            [wallImage.width, wallImage.height],
                            "enemy",
                            LEVEL_1
                        )
                    );
                } else if (cellType === BRICK_WALL) {
                    this.walls.create(
                        wallImage.width * colIndex,
                        wallImage.height * rowIndex,
                        "wall"
                    );
                } else if (cellType === CONCRETE_WALL) {
                    this.walls.create(
                        wallImage.width * colIndex,
                        wallImage.height * rowIndex,
                        "concrete-wall"
                    );
                }
            }
        }

        for (const enemy of this.enemies) {
            this.physics.add.collider(enemy.sprite, this.walls);

            this.time.addEvent({
                delay: 1000,
                repeat: -1,
                callback: () => {
                    if (enemy.isActive) {
                        // this.fireProjectile(enemy, [this.player]);

                        enemy.findPathToNearestPlayer(this.players);
                    }
                },
            });
        }

        for (const player of this.players) {
            this.physics.add.collider(player.sprite, this.walls);
        }

        // this.input.keyboard.on("keydown", (event: { keyCode: number }) => {
        //     if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.SPACE) {
        //         this.fireProjectile(this.player, this.enemies);
        //     }
        // });
    }

    private handleBulletAndWallCollision(
        bullet: Phaser.Types.Physics.Arcade.ImageWithDynamicBody,
        element: Phaser.Types.Physics.Arcade.GameObjectWithStaticBody
    ) {
        if (!bullet.scene || !bullet.body) return;

        bullet.setVelocity(0);

        const explosion = this.physics.add.sprite(
            bullet.body.x,
            bullet.body.y,
            "explosion"
        );

        bullet.destroy();

        const wallMapX = Math.round(element.body.x / MainScene.CELL_SIZE);
        const wallMapY = Math.round(element.body.y / MainScene.CELL_SIZE);

        console.error("wall", element.body.height);

        LEVEL_1[wallMapY][wallMapX] = 0;

        const wallType = (element as Phaser.GameObjects.Sprite).texture.key;

        if (wallType === "wall") {
            element.destroy();
        }

        explosion.anims.play("explode", true);

        explosion.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            explosion.destroy();
            // bullet.destroy();
        });
    }

    private handleBulletAndTankCollision(
        bullet: Phaser.Types.Physics.Arcade.ImageWithDynamicBody,
        element: Phaser.Types.Physics.Arcade.GameObjectWithStaticBody
    ) {
        if (!bullet.scene || !bullet.body) return;

        bullet.setVelocity(0);

        const explosion = this.physics.add.sprite(
            bullet.body.x,
            bullet.body.y,
            "explosion"
        );

        bullet.destroy();

        const wallMapX = Math.round(element.body.x / MainScene.CELL_SIZE);
        const wallMapY = Math.round(element.body.y / MainScene.CELL_SIZE);

        console.error("tank", element.body.height);
        console.error(LEVEL_1, wallMapY, wallMapX);

        LEVEL_1[wallMapY][wallMapX] = 0;

        element.destroy();

        explosion.anims.play("explode", true);

        explosion.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            explosion.destroy();
            // bullet.destroy();
        });
    }
}
