import Phaser from "phaser";
import { Tank } from "./Tank";
import { PlayerControls } from "app/types/PlayerControls";

export class Player extends Tank {
    constructor(
        private controls: PlayerControls,
        physics: Phaser.Physics.Arcade.ArcadePhysics,
        mapCoordinates: [number, number],
        private cellDimensions: [number, number],
        texture: string
    ) {
        const x = mapCoordinates[0] * cellDimensions[0] + cellDimensions[0] / 2;
        const y = mapCoordinates[1] * cellDimensions[1] + cellDimensions[1] / 2;

        super(physics, x, y, texture, 3);
    }

    get mapX(): number {
        return Math.floor(this.x / this.cellDimensions[0]);
    }

    get mapY(): number {
        return Math.floor(this.y / this.cellDimensions[1]);
    }

    get isFirePressed(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.controls.fire);
    }

    update() {
        if (!this.isActive) return;

        this.sprite.setVelocity(0);
        this.sprite.setAngularVelocity(0);

        const currentSpeed = this.speed * this.speedModifier;

        if (this.controls.left.isDown) {
            this.sprite.setAngularVelocity(-130);
        } else if (this.controls.right.isDown) {
            this.sprite.setAngularVelocity(130);
        }

        if (this.controls.up.isDown) {
            const velocity = this.physics.velocityFromAngle(
                this.sprite.angle - 90,
                currentSpeed
            );
            this.sprite.setVelocity(velocity.x, velocity.y);
        } else if (this.controls.down.isDown) {
            const velocity = this.physics.velocityFromAngle(
                this.sprite.angle - 90,
                currentSpeed * 0.75
            );
            this.sprite.setVelocity(-velocity.x, -velocity.y);
        }
    }
}
