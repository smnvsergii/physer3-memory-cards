/**
 * MFEBridge — MFE-side wrapper around window.postMessage.
 *
 * Lifecycle:
 *   1. Game boots and creates an MFEBridge instance.
 *   2. bridge.init() attaches a window message listener.
 *   3. When the game scene is ready, it calls bridge.ready().
 *   4. Game emits events via bridge.emit(); subscribes to commands via bridge.on().
 *
 * Standalone mode:
 *   When the page is opened directly (window.parent === window), the
 *   bridge becomes a no-op and the game runs unaffected.
 */

import type {
    CommandPayload,
    EventPayload,
    MFEEvent,
    MFEEventType,
    ShellCommandType,
} from './protocol';
import { PROTOCOL_VERSION } from './protocol';

export interface MFEBridgeOptions {
    mfeId: string;
    /**
     * Origins we accept commands from. Empty = accept any (dev only).
     */
    allowedShellOrigins?: string[];
    protocolVersion?: number;
}

type CommandHandler<T extends ShellCommandType> = (
    payload: CommandPayload<T>,
    raw: MessageEvent,
) => void;

type AnyCommandHandler = CommandHandler<ShellCommandType>;

export class MFEBridge {
    readonly mfeId: string;
    readonly protocolVersion: number;
    readonly isEmbedded: boolean;

    private readonly allowedShellOrigins: string[];
    private readonly handlers = new Map<ShellCommandType, Set<AnyCommandHandler>>();
    private readonly onMessage = (e: MessageEvent) => this.handleMessage(e);
    private initialized = false;

    constructor(options: MFEBridgeOptions) {
        this.mfeId = options.mfeId;
        this.allowedShellOrigins = options.allowedShellOrigins ?? [];
        this.protocolVersion = options.protocolVersion ?? PROTOCOL_VERSION;
        this.isEmbedded = window.parent !== window;
    }

    init(): void {
        if (this.initialized) return;
        this.initialized = true;

        if (!this.isEmbedded) {
            console.info(`[MFEBridge] standalone mode (mfeId=${this.mfeId})`);
            return;
        }
        if (this.allowedShellOrigins.length === 0) {
            console.warn(
                `[MFEBridge] allowedShellOrigins is empty — accepting any origin. ` +
                    `Set it before deploying.`,
            );
        }
        window.addEventListener('message', this.onMessage);
    }

    on<T extends ShellCommandType>(type: T, handler: CommandHandler<T>): () => void {
        let set = this.handlers.get(type);
        if (!set) {
            set = new Set();
            this.handlers.set(type, set);
        }
        const generic = handler as unknown as AnyCommandHandler;
        const bucket = set;
        bucket.add(generic);
        return () => bucket.delete(generic);
    }

    emit<T extends MFEEventType>(type: T, payload: EventPayload<T>): void {
        if (!this.isEmbedded) return;
        const targetOrigin = this.allowedShellOrigins[0] ?? '*';
        const message: MFEEvent = {
            source: this.mfeId,
            version: this.protocolVersion,
            type,
            payload,
        } as MFEEvent;
        window.parent.postMessage(message, targetOrigin);
    }

    ready(payload: EventPayload<'ready'>): void {
        this.emit('ready', payload);
    }

    destroy(): void {
        window.removeEventListener('message', this.onMessage);
        this.handlers.clear();
        this.initialized = false;
    }

    // --- private ---

    private isOriginAllowed(origin: string): boolean {
        if (this.allowedShellOrigins.length === 0) return true;
        return this.allowedShellOrigins.includes(origin);
    }

    private handleMessage(event: MessageEvent): void {
        if (!this.isOriginAllowed(event.origin)) return;

        const data: unknown = event.data;
        if (!isEnvelope(data)) return;
        if (data.target && data.target !== this.mfeId) return;
        if (!isShellCommandType(data.type)) return;

        const set = this.handlers.get(data.type);
        if (!set || set.size === 0) return;

        const payload = (data.payload ?? {}) as CommandPayload<ShellCommandType>;
        for (const handler of set) {
            try {
                handler(payload, event);
            } catch (err) {
                console.error(`[MFEBridge] handler for "${data.type}" threw:`, err);
            }
        }
    }
}

// --- module-private guards -------------------------------------------------

interface IncomingEnvelope {
    type: string;
    target?: unknown;
    payload?: unknown;
}

function isEnvelope(value: unknown): value is IncomingEnvelope {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return typeof v.type === 'string';
}

const SHELL_COMMAND_TYPES = new Set<ShellCommandType>([
    'pause',
    'resume',
    'restart',
    'mute',
    'setVolume',
]);

function isShellCommandType(t: string): t is ShellCommandType {
    return SHELL_COMMAND_TYPES.has(t as ShellCommandType);
}
