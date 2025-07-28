// Chronological Replay Animator - For Window 2 ONLY
// This follows the exact timeline of drawing including page switches
import type { DrawingElement } from "../contexts/DrawingContext";
import type { AnimationSettings } from "../contexts/AnimationContext";
import { elementToSVGPath, toExcalidrawElement } from "./excalidrawRenderer";
import { virtualPagesManager, VirtualPage } from "./virtualPagesManager";

export interface ChronologicalReplayConfig {
  width: number;
  height: number;
  backgroundColor: string;
  replayMode: "chronological-timeline";
  transitionType:
    | "fade"
    | "slide-left"
    | "slide-right"
    | "slide-up"
    | "slide-down"
    | "zoom"
    | "none";
  transitionDuration: number;
}

interface ChronologicalEvent {
  timestamp: number;
  type: "element" | "page-switch";
  element?: DrawingElement;
  fromPage?: VirtualPage;
  toPage?: VirtualPage;
}

/**
 * Main chronological replay function for Window 2
 */
export async function replayChronologicalMode(
  elements: DrawingElement[],
  element: HTMLElement | HTMLCanvasElement,
  config: ChronologicalReplayConfig,
  settings: AnimationSettings,
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (!element) {
    const error = "No element provided for chronological replay";
    console.error(error);
    throw new Error(error);
  }

  // Determine if we're working with a canvas or container
  const isCanvas = element instanceof HTMLCanvasElement;
  let container: HTMLElement;

  if (isCanvas) {
    // For canvas elements, use the parent container
    container = element.parentElement as HTMLElement;
    if (!container) {
      const error = "Canvas element must have a parent container";
      console.error(error);
      throw new Error(error);
    }
  } else {
    // Direct container element
    container = element as HTMLElement;
  }

  if (!elements.length) {
    const warning =
      "No elements to animate in chronological replay - draw something first!";
    console.warn(warning);
    throw new Error(warning);
  }

  console.log(
    `Starting chronological timeline replay with ${elements.length} elements`,
  );

  // Setup container based on element type
  if (isCanvas) {
    // For canvas mode, set up the canvas properly
    const canvas = element as HTMLCanvasElement;
    canvas.width = config.width;
    canvas.height = config.height;

    // Clear canvas
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = config.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  } else {
    // For container mode, clear and set up the container
    container.innerHTML = "";
    container.style.width = `${config.width}px`;
    container.style.height = `${config.height}px`;
    container.style.backgroundColor = config.backgroundColor;
    container.style.position = "relative";
    container.style.overflow = "hidden";
  }

  // Create SVG overlay for animations
  let svg = createChronologicalSVG(container);

  // Build chronological timeline
  const timeline = buildChronologicalTimeline(elements);

  console.log(`Chronological timeline: ${timeline.length} events`);
  timeline.forEach((event, index) => {
    if (event.type === "element") {
      console.log(
        `Event ${index + 1}: Element ${event.element?.id} at ${event.timestamp}`,
      );
    } else {
      console.log(
        `Event ${index + 1}: Page switch from ${event.fromPage?.id} to ${event.toPage?.id} at ${event.timestamp}`,
      );
    }
  });

  // Execute chronological animation
  await executeChronologicalTimeline(
    timeline,
    svg,
    config,
    settings,
    onProgress,
  );

  console.log("Chronological timeline replay completed");
}

/**
 * Build chronological timeline of elements and page switches
 */
function buildChronologicalTimeline(
  elements: DrawingElement[],
): ChronologicalEvent[] {
  const timeline: ChronologicalEvent[] = [];

  // Sort elements by timestamp
  const sortedElements = [...elements].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  let currentPageId: string | null = null;

  sortedElements.forEach((element) => {
    const elementPage = virtualPagesManager.findElementPage(element);

    // Check if we need a page switch
    if (elementPage && currentPageId !== elementPage.id) {
      const fromPage = currentPageId
        ? virtualPagesManager.getPage(currentPageId)
        : null;

      // Add page switch event
      timeline.push({
        timestamp: element.timestamp,
        type: "page-switch",
        fromPage: fromPage || undefined,
        toPage: elementPage,
      });

      currentPageId = elementPage.id;
    }

    // Add element event
    timeline.push({
      timestamp: element.timestamp,
      type: "element",
      element,
    });
  });

  return timeline;
}

/**
 * Execute the chronological timeline
 */
