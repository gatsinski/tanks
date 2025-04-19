import { Service } from "typedi";
import Phaser from "phaser";

import MainScene from "scenes/MainScene";
import EndScene from "scenes/EndScene";
import MenuScene from "scenes/MenuScene";
import EditorScene from "scenes/EditorScene";

@Service()
export default class Application extends Phaser.Game {
    constructor(
        menuScene: MenuScene,
        mainScene: MainScene,
        endScene: EndScene,
        editorScene: EditorScene
    ) {
        super({
            width: 1300,
            height: 800,
            backgroundColor: "#065c21",
            type: Phaser.AUTO,
            physics: {
                default: "arcade",
                arcade: {
                    debug: false,
                },
            },
            scene: [menuScene, mainScene, endScene, editorScene],
        });
    }
}
