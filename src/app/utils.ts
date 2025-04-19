import { PlayerControls } from "./types/PlayerControls";

export function getPlayerControls(
    index: number,
    input: Phaser.Input.InputPlugin
): PlayerControls {
    // 0: Player 1 (Arrow keys + Space)
    // 1: Player 2 (WASD + F or Left Shift)
    // 2: Player 3 (IJKL + O)
    const controlsList: PlayerControls[] = [
        {
            up: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            down: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
            left: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
            right: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
            fire: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        },
        {
            up: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            fire: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
        },
        {
            up: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I),
            down: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
            left: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
            right: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
            fire: input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O),
        },
    ];

    return controlsList[index] || controlsList[0];
}