async function executeChronologicalTimeline(
  timeline: ChronologicalEvent[],
  svg: SVGSVGElement,
  config: ChronologicalReplayConfig,
  settings: AnimationSettings,
  onProgress?: (progress: number) => void,
): Promise<void> {
  let currentPage: VirtualPage | null = null;

  for (let i = 0; i < timeline.length; i++) {
    const event = timeline[i];

    if (event.type === "page-switch" && event.toPage) {
      console.log(`Switching to page ${event.toPage.id}`);

      // Show page transition
      if (currentPage) {
        await showPageTransition(svg, currentPage, event.toPage, config);
      }

      // Update viewbox for new page
      updateViewBoxForPage(svg, event.toPage, config);

      // Show page indicator
      const pageIndicator = showPageIndicator(svg, event.toPage);
      setTimeout(() => pageIndicator.remove(), 2000);

      currentPage = event.toPage;

      // Wait for transition
      await new Promise((resolve) =>
        setTimeout(resolve, config.transitionDuration),
      );
    } else if (event.type === "element" && event.element) {
      console.log(`Animating element ${event.element.id}`);

      // Animate the element
      await animateChronologicalElement(event.element, svg, settings, i);

      // Wait between elements
      await new Promise((resolve) => setTimeout(resolve, settings.strokeDelay));

      // Report progress
      if (onProgress) {
        const progress = ((i + 1) / timeline.length) * 100;
        onProgress(progress);
      }
    }
  }
}

/**
 * Create SVG overlay for chronological animations
 */
function createChronologicalSVG(container: HTMLElement): SVGSVGElement {
  // Remove existing SVG from container
  const existingSvg = container.querySelector(".chronological-svg");
  if (existingSvg) existingSvg.remove();

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("chronological-svg");
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "20";
  svg.style.overflow = "visible";

  // Optional debug tint based on global setting
  const showDebugTint = (window as any).setChronologicalDebugTint;
  if (showDebugTint) {
    svg.style.backgroundColor = "rgba(0, 0, 255, 0.1)";
    console.log("Created chronological SVG overlay with debug tint");
  } else {
    console.log("Created chronological SVG overlay");
  }

  // Set initial viewBox
  svg.setAttribute("viewBox", `0 0 1920 1080`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  container.appendChild(svg);
  return svg;
}

/**
 * Update SVG viewBox for specific page
 */
function updateViewBoxForPage(
  svg: SVGSVGElement,
  page: VirtualPage,
  config: ChronologicalReplayConfig,
): void {
  svg.setAttribute(
    "viewBox",
    `${page.x} ${page.y} ${config.width} ${config.height}`,
  );
}

/**
 * Show page transition effect
 */
async function showPageTransition(
  svg: SVGSVGElement,
  fromPage: VirtualPage,
  toPage: VirtualPage,
  config: ChronologicalReplayConfig,
): Promise<void> {
  if (config.transitionType === "none") return;

  const transition = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  transition.classList.add("chronological-page-transition");
  transition.setAttribute("width", "100%");
  transition.setAttribute("height", "100%");
  transition.setAttribute("fill", "rgba(0, 100, 200, 0.2)");

  svg.appendChild(transition);

  // Animate based on transition type
  switch (config.transitionType) {
    case "fade":
      transition.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], {
        duration: config.transitionDuration,
        easing: "ease-in-out",
      });
      break;

    case "slide-left":
      transition.animate(
        [
          { transform: "translateX(100%)" },
          { transform: "translateX(0%)" },
          { transform: "translateX(-100%)" },
        ],
        {
          duration: config.transitionDuration,
          easing: "ease-in-out",
        },
      );
      break;

    case "slide-right":
      transition.animate(
        [
          { transform: "translateX(-100%)" },
          { transform: "translateX(0%)" },
          { transform: "translateX(100%)" },
        ],
        {
          duration: config.transitionDuration,
          easing: "ease-in-out",
        },
      );
      break;

    case "slide-up":
      transition.animate(
        [
          { transform: "translateY(100%)" },
          { transform: "translateY(0%)" },
          { transform: "translateY(-100%)" },
        ],
        {
          duration: config.transitionDuration,
          easing: "ease-in-out",
        },
      );
      break;

    case "slide-down":
      transition.animate(
        [
          { transform: "translateY(-100%)" },
          { transform: "translateY(0%)" },
          { transform: "translateY(100%)" },
        ],
        {
          duration: config.transitionDuration,
          easing: "ease-in-out",
        },
      );
      break;

    case "zoom":
      transition.animate(
        [
          { transform: "scale(0)" },
          { transform: "scale(1.1)" },
          { transform: "scale(0)" },
        ],
        {
          duration: config.transitionDuration,
          easing: "ease-in-out",
        },
      );
      break;
  }

  await new Promise((resolve) =>
    setTimeout(resolve, config.transitionDuration),
  );
  transition.remove();
}

