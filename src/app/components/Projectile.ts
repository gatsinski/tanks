import Phaser from "phaser";

export class Projectile {
    image: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
    damage: number;
    owner: any;
    rubbleCheckedTiles = new Set<string>();

    get x() {
        return this.image?.x ?? 0;
    }

    get y() {
        return this.image?.y ?? 0;
    }

    get angle() {
        return this.image?.angle ?? 0;
    }

    get isActive() {
        return this.image && this.image.active;
    }

    constructor(
        private physics: Phaser.Physics.Arcade.ArcadePhysics,
        x: number,
        y: number,
        angle: number,
        texture: string,
        damage = 1,
        owner: any = null
    ) {
        this.damage = damage;
        this.owner = owner;
        this.image = physics.add.image(x, y, texture);

        const velocity = this.physics.velocityFromAngle(angle + 90, 260);

        this.image.setAngle(angle);
        this.image.setVelocity(-velocity.x, -velocity.y);
    }

    destroy() {
        if (this.image && this.image.active) {
            this.image.destroy();
        }
    }

    update() {
        if (!this.image || !this.image.body) return;
        if (this.image.body.checkWorldBounds()) {
            this.image.destroy();
        }
    }
}
