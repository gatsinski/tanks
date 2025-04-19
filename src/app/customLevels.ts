import { LevelDefinition } from "app/levels";

export interface CustomLevel extends LevelDefinition {
    id: string;
    updatedAt: number;
}

const STORAGE_KEY = "tanks.customLevels";

export const loadCustomLevels = (): CustomLevel[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
            ? parsed.filter(
                  (l) => l && typeof l.id === "string" && Array.isArray(l.grid)
              )
            : [];
    } catch {
        return [];
    }
};

const persist = (levels: CustomLevel[]): boolean => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
        return true;
    } catch {
        return false;
    }
};

/** Inserts or replaces a level by id. Returns false if storage is unavailable. */
export const saveCustomLevel = (level: CustomLevel): boolean => {
    const levels = loadCustomLevels().filter((l) => l.id !== level.id);
    levels.push({ ...level, updatedAt: Date.now() });
    return persist(levels);
};

export const deleteCustomLevel = (id: string): boolean =>
    persist(loadCustomLevels().filter((l) => l.id !== id));

export const newCustomLevelId = () =>
    `lvl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
