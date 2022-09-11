export class Tank {
    sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

    get x() {
        return this.sprite.x;
    }

    get y() {
        return this.sprite.y;
    }

    get angle() {
        return this.sprite.angle;
    }

    get isActive() {
        return this.sprite.active;
    }

    constructor(
        protected physics: Phaser.Physics.Arcade.ArcadePhysics,
        x: number,
        y: number,
        texture: string
    ) {
        this.sprite = this.physics.add.sprite(x, y, texture);
        this.sprite.setCollideWorldBounds(true);
    }
}
