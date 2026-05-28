import Phaser from 'phaser';
import { GameConfig, type CardValue } from '../config';
import { Card, type CardPosition } from '../objects/Card';
import type { MFEBridge } from '../mfe/bridge';

interface SoundMap {
    card: Phaser.Sound.BaseSound;
    complete: Phaser.Sound.BaseSound;
    success: Phaser.Sound.BaseSound;
    theme: Phaser.Sound.BaseSound;
    timeout: Phaser.Sound.BaseSound;
}

/**
 * GameScene runs the round: card layout, click handling, timer, best-time
 * persistence. It owns the integration with the shell via MFEBridge —
 * commands are bound in `bindShellCommands`, events are emitted at the
 * relevant moments in the gameplay loop.
 */
export class GameScene extends Phaser.Scene {
    private bridge!: MFEBridge;
    private unsubscribers: (() => void)[] = [];

    private timeoutLeft = GameConfig.timeout;
    private cards: Card[] = [];
    private openedCard: Card | null = null;
    private openedCardsCount = 0;

    private sounds!: SoundMap;
    private timeoutText!: Phaser.GameObjects.Text;
    private bestTimeText!: Phaser.GameObjects.Text;

    constructor() {
        super('Game');
    }

    create(): void {
        this.bridge = this.registry.get('mfeBridge') as MFEBridge;

        this.createSounds();
        this.createTimer();
        this.createBackground();
        this.createText();
        this.createCards();

        // Bind commands and announce ready before the first gameStart
        // so the shell receives events in a meaningful order:
        //   ready -> gameStart -> ...
        this.bindShellCommands();
        this.bridge.ready({
            mfeId: this.bridge.mfeId,
            version: this.bridge.protocolVersion,
            bestTime: this.getBestTime(),
            timeout: GameConfig.timeout,
        });

        this.start();

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
    }

    // --- Setup -----------------------------------------------------------

    private createBackground(): void {
        const { width, height } = this.sys.game.scale.gameSize;
        this.add.sprite(0, 0, 'bg').setOrigin(0, 0).setDisplaySize(width, height);
    }

    private createText(): void {
        const { ui, paddingX } = GameConfig;
        this.timeoutText = this.add.text(paddingX, ui.timerY, '', {
            font: ui.timerFont,
            color: ui.timerColor,
        });
        this.bestTimeText = this.add.text(paddingX + ui.bestTimeOffsetX, ui.timerY, '', {
            font: ui.timerFont,
            color: ui.bestTimeColor,
        });
        this.updateBestTimeText();
    }

    private createSounds(): void {
        this.sounds = {
            card: this.sound.add('card'),
            complete: this.sound.add('complete'),
            success: this.sound.add('success'),
            theme: this.sound.add('theme'),
            timeout: this.sound.add('timeout'),
        };
        this.sounds.theme.play({ volume: GameConfig.themeVolume });
    }

    private createTimer(): void {
        this.time.addEvent({
            delay: 1000,
            callback: this.onTimerTick,
            loop: true,
        });
    }

    private createCards(): void {
        this.cards = [];
        for (const value of GameConfig.cards) {
            for (let i = 0; i < 2; i++) {
                this.cards.push(new Card(this, value));
            }
        }
        this.input.on('gameobjectdown', this.onCardClicked);
    }

    // --- Shell command bindings -----------------------------------------

    private bindShellCommands(): void {
        const sub = <T extends Parameters<MFEBridge['on']>[0]>(
            type: T,
            fn: Parameters<MFEBridge['on']>[1],
        ) => {
            this.unsubscribers.push(this.bridge.on(type, fn));
        };

        sub('pause', () => {
            if (!this.scene.isPaused()) {
                this.scene.pause();
                (this.sounds.theme as Phaser.Sound.WebAudioSound).pause();
                this.bridge.emit('paused', {});
            }
        });

        sub('resume', () => {
            if (this.scene.isPaused()) {
                this.scene.resume();
                (this.sounds.theme as Phaser.Sound.WebAudioSound).resume();
                this.bridge.emit('resumed', {});
            }
        });

        sub('restart', () => {
            this.start();
        });

        sub('mute', (payload) => {
            const muted = Boolean((payload as { muted?: unknown }).muted);
            this.sound.mute = muted;
            this.bridge.emit('muteChanged', { muted: this.sound.mute });
        });

        sub('setVolume', (payload) => {
            const raw = Number((payload as { volume?: unknown }).volume);
            const v = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 1;
            this.sound.volume = v;
            this.bridge.emit('volumeChanged', { volume: v });
        });
    }

