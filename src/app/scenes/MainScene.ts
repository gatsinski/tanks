import Phaser from "phaser";
import { Service } from "typedi";

import { Projectile } from "app/components/Projectile";
import { Player } from "app/components/Player";
import { LEVEL_1 } from "app/levels";
import { Enemy } from "app/components/Enemy";
import { Tank } from "app/components/Tank";

@Service()
export default class MainScene extends Phaser.Scene {
    private player: Player;
    private enemies: Enemy[] = [];
    private walls: Phaser.Physics.Arcade.StaticGroup;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    private projectiles: Projectile[] = [];

    constructor() {
        super({ key: "preload" });
    }

    preload(): void {
        this.load.svg("tank", "assets/tank.svg", { width: 30, height: 30 });
        this.load.svg("enemy", "assets/enemy.svg", { width: 30, height: 30 });
        this.load.svg("wall", "assets/wall.svg", { width: 25, height: 25 });
        this.load.spritesheet("explosion", "assets/explosion.png", {
            frameWidth: 32,
            frameHeight: 32,
        });
    }

    create(): void {
        this.cursors = this.input.keyboard.createCursorKeys();

        this.generateBulletTexture();
        this.createExplodeAnimation();

        this.walls = this.createLevelWalls(LEVEL_1);

        this.player = new Player(this.cursors, this.physics, 100, 775, "tank");
        this.physics.add.collider(this.player.sprite, this.walls);

        this.input.keyboard.on("keydown", (event: { keyCode: number }) => {
            if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.SPACE) {
                this.fireProjectile(this.player, this.enemies);
            }
        });

        this.enemies.push(new Enemy(this.time, this.physics, 0, 0, "enemy"));
        this.enemies.push(new Enemy(this.time, this.physics, 50, 0, "enemy"));

        for (const enemy of this.enemies) {
            this.physics.add.collider(enemy.sprite, this.walls);
            this.time.addEvent({
                delay: 1000,
                repeat: -1,
                callback: () => {
                    if (enemy.isActive) {
                        this.fireProjectile(enemy, [this.player]);
                    }
                },
            });
        }
    }

    update() {
        if (this.player.isActive) {
            this.player.update();
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
            this.physics.add.overlap(
                projectile.image,
                opponent.sprite,
                this.handleBulletAndWallCollision,
                null,
                this
            );
        }

        this.projectiles.push(projectile);
    }

    private createLevelWalls(
        level: number[][]
    ): Phaser.Physics.Arcade.StaticGroup {
        const wallImage = this.textures.get("wall").getSourceImage();
        const group = this.physics.add.staticGroup();

        for (let rowIndex = 0; rowIndex < level.length; rowIndex++) {
            for (
                let colIndex = 0;
                colIndex < level[rowIndex].length;
                colIndex++
            ) {
                if (level[rowIndex][colIndex]) {
                    group.create(
                        wallImage.width * 2 * colIndex + wallImage.width / 2,
                        wallImage.height * 2 * rowIndex + wallImage.height / 2,
                        "wall"
                    );
                    group.create(
                        wallImage.width * 2 * colIndex +
                            wallImage.width / 2 +
                            wallImage.width,
                        wallImage.height * 2 * rowIndex + wallImage.height / 2,
                        "wall"
                    );
                    group.create(
                        wallImage.width * 2 * colIndex + wallImage.width / 2,
                        wallImage.height * 2 * rowIndex +
                            wallImage.height / 2 +
                            wallImage.height,
                        "wall"
                    );
                    group.create(
                        wallImage.width * 2 * colIndex +
                            wallImage.width / 2 +
                            wallImage.width,
                        wallImage.height * 2 * rowIndex +
                            wallImage.height / 2 +
                            wallImage.height,
                        "wall"
                    );
                }
            }
        }

        return group;
    }

    private handleBulletAndWallCollision(
        bullet: Phaser.Types.Physics.Arcade.ImageWithDynamicBody,
        element: Phaser.Types.Physics.Arcade.GameObjectWithStaticBody
    ) {
        bullet.setVelocity(0);

        const explosion = this.physics.add.sprite(
            bullet.body.x,
            bullet.body.y,
            "explosion"
        );

        element.destroy();

        explosion.anims.play("explode", true);

        explosion.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            explosion.destroy();
            bullet.destroy();
        });
    }
}
