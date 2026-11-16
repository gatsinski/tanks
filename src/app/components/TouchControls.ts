const LEFT_HAND_KEY = "tanks.leftHanded";

export type Direction = "up" | "down" | "left" | "right";

/**
 * On-screen controls for touch devices, rendered as HTML outside the game
 * canvas (see #touch-controls in index.html): below the game in portrait,
 * floating at the screen sides in landscape.
 *
 * Arrow buttons behave like the keyboard arrows (up/down drive, left/right
 * rotate); the fire button auto-fires while held.
 */
class TouchControls {
    readonly pressed: Record<Direction, boolean> = {
        up: false,
        down: false,
        left: false,
        right: false,
    };
    isFireDown = false;

    readonly isSupported =
        typeof window !== "undefined" &&
        ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    private _leftHanded = TouchControls.loadLeftHanded();

    /** Left-hand mode: arrows on the left, fire button on the right */
    get leftHanded() {
        return this._leftHanded;
    }

    set leftHanded(value: boolean) {
        this._leftHanded = value;
        document.body.classList.toggle("lefthand", value);
        try {
            localStorage.setItem(LEFT_HAND_KEY, value ? "1" : "0");
        } catch {
            // Storage unavailable: keep the in-memory value
        }
    }

    private static loadLeftHanded(): boolean {
        try {
            return localStorage.getItem(LEFT_HAND_KEY) === "1";
        } catch {
            return false;
        }
    }

    constructor() {
        document.body.classList.toggle("lefthand", this._leftHanded);
        if (!this.isSupported) return;
        document.body.classList.add("touch");

        (["up", "down", "left", "right"] as Direction[]).forEach((dir) =>
            this.bindHold(`arrow-${dir}`, (down) => (this.pressed[dir] = down))
        );
        this.bindHold("fire", (down) => (this.isFireDown = down));
    }

    /** Wire a button so `onChange` reports whether a finger is on it */
    private bindHold(id: string, onChange: (down: boolean) => void) {
        const el = document.getElementById(id);
        if (!el) return;
        const pointers = new Set<number>();
        const sync = () => {
            const down = pointers.size > 0;
            el.classList.toggle("active", down);
            onChange(down);
        };
        el.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            // Release implicit touch capture so sliding off the button ends it
            if (el.hasPointerCapture(e.pointerId))
                el.releasePointerCapture(e.pointerId);
            pointers.add(e.pointerId);
            sync();
        });
        // Sliding a finger onto a button presses it
        el.addEventListener("pointerenter", (e) => {
            if (e.pointerType === "touch" && e.buttons > 0) {
                pointers.add(e.pointerId);
                sync();
            }
        });
        const release = (e: PointerEvent) => {
            pointers.delete(e.pointerId);
            sync();
        };
        el.addEventListener("pointerup", release);
        el.addEventListener("pointercancel", release);
        el.addEventListener("pointerleave", release);
        el.addEventListener("contextmenu", (e) => e.preventDefault());
    }
}

export const touchControls = new TouchControls();
export type { TouchControls };
