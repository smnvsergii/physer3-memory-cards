# Memory Cards

A small memory match game built with Phaser 3. Runs **standalone** in the
browser or **embedded** as a microfrontend inside the
[Game Hub](../game-hub) shell, which talks to it via `postMessage`.

This is also my first Phaser project — a stepping stone toward more complex
games (slots being the goal). Coming from a React / front-end background,
I used it to learn the Phaser scene lifecycle, asset loading, sprite
animation, and audio.

## Stack

- Phaser 3.90
- TypeScript 5
- Vite 8 (Rolldown)
- ESLint v9 (flat config) + Prettier
- Husky + lint-staged (pre-commit hook)
- LocalStorage for best-time persistence

## Requirements

- Node >= 22 (see `.nvmrc`)

## Scripts

```bash
npm install
npm run dev          # start dev server on http://localhost:8001
npm run build        # type-check + production build (dist/)
npm run preview      # serve the production build locally
npm run typecheck    # tsc, no emit
npm run lint         # ESLint
npm run lint:fix
npm run format       # Prettier
npm run format:check
```

## Project structure

```
memory-cards/
├── public/
│   └── assets/             # served as-is (Vite static)
│       ├── fonts/
│       ├── sounds/
│       └── sprites/
├── src/
│   ├── main.ts             # entry point: bridge + Phaser game
│   ├── config.ts           # game-wide constants (incl. MFE settings)
│   ├── styles.css
│   ├── mfe/
│   │   ├── protocol.ts     # typed wire protocol shared with the shell
│   │   └── bridge.ts       # MFE-side postMessage wrapper
│   ├── objects/
│   │   └── Card.ts
│   └── scenes/
│       ├── BootScene.ts
│       ├── PreloadScene.ts
│       └── GameScene.ts
├── index.html
├── tsconfig.json
├── vite.config.ts
└── eslint.config.js
```

The three-scene split (`Boot → Preload → Game`) is the same pattern used in
larger Phaser projects.

## Gameplay

- 5 pairs, 60-second timer
- Match all pairs to win — best time persists in `localStorage`

## MFE / shell integration

The game can run standalone or embedded in a shell via `<iframe>`.
Communication uses `window.postMessage` through `MFEBridge`
(`src/mfe/bridge.ts`).

### Message envelope

```ts
interface MFEEnvelope<T extends string, P> {
    source: string; // sender id ("memory-cards", "shell", ...)
    target?: string; // optional recipient id
    version: number;
    type: T;
    payload: P;
}
```

### Commands (shell → MFE)

| type        | payload              | effect                          |
| ----------- | -------------------- | ------------------------------- |
| `pause`     | —                    | pauses the active scene & theme |
| `resume`    | —                    | resumes the active scene        |
| `restart`   | —                    | restarts the round              |
| `mute`      | `{ muted: boolean }` | toggles all sounds              |
| `setVolume` | `{ volume: 0..1 }`   | sets master volume              |

### Events (MFE → shell)

| type                 | payload                                 |
| -------------------- | --------------------------------------- |
| `ready`              | `{ mfeId, version, bestTime, timeout }` |
| `gameStart`          | `{ timeout }`                           |
| `match`              | `{ value, matched, total }`             |
| `mismatch`           | `{ values: [a, b] }`                    |
| `win`                | `{ time }`                              |
| `timeout`            | —                                       |
| `bestTimeUpdated`    | `{ bestTime }`                          |
| `paused` / `resumed` | —                                       |
| `muteChanged`        | `{ muted }`                             |
| `volumeChanged`      | `{ volume }`                            |

### Origin policy

`GameConfig.mfe.allowedShellOrigins` in `src/config.ts` controls which
origins this MFE accepts commands from. Empty list = any (dev only).

## What I learned

- Phaser scene lifecycle (`preload` / `create` / `update`) and delegating
  loading to a dedicated scene
- Sprite scaling via `setDisplaySize`
- Tween-based animation (move, flip) and how `scaleX: 0 → 1` produces the
  card-flip effect
- Browser autoplay policy and the audio-context user-gesture requirement
- Typing Phaser with TypeScript — strict mode without fighting the API
- Building a typed `postMessage` protocol for MFE communication

## Roadmap

- [x] TypeScript + Vite + ES modules
- [x] Wrap as a microfrontend embedded into a shell via iframe + postMessage
- [ ] Move on to a slot prototype using the same architecture
