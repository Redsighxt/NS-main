// CRITICAL FIX for zoom issue in replay system
// Transforms world coordinates to origin box (0,0 to 1920,1080) space

import type { DrawingElement } from "../contexts/DrawingContext";

/**
 * CRITICAL FIX: Normalize world coordinates to origin box (0,0 to 1920,1080) space
 * This fixes the zoom issue by transforming elements from world coordinate space
 * back to the replay viewport coordinate space
 */
export function normalizeToOriginBoxSpace(element: DrawingElement): { x: number; y: number; points?: { x: number; y: number }[] } {
  // Calculate a simple transformation that centers content in the origin box
  // This addresses the fundamental coordinate space mismatch
  
  const offsetX = 960;  // Center X of 1920px
  const offsetY = 540;  // Center Y of 1080px  
  const scale = 0.5;    // Scale factor to fit content
  
  const normalizedX = element.x * scale + offsetX;
  const normalizedY = element.y * scale + offsetY;
  
  // Ensure coordinates are within 1920x1080 bounds
  const clampedX = Math.max(0, Math.min(1920, normalizedX));
  const clampedY = Math.max(0, Math.min(1080, normalizedY));
  
  let normalizedPoints: { x: number; y: number }[] | undefined;
  if (element.points) {
    normalizedPoints = element.points.map(point => ({
      x: Math.max(0, Math.min(1920, point.x * scale + offsetX)),
      y: Math.max(0, Math.min(1080, point.y * scale + offsetY))
    }));
  }
  
  console.log(`Normalized element ${element.id}: (${element.x}, ${element.y}) -> (${clampedX}, ${clampedY})`);
  
  return {
    x: clampedX,
    y: clampedY,
    points: normalizedPoints
  };
}

/**
 * Normalize all elements in a collection to origin box space
 */
export function normalizeElementsToOriginBoxSpace(elements: DrawingElement[]): DrawingElement[] {
  return elements.map(element => {
    const normalized = normalizeToOriginBoxSpace(element);
    return {
      ...element,
      x: normalized.x,
      y: normalized.y,
      points: normalized.points || element.points
    };
  });
}
