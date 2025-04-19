import Phaser from "phaser";
import { Service } from "typedi";

import {
    EMPTY,
    BRICK_WALL,
    CONCRETE_WALL,
    WATER,
    BUSH,
    BOOSTER,
    PLAYER,
    ALLY,
    ENEMY_RED,
    ENEMY_BLUE,
    ENEMY_PURPLE,
    ENEMY_STEEL,
    AI_TANKS,
    isEnemyTile,
} from "app/levels";
import {
    CustomLevel,
    newCustomLevelId,
    saveCustomLevel,
} from "app/customLevels";
import type { GameStartData } from "app/scenes/MenuScene";

export interface EditorSceneData {
    /** Level to edit; omitted to start a new one */
    level?: CustomLevel;
}

const COLS = 28;
const ROWS = 17;
const CELL = 40;
const GRID_Y = 50;
const PALETTE_X = 1140;

interface PaletteEntry {
    tile: number;
    label: string;
    texture: string;
    /** Rendered size of the texture inside a cell */
    size: number;
}

const PALETTE: PaletteEntry[] = [
    { tile: EMPTY, label: "Eraser", texture: "", size: 0 },
    { tile: BRICK_WALL, label: "Brick", texture: "wall", size: 40 },
    {
        tile: CONCRETE_WALL,
        label: "Concrete",
        texture: "concrete-wall",
        size: 40,
    },
    { tile: WATER, label: "Water", texture: "water", size: 40 },
    { tile: BUSH, label: "Bush", texture: "bush", size: 40 },
    { tile: BOOSTER, label: "Booster", texture: "booster", size: 30 },
    { tile: PLAYER, label: "Player", texture: "tank", size: 30 },
    { tile: ALLY, label: "Ally", texture: AI_TANKS[ALLY].texture, size: 30 },
    ...[ENEMY_RED, ENEMY_BLUE, ENEMY_PURPLE, ENEMY_STEEL].map((tile) => ({
        tile,
        label: `${AI_TANKS[tile].name} enemy`,
        texture: AI_TANKS[tile].texture,
        size: 30,
    })),
];

const textureFor = (tile: number) => PALETTE.find((p) => p.tile === tile);

const emptyGrid = () =>
    Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) =>
            r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1
                ? CONCRETE_WALL
                : EMPTY
        )
    );

const isBorder = (r: number, c: number) =>
    r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1;

/**
 * Paint-style level editor. Levels are saved to localStorage and can be
 * played from the "Level Editor" page in the menu.
 */
@Service()
export default class EditorScene extends Phaser.Scene {
    static readonly KEY = "editor";

    private level: CustomLevel;
    private selected = BRICK_WALL;
    private cells: (Phaser.GameObjects.Image | null)[][] = [];
    private paletteViews: Phaser.GameObjects.Graphics[] = [];
    private titleText: Phaser.GameObjects.Text;
    private messageText: Phaser.GameObjects.Text;
    private dirty = false;

    constructor() {
        super({ key: EditorScene.KEY });
    }

    init(data?: EditorSceneData): void {
        const src = data?.level;
        this.level = src
            ? { ...src, grid: src.grid.map((r) => [...r]) }
            : {
                  id: newCustomLevelId(),
                  name: "Untitled",
                  description: "A custom level.",
                  grid: emptyGrid(),
                  updatedAt: Date.now(),
              };
        this.selected = BRICK_WALL;
        this.dirty = false;
    }

    preload(): void {
        // Textures may already be cached by MainScene; only load missing ones
        const svgs: [string, number][] = [
            ["wall", 40],
            ["concrete-wall", 40],
            ["water", 40],
            ["bush", 40],
            ["booster", 30],
            ["tank", 30],
            ...Object.values(AI_TANKS).map(
                (t) => [t.texture, 30] as [string, number]
            ),
        ];
        for (const [key, size] of svgs) {
            if (!this.textures.exists(key))
                this.load.svg(key, `assets/${key}.svg`, {
                    width: size,
                    height: size,
                });
        }
    }

