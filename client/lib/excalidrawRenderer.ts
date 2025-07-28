// Excalidraw-style renderer with rough.js for shapes and smooth pen strokes
// Supports SVG animation replay with customizable timing

import rough from "roughjs";
import { DrawingElement } from "../contexts/DrawingContext";
import type {
  ExcalidrawLibraryComponent,
  ExcalidrawLibraryElement,
} from "../contexts/LibraryContext";
import { DASHARRAY_DASHED, DASHARRAY_DOTTED } from "./constants";
import { drawArrowhead } from "./arrowSystem";

export interface ExcalidrawElement extends DrawingElement {
  // Extended properties for Excalidraw compatibility
  roughness?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  fillStyle?: "none" | "hachure" | "cross-hatch" | "dots" | "zigzag" | "solid";
  opacity?: number; // For highlighter and transparency
  backgroundColor?: string; // For fills
  // Bendable arrows and lines
  controlPoints?: { x: number; y: number }[]; // For bezier curves
  startBinding?: { elementId: string; focus: number; gap: number } | null;
  endBinding?: { elementId: string; focus: number; gap: number } | null;
}

// Default rough.js settings for Excalidraw-like appearance
const DEFAULT_ROUGH_OPTIONS = {
  roughness: 1,
  bowing: 1,
  stroke: "#000000",
  strokeWidth: 2,
  fillStyle: "none", // Default to no fill
  hachureAngle: -41,
  hachureGap: 4,
  seed: 1,
};

// Convert element to Excalidraw-compatible format
export function toExcalidrawElement(
  element: DrawingElement,
): ExcalidrawElement {
  return {
    ...element,
    roughness: element.roughness || 1,
    strokeStyle: element.strokeStyle || "solid",
    fillStyle: element.fillStyle || "none", // Use element's fillStyle directly, don't default to hachure
    opacity: element.opacity || (element.type === "highlighter" ? 0.3 : 1),
    backgroundColor: element.style.fill || "transparent",
    controlPoints: element.controlPoints || [],
  };
}

// Render element using rough.js (for shapes) or smooth canvas (for pen/highlighter)
export function renderExcalidrawElement(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  viewTransform: { x: number; y: number; scale: number },
): void {
  ctx.save();

  // Apply view transform
  ctx.scale(viewTransform.scale, viewTransform.scale);
  ctx.translate(
    viewTransform.x / viewTransform.scale,
    viewTransform.y / viewTransform.scale,
  );

  // Set opacity for elements
  if (element.opacity !== undefined) {
    ctx.globalAlpha = element.opacity;
  } else if (element.type === "highlighter") {
    ctx.globalAlpha = 0.3;
  }

  if (element.type === "path" || element.type === "highlighter") {
    // Render pen and highlighter strokes smoothly (not with rough.js)
    renderSmoothStroke(ctx, element);
  } else {
    // Render shapes with rough.js
    renderRoughShape(ctx, element);
  }

  // Draw control points for curved lines and arrows
  if (
    (element.type === "line" || element.type === "arrow") &&
    element.controlPoints &&
    element.controlPoints.length > 0
  ) {
    renderControlPoints(ctx, element, viewTransform);
  }

  ctx.restore();
}

// Render smooth strokes for pen and highlighter
function renderSmoothStroke(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
): void {
  if (!element.points || element.points.length < 2) return;

  ctx.strokeStyle = element.style.stroke;
  ctx.lineWidth = element.style.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Apply stroke style exactly like Excalidraw
  if (element.strokeStyle === "dashed") {
    ctx.setLineDash(DASHARRAY_DASHED);
  } else if (element.strokeStyle === "dotted") {
    ctx.setLineDash(DASHARRAY_DOTTED);
  } else {
    ctx.setLineDash([]); // solid
  }

  // For highlighter, use different blend mode
  if (element.type === "highlighter") {
    ctx.globalCompositeOperation = "multiply";
  }

  ctx.beginPath();
  ctx.moveTo(element.points[0].x, element.points[0].y);

  if (element.points.length === 2) {
    ctx.lineTo(element.points[1].x, element.points[1].y);
  } else {
    // Smooth curves for natural pen strokes
    for (let i = 1; i < element.points.length - 1; i++) {
      const current = element.points[i];
      const next = element.points[i + 1];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      ctx.quadraticCurveTo(current.x, current.y, midX, midY);
    }

    // Final point
    const lastPoint = element.points[element.points.length - 1];
    if (element.points.length > 2) {
      const secondLast = element.points[element.points.length - 2];
      ctx.quadraticCurveTo(
        secondLast.x,
        secondLast.y,
        lastPoint.x,
        lastPoint.y,
      );
    }
  }

  ctx.stroke();

  // Reset line dash
  ctx.setLineDash([]);
}

