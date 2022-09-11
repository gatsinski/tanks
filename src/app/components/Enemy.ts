import { Tank } from "./Tank";

export class Enemy extends Tank {
    movementInProgress: number;

    constructor(
        private time: Phaser.Time.Clock,
        physics: Phaser.Physics.Arcade.ArcadePhysics,
        x: number,
        y: number,
        texture: string
    ) {
        super(physics, x, y, texture);
    }

    update() {
        if (this.movementInProgress) {
            if (this.movementInProgress === Phaser.LEFT) {
                this.sprite.setAngularVelocity(-100);
            } else if (this.movementInProgress === Phaser.RIGHT) {
                this.sprite.setAngularVelocity(100);
            } else if (this.movementInProgress === Phaser.UP) {
                const velocity = this.physics.velocityFromAngle(
                    this.sprite.angle - 90,
                    100
                );
                this.sprite.setVelocity(velocity.x, velocity.y);
            }
            return;
        }

        this.time.addEvent({
            delay: 1000,
            callback: () => {
                this.movementInProgress = null;
            },
        });

        this.sprite.setVelocity(0);
        this.sprite.setAngularVelocity(0);

        const movementChoices = [Phaser.LEFT, Phaser.RIGHT, Phaser.UP];
        this.movementInProgress =
            movementChoices[Math.floor(Math.random() * movementChoices.length)];
    }
}
