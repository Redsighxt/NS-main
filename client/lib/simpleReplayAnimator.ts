// Simple replay animation system using direct DOM manipulation
// Based on the working React example with strokeDasharray technique

import { DrawingElement } from "../contexts/DrawingContext";
import { elementToSVGPath, toExcalidrawElement } from "./excalidrawRenderer";

// Replay animation function exactly like React example
export async function replayAnimation(
  elements: DrawingElement[],
  canvasRef: React.RefObject<HTMLCanvasElement>,
  settings: {
    strokeDuration: number;
    strokeDelay: number;
    strokeSpeed: number; // Speed multiplier for pen/highlighter strokes
  } = {
    strokeDuration: 1000,
    strokeDelay: 150,
    strokeSpeed: 1,
  },
): Promise<void> {
  const canvas = canvasRef.current;
  if (!canvas) return;

  // Sort elements by timestamp first
  const sortedElements = [...elements].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  // Calculate global bounds for proper positioning
  let globalMinX = Infinity,
    globalMinY = Infinity,
    globalMaxX = -Infinity,
    globalMaxY = -Infinity;

  sortedElements.forEach((element) => {
    let minX = element.x,
      minY = element.y,
      maxX = element.x,
      maxY = element.y;

    if (element.points && element.points.length > 0) {
      element.points.forEach((point) => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    } else {
      maxX = element.x + (element.width || 100);
      maxY = element.y + (element.height || 100);
    }

    globalMinX = Math.min(globalMinX, minX);
    globalMinY = Math.min(globalMinY, minY);
    globalMaxX = Math.max(globalMaxX, maxX);
    globalMaxY = Math.max(globalMaxY, maxY);
  });

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
    svg.style.zIndex = "10";
    canvas.parentElement?.appendChild(svg);
  }

  // Set proper viewBox to match canvas coordinates
  const padding = 50;
  const viewBoxX = globalMinX - padding;
  const viewBoxY = globalMinY - padding;
  const viewBoxWidth = Math.max(400, globalMaxX - globalMinX + padding * 2);
  const viewBoxHeight = Math.max(300, globalMaxY - globalMinY + padding * 2);

  svg.setAttribute(
    "viewBox",
    `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`,
  );
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  // Clear previous animations
  svg.querySelectorAll("path.replay").forEach((p) => p.remove());

  // Elements already sorted above

  // Animate each element
  for (const el of sortedElements) {
    const excalidrawElement = toExcalidrawElement(el);

    // Calculate duration based on element type and settings
    let elementDuration = settings.strokeDuration;

    if (el.type === "path" || el.type === "highlighter") {
      // Pen/highlighter strokes can be faster/slower
      elementDuration = settings.strokeDuration / settings.strokeSpeed;
    } else if (el.type === "library-component") {
      // Library components can have custom animation data
      if (excalidrawElement.animationData?.duration) {
        elementDuration = excalidrawElement.animationData.duration;
      } else {
        // Default to longer duration for complex library components
        elementDuration = settings.strokeDuration * 1.5;
      }
    }

    // Use stroke-dasharray animation for ALL elements (including pencil)
    const pathData = elementToSVGPath(excalidrawElement);
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

    // Apply stroke styles for proper dashed/dotted animation
    if (excalidrawElement.strokeStyle === "dashed") {
      pathEl.setAttribute("stroke-dasharray", "5,5");
    } else if (excalidrawElement.strokeStyle === "dotted") {
      pathEl.setAttribute("stroke-dasharray", "1,5");
      pathEl.setAttribute("stroke-linecap", "round"); // Make dots round
    }

    // Set opacity for highlighter and library components
    if (el.type === "highlighter") {
      pathEl.setAttribute(
        "opacity",
        (el.opacity || excalidrawElement.opacity || 0.3).toString(),
      );
      // Use multiply blend mode for highlighter effect
      pathEl.style.mixBlendMode = "multiply";
    } else if (el.type === "library-component" && excalidrawElement.opacity) {
      pathEl.setAttribute("opacity", excalidrawElement.opacity.toString());
    }

    pathEl.classList.add("replay");
    svg.appendChild(pathEl);

    // Progressive stroke animation using stroke-dasharray (like the prototype)
    const pathLength = pathEl.getTotalLength();

    // Set up stroke-dasharray and stroke-dashoffset for animation
    pathEl.style.strokeDasharray = `${pathLength}`;
    pathEl.style.strokeDashoffset = `${pathLength}`;
    // Make visible during animation, but preserve highlighter opacity
    if (el.type !== "highlighter") {
      pathEl.style.opacity = "1";
    } else {
      // For highlighter, use the opacity attribute value set earlier
      const highlighterOpacity = pathEl.getAttribute("opacity") || "0.3";
      pathEl.style.opacity = highlighterOpacity;
    }

    // Use custom easing for library components if specified
    const easing =
      el.type === "library-component" && excalidrawElement.animationData?.easing
        ? excalidrawElement.animationData.easing
        : "ease-out";

    // Create animation exactly like the prototype
    const animation = pathEl.animate(
      [{ strokeDashoffset: pathLength }, { strokeDashoffset: 0 }],
      {
        duration: elementDuration,
        easing: easing,
        fill: "forwards",
      },
    );

    // Keep stroke visible after animation completes
    animation.addEventListener("finish", () => {
      // Restore the original stroke style instead of setting to "none"
      const originalStrokeDasharray = pathEl.getAttribute("stroke-dasharray") || "none";
      if (originalStrokeDasharray !== "none") {
        pathEl.setAttribute("stroke-dasharray", originalStrokeDasharray);
        pathEl.style.strokeDasharray = ""; // Clear inline style to use attribute
      } else {
        pathEl.style.strokeDasharray = "none";
      }
      pathEl.style.strokeDashoffset = "0";
      pathEl.style.opacity = "1";
    });

    await animation.finished;

    await new Promise((res) => setTimeout(res, settings.strokeDelay));
  }
}

// Clear animation overlay
export function clearAnimationOverlay(
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
