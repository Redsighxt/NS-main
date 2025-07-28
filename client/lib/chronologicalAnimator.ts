// Advanced chronological animation system that handles layer switches and different modes
import type { DrawingElement } from "../contexts/DrawingContext";
import {
  TimelineEvent,
  isLayerSwitchEvent,
  isStrokeEvent,
  AnimationSettings,
  AnimationMode,
} from "../contexts/AnimationContext";
import { virtualPagesManager, VirtualPage } from "./virtualPagesManager";
import { elementToSVGPath, toExcalidrawElement } from "./excalidrawRenderer";

// Layer transition effects
interface LayerTransition {
  type: "slide" | "fade" | "none";
  direction?: "left-to-right" | "right-to-left";
  duration: number;
}

// Virtual page for infinite canvas mode
interface VirtualPage {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  elements: DrawingElement[];
}

/**
 * Advanced chronological animation that respects layer switches and supports different modes
 */
export async function replayChronologicalAnimation(
  timeline: TimelineEvent[],
  elements: DrawingElement[],
  canvasRef: React.RefObject<HTMLCanvasElement>,
  settings: AnimationSettings,
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
    svg.style.zIndex = "10";
    canvas.parentElement?.appendChild(svg);
  }

  // Clear previous animations
  svg.querySelectorAll("path.replay").forEach((p) => p.remove());
  svg.querySelectorAll(".layer-transition").forEach((t) => t.remove());
  svg.querySelectorAll(".layer-indicator").forEach((i) => i.remove());
  svg.querySelectorAll(".virtual-page-transition").forEach((v) => v.remove());

  // Calculate global bounds for proper positioning
  const bounds = calculateGlobalBounds(elements);
  setupSVGViewBox(svg, bounds);

  console.log(
    `Starting ${settings.animationMode} animation with ${timeline.length} timeline events and ${elements.length} elements`,
  );

  // Execute animation based on mode
  switch (settings.animationMode) {
    case "chronological":
      await executeChronologicalMode(timeline, elements, svg, settings);
      break;
    case "page-by-page":
      await executePageByPageMode(elements, svg, settings);
      break;
    case "infinite-panning":
      await executeInfinitePanningMode(elements, svg, settings, canvas);
      break;
    default:
      console.warn(
        `Unknown animation mode: ${settings.animationMode}, falling back to chronological`,
      );
      await executeChronologicalMode(timeline, elements, svg, settings);
      break;
  }

  console.log(`${settings.animationMode} animation completed`);
}

/**
 * Execute chronological animation mode - respects layer switches with delays
 */
async function executeChronologicalMode(
  timeline: TimelineEvent[],
  elements: DrawingElement[],
  svg: SVGSVGElement,
  settings: AnimationSettings,
): Promise<void> {
  let currentLayerId: string | null = null;

  for (const event of timeline) {
    if (isLayerSwitchEvent(event)) {
      // Handle layer switch
      if (settings.showLayerTransition && currentLayerId !== null) {
        await showLayerTransition(
          svg,
          event.fromLayerId,
          event.toLayerId,
          settings,
        );
      }

      currentLayerId = event.toLayerId;

      // Wait for layer switch delay
      await new Promise((resolve) =>
        setTimeout(resolve, settings.layerSwitchDelay),
      );
    } else if (isStrokeEvent(event)) {
      // Handle stroke event
      const element = event.element;
      if (element && currentLayerId && element.layerId === currentLayerId) {
        await animateElement(element, svg, settings);
        await new Promise((resolve) =>
          setTimeout(resolve, settings.strokeDelay),
        );
      }
    }
  }
}

/**
 * Execute page-by-page animation mode - all content of each layer at once
 */