    private onShutdown = (): void => {
        for (const off of this.unsubscribers) off();
        this.unsubscribers = [];
    };

    // --- Game flow -------------------------------------------------------

    private start(): void {
        this.timeoutLeft = GameConfig.timeout;
        this.openedCard = null;
        this.openedCardsCount = 0;
        this.initCards();
        this.showCards();
        this.bridge.emit('gameStart', { timeout: GameConfig.timeout });
    }

    private initCards(): void {
        const positions = this.getCardsPositions();
        this.cards.forEach((card) => {
            const next = positions.pop();
            if (next) card.init(next);
        });
    }

    private showCards(): void {
        this.cards.forEach((card) => card.move(card.position));
    }

    private onCardClicked = (_pointer: Phaser.Input.Pointer, card: Card): boolean | void => {
        if (card.opened) return false;

        this.sounds.card.play();

        if (this.openedCard) {
            if (this.openedCard.value === card.value) {
                this.sounds.success.play();
                this.bridge.emit('match', {
                    value: card.value,
                    matched: this.openedCardsCount + 1,
                    total: this.cards.length / 2,
                });
                this.openedCard = null;
                ++this.openedCardsCount;
            } else {
                this.bridge.emit('mismatch', {
                    values: [this.openedCard.value, card.value] as [CardValue, CardValue],
                });
                this.openedCard.close();
                this.openedCard = card;
            }
        } else {
            this.openedCard = card;
        }

        card.open();

        if (this.openedCardsCount === this.cards.length / 2) {
            this.sounds.complete.play();
            const elapsed = GameConfig.timeout - this.timeoutLeft;
            this.bridge.emit('win', { time: elapsed });
            this.saveBestTime(elapsed);
            this.start();
        }
    };

    private onTimerTick = (): void => {
        this.timeoutText.setText(`Time: ${this.timeoutLeft}`);
        if (this.timeoutLeft <= 0) {
            this.sounds.timeout.play();
            this.bridge.emit('timeout', {});
            this.start();
        } else {
            --this.timeoutLeft;
        }
    };

    // --- Layout ----------------------------------------------------------

    private getCardsPositions(): CardPosition[] {
        const positions: CardPosition[] = [];
        const { width, height } = this.sys.game.scale.gameSize;
        const cellWidth = GameConfig.cardWidth + GameConfig.cardGap;
        const cellHeight = GameConfig.cardHeight + GameConfig.cardGap;
        const availableWidth = width - 2 * GameConfig.paddingX;
        const availableHeight = height - GameConfig.paddingTop - GameConfig.paddingBottom;
        const offsetX =
            GameConfig.paddingX +
            (availableWidth - cellWidth * GameConfig.cols) / 2 +
            cellWidth / 2;
        const offsetY =
            GameConfig.paddingTop +
            (availableHeight - cellHeight * GameConfig.rows) / 2 +
            cellHeight / 2;

        let id = 0;
        for (let row = 0; row < GameConfig.rows; row++) {
            for (let col = 0; col < GameConfig.cols; col++) {
                ++id;
                positions.push({
                    delay: id * GameConfig.animation.cardMoveStaggerDelay,
                    x: offsetX + col * cellWidth,
                    y: offsetY + row * cellHeight,
                });
            }
        }
        return Phaser.Utils.Array.Shuffle(positions);
    }

    // --- Best-time persistence ------------------------------------------

    private getBestTime(): number | null {
        const value = localStorage.getItem(GameConfig.storage.bestTimeKey);
        return value === null ? null : parseInt(value, 10);
    }

    private saveBestTime(seconds: number): void {
        const best = this.getBestTime();
        if (best === null || seconds < best) {
            localStorage.setItem(GameConfig.storage.bestTimeKey, String(seconds));
            this.updateBestTimeText();
            this.bridge.emit('bestTimeUpdated', { bestTime: seconds });
        }
    }

    private updateBestTimeText(): void {
        const best = this.getBestTime();
        this.bestTimeText.setText(best !== null ? `Best: ${best}s` : 'Best: -');
    }
}
