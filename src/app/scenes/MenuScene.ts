import Phaser from "phaser";
import { Service } from "typedi";

import {
    LEVELS,
    BRICK_WALL,
    CONCRETE_WALL,
    WATER,
    BUSH,
    PLAYER,
    AI_TANKS,
    ALLY,
    isEnemyTile,
    BOOSTER,
    LevelDefinition,
} from "app/levels";
import { loadCustomLevels, deleteCustomLevel } from "app/customLevels";
import EditorScene from "app/scenes/EditorScene";
import { sound } from "app/sound";

export interface GameStartData {
    levelIndex: number;
    playerCount: number;
    /** Custom level to play instead of LEVELS[levelIndex]; null clears it */
    customLevel?: LevelDefinition | null;
}

interface MenuItem {
    label: () => string;
    action: () => void;
    /** Optional left/right handler (for toggles) */
    adjust?: (dir: number) => void;
    /** Mouse click on the left half calls adjust(-1), right half adjust(1) */
    clickAdjusts?: boolean;
    /** Optional E / DEL handlers (custom level list) */
    edit?: () => void;
    remove?: () => void;
}

// Colors from public/assets/STYLE.md
const COLORS = {
    floor: 0x065c21,
    panel: 0x222222,
    accent: 0xffcc00,
    accentText: "#ffcc00",
    text: "#ffffff",
    mutedText: "#b0bec5",
};

const TILE_COLORS: Record<number, number> = {
    ...Object.fromEntries(
        Object.entries(AI_TANKS).map(([tile, team]) => [tile, team.color])
    ),
    [BRICK_WALL]: 0xa83232,
    [CONCRETE_WALL]: 0x78909c,
    [WATER]: 0x3385d6,
    [BUSH]: 0x42c447,
    [PLAYER]: 0xffeb3b,
    [BOOSTER]: 0xffcc00,
};

@Service()
export default class MenuScene extends Phaser.Scene {
    static readonly KEY = "menu";

    private playerCount = 1;
    private selectedLevel = 0;

    private page: Phaser.GameObjects.Container;
    private items: MenuItem[] = [];
    private itemViews: Phaser.GameObjects.Container[] = [];
    private focus = 0;
    private onBack: (() => void) | null = null;

    constructor() {
        super({ key: MenuScene.KEY });
    }

