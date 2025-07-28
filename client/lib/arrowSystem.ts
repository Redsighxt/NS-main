// Excalidraw-style arrow system with binding and multiple arrow head types
// Based on Excalidraw's linearElementEditor.ts and arrow implementation

import { DrawingElement } from "../contexts/DrawingContext";

export type ArrowheadType =
  | "none"
  | "arrow"
  | "triangle"
  | "triangle_outline"
  | "dot";

export interface ArrowBinding {
  elementId: string;
  focus: number; // 0-1, position along the bound element's perimeter
  gap: number; // Distance from the element edge
  fixedPoint?: [number, number]; // Fixed point for binding precision
}

export interface ArrowElement extends DrawingElement {
  type: "arrow";
  startArrowhead?: ArrowheadType;
  endArrowhead?: ArrowheadType;
  startBinding?: ArrowBinding | null;
  endBinding?: ArrowBinding | null;
  controlPoints?: { x: number; y: number }[];
}

// Distance threshold for arrow binding
const BINDING_THRESHOLD = 10;
const BINDING_GAP = 8;

// Calculate distance from point to element
export function getDistanceToElement(
  point: { x: number; y: number },
  element: DrawingElement,
): number {
  switch (element.type) {
    case "rectangle":
      return getDistanceToRectangle(point, element);
    case "ellipse":
      return getDistanceToEllipse(point, element);
    case "diamond":
      return getDistanceToDiamond(point, element);
    default:
      return Infinity;
  }
}

// Distance from point to rectangle
function getDistanceToRectangle(
  point: { x: number; y: number },
  element: DrawingElement,
): number {
  const { x, y, width = 100, height = 100 } = element;

  // Check if point is inside rectangle
  if (
    point.x >= x &&
    point.x <= x + width &&
    point.y >= y &&
    point.y <= y + height
  ) {
    // Inside - calculate distance to nearest edge
    const distToLeft = point.x - x;
    const distToRight = x + width - point.x;
    const distToTop = point.y - y;
    const distToBottom = y + height - point.y;
    return Math.min(distToLeft, distToRight, distToTop, distToBottom);
  }

  // Outside - calculate distance to nearest point on rectangle
  const nearestX = Math.max(x, Math.min(point.x, x + width));
  const nearestY = Math.max(y, Math.min(point.y, y + height));
  const dx = point.x - nearestX;
  const dy = point.y - nearestY;
  return Math.sqrt(dx * dx + dy * dy);
}

// Distance from point to ellipse
function getDistanceToEllipse(
  point: { x: number; y: number },
  element: DrawingElement,
): number {
  const { x, y, width = 100, height = 100 } = element;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radiusX = width / 2;
  const radiusY = height / 2;

  // Normalize point to unit circle
  const normalizedX = (point.x - centerX) / radiusX;
  const normalizedY = (point.y - centerY) / radiusY;
  const distanceFromCenter = Math.sqrt(
    normalizedX * normalizedX + normalizedY * normalizedY,
  );

  if (distanceFromCenter <= 1) {
    // Inside ellipse - distance to edge
    return (1 - distanceFromCenter) * Math.min(radiusX, radiusY);
  } else {
    // Outside ellipse - approximate distance
    return (distanceFromCenter - 1) * Math.min(radiusX, radiusY);
  }
}

// Distance from point to diamond
function getDistanceToDiamond(
  point: { x: number; y: number },
  element: DrawingElement,
): number {
  const { x, y, width = 100, height = 100 } = element;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  // Transform to diamond coordinate system
  const dx = Math.abs(point.x - centerX) / (width / 2);
  const dy = Math.abs(point.y - centerY) / (height / 2);

  // Diamond equation: |x|/a + |y|/b = 1
  const distanceFromEdge = dx + dy - 1;

  if (distanceFromEdge <= 0) {
    // Inside diamond
    return (Math.abs(distanceFromEdge) * Math.min(width, height)) / 2;
  } else {
    // Outside diamond
    return (distanceFromEdge * Math.min(width, height)) / 2;
  }
}

// Find the best element to bind to at a given point
export function findBindableElementAtPoint(
  point: { x: number; y: number },
  elements: DrawingElement[],
  excludeElement?: DrawingElement,
): DrawingElement | null {
  let closestElement: DrawingElement | null = null;
  let closestDistance = BINDING_THRESHOLD;

  for (const element of elements) {
    if (element === excludeElement) continue;
    if (
      element.type === "path" ||
      element.type === "highlighter" ||
      element.type === "text"
    )
      continue;

    const distance = getDistanceToElement(point, element);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestElement = element;
    }
  }

  return closestElement;
}

