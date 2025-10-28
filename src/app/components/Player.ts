import Phaser from "phaser";
import { Tank } from "./Tank";
import { PlayerControls } from "app/types/PlayerControls";

export class Player extends Tank {
    sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

    constructor(
        private controls: PlayerControls,
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
        return Math.round(this.x / this.cellDimensions[0]);
    }

    get mapY(): number {
        return Math.round(this.y / this.cellDimensions[1]);
    }

    get isFirePressed(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.controls.fire);
    }

    update() {
        this.sprite.setVelocity(0);
        this.sprite.setAngularVelocity(0);

        if (this.controls.left.isDown) {
            this.sprite.setAngularVelocity(-100);
        } else if (this.controls.right.isDown) {
            this.sprite.setAngularVelocity(100);
        }

        if (this.controls.up.isDown) {
            const velocity = this.physics.velocityFromAngle(
                this.sprite.angle - 90,
                100
            );
            this.sprite.setVelocity(velocity.x, velocity.y);
        } else if (this.controls.down.isDown) {
            const velocity = this.physics.velocityFromAngle(
                this.sprite.angle - 90,
                100
            );
            this.sprite.setVelocity(-velocity.x, -velocity.y);
        }
    }
}