    create(): void {
        this.cameras.main.setBackgroundColor(COLORS.floor);
        this.drawBackdrop();
        this.showMainPage();

        const kb = this.input.keyboard;
        kb.on("keydown-UP", () => this.moveFocus(-1));
        kb.on("keydown-W", () => this.moveFocus(-1));
        kb.on("keydown-DOWN", () => this.moveFocus(1));
        kb.on("keydown-S", () => this.moveFocus(1));
        kb.on("keydown-LEFT", () => this.adjustFocused(-1));
        kb.on("keydown-A", () => this.adjustFocused(-1));
        kb.on("keydown-RIGHT", () => this.adjustFocused(1));
        kb.on("keydown-D", () => this.adjustFocused(1));
        kb.on("keydown-ENTER", () => this.activateFocused());
        kb.on("keydown-SPACE", () => this.activateFocused());
        kb.on("keydown-ESC", () => this.onBack?.());
        kb.on("keydown-E", () => this.items[this.focus]?.edit?.());
        kb.on("keydown-DELETE", () => this.items[this.focus]?.remove?.());

        // Keep labels (Settings page) in sync with the global M toggle
        const refresh = () => this.setFocus(this.focus);
        this.game.events.on("sound-changed", refresh);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
            this.game.events.off("sound-changed", refresh)
        );
    }

    // ---------- Pages ----------

    private showMainPage() {
        this.resetPage();
        const { width } = this.scale;

        this.page.add(
            this.add
                .text(width / 2, 170, "TANKS", {
                    fontFamily: "Arial Black, Arial, sans-serif",
                    fontSize: "112px",
                    color: COLORS.accentText,
                    stroke: "#000000",
                    strokeThickness: 10,
                })
                .setOrigin(0.5)
        );
        this.page.add(
            this.add
                .text(width / 2, 255, "2D arcade tank battle", {
                    fontFamily: "Arial, sans-serif",
                    fontSize: "22px",
                    color: COLORS.text,
                })
                .setOrigin(0.5)
        );

        this.setItems(
            [
                {
                    label: () => "Start New Game",
                    action: () => this.startGame(0),
                },
                {
                    label: () => "Level Select",
                    action: () => this.showLevelSelect(),
                },
                {
                    label: () => "Level Editor",
                    action: () => this.showCustomLevels(),
                },
                {
                    label: () => `Players:  ◀ ${this.playerCount} ▶`,
                    action: () => this.togglePlayers(1),
                    adjust: (dir) => this.togglePlayers(dir),
                },
                {
                    label: () => "Settings",
                    action: () => this.showSettings(),
                },
            ],
            width / 2,
            380
        );

        this.page.add(
            this.add
                .text(
                    width / 2,
                    this.scale.height - 60,
                    "↑ ↓ to choose · ENTER to confirm · P1: Arrows + Space · P2: WASD + F",
                    {
                        fontFamily: "Arial, sans-serif",
                        fontSize: "16px",
                        color: COLORS.mutedText,
                    }
                )
                .setOrigin(0.5)
        );
        this.onBack = null;
    }

    private showLevelSelect() {
        this.resetPage();
        const { width } = this.scale;

        this.page.add(
            this.add
                .text(width / 2, 90, "SELECT LEVEL", {
                    fontFamily: "Arial Black, Arial, sans-serif",
                    fontSize: "56px",
                    color: COLORS.accentText,
                    stroke: "#000000",
                    strokeThickness: 6,
                })
                .setOrigin(0.5)
        );

        const cardW = 340;
        const gap = 40;
        const totalW = LEVELS.length * cardW + (LEVELS.length - 1) * gap;
        const startX = (width - totalW) / 2 + cardW / 2;

        const items: MenuItem[] = LEVELS.map((level, i) => ({
            label: () => `${i + 1}. ${level.name}`,
            action: () => this.startGame(i),
            adjust: (dir) => this.moveFocus(dir),
        }));
        items.push({ label: () => "Back", action: () => this.showMainPage() });

        this.items = items;
        this.itemViews = [];

        LEVELS.forEach((level, i) => {
            const card = this.buildLevelCard(
                startX + i * (cardW + gap),
                380,
                cardW,
                i
            );
            this.itemViews.push(card);
            this.page.add(card);
        });

        const back = this.buildButton(width / 2, 660, 260, items.length - 1);
        this.itemViews.push(back);
        this.page.add(back);

        this.page.add(
            this.add
                .text(
                    width / 2,
                    this.scale.height - 60,
                    "← → to choose · ENTER to play · ESC to go back",
                    {
                        fontFamily: "Arial, sans-serif",
                        fontSize: "16px",
                        color: COLORS.mutedText,
                    }
                )
                .setOrigin(0.5)
        );

        this.onBack = () => this.showMainPage();
        this.setFocus(this.selectedLevel);
    }

    private showCustomLevels(focus = 0) {
        this.resetPage();
        const { width } = this.scale;
        const levels = loadCustomLevels().sort(
            (a, b) => b.updatedAt - a.updatedAt
        );

        this.page.add(
            this.add
                .text(width / 2, 90, "CUSTOM LEVELS", {
                    fontFamily: "Arial Black, Arial, sans-serif",
                    fontSize: "56px",
                    color: COLORS.accentText,
                    stroke: "#000000",
                    strokeThickness: 6,
                })
                .setOrigin(0.5)
        );

        // Show at most 6 saved levels to keep the page within the screen
        const shown = levels.slice(0, 6);
        const items: MenuItem[] = [
            {
                label: () => "+ Create New Level",
                action: () => this.scene.start(EditorScene.KEY, {}),
            },
            ...shown.map((level) => ({
                label: () => `▶ ${level.name}`,
                action: () => this.playCustom(level),
                edit: () => this.scene.start(EditorScene.KEY, { level }),
                remove: () => {
                    deleteCustomLevel(level.id);
                    this.showCustomLevels(this.focus);
                },
            })),
            { label: () => "Back", action: () => this.showMainPage() },
        ];
        this.setItems(items, width / 2, 190, 70, 520);
        if (levels.length > shown.length)
            this.page.add(
                this.add
                    .text(
                        width / 2,
                        190 + items.length * 70 - 20,
                        `+${
                            levels.length - shown.length
                        } more (delete some to see them)`,
                        {
                            fontFamily: "Arial, sans-serif",
                            fontSize: "14px",
                            color: COLORS.mutedText,
                        }
                    )
                    .setOrigin(0.5)
            );

        this.page.add(
            this.add
                .text(
                    width / 2,
                    this.scale.height - 60,
                    "ENTER to play · E to edit · DEL to delete · ESC to go back",
                    {
                        fontFamily: "Arial, sans-serif",
                        fontSize: "16px",
                        color: COLORS.mutedText,
                    }
                )
                .setOrigin(0.5)
        );
        this.onBack = () => this.showMainPage();
        this.setFocus(focus);
    }

    private showSettings() {
        this.resetPage();
        const { width } = this.scale;

        this.page.add(
            this.add
                .text(width / 2, 90, "SETTINGS", {
                    fontFamily: "Arial Black, Arial, sans-serif",
                    fontSize: "56px",
                    color: COLORS.accentText,
                    stroke: "#000000",
                    strokeThickness: 6,
                })
                .setOrigin(0.5)
        );

        const toggleSound = () => {
            sound.setEnabled(!sound.enabled);
            this.setFocus(this.focus);
        };
        const changeVolume = (dir: number) => {
            sound.setVolume(sound.volume + dir * 10);
            if (!sound.enabled) sound.setEnabled(true);
            this.setFocus(this.focus);
            sound.play("menuMove");
        };

        this.setItems(
            [
                {
                    label: () => `Sound:  ◀ ${sound.enabled ? "ON" : "OFF"} ▶`,
                    action: toggleSound,
                    adjust: toggleSound,
                },
                {
                    label: () => {
                        const filled = Math.round(sound.volume / 10);
                        const bar =
                            "█".repeat(filled) + "░".repeat(10 - filled);
                        return `Volume:  ◀ ${bar} ${sound.volume}% ▶`;
                    },
                    action: () => changeVolume(1),
                    adjust: changeVolume,
                    clickAdjusts: true,
                },
                { label: () => "Back", action: () => this.showMainPage() },
            ],
            width / 2,
            300,
            80,
            520
        );

        this.page.add(
            this.add
                .text(
                    width / 2,
                    this.scale.height - 60,
                    "← → to change · ENTER to toggle · ESC to go back",
                    {
                        fontFamily: "Arial, sans-serif",
                        fontSize: "16px",
                        color: COLORS.mutedText,
                    }
                )
                .setOrigin(0.5)
        );
        this.onBack = () => this.showMainPage();
    }

    private playCustom(level: LevelDefinition) {
        const data: GameStartData = {
            levelIndex: 0,
            playerCount: this.playerCount,
            customLevel: { ...level, grid: level.grid.map((r) => [...r]) },
        };
        this.scene.start("preload", data);
    }

    // ---------- Widgets ----------

    private setItems(
        items: MenuItem[],
        x: number,
        y: number,
        spacing = 80,
        w = 380
    ) {
        this.items = items;
        this.itemViews = items.map((_, i) => {
            const view = this.buildButton(x, y + i * spacing, w, i);
            this.page.add(view);
            return view;
        });
        this.setFocus(0);
    }

    private buildButton(x: number, y: number, w: number, index: number) {
        const h = 60;
        const container = this.add.container(x, y);
        const bg = this.add.graphics();
        const text = this.add
            .text(0, 0, this.items[index].label(), {
                fontFamily: "Arial, sans-serif",
                fontSize: "26px",
                color: COLORS.text,
            })
            .setOrigin(0.5);
        container.add([bg, text]);
        container.setData({ bg, text, w, h, index });
        this.makeInteractive(container, w, h, index);
        return container;
    }

    private buildLevelCard(x: number, y: number, w: number, index: number) {
        const level = LEVELS[index];
        const h = 320;
        const container = this.add.container(x, y);
        const bg = this.add.graphics();

        // Mini-map preview
        const grid = level.grid;
        const cell = Math.floor((w - 40) / grid[0].length);
        const mapW = cell * grid[0].length;
        const mapH = cell * grid.length;
        const map = this.add.graphics();
        const mx = -mapW / 2;
        const my = -h / 2 + 24;
        map.fillStyle(COLORS.floor, 1);
        map.fillRect(mx, my, mapW, mapH);
        grid.forEach((row, r) =>
            row.forEach((t, c) => {
                const color = TILE_COLORS[t];
                if (color === undefined) return;
                map.fillStyle(color, 1);
                map.fillRect(mx + c * cell, my + r * cell, cell, cell);
            })
        );

        const enemyTiles = grid.flat().filter(isEnemyTile);
        const teamCount = new Set(enemyTiles).size;
        const allies = grid.flat().filter((t) => t === ALLY).length;
        const text = this.add
            .text(0, my + mapH + 34, `${index + 1}. ${level.name}`, {
                fontFamily: "Arial, sans-serif",
                fontSize: "26px",
                color: COLORS.text,
            })
            .setOrigin(0.5);
        const desc = this.add
            .text(
                0,
                my + mapH + 72,
                `${level.description}\n${enemyTiles.length} enemy tanks · ${teamCount} teams` +
                    (allies ? ` · ${allies} allies` : ""),
                {
                    fontFamily: "Arial, sans-serif",
                    fontSize: "16px",
                    color: COLORS.mutedText,
                    align: "center",
                }
            )
            .setOrigin(0.5);

        container.add([bg, map, text, desc]);
        container.setData({ bg, text, w, h, index });
        this.makeInteractive(container, w, h, index);
        return container;
    }

    private makeInteractive(
        container: Phaser.GameObjects.Container,
        w: number,
        h: number,
        index: number
    ) {
        container.setSize(w, h);
        container.setInteractive({ useHandCursor: true });
        container.on("pointerover", () => this.setFocus(index));
        container.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            this.setFocus(index);
            const item = this.items[index];
            if (item.clickAdjusts && item.adjust) {
                item.adjust(pointer.worldX < container.x ? -1 : 1);
                return;
            }
            this.activateFocused();
        });
    }

    private redrawItem(view: Phaser.GameObjects.Container, focused: boolean) {
        const { bg, text, w, h, index } = view.data.values;
        bg.clear();
        bg.fillStyle(focused ? 0x333333 : COLORS.panel, focused ? 1 : 0.85);
        bg.lineStyle(focused ? 3 : 2, focused ? COLORS.accent : 0x546e7a, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
        text.setText(this.items[index].label());
        text.setColor(focused ? COLORS.accentText : COLORS.text);
        view.setScale(focused ? 1.04 : 1);
    }

    // ---------- Focus / actions ----------

    private setFocus(index: number) {
        this.focus = Phaser.Math.Clamp(index, 0, this.items.length - 1);
        this.itemViews.forEach((v, i) => this.redrawItem(v, i === this.focus));
    }

    private activateFocused() {
        sound.play("menuSelect");
        this.items[this.focus]?.action();
    }

    private moveFocus(dir: number) {
        sound.play("menuMove");
        const n = this.items.length;
        this.setFocus((this.focus + dir + n) % n);
        if (this.focus < LEVELS.length && this.onBack)
            this.selectedLevel = this.focus;
    }

    private adjustFocused(dir: number) {
        this.items[this.focus]?.adjust?.(dir);
    }

    private togglePlayers(dir: number) {
        this.playerCount =
            Phaser.Math.Wrap(this.playerCount - 1 + dir, 0, 2) + 1;
        this.setFocus(this.focus);
    }

    private startGame(levelIndex: number) {
        this.selectedLevel = levelIndex;
        const data: GameStartData = {
            levelIndex,
            playerCount: this.playerCount,
            customLevel: null,
        };
        this.scene.start("preload", data);
    }

    private resetPage() {
        this.page?.destroy(true);
        this.page = this.add.container(0, 0);
        this.items = [];
        this.itemViews = [];
    }

    private drawBackdrop() {
        // Faint brick border, matching the in-game walls
        const { width, height } = this.scale;
        const g = this.add.graphics();
        g.fillStyle(0x2b0000, 0.35);
        for (let x = 0; x < width; x += 40) {
            g.fillRect(x + 1, 1, 38, 38);
            g.fillRect(x + 1, height - 39, 38, 38);
        }
        for (let y = 40; y < height - 40; y += 40) {
            g.fillRect(1, y + 1, 38, 38);
            g.fillRect(width - 39, y + 1, 38, 38);
        }
    }
}
