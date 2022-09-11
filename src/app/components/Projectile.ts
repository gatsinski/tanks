export class Projectile {
    image: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;

    get x() {
        return this.image.x;
    }

    get y() {
        return this.image.y;
    }

    get angle() {
        return this.image.angle;
    }

    get isActive() {
        return this.image.active;
    }

    constructor(
        private physics: Phaser.Physics.Arcade.ArcadePhysics,
        x: number,
        y: number,
        angle: number,
        texture: string
    ) {
        this.image = physics.add.image(x, y, texture);

        const velocity = this.physics.velocityFromAngle(angle + 90, 200);

        this.image.setAngle(angle);
        this.image.setVelocity(-velocity.x, -velocity.y);
    }

    update() {
        if (this.image.body.checkWorldBounds()) {
            this.image.destroy();
        }
    }
}
