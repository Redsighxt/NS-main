// Excalidraw-style rough shape renderer using Rough.js
// Exact implementation inspired by Excalidraw's renderElement.ts

import rough from "roughjs/bin/rough";
import type { RoughCanvas } from "roughjs/bin/canvas";
import { DrawingElement } from "../contexts/DrawingContext";
import { DASHARRAY_DASHED, DASHARRAY_DOTTED } from "./constants";

export interface RoughOptions {
  stroke: string;
  strokeWidth: number;
  fill?: string;
  fillStyle?:
    | "hachure"
    | "solid"
    | "zigzag"
    | "cross-hatch"
    | "dots"
    | "dashed"
    | "zigzag-line";
  roughness?: number;
  bowing?: number;
  seed?: number;
  strokeLineDash?: number[];
  strokeLineDashOffset?: number;
  disableMultiStroke?: boolean;
}

// Create rough canvas instance
let roughCanvas: RoughCanvas | null = null;

export function getRoughCanvas(canvas: HTMLCanvasElement): RoughCanvas {
  if (!roughCanvas) {
    roughCanvas = rough.canvas(canvas);
  }
  return roughCanvas;
}

// Convert our drawing element style to Rough.js options
export function getDefaultRoughOptions(
  element: DrawingElement,
  backgroundPattern?: string,
): RoughOptions {
  const hasFill = element.style.fill && element.style.fill !== "transparent";

  // Map our background patterns to Rough.js fill styles
  let fillStyle: RoughOptions["fillStyle"] = undefined;
  let effectiveFill = hasFill ? element.style.fill : undefined;

  // Handle fill patterns - use element's own fillStyle if available, otherwise use backgroundPattern
  const patternToUse = element.fillStyle || backgroundPattern;

  // Only apply fill pattern if both fill color exists and pattern is not "none"
  if (hasFill && patternToUse && patternToUse !== "none") {
    switch (patternToUse) {
      case "solid":
        fillStyle = "solid";
        // For solid fill, we need a fill color - if none specified, use stroke color as fallback
        if (!effectiveFill) {
          effectiveFill = element.style.stroke;
        }
        break;
      case "hachure":
        fillStyle = "hachure";
        // Ensure there's a fill color for the pattern to be visible
        if (!effectiveFill) {
          effectiveFill = element.style.stroke;
        }
        break;
      case "cross":
      case "cross-hatch":
        fillStyle = "cross-hatch";
        // Ensure there's a fill color for the pattern to be visible
        if (!effectiveFill) {
          effectiveFill = element.style.stroke;
        }
        break;
      case "dots":
        fillStyle = "dots";
        // Ensure there's a fill color for the pattern to be visible
        if (!effectiveFill) {
          effectiveFill = element.style.stroke;
        }
        break;
      case "zigzag":
        fillStyle = "zigzag";
        // Ensure there's a fill color for the pattern to be visible
        if (!effectiveFill) {
          effectiveFill = element.style.stroke;
        }
        break;
      default:
        fillStyle = undefined;
    }
  }

  // Handle stroke styles like Excalidraw
  const roughOptions: RoughOptions = {
    stroke: element.style.stroke,
    strokeWidth: element.style.strokeWidth,
    fill: effectiveFill,
    fillStyle: fillStyle,
    roughness: element.roughness || 0.8, // Use element's roughness or default
    bowing: 0.8, // Slightly less bowing for cleaner look
    seed: Math.floor(
      Math.abs(
        element.x + element.y + (element.width || 0) + (element.height || 0),
      ),
    ), // Consistent seed based on position
  };

  // Apply stroke style using Rough.js strokeLineDash option like Excalidraw
  if (element.strokeStyle === "dashed") {
    roughOptions.strokeLineDash = DASHARRAY_DASHED;
    roughOptions.strokeLineDashOffset = 0;
    // For non-solid strokes, disable multiStroke like Excalidraw does
    roughOptions.disableMultiStroke = true;
    // Adjust stroke width for dashed strokes like Excalidraw
    roughOptions.strokeWidth = element.style.strokeWidth + 0.5;
  } else if (element.strokeStyle === "dotted") {
    roughOptions.strokeLineDash = DASHARRAY_DOTTED;
    roughOptions.strokeLineDashOffset = 0;
    // For non-solid strokes, disable multiStroke like Excalidraw does
    roughOptions.disableMultiStroke = true;
    // Adjust stroke width for dotted strokes like Excalidraw
    roughOptions.strokeWidth = element.style.strokeWidth + 0.5;
  }

  return roughOptions;
}

