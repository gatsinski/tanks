import { Service } from "typedi";
import Phaser from "phaser";

import MainScene from "scenes/MainScene";

@Service()
export default class Application extends Phaser.Game {
    constructor(mainScene: MainScene) {
        super({
            width: 1280,
            height: 768,
            type: Phaser.AUTO,
            scene: [mainScene],
        });
    }
}
