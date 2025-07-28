// Enhanced replay animator specifically designed for 1920x1080 replay window
import type { DrawingElement } from "../contexts/DrawingContext";
import type { AnimationSettings } from "../contexts/AnimationContext";
import { elementToSVGPath, toExcalidrawElement } from "./excalidrawRenderer";

export interface ReplayWindowConfig {
  width: number;
  height: number;
  backgroundColor: string;
  scalingMode: "fit" | "fill" | "stretch" | "native";
  showBackground: boolean;
}

/**
 * Enhanced replay animation optimized for fixed-size replay windows
 */
export async function replayInWindow(
  elements: DrawingElement[],
  canvas: HTMLCanvasElement,
  config: ReplayWindowConfig,
  settings: AnimationSettings,
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (!canvas) {
    const error = "No canvas provided for replay";
    console.error(error);
    throw new Error(error);
  }

  if (!elements || elements.length === 0) {
    const warning = "No elements to animate - draw something first!";
    console.warn(warning);
    throw new Error(warning);
  }

  console.log(
    `Starting replay in ${config.width}x${config.height} window with ${elements.length} elements`,
  );
  console.log(`Canvas dimensions: ${canvas.width}x${canvas.height}`);
  console.log(`Config:`, config);

  // Set canvas size to exact replay dimensions
  canvas.width = config.width;
  canvas.height = config.height;

  // Configure canvas background
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const error = "Failed to get canvas 2D context";
    console.error(error);
    throw new Error(error);
  }

  if (config.showBackground) {
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, config.width, config.height);
  } else {
    ctx.clearRect(0, 0, config.width, config.height);
  }

  // Calculate optimal viewbox for elements
  const bounds = calculateElementsBounds(elements);
  const viewBox = calculateOptimalViewBox(bounds, config);

  console.log(`Replay viewBox:`, viewBox);
  console.log(`Element bounds:`, bounds);

  // Create SVG overlay for animations
  let svg = canvas.parentElement?.querySelector(
    ".replay-window-svg",
  ) as SVGSVGElement;
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.classList.add("replay-window-svg");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "20"; // Higher z-index to ensure visibility
    svg.style.overflow = "visible";

    // Optional debug tint based on global setting
    const showDebugTint = (window as any).setReplayWindowDebugTint;
    if (showDebugTint) {
      svg.style.backgroundColor = "rgba(255, 0, 0, 0.1)";
      console.log("Created replay window SVG overlay with debug tint");
    } else {
      console.log("Created replay window SVG overlay");
    }
    canvas.parentElement?.appendChild(svg);
  } else {
    console.log("Using existing SVG overlay for replay window");
  }

  // Set SVG viewBox to match our calculated optimal view
  svg.setAttribute(
    "viewBox",
    `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
  );
  svg.setAttribute(
    "preserveAspectRatio",
    getPreserveAspectRatio(config.scalingMode),
  );

  // Clear previous animations
  svg.querySelectorAll("path.replay-window").forEach((p) => p.remove());

  // Sort elements by timestamp
  const sortedElements = [...elements].sort(
    (a, b) => a.timestamp - b.timestamp,
  );
  const totalElements = sortedElements.length;

  console.log(`Animating ${totalElements} elements in replay window`);
  console.log(`SVG created with viewBox: ${svg.getAttribute("viewBox")}`);

  // Animate each element
  for (let i = 0; i < sortedElements.length; i++) {
    const element = sortedElements[i];

    await animateElementInWindow(element, svg, settings);
    await new Promise((resolve) => setTimeout(resolve, settings.strokeDelay));

    // Report progress
    if (onProgress) {
      const progress = ((i + 1) / totalElements) * 100;
      onProgress(progress);
    }
  }

  console.log("Replay window animation completed");
}

/**
 * Calculate bounding box for all elements
 */
function calculateElementsBounds(elements: DrawingElement[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  elements.forEach((element) => {
    let elMinX = element.x,
      elMinY = element.y,
      elMaxX = element.x,
      elMaxY = element.y;

    if (element.points && element.points.length > 0) {
      element.points.forEach((point) => {
        elMinX = Math.min(elMinX, point.x);
        elMinY = Math.min(elMinY, point.y);
        elMaxX = Math.max(elMaxX, point.x);
        elMaxY = Math.max(elMaxY, point.y);
      });
    } else {
      elMaxX = element.x + (element.width || 100);
      elMaxY = element.y + (element.height || 100);
    }

    minX = Math.min(minX, elMinX);
    minY = Math.min(minY, elMinY);
    maxX = Math.max(maxX, elMaxX);
    maxY = Math.max(maxY, elMaxY);
  });

  return { minX, minY, maxX, maxY };
}

/**
 * Calculate optimal viewBox to fit content in replay window
 */
function calculateOptimalViewBox(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  config: ReplayWindowConfig,
) {
  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;
  const aspectRatio = config.width / config.height;

  // Add padding around content
  const padding = Math.max(contentWidth, contentHeight) * 0.1;

  let viewBoxWidth = contentWidth + padding * 2;
  let viewBoxHeight = contentHeight + padding * 2;

  // Adjust viewBox to match aspect ratio based on scaling mode
  switch (config.scalingMode) {
    case "fit":
      const contentAspectRatio = viewBoxWidth / viewBoxHeight;
      if (contentAspectRatio > aspectRatio) {
        // Content is wider, adjust height
        viewBoxHeight = viewBoxWidth / aspectRatio;
      } else {
        // Content is taller, adjust width
        viewBoxWidth = viewBoxHeight * aspectRatio;
      }
      break;
    case "fill":
      const fillAspectRatio = viewBoxWidth / viewBoxHeight;
      if (fillAspectRatio < aspectRatio) {
        // Adjust to fill width
        viewBoxHeight = viewBoxWidth / aspectRatio;
      } else {
        // Adjust to fill height
        viewBoxWidth = viewBoxHeight * aspectRatio;
      }
      break;
    case "stretch":
      // Keep content bounds, SVG will stretch
      break;
    case "native":
      // Use replay window dimensions as viewBox
      return {
        x: bounds.minX - padding,
        y: bounds.minY - padding,
        width: config.width,
        height: config.height,
      };
  }

  return {
    x: bounds.minX + contentWidth / 2 - viewBoxWidth / 2,
    y: bounds.minY + contentHeight / 2 - viewBoxHeight / 2,
    width: viewBoxWidth,
    height: viewBoxHeight,
  };
}

/**
 * Get preserveAspectRatio value based on scaling mode
 */
function getPreserveAspectRatio(scalingMode: string): string {
  switch (scalingMode) {
    case "fit":
      return "xMidYMid meet";
    case "fill":
      return "xMidYMid slice";
    case "stretch":
      return "none";
    case "native":
    default:
      return "xMidYMid meet";
  }
}

/**
 * Animate a single element in the replay window
 */
async function animateElementInWindow(
  element: DrawingElement,
  svg: SVGSVGElement,
  settings: AnimationSettings,
): Promise<void> {
  const excalidrawElement = toExcalidrawElement(element);
  const pathData = elementToSVGPath(excalidrawElement);
  if (!pathData) {
    console.warn(
      `Failed to generate SVG path for element ${element.id} of type ${element.type}`,
    );
    return;
  }

  const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pathEl.setAttribute("d", pathData);
  pathEl.setAttribute("stroke", element.style.stroke);
  pathEl.setAttribute("fill", element.style.fill || "none");
  // Scale stroke width for SVG to match canvas appearance (SVG appears thicker)
  pathEl.setAttribute(
    "stroke-width",
    Math.max(0.5, element.style.strokeWidth * 0.7).toString(),
  );
  pathEl.setAttribute("stroke-linecap", "round");
  pathEl.setAttribute("stroke-linejoin", "round");

  // Apply stroke styles
  if (excalidrawElement.strokeStyle === "dashed") {
    pathEl.setAttribute("stroke-dasharray", "5,5");
  } else if (excalidrawElement.strokeStyle === "dotted") {
    pathEl.setAttribute("stroke-dasharray", "1,5");
    pathEl.setAttribute("stroke-linecap", "round");
  }

  // Apply opacity for highlighter
  if (element.type === "highlighter") {
    pathEl.setAttribute("opacity", (element.opacity || 0.3).toString());
    pathEl.style.mixBlendMode = "multiply";
  }

  pathEl.classList.add("replay-window");

  // Make path visible immediately for debugging, but preserve highlighter opacity
  if (element.type !== "highlighter") {
    pathEl.style.opacity = "1";
  }
  pathEl.style.visibility = "visible";

  console.log(`Adding path element to SVG:`, pathEl);
  console.log(`Path d attribute:`, pathEl.getAttribute("d"));
  console.log(`Path stroke:`, pathEl.getAttribute("stroke"));

  svg.appendChild(pathEl);

  // Store the original stroke style before animation
  const originalStrokeDasharray = pathEl.getAttribute("stroke-dasharray") || "none";

  // Calculate animation duration
  let elementDuration = settings.strokeDuration;
  if (element.type === "path" || element.type === "highlighter") {
    elementDuration = settings.strokeDuration / settings.strokeSpeed;
  }

  // Progressive stroke animation
  const pathLength = pathEl.getTotalLength();

  // Validate path length
  if (!pathLength || pathLength <= 0 || !isFinite(pathLength)) {
    console.warn(
      `Invalid path length ${pathLength} for element ${element.id} in replay window, skipping animation`,
    );
    return;
  }

  pathEl.style.strokeDasharray = `${pathLength}`;
  pathEl.style.strokeDashoffset = `${pathLength}`;

  const animation = pathEl.animate(
    [{ strokeDashoffset: pathLength }, { strokeDashoffset: 0 }],
    {
      duration: elementDuration,
      easing: "ease-out",
      fill: "forwards",
    },
  );

  if (!animation) {
    console.warn(
      `Failed to create animation for element ${element.id} in replay window`,
    );
    // Fallback: immediately show the completed path
    if (originalStrokeDasharray !== "none") {
      pathEl.setAttribute("stroke-dasharray", originalStrokeDasharray);
      pathEl.style.strokeDasharray = ""; // Clear inline style to use attribute
    } else {
      pathEl.style.strokeDasharray = "none";
    }
    pathEl.style.strokeDashoffset = "0";
    return;
  }

  animation.addEventListener("finish", () => {
    // Restore the original stroke style instead of setting to "none"
    if (originalStrokeDasharray !== "none") {
      pathEl.setAttribute("stroke-dasharray", originalStrokeDasharray);
      pathEl.style.strokeDasharray = ""; // Clear inline style to use attribute
    } else {
      pathEl.style.strokeDasharray = "none";
    }
    pathEl.style.strokeDashoffset = "0";
  });

  await animation.finished;
}

/**
 * Clear replay window animation overlay
 */
export function clearReplayWindowOverlay(canvas: HTMLCanvasElement): void {
  if (!canvas || !canvas.parentElement) return;

  const svg = canvas.parentElement.querySelector(
    ".replay-window-svg",
  ) as SVGSVGElement;
  if (svg) {
    svg.remove();
  }
}

/**
 * Optimize elements for replay window rendering
 */
export function optimizeElementsForReplay(
  elements: DrawingElement[],
  windowConfig: ReplayWindowConfig,
): DrawingElement[] {
  // For now, return elements as-is
  // Future optimizations could include:
  // - Simplifying paths that are too small to see
  // - Combining nearby elements
  // - Adjusting stroke widths for readability
  return elements;
}