// Render shapes with rough.js for hand-drawn appearance
function renderRoughShape(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
): void {
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 1000;
  const roughCanvas = rough.canvas(canvas);
  const tempCtx = canvas.getContext("2d")!;

  // Generate rough options exactly like Excalidraw
  const roughOptions = {
    ...DEFAULT_ROUGH_OPTIONS,
    stroke: element.style.stroke,
    strokeWidth: element.style.strokeWidth,
    roughness: element.roughness || 1,
    fill:
      element.style.fill && element.style.fill !== "transparent"
        ? element.style.fill
        : undefined,
    fillStyle: element.fillStyle || "none",
    // For non-solid strokes, disable multiStroke like Excalidraw does
    disableMultiStroke: element.strokeStyle !== "solid",
  };

  // Apply stroke style using Rough.js strokeLineDash option
  if (element.strokeStyle === "dashed") {
    (roughOptions as any).strokeLineDash = DASHARRAY_DASHED;
    (roughOptions as any).strokeLineDashOffset = 0;
  } else if (element.strokeStyle === "dotted") {
    (roughOptions as any).strokeLineDash = DASHARRAY_DOTTED;
    (roughOptions as any).strokeLineDashOffset = 0;
  }

  // Adjust stroke width for non-solid strokes like Excalidraw
  if (element.strokeStyle !== "solid") {
    roughOptions.strokeWidth = element.style.strokeWidth + 0.5;
    (roughOptions as any).fillWeight = element.style.strokeWidth / 2;
    (roughOptions as any).hachureGap = element.style.strokeWidth * 4;
  }

  let drawable;

  switch (element.type) {
    case "rectangle":
      drawable = roughCanvas.rectangle(
        element.x,
        element.y,
        element.width || 100,
        element.height || 100,
        roughOptions,
      );
      break;

    case "ellipse":
      const cx = element.x + (element.width || 100) / 2;
      const cy = element.y + (element.height || 100) / 2;
      drawable = roughCanvas.ellipse(
        cx,
        cy,
        element.width || 100,
        element.height || 100,
        roughOptions,
      );
      break;

    case "diamond":
      const dWidth = element.width || 100;
      const dHeight = element.height || 100;
      const centerX = element.x + dWidth / 2;
      const centerY = element.y + dHeight / 2;

      const diamondPoints = [
        [centerX, element.y],
        [element.x + dWidth, centerY],
        [centerX, element.y + dHeight],
        [element.x, centerY],
      ] as [number, number][];

      drawable = roughCanvas.polygon(diamondPoints, roughOptions);
      break;

    case "line":
      if (element.points && element.points.length >= 2) {
        if (element.controlPoints && element.controlPoints.length >= 2) {
          // Bendable line with control points (bezier curve)
          const path = `M ${element.points[0].x} ${element.points[0].y} C ${element.controlPoints[0].x} ${element.controlPoints[0].y} ${element.controlPoints[1].x} ${element.controlPoints[1].y} ${element.points[1].x} ${element.points[1].y}`;
          drawable = roughCanvas.path(path, roughOptions);
        } else {
          // Straight line
          drawable = roughCanvas.line(
            element.points[0].x,
            element.points[0].y,
            element.points[1].x,
            element.points[1].y,
            roughOptions,
          );
        }
      }
      break;

    case "arrow":
      if (element.points && element.points.length >= 2) {
        const [start, end] = element.points;

        // Draw arrow shaft (bendable if control points exist)
        if (element.controlPoints && element.controlPoints.length >= 2) {
          const path = `M ${start.x} ${start.y} C ${element.controlPoints[0].x} ${element.controlPoints[0].y} ${element.controlPoints[1].x} ${element.controlPoints[1].y} ${end.x} ${end.y}`;
          drawable = roughCanvas.path(path, roughOptions);
        } else {
          drawable = roughCanvas.line(
            start.x,
            start.y,
            end.x,
            end.y,
            roughOptions,
          );
        }
      }
      break;

    case "text":
      // Text doesn't use rough.js
      ctx.font = `${element.style.fontSize || 16}px ${element.style.fontFamily || "Arial"}`;
      ctx.fillStyle = element.style.stroke;
      ctx.fillText(element.text || "", element.x, element.y);
      return;

    case "library-component":
      // Render library component from SVG or elements
      if (element.svg) {
        renderSVGComponent(ctx, element);
      } else if (
        element.libraryElements &&
        element.libraryElements.length > 0
      ) {
        // Render individual elements from library component
        element.libraryElements.forEach((libElement: any) => {
          const convertedElement = convertLibraryElementToDrawingElement(
            libElement,
            element,
          );
          renderExcalidrawElement(ctx, convertedElement, {
            x: 0,
            y: 0,
            scale: 1,
          });
        });
      } else {
        // Fallback: render as a simple rectangle placeholder
        ctx.strokeStyle = element.style.stroke;
        ctx.lineWidth = element.style.strokeWidth;
        ctx.strokeRect(
          element.x,
          element.y,
          element.width || 100,
          element.height || 100,
        );

        // Add "LIB" text indicator
        ctx.fillStyle = element.style.stroke;
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          "LIB",
          element.x + (element.width || 100) / 2,
          element.y + (element.height || 100) / 2,
        );
      }
      return;
  }

  // Draw the rough shape onto our main canvas
  if (drawable) {
    // Copy the rough drawing to our main context
    // Rough.js now handles stroke styles natively with strokeLineDash
    ctx.drawImage(canvas, 0, 0);
  }

  // Draw arrow heads for arrow elements
  if (
    element.type === "arrow" &&
    element.points &&
    element.points.length >= 2
  ) {
    const [start, end] = element.points;

    // Calculate angles for arrowheads based on line direction
    let startAngle = 0;
    let endAngle = 0;

    if (element.controlPoints && element.controlPoints.length >= 2) {
      // For curved arrows, calculate angles from control points
      startAngle = Math.atan2(
        element.controlPoints[0].y - start.y,
        element.controlPoints[0].x - start.x,
      );
      const lastControlPoint =
        element.controlPoints[element.controlPoints.length - 1];
      endAngle = Math.atan2(
        end.y - lastControlPoint.y,
        end.x - lastControlPoint.x,
      );
    } else {
      // For straight arrows
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      startAngle = angle + Math.PI; // Reverse for start arrow
      endAngle = angle;
    }

    ctx.save();
    ctx.strokeStyle = element.style.stroke;
    ctx.fillStyle = element.style.stroke;

    // Draw start arrowhead
    if (element.startArrowhead && element.startArrowhead !== "none") {
      const startPoint = { x: start.x, y: start.y };
      const startDir = {
        x: start.x + Math.cos(startAngle) * 10,
        y: start.y + Math.sin(startAngle) * 10,
      };
      drawArrowhead(
        ctx,
        startDir,
        startPoint,
        element.startArrowhead,
        element.style.strokeWidth,
      );
    }

    // Draw end arrowhead
    if (element.endArrowhead && element.endArrowhead !== "none") {
      const endPoint = { x: end.x, y: end.y };
      const endDir = {
        x: end.x - Math.cos(endAngle) * 10,
        y: end.y - Math.sin(endAngle) * 10,
      };
      drawArrowhead(
        ctx,
        endDir,
        endPoint,
        element.endArrowhead,
        element.style.strokeWidth,
      );
    }

    ctx.restore();
  }
}

