import Phaser from "phaser";
import { Service } from "typedi";

@Service()
export default class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: "preload" });
    }

    preload(): void {
        this.load.image("white-square", "assets/white-square.jpg");
        this.load.image("red-square", "assets/red-square.jpg");
        this.load.image("green-square", "assets/green-square.jpg");
        this.load.image("blue-square", "assets/blue-square.jpg");
    }

    create(): void {
        this.add.image(400, 300, "white-square");

        const particles = this.add.particles("red-square");

        const emitter = particles.createEmitter({
            speed: 100,
            scale: { start: 1, end: 0 },
            blendMode: "ADD",
        });

        const logo = this.add.image(400, 100, "green-square");

        emitter.startFollow(logo);
    }
}
