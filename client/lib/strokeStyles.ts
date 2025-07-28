// Stroke style utilities that mimic Excalidraw's stroke style implementation
// Based on Excalidraw's approach to dashed and dotted lines

export type StrokeStyle = "solid" | "dashed" | "dotted";

export interface StrokeStyleOptions {
  strokeWidth: number;
  style: StrokeStyle;
  intensity?: number; // 1-10 scale for dash/dot spacing
}

// Calculate dash pattern based on Excalidraw's logic
export function getDashPattern(options: StrokeStyleOptions): number[] {
  const { strokeWidth, style, intensity = 5 } = options;

  if (style === "solid") {
    return [];
  }

  // Excalidraw-style dash pattern calculation
  const baseUnit = Math.max(strokeWidth * 2, 3);
  const spacingMultiplier = intensity / 5; // normalize 1-10 to ~0.2-2

  if (style === "dashed") {
    // Dashed: longer strokes with gaps
    const dashLength = baseUnit * 2 * spacingMultiplier;
    const gapLength = baseUnit * 1.5 * spacingMultiplier;
    return [dashLength, gapLength];
  }

  if (style === "dotted") {
    // Dotted: short strokes (dots) with gaps
    const dotLength = Math.max(strokeWidth * 0.5, 1);
    const gapLength = baseUnit * spacingMultiplier;
    return [dotLength, gapLength];
  }

  return [];
}

// Apply stroke style to canvas context
export function applyStrokeStyle(
  ctx: CanvasRenderingContext2D,
  options: StrokeStyleOptions,
): void {
  const dashPattern = getDashPattern(options);
  ctx.setLineDash(dashPattern);

  // Set line cap for better dash/dot appearance
  if (options.style === "dotted") {
    ctx.lineCap = "round";
  } else if (options.style === "dashed") {
    ctx.lineCap = "butt";
  } else {
    ctx.lineCap = "round";
  }
}

// Reset stroke style
export function resetStrokeStyle(ctx: CanvasRenderingContext2D): void {
  ctx.setLineDash([]);
  ctx.lineCap = "round";
}

// Apply stroke style to Rough.js options (for shapes)
export function applyStrokeStyleToRoughOptions(
  options: StrokeStyleOptions,
  roughOptions: any,
): any {
  const dashPattern = getDashPattern(options);

  if (dashPattern.length > 0) {
    return {
      ...roughOptions,
      strokeLineDash: dashPattern,
      strokeLineDashOffset: 0,
    };
  }

  return roughOptions;
}

// Get stroke style from line style state
export function getStrokeStyleFromLineStyle(
  lineStyle: {
    type: "solid" | "dashed" | "dotted";
    intensity: number;
  },
  strokeWidth: number,
): StrokeStyleOptions {
  return {
    strokeWidth,
    style: lineStyle.type,
    intensity: lineStyle.intensity,
  };
}

// Animate dash offset for animated stroke styles (used in replay)
export function getAnimatedDashOffset(
  timestamp: number,
  style: StrokeStyle,
  intensity: number = 5,
): number {
  if (style === "solid") return 0;

  const speed = intensity * 0.5; // Animation speed based on intensity
  return (timestamp * speed) % 100;
}