// Convert element to SVG path for animation (supporting bendable shapes)
export function elementToSVGPath(element: ExcalidrawElement): string {
  console.log(
    `Generating SVG path for element type: ${element.type}, id: ${element.id}`,
    element,
  );
  switch (element.type) {
    case "path":
    case "highlighter":
      if (!element.points || element.points.length < 2) {
        console.warn(
          `Element ${element.id} has no valid points for SVG path generation:`,
          element.points,
        );
        return "";
      }

      // For two points, use straight line
      if (element.points.length === 2) {
        return `M${element.points[0].x},${element.points[0].y} L${element.points[1].x},${element.points[1].y}`;
      }

      // For multiple points, use smooth curves matching the canvas rendering
      let pathData = `M${element.points[0].x},${element.points[0].y}`;

      // Create smooth curves for natural pen strokes (matching canvas rendering logic)
      for (let i = 1; i < element.points.length - 1; i++) {
        const current = element.points[i];
        const next = element.points[i + 1];
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;
        pathData += ` Q${current.x},${current.y} ${midX},${midY}`;
      }

      // Final point
      const lastPoint = element.points[element.points.length - 1];
      if (element.points.length > 2) {
        const secondLast = element.points[element.points.length - 2];
        pathData += ` Q${secondLast.x},${secondLast.y} ${lastPoint.x},${lastPoint.y}`;
      }

      console.log(`Generated path data for ${element.type}:`, pathData);
      return pathData;

    case "rectangle":
      const p1 = { x: element.x, y: element.y };
      const p2 = {
        x: element.x + (element.width || 100),
        y: element.y + (element.height || 100),
      };
      return `M${p1.x},${p1.y} L${p2.x},${p1.y} L${p2.x},${p2.y} L${p1.x},${p2.y} Z`;

    case "ellipse":
      const p1e = { x: element.x, y: element.y };
      const p2e = {
        x: element.x + (element.width || 100),
        y: element.y + (element.height || 100),
      };
      const rx = Math.abs(p2e.x - p1e.x) / 2;
      const ry = Math.abs(p2e.y - p1e.y) / 2;
      const cx = (p1e.x + p2e.x) / 2;
      const cy = (p1e.y + p2e.y) / 2;
      return `M${cx + rx},${cy} A${rx},${ry} 0 1,0 ${cx - rx},${cy} A${rx},${ry} 0 1,0 ${cx + rx},${cy}`;

    case "diamond":
      const p1d = { x: element.x, y: element.y };
      const p2d = {
        x: element.x + (element.width || 100),
        y: element.y + (element.height || 100),
      };
      const cxd = (p1d.x + p2d.x) / 2;
      const cyd = (p1d.y + p2d.y) / 2;
      return `M${cxd},${p1d.y} L${p2d.x},${cyd} L${cxd},${p2d.y} L${p1d.x},${cyd} Z`;

    case "library-component":
      // For library components, generate a simple bounding box path for animation
      if (element.svg) {
        // Try to extract path from SVG if possible, otherwise use bounding box
        const pathMatch = element.svg.match(/<path[^>]*d="([^"]*)"[^>]*>/);
        if (pathMatch) {
          return pathMatch[1];
        }
      }
      // Fallback to bounding box
      const libP1 = { x: element.x, y: element.y };
      const libP2 = {
        x: element.x + (element.width || 100),
        y: element.y + (element.height || 100),
      };
      return `M${libP1.x},${libP1.y} L${libP2.x},${libP1.y} L${libP2.x},${libP2.y} L${libP1.x},${libP2.y} Z`;

    case "line":
      if (!element.points || element.points.length < 2) {
        console.warn(
          `Line element ${element.id} has no valid points:`,
          element.points,
        );
        return "";
      }
      const [lineStart, lineEnd] = element.points;

      if (element.controlPoints && element.controlPoints.length >= 2) {
        // Bendable line (bezier curve)
        const linePath = `M${lineStart.x},${lineStart.y} C${element.controlPoints[0].x},${element.controlPoints[0].y} ${element.controlPoints[1].x},${element.controlPoints[1].y} ${lineEnd.x},${lineEnd.y}`;
        console.log(`Generated bendable line path:`, linePath);
        return linePath;
      } else {
        // Straight line
        const linePath = `M${lineStart.x},${lineStart.y} L${lineEnd.x},${lineEnd.y}`;
        console.log(`Generated straight line path:`, linePath);
        return linePath;
      }

    case "arrow":
      if (!element.points || element.points.length < 2) {
        console.warn(
          `Arrow element ${element.id} has no valid points:`,
          element.points,
        );
        return "";
      }
      const [arrowStart, arrowEnd] = element.points;

      let arrowPath = "";

      if (element.controlPoints && element.controlPoints.length >= 2) {
        // Bendable arrow shaft
        arrowPath = `M${arrowStart.x},${arrowStart.y} C${element.controlPoints[0].x},${element.controlPoints[0].y} ${element.controlPoints[1].x},${element.controlPoints[1].y} ${arrowEnd.x},${arrowEnd.y}`;
      } else {
        // Straight arrow shaft
        arrowPath = `M${arrowStart.x},${arrowStart.y} L${arrowEnd.x},${arrowEnd.y}`;
      }

      // Add arrowhead
      const dx = arrowEnd.x - arrowStart.x;
      const dy = arrowEnd.y - arrowStart.y;
      const angle = Math.atan2(dy, dx);
      const arrowLength = 10;
      const arrowAngle = Math.PI / 6;
      const tip1 = {
        x: arrowEnd.x - arrowLength * Math.cos(angle - arrowAngle),
        y: arrowEnd.y - arrowLength * Math.sin(angle - arrowAngle),
      };
      const tip2 = {
        x: arrowEnd.x - arrowLength * Math.cos(angle + arrowAngle),
        y: arrowEnd.y - arrowLength * Math.sin(angle + arrowAngle),
      };

      arrowPath += ` M${tip1.x},${tip1.y} L${arrowEnd.x},${arrowEnd.y} L${tip2.x},${tip2.y}`;
      console.log(`Generated arrow path:`, arrowPath);
      return arrowPath;

    default:
      console.warn(
        `Unknown element type ${element.type} for SVG path generation`,
      );
      return "";
  }
}

