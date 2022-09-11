import Phaser from "phaser";
import { Tank } from "./Tank";

export class Player extends Tank {
    sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

    constructor(
        private cursors: Phaser.Types.Input.Keyboard.CursorKeys,
        physics: Phaser.Physics.Arcade.ArcadePhysics,
        x: number,
        y: number,
        texture: string
    ) {
        super(physics, x, y, texture);
    }

    update() {
        this.sprite.setVelocity(0);
        this.sprite.setAngularVelocity(0);

        if (this.cursors.left.isDown) {
            this.sprite.setAngularVelocity(-100);
        } else if (this.cursors.right.isDown) {
            this.sprite.setAngularVelocity(100);
        }

        if (this.cursors.up.isDown) {
            const velocity = this.physics.velocityFromAngle(
                this.sprite.angle - 90,
                100
            );
            this.sprite.setVelocity(velocity.x, velocity.y);
        } else if (this.cursors.down.isDown) {
            const velocity = this.physics.velocityFromAngle(
                this.sprite.angle - 90,
                100
            );
            this.sprite.setVelocity(-velocity.x, -velocity.y);
        }
    }
}
