// Advanced Virtual Page Replay System - Built from scratch
// Handles chronological and layer replay modes with proper page transitions
// Uses existing directSvgAnimation.ts for progressive fill animations

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
  transitionType: "fade" | "slide-left" | "slide-right" | "slide-up" | "slide-down" | "zoom" | "none";
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
  console.log(`🎬 Starting ${config.mode} replay with ${elements.length} elements`);
  
  if (!container) {
    throw new Error("No container provided for virtual page replay");
  }

  if (elements.length === 0) {
    throw new Error("No elements to animate");
  }

  // Clear and setup container
  setupReplayContainer(container, config);

  try {
    if (config.mode === "chronological") {
      await executeChronologicalReplay(elements, container, config, settings, onProgress);
    } else {
      await executeLayerReplay(elements, container, config, settings, onProgress);
    }
  } catch (error) {
    console.error("Virtual page replay error:", error);
    throw error;
  }
}

/**
 * Setup the replay container
 */
function setupReplayContainer(container: HTMLElement, config: VirtualPageReplayConfig): void {
  // Clear container
  container.innerHTML = "";
  
  // Setup container styles
  container.style.width = `${config.width}px`;
  container.style.height = `${config.height}px`;
  container.style.backgroundColor = config.backgroundColor;
  container.style.position = "relative";
  container.style.overflow = "hidden";
  
  console.log(`📦 Container setup: ${config.width}x${config.height}`);
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

  // Log timeline for debugging
  timeline.forEach((event, index) => {
    if (event.type === "page-switch") {
      console.log(`  ${index + 1}. Page switch to ${event.toPage?.id} at ${event.timestamp}`);
    } else {
      console.log(`  ${index + 1}. Element ${event.element?.id} (${event.element?.type}) at ${event.timestamp}`);
    }
  });

  // Create viewport manager for page transitions
  const viewport = createViewportManager(container, config);

  let processedEvents = 0;
  let currentPage: VirtualPage | null = null;
  let elementCount = 0;
  const totalElements = timeline.filter(e => e.type === "element").length;

  for (const event of timeline) {
    if (event.type === "page-switch") {
      console.log(`📄 Page switch: ${currentPage?.id || 'start'} → ${event.toPage?.id}`);

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
      console.log(`🎨 Animating element ${event.element.id} of type ${event.element.type}`);

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
        await new Promise(resolve => setTimeout(resolve, delay));
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
    console.log(`📖 Animating page ${group.page.id} with ${group.elements.length} elements`);

    // Show page transition (except for first page)
    if (processedGroups > 0) {
      const previousGroup = pageGroups[processedGroups - 1];
      await showPageTransition(viewport, previousGroup.page, group.page, config);
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
    await animatePageElements(group.elements, viewport, settings, (elementProgress) => {
      // Calculate overall progress including completed groups
      const elementsInPreviousGroups = totalElementsProcessed;
      const currentGroupProgress = (elementProgress / 100) * group.elements.length;
      const overallProgress = ((elementsInPreviousGroups + currentGroupProgress) / totalElements) * 100;

      if (onProgress) {
        onProgress(overallProgress);
      }
    });

    totalElementsProcessed += group.elements.length;
    processedGroups++;

    // Final progress update for this group
    if (onProgress) {
      onProgress((totalElementsProcessed / totalElements) * 100);
    }

    // Wait a bit before next page (if not last page)
    if (processedGroups < pageGroups.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log("✅ Layer replay completed");
}

/**
 * Build chronological timeline with page switch events
 */
function buildChronologicalTimeline(elements: DrawingElement[]): TimelineEvent[] {
  const timeline: TimelineEvent[] = [];
  
  // Sort elements by timestamp
  const sortedElements = [...elements].sort((a, b) => a.timestamp - b.timestamp);
  
  let currentPageId: string | null = null;
  
  for (const element of sortedElements) {
    const elementPage = virtualPagesManager.findElementPage(element);
    
    // Check if we need a page switch
    if (elementPage.id !== currentPageId) {
      const fromPage = currentPageId ? virtualPagesManager.getPage(currentPageId) : null;
      
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
  return Array.from(pageMap.values()).sort((a, b) => a.firstTimestamp - b.firstTimestamp);
}

/**
 * Create viewport manager for handling page views
 */
function createViewportManager(container: HTMLElement, config: VirtualPageReplayConfig) {
  // Create main viewport div
  const viewport = document.createElement("div");
  viewport.className = "virtual-page-viewport";
  viewport.style.position = "absolute";
  viewport.style.top = "0";
  viewport.style.left = "0";
  viewport.style.width = "100%";
  viewport.style.height = "100%";
  viewport.style.overflow = "hidden";
  
  // Optional debug tint
  if (config.showDebugTints) {
    viewport.style.backgroundColor = "rgba(255, 0, 255, 0.05)";
    console.log("🔍 Debug tint enabled for viewport");
  }
  
  container.appendChild(viewport);
  return viewport;
}

/**
 * Update viewport to show specific page content with proper scaling
 */
function updateViewportForPage(viewport: HTMLElement, page: VirtualPage, config: VirtualPageReplayConfig): void {
  // Calculate viewport transformation to show the page content within our fixed viewport
  const translateX = -page.x;
  const translateY = -page.y;

  // Calculate scale factor if page content is larger than viewport
  const scaleX = config.width / page.width;
  const scaleY = config.height / page.height;
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down if needed

  // Apply transformation with scaling and centering
  const centerOffsetX = (config.width - page.width * scale) / 2;
  const centerOffsetY = (config.height - page.height * scale) / 2;

  viewport.style.transform = `translate(${translateX + centerOffsetX}px, ${translateY + centerOffsetY}px) scale(${scale})`;
  viewport.style.transformOrigin = '0 0';

  console.log(`🎯 Viewport positioned for page ${page.id} at (${page.x}, ${page.y}) with scale ${scale}`);
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
  
  console.log(`🎭 Transition: ${fromPage?.id || 'start'} → ${toPage.id} (${config.transitionType})`);
  
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
  await animateTransition(transition, transitionEffect, config.transitionDuration);
  
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
async function animateTransition(element: HTMLElement, effect: string, duration: number): Promise<void> {
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
  // Use existing directSvgAnimation system for progressive fills
  const duration = getElementDuration(element, settings);
  
  await animateDrawingElements([element], viewport, {
    duration: duration,
    delay: 0, // No delay for single element
    easing: getElementEasing(element, settings),
  });
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
  const sortedElements = [...elements].sort((a, b) => a.timestamp - b.timestamp);

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
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Get element-specific duration based on type and settings
 */
function getElementDuration(element: DrawingElement, settings: ExtendedReplaySettings): number {
  switch (element.type) {
    case "path":
      if (settings.penStrokes.trueSpeed) {
        return calculateTrueSpeedDuration(element, settings.penStrokes.trueSpeedRate);
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
function getElementDelay(element: DrawingElement, settings: ExtendedReplaySettings): number {
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
function getElementEasing(element: DrawingElement, settings: ExtendedReplaySettings): string {
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
function calculateTrueSpeedDuration(element: DrawingElement, speedRate: number): number {
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
  if (!container) return;
  
  // Clear viewport and all animations
  const viewport = container.querySelector(".virtual-page-viewport");
  if (viewport) {
    viewport.remove();
  }
  
  // Clear any remaining transition elements
  const transitions = container.querySelectorAll(".page-transition");
  transitions.forEach(t => t.remove());
  
  console.log("🧹 Virtual page replay cleared");
}
