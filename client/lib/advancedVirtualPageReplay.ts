// Advanced Virtual Page Replay System - FIXED: Proper full container scaling
// This version ensures the viewport fills the entire popup container correctly

import type { DrawingElement } from "../contexts/DrawingContext";
import type { AnimationSettings } from "../contexts/AnimationContext";
import { virtualPagesManager, VirtualPage } from "./virtualPagesManager";
import { animateDrawingElements } from "./directSvgAnimation";

// Replay configuration for the new system
export interface VirtualPageReplayConfig {
  width: number;
  height: number;
  backgroundColor: string;
  mode: "chronological" | "layer";
  transitionType:
    | "fade"
    | "slide-left"
    | "slide-right"
    | "slide-up"
    | "slide-down"
    | "zoom"
    | "none";
  transitionDuration: number;
  showPageIndicators: boolean;
  showDebugTints: boolean;
}

// Extended animation settings from the replay studio
export interface ExtendedReplaySettings {
  penStrokes: {
    elementDuration: number;
    groupDelay: number;
    easing: string;
    trueSpeed: boolean;
    trueSpeedRate: number;
  };
  shapes: {
    elementDuration: number;
    groupDelay: number;
    easing: string;
  };
  libraryObjects: {
    elementDuration: number;
    groupDelay: number;
    easing: string;
  };
}

// Timeline event for chronological mode
interface TimelineEvent {
  type: "element" | "page-switch";
  timestamp: number;
  element?: DrawingElement;
  fromPage?: VirtualPage;
  toPage?: VirtualPage;
}

// Page group for layer mode
interface PageGroup {
  page: VirtualPage;
  elements: DrawingElement[];
  firstTimestamp: number;
}

/**
 * Main entry point for advanced virtual page replay - WITH DEBUGGING
 */
export async function replayWithVirtualPages(
  elements: DrawingElement[],
  container: HTMLElement,
  config: VirtualPageReplayConfig,
  settings: ExtendedReplaySettings,
  onProgress?: (progress: number) => void,
): Promise<void> {
  console.log("🚀 DEBUG: replayWithVirtualPages called");
  console.log(
    `🎬 Starting ${config.mode} replay with ${elements.length} elements`,
  );
  console.log("🔧 DEBUG: Config:", config);
  console.log("🔧 DEBUG: Settings:", settings);
  console.log("🔧 DEBUG: Container details:", {
    container,
    tagName: container?.tagName,
    className: container?.className,
    id: container?.id,
    parentElement: container?.parentElement?.tagName,
    innerHTML: container?.innerHTML.substring(0, 100) + "...",
  });

  if (!container) {
    console.error("🔧 DEBUG: No container provided!");
    throw new Error("No container provided for virtual page replay");
  }

  if (elements.length === 0) {
    console.error("🔧 DEBUG: No elements to animate!");
    throw new Error("No elements to animate");
  }

  console.log(
    "🔧 DEBUG: Elements to animate:",
    elements.map((e) => ({
      id: e.id,
      type: e.type,
      x: e.x,
      y: e.y,
      width: e.width,
      height: e.height,
    })),
  );

  // FIXED: Setup container properly first
  console.log("🔧 DEBUG: Setting up container...");
  setupReplayContainer(container, config);

  try {
    if (config.mode === "chronological") {
      console.log("🔧 DEBUG: Starting chronological replay");
      await executeChronologicalReplay(
        elements,
        container,
        config,
        settings,
        onProgress,
      );
    } else {
      console.log("🔧 DEBUG: Starting layer replay");
      await executeLayerReplay(
        elements,
        container,
        config,
        settings,
        onProgress,
      );
    }

    console.log(`🎉 Virtual page replay completed successfully`);
  } catch (error) {
    console.error("❌ Virtual page replay error:", error);
    console.error("❌ ERROR STACK:", error.stack);
    throw error;
  }
}

/**
 * FIXED: Setup container to fill entire space with proper scaling - WITH DEBUGGING
 */
