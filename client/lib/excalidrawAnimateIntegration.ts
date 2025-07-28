// Scene-based animation system inspired by excalidraw-animate
// Provides Excalidraw-compatible animation with proper stroke styles and fill patterns

import { exportToSvg } from "@excalidraw/utils";
import type { DrawingElement } from "../contexts/DrawingContext";

// Types for excalidraw-animate
export interface AnimationConfig {
  duration: number;
  delay: number;
  easing: string;
}

export interface AnimatedSvgItem {
  svg: SVGSVGElement;
  duration: number;
  delay: number;
  easing: string;
  finishedTime: number;
}

export interface ExcalidrawAnimateOptions {
  animationConfig?: AnimationConfig;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

// Convert our elements to Excalidraw format for animation
function convertToExcalidrawElements(elements: DrawingElement[]): any[] {
  return elements.map((element, index) => {
    const excalidrawElement: any = {
      id: element.id,
      type:
        element.type === "path" || element.type === "highlighter"
          ? "freedraw"
          : element.type,
      x: element.x,
      y: element.y,
      width: element.width || 100,
      height: element.height || 100,
      angle: 0,
      strokeColor: element.style.stroke,
      backgroundColor:
        element.style.fill && element.style.fill !== "transparent"
          ? element.style.fill
          : "transparent",
      fillStyle: element.fillStyle || "none",
      strokeWidth: element.style.strokeWidth,
      strokeStyle: element.strokeStyle || "solid",
      roughness: element.roughness || 1,
      opacity:
        element.opacity !== undefined ? Math.round(element.opacity * 100) : 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: Math.floor(Math.random() * 2 ** 31),
      versionNonce: Math.floor(Math.random() * 2 ** 31),
      isDeleted: false,
      boundElements: null,
      updated: element.timestamp || Date.now(),
      link: null,
      locked: false,
    };

    // Handle specific element types
    switch (element.type) {
      case "path":
      case "highlighter":
        excalidrawElement.type = "freedraw";
        if (element.points && element.points.length > 0) {
          // Ensure we have relative points for freedraw
          const baseX = Math.min(...element.points.map((p) => p.x));
          const baseY = Math.min(...element.points.map((p) => p.y));
          excalidrawElement.x = baseX;
          excalidrawElement.y = baseY;

          excalidrawElement.points = element.points.map((p: any) => [
            p.x - baseX,
            p.y - baseY,
          ]);
          excalidrawElement.pressures = element.points.map(() => 0.5);
          excalidrawElement.simulatePressure = true;
          excalidrawElement.lastCommittedPoint =
            excalidrawElement.points[excalidrawElement.points.length - 1];

          // For highlighter, ensure lower opacity
          if (element.type === "highlighter") {
            excalidrawElement.opacity = Math.round(
              (element.opacity || 0.3) * 100,
            );
          }
        }
        break;

      case "line":
      case "arrow":
        if (element.points && element.points.length >= 2) {
          excalidrawElement.points = [
            [0, 0],
            [
              element.points[1].x - element.points[0].x,
              element.points[1].y - element.points[0].y,
            ],
          ];
          excalidrawElement.x = element.points[0].x;
          excalidrawElement.y = element.points[0].y;
        }
        break;

      case "text":
        excalidrawElement.text = element.text || "";
        excalidrawElement.fontSize = element.style.fontSize || 16;
        excalidrawElement.fontFamily = 1; // Virgil font
        excalidrawElement.textAlign = "left";
        excalidrawElement.verticalAlign = "top";
        break;

      case "library-component":
        // For library components, convert to a group of elements or use bounding box
        excalidrawElement.type = "rectangle"; // Fallback to rectangle for now
        break;
    }

    return excalidrawElement;
  });
}

// Create app state for Excalidraw export
function createAppState() {
  return {
    gridSize: null,
    viewBackgroundColor: "#ffffff",
    currentItemStrokeColor: "#000000",
    currentItemBackgroundColor: "transparent",
    currentItemFillStyle: "none",
    currentItemStrokeWidth: 2,
    currentItemStrokeStyle: "solid",
    currentItemRoughness: 1,
    currentItemOpacity: 100,
    currentItemFontFamily: 1,
    currentItemFontSize: 16,
    currentItemTextAlign: "left",
    exportBackground: false,
    exportEmbedScene: false,
    exportWithDarkMode: false,
    exportScale: 1,
    zoom: { value: 1 },
    scrollX: 0,
    scrollY: 0,
    width: 800,
    height: 600,
  };
}

// Export elements to SVG (similar to excalidraw-animate)
export async function exportElementsToSvg(
  elements: DrawingElement[],
  appState?: any,
): Promise<SVGSVGElement> {
  const excalidrawElements = convertToExcalidrawElements(elements);
  const finalAppState = appState || createAppState();

  try {
    const svg = await exportToSvg({
      elements: excalidrawElements,
      appState: finalAppState,
      files: {},
      exportPadding: 10,
    });

    return svg;
  } catch (error) {
    console.error("Error exporting to SVG:", error);
    throw error;
  }
}

// Animate SVG with stroke-dasharray (exactly like excalidraw-animate)
export function animateSvg(
  svg: SVGSVGElement,
  config: AnimationConfig = { duration: 1000, delay: 0, easing: "ease-out" },
): Promise<void> {
  return new Promise((resolve) => {
    // Find all drawable elements in the SVG (focus on paths which are the main drawing elements)
    const paths = svg.querySelectorAll("path");

    if (paths.length === 0) {
      // If no paths, try other elements but finish quickly
      resolve();
      return;
    }

    let completedPaths = 0;
    const totalPaths = paths.length;

    // Make all paths invisible initially
    paths.forEach((path) => {
      path.style.opacity = "0";
    });

    // Show the SVG container immediately
    svg.style.opacity = "1";

    // Animate each path
    paths.forEach((path, index) => {
      if (path instanceof SVGPathElement) {
        try {
          // Set initial invisible state first to prevent flash
          path.style.strokeDasharray = "1000";
          path.style.strokeDashoffset = "1000";
          path.style.opacity = "0"; // Start completely invisible
          path.style.fill = "none"; // Ensure fill doesn't appear immediately

          // Force reflow then get accurate path length
          path.getBoundingClientRect();
          const pathLength = path.getTotalLength();

          // Update with correct path length and make visible but stroke hidden
          path.style.strokeDasharray = `${pathLength}`;
          path.style.strokeDashoffset = `${pathLength}`;

          // Check if this is likely a highlighter based on opacity attribute
          const pathOpacity = path.getAttribute("opacity");
          const isHighlighter = pathOpacity && parseFloat(pathOpacity) < 1.0;

          if (isHighlighter) {
            // Preserve the original opacity for highlighter
            path.style.opacity = pathOpacity!;
          } else {
            path.style.opacity = "1";
          }

          // Start animation after delay
          setTimeout(() => {
            // Use Web Animations API for smoother animation (like excalidraw-animate)
            const animation = path.animate(
              [{ strokeDashoffset: pathLength }, { strokeDashoffset: 0 }],
              {
                duration: config.duration,
                easing: config.easing,
                fill: "forwards",
              },
            );

            animation.onfinish = () => {
              // Clean up stroke animation and show fill if any
              path.style.strokeDasharray = "";
              path.style.strokeDashoffset = "";
              const originalFill = path.getAttribute("fill");
              if (originalFill && originalFill !== "none") {
                path.style.fill = originalFill;
              }

              completedPaths++;
              if (completedPaths === totalPaths) {
                resolve();
              }
            };
          }, config.delay);
        } catch (error) {
          console.error("Error animating path:", error);
          // Fallback: just show the path, but preserve highlighter opacity
          const pathOpacity = path.getAttribute("opacity");
          const isHighlighter = pathOpacity && parseFloat(pathOpacity) < 1.0;

          if (isHighlighter) {
            path.style.opacity = pathOpacity!;
          } else {
            path.style.opacity = "1";
          }
          completedPaths++;
          if (completedPaths === totalPaths) {
            resolve();
          }
        }
      } else {
        completedPaths++;
        if (completedPaths === totalPaths) {
          resolve();
        }
      }
    });

    // Fallback timeout in case something goes wrong
    setTimeout(
      () => {
        if (completedPaths < totalPaths) {
          console.warn("Animation timeout, resolving anyway");
          resolve();
        }
      },
      config.duration + config.delay + 1000,
    );
  });
}

// Main animation function with enhanced features
export async function animateExcalidrawScene(
  elements: DrawingElement[],
  container: HTMLElement,
  options: ExcalidrawAnimateOptions = {},
): Promise<void> {
  if (elements.length === 0) {
    options.onComplete?.();
    return;
  }

  try {
    // Sort elements by timestamp for chronological animation
    const sortedElements = [...elements].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    // Clear container
    container.innerHTML = "";
    container.style.position = "relative";
    container.style.overflow = "hidden";
    container.style.backgroundColor = "#ffffff";

    // Use our enhanced animation system with stroke styles and fill patterns
    await manualAnimationFallback(sortedElements, container, options);

    options.onComplete?.();
  } catch (error) {
    console.error("Error in animateExcalidrawScene:", error);
    options.onComplete?.();
  }
}

// Fallback animation using our direct SVG approach
async function manualAnimationFallback(
  elements: DrawingElement[],
  container: HTMLElement,
  options: ExcalidrawAnimateOptions = {},
): Promise<void> {
  // Sort elements by timestamp for chronological animation
  const sortedElements = [...elements].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  const animationDelay = options.animationConfig?.delay || 300;
  const animationDuration = options.animationConfig?.duration || 1000;

  for (let i = 0; i < sortedElements.length; i++) {
    const element = sortedElements[i];

    try {
      // Export single element to SVG
      const svg = await exportElementsToSvg([element]);

      // Style the SVG for animation
      svg.style.position = "absolute";
      svg.style.top = "0";
      svg.style.left = "0";
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.pointerEvents = "none";
      svg.style.zIndex = (i + 1).toString();

      // Add to container
      container.appendChild(svg);

      // Wait for delay between elements
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, animationDelay));
      }

      // Animate this single element
      await animateSvg(svg, {
        duration: animationDuration,
        delay: 0,
        easing: options.animationConfig?.easing || "ease-out",
      });

      // Update progress
      const progress = ((i + 1) / sortedElements.length) * 100;
      options.onProgress?.(progress);
    } catch (error) {
      console.error(`Error animating element ${i}:`, error);
      const progress = ((i + 1) / sortedElements.length) * 100;
      options.onProgress?.(progress);
    }
  }
}

// Create excalidraw scene data for export
export function createExcalidrawSceneData(elements: DrawingElement[]) {
  return {
    type: "excalidraw",
    version: 2,
    source: "https://excalidraw.com",
    elements: convertToExcalidrawElements(elements),
    appState: createAppState(),
    files: {},
  };
}
