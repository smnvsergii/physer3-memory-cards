import Phaser from 'phaser';
import { GameConfig, type CardValue } from '../config';

export interface CardPosition {
    x: number;
    y: number;
    delay: number;
}

/**
 * Card is a Phaser sprite that knows how to flip and fly into place.
 *
 * State is intentionally minimal: `value` (which face it shows when open)
 * and `opened` (whether it's currently face-up). The scene drives the
 * matching logic.
 */
export class Card extends Phaser.GameObjects.Sprite {
    readonly value: CardValue;
    opened = false;
    position!: CardPosition;

    constructor(scene: Phaser.Scene, value: CardValue) {
        super(scene, 0, 0, 'card');
        this.value = value;
        scene.add.existing(this);
        this.setDisplaySize(GameConfig.cardWidth, GameConfig.cardHeight);
        this.setInteractive();
    }

    init(position: CardPosition): void {
        this.position = position;
        this.close();
        // Place the card off-screen so it can fly in.
        this.setPosition(-this.displayWidth, -this.displayHeight);
    }

    move(params: CardPosition): void {
        this.scene.tweens.add({
            targets: this,
            x: params.x,
            y: params.y,
            delay: params.delay,
            ease: 'Linear',
            duration: GameConfig.animation.cardMoveDuration,
        });
    }

    open(): void {
        this.opened = true;
        this.flip();
    }

    close(): void {
        if (this.opened) {
            this.opened = false;
            this.flip();
        }
    }

    private flip(): void {
        this.scene.tweens.add({
            targets: this,
            scaleX: 0,
            ease: 'Linear',
            duration: GameConfig.animation.cardFlipDuration,
            onComplete: () => this.show(),
        });
    }

    private show(): void {
        const texture = this.opened ? `card${this.value}` : 'card';
        this.setTexture(texture);
        // Different textures may have different native sizes — renormalize.
        this.setDisplaySize(GameConfig.cardWidth, GameConfig.cardHeight);
        const targetScaleX = this.scaleX;
        this.scaleX = 0;
        this.scene.tweens.add({
            targets: this,
            scaleX: targetScaleX,
            ease: 'Linear',
            duration: GameConfig.animation.cardFlipDuration,
        });
    }
}