// Render control points for curved lines and arrows
function renderControlPoints(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
  viewTransform: { x: number; y: number; scale: number },
): void {
  if (!element.controlPoints || element.controlPoints.length === 0) return;

  ctx.save();

  // Draw control points as small circles
  element.controlPoints.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = "#007AFF";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw connecting lines to control points
    if (element.points && element.points.length >= 2) {
      ctx.beginPath();
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = "#007AFF80";
      ctx.lineWidth = 1;

      // Connect to nearest line points
      if (index === 0 && element.points[0]) {
        ctx.moveTo(element.points[0].x, element.points[0].y);
        ctx.lineTo(point.x, point.y);
      } else if (
        index === element.controlPoints.length - 1 &&
        element.points[1]
      ) {
        ctx.moveTo(element.points[1].x, element.points[1].y);
        ctx.lineTo(point.x, point.y);
      }

      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  ctx.restore();
}

// Animation replay function with adjustable timing
export async function replayExcalidrawAnimation(
  elements: ExcalidrawElement[],
  canvasRef: React.RefObject<HTMLCanvasElement>,
  settings: {
    strokeDuration: number; // How long each element takes to draw
    strokeDelay: number; // Delay between elements
    strokeSpeed: number; // Speed multiplier for individual strokes
  } = {
    strokeDuration: 1000,
    strokeDelay: 150,
    strokeSpeed: 1,
  },
): Promise<void> {
  const canvas = canvasRef.current;
  if (!canvas) return;

  // Create or get SVG overlay for animations
  let svg = canvas.parentElement?.querySelector(
    ".animation-svg",
  ) as SVGSVGElement;
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("animation-svg");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "1000";
    canvas.parentElement?.appendChild(svg);
  }

  // Clear previous animations
  svg.querySelectorAll("path.replay").forEach((p) => p.remove());

  // Sort elements by timestamp
  const sortedElements = [...elements].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  // Animate each element
  for (const el of sortedElements) {
    const pathData = elementToSVGPath(el);
    if (!pathData) continue;

    const pathEl = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    pathEl.setAttribute("d", pathData);
    pathEl.setAttribute("stroke", el.style.stroke);
    pathEl.setAttribute("fill", el.style.fill || "none");
    // Scale stroke width for SVG to match canvas appearance (SVG appears thicker)
    pathEl.setAttribute(
      "stroke-width",
      Math.max(0.5, el.style.strokeWidth * 0.7).toString(),
    );
    pathEl.setAttribute("stroke-linecap", "round");
    pathEl.setAttribute("stroke-linejoin", "round");

    // Apply stroke style for animated dashed/dotted lines
    if (el.strokeStyle === "dashed") {
      pathEl.setAttribute("stroke-dasharray", DASHARRAY_DASHED.join(","));
    } else if (el.strokeStyle === "dotted") {
      pathEl.setAttribute("stroke-dasharray", DASHARRAY_DOTTED.join(","));
      pathEl.setAttribute("stroke-linecap", "round"); // Make dots round
    }

    // Set opacity for highlighter
    if (el.type === "highlighter") {
      pathEl.setAttribute("opacity", (el.opacity || 0.3).toString());
    }

    pathEl.classList.add("replay");

    // Store original stroke style for later restoration
    const originalStrokeDasharray =
      pathEl.getAttribute("stroke-dasharray") || "none";

    // Set initial invisible state BEFORE adding to DOM
    pathEl.style.strokeDasharray = "1000";
    pathEl.style.strokeDashoffset = "1000";
    pathEl.style.opacity = "0"; // Start invisible

    svg.appendChild(pathEl);

    // Get accurate length and update after adding to DOM
    let len: number;
    try {
      len = pathEl.getTotalLength();
      pathEl.style.strokeDasharray = `${len}`;
      pathEl.style.strokeDashoffset = `${len}`;
      // Make visible but stroke is hidden, preserve highlighter opacity
      if (el.type !== "highlighter") {
        pathEl.style.opacity = "1";
      } else {
        // For highlighter, use the opacity attribute value set earlier
        const highlighterOpacity = pathEl.getAttribute("opacity") || "0.3";
        pathEl.style.opacity = highlighterOpacity;
      }
    } catch (e) {
      // Fallback if getTotalLength fails
      len = 1000;
      pathEl.style.strokeDasharray = `${len}`;
      pathEl.style.strokeDashoffset = `${len}`;
    }

    // Force reflow to ensure styles are applied
    pathEl.getBoundingClientRect();

    // Calculate duration based on element type and settings
    const elementDuration =
      el.type === "path" || el.type === "highlighter"
        ? settings.strokeDuration / settings.strokeSpeed // Pen strokes can be faster/slower
        : settings.strokeDuration; // Shapes use base duration

    const anim = pathEl.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      {
        duration: elementDuration,
        easing: "ease-in-out",
      },
    );

    await anim.finished;
    pathEl.style.strokeDashoffset = "0";

    // Restore original stroke style (dashed/dotted) or remove for solid
    if (originalStrokeDasharray !== "none") {
      pathEl.setAttribute("stroke-dasharray", originalStrokeDasharray);
      pathEl.style.strokeDasharray = "";
    } else {
      pathEl.removeAttribute("stroke-dasharray");
      pathEl.style.strokeDasharray = "";
    }

    await new Promise((res) => setTimeout(res, settings.strokeDelay));
  }
}

