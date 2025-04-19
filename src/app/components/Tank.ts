import Phaser from "phaser";

export class Tank {
    sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    health: number;
    maxHealth: number;
    shield = 0; // shield allows absorbing 1 extra hit
    speed = 100;
    fireRate = 500; // ms between shots
    projectileDamage = 1;
    lastFired = 0;
    speedModifier = 1.0;

    // Base values to prevent unwanted accumulation
    static readonly BASE_SPEED = 100;
    static readonly BASE_FIRE_RATE = 500;
    static readonly BASE_DAMAGE = 1;

    // Boosted values
    static readonly BOOSTED_SPEED = 175; // Much faster speed bonus (+75%)
    static readonly BOOSTED_FIRE_RATE = 200; // Rapid fire (200ms vs 500ms, 2.5x rate)
    static readonly BOOSTED_DAMAGE = 2; // Doubled damage (destroys brick wall in 1 hit, kills shielded tank in 2 hits)

    get x() {
        return this.sprite?.x ?? 0;
    }

    get y() {
        return this.sprite?.y ?? 0;
    }

    get angle() {
        return this.sprite?.angle ?? 0;
    }

    get isActive() {
        return this.sprite && this.sprite.active;
    }

    constructor(
        protected physics: Phaser.Physics.Arcade.ArcadePhysics,
        x: number,
        y: number,
        protected baseTexture: string,
        health = 3
    ) {
        this.health = health;
        this.maxHealth = health;
        this.sprite = this.physics.add.sprite(x, y, this.getTextureForHealth(health));
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setDepth(5);
    }

    getTextureForHealth(health: number): string {
        // Full health (3): baseTexture ("tank" or "enemy")
        // 2 health (1 hit): baseTexture + "-damage-1"
        // 1 health (2 hits): baseTexture + "-damage-2"
        if (health >= 3) {
            return this.baseTexture;
        } else if (health === 2) {
            return `${this.baseTexture}-damage-1`;
        } else {
            return `${this.baseTexture}-damage-2`;
        }
    }

    updateTexture() {
        if (!this.isActive) return;
        const newTexture = this.getTextureForHealth(this.health);
        if (this.sprite.texture.key !== newTexture) {
            this.sprite.setTexture(newTexture);
        }
    }

    takeHit(damage = 1): boolean {
        let remainingDamage = damage;

        // If shielded, absorb 1 damage
        if (this.shield > 0) {
            this.shield -= 1;
            remainingDamage -= 1;
        }

        if (remainingDamage > 0) {
            this.health -= remainingDamage;
        }

        this.updateTexture();
        return this.health <= 0;
    }

    canAcceptBooster(type: "speed" | "fireRate" | "damage" | "shield" | "repair"): boolean {
        switch (type) {
            case "speed":
                return this.speed < Tank.BOOSTED_SPEED;
            case "fireRate":
                return this.fireRate > Tank.BOOSTED_FIRE_RATE;
            case "damage":
                return this.projectileDamage < Tank.BOOSTED_DAMAGE;
            case "shield":
                return this.shield <= 0; // Can pick up again only if currently consumed
            case "repair":
                return this.health < this.maxHealth; // Can pick up only if damaged
        }
    }

    applyBooster(type: "speed" | "fireRate" | "damage" | "shield" | "repair") {
        switch (type) {
            case "speed":
                this.speed = Tank.BOOSTED_SPEED;
                break;
            case "fireRate":
                this.fireRate = Tank.BOOSTED_FIRE_RATE;
                break;
            case "damage":
                this.projectileDamage = Tank.BOOSTED_DAMAGE;
                break;
            case "shield":
                this.shield = 1;
                break;
            case "repair":
                this.health = this.maxHealth;
                this.updateTexture();
                break;
        }
    }
}
