import Phaser from "phaser";
import { Tank } from "./Tank";
import { PlayerControls } from "app/types/PlayerControls";
import type { TouchControls } from "./TouchControls";

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

    /** On-screen joystick + fire button (touch devices, player 1 only) */
    touch: TouchControls | null = null;

    get isFirePressed(): boolean {
        // Keyboard fires per press; the touch button auto-fires while held
        const key = Phaser.Input.Keyboard.JustDown(this.controls.fire);
        return key || !!this.touch?.isFireDown;
    }

    update() {
        if (!this.isActive) return;

        this.sprite.setVelocity(0);
        this.sprite.setAngularVelocity(0);

        const currentSpeed = this.speed * this.speedModifier;

        const t = this.touch?.pressed;
        const left = this.controls.left.isDown || !!t?.left;
        const right = this.controls.right.isDown || !!t?.right;
        const up = this.controls.up.isDown || !!t?.up;
        const down = this.controls.down.isDown || !!t?.down;

        if (left) {
            this.sprite.setAngularVelocity(-130);
        } else if (right) {
            this.sprite.setAngularVelocity(130);
        }

        if (up) {
            const velocity = this.physics.velocityFromAngle(
                this.sprite.angle - 90,
                currentSpeed
            );
            this.sprite.setVelocity(velocity.x, velocity.y);
        } else if (down) {
            const velocity = this.physics.velocityFromAngle(
                this.sprite.angle - 90,
                currentSpeed * 0.75
            );
            this.sprite.setVelocity(-velocity.x, -velocity.y);
        }
    }
}
