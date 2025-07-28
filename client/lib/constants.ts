// Stroke style constants matching Excalidraw implementation
export const STROKE_STYLE = {
  SOLID: "solid",
  DASHED: "dashed", 
  DOTTED: "dotted",
} as const;

// Dash patterns matching Excalidraw
export const DASHARRAY_DASHED = [5, 5];
export const DASHARRAY_DOTTED = [1, 5];

export type StrokeStyle = typeof STROKE_STYLE[keyof typeof STROKE_STYLE];
