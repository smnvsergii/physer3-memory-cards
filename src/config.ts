/**
 * Game-wide configuration. Plain object literal — no class needed.
 */

export const GameConfig = {
    // Canvas
    width: 1280,
    height: 720,

    // Grid of cards
    rows: 2,
    cols: 5,
    cards: [1, 2, 3, 4, 5] as const,

    // one card size
    cardWidth: 240,
    cardHeight: 140,
    cardGap: 20,

    // game space
    paddingX: 40,
    paddingTop: 80,
    paddingBottom: 40,

    // round timer (sec)
    timeout: 60,

    // UI
    ui: {
        timerColor: '#ffffff',
        bestTimeColor: '#ffd700',
        timerFont: '36px CurseCasual',
        timerY: 20,
        bestTimeOffsetX: 260,
    },

    storage: {
        bestTimeKey: 'memoryCards.bestTime',
    },

    animation: {
        cardMoveDuration: 250,
        cardFlipDuration: 150,
        cardMoveStaggerDelay: 100,
    },

    themeVolume: 0.1,

    // MFE / shell integration
    mfe: {
        id: 'memory-cards',
        protocolVersion: 1,
        // Origins from which we accept commands. Empty = any (dev only).
        allowedShellOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    },
} as const;

export type CardValue = (typeof GameConfig.cards)[number];
