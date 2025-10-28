import { PlayerControls } from "./types/PlayerControls";

export function getPlayerControls(
    index: number,
    input: Phaser.Input.InputPlugin
): PlayerControls {
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
            fire: input.keyboard.addKey(
                Phaser.Input.Keyboard.KeyCodes.SHIFT,
                true,
                false
            ),
        },
    ];

    return controlsList[index];
}
