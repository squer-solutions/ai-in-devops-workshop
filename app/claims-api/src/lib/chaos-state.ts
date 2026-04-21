export const CHAOS_MODES = [
  "cpu-hog",
  "slow-db",
  "memory-leak",
  "error-spike",
  "queue-backup",
  "db-conn-leak",
] as const;

export type ChaosMode = (typeof CHAOS_MODES)[number];

let currentMode: ChaosMode | null = null;

export function setMode(mode: ChaosMode): void {
  if (!CHAOS_MODES.includes(mode)) {
    throw new Error(`unknown chaos mode: ${mode}`);
  }
  currentMode = mode;
}

export function getMode(): ChaosMode | null {
  return currentMode;
}

export function clearMode(): void {
  currentMode = null;
}