// Clear animation overlay
export function clearExcalidrawAnimationOverlay(
  canvasRef: React.RefObject<HTMLCanvasElement>,
): void {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const svg = canvas.parentElement?.querySelector(
    ".animation-svg",
  ) as SVGSVGElement;
  if (svg) {
    svg.remove();
  }
}

// Render SVG component on canvas
function renderSVGComponent(
  ctx: CanvasRenderingContext2D,
  element: ExcalidrawElement,
): void {
  if (!element.svg) return;

  try {
    // Create a temporary container to parse the SVG
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = element.svg;
    const svgElement = tempDiv.querySelector("svg");

    if (svgElement) {
      // Set the SVG size to match element dimensions
      svgElement.setAttribute("width", (element.width || 100).toString());
      svgElement.setAttribute("height", (element.height || 100).toString());

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = function () {
        ctx.drawImage(
          img,
          element.x,
          element.y,
          element.width || 100,
          element.height || 100,
        );
        URL.revokeObjectURL(url);
      };

      img.onerror = function () {
        // Fallback: render as placeholder
        ctx.strokeStyle = element.style.stroke || "#000";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          element.x,
          element.y,
          element.width || 100,
          element.height || 100,
        );
        ctx.fillStyle = element.style.stroke || "#000";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          "SVG",
          element.x + (element.width || 100) / 2,
          element.y + (element.height || 100) / 2,
        );
        URL.revokeObjectURL(url);
      };

      img.src = url;
    } else {
      // No valid SVG found, render placeholder
      ctx.strokeStyle = element.style.stroke || "#000";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        element.x,
        element.y,
        element.width || 100,
        element.height || 100,
      );
      ctx.fillStyle = element.style.stroke || "#000";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        "LIB",
        element.x + (element.width || 100) / 2,
        element.y + (element.height || 100) / 2,
      );
    }
  } catch (error) {
    console.error("Error rendering SVG component:", error);
    // Fallback: render as placeholder
    ctx.strokeStyle = element.style.stroke || "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      element.x,
      element.y,
      element.width || 100,
      element.height || 100,
    );
    ctx.fillStyle = element.style.stroke || "#000";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "ERR",
      element.x + (element.width || 100) / 2,
      element.y + (element.height || 100) / 2,
    );
  }
}

