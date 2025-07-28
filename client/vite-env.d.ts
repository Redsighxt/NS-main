/// <reference types="vite/client" />

declare global {
  interface Window {
    setChronologicalDebugTint?: boolean;
    setOriginBoxDebugTint?: boolean;
    setReplayWindowDebugTint?: boolean;
  }
}
