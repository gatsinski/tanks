import Phaser from "phaser";
import { Tank } from "./Tank";
import { EMPTY, BRICK_WALL, DAMAGED_BRICK_WALL, RUBBLE, WATER, BUSH, CONCRETE_WALL, WRECKAGE } from "app/levels";

interface PathNode {
    x: number;
    y: number;
    g: number;
    f: number;
    parent: PathNode | null;
}

export class Enemy extends Tank {
    private isRotating = false;
    private currentTargetPos: { x: number; y: number } | null = null;

    constructor(
        private time: Phaser.Time.Clock,
        physics: Phaser.Physics.Arcade.ArcadePhysics,
        private tweens: Phaser.Tweens.TweenManager,
        mapCoordinates: [number, number],
        private cellDimensions: [number, number],
        texture: string,
        private map: number[][]
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

    get isMoving(): boolean {
        return this.currentTargetPos !== null;
    }

    update() {
        if (!this.isActive) return;

        if (this.currentTargetPos) {
            const distance = Phaser.Math.Distance.Between(
                this.x,
                this.y,
                this.currentTargetPos.x,
                this.currentTargetPos.y
            );

            // Reached waypoint target
            if (distance < 4) {
                this.sprite.setVelocity(0, 0);
                this.currentTargetPos = null;
            } else {
                const angleRad = Phaser.Math.Angle.Between(
                    this.x,
                    this.y,
                    this.currentTargetPos.x,
                    this.currentTargetPos.y
                );
                const currentSpeed = this.speed * this.speedModifier;
                const vx = Math.cos(angleRad) * currentSpeed;
                const vy = Math.sin(angleRad) * currentSpeed;
                this.sprite.setVelocity(vx, vy);
            }
        } else {
            this.sprite.setVelocity(0, 0);
        }
    }

    findPathToNearestPlayer(
        players: Array<{ x: number; y: number; mapX: number; mapY: number; isActive: boolean }>,
        onShouldFire?: () => void,
        boosters: Array<{ x: number; y: number; type: "speed" | "fireRate" | "damage" | "shield" | "repair" }> = []
    ) {
        if (!this.isActive || this.isMoving || this.isRotating) return;

        const activePlayers = players.filter((p) => p.isActive);
        if (activePlayers.length === 0) return;

        // Check if enemy has direct straight line of sight (cardinal or diagonal) to player
        for (const player of activePlayers) {
            if (this.hasLineOfSight(player.mapX, player.mapY)) {
                // Adjust angle to shoot straight at player and continue moving towards the player
                this.turnTowardsExact(player.x, player.y, () => {
                    if (onShouldFire) onShouldFire();
                });

                // Calculate next step straight towards the player so enemy does not stop
                const stepX = Math.sign(player.mapX - this.mapX);
                const stepY = Math.sign(player.mapY - this.mapY);
                const nextStep = { x: this.mapX + stepX, y: this.mapY + stepY };

                if (this.canMoveDiagonally(this.mapX, this.mapY, nextStep.x, nextStep.y)) {
                    const targetPixelX = nextStep.x * this.cellDimensions[0] + this.cellDimensions[0] / 2;
                    const targetPixelY = nextStep.y * this.cellDimensions[1] + this.cellDimensions[1] / 2;
                    this.currentTargetPos = { x: targetPixelX, y: targetPixelY };
                }
                return;
            }
        }

        // Opportunistic booster targeting: If an accessible booster that enemy can accept is nearby (<= 6 tiles)
        let targetBooster: { x: number; y: number } | null = null;
        let shortestBoosterDist = Infinity;
        let boosterPath: Array<{ x: number; y: number }> | null = null;

        for (const booster of boosters) {
            if (this.canAcceptBooster(booster.type)) {
                const bMapX = Math.floor(booster.x / this.cellDimensions[0]);
                const bMapY = Math.floor(booster.y / this.cellDimensions[1]);
                const gridDist = Phaser.Math.Distance.Between(this.mapX, this.mapY, bMapX, bMapY);

                if (gridDist <= 6 && gridDist < shortestBoosterDist) {
                    const path = this.findAStarPath(this.mapX, this.mapY, bMapX, bMapY);
                    if (path && path.length > 0 && path.length < shortestBoosterDist) {
                        shortestBoosterDist = path.length;
                        targetBooster = { x: bMapX, y: bMapY };
                        boosterPath = path;
                    }
                }
            }
        }

        if (boosterPath && boosterPath[1]) {
            const nextStep = boosterPath[1];
            const tile = this.map[nextStep.y]?.[nextStep.x];

            if (tile === BRICK_WALL || tile === DAMAGED_BRICK_WALL) {
                const targetPixelX = nextStep.x * this.cellDimensions[0] + this.cellDimensions[0] / 2;
                const targetPixelY = nextStep.y * this.cellDimensions[1] + this.cellDimensions[1] / 2;
                this.turnTowardsExact(targetPixelX, targetPixelY, () => {
                    if (onShouldFire) onShouldFire();
                });
            } else {
                this.moveToPosition(nextStep);
            }
            return;
        }

        let shortestPath: Array<{ x: number; y: number }> | null = null;
        let shortestDistance = Infinity;

        // Calculate path to each player considering open tiles and breakable wall tiles
        for (const player of activePlayers) {
            const path = this.findAStarPath(this.mapX, this.mapY, player.mapX, player.mapY);
            if (path && path.length > 0 && path.length < shortestDistance) {
                shortestPath = path;
                shortestDistance = path.length;
            }
        }

        if (shortestPath && shortestPath[1]) {
            const nextStep = shortestPath[1];
            const tile = this.map[nextStep.y]?.[nextStep.x];

            // If next tile is breakable wall, rotate towards it and fire to destroy it!
            if (tile === BRICK_WALL || tile === DAMAGED_BRICK_WALL) {
                const targetPixelX = nextStep.x * this.cellDimensions[0] + this.cellDimensions[0] / 2;
                const targetPixelY = nextStep.y * this.cellDimensions[1] + this.cellDimensions[1] / 2;
                this.turnTowardsExact(targetPixelX, targetPixelY, () => {
                    if (onShouldFire) onShouldFire();
                });
            } else {
                this.moveToPosition(nextStep);
            }
        }
    }

    private findAStarPath(
        startX: number,
        startY: number,
        endX: number,
        endY: number
    ): Array<{ x: number; y: number }> | null {
        const rows = this.map.length;
        const cols = this.map[0].length;

        // Tile costs: breakable walls have higher cost but are viable path options
        const tileCostMap: Record<number, number> = {
            [EMPTY]: 1.0,
            [BUSH]: 1.3,
            [RUBBLE]: 1.6,
            [WRECKAGE]: 1.6,
            [WATER]: 2.2,
            [DAMAGED_BRICK_WALL]: 3.5, // Breakable wall (1 hit remaining)
            [BRICK_WALL]: 5.5,         // Breakable wall (2 hits remaining)
        };

        const isPassable = (x: number, y: number) => {
            if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
            const tile = this.map[y][x];
            return tile !== CONCRETE_WALL;
        };

        const isWalkableNonWall = (x: number, y: number) => {
            if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
            const t = this.map[y][x];
            return t === EMPTY || t === RUBBLE || t === WRECKAGE || t === WATER || t === BUSH;
        };

        const openSet: PathNode[] = [
            { x: startX, y: startY, g: 0, f: Phaser.Math.Distance.Between(startX, startY, endX, endY), parent: null }
        ];
        const closedSet = new Set<string>();
        const key = (x: number, y: number) => `${x},${y}`;

        while (openSet.length > 0) {
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift()!;

            if (current.x === endX && current.y === endY) {
                const path: Array<{ x: number; y: number }> = [];
                let curr: PathNode | null = current;
                while (curr) {
                    path.unshift({ x: curr.x, y: curr.y });
                    curr = curr.parent;
                }
                return path;
            }

            closedSet.add(key(current.x, current.y));

            // Check 8 neighboring tiles (cardinal and diagonal)
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = current.x + dx;
                    const ny = current.y + dy;

                    if (!isPassable(nx, ny)) continue;
                    if (closedSet.has(key(nx, ny))) continue;

                    // Strict corner-cutting prevention:
                    // When moving diagonally, both orthogonal neighbors must be walkable non-walls
                    // and destination cannot be a wall (must approach walls cardinally to shoot them)
                    if (dx !== 0 && dy !== 0) {
                        if (!isWalkableNonWall(current.x + dx, current.y) || !isWalkableNonWall(current.x, current.y + dy)) {
                            continue;
                        }
                        if (!isWalkableNonWall(nx, ny)) {
                            continue;
                        }
                    }

                    const isDiag = dx !== 0 && dy !== 0;
                    const tile = this.map[ny][nx];
                    const tileCost = tileCostMap[tile] ?? 1.0;
                    const moveCost = (isDiag ? 1.414 : 1.0) * tileCost;

                    const g = current.g + moveCost;
                    const h = Phaser.Math.Distance.Between(nx, ny, endX, endY);
                    const f = g + h;

                    const existing = openSet.find((n) => n.x === nx && n.y === ny);
                    if (existing) {
                        if (g < existing.g) {
                            existing.g = g;
                            existing.f = f;
                            existing.parent = current;
                        }
                    } else {
                        openSet.push({ x: nx, y: ny, g, f, parent: current });
                    }
                }
            }
        }

