// Coordinate Transformation Helper for Virtual Page Replay System
// Fixes the fundamental coordinate mismatch issues

import type { DrawingElement } from "../contexts/DrawingContext";
import { animateDrawingElements } from "./directSvgAnimation";

/**
 * CRITICAL FIX: Transform element coordinates to viewport-relative coordinates
 */
export function transformElementToViewportCoordinates(
  element: DrawingElement,
  viewport: HTMLElement,
): DrawingElement {
  // Get the current viewport transformation
  const viewportTransform = getViewportTransform(viewport);

  // Create a deep copy of the element to avoid modifying the original
  const transformedElement: DrawingElement = JSON.parse(
    JSON.stringify(element),
  );

  // Apply viewport transformation to element coordinates
  transformedElement.x = element.x + viewportTransform.translateX;
  transformedElement.y = element.y + viewportTransform.translateY;

  // Transform points if they exist (for paths, lines, arrows)
  if (element.points && element.points.length > 0) {
    transformedElement.points = element.points.map((point) => ({
      x: point.x + viewportTransform.translateX,
      y: point.y + viewportTransform.translateY,
    }));
  }

  console.log(
    `🔄 Element ${element.id} transformed: (${element.x}, ${element.y}) -> (${transformedElement.x}, ${transformedElement.y})`,
  );

  return transformedElement;
}

/**
 * Get viewport transformation values
 */
export function getViewportTransform(viewport: HTMLElement): {
  translateX: number;
  translateY: number;
} {
  const transform = viewport.style.transform;
  let translateX = 0;
  let translateY = 0;

  if (transform && transform.includes("translate")) {
    const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    if (match) {
      translateX = parseFloat(match[1]) || 0;
      translateY = parseFloat(match[2]) || 0;
    }
  }

  console.log(
    `📏 Viewport transform: translateX=${translateX}, translateY=${translateY}`,
  );
  return { translateX, translateY };
}

/**
 * Animate transformed element without additional coordinate transformation
 */
export async function animateTransformedElementInViewport(
  transformedElement: DrawingElement,
  viewport: HTMLElement,
  settings: any,
): Promise<void> {
  const duration = getElementDuration(transformedElement, settings);
  const easing = getElementEasing(transformedElement, settings);

  console.log(
    `🎨 Animating transformed element ${transformedElement.id} at (${transformedElement.x}, ${transformedElement.y})`,
  );

  try {
    // Use existing directSvgAnimation system with pre-transformed element
    await animateDrawingElements([transformedElement], viewport, {
      duration: duration,
      delay: 0,
      easing: easing,
    });

    console.log(
      `✅ Transformed element ${transformedElement.id} animation completed`,
    );
  } catch (error) {
    console.error(
      `❌ Error animating transformed element ${transformedElement.id}:`,
      error,
    );
  }
}

/**
 * Get element-specific duration based on type and settings
 */
function getElementDuration(element: DrawingElement, settings: any): number {
  switch (element.type) {
    case "path":
      if (settings.penStrokes?.trueSpeed) {
        return calculateTrueSpeedDuration(
          element,
          settings.penStrokes.trueSpeedRate,
        );
      }
      return settings.penStrokes?.elementDuration || 1000;
    case "highlighter":
      return settings.penStrokes?.elementDuration || 800;
    case "rectangle":
    case "ellipse":
    case "line":
    case "arrow":
    case "diamond":
      return settings.shapes?.elementDuration || 1500;
    case "library-component":
      return settings.libraryObjects?.elementDuration || 1200;
    default:
      return settings.shapes?.elementDuration || 1000;
  }
}

/**
 * Get element-specific easing based on type and settings
 */
function getElementEasing(element: DrawingElement, settings: any): string {
  switch (element.type) {
    case "path":
    case "highlighter":
      return settings.penStrokes?.easing || "ease-out";
    case "rectangle":
    case "ellipse":
    case "line":
    case "arrow":
    case "diamond":
      return settings.shapes?.easing || "ease-out";
    case "library-component":
      return settings.libraryObjects?.easing || "ease-out";
    default:
      return settings.shapes?.easing || "ease-out";
  }
}

/**
 * Calculate true speed duration for path elements
 */
function calculateTrueSpeedDuration(
  element: DrawingElement,
  speedRate: number,
): number {
  if (!element.points || element.points.length < 2) {
    return 1000; // Default duration
  }

  let totalLength = 0;
  for (let i = 1; i < element.points.length; i++) {
    const dx = element.points[i].x - element.points[i - 1].x;
    const dy = element.points[i].y - element.points[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }

  const duration = (Math.max(totalLength, 10) / speedRate) * 1000;
  return Math.max(100, Math.min(duration, 10000)); // Clamp between 100ms and 10s
}
