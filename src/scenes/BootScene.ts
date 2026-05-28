import Phaser from 'phaser';

/**
 * BootScene is the first scene. Loads the minimum required for the loader
 * (e.g. progress-bar assets) and hands control to PreloadScene.
 *
 * In larger games this is also where you'd request remote config or
 * initialize analytics.
 */
export class BootScene extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload(): void {
        // No bespoke loader assets yet.
    }

    create(): void {
        this.scene.start('Preload');
    }
}
