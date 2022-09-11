import { Service } from "typedi";
import Phaser from "phaser";

import MainScene from "scenes/MainScene";

@Service()
export default class Application extends Phaser.Game {
    constructor(mainScene: MainScene) {
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
            scene: [mainScene],
        });
    }
}