// Main render function like Excalidraw's renderElement
export function renderRoughElement(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  element: DrawingElement,
  backgroundPattern?: string,
  options?: Partial<RoughOptions>,
): void {
  const rc = getRoughCanvas(canvas);
  const roughOptions = {
    ...getDefaultRoughOptions(element, backgroundPattern),
    ...options,
  };

  ctx.save();

  switch (element.type) {
    case "rectangle":
      renderRoughRectangle(rc, element, roughOptions);
      break;

    case "ellipse":
      renderRoughEllipse(rc, element, roughOptions);
      break;

    case "diamond":
      renderRoughDiamond(rc, element, roughOptions);
      break;

    case "line":
      renderRoughLine(rc, element, roughOptions);
      break;

    case "arrow":
      renderRoughArrow(rc, element, roughOptions);
      break;

    case "path":
      renderRoughPath(rc, element, roughOptions);
      break;

    case "text":
      renderText(ctx, element);
      break;
  }

  ctx.restore();
}

function renderRoughRectangle(
  rc: RoughCanvas,
  element: DrawingElement,
  options: RoughOptions,
): void {
  const width = element.width || 100;
  const height = element.height || 100;

  rc.rectangle(element.x, element.y, width, height, options);
}

function renderRoughEllipse(
  rc: RoughCanvas,
  element: DrawingElement,
  options: RoughOptions,
): void {
  const width = element.width || 100;
  const height = element.height || 100;
  const centerX = element.x + width / 2;
  const centerY = element.y + height / 2;

  rc.ellipse(centerX, centerY, width, height, options);
}

function renderRoughDiamond(
  rc: RoughCanvas,
  element: DrawingElement,
  options: RoughOptions,
): void {
  const width = element.width || 100;
  const height = element.height || 100;
  const centerX = element.x + width / 2;
  const centerY = element.y + height / 2;

  // Diamond points like Excalidraw
  const points: [number, number][] = [
    [centerX, element.y], // Top
    [element.x + width, centerY], // Right
    [centerX, element.y + height], // Bottom
    [element.x, centerY], // Left
  ];

  rc.polygon(points, options);
}

function renderRoughLine(
  rc: RoughCanvas,
  element: DrawingElement,
  options: RoughOptions,
): void {
  if (element.points && element.points.length >= 2) {
    const start = element.points[0];
    const end = element.points[1];
    rc.line(start.x, start.y, end.x, end.y, options);
  }
}

function renderRoughArrow(
  rc: RoughCanvas,
  element: DrawingElement,
  options: RoughOptions,
): void {
  if (element.points && element.points.length >= 2) {
    const start = element.points[0];
    const end = element.points[1];

    // Draw main line
    rc.line(start.x, start.y, end.x, end.y, options);

    // Draw arrowhead
    const headLength = 15;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    const arrowHead1: [number, number] = [
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6),
    ];

    const arrowHead2: [number, number] = [
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6),
    ];

    // Draw arrowhead lines
    rc.line(end.x, end.y, arrowHead1[0], arrowHead1[1], options);
    rc.line(end.x, end.y, arrowHead2[0], arrowHead2[1], options);
  }
}

function renderRoughPath(
  rc: RoughCanvas,
  element: DrawingElement,
  options: RoughOptions,
): void {
  if (element.points && element.points.length > 1) {
    // Convert points to Rough.js format
    const points: [number, number][] = element.points.map((p) => [p.x, p.y]);

    // Use curve for smooth paths
    rc.curve(points, { ...options, fill: undefined, fillStyle: undefined });
  }
}

function renderText(
  ctx: CanvasRenderingContext2D,
  element: DrawingElement,
): void {
  const fontSize = element.style.fontSize || 16;
  const fontFamily = element.style.fontFamily || "Arial";

  // Build font string with weight and style
  let fontWeight = "normal";
  let fontStyle = "normal";

  if (element.bold) {
    fontWeight = "bold";
  }

  if (element.italic) {
    fontStyle = "italic";
  }

  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = element.style.stroke;

  // Draw the text
  ctx.fillText(element.text || "", element.x, element.y);

  // Add underline if needed
  if (element.underline) {
    const textWidth = ctx.measureText(element.text || "").width;
    ctx.beginPath();
    ctx.moveTo(element.x, element.y + fontSize * 0.1);
    ctx.lineTo(element.x + textWidth, element.y + fontSize * 0.1);
    ctx.strokeStyle = element.style.stroke;
    ctx.lineWidth = Math.max(1, fontSize * 0.05);
    ctx.stroke();
  }
}

// Utility function to get roughness level based on sloppiness (subtle like Excalidraw)
export function getRoughnessFromSloppiness(sloppiness: number): number {
  switch (sloppiness) {
    case 0:
      return 0; // Architect - perfect lines
    case 1:
      return 0.8; // Artist - subtle roughness
    case 2:
      return 1.5; // Cartoonist - more noticeable but not excessive
    default:
      return 0.8;
  }
}

// Utility function to get bowing level based on sloppiness (subtle like Excalidraw)
export function getBowingFromSloppiness(sloppiness: number): number {
  switch (sloppiness) {
    case 0:
      return 0; // Architect - no bowing
    case 1:
      return 0.5; // Artist - subtle bowing
    case 2:
      return 1.2; // Cartoonist - more bowing but controlled
    default:
      return 0.5;
  }
}