// Calculate the binding point on an element's perimeter
export function getBindingPointOnElement(
  element: DrawingElement,
  point: { x: number; y: number },
): { point: { x: number; y: number }; focus: number } {
  switch (element.type) {
    case "rectangle":
      return getBindingPointOnRectangle(element, point);
    case "ellipse":
      return getBindingPointOnEllipse(element, point);
    case "diamond":
      return getBindingPointOnDiamond(element, point);
    default:
      return { point: { x: point.x, y: point.y }, focus: 0 };
  }
}

// Get binding point on rectangle perimeter
function getBindingPointOnRectangle(
  element: DrawingElement,
  point: { x: number; y: number },
): { point: { x: number; y: number }; focus: number } {
  const { x, y, width = 100, height = 100 } = element;

  // Find the closest point on the rectangle perimeter
  let bindingPoint = { x: point.x, y: point.y };
  let focus = 0;

  // Check which edge is closest
  const distToLeft = Math.abs(point.x - x);
  const distToRight = Math.abs(point.x - (x + width));
  const distToTop = Math.abs(point.y - y);
  const distToBottom = Math.abs(point.y - (y + height));

  const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

  if (minDist === distToLeft) {
    // Left edge
    bindingPoint = { x: x, y: Math.max(y, Math.min(point.y, y + height)) };
    focus = (bindingPoint.y - y) / height;
  } else if (minDist === distToRight) {
    // Right edge
    bindingPoint = {
      x: x + width,
      y: Math.max(y, Math.min(point.y, y + height)),
    };
    focus = (bindingPoint.y - y) / height;
  } else if (minDist === distToTop) {
    // Top edge
    bindingPoint = { x: Math.max(x, Math.min(point.x, x + width)), y: y };
    focus = (bindingPoint.x - x) / width;
  } else {
    // Bottom edge
    bindingPoint = {
      x: Math.max(x, Math.min(point.x, x + width)),
      y: y + height,
    };
    focus = (bindingPoint.x - x) / width;
  }

  return { point: bindingPoint, focus };
}

// Get binding point on ellipse perimeter
function getBindingPointOnEllipse(
  element: DrawingElement,
  point: { x: number; y: number },
): { point: { x: number; y: number }; focus: number } {
  const { x, y, width = 100, height = 100 } = element;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const radiusX = width / 2;
  const radiusY = height / 2;

  // Calculate angle from center to point
  const angle = Math.atan2(point.y - centerY, point.x - centerX);

  // Point on ellipse perimeter
  const bindingPoint = {
    x: centerX + radiusX * Math.cos(angle),
    y: centerY + radiusY * Math.sin(angle),
  };

  // Focus is the angle normalized to 0-1
  const focus = (angle + Math.PI) / (2 * Math.PI);

  return { point: bindingPoint, focus };
}

// Get binding point on diamond perimeter
function getBindingPointOnDiamond(
  element: DrawingElement,
  point: { x: number; y: number },
): { point: { x: number; y: number }; focus: number } {
  const { x, y, width = 100, height = 100 } = element;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  // Calculate which edge of the diamond is closest
  const dx = point.x - centerX;
  const dy = point.y - centerY;

  // Normalize to determine which quadrant
  const angle = Math.atan2(dy, dx);
  let bindingPoint = { x: point.x, y: point.y };
  let focus = 0;

  // Diamond has 4 edges, determine which one to bind to
  if (Math.abs(dx / (width / 2)) >= Math.abs(dy / (height / 2))) {
    // Bind to left or right edge
    if (dx > 0) {
      // Right edge
      const t = dy / (height / 2);
      bindingPoint = {
        x: centerX + (width / 2) * (1 - Math.abs(t)),
        y: centerY + dy,
      };
    } else {
      // Left edge
      const t = dy / (height / 2);
      bindingPoint = {
        x: centerX - (width / 2) * (1 - Math.abs(t)),
        y: centerY + dy,
      };
    }
    focus = (bindingPoint.y - y) / height;
  } else {
    // Bind to top or bottom edge
    if (dy > 0) {
      // Bottom edge
      const t = dx / (width / 2);
      bindingPoint = {
        x: centerX + dx,
        y: centerY + (height / 2) * (1 - Math.abs(t)),
      };
    } else {
      // Top edge
      const t = dx / (width / 2);
      bindingPoint = {
        x: centerX + dx,
        y: centerY - (height / 2) * (1 - Math.abs(t)),
      };
    }
    focus = (bindingPoint.x - x) / width;
  }

  return { point: bindingPoint, focus };
}

