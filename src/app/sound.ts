/**
 * Synthesized sound effects (Web Audio API, no asset files) and
 * persisted sound settings.
 */

export type SoundName =
    | "shoot"
    | "hit"
    | "ricochet"
    | "wallBreak"
    | "tankDestroyed"
    | "booster"
    | "menuMove"
    | "menuSelect"
    | "win"
    | "lose";

export interface SoundSettings {
    enabled: boolean;
    /** 0..100 */
    volume: number;
}

const STORAGE_KEY = "tanks.soundSettings";
const DEFAULTS: SoundSettings = { enabled: true, volume: 70 };

function loadSettings(): SoundSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULTS };
        const parsed = JSON.parse(raw);
        return {
            enabled:
                typeof parsed.enabled === "boolean"
                    ? parsed.enabled
                    : DEFAULTS.enabled,
            volume:
                typeof parsed.volume === "number"
                    ? Math.min(100, Math.max(0, Math.round(parsed.volume)))
                    : DEFAULTS.volume,
        };
    } catch {
        return { ...DEFAULTS };
    }
}

class SoundManager {
    private settings = loadSettings();
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private noiseBuffer: AudioBuffer | null = null;
    /** Throttle identical sounds fired in the same instant */
    private lastPlayed = new Map<SoundName, number>();

    get enabled() {
        return this.settings.enabled;
    }

    get volume() {
        return this.settings.volume;
    }

    setEnabled(enabled: boolean) {
        this.settings.enabled = enabled;
        this.applyVolume();
        this.save();
    }

    setVolume(volume: number) {
        this.settings.volume = Math.min(100, Math.max(0, Math.round(volume)));
        this.applyVolume();
        this.save();
    }

    play(name: SoundName) {
        if (!this.settings.enabled || this.settings.volume === 0) return;
        const ctx = this.ensureContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const last = this.lastPlayed.get(name) ?? -1;
        if (now - last < 0.03) return;
        this.lastPlayed.set(name, now);

        switch (name) {
            case "shoot":
                this.noise(now, 0.12, 0.5, 1800, 300);
                this.tone(now, "square", 220, 80, 0.08, 0.25);
                break;
            case "hit":
                this.noise(now, 0.18, 0.5, 1200, 200);
                break;
            case "ricochet":
                this.tone(now, "triangle", 1400, 600, 0.12, 0.25);
                this.noise(now, 0.06, 0.25, 4000, 2000);
                break;
            case "wallBreak":
                this.noise(now, 0.3, 0.6, 900, 120);
                this.tone(now, "square", 140, 60, 0.15, 0.2);
                break;
            case "tankDestroyed":
                this.noise(now, 0.9, 0.9, 700, 60);
                this.tone(now, "sawtooth", 110, 30, 0.6, 0.35);
                break;
            case "booster":
                [523, 659, 784, 1047].forEach((f, i) =>
                    this.tone(now + i * 0.06, "square", f, f, 0.08, 0.18)
                );
                break;
            case "menuMove":
                this.tone(now, "square", 660, 660, 0.04, 0.12);
                break;
            case "menuSelect":
                this.tone(now, "square", 660, 990, 0.1, 0.18);
                break;
            case "win":
                [523, 659, 784, 1047, 1319].forEach((f, i) =>
                    this.tone(now + i * 0.12, "square", f, f, 0.14, 0.2)
                );
                break;
            case "lose":
                [392, 330, 262, 196].forEach((f, i) =>
                    this.tone(now + i * 0.18, "triangle", f, f * 0.97, 0.2, 0.3)
                );
                break;
        }
    }

    private ensureContext(): AudioContext | null {
        if (!this.ctx) {
            const Ctor =
                window.AudioContext ||
                (
                    window as unknown as {
                        webkitAudioContext?: typeof AudioContext;
                    }
                ).webkitAudioContext;
            if (!Ctor) return null;
            this.ctx = new Ctor();
            this.master = this.ctx.createGain();
            this.master.connect(this.ctx.destination);
            this.applyVolume();
        }
        // Browsers start the context suspended until a user gesture
        if (this.ctx.state === "suspended") void this.ctx.resume();
        return this.ctx;
    }

    private applyVolume() {
        if (!this.master) return;
        const v = this.settings.enabled ? this.settings.volume / 100 : 0;
        // Perceptual curve: quiet steps stay usable
        this.master.gain.value = v * v;
    }

    private save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
        } catch {
            // Storage unavailable (private mode etc.): keep in-memory settings
        }
    }

    private tone(
        start: number,
        type: OscillatorType,
        fromHz: number,
        toHz: number,
        duration: number,
        gain: number
    ) {
        const ctx = this.ctx;
        if (!ctx || !this.master) return;
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(fromHz, start);
        osc.frequency.exponentialRampToValueAtTime(
            Math.max(1, toHz),
            start + duration
        );
        env.gain.setValueAtTime(gain, start);
        env.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(env).connect(this.master);
        osc.start(start);
        osc.stop(start + duration + 0.02);
    }

    private noise(
        start: number,
        duration: number,
        gain: number,
        fromCutoff: number,
        toCutoff: number
    ) {
        const ctx = this.ctx;
        if (!ctx || !this.master) return;
        const src = ctx.createBufferSource();
        src.buffer = this.getNoiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(fromCutoff, start);
        filter.frequency.exponentialRampToValueAtTime(
            toCutoff,
            start + duration
        );
        const env = ctx.createGain();
        env.gain.setValueAtTime(gain, start);
        env.gain.exponentialRampToValueAtTime(0.001, start + duration);
        src.connect(filter).connect(env).connect(this.master);
        src.start(start);
        src.stop(start + duration + 0.02);
    }

    private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
        if (!this.noiseBuffer) {
            const length = ctx.sampleRate; // 1 second
            this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
            const data = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
        }
        return this.noiseBuffer;
    }
}

export const sound = new SoundManager();