        return null;
    }

    hasLineOfSight(targetX: number, targetY: number): boolean {
        const dx = targetX - this.mapX;
        const dy = targetY - this.mapY;

        // Must be in a straight line: vertical, horizontal, or diagonal (|dx| === |dy|)
        const isHorizontal = dy === 0 && dx !== 0;
        const isVertical = dx === 0 && dy !== 0;
        const isDiagonal = Math.abs(dx) === Math.abs(dy) && dx !== 0;

        if (!isHorizontal && !isVertical && !isDiagonal) {
            return false;
        }

        const stepX = Math.sign(dx);
        const stepY = Math.sign(dy);

        let curX = this.mapX + stepX;
        let curY = this.mapY + stepY;

        while (curX !== targetX || curY !== targetY) {
            const tile = this.map[curY]?.[curX];
            if (tile !== EMPTY && tile !== BUSH && tile !== WATER && tile !== RUBBLE && tile !== WRECKAGE) {
                return false;
            }
            curX += stepX;
            curY += stepY;
        }

        return true;
    }

    turnTowardsExact(targetPixelX: number, targetPixelY: number, onCompleteAction?: () => void) {
        const angleRad = Phaser.Math.Angle.Between(this.x, this.y, targetPixelX, targetPixelY);
        const angleDeg = Phaser.Math.RadToDeg(angleRad) + 90;
        this.rotate(angleDeg, () => {
            if (onCompleteAction) onCompleteAction();
        });
    }

    private canMoveDiagonally(fromX: number, fromY: number, toX: number, toY: number): boolean {
        const dx = toX - fromX;
        const dy = toY - fromY;
        if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
            // Both orthogonal neighbors must be walkable
            const tile1 = this.map[fromY]?.[toX];
            const tile2 = this.map[toY]?.[fromX];
            const walkable = [EMPTY, RUBBLE, WRECKAGE, WATER, BUSH];
            return walkable.includes(tile1) && walkable.includes(tile2);
        }
        return true;
    }

    moveToPosition(position: { x: number; y: number }) {
        if (!this.canMoveDiagonally(this.mapX, this.mapY, position.x, position.y)) {
            // Cannot cut corner
            return;
        }

        const targetPixelX = position.x * this.cellDimensions[0] + this.cellDimensions[0] / 2;
        const targetPixelY = position.y * this.cellDimensions[1] + this.cellDimensions[1] / 2;

        const angleRad = Phaser.Math.Angle.Between(this.x, this.y, targetPixelX, targetPixelY);
        const targetAngle = Phaser.Math.RadToDeg(angleRad) + 90;

        this.rotate(targetAngle, () => {
            this.currentTargetPos = { x: targetPixelX, y: targetPixelY };
        });
    }

    rotate(targetAngle: number, onCompleteAction: () => void) {
        // Normalize angles to [-180, 180] for shortest rotation
        const currentAngle = Phaser.Math.Angle.WrapDegrees(this.sprite.angle);
        const desiredAngle = Phaser.Math.Angle.WrapDegrees(targetAngle);

        if (Math.abs(currentAngle - desiredAngle) < 2) {
            this.sprite.setAngle(desiredAngle);
            onCompleteAction();
            return;
        }

        this.isRotating = true;
        this.sprite.setVelocity(0, 0);

        this.tweens.add({
            targets: this.sprite,
            angle: desiredAngle,
            duration: 180,
            ease: "Linear",
            onComplete: () => {
                this.isRotating = false;
                onCompleteAction();
            },
        });
    }
}