function setupReplayContainer(
  container: HTMLElement,
  config: VirtualPageReplayConfig,
): void {
  console.log("🔧 DEBUG: setupReplayContainer called");

  if (!container) {
    console.error("🔧 DEBUG: No container element provided!");
    throw new Error("Container element is required");
  }

  console.log("🔧 DEBUG: Container before setup:", {
    width: container.style.width,
    height: container.style.height,
    position: container.style.position,
    innerHTML: container.innerHTML.length,
    rect: container.getBoundingClientRect(),
  });

  // Clear container
  console.log("🔧 DEBUG: Clearing container innerHTML");
  container.innerHTML = "";

  // CRITICAL FIX: Make container fill its parent completely
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.backgroundColor = config.backgroundColor || "#ffffff";
  container.style.position = "relative";
  container.style.overflow = "hidden";

  // Remove any transforms or positioning that could cause issues
  container.style.border = "5px solid blue"; // DEBUG: Make container visible
  container.style.outline = "none";
  container.style.boxShadow = "none";
  container.style.transform = "none";
  container.style.left = "0";
  container.style.top = "0";

  console.log("🔧 DEBUG: Container after setup:", {
    width: container.style.width,
    height: container.style.height,
    position: container.style.position,
    backgroundColor: container.style.backgroundColor,
    border: container.style.border,
    rect: container.getBoundingClientRect(),
  });

  console.log(`📦 Container setup: fills parent container completely`);
}

/**
 * Execute chronological replay - WITH DEBUGGING
 */
