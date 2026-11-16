import Phaser from "phaser";
import { Service } from "typedi";

import { LEVELS } from "app/levels";
import { sound } from "app/sound";

export interface EndSceneData {
    won: boolean;
    levelIndex: number;
    hasNextLevel: boolean;
    /** Custom levels replay on ENTER instead of advancing */
    isCustom?: boolean;
    enemiesDestroyed: number;
    timeMs: number;
}

/**
 * Overlay shown on top of the paused MainScene when the round ends.
 * Colors follow public/assets/STYLE.md.
 */
@Service()
export default class EndScene extends Phaser.Scene {
    static readonly KEY = "end";

    constructor() {
        super({ key: EndScene.KEY });
    }

    create(data: EndSceneData): void {
        sound.play(data.won ? "win" : "lose");
        const { width, height } = this.scale;
        const cx = width / 2;
        const cy = height / 2;

        const theme = data.won
            ? {
                  fill: 0x1b5e20,
                  stroke: 0x66bb6a,
                  accent: "#ffeb3b",
                  title: "VICTORY",
              }
            : {
                  fill: 0xb71c1c,
                  stroke: 0xef5350,
                  accent: "#ffffff",
                  title: "GAME OVER",
              };

        // Dim the frozen battlefield
        this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);

        // Badge panel (same look as the booster badges)
        const panel = this.add.container(cx, cy);
        const bg = this.add.graphics();
        bg.fillStyle(theme.fill, 1);
        bg.lineStyle(4, theme.stroke, 1);
        bg.fillRoundedRect(-260, -150, 520, 300, 24);
        bg.strokeRoundedRect(-260, -150, 520, 300, 24);
        panel.add(bg);

        const title = this.add
            .text(0, -80, theme.title, {
                fontFamily: "Arial Black, Arial, sans-serif",
                fontSize: "64px",
                color: theme.accent,
                stroke: "#000000",
                strokeThickness: 6,
            })
            .setOrigin(0.5);

        const subtitle = this.add
            .text(
                0,
                -10,
                data.won
                    ? "All enemy tanks destroyed!"
                    : "Your tanks have been destroyed.",
                {
                    fontFamily: "Arial, sans-serif",
                    fontSize: "22px",
                    color: "#ffffff",
                }
            )
            .setOrigin(0.5);

        const seconds = Math.floor(data.timeMs / 1000);
        const time = `${Math.floor(seconds / 60)}:${String(
            seconds % 60
        ).padStart(2, "0")}`;
        const stats = this.add
            .text(
                0,
                35,
                `Enemies destroyed: ${data.enemiesDestroyed}    Time: ${time}`,
                {
                    fontFamily: "Arial, sans-serif",
                    fontSize: "18px",
                    color: "#ffffff",
                }
            )
            .setOrigin(0.5)
            .setAlpha(0.85);

        const prompt = this.add
            .text(0, 100, this.promptText(data), {
                fontFamily: "Arial, sans-serif",
                fontSize: "20px",
                color: theme.accent,
            })
            .setOrigin(0.5);
        const menuHint = this.add
            .text(0, 130, "ESC: Main menu", {
                fontFamily: "Arial, sans-serif",
                fontSize: "15px",
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setAlpha(0.7);

        panel.add([title, subtitle, stats, prompt, menuHint]);

        // Entrance + blinking prompt
        panel.setScale(0.6).setAlpha(0);
        this.tweens.add({
            targets: panel,
            scale: 1,
            alpha: 1,
            duration: 350,
            ease: "Back.Out",
        });
        this.tweens.add({
            targets: prompt,
            alpha: 0.3,
            duration: 600,
            yoyo: true,
            repeat: -1,
        });

        // Space is a fire key, so use Enter / R / click to avoid accidental restarts
        const proceed = () =>
            this.startLevel(
                data.won && !data.isCustom
                    ? data.hasNextLevel
                        ? data.levelIndex + 1
                        : 0
                    : data.levelIndex
            );
        this.input.keyboard.once("keydown-ENTER", proceed);
        this.input.keyboard.once("keydown-R", () =>
            this.startLevel(data.levelIndex)
        );
        this.input.keyboard.once("keydown-ESC", () => this.toMenu());
        this.input.once("pointerdown", proceed);
    }

    private promptText(data: EndSceneData) {
        if (!data.won) return "Press ENTER to retry";
        if (data.isCustom) return "Press ENTER to play again · ESC for menu";
        if (data.hasNextLevel)
            return `Press ENTER for level ${data.levelIndex + 2}: ${
                LEVELS[data.levelIndex + 1].name
            }`;
        return "All levels cleared! Press ENTER to start over";
    }

    private startLevel(levelIndex: number) {
        this.scene.stop(EndScene.KEY);
        // Player count is kept from the previous start data
        this.scene.get("preload").scene.restart({ levelIndex });
    }

    private toMenu() {
        this.scene.stop(EndScene.KEY);
        this.scene.stop("preload");
        this.scene.start("menu");
    }
}