    create(): void {
        this.cameras.main.setBackgroundColor(0x222222);
        this.input.mouse.disableContextMenu();

        this.add
            .rectangle(0, GRID_Y, COLS * CELL, ROWS * CELL, 0x065c21)
            .setOrigin(0);
        this.drawGridLines();

        this.cells = this.level.grid.map((row, r) =>
            row.map((tile, c) => this.createCellImage(r, c, tile))
        );

        this.titleText = this.add
            .text(10, 12, "", {
                fontFamily: "Arial, sans-serif",
                fontSize: "22px",
                color: "#ffcc00",
            })
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", () => this.rename());
        this.messageText = this.add
            .text(PALETTE_X - 20, 15, "", {
                fontFamily: "Arial, sans-serif",
                fontSize: "16px",
                color: "#b0bec5",
            })
            .setOrigin(1, 0);
        this.updateTitle();

        this.buildPalette();
        this.buildToolbar();
        this.setupPainting();

        const kb = this.input.keyboard;
        kb.on("keydown-ESC", () => this.exit());
        kb.on("keydown", (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                this.save();
            }
        });
        PALETTE.slice(0, 10).forEach((p, i) =>
            kb.on(
                `keydown-${
                    [
                        "ONE",
                        "TWO",
                        "THREE",
                        "FOUR",
                        "FIVE",
                        "SIX",
                        "SEVEN",
                        "EIGHT",
                        "NINE",
                        "ZERO",
                    ][i]
                }`,
                () => this.select(p.tile)
            )
        );
    }

    // ---------- Grid ----------

    private drawGridLines() {
        const g = this.add.graphics();
        g.lineStyle(1, 0x000000, 0.15);
        for (let c = 0; c <= COLS; c++)
            g.lineBetween(c * CELL, GRID_Y, c * CELL, GRID_Y + ROWS * CELL);
        for (let r = 0; r <= ROWS; r++)
            g.lineBetween(0, GRID_Y + r * CELL, COLS * CELL, GRID_Y + r * CELL);
    }

    private createCellImage(r: number, c: number, tile: number) {
        const entry = textureFor(tile);
        if (!entry?.texture) return null;
        return this.add
            .image(
                c * CELL + CELL / 2,
                GRID_Y + r * CELL + CELL / 2,
                entry.texture
            )
            .setDisplaySize(entry.size, entry.size);
    }

    private setTile(r: number, c: number, tile: number) {
        if (isBorder(r, c) || this.level.grid[r][c] === tile) return;
        this.level.grid[r][c] = tile;
        this.cells[r][c]?.destroy();
        this.cells[r][c] = this.createCellImage(r, c, tile);
        if (!this.dirty) {
            this.dirty = true;
            this.updateTitle();
        }
    }

    private setupPainting() {
        const paint = (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return;
            const c = Math.floor(pointer.x / CELL);
            const r = Math.floor((pointer.y - GRID_Y) / CELL);
            if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
            this.setTile(
                r,
                c,
                pointer.rightButtonDown() ? EMPTY : this.selected
            );
        };
        this.input.on("pointerdown", paint);
        this.input.on("pointermove", paint);
    }

    // ---------- Palette & toolbar ----------

    private buildPalette() {
        const rowH = 48;
        PALETTE.forEach((entry, i) => {
            const y = GRID_Y + i * rowH;
            const bg = this.add.graphics();
            this.paletteViews.push(bg);
            if (entry.texture)
                this.add
                    .image(PALETTE_X + 24, y + rowH / 2, entry.texture)
                    .setDisplaySize(
                        Math.min(entry.size, 32),
                        Math.min(entry.size, 32)
                    );
            else
                this.add
                    .text(PALETTE_X + 24, y + rowH / 2, "✕", {
                        fontSize: "22px",
                        color: "#ef5350",
                    })
                    .setOrigin(0.5);
            const hotkey = i < 10 ? `${(i + 1) % 10} ` : "";
            this.add
                .text(PALETTE_X + 48, y + rowH / 2, `${hotkey}${entry.label}`, {
                    fontFamily: "Arial, sans-serif",
                    fontSize: "15px",
                    color: "#ffffff",
                })
                .setOrigin(0, 0.5);
            this.add
                .zone(PALETTE_X, y, 155, rowH - 4)
                .setOrigin(0)
                .setInteractive({ useHandCursor: true })
                .on("pointerdown", () => this.select(entry.tile));
        });
        this.redrawPalette();
    }

    private redrawPalette() {
        const rowH = 48;
        this.paletteViews.forEach((bg, i) => {
            const active = PALETTE[i].tile === this.selected;
            bg.clear();
            bg.fillStyle(active ? 0x333333 : 0x2a2a2a, 1);
            bg.lineStyle(active ? 3 : 1, active ? 0xffcc00 : 0x546e7a, 1);
            const y = GRID_Y + i * rowH;
            bg.fillRoundedRect(PALETTE_X, y, 155, rowH - 4, 8);
            bg.strokeRoundedRect(PALETTE_X, y, 155, rowH - 4, 8);
        });
    }

    private select(tile: number) {
        this.selected = tile;
        this.redrawPalette();
    }

    private buildToolbar() {
        const y = GRID_Y + ROWS * CELL + 35;
        const buttons: [string, () => void][] = [
            ["Save (Ctrl+S)", () => this.save()],
            ["Save & Play", () => this.play()],
            ["Rename", () => this.rename()],
            ["Clear", () => this.clear()],
            ["Menu (Esc)", () => this.exit()],
        ];
        buttons.forEach(([label, action], i) => {
            const x = 90 + i * 180;
            const bg = this.add
                .rectangle(x, y, 165, 44, 0x2a2a2a)
                .setStrokeStyle(2, 0x546e7a)
                .setInteractive({ useHandCursor: true });
            this.add
                .text(x, y, label, {
                    fontFamily: "Arial, sans-serif",
                    fontSize: "17px",
                    color: "#ffffff",
                })
                .setOrigin(0.5);
            bg.on("pointerover", () => bg.setStrokeStyle(3, 0xffcc00));
            bg.on("pointerout", () => bg.setStrokeStyle(2, 0x546e7a));
            bg.on("pointerdown", action);
        });
        this.add.text(920, y - 10, "Left click: paint · Right click: erase", {
            fontFamily: "Arial, sans-serif",
            fontSize: "14px",
            color: "#b0bec5",
        });
    }

    // ---------- Actions ----------

    private updateTitle() {
        this.titleText.setText(
            `Level Editor — ${this.level.name}${this.dirty ? " *" : ""}  ✎`
        );
    }

    private flash(message: string, color = "#b0bec5") {
        this.messageText.setText(message).setColor(color);
        this.time.delayedCall(3000, () => {
            if (this.messageText.text === message) this.messageText.setText("");
        });
    }

    /** Returns an error message, or null when the level is playable */
    private validate(): string | null {
        const tiles = this.level.grid.flat();
        if (!tiles.includes(PLAYER)) return "Place at least one Player spawn.";
        if (!tiles.some(isEnemyTile)) return "Place at least one enemy tank.";
        return null;
    }

    private save(): boolean {
        const error = this.validate();
        if (error) {
            this.flash(error, "#ef5350");
            return false;
        }
        if (!saveCustomLevel(this.level)) {
            this.flash(
                "Could not save: browser storage unavailable.",
                "#ef5350"
            );
            return false;
        }
        this.dirty = false;
        this.updateTitle();
        this.flash("Saved.", "#66bb6a");
        return true;
    }

    private play() {
        if (!this.save()) return;
        // Player count is kept from the menu setting
        const data: Partial<GameStartData> = {
            levelIndex: 0,
            customLevel: {
                ...this.level,
                grid: this.level.grid.map((r) => [...r]),
            },
        };
        this.scene.start("preload", data);
    }

    private rename() {
        const name = window.prompt("Level name", this.level.name)?.trim();
        if (!name) return;
        this.level.name = name.slice(0, 32);
        this.dirty = true;
        this.updateTitle();
    }

    private clear() {
        if (!window.confirm("Clear the whole level?")) return;
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++) this.setTile(r, c, EMPTY);
    }

    private exit() {
        if (this.dirty && !window.confirm("Discard unsaved changes?")) return;
        this.scene.start("menu");
    }
}
