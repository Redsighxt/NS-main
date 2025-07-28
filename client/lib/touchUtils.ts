/**
 * Utility functions for touch device detection and optimization
 */

export type InputType = "mouse" | "finger" | "stylus" | "unknown";

/**
 * Detect the primary input method based on device capabilities
 */
export function detectPrimaryInputType(): InputType {
  // Check if we're in a browser environment
  if (typeof window === "undefined") return "unknown";

  // Check for fine pointer capability (mouse or stylus)
  const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

  // Check for coarse pointer capability (finger touch)
  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

  // Check for hover capability (usually indicates mouse)
  const hasHover = window.matchMedia("(hover: hover)").matches;

  // iPad with Apple Pencil: fine pointer but no hover
  if (hasFinePointer && !hasHover) {
    return "stylus";
  }

  // Desktop/laptop with mouse: fine pointer and hover
  if (hasFinePointer && hasHover) {
    return "mouse";
  }

  // Touch devices: coarse pointer, no hover
  if (hasCoarsePointer && !hasHover) {
    return "finger";
  }

  // Fallback
  return "unknown";
}

/**
 * Get optimal button size for the current input type
 */
export function getOptimalButtonSize(
  inputType?: InputType,
): "default" | "touch-sm" | "touch-md" | "touch-lg" {
  const detectedType = inputType || detectPrimaryInputType();

  switch (detectedType) {
    case "mouse":
      return "default";
    case "stylus":
      return "touch-sm";
    case "finger":
      return "touch-md";
    default:
      return "default";
  }
}

/**
 * Get optimal spacing for the current input type
 */
export function getOptimalSpacing(
  inputType?: InputType,
): "default" | "relaxed" | "loose" {
  const detectedType = inputType || detectPrimaryInputType();

  switch (detectedType) {
    case "mouse":
      return "default";
    case "stylus":
      return "default";
    case "finger":
      return "relaxed";
    default:
      return "default";
  }
}

/**
 * Check if the device supports Apple Pencil or similar stylus
 */
export function supportsPressureSensitiveStylus(): boolean {
  if (typeof window === "undefined") return false;

  // Check for pointer events support
  if (!window.PointerEvent) return false;

  // Check if device has fine pointer without hover (typical iPad + Apple Pencil)
  const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
  const hasHover = window.matchMedia("(hover: hover)").matches;

  return hasFinePointer && !hasHover;
}

/**
 * Get touch action CSS value based on context
 */
export function getTouchAction(
  context: "drawing" | "ui" | "scrolling",
): string {
  switch (context) {
    case "drawing":
      return "none"; // Prevent all touch behaviors for drawing
    case "ui":
      return "manipulation"; // Allow tap and double-tap, prevent delay
    case "scrolling":
      return "pan-y pan-x"; // Allow scrolling only
    default:
      return "auto";
  }
}

/**
 * Check if current touch is likely from Apple Pencil
 */
export function isLikelyApplePencil(event: TouchEvent | PointerEvent): boolean {
  if (event instanceof PointerEvent) {
    return event.pointerType === "pen" || event.pointerType === "stylus";
  }

  if (event instanceof TouchEvent && event.touches.length > 0) {
    const touch = event.touches[0] as Touch & {
      touchType?: string;
      force?: number;
    };

    // Check for stylus touch type
    if (touch.touchType === "stylus") return true;

    // Check for pressure sensitivity (Apple Pencil supports this)
    if (touch.force !== undefined && touch.force > 0) return true;
  }

  return false;
}

/**
 * Debounce function for touch events to improve performance
 */
export function debounceTouch<T extends any[]>(
  func: (...args: T) => void,
  wait: number = 16, // ~60fps
): (...args: T) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: T) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for touch events
 */
export function throttleTouch<T extends any[]>(
  func: (...args: T) => void,
  limit: number = 16, // ~60fps
): (...args: T) => void {
  let inThrottle = false;

  return (...args: T) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
