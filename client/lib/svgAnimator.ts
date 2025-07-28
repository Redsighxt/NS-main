// SVG-based stroke animation system like excalidraw-animate
// This mimics how excalidraw-animate progressively draws strokes

import { DrawingElement } from "../contexts/DrawingContext";

export interface AnimationFrame {
  timestamp: number;
  elements: DrawingElement[];
  animatingElementId?: string;
  animationProgress?: number; // 0-1 for stroke progress
}

// Convert drawing element to SVG path data
export function elementToSVGPath(element: DrawingElement): string {
  switch (element.type) {
    case "path":
      if (!element.points || element.points.length < 2) return "";

      let path = `M ${element.points[0].x} ${element.points[0].y}`;

      if (element.points.length === 2) {
        path += ` L ${element.points[1].x} ${element.points[1].y}`;
      } else {
        // Use quadratic curves for smooth paths
        for (let i = 1; i < element.points.length - 1; i++) {
          const midX = (element.points[i].x + element.points[i + 1].x) / 2;
          const midY = (element.points[i].y + element.points[i + 1].y) / 2;
          path += ` Q ${element.points[i].x} ${element.points[i].y} ${midX} ${midY}`;
        }
        // Final point
        if (element.points.length > 2) {
          const lastPoint = element.points[element.points.length - 1];
          const secondLastPoint = element.points[element.points.length - 2];
          path += ` Q ${secondLastPoint.x} ${secondLastPoint.y} ${lastPoint.x} ${lastPoint.y}`;
        }
      }

      return path;

    case "rectangle":
      const width = element.width || 100;
      const height = element.height || 100;
      return `M ${element.x} ${element.y} L ${element.x + width} ${element.y} L ${element.x + width} ${element.y + height} L ${element.x} ${element.y + height} Z`;

    case "ellipse":
      const rx = (element.width || 100) / 2;
      const ry = (element.height || 100) / 2;
      const cx = element.x + rx;
      const cy = element.y + ry;
      return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy}`;

    case "diamond":
      const dWidth = element.width || 100;
      const dHeight = element.height || 100;
      const centerX = element.x + dWidth / 2;
      const centerY = element.y + dHeight / 2;
      return `M ${centerX} ${element.y} L ${element.x + dWidth} ${centerY} L ${centerX} ${element.y + dHeight} L ${element.x} ${centerY} Z`;

    case "line":
      if (!element.points || element.points.length < 2) return "";
      return `M ${element.points[0].x} ${element.points[0].y} L ${element.points[1].x} ${element.points[1].y}`;

    case "arrow":
      if (!element.points || element.points.length < 2) return "";
      const [start, end] = element.points;
      const headLength = 15;
      const angle = Math.atan2(end.y - start.y, end.x - start.x);

      const arrowHead1X = end.x - headLength * Math.cos(angle - Math.PI / 6);
      const arrowHead1Y = end.y - headLength * Math.sin(angle - Math.PI / 6);
      const arrowHead2X = end.x - headLength * Math.cos(angle + Math.PI / 6);
      const arrowHead2Y = end.y - headLength * Math.sin(angle + Math.PI / 6);

      return `M ${start.x} ${start.y} L ${end.x} ${end.y} M ${end.x} ${end.y} L ${arrowHead1X} ${arrowHead1Y} M ${end.x} ${end.y} L ${arrowHead2X} ${arrowHead2Y}`;

    default:
      return "";
  }
}

// Get the total length of an SVG path (for animation)
export function getPathLength(pathData: string): number {
  // Create a temporary SVG element to measure path length
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  svg.appendChild(path);
  document.body.appendChild(svg);

  const length = path.getTotalLength();
  document.body.removeChild(svg);

  return length;
}

// Render animated SVG element
export function renderAnimatedSVGElement(
  ctx: CanvasRenderingContext2D,
  element: DrawingElement,
  progress: number = 1, // 0-1
): void {
  if (element.type === "text") {
    // Text doesn't animate, just render normally
    ctx.font = `${element.style.fontSize || 16}px ${element.style.fontFamily || "Arial"}`;
    ctx.fillStyle = element.style.stroke;
    ctx.fillText(element.text || "", element.x, element.y);
    return;
  }

  const pathData = elementToSVGPath(element);
  if (!pathData) return;

  // Create temporary SVG to get path
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  svg.appendChild(path);
  document.body.appendChild(svg);

  const totalLength = path.getTotalLength();
  const currentLength = totalLength * progress;

  // Draw the path progressively using getPointAtLength
  ctx.save();
  ctx.strokeStyle = element.style.stroke;
  ctx.lineWidth = element.style.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (
    element.style.fill &&
    element.style.fill !== "transparent" &&
    progress >= 1
  ) {
    ctx.fillStyle = element.style.fill;
  }

  // Draw the progressive path
  if (currentLength > 0) {
    ctx.beginPath();

    // Sample points along the path
    const steps = Math.max(2, Math.floor(currentLength / 2));
    let firstPoint = true;

    for (let i = 0; i <= steps; i++) {
      const distance = (currentLength * i) / steps;
      const point = path.getPointAtLength(Math.min(distance, totalLength));

      if (firstPoint) {
        ctx.moveTo(point.x, point.y);
        firstPoint = false;
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }

    // Fill if it's a closed shape and fully drawn
    if (
      element.style.fill &&
      element.style.fill !== "transparent" &&
      progress >= 1 &&
      ["rectangle", "ellipse", "diamond"].includes(element.type)
    ) {
      ctx.fill();
    }

    ctx.stroke();
  }

  document.body.removeChild(svg);
  ctx.restore();
}

// Build excalidraw-animate style animation frames
export function buildProgressiveAnimationFrames(
  elements: DrawingElement[],
  strokeDelay: number = 1000, // Time for each stroke to complete
): AnimationFrame[] {
  const frames: AnimationFrame[] = [];
  let currentTime = 0;

  // Sort elements by timestamp (chronological order)
  const sortedElements = [...elements].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  for (let i = 0; i < sortedElements.length; i++) {
    const element = sortedElements[i];
    const previousElements = sortedElements.slice(0, i);

    // Add multiple frames for this element being drawn progressively
    const animationSteps = 80; // Number of animation frames per stroke

    for (let step = 0; step <= animationSteps; step++) {
      const progress = step / animationSteps;
      const frameTime = currentTime + strokeDelay * progress;

      frames.push({
        timestamp: frameTime,
        elements: previousElements, // Previously completed elements
        animatingElementId: element.id,
        animationProgress: progress,
      });
    }

    // Add final frame with completed element
    currentTime += strokeDelay;
    frames.push({
      timestamp: currentTime,
      elements: sortedElements.slice(0, i + 1),
    });
  }

  return frames;
}