// Update arrow binding when elements move
export function updateArrowBinding(
  arrow: ArrowElement,
  elements: DrawingElement[],
): ArrowElement {
  const updatedArrow = { ...arrow };

  if (arrow.startBinding) {
    const boundElement = elements.find(
      (el) => el.id === arrow.startBinding!.elementId,
    );
    if (boundElement) {
      const bindingInfo = getBindingPointFromFocus(
        boundElement,
        arrow.startBinding.focus,
      );
      if (arrow.points && arrow.points.length > 0) {
        updatedArrow.points = [
          {
            x: bindingInfo.x + arrow.startBinding.gap,
            y: bindingInfo.y + arrow.startBinding.gap,
          },
          ...arrow.points.slice(1),
        ];
      }
    }
  }

  if (arrow.endBinding) {
    const boundElement = elements.find(
      (el) => el.id === arrow.endBinding!.elementId,
    );
    if (boundElement) {
      const bindingInfo = getBindingPointFromFocus(
        boundElement,
        arrow.endBinding.focus,
      );
      if (arrow.points && arrow.points.length > 1) {
        updatedArrow.points = [
          ...arrow.points.slice(0, -1),
          {
            x: bindingInfo.x - arrow.endBinding.gap,
            y: bindingInfo.y - arrow.endBinding.gap,
          },
        ];
      }
    }
  }

  return updatedArrow;
}

// Get binding point from focus value
function getBindingPointFromFocus(
  element: DrawingElement,
  focus: number,
): { x: number; y: number } {
  const { x, y, width = 100, height = 100 } = element;

  switch (element.type) {
    case "rectangle":
      // For rectangles, focus maps to perimeter position
      const perimeter = 2 * (width + height);
      const position = focus * perimeter;

      if (position <= width) {
        // Top edge
        return { x: x + position, y: y };
      } else if (position <= width + height) {
        // Right edge
        return { x: x + width, y: y + (position - width) };
      } else if (position <= 2 * width + height) {
        // Bottom edge
        return { x: x + width - (position - width - height), y: y + height };
      } else {
        // Left edge
        return { x: x, y: y + height - (position - 2 * width - height) };
      }

    case "ellipse":
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const angle = focus * 2 * Math.PI;
      return {
        x: centerX + (width / 2) * Math.cos(angle),
        y: centerY + (height / 2) * Math.sin(angle),
      };

    case "diamond":
      const centerXd = x + width / 2;
      const centerYd = y + height / 2;
      const angled = focus * 2 * Math.PI;

      // Convert angle to diamond edge position
      const cos = Math.cos(angled);
      const sin = Math.sin(angled);
      const scale =
        1 / (Math.abs(cos) / (width / 2) + Math.abs(sin) / (height / 2));

      return {
        x: centerXd + scale * cos,
        y: centerYd + scale * sin,
      };

    default:
      return { x, y };
  }
}

// Create arrow binding
export function createArrowBinding(
  point: { x: number; y: number },
  element: DrawingElement,
): ArrowBinding {
  const bindingInfo = getBindingPointOnElement(element, point);
  return {
    elementId: element.id,
    focus: bindingInfo.focus,
    gap: BINDING_GAP,
    fixedPoint: [bindingInfo.point.x, bindingInfo.point.y],
  };
}

// Draw arrowhead
export function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  type: ArrowheadType,
  strokeWidth: number,
): void {
  if (type === "none") return;

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = Math.max(strokeWidth * 3, 10);

  ctx.save();
  ctx.strokeStyle = ctx.strokeStyle; // Preserve current stroke style
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (type) {
    case "arrow":
      // Standard arrow (two lines)
      const arrowAngle = Math.PI / 6;
      const x1 = end.x - headLength * Math.cos(angle - arrowAngle);
      const y1 = end.y - headLength * Math.sin(angle - arrowAngle);
      const x2 = end.x - headLength * Math.cos(angle + arrowAngle);
      const y2 = end.y - headLength * Math.sin(angle + arrowAngle);

      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(x1, y1);
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      break;

    case "triangle":
      // Filled triangle
      const triangleAngle = Math.PI / 6;
      const tx1 = end.x - headLength * Math.cos(angle - triangleAngle);
      const ty1 = end.y - headLength * Math.sin(angle - triangleAngle);
      const tx2 = end.x - headLength * Math.cos(angle + triangleAngle);
      const ty2 = end.y - headLength * Math.sin(angle + triangleAngle);

      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(tx1, ty1);
      ctx.lineTo(tx2, ty2);
      ctx.closePath();
      ctx.fill();
      break;

    case "triangle_outline":
      // Outlined triangle
      const outlineAngle = Math.PI / 6;
      const ox1 = end.x - headLength * Math.cos(angle - outlineAngle);
      const oy1 = end.y - headLength * Math.sin(angle - outlineAngle);
      const ox2 = end.x - headLength * Math.cos(angle + outlineAngle);
      const oy2 = end.y - headLength * Math.sin(angle + outlineAngle);

      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(ox1, oy1);
      ctx.lineTo(ox2, oy2);
      ctx.closePath();
      ctx.stroke();
      break;

    case "dot":
      // Circle/dot
      const dotRadius = headLength / 3;
      const dotX = end.x - dotRadius * Math.cos(angle);
      const dotY = end.y - dotRadius * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI);
      ctx.fill();
      break;
  }

  ctx.restore();
}