async function executePageByPageMode(
  elements: DrawingElement[],
  svg: SVGSVGElement,
  settings: AnimationSettings,
): Promise<void> {
  // Group elements by layer and sort layers by first element timestamp
  const elementsByLayer = groupElementsByLayer(elements);
  const sortedLayers = Array.from(elementsByLayer.entries()).sort((a, b) => {
    const firstElementA = a[1][0];
    const firstElementB = b[1][0];
    return firstElementA.timestamp - firstElementB.timestamp;
  });

  console.log(`Page-by-page mode: Animating ${sortedLayers.length} layers`);

  for (let layerIndex = 0; layerIndex < sortedLayers.length; layerIndex++) {
    const [layerId, layerElements] = sortedLayers[layerIndex];

    console.log(
      `Animating layer ${layerId} with ${layerElements.length} elements`,
    );

    // Show layer indicator
    const layerIndicator = showLayerIndicator(
      svg,
      `Layer ${layerIndex + 1}`,
      layerId,
    );

    // Show layer transition effect if not the first layer
    if (layerIndex > 0 && settings.showLayerTransition) {
      await showLayerTransition(
        svg,
        sortedLayers[layerIndex - 1][0],
        layerId,
        settings,
      );
    }

    // Create all SVG elements for the layer first
    const layerPaths: SVGPathElement[] = [];
    for (const element of layerElements) {
      const pathElement = await createSVGElement(element, svg, settings);
      if (pathElement) {
        layerPaths.push(pathElement);
      }
    }

    // Animate all elements in the layer simultaneously with staggered starts
    const layerAnimationPromises = layerPaths.map((pathEl, index) => {
      return new Promise<void>(async (resolve) => {
        // Stagger animation starts within the layer (faster than between elements)
        const staggerDelay = index * Math.max(10, settings.strokeDelay / 8);
        await new Promise((r) => setTimeout(r, staggerDelay));

        // Get the original element for duration calculation
        const element = layerElements[index];
        let elementDuration = settings.strokeDuration;

        if (element.type === "path" || element.type === "highlighter") {
          elementDuration = settings.strokeDuration / settings.strokeSpeed;
        }

        // Animate the path
        await animatePathElement(pathEl, elementDuration);
        resolve();
      });
    });

    // Wait for all elements in the layer to complete
    await Promise.all(layerAnimationPromises);

    // Remove layer indicator
    setTimeout(() => layerIndicator.remove(), 1000);

    // Wait for layer switch delay before moving to next layer (except for the last layer)
    if (layerIndex < sortedLayers.length - 1) {
      console.log(`Waiting ${settings.layerSwitchDelay}ms before next layer`);
      await new Promise((resolve) =>
        setTimeout(resolve, settings.layerSwitchDelay),
      );
    }
  }

  console.log("Page-by-page animation completed");
}

/**
 * Execute infinite panning mode with virtual pages
 */
async function executeInfinitePanningMode(
  elements: DrawingElement[],
  svg: SVGSVGElement,
  settings: AnimationSettings,
  canvas: HTMLCanvasElement,
): Promise<void> {
  console.log("Starting infinite panning mode with virtual pages");

  // Rebuild virtual pages from elements
  virtualPagesManager.rebuildFromElements(elements);
  const orderedPages = virtualPagesManager.getAnimationOrderedPages();

  console.log(`Infinite panning: ${orderedPages.length} pages with content`);

  let currentPage: VirtualPage | null = null;

  // Sort elements by timestamp for chronological order
  const sortedElements = [...elements].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  for (const element of sortedElements) {
    const elementPage = virtualPagesManager.findElementPage(element);

    if (elementPage && currentPage?.id !== elementPage.id) {
      // Camera needs to pan to new page
      console.log(
        `Panning from ${currentPage?.id || "none"} to ${elementPage.id}`,
      );
      await panCameraToVirtualPage(elementPage, canvas, settings);
      await showVirtualPageTransition(svg, elementPage);
      currentPage = elementPage;
    }

    await animateElement(element, svg, settings);
    await new Promise((resolve) => setTimeout(resolve, settings.strokeDelay));
  }

  console.log("Infinite panning mode completed");
}

/**
 * Create SVG element without animating it
 */
async function createSVGElement(
  element: DrawingElement,
  svg: SVGSVGElement,
  settings: AnimationSettings,
): Promise<SVGPathElement | null> {
  const excalidrawElement = toExcalidrawElement(element);
  const pathData = elementToSVGPath(excalidrawElement);
  if (!pathData) return null;

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

  // Apply stroke styles for proper dashed/dotted animation
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

  // Store element data for later use
  pathEl.setAttribute("data-element-id", element.id);
  pathEl.setAttribute("data-element-type", element.type);
  pathEl.classList.add("replay");

  svg.appendChild(pathEl);
  return pathEl;
}

/**
 * Animate a path element using stroke-dasharray technique
 */
async function animatePathElement(
  pathEl: SVGPathElement,
  duration: number,
): Promise<void> {
  // Progressive stroke animation
  const pathLength = pathEl.getTotalLength();
  pathEl.style.strokeDasharray = `${pathLength}`;
  pathEl.style.strokeDashoffset = `${pathLength}`;

  // Make visible during animation, but preserve highlighter opacity
  const elementType = pathEl.getAttribute("data-element-type");
  if (elementType !== "highlighter") {
    pathEl.style.opacity = "1";
  } else {
    // For highlighter, use the opacity attribute value set earlier
    const highlighterOpacity = pathEl.getAttribute("opacity") || "0.3";
    pathEl.style.opacity = highlighterOpacity;
  }

  const animation = pathEl.animate(
    [{ strokeDashoffset: pathLength }, { strokeDashoffset: 0 }],
    {
      duration: duration,
      easing: "ease-out",
      fill: "forwards",
    },
  );

  animation.addEventListener("finish", () => {
    pathEl.style.strokeDasharray = "none";
    pathEl.style.strokeDashoffset = "0";

    // Preserve highlighter opacity after animation completes
    const elementType = pathEl.getAttribute("data-element-type");
    if (elementType !== "highlighter") {
      pathEl.style.opacity = "1";
    } else {
      // For highlighter, use the opacity attribute value
      const highlighterOpacity = pathEl.getAttribute("opacity") || "0.3";
      pathEl.style.opacity = highlighterOpacity;
    }
  });

  await animation.finished;
}

