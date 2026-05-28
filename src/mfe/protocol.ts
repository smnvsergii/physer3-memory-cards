/**
 * MFE wire protocol. Mirrors game-hub/src/mfe/protocol.ts.
 *
 * Long-term these two files would live in a shared package. For now we
 * keep them in sync by hand — the protocol is small and rarely changes.
 */

export const PROTOCOL_VERSION = 1;

export interface MFEEnvelope<TType extends string = string, TPayload = unknown> {
    source: string;
    target?: string;
    version: number;
    type: TType;
    payload: TPayload;
}

// --- Commands: shell -> MFE ----------------------------------------------

export type ShellCommand =
    | MFEEnvelope<'pause', Record<string, never>>
    | MFEEnvelope<'resume', Record<string, never>>
    | MFEEnvelope<'restart', Record<string, never>>
    | MFEEnvelope<'mute', { muted: boolean }>
    | MFEEnvelope<'setVolume', { volume: number }>;

export type ShellCommandType = ShellCommand['type'];
export type CommandPayload<T extends ShellCommandType> = Extract<
    ShellCommand,
    { type: T }
>['payload'];

// --- Events: MFE -> shell ------------------------------------------------

export type MFEEvent =
    | MFEEnvelope<
          'ready',
          { mfeId: string; version: number; bestTime: number | null; timeout: number }
      >
    | MFEEnvelope<'gameStart', { timeout: number }>
    | MFEEnvelope<'match', { value: number; matched: number; total: number }>
    | MFEEnvelope<'mismatch', { values: [number, number] }>
    | MFEEnvelope<'win', { time: number }>
    | MFEEnvelope<'timeout', Record<string, never>>
    | MFEEnvelope<'bestTimeUpdated', { bestTime: number }>
    | MFEEnvelope<'paused', Record<string, never>>
    | MFEEnvelope<'resumed', Record<string, never>>
    | MFEEnvelope<'muteChanged', { muted: boolean }>
    | MFEEnvelope<'volumeChanged', { volume: number }>;

export type MFEEventType = MFEEvent['type'];
export type EventPayload<T extends MFEEventType> = Extract<MFEEvent, { type: T }>['payload'];
