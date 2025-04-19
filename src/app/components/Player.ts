import Phaser from "phaser";
import { Tank } from "./Tank";

export class Player extends Tank {
    sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

    constructor(
        private cursors: Phaser.Types.Input.Keyboard.CursorKeys,
        physics: Phaser.Physics.Arcade.ArcadePhysics,
        mapCoordinates: [number, number],
        private cellDimensions: [number, number],
        texture: string
    ) {
        const x = mapCoordinates[0] * cellDimensions[0];
        const y = mapCoordinates[1] * cellDimensions[1];

        super(physics, x, y, texture);
    }

    get mapX(): number {
        return Math.floor(this.x / this.cellDimensions[0]);
    }

    get mapY(): number {
        return Math.floor(this.y / this.cellDimensions[1]);
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
