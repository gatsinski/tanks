import { Player } from "./Player";
import { Tank } from "./Tank";
import EasyStar from "easystarjs";

export class Enemy extends Tank {
    movementInProgress: number;

    constructor(
        private time: Phaser.Time.Clock,
        physics: Phaser.Physics.Arcade.ArcadePhysics,
        private tweens: Phaser.Tweens.TweenManager,
        mapCoordinates: [number, number],
        private cellDimensions: [number, number],
        texture: string,
        private map: number[][]
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
        // if (this.movementInProgress) {
        //     if (this.movementInProgress === Phaser.LEFT) {
        //         this.sprite.setAngularVelocity(-100);
        //     } else if (this.movementInProgress === Phaser.RIGHT) {
        //         this.sprite.setAngularVelocity(100);
        //     } else if (this.movementInProgress === Phaser.UP) {
        //         const velocity = this.physics.velocityFromAngle(
        //             this.sprite.angle - 90,
        //             100
        //         );
        //         this.sprite.setVelocity(velocity.x, velocity.y);
        //     }
        //     return;
        // }
        // this.time.addEvent({
        //     delay: 1000,
        //     callback: () => {
        //         this.movementInProgress = null;
        //     },
        // });
        // this.sprite.setVelocity(0);
        // this.sprite.setAngularVelocity(0);
        // const movementChoices = [Phaser.LEFT, Phaser.RIGHT, Phaser.UP];
        // this.movementInProgress =
        //     movementChoices[Math.floor(Math.random() * movementChoices.length)];
    }

    findPathToPlayer(playerX: number, playerY: number) {
        const easystar = new EasyStar.js();
        easystar.setGrid(this.map);
        easystar.setAcceptableTiles([0, 2, 3]);

        // Find Path
        easystar.findPath(this.mapX, this.mapY, playerX, playerY, (path) => {
            if (path && path[1]) {
                this.moveToPosition(path[1]); // The first step is always the current position
            } else {
                console.error("path not found", playerX, playerY, this.map);
            }
        });

        easystar.calculate(); // Execute pathfinding
    }

    moveToPosition(position: { x: number; y: number }) {
        const rotationAngles = {
            90: this.mapX < position.x,
            "-90": this.mapX > position.x,
            0: this.mapY > position.y,
            "-180": this.mapY < position.y,
        };

        for (const [angle, condition] of Object.entries(rotationAngles)) {
            if (condition) {
                this.rotate(+angle, () => {
                    this.move(position);
                });
                break;
            }
        }
    }

    rotate(targetAngle: number, onCompleteAction: () => void) {
        if (this.sprite.angle === targetAngle) {
            onCompleteAction();
            return;
        }

        this.tweens.add({
            targets: this.sprite, // The tank to rotate
            angle: targetAngle, // Target rotation angle
            duration: 500, // Duration of the rotation in milliseconds
            ease: "Linear", // Easing function for smooth rotation
            onComplete: function () {
                // Callback after rotation is finished
                onCompleteAction(); // Perform the next action
            },
        });
    }

    move(position: { x: number; y: number }) {
        this.tweens.add({
            targets: this.sprite,
            x: position.x * this.cellDimensions[0], // Move horizontally
            y: position.y * this.cellDimensions[1], // Move vertically
            duration: 500, // Movement duration (milliseconds)
            ease: "Linear", // Easing function for smooth motion
            onComplete: () => {
                // Perform actions after the movement
            },
        });
    }
}