// Convert library element to our drawing element format
function convertLibraryElementToDrawingElement(
  libElement: ExcalidrawLibraryElement,
  parentElement: ExcalidrawElement,
): ExcalidrawElement {
  return {
    ...parentElement,
    id: libElement.id || `lib-element-${Date.now()}`,
    type: (libElement.type as any) || "rectangle",
    x: parentElement.x + (libElement.x || 0),
    y: parentElement.y + (libElement.y || 0),
    width: libElement.width || 50,
    height: libElement.height || 50,
    style: {
      stroke: libElement.strokeColor || "#000000",
      strokeWidth: libElement.strokeWidth || 2,
      fill: libElement.backgroundColor || "transparent",
    },
    roughness: libElement.roughness || 1,
    opacity: libElement.opacity || 1,
    strokeStyle: libElement.strokeStyle || "solid",
    fillStyle: (libElement.fillStyle as any) || "none",
    // Preserve parent properties
    layerId: parentElement.layerId,
    timestamp: parentElement.timestamp,
  };
}

// Add library component to canvas
export function addLibraryComponentToCanvas(
  component: ExcalidrawLibraryComponent,
  position: { x: number; y: number },
  layerId: string,
): ExcalidrawElement {
  // Try to get dimensions from the first element or use defaults
  let width = 100;
  let height = 100;

  if (component.elements && component.elements.length > 0) {
    const firstElement = component.elements[0];
    if (firstElement.width && firstElement.height) {
      width = firstElement.width;
      height = firstElement.height;
    }
  }

  const element: ExcalidrawElement = {
    id: `library-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: "library-component" as any,
    x: position.x - width / 2, // Center on cursor
    y: position.y - height / 2, // Center on cursor
    width: width,
    height: height,
    points: [],
    style: {
      stroke: "#000000",
      strokeWidth: 2,
      fill: "transparent",
    },
    layerId: layerId,
    timestamp: Date.now(),
    roughness: 1,
    strokeStyle: "solid",
    fillStyle: "none",
    opacity: 1,
    // Library-specific properties
    svg: component.elements[0]?.svg || null,
    libraryElements: component.elements || [],
    libraryComponentId: component.id,
    animationData: component.animationData || null,
    // Additional metadata
    text: component.name || `Library Component`,
  };

  return element;
}

// Helper function to generate smooth bezier path through multiple points
function generateBezierPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Calculate control points for smooth curve
    const cp1x = prev.x + (curr.x - prev.x) * 0.6;
    const cp1y = prev.y + (curr.y - prev.y) * 0.6;
    const cp2x = curr.x - (next.x - curr.x) * 0.6;
    const cp2y = curr.y - (next.y - curr.y) * 0.6;

    path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${curr.x} ${curr.y}`;
  }

  // Final point
  const lastIdx = points.length - 1;
  const prevPoint = points[lastIdx - 1];
  const lastPoint = points[lastIdx];
  const cp1x = prevPoint.x + (lastPoint.x - prevPoint.x) * 0.6;
  const cp1y = prevPoint.y + (lastPoint.y - prevPoint.y) * 0.6;

  path += ` Q ${cp1x} ${cp1y} ${lastPoint.x} ${lastPoint.y}`;

  return path;
}

// Calculate the actual end point for bezier curve arrows
function calculateBezierEndPoint(
  controlPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
): { x: number; y: number } {
  // For now, just return the actual end point
  // In a full implementation, this would calculate the tangent direction
  return endPoint;
}
