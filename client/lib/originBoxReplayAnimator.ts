// Origin Box Replay Animator - Fixed origin box size with page transitions
import type { DrawingElement } from "../contexts/DrawingContext";
import type { AnimationSettings } from "../contexts/AnimationContext";
import { elementToSVGPath, toExcalidrawElement } from "./excalidrawRenderer";
import { virtualPagesManager, VirtualPage } from "./virtualPagesManager";

export interface OriginBoxReplayConfig {
  width: number;
  height: number;
  backgroundColor: string;
  replayMode: "origin-box" | "page-mode" | "camera-panning";
  transitionType:
    | "fade"
    | "slide-left"
    | "slide-right"
    | "slide-up"
    | "slide-down"
    | "zoom"
    | "none";
  transitionDuration: number;
  pageByPage: boolean;
}

interface PageGroup {
  page: VirtualPage;
  elements: DrawingElement[];
  timestamp: number;
}

/**
 * Main replay function for origin box mode
 */
export async function replayOriginBoxMode(
  elements: DrawingElement[],
  element: HTMLElement | HTMLCanvasElement,
  config: OriginBoxReplayConfig,
  settings: AnimationSettings,
  onProgress?: (progress: number) => void,
): Promise<void> {
  if (!element) {
    const error = "No element provided for origin box replay";
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
      "No elements to animate in origin box replay - draw something first!";
    console.warn(warning);
    throw new Error(warning);
  }

  console.log(
    `Starting ${config.replayMode} replay with ${elements.length} elements`,
  );
  console.log(`Element size: ${config.width}x${config.height}`);
  console.log(`Config:`, config);

  // Always use origin page dimensions for replay window
  const originPage = virtualPagesManager.getOriginPage();

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
  let svg = createAnimationSVG(container, originPage);

  // Group elements by page based on replay mode
  const pageGroups = groupElementsByMode(elements, config);

  console.log(`Replay groups: ${pageGroups.length} pages to animate`);
  pageGroups.forEach((group, index) => {
    console.log(
      `Page ${index + 1}: ${group.elements.length} elements at (${group.page.x}, ${group.page.y})`,
    );
  });

  if (config.replayMode === "camera-panning") {
    await executeCameraPanningMode(
      pageGroups,
      svg,
      config,
      settings,
      onProgress,
    );
  } else {
    await executePageTransitionMode(
      pageGroups,
      svg,
      config,
      settings,
      onProgress,
    );
  }

  console.log(`${config.replayMode} replay completed`);
}

/**
 * Group elements by page according to replay mode
 */
function groupElementsByMode(
  elements: DrawingElement[],
  config: OriginBoxReplayConfig,
): PageGroup[] {
  // Sort elements chronologically first
  const sortedElements = [...elements].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  if (config.replayMode === "page-mode" && config.pageByPage) {
    // Group by layer within each page
    return groupByLayerMode(sortedElements);
  } else {
    // Group by page chronologically
    return groupByPageChronologically(sortedElements);
  }
}

/**
 * Group elements by page chronologically
 */
function groupByPageChronologically(elements: DrawingElement[]): PageGroup[] {
  const pageGroups: Map<string, PageGroup> = new Map();

  elements.forEach((element) => {
    const page = virtualPagesManager.findElementPage(element);
    if (!page) return;

    const pageKey = `${page.gridPosition.row}-${page.gridPosition.col}`;

    if (!pageGroups.has(pageKey)) {
      pageGroups.set(pageKey, {
        page,
        elements: [],
        timestamp: element.timestamp,
      });
    }

    pageGroups.get(pageKey)!.elements.push(element);
  });

  // Sort page groups by first element timestamp
  return Array.from(pageGroups.values()).sort(
    (a, b) => a.timestamp - b.timestamp,
  );
}

/**
 * Group elements by layer within pages
 */
function groupByLayerMode(elements: DrawingElement[]): PageGroup[] {
  const layerGroups: Map<string, PageGroup> = new Map();

  elements.forEach((element) => {
    const page = virtualPagesManager.findElementPage(element);
    if (!page) return;

    const layerKey = `${page.gridPosition.row}-${page.gridPosition.col}-${element.layerId}`;

    if (!layerGroups.has(layerKey)) {
      layerGroups.set(layerKey, {
        page,
        elements: [],
        timestamp: element.timestamp,
      });
    }

    layerGroups.get(layerKey)!.elements.push(element);
  });

  // Sort by timestamp
  return Array.from(layerGroups.values()).sort(
    (a, b) => a.timestamp - b.timestamp,
  );
}

