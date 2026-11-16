import { Inject, Service } from "typedi";
import Phaser from "phaser";

import MainScene from "scenes/MainScene";
import EndScene from "scenes/EndScene";
import MenuScene from "scenes/MenuScene";
import EditorScene from "scenes/EditorScene";
import SoundScene from "scenes/SoundScene";

@Service()
export default class Application extends Phaser.Game {
    constructor(
        @Inject(() => MenuScene) menuScene: MenuScene,
        @Inject(() => MainScene) mainScene: MainScene,
        @Inject(() => EndScene) endScene: EndScene,
        @Inject(() => EditorScene) editorScene: EditorScene,
        @Inject(() => SoundScene) soundScene: SoundScene
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
            // SoundScene last so it renders on top of everything
            scene: [menuScene, mainScene, endScene, editorScene, soundScene],
        });
    }
}
