import Phaser from "phaser";
import { Service } from "typedi";

import { sound } from "app/sound";

/**
 * Always-on overlay above every other scene: handles the global M (mute)
 * hotkey and draws a clickable speaker indicator in the bottom-right corner.
 */
@Service()
export default class SoundScene extends Phaser.Scene {
    static readonly KEY = "sound-overlay";

    private icon: Phaser.GameObjects.Graphics;
    private hint: Phaser.GameObjects.Text;

    constructor() {
        super({ key: SoundScene.KEY, active: true });
    }

    create(): void {
        const x = this.scale.width - 26;
        const y = this.scale.height - 22;

        this.icon = this.add.graphics({ x, y });
        this.hint = this.add
            .text(x - 37, y, "M", {
                fontFamily: "Arial, sans-serif",
                fontSize: "13px",
                color: "#b0bec5",
            })
            .setOrigin(0.5);

        const hitArea = this.add
            .zone(x - 15, y, 66, 30)
            .setInteractive({ useHandCursor: true });
        hitArea.on("pointerdown", () => this.toggle());

        this.input.keyboard.on("keydown-M", () => this.toggle());
        this.redraw();
    }

    private toggle() {
        sound.setEnabled(!sound.enabled);
        // Audible confirmation when turning sound back on
        sound.play("menuSelect");
        this.redraw();
        // Let other scenes (e.g. the Settings page) refresh
        this.game.events.emit("sound-changed");
    }

    private redraw() {
        const g = this.icon;
        const on = sound.enabled;
        g.clear();

        // Backing pill for contrast on any background
        g.fillStyle(0x000000, 0.55);
        g.fillRoundedRect(-48, -14, 66, 28, 8);

        // Speaker body
        g.fillStyle(0xffffff, on ? 1 : 0.6);
        g.fillRect(-12, -4, 5, 8);
        g.fillTriangle(-9, 0, -2, -9, -2, 9);

        if (on) {
            // Sound waves
            g.lineStyle(2, 0xffffff, 1);
            g.beginPath();
            g.arc(0, 0, 5, -0.9, 0.9);
            g.strokePath();
            g.beginPath();
            g.arc(0, 0, 10, -0.9, 0.9);
            g.strokePath();
        } else {
            // Red cross
            g.lineStyle(2.5, 0xff5252, 1);
            g.lineBetween(3, -5, 13, 5);
            g.lineBetween(3, 5, 13, -5);
        }

        this.hint.setAlpha(on ? 0.8 : 1);
    }
}