/**
 * Animate a single element using stroke-dasharray technique (for chronological mode)
 */
async function animateElement(
  element: DrawingElement,
  svg: SVGSVGElement,
  settings: AnimationSettings,
): Promise<void> {
  const pathEl = await createSVGElement(element, svg, settings);
  if (!pathEl) return;

  // Calculate animation duration
  let elementDuration = settings.strokeDuration;
  if (element.type === "path" || element.type === "highlighter") {
    elementDuration = settings.strokeDuration / settings.strokeSpeed;
  }

  await animatePathElement(pathEl, elementDuration);
}

/**
 * Show layer indicator during page-by-page animation
 */
function showLayerIndicator(
  svg: SVGSVGElement,
  layerName: string,
  layerId: string,
): SVGElement {
  const indicator = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  indicator.classList.add("layer-indicator");
  indicator.setAttribute("x", "20");
  indicator.setAttribute("y", "40");
  indicator.setAttribute("fill", "#3b82f6");
  indicator.setAttribute("font-size", "24");
  indicator.setAttribute("font-weight", "bold");
  indicator.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
  indicator.textContent = `Animating ${layerName}`;

  // Add background
  const background = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  background.classList.add("layer-indicator");
  background.setAttribute("x", "10");
  background.setAttribute("y", "15");
  background.setAttribute("width", `${layerName.length * 12 + 40}`);
  background.setAttribute("height", "35");
  background.setAttribute("fill", "rgba(255, 255, 255, 0.9)");
  background.setAttribute("stroke", "#3b82f6");
  background.setAttribute("stroke-width", "2");
  background.setAttribute("rx", "8");

  svg.appendChild(background);
  svg.appendChild(indicator);

  // Animate appearance
  background.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 200,
    easing: "ease-out",
    fill: "forwards",
  });
  indicator.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 200,
    easing: "ease-out",
    fill: "forwards",
  });

  return indicator;
}

/**
 * Show visual layer transition effect
 */
async function showLayerTransition(
  svg: SVGSVGElement,
  fromLayerId: string,
  toLayerId: string,
  settings: AnimationSettings,
): Promise<void> {
  // Create transition overlay
  const transition = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  transition.classList.add("layer-transition");
  transition.setAttribute("width", "100%");
  transition.setAttribute("height", "100%");
  transition.setAttribute("fill", "rgba(0, 0, 0, 0.1)");

  svg.appendChild(transition);

  // Animate transition based on settings
  const transitionDuration = Math.min(settings.layerSwitchDelay * 0.3, 500); // Max 500ms transition

  if (settings.slideAnimation === "fade") {
    transition.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], {
      duration: transitionDuration,
      easing: "ease-in-out",
    });
  } else if (settings.slideAnimation !== "none") {
    const direction =
      settings.slideAnimation === "left-to-right"
        ? "translateX(-100%)"
        : "translateX(100%)";
    transition.animate(
      [
        { transform: direction },
        { transform: "translateX(0%)" },
        { transform: direction },
      ],
      { duration: transitionDuration, easing: "ease-in-out" },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, transitionDuration));
  transition.remove();
}

/**
 * Helper functions
 */