/**
 * Show page indicator
 */
function showPageIndicator(svg: SVGSVGElement, page: VirtualPage): SVGElement {
  const indicator = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  indicator.classList.add("chronological-page-indicator");
  indicator.setAttribute("x", "20");
  indicator.setAttribute("y", "40");
  indicator.setAttribute("fill", "#0066cc");
  indicator.setAttribute("font-size", "18");
  indicator.setAttribute("font-weight", "bold");
  indicator.setAttribute("font-family", "system-ui, sans-serif");

  const pageInfo = page.isOrigin
    ? "📍 Origin Page (0, 0)"
    : `📄 Page (${page.gridPosition.row}, ${page.gridPosition.col})`;

  indicator.textContent = `⏰ ${pageInfo}`;

  // Add background
  const background = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  background.classList.add("chronological-page-indicator");
  background.setAttribute("x", "10");
  background.setAttribute("y", "20");
  background.setAttribute("width", `${pageInfo.length * 8 + 60}`);
  background.setAttribute("height", "30");
  background.setAttribute("fill", "rgba(255, 255, 255, 0.9)");
  background.setAttribute("stroke", "#0066cc");
  background.setAttribute("stroke-width", "2");
  background.setAttribute("rx", "6");

  svg.appendChild(background);
  svg.appendChild(indicator);

  return indicator;
}

/**
 * Animate a single element in chronological mode
 */
async function animateChronologicalElement(
  element: DrawingElement,
  svg: SVGSVGElement,
  settings: AnimationSettings,
  elementIndex: number = 0,
): Promise<void> {
  const excalidrawElement = toExcalidrawElement(element);
  const pathData = elementToSVGPath(excalidrawElement);
  if (!pathData) {
    console.warn(
      `Failed to generate SVG path for element ${element.id} of type ${element.type} in chronological replay`,
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

  pathEl.classList.add("chronological-replay");

  // Make path visible immediately for debugging, but preserve highlighter opacity
  if (element.type !== "highlighter") {
    pathEl.style.opacity = "1";
  }
  pathEl.style.visibility = "visible";

  console.log(`Adding path element to chronological SVG:`, pathEl);
  console.log(`Path d attribute:`, pathEl.getAttribute("d"));
  console.log(`Path stroke:`, pathEl.getAttribute("stroke"));

  svg.appendChild(pathEl);

  // Store the original stroke style before animation
  const originalStrokeDasharray = pathEl.getAttribute("stroke-dasharray") || "none";

  // Calculate animation duration - use element-specific duration if available (true speed mode)
  let elementDuration = settings.strokeDuration;
  if (
    settings.useElementDuration &&
    elementIndex < settings.useElementDuration.length
  ) {
    elementDuration = settings.useElementDuration[elementIndex];
  } else if (element.type === "path" || element.type === "highlighter") {
    elementDuration = settings.strokeDuration / settings.strokeSpeed;
  }

  // Progressive stroke animation
  const pathLength = pathEl.getTotalLength();

  // Validate path length
  if (!pathLength || pathLength <= 0 || !isFinite(pathLength)) {
    console.warn(
      `Invalid path length ${pathLength} for element ${element.id} in chronological replay, skipping animation`,
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
      `Failed to create animation for element ${element.id} in chronological replay`,
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
 * Clear chronological animation overlay
 */
export function clearChronologicalAnimationOverlay(
  element: HTMLElement | HTMLCanvasElement,
): void {
  if (!element) return;

  let container: HTMLElement;
  if (element instanceof HTMLCanvasElement) {
    container = element.parentElement as HTMLElement;
  } else {
    container = element as HTMLElement;
  }

  if (!container) return;

  const svg = container.querySelector(
    ".chronological-svg",
  ) as SVGSVGElement;
  if (svg) {
    svg.remove();
  }
}