/**
 * Execute camera panning mode - smooth movement between pages
 */
async function executeCameraPanningMode(
  pageGroups: PageGroup[],
  svg: SVGSVGElement,
  config: OriginBoxReplayConfig,
  settings: AnimationSettings,
  onProgress?: (progress: number) => void,
): Promise<void> {
  let currentViewBox = {
    x: 0,
    y: 0,
    width: config.width,
    height: config.height,
  };
  let totalElements = pageGroups.reduce(
    (sum, group) => sum + group.elements.length,
    0,
  );
  let processedElements = 0;

  for (const group of pageGroups) {
    // Calculate target viewbox for this page
    const targetViewBox = {
      x: group.page.x,
      y: group.page.y,
      width: config.width,
      height: config.height,
    };

    // Smooth camera pan to target page
    if (
      currentViewBox.x !== targetViewBox.x ||
      currentViewBox.y !== targetViewBox.y
    ) {
      await smoothCameraPan(svg, currentViewBox, targetViewBox, 1000); // 1 second pan
      currentViewBox = targetViewBox;
    }

    // Animate elements in current page
    for (const element of group.elements) {
      await animateElement(element, svg, settings, processedElements);
      processedElements++;

      if (onProgress) {
        onProgress((processedElements / totalElements) * 100);
      }

      await new Promise((resolve) => setTimeout(resolve, settings.strokeDelay));
    }
  }
}

/**
 * Execute page transition mode - fixed origin box with transitions
 */
async function executePageTransitionMode(
  pageGroups: PageGroup[],
  svg: SVGSVGElement,
  config: OriginBoxReplayConfig,
  settings: AnimationSettings,
  onProgress?: (progress: number) => void,
): Promise<void> {
  let totalElements = pageGroups.reduce(
    (sum, group) => sum + group.elements.length,
    0,
  );
  let processedElements = 0;
  let currentPage: VirtualPage | null = null;

  for (let i = 0; i < pageGroups.length; i++) {
    const group = pageGroups[i];

    // Show page transition if switching pages
    if (currentPage && currentPage.id !== group.page.id) {
      await showPageTransition(svg, currentPage, group.page, config);
    }
    currentPage = group.page;

    // Update viewbox to show current page content in origin box dimensions
    updateViewBoxForPage(svg, group.page, config);

    // Show page indicator
    const pageIndicator = showPageIndicator(svg, group.page, config.replayMode);

    // Animate elements in current page/layer group
    for (const element of group.elements) {
      await animateElement(element, svg, settings, processedElements);
      processedElements++;

      if (onProgress) {
        onProgress((processedElements / totalElements) * 100);
      }

      await new Promise((resolve) => setTimeout(resolve, settings.strokeDelay));
    }

    // Remove page indicator
    setTimeout(() => pageIndicator.remove(), 1000);

    // Wait for transition duration before next page (except last)
    if (i < pageGroups.length - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, config.transitionDuration),
      );
    }
  }
}

/**
 * Create animation SVG overlay
 */
