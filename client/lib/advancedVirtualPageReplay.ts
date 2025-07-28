// Advanced Virtual Page Replay System - ViewTransform Compatible Version
// Handles chronological and layer replay modes with proper page transitions
// Uses existing directSvgAnimation.ts for progressive fill animations
// FIXED: Fully compatible with infinite canvas ViewTransform coordinate system

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
 * Main entry point for advanced virtual page replay
 */
export async function replayWithVirtualPages(
  elements: DrawingElement[],
  container: HTMLElement,
  config: VirtualPageReplayConfig,
  settings: ExtendedReplaySettings,
  onProgress?: (progress: number) => void,
): Promise<void> {
  console.log(
    `🎬 Starting ${config.mode} replay with ${elements.length} elements`,
  );
  console.log(`📊 Animation settings:`, settings);
  console.log(`🔧 Config:`, config);

  if (!container) {
    throw new Error("No container provided for virtual page replay");
  }

  if (elements.length === 0) {
    throw new Error("No elements to animate");
  }

  // Debug: Log element distribution across virtual pages
  const pageDistribution = new Map<string, number>();
  elements.forEach((element) => {
    const page = virtualPagesManager.findElementPage(element);
    pageDistribution.set(page.id, (pageDistribution.get(page.id) || 0) + 1);
  });

  console.log(
    `📄 Virtual page distribution:`,
    Array.from(pageDistribution.entries()),
  );

  // CRITICAL FIX: Calculate actual element bounds in world coordinates
  const elementBounds = calculateElementBounds(elements);
  console.log(`📏 Element bounds (world coordinates):`, elementBounds);

  // Setup container with proper coordinate system handling
  setupReplayContainer(container, config, elementBounds);

  try {
    if (config.mode === "chronological") {
      await executeChronologicalReplay(
        elements,
        container,
        config,
        settings,
        onProgress,
      );
    } else {
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
    throw error;
  }
}

/**
 * Calculate bounds of all elements in world coordinates (like infinite canvas)
 */
function calculateElementBounds(elements: DrawingElement[]) {
  if (elements.length === 0) {
    return { minX: -960, minY: -540, maxX: 960, maxY: 540, width: 1920, height: 1080 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const element of elements) {
    if (element.points && element.points.length > 0) {
      // For path elements, check all points
      for (const point of element.points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    } else {
      // For other elements, use x, y, width, height
      const elementMaxX = element.x + (element.width || 0);
      const elementMaxY = element.y + (element.height || 0);
      minX = Math.min(minX, element.x);
      minY = Math.min(minY, element.y);
      maxX = Math.max(maxX, elementMaxX);
      maxY = Math.max(maxY, elementMaxY);
    }
  }

  // Add reasonable padding
  const padding = 200;
  const finalBounds = {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
    width: (maxX - minX) + (padding * 2),
    height: (maxY - minY) + (padding * 2),
  };

  console.log(`🔍 Calculated element bounds:`, {
    original: { minX, minY, maxX, maxY },
    withPadding: finalBounds,
  });

  return finalBounds;
}

/**
 * Setup the replay container with proper ViewTransform-like coordinate system
 */
function setupReplayContainer(
  container: HTMLElement,
  config: VirtualPageReplayConfig,
  elementBounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number },
): void {
  if (!container) {
    throw new Error("Container element is required");
  }

  // Clear container
  container.innerHTML = "";

  // Get container dimensions from parent
  const parentRect = container.parentElement?.getBoundingClientRect();
  const containerWidth = parentRect?.width || config.width;
  const containerHeight = parentRect?.height || config.height;

  // CRITICAL FIX: Mimic infinite canvas ViewTransform logic
  // Calculate scale to fit content in container (like infinite canvas does)
  const scaleX = containerWidth / elementBounds.width;
  const scaleY = containerHeight / elementBounds.height;
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale above 1:1

  // Calculate center position for content (like infinite canvas centering)
  const contentCenterX = (elementBounds.minX + elementBounds.maxX) / 2;
  const contentCenterY = (elementBounds.minY + elementBounds.maxY) / 2;
  
  // Calculate translation to center content in container (ViewTransform logic)
  const translateX = containerWidth / 2 - contentCenterX * scale;
  const translateY = containerHeight / 2 - contentCenterY * scale;

  // Set container to occupy the full parent space
  container.style.width = `${containerWidth}px`;
  container.style.height = `${containerHeight}px`;
  container.style.backgroundColor = config.backgroundColor || "#ffffff";
  container.style.position = "relative";
  container.style.overflow = "hidden"; // Clip content to container bounds
  
  // Remove any problematic styles
  container.style.border = "none";
  container.style.outline = "none";
  container.style.boxShadow = "none";
  container.style.transform = "none";
  container.style.left = "0";
  container.style.top = "0";

  // Store ViewTransform-compatible info for viewport calculations
  (container as any).__replayViewTransform = {
    x: translateX,
    y: translateY,
    scale: scale,
    containerWidth,
    containerHeight,
    elementBounds,
  };

  console.log(
    `📦 ViewTransform-compatible container setup:`,
    {
      containerSize: `${containerWidth}x${containerHeight}`,
      elementBounds,
      viewTransform: (container as any).__replayViewTransform,
      contentCenter: { x: contentCenterX, y: contentCenterY },
    }
  );
}

/**
 * Execute chronological replay - follows exact drawing timeline with page transitions
 */
async function executeChronologicalReplay(
  elements: DrawingElement[],
  container: HTMLElement,
  config: VirtualPageReplayConfig,
  settings: ExtendedReplaySettings,
  onProgress?: (progress: number) => void,
): Promise<void> {
  console.log("⏰ Starting chronological replay");

  // Build chronological timeline with page switches
  const timeline = buildChronologicalTimeline(elements);
  console.log(`📅 Timeline: ${timeline.length} events`);

  // Create viewport manager for page transitions
  const viewport = createViewportManager(container, config);

  let processedEvents = 0;
  let currentPage: VirtualPage | null = null;
  let elementCount = 0;
  const totalElements = timeline.filter((e) => e.type === "element").length;

  for (const event of timeline) {
    if (event.type === "page-switch") {
      console.log(
        `📄 Page switch: ${currentPage?.id || "start"} → ${event.toPage?.id}`,
      );

      // Show page transition
      if (event.toPage) {
        await showPageTransition(viewport, currentPage, event.toPage, config);

        // Update viewport to show new page
        updateViewportForPage(viewport, event.toPage, config);
        currentPage = event.toPage;

        // Show page indicator
        if (config.showPageIndicators) {
          const indicator = createPageIndicator(event.toPage);
          viewport.appendChild(indicator);

          // Remove indicator after a delay
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

      // Ensure viewport is positioned for this element's page
      const elementPage = virtualPagesManager.findElementPage(event.element);
      if (!currentPage || currentPage.id !== elementPage.id) {
        updateViewportForPage(viewport, elementPage, config);
        currentPage = elementPage;
      }

      // Animate the element with progressive fills using existing system
      await animateElementInViewport(event.element, viewport, settings);

      elementCount++;

      // Wait for element delay (except for last element)
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
 * Execute layer replay - groups by pages, animates all content in each page
 */
async function executeLayerReplay(
  elements: DrawingElement[],
  container: HTMLElement,
  config: VirtualPageReplayConfig,
  settings: ExtendedReplaySettings,
  onProgress?: (progress: number) => void,
): Promise<void> {
  console.log("📄 Starting layer replay");

  // Group elements by virtual pages
  const pageGroups = buildLayerPageGroups(elements);
  console.log(`📚 Page groups: ${pageGroups.length} pages`);

  // Create viewport manager for page transitions
  const viewport = createViewportManager(container, config);

  let processedGroups = 0;
  let totalElementsProcessed = 0;
  const totalElements = elements.length;

  for (const group of pageGroups) {
    console.log(
      `📖 Animating page ${group.page.id} with ${group.elements.length} elements`,
    );

    // Show page transition (except for first page)
    if (processedGroups > 0) {
      const previousGroup = pageGroups[processedGroups - 1];
      await showPageTransition(
        viewport,
        previousGroup.page,
        group.page,
        config,
      );
    }

    // Update viewport to show this page
    updateViewportForPage(viewport, group.page, config);

    // Show page indicator during animation
    if (config.showPageIndicators) {
      const indicator = createPageIndicator(group.page);
      viewport.appendChild(indicator);

      // Remove indicator after animation
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 3000);
    }

    // Animate all elements in this page using existing progressive fill system
    await animatePageElements(
      group.elements,
      viewport,
      settings,
      (elementProgress) => {
        // Calculate overall progress including completed groups
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

    // Final progress update for this group
    if (onProgress) {
      onProgress((totalElementsProcessed / totalElements) * 100);
    }

    // Wait a bit before next page (if not last page)
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

  // Sort elements by timestamp
  const sortedElements = [...elements].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  let currentPageId: string | null = null;

  for (const element of sortedElements) {
    const elementPage = virtualPagesManager.findElementPage(element);

    // Check if we need a page switch
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

    // Add element event
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

  // Group elements by page
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

  // Sort groups by first element timestamp
  return Array.from(pageMap.values()).sort(
    (a, b) => a.firstTimestamp - b.firstTimestamp,
  );
}

/**
 * Create viewport manager that mimics infinite canvas ViewTransform
 */
function createViewportManager(
  container: HTMLElement,
  config: VirtualPageReplayConfig,
) {
  // Get ViewTransform info from container setup
  const viewTransform = (container as any).__replayViewTransform;
  
  // Create main viewport div that acts like the infinite canvas
  const viewport = document.createElement("div");
  viewport.className = "virtual-page-viewport";
  viewport.style.position = "absolute";
  viewport.style.top = "0";
  viewport.style.left = "0";

  // CRITICAL FIX: Apply ViewTransform-like transformation
  // This mimics how the infinite canvas renders elements
  viewport.style.width = `${viewTransform.containerWidth}px`;
  viewport.style.height = `${viewTransform.containerHeight}px`;
  viewport.style.overflow = "visible";

  // Apply the ViewTransform (scale + translation) like infinite canvas
  viewport.style.transform = `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})`;
  viewport.style.transformOrigin = "0 0";

  // Optional debug tint with reduced visibility
  if (config.showDebugTints) {
    viewport.style.backgroundColor = "rgba(255, 255, 0, 0.05)";
    viewport.style.border = "1px dashed rgba(255, 165, 0, 0.3)";
    console.log("🔍 Debug tint enabled for viewport");
  } else {
    viewport.style.backgroundColor = "transparent";
    viewport.style.border = "none";
  }

  container.appendChild(viewport);
  console.log(`🎯 ViewTransform-compatible viewport created:`, {
    transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})`,
    containerSize: `${viewTransform.containerWidth}x${viewTransform.containerHeight}`,
  });
  return viewport;
}

/**
 * Update viewport for page content - maintains ViewTransform compatibility
 */
function updateViewportForPage(
  viewport: HTMLElement,
  page: VirtualPage,
  config: VirtualPageReplayConfig,
): void {
  console.log(`🎯 Updating viewport for page ${page.id}`, page);

  // Get the base ViewTransform from container
  const container = viewport.parentElement as HTMLElement;
  const viewTransform = (container as any).__replayViewTransform;

  // For page transitions, we can add subtle visual offsets
  // but maintain the core ViewTransform to keep elements visible
  let pageOffsetX = 0;
  let pageOffsetY = 0;

  if (!page.isOrigin) {
    // Add very small offsets for visual indication of page changes
    // These should be minimal to not break the coordinate system
    pageOffsetX = page.x * 0.02; // Very subtle offset
    pageOffsetY = page.y * 0.02;
  }

  // Apply smooth transition while maintaining ViewTransform logic
  viewport.style.transition = "transform 0.3s ease-out";
  viewport.style.transform = `translate(${viewTransform.x + pageOffsetX}px, ${viewTransform.y + pageOffsetY}px) scale(${viewTransform.scale})`;
  viewport.style.transformOrigin = "0 0";

  // Maintain viewport dimensions
  viewport.style.width = `${viewTransform.containerWidth}px`;
  viewport.style.height = `${viewTransform.containerHeight}px`;
  viewport.style.overflow = "visible";
  viewport.style.position = "absolute";
  viewport.style.top = "0";
  viewport.style.left = "0";

  console.log(
    `🎯 Viewport updated for page ${page.id} - ViewTransform maintained with subtle offset: (${pageOffsetX}, ${pageOffsetY})`,
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

  // Create transition overlay
  const transition = document.createElement("div");
  transition.className = "page-transition";
  transition.style.position = "absolute";
  transition.style.top = "0";
  transition.style.left = "0";
  transition.style.width = "100%";
  transition.style.height = "100%";
  transition.style.zIndex = "100";
  transition.style.pointerEvents = "none";

  // Page indicator
  if (config.showPageIndicators) {
    const indicator = createPageIndicator(toPage);
    transition.appendChild(indicator);
  }

  // Transition effect
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

  // Animate transition
  await animateTransition(
    transition,
    transitionEffect,
    config.transitionDuration,
  );

  // Remove transition
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
 * Animate transition effect with better timing and easing
 */
async function animateTransition(
  element: HTMLElement,
  effect: string,
  duration: number,
): Promise<void> {
  return new Promise((resolve) => {
    const halfDuration = duration / 2;
    element.style.transition = `${effect} ${halfDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;

    // Trigger animation
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
          // Animate to center position first
          element.style.transform = "translate(0, 0) scale(1)";

          setTimeout(() => {
            element.style.transition = `${effect} ${halfDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;

            // Then animate out
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
 * Animate single element in viewport using existing progressive fill system
 */
async function animateElementInViewport(
  element: DrawingElement,
  viewport: HTMLElement,
  settings: ExtendedReplaySettings,
): Promise<void> {
  // Get element-specific settings
  const duration = getElementDuration(element, settings);
  const easing = getElementEasing(element, settings);

  console.log(
    `🎨 Animating ${element.type} element ${element.id} with duration ${duration}ms, easing ${easing}`,
  );
  console.log(`📍 Element coordinates: (${element.x}, ${element.y})`);

  try {
    // Use existing directSvgAnimation system for progressive fills
    await animateDrawingElements([element], viewport, {
      duration: duration,
      delay: 0, // No delay for single element
      easing: easing,
    });

    console.log(`✅ Element ${element.id} animation completed`);
  } catch (error) {
    console.error(`❌ Error animating element ${element.id}:`, error);
    // Continue with animation even if one element fails
  }
}

/**
 * Animate all elements in a page using existing progressive fill system
 */
async function animatePageElements(
  elements: DrawingElement[],
  viewport: HTMLElement,
  settings: ExtendedReplaySettings,
  onProgress?: (progress: number) => void,
): Promise<void> {
  // Sort elements by timestamp within the page
  const sortedElements = [...elements].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  console.log(`📄 Animating page with ${sortedElements.length} elements`);

  // Animate elements one by one for better control and progress tracking
  for (let i = 0; i < sortedElements.length; i++) {
    const element = sortedElements[i];

    // Animate single element with progressive fills
    await animateElementInViewport(element, viewport, settings);

    // Report progress
    if (onProgress) {
      const progress = ((i + 1) / sortedElements.length) * 100;
      onProgress(progress);
    }

    // Wait for delay between elements (except last element)
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
    return 1000; // Default duration
  }

  let totalLength = 0;
  for (let i = 1; i < element.points.length; i++) {
    const dx = element.points[i].x - element.points[i - 1].x;
    const dy = element.points[i].y - element.points[i - 1].y;
    totalLength += Math.sqrt(dx * dx + dy * dy);
  }

  const duration = (Math.max(totalLength, 10) / speedRate) * 1000;
  return Math.max(100, Math.min(duration, 10000)); // Clamp between 100ms and 10s
}

/**
 * Clear virtual page replay animations
 */
export function clearVirtualPageReplay(container: HTMLElement): void {
  if (!container) {
    console.warn("No container provided to clear");
    return;
  }

  // Clear viewport and all animations
  const viewport = container.querySelector(".virtual-page-viewport");
  if (viewport) {
    viewport.remove();
    console.log("🧹 Viewport cleared");
  }

  // Clear any remaining transition elements
  const transitions = container.querySelectorAll(".page-transition");
  if (transitions.length > 0) {
    transitions.forEach((t) => t.remove());
    console.log(`🧹 ${transitions.length} transitions cleared`);
  }

  // Clear any page indicators
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
    version: "1.3.0", // Updated version - ViewTransform compatible
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
