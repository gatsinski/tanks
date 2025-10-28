import { Tank } from "./Tank";
import EasyStar from "easystarjs";

export class Enemy extends Tank {
    movementInProgress: number;

    private easystar: EasyStar.js;

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

        this.easystar = new EasyStar.js();
        this.easystar.setGrid(this.map);
        this.easystar.setAcceptableTiles([0, 2, 3]);
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
        // Find Path
        this.easystar.findPath(
            this.mapX,
            this.mapY,
            playerX,
            playerY,
            (path) => {
                if (path && path[1]) {
                    console.error("Path found", path);
                    this.moveToPosition(path[1]); // The first step is always the current position
                } else {
                    console.error("Path not found", playerX, playerY, this.map);
                }
            }
        );

        this.easystar.calculate(); // Execute pathfinding
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

    findPathToNearestPlayer(players: Array<{ mapX: number; mapY: number }>) {
        if (players.length === 0) return;

        let shortestPath: Array<{ x: number; y: number }> | null = null;
        let shortestDistance = Infinity;
        let pathsCalculated = 0;
        const totalPlayers = players.length;

        players.forEach((player) => {
            this.easystar.findPath(
                this.mapX,
                this.mapY,
                player.mapX,
                player.mapY,
                (path) => {
                    pathsCalculated++;

                    // If path is found and is shorter than current shortest
                    if (
                        path &&
                        path.length > 0 &&
                        path.length < shortestDistance
                    ) {
                        shortestPath = path;
                        shortestDistance = path.length;
                    }

                    // When all paths are calculated, move to the nearest player
                    if (pathsCalculated === totalPlayers) {
                        if (shortestPath && shortestPath[1]) {
                            console.log(
                                "Moving to nearest player, path length:",
                                shortestDistance
                            );
                            this.moveToPosition(shortestPath[1]);
                        } else {
                            console.log("No path found to any player");
                        }
                    }
                }
            );
        });

        this.easystar.calculate();
    }

    // Alternative: Grid distance approach (faster, less accurate)
    findPathToNearestPlayerByDistance(
        players: Array<{ mapX: number; mapY: number }>
    ) {
        if (players.length === 0) return;

        // Find nearest player by grid distance first
        let nearestPlayer = players[0];
        let shortestDistance =
            Math.abs(this.mapX - players[0].mapX) +
            Math.abs(this.mapY - players[0].mapY);

        for (let i = 1; i < players.length; i++) {
            const distance =
                Math.abs(this.mapX - players[i].mapX) +
                Math.abs(this.mapY - players[i].mapY);
            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestPlayer = players[i];
            }
        }

        // Then find path to nearest player
        this.easystar.findPath(
            this.mapX,
            this.mapY,
            nearestPlayer.mapX,
            nearestPlayer.mapY,
            (path) => {
                if (path && path[1]) {
                    console.log("Path found to nearest player");
                    this.moveToPosition(path[1]);
                } else {
                    console.log("Path not found to nearest player");
                }
            }
        );

        this.easystar.calculate();
    }
}