function createAnimationSVG(
  container: HTMLElement,
  originPage: VirtualPage,
): SVGSVGElement {
  // Remove existing SVG from container
  const existingSvg = container.querySelector(".origin-box-svg");
  if (existingSvg) existingSvg.remove();

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("origin-box-svg");
  svg.style.position = "absolute";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "20"; // Higher z-index to ensure visibility
  svg.style.overflow = "visible";

  // Optional debug tint based on global setting
  const showDebugTint = (window as any).setOriginBoxDebugTint;
  if (showDebugTint) {
    svg.style.backgroundColor = "rgba(0, 255, 0, 0.1)";
    console.log("Created origin box SVG overlay with debug tint");
  } else {
    console.log("Created origin box SVG overlay");
  }

  // Set initial viewBox to origin page
  svg.setAttribute("viewBox", `0 0 ${originPage.width} ${originPage.height}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  container.appendChild(svg);
  return svg;
}

/**
 * Update SVG viewBox to show specific page content
 */
function updateViewBoxForPage(
  svg: SVGSVGElement,
  page: VirtualPage,
  config: OriginBoxReplayConfig,
): void {
  // For origin box mode, we translate the content to fit in origin box dimensions
  // Calculate offset needed to center page content in origin box
  const offsetX = -page.x;
  const offsetY = -page.y;

  svg.setAttribute(
    "viewBox",
    `${page.x} ${page.y} ${config.width} ${config.height}`,
  );
}

/**
 * Smooth camera pan between viewboxes
 */
async function smoothCameraPan(
  svg: SVGSVGElement,
  from: { x: number; y: number; width: number; height: number },
  to: { x: number; y: number; width: number; height: number },
  duration: number,
): Promise<void> {
  const steps = 60; // 60fps
  const stepTime = duration / steps;

  for (let step = 0; step <= steps; step++) {
    const progress = step / steps;
    const eased = 0.5 * (1 - Math.cos(progress * Math.PI)); // ease-in-out

    const currentX = from.x + (to.x - from.x) * eased;
    const currentY = from.y + (to.y - from.y) * eased;

    svg.setAttribute(
      "viewBox",
      `${currentX} ${currentY} ${to.width} ${to.height}`,
    );

    await new Promise((resolve) => setTimeout(resolve, stepTime));
  }
}

/**
 * Show page transition effect
 */
async function showPageTransition(
  svg: SVGSVGElement,
  fromPage: VirtualPage,
  toPage: VirtualPage,
  config: OriginBoxReplayConfig,
): Promise<void> {
  if (config.transitionType === "none") return;

  const transition = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  transition.classList.add("page-transition");
  transition.setAttribute("width", "100%");
  transition.setAttribute("height", "100%");
  transition.setAttribute("fill", "rgba(0, 0, 0, 0.1)");

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
function showPageIndicator(
  svg: SVGSVGElement,
  page: VirtualPage,
  mode: string,
): SVGElement {
  const indicator = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  indicator.classList.add("page-indicator");
  indicator.setAttribute("x", "20");
  indicator.setAttribute("y", "40");
  indicator.setAttribute("fill", "#3b82f6");
  indicator.setAttribute("font-size", "18");
  indicator.setAttribute("font-weight", "bold");
  indicator.setAttribute("font-family", "system-ui, sans-serif");

  const pageInfo = page.isOrigin
    ? "Origin Page (0, 0)"
    : `Page (${page.gridPosition.row}, ${page.gridPosition.col})`;

  indicator.textContent = `${mode === "page-mode" ? "📄" : "🎯"} ${pageInfo}`;

  // Add background
  const background = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  background.classList.add("page-indicator");
  background.setAttribute("x", "10");
  background.setAttribute("y", "20");
  background.setAttribute("width", `${pageInfo.length * 8 + 60}`);
  background.setAttribute("height", "30");
  background.setAttribute("fill", "rgba(255, 255, 255, 0.9)");
  background.setAttribute("stroke", "#3b82f6");
  background.setAttribute("stroke-width", "2");
  background.setAttribute("rx", "6");

  svg.appendChild(background);
  svg.appendChild(indicator);

  return indicator;
}

/**
 * Animate a single element
 */
async function animateElement(
  element: DrawingElement,
  svg: SVGSVGElement,
  settings: AnimationSettings,
  elementIndex: number = 0,
): Promise<void> {
  const excalidrawElement = toExcalidrawElement(element);
  const pathData = elementToSVGPath(excalidrawElement);
  if (!pathData) {
    console.warn(
      `Failed to generate SVG path for element ${element.id} of type ${element.type} in origin box replay`,
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

  pathEl.classList.add("origin-box-replay");

  // Make path visible immediately for debugging, but preserve highlighter opacity
  if (element.type !== "highlighter") {
    pathEl.style.opacity = "1";
  }
  pathEl.style.visibility = "visible";

  console.log(`Adding path element to origin box SVG:`, pathEl);
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
      `Invalid path length ${pathLength} for element ${element.id} in origin box replay, skipping animation`,
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
      `Failed to create animation for element ${element.id} in origin box replay`,
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
 * Clear origin box animation overlay
 */
export function clearOriginBoxAnimationOverlay(
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
    ".origin-box-svg",
  ) as SVGSVGElement;
  if (svg) {
    svg.remove();
  }
}