async function executeChronologicalReplay(
  elements: DrawingElement[],
  container: HTMLElement,
  config: VirtualPageReplayConfig,
  settings: ExtendedReplaySettings,
  onProgress?: (progress: number) => void,
): Promise<void> {
  console.log("🔧 DEBUG: executeChronologicalReplay called");
  console.log("⏰ Starting chronological replay");
  console.log("🔧 DEBUG: Container in executeChronologicalReplay:", {
    tagName: container.tagName,
    className: container.className,
    rect: container.getBoundingClientRect(),
    innerHTML: container.innerHTML.length,
  });

  // Build chronological timeline with page switches
  const timeline = buildChronologicalTimeline(elements);
  console.log(`📅 Timeline: ${timeline.length} events`);
  console.log(
    "🔧 DEBUG: Timeline events:",
    timeline.map((e) => ({
      type: e.type,
      timestamp: e.timestamp,
      elementId: e.element?.id,
      elementType: e.element?.type,
    })),
  );

  // Create viewport that fills the entire container
  console.log("🔧 DEBUG: Creating viewport manager...");
  const viewport = createViewportManager(container, config);
  console.log("🔧 DEBUG: Viewport manager created:", viewport);

  let processedEvents = 0;
  let currentPage: VirtualPage | null = null;
  let elementCount = 0;
  const totalElements = timeline.filter((e) => e.type === "element").length;

  for (const event of timeline) {
    if (event.type === "page-switch") {
      console.log(
        `📄 Page switch: ${currentPage?.id || "start"} → ${event.toPage?.id}`,
      );

      if (event.toPage) {
        await showPageTransition(viewport, currentPage, event.toPage, config);
        updateViewportForPage(viewport, event.toPage, config);
        currentPage = event.toPage;

        if (config.showPageIndicators) {
          const indicator = createPageIndicator(event.toPage);
          viewport.appendChild(indicator);

          setTimeout(() => {
            if (indicator.parentNode) {
              indicator.parentNode.removeChild(indicator);
            }
          }, 2000);
        }
      }
    } else if (event.type === "element" && event.element) {
      console.log(
        `🎨 Animating element ${event.element.id} of type ${event.element.type}`,
      );

      const elementPage = virtualPagesManager.findElementPage(event.element);
      if (!currentPage || currentPage.id !== elementPage.id) {
        updateViewportForPage(viewport, elementPage, config);
        currentPage = elementPage;
      }

      await animateElementInViewport(event.element, viewport, settings);
      elementCount++;

      if (elementCount < totalElements) {
        const delay = getElementDelay(event.element, settings);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    processedEvents++;
    if (onProgress) {
      onProgress((processedEvents / timeline.length) * 100);
    }
  }

  console.log("✅ Chronological replay completed");
}

/**
 * Execute layer replay
 */
async function executeLayerReplay(
  elements: DrawingElement[],
  container: HTMLElement,
  config: VirtualPageReplayConfig,
  settings: ExtendedReplaySettings,
  onProgress?: (progress: number) => void,
): Promise<void> {
  console.log("📄 Starting layer replay");

  const pageGroups = buildLayerPageGroups(elements);
  console.log(`📚 Page groups: ${pageGroups.length} pages`);

  const viewport = createViewportManager(container, config);

  let processedGroups = 0;
  let totalElementsProcessed = 0;
  const totalElements = elements.length;

  for (const group of pageGroups) {
    console.log(
      `📖 Animating page ${group.page.id} with ${group.elements.length} elements`,
    );

    if (processedGroups > 0) {
      const previousGroup = pageGroups[processedGroups - 1];
      await showPageTransition(
        viewport,
        previousGroup.page,
        group.page,
        config,
      );
    }

    updateViewportForPage(viewport, group.page, config);

    if (config.showPageIndicators) {
      const indicator = createPageIndicator(group.page);
      viewport.appendChild(indicator);

      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 3000);
    }

    await animatePageElements(
      group.elements,
      viewport,
      settings,
      (elementProgress) => {
        const elementsInPreviousGroups = totalElementsProcessed;
        const currentGroupProgress =
          (elementProgress / 100) * group.elements.length;
        const overallProgress =
          ((elementsInPreviousGroups + currentGroupProgress) / totalElements) *
          100;

        if (onProgress) {
          onProgress(overallProgress);
        }
      },
    );

    totalElementsProcessed += group.elements.length;
    processedGroups++;

    if (onProgress) {
      onProgress((totalElementsProcessed / totalElements) * 100);
    }

    if (processedGroups < pageGroups.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log("✅ Layer replay completed");
}

/**
 * Build chronological timeline with page switch events
 */
function buildChronologicalTimeline(
  elements: DrawingElement[],
): TimelineEvent[] {
  const timeline: TimelineEvent[] = [];

  const sortedElements = [...elements].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  let currentPageId: string | null = null;

  for (const element of sortedElements) {
    const elementPage = virtualPagesManager.findElementPage(element);

    if (elementPage.id !== currentPageId) {
      const fromPage = currentPageId
        ? virtualPagesManager.getPage(currentPageId)
        : null;

      timeline.push({
        type: "page-switch",
        timestamp: element.timestamp,
        fromPage: fromPage || undefined,
        toPage: elementPage,
      });

      currentPageId = elementPage.id;
    }

    timeline.push({
      type: "element",
      timestamp: element.timestamp,
      element: element,
    });
  }

  return timeline;
}

/**
 * Build page groups for layer replay
 */
function buildLayerPageGroups(elements: DrawingElement[]): PageGroup[] {
  const pageMap = new Map<string, PageGroup>();

  for (const element of elements) {
    const page = virtualPagesManager.findElementPage(element);

    if (!pageMap.has(page.id)) {
      pageMap.set(page.id, {
        page: page,
        elements: [],
        firstTimestamp: element.timestamp,
      });
    }

    const group = pageMap.get(page.id)!;
    group.elements.push(element);
    group.firstTimestamp = Math.min(group.firstTimestamp, element.timestamp);
  }

  return Array.from(pageMap.values()).sort(
    (a, b) => a.firstTimestamp - b.firstTimestamp,
  );
}

/**
 * FIXED: Create viewport that fills entire container with proper scale - WITH DEBUGGING
 */
function createViewportManager(
  container: HTMLElement,
  config: VirtualPageReplayConfig,
) {
  console.log("🔧 DEBUG: createViewportManager called");
  console.log("🔧 DEBUG: Container:", container);
  console.log("🔧 DEBUG: Container tag name:", container.tagName);
  console.log("🔧 DEBUG: Container class:", container.className);
  console.log("🔧 DEBUG: Container id:", container.id);

  // Get actual container dimensions
  const containerRect = container.getBoundingClientRect();
  const containerWidth = containerRect.width || 800;
  const containerHeight = containerRect.height || 600;

  console.log("🔧 DEBUG: Container dimensions:", {
    width: containerWidth,
    height: containerHeight,
    rect: containerRect,
    parentElement: container.parentElement?.tagName,
    parentClass: container.parentElement?.className,
  });

  // Create viewport that fills the entire container
  const viewport = document.createElement("div");
  viewport.className = "virtual-page-viewport";
  viewport.style.position = "absolute";
  viewport.style.top = "0";
  viewport.style.left = "0";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.overflow = "visible";

  console.log("🔧 DEBUG: Viewport element created");

  // CRITICAL FIX: Calculate scale to fit Origin Box (1920x1080) in container
  const originBoxWidth = 1920;
  const originBoxHeight = 1080;

  const scaleX = containerWidth / originBoxWidth;
  const scaleY = containerHeight / originBoxHeight;
  const scale = Math.min(scaleX, scaleY); // Fit within container

  console.log("🔧 DEBUG: Scale calculations:", {
    originBoxSize: `${originBoxWidth}x${originBoxHeight}`,
    scaleX,
    scaleY,
    finalScale: scale,
  });

  // Center the scaled Origin Box in the container
  const scaledWidth = originBoxWidth * scale;
  const scaledHeight = originBoxHeight * scale;
  const offsetX = (containerWidth - scaledWidth) / 2;
  const offsetY = (containerHeight - scaledHeight) / 2;

  console.log("🔧 DEBUG: Centering calculations:", {
    scaledSize: `${scaledWidth}x${scaledHeight}`,
    offset: `${offsetX}, ${offsetY}`,
  });

  // Apply the transform to scale and center the Origin Box
  const transformString = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
  viewport.style.transform = transformString;
  viewport.style.transformOrigin = "0 0";

  // Set the viewport to Origin Box dimensions (will be scaled by transform)
  viewport.style.width = `${originBoxWidth}px`;
  viewport.style.height = `${originBoxHeight}px`;

  console.log("🔧 DEBUG: Transform applied:", transformString);

  // ALWAYS SHOW DEBUG TINT AND BORDER FOR DEBUGGING
  viewport.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
  viewport.style.border = "3px solid red";
  console.log("🔧 DEBUG: Debug tint and border applied for debugging");

  console.log("🔧 DEBUG: Appending viewport to container");
  container.appendChild(viewport);

  // Log final state
  const finalRect = viewport.getBoundingClientRect();
  console.log("🔧 DEBUG: Final viewport state:", {
    containerSize: `${containerWidth}x${containerHeight}`,
    originBoxSize: `${originBoxWidth}x${originBoxHeight}`,
    scale: scale,
    offset: `${offsetX}, ${offsetY}`,
    transform: transformString,
    finalRect: finalRect,
    computedStyle: {
      width: viewport.style.width,
      height: viewport.style.height,
      transform: viewport.style.transform,
      position: viewport.style.position,
    },
  });

  return viewport;
}

/**
 * Update viewport for page content
 */
function updateViewportForPage(
  viewport: HTMLElement,
  page: VirtualPage,
  config: VirtualPageReplayConfig,
): void {
  console.log(`🎯 Updating viewport for page ${page.id}`);

  // For page transitions, we can add minimal visual feedback
  // but keep the main transform intact for proper scaling

  // Get current transform
  const currentTransform = viewport.style.transform;

  // Add subtle page offset for visual indication
  let pageOffsetX = 0;
  let pageOffsetY = 0;

  if (!page.isOrigin) {
    // Very subtle offset for non-origin pages
    pageOffsetX = page.x * 0.01;
    pageOffsetY = page.y * 0.01;
  }

  // Apply transition with minimal offset
  viewport.style.transition = "transform 0.3s ease-out";

  // Parse existing transform and add subtle offset
  const transformMatch = currentTransform.match(
    /translate\(([^)]+)\) scale\(([^)]+)\)/,
  );
  if (transformMatch) {
    const [, translatePart, scalePart] = transformMatch;
    const [currentX, currentY] = translatePart
      .split(",")
      .map((s) => parseFloat(s.trim()));

    viewport.style.transform = `translate(${currentX + pageOffsetX}px, ${currentY + pageOffsetY}px) scale(${scalePart})`;
  }

  console.log(
    `🎯 Page ${page.id} - minimal offset applied: (${pageOffsetX}, ${pageOffsetY})`,
  );
}

/**
 * Show page transition animation
 */
async function showPageTransition(
  viewport: HTMLElement,
  fromPage: VirtualPage | null,
  toPage: VirtualPage,
  config: VirtualPageReplayConfig,
): Promise<void> {
  if (config.transitionType === "none") return;

  console.log(
    `🎭 Transition: ${fromPage?.id || "start"} → ${toPage.id} (${config.transitionType})`,
  );

  const transition = document.createElement("div");
  transition.className = "page-transition";
  transition.style.position = "absolute";
  transition.style.top = "0";
  transition.style.left = "0";
  transition.style.width = "100%";
  transition.style.height = "100%";
  transition.style.zIndex = "100";
  transition.style.pointerEvents = "none";

  if (config.showPageIndicators) {
    const indicator = createPageIndicator(toPage);
    transition.appendChild(indicator);
  }

  let transitionEffect: string;
  switch (config.transitionType) {
    case "fade":
      transition.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
      transitionEffect = "opacity";
      break;
    case "slide-left":
      transition.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
      transition.style.transform = "translateX(100%)";
      transitionEffect = "transform";
      break;
    case "slide-right":
      transition.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
      transition.style.transform = "translateX(-100%)";
      transitionEffect = "transform";
      break;
    case "slide-up":
      transition.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
      transition.style.transform = "translateY(100%)";
      transitionEffect = "transform";
      break;
    case "slide-down":
      transition.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
      transition.style.transform = "translateY(-100%)";
      transitionEffect = "transform";
      break;
    case "zoom":
      transition.style.backgroundColor = "rgba(59, 130, 246, 0.15)";
      transition.style.transform = "scale(0)";
      transitionEffect = "transform";
      break;
    default:
      return;
  }

  viewport.appendChild(transition);

  await animateTransition(
    transition,
    transitionEffect,
    config.transitionDuration,
  );

  if (transition.parentNode) {
    transition.parentNode.removeChild(transition);
  }
}

/**
 * Create page indicator
 */
function createPageIndicator(page: VirtualPage): HTMLElement {
  const indicator = document.createElement("div");
  indicator.className = "page-indicator";
  indicator.style.position = "absolute";
  indicator.style.top = "20px";
  indicator.style.left = "20px";
  indicator.style.backgroundColor = "rgba(59, 130, 246, 0.9)";
  indicator.style.color = "white";
  indicator.style.padding = "8px 12px";
  indicator.style.borderRadius = "6px";
  indicator.style.fontSize = "14px";
  indicator.style.fontWeight = "600";
  indicator.style.fontFamily = "system-ui, sans-serif";
  indicator.style.zIndex = "101";

  const pageInfo = page.isOrigin
    ? "📍 Origin Page (0, 0)"
    : `📄 Page (${page.gridPosition.row}, ${page.gridPosition.col})`;

  indicator.textContent = pageInfo;

  return indicator;
}

/**
 * Animate transition effect
 */
async function animateTransition(
  element: HTMLElement,
  effect: string,
  duration: number,
): Promise<void> {
  return new Promise((resolve) => {
    const halfDuration = duration / 2;
    element.style.transition = `${effect} ${halfDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;

    requestAnimationFrame(() => {
      switch (effect) {
        case "opacity":
          element.style.opacity = "1";
          setTimeout(() => {
            element.style.transition = `${effect} ${halfDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            element.style.opacity = "0";
          }, halfDuration);
          break;

        case "transform":
          element.style.transform = "translate(0, 0) scale(1)";

          setTimeout(() => {
            element.style.transition = `${effect} ${halfDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;

            if (element.style.transform.includes("translateX(100%)")) {
              element.style.transform = "translateX(-100%)";
            } else if (element.style.transform.includes("translateX(-100%)")) {
              element.style.transform = "translateX(100%)";
            } else if (element.style.transform.includes("translateY(100%)")) {
              element.style.transform = "translateY(-100%)";
            } else if (element.style.transform.includes("translateY(-100%)")) {
              element.style.transform = "translateY(100%)";
            } else if (element.style.transform.includes("scale(0)")) {
              element.style.transform = "scale(0)";
            }
          }, halfDuration);
          break;
      }

      setTimeout(resolve, duration);
    });
  });
}

/**
 * Animate single element in viewport - WITH DEBUGGING
 */
async function animateElementInViewport(
  element: DrawingElement,
  viewport: HTMLElement,
  settings: ExtendedReplaySettings,
): Promise<void> {
  console.log("🔧 DEBUG: animateElementInViewport called");
  console.log("🔧 DEBUG: Element:", {
    id: element.id,
    type: element.type,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    points: element.points?.length || 0,
  });
  console.log("🔧 DEBUG: Viewport:", {
    tagName: viewport.tagName,
    className: viewport.className,
    rect: viewport.getBoundingClientRect(),
    transform: viewport.style.transform,
    innerHTML: viewport.innerHTML.length,
  });

  const duration = getElementDuration(element, settings);
  const easing = getElementEasing(element, settings);

  console.log(
    `🎨 Animating ${element.type} element ${element.id} with duration ${duration}ms, easing ${easing}`,
  );

  try {
    console.log("🔧 DEBUG: Calling animateDrawingElements...");
    await animateDrawingElements([element], viewport, {
      duration: duration,
      delay: 0,
      easing: easing,
    });

    console.log(`✅ Element ${element.id} animation completed`);
  } catch (error) {
    console.error(`❌ Error animating element ${element.id}:`, error);
    console.error(`❌ ERROR STACK:`, error.stack);
    throw error; // Re-throw to see the full error chain
  }
}

/**
 * Animate all elements in a page
 */
async function animatePageElements(
  elements: DrawingElement[],
  viewport: HTMLElement,
  settings: ExtendedReplaySettings,
  onProgress?: (progress: number) => void,
): Promise<void> {
  const sortedElements = [...elements].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  console.log(`📄 Animating page with ${sortedElements.length} elements`);

  for (let i = 0; i < sortedElements.length; i++) {
    const element = sortedElements[i];

    await animateElementInViewport(element, viewport, settings);

    if (onProgress) {
      const progress = ((i + 1) / sortedElements.length) * 100;
      onProgress(progress);
    }

    if (i < sortedElements.length - 1) {
      const delay = getElementDelay(element, settings);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Get element-specific duration based on type and settings
 */
function getElementDuration(
  element: DrawingElement,
  settings: ExtendedReplaySettings,
): number {
  switch (element.type) {
    case "path":
      if (settings.penStrokes.trueSpeed) {
        return calculateTrueSpeedDuration(
          element,
          settings.penStrokes.trueSpeedRate,
        );
      }
      return settings.penStrokes.elementDuration;
    case "highlighter":
      return settings.penStrokes.elementDuration;
    case "rectangle":
    case "ellipse":
    case "line":
    case "arrow":
    case "diamond":
      return settings.shapes.elementDuration;
    case "library-component":
      return settings.libraryObjects.elementDuration;
    default:
      return settings.shapes.elementDuration;
  }
}

/**
 * Get element-specific delay based on type and settings
 */
function getElementDelay(
  element: DrawingElement,
  settings: ExtendedReplaySettings,
): number {
  switch (element.type) {
    case "path":
    case "highlighter":
      return settings.penStrokes.groupDelay;
    case "rectangle":
    case "ellipse":
    case "line":
    case "arrow":
    case "diamond":
      return settings.shapes.groupDelay;
    case "library-component":
      return settings.libraryObjects.groupDelay;
    default:
      return settings.shapes.groupDelay;
  }
}

/**
 * Get element-specific easing based on type and settings
 */
function getElementEasing(
  element: DrawingElement,
  settings: ExtendedReplaySettings,
): string {
  switch (element.type) {
    case "path":
    case "highlighter":
      return settings.penStrokes.easing;
    case "rectangle":
    case "ellipse":
    case "line":
    case "arrow":
    case "diamond":
      return settings.shapes.easing;
    case "library-component":
      return settings.libraryObjects.easing;
    default:
      return settings.shapes.easing;
  }
}

/**
 * Calculate true speed duration for path elements
 */
function calculateTrueSpeedDuration(
  element: DrawingElement,
  speedRate: number,
): number {
  if (!element.points || element.points.length < 2) {
    return 1000;
  }

  let totalLength = 0;
  for (let i = 1; i < element.points.length; i++) {
    const dx = element.points[i].x - element.points[i - 1].x;
    const dy = element.points[i].y - element.points[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }

  const duration = (Math.max(totalLength, 10) / speedRate) * 1000;
  return Math.max(100, Math.min(duration, 10000));
}

/**
 * Clear virtual page replay animations
 */
export function clearVirtualPageReplay(container: HTMLElement): void {
  if (!container) {
    console.warn("No container provided to clear");
    return;
  }

  const viewport = container.querySelector(".virtual-page-viewport");
  if (viewport) {
    viewport.remove();
    console.log("🧹 Viewport cleared");
  }

  const transitions = container.querySelectorAll(".page-transition");
  if (transitions.length > 0) {
    transitions.forEach((t) => t.remove());
    console.log(`🧹 ${transitions.length} transitions cleared`);
  }

  const indicators = container.querySelectorAll(".page-indicator");
  if (indicators.length > 0) {
    indicators.forEach((i) => i.remove());
    console.log(`🧹 ${indicators.length} indicators cleared`);
  }

  console.log("✅ Virtual page replay cleared completely");
}

/**
 * Validate virtual page replay configuration
 */
export function validateReplayConfig(config: VirtualPageReplayConfig): boolean {
  const errors: string[] = [];

  if (!config.width || config.width <= 0) errors.push("Invalid width");
  if (!config.height || config.height <= 0) errors.push("Invalid height");
  if (!config.mode || !["chronological", "layer"].includes(config.mode))
    errors.push("Invalid mode");
  if (!config.transitionType) errors.push("Missing transition type");
  if (config.transitionDuration < 0) errors.push("Invalid transition duration");

  if (errors.length > 0) {
    console.error("❌ Configuration errors:", errors);
    return false;
  }

  console.log("✅ Configuration validated successfully");
  return true;
}

/**
 * Get system information for debugging
 */
export function getVirtualPageSystemInfo(): object {
  const stats = virtualPagesManager.getStatistics();
  const allPages = virtualPagesManager.getAllPages();

  return {
    version: "2.0.0", // Fixed version - proper container scaling
    totalPages: stats.totalPages,
    pagesWithElements: stats.pagesWithElements,
    totalElements: stats.totalElements,
    originPageElements: stats.originPageElements,
    pages: allPages.map((page) => ({
      id: page.id,
      isOrigin: page.isOrigin,
      position: { x: page.x, y: page.y },
      gridPosition: page.gridPosition,
      elementCount: page.elements.length,
    })),
  };
}
