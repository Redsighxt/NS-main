// Cross-Page Drawing Utilities
import type { DrawingElement } from "../contexts/DrawingContext";
import { virtualPagesManager } from "./virtualPagesManager";

/**
 * Utility functions for handling drawing elements that cross page boundaries
 */

export interface ElementPageInfo {
  element: DrawingElement;
  page: any;
  isPartial: boolean; // true if element extends beyond page boundaries
  splitPoints?: { x: number; y: number }[]; // points where element crosses page boundary
}

/**
 * Analyze if an element crosses page boundaries
 */
export function analyzeElementPageBoundaries(
  element: DrawingElement,
): ElementPageInfo {
  const page = virtualPagesManager.findElementPage(element);

  if (!page) {
    return {
      element,
      page: null,
      isPartial: false,
    };
  }

  // Check if element extends beyond its page boundaries
  const isPartial = checkIfElementCrossesPageBoundary(element, page);
  const splitPoints = isPartial
    ? findPageBoundaryCrossings(element, page)
    : undefined;

  return {
    element,
    page,
    isPartial,
    splitPoints,
  };
}

/**
 * Check if an element crosses page boundaries
 */
function checkIfElementCrossesPageBoundary(
  element: DrawingElement,
  page: any,
): boolean {
  if (!element.points || element.points.length === 0) {
    // For non-path elements, check if they extend beyond page bounds
    const rightEdge = element.x + (element.width || 0);
    const bottomEdge = element.y + (element.height || 0);

    return (
      element.x < page.x ||
      element.y < page.y ||
      rightEdge > page.x + page.width ||
      bottomEdge > page.y + page.height
    );
  }

  // For path elements, check if any point is outside the page bounds
  return element.points.some(
    (point) =>
      point.x < page.x ||
      point.y < page.y ||
      point.x > page.x + page.width ||
      point.y > page.y + page.height,
  );
}

/**
 * Find points where an element crosses page boundaries
 */
function findPageBoundaryCrossings(
  element: DrawingElement,
  page: any,
): { x: number; y: number }[] {
  const crossings: { x: number; y: number }[] = [];

  if (!element.points || element.points.length < 2) {
    return crossings;
  }

  // Check each line segment for boundary crossings
  for (let i = 0; i < element.points.length - 1; i++) {
    const p1 = element.points[i];
    const p2 = element.points[i + 1];

    // Check crossings with page boundaries
    const leftCrossing = findLineBoundaryIntersection(
      p1,
      p2,
      page.x,
      "vertical",
    );
    const rightCrossing = findLineBoundaryIntersection(
      p1,
      p2,
      page.x + page.width,
      "vertical",
    );
    const topCrossing = findLineBoundaryIntersection(
      p1,
      p2,
      page.y,
      "horizontal",
    );
    const bottomCrossing = findLineBoundaryIntersection(
      p1,
      p2,
      page.y + page.height,
      "horizontal",
    );

    [leftCrossing, rightCrossing, topCrossing, bottomCrossing]
      .filter((crossing) => crossing !== null)
      .forEach((crossing) => crossings.push(crossing!));
  }

  return crossings;
}

/**
 * Find intersection between a line segment and a boundary
 */
function findLineBoundaryIntersection(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  boundaryValue: number,
  boundaryType: "vertical" | "horizontal",
): { x: number; y: number } | null {
  if (boundaryType === "vertical") {
    // Check intersection with vertical line x = boundaryValue
    if (
      (p1.x <= boundaryValue && p2.x >= boundaryValue) ||
      (p1.x >= boundaryValue && p2.x <= boundaryValue)
    ) {
      const t = (boundaryValue - p1.x) / (p2.x - p1.x);
      const y = p1.y + t * (p2.y - p1.y);
      return { x: boundaryValue, y };
    }
  } else {
    // Check intersection with horizontal line y = boundaryValue
    if (
      (p1.y <= boundaryValue && p2.y >= boundaryValue) ||
      (p1.y >= boundaryValue && p2.y <= boundaryValue)
    ) {
      const t = (boundaryValue - p1.y) / (p2.y - p1.y);
      const x = p1.x + t * (p2.x - p1.x);
      return { x, y: boundaryValue };
    }
  }

  return null;
}

/**
 * Split an element that crosses page boundaries into multiple elements
 * This would be used by the drawing system to automatically split elements
 */
export function splitElementAtPageBoundaries(
  element: DrawingElement,
): DrawingElement[] {
  const analysis = analyzeElementPageBoundaries(element);

  if (
    !analysis.isPartial ||
    !analysis.splitPoints ||
    analysis.splitPoints.length === 0
  ) {
    return [element]; // No splitting needed
  }

  // This is a complex operation that would require modifying the drawing system
  // For now, we return the original element with a note
  console.log(
    `Element ${element.id} crosses page boundaries and should be split`,
  );
  console.log(`Crossing points:`, analysis.splitPoints);

  // TODO: Implement actual element splitting logic
  // This would involve:
  // 1. Creating separate path segments for each page
  // 2. Maintaining visual continuity
  // 3. Updating element IDs and relationships

  return [element]; // Placeholder - return original for now
}

/**
 * Get information about all cross-page elements in a drawing
 */
export function analyzeCrossPageElements(elements: DrawingElement[]): {
  total: number;
  crossPage: number;
  analysis: ElementPageInfo[];
} {
  const analysis = elements.map((element) =>
    analyzeElementPageBoundaries(element),
  );
  const crossPageElements = analysis.filter((info) => info.isPartial);

  return {
    total: elements.length,
    crossPage: crossPageElements.length,
    analysis,
  };
}

/**
 * Log cross-page drawing information for debugging
 */
export function logCrossPageDrawingInfo(elements: DrawingElement[]): void {
  const info = analyzeCrossPageElements(elements);

  console.log(`Cross-Page Drawing Analysis:`);
  console.log(`- Total elements: ${info.total}`);
  console.log(`- Cross-page elements: ${info.crossPage}`);

  if (info.crossPage > 0) {
    console.log(
      `Cross-page elements:`,
      info.analysis.filter((a) => a.isPartial),
    );
    console.log(
      `Note: These elements visually appear continuous but are logically separate per page.`,
    );
  }
}
