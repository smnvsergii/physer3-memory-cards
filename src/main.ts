import Phaser from 'phaser';
import './styles.css';

import { GameConfig } from './config';
import { MFEBridge } from './mfe/bridge';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';

/**
 * Entry point. Builds the MFE bridge first so it can already listen for
 * messages while Phaser bootstraps, then creates the game and exposes the
 * bridge through the registry.
 */
const mfeBridge = new MFEBridge({
    mfeId: GameConfig.mfe.id,
    allowedShellOrigins: [...GameConfig.mfe.allowedShellOrigins],
    protocolVersion: GameConfig.mfe.protocolVersion,
});
mfeBridge.init();

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GameConfig.width,
        height: GameConfig.height,
    },
    scene: [BootScene, PreloadScene, GameScene],
});

game.registry.set('mfeBridge', mfeBridge);