function calculateGlobalBounds(elements: DrawingElement[]) {
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

function setupSVGViewBox(svg: SVGSVGElement, bounds: any) {
  const padding = 50;
  const viewBoxX = bounds.minX - padding;
  const viewBoxY = bounds.minY - padding;
  const viewBoxWidth = Math.max(400, bounds.maxX - bounds.minX + padding * 2);
  const viewBoxHeight = Math.max(300, bounds.maxY - bounds.minY + padding * 2);

  svg.setAttribute(
    "viewBox",
    `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`,
  );
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
}

function groupElementsByLayer(
  elements: DrawingElement[],
): Map<string, DrawingElement[]> {
  const groups = new Map<string, DrawingElement[]>();

  elements.forEach((element) => {
    if (!groups.has(element.layerId)) {
      groups.set(element.layerId, []);
    }
    groups.get(element.layerId)!.push(element);
  });

  // Sort each group by timestamp
  groups.forEach((layerElements, layerId) => {
    layerElements.sort((a, b) => a.timestamp - b.timestamp);
    console.log(
      `Layer ${layerId}: ${layerElements.length} elements (${layerElements[0]?.timestamp} - ${layerElements[layerElements.length - 1]?.timestamp})`,
    );
  });

  console.log(
    `Grouped ${elements.length} elements into ${groups.size} layers:`,
    Array.from(groups.keys()),
  );
  return groups;
}

/**
 * Pan camera smoothly to a virtual page
 */
async function panCameraToVirtualPage(
  page: VirtualPage,
  canvas: HTMLCanvasElement,
  settings: AnimationSettings,
): Promise<void> {
  console.log(
    `Smooth camera panning to virtual page ${page.id} at (${page.x}, ${page.y})`,
  );

  // Get the current view transform to calculate the pan
  const container = canvas.parentElement;
  if (!container) return;

  // Calculate target position to center the page in view
  const canvasRect = canvas.getBoundingClientRect();
  const targetX = canvasRect.width / 2 - (page.x + page.width / 2);
  const targetY = canvasRect.height / 2 - (page.y + page.height / 2);

  // Simulate smooth camera panning with easing
  const panDuration = Math.min(settings.layerSwitchDelay * 0.8, 1500); // Max 1.5 second pan
  const startTime = Date.now();

  return new Promise<void>((resolve) => {
    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / panDuration, 1);

      // Use ease-in-out easing for smooth camera movement
      const easedProgress = 0.5 * (1 - Math.cos(progress * Math.PI));

      // For now, we'll just simulate the camera movement with a delay
      // In a full implementation, this would update the actual view transform

      if (progress >= 1) {
        console.log(`Camera pan to page ${page.id} completed`);
        resolve();
      } else {
        requestAnimationFrame(animateCamera);
      }
    };

    animateCamera();
  });
}

/**
 * Show visual transition when entering a new virtual page
 */
async function showVirtualPageTransition(
  svg: SVGSVGElement,
  page: VirtualPage,
): Promise<void> {
  const transition = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  transition.classList.add("virtual-page-transition");
  transition.setAttribute("x", "50%");
  transition.setAttribute("y", "50%");
  transition.setAttribute("text-anchor", "middle");
  transition.setAttribute("dominant-baseline", "middle");
  transition.setAttribute("fill", "#10b981");
  transition.setAttribute("font-size", "28");
  transition.setAttribute("font-weight", "bold");
  transition.setAttribute(
    "font-family",
    "system-ui, -apple-system, sans-serif",
  );

  if (page.isOrigin) {
    transition.textContent = "Origin Page (0, 0)";
  } else {
    transition.textContent = `Virtual Page (${page.gridPosition.row}, ${page.gridPosition.col})`;
  }

  // Add background
  const background = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "rect",
  );
  background.classList.add("virtual-page-transition");
  background.setAttribute("x", "25%");
  background.setAttribute("y", "45%");
  background.setAttribute("width", "50%");
  background.setAttribute("height", "10%");
  background.setAttribute("fill", "rgba(255, 255, 255, 0.95)");
  background.setAttribute("stroke", "#10b981");
  background.setAttribute("stroke-width", "3");
  background.setAttribute("rx", "12");

  svg.appendChild(background);
  svg.appendChild(transition);

  // Animate appearance and disappearance
  const appearAnimation = [
    { opacity: 0, transform: "scale(0.8)" },
    { opacity: 1, transform: "scale(1)" },
  ];

  const disappearAnimation = [
    { opacity: 1, transform: "scale(1)" },
    { opacity: 0, transform: "scale(0.8)" },
  ];

  // Show transition
  background.animate(appearAnimation, { duration: 300, easing: "ease-out" });
  transition.animate(appearAnimation, { duration: 300, easing: "ease-out" });

  // Wait a moment
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Hide transition
  background.animate(disappearAnimation, { duration: 300, easing: "ease-in" });
  transition.animate(disappearAnimation, { duration: 300, easing: "ease-in" });

  setTimeout(() => {
    background.remove();
    transition.remove();
  }, 300);
}

/**
 * Clear chronological animation overlay
 */
export function clearChronologicalAnimationOverlay(
  canvasRef: React.RefObject<HTMLCanvasElement>,
): void {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const svg = canvas.parentElement?.querySelector(
    ".animation-svg",
  ) as SVGSVGElement;
  if (svg) {
    // Clear all animation elements
    svg.querySelectorAll("path.replay").forEach((p) => p.remove());
    svg.querySelectorAll(".layer-transition").forEach((t) => t.remove());
    svg.querySelectorAll(".layer-indicator").forEach((i) => i.remove());
    svg.querySelectorAll(".virtual-page-transition").forEach((v) => v.remove());
    svg.remove();
  }
}
