// Direct SVG Animation System based on excalidraw-animate
// Adapted from excalidraw-animate source code for proper continuous animation

import type { DrawingElement } from "../contexts/DrawingContext";
import { DASHARRAY_DASHED, DASHARRAY_DOTTED } from "./constants";
import { exportToSvg } from "@excalidraw/utils";
import { getFreeDrawSvgPath } from "@excalidraw/excalidraw";

export interface AnimationConfig {
  duration: number;
  delay: number;
  easing: string;
}

// Extended animation configuration for different element types
export interface ExtendedAnimationConfig {
  penStrokes: {
    elementDuration: number;
    groupDelay: number;
    easing: string;
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

type AnimateOptions = {
  startMs?: number;
  pointerImg?: string;
  pointerWidth?: string;
  pointerHeight?: string;
  extendedConfig?: ExtendedAnimationConfig;
};

const SVG_NS = "http://www.w3.org/2000/svg";

const findNode = (ele: SVGElement, name: string) => {
  const childNodes = ele.childNodes as NodeListOf<SVGElement>;
  for (let i = 0; i < childNodes.length; ++i) {
    if (childNodes[i].tagName === name) {
      return childNodes[i];
    }
  }
  return null;
};

const hideBeforeAnimation = (
  svg: SVGSVGElement,
  ele: SVGElement,
  currentMs: number,
  durationMs: number,
  freeze?: boolean,
) => {
  ele.setAttribute("opacity", "0");
  const animate = svg.ownerDocument.createElementNS(SVG_NS, "animate");
  animate.setAttribute("attributeName", "opacity");
  animate.setAttribute("from", "1");
  animate.setAttribute("to", "1");
  animate.setAttribute("begin", `${currentMs}ms`);
  animate.setAttribute("dur", `${durationMs}ms`);
  if (freeze) {
    animate.setAttribute("fill", "freeze");
  }
  ele.appendChild(animate);
};

const animatePath = (
  svg: SVGSVGElement,
  ele: SVGElement,
  currentMs: number,
  durationMs: number,
  options: AnimateOptions,
) => {
  const dTo = ele.getAttribute("d") || "";
  const mCount = dTo.match(/M/g)?.length || 0;
  const cCount = dTo.match(/C/g)?.length || 0;
  const repeat = cCount / mCount;
  let dLast = dTo;
  for (let i = repeat - 1; i >= 0; i -= 1) {
    const dFrom = dTo.replace(
      new RegExp(
        [
          "M(\\S+) (\\S+)",
          "((?: C\\S+ \\S+, \\S+ \\S+, \\S+ \\S+){",
          `${i}`, // skip count
          "})",
          "(?: C\\S+ \\S+, \\S+ \\S+, \\S+ \\S+){1,}",
        ].join(""),
        "g",
      ),
      (...a) => {
        const [x, y] = a[3]
          ? a[3].match(/.* (\S+) (\S+)$/).slice(1, 3)
          : [a[1], a[2]];
        return (
          `M${a[1]} ${a[2]}${a[3]}` +
          ` C${x} ${y}, ${x} ${y}, ${x} ${y}`.repeat(repeat - i)
        );
      },
    );
    if (i === 0) {
      ele.setAttribute("d", dFrom);
    }
    const animate = svg.ownerDocument.createElementNS(SVG_NS, "animate");
    animate.setAttribute("attributeName", "d");
    animate.setAttribute("from", dFrom);
    animate.setAttribute("to", dLast);
    animate.setAttribute("begin", `${currentMs + i * (durationMs / repeat)}ms`);
    animate.setAttribute("dur", `${durationMs / repeat}ms`);
    animate.setAttribute("fill", "freeze");
    ele.appendChild(animate);
    dLast = dFrom;
  }
  hideBeforeAnimation(svg, ele, currentMs, durationMs, true);
};

const animateFillPath = (
  svg: SVGSVGElement,
  ele: SVGElement,
  currentMs: number,
  durationMs: number,
  options: AnimateOptions,
) => {
  const dTo = ele.getAttribute("d") || "";
  if (dTo.includes("C")) {
    animatePath(svg, ele, currentMs, durationMs, options);
    return;
  }
  const dFrom = dTo.replace(
    new RegExp(["M(\\S+) (\\S+)", "((?: L\\S+ \\S+){1,})"].join("")),
    (...a) => {
      return `M${a[1]} ${a[2]}` + a[3].replace(/L\S+ \S+/g, `L${a[1]} ${a[2]}`);
    },
  );
  ele.setAttribute("d", dFrom);
  const animate = svg.ownerDocument.createElementNS(SVG_NS, "animate");
  animate.setAttribute("attributeName", "d");
  animate.setAttribute("from", dFrom);
  animate.setAttribute("to", dTo);
  animate.setAttribute("begin", `${currentMs}ms`);
  animate.setAttribute("dur", `${durationMs}ms`);
  animate.setAttribute("fill", "freeze");
  ele.appendChild(animate);
};

const animatePolygon = (
  svg: SVGSVGElement,
  ele: SVGElement,
  currentMs: number,
  durationMs: number,
  options: AnimateOptions,
) => {
  let dTo = ele.getAttribute("d") || "";
  let mCount = dTo.match(/M/g)?.length || 0;
  let cCount = dTo.match(/C/g)?.length || 0;
  if (mCount === cCount + 1) {
    // workaround for round rect
    dTo = dTo.replace(/^M\S+ \S+ M/, "M");
    mCount = dTo.match(/M/g)?.length || 0;
    cCount = dTo.match(/C/g)?.length || 0;
  }
  if (mCount !== cCount) throw new Error("unexpected m/c counts");
  const dups = 1; // Always use 1 for consistent progressive animation
  const repeat = mCount / dups;
  let dLast = dTo;
  for (let i = repeat - 1; i >= 0; i -= 1) {
    const dFrom = dTo.replace(
      new RegExp(
        [
          "((?:",
          "M(\\S+) (\\S+) C\\S+ \\S+, \\S+ \\S+, \\S+ \\S+ ?".repeat(dups),
          "){",
          `${i}`, // skip count
          "})",
          "M(\\S+) (\\S+) C\\S+ \\S+, \\S+ \\S+, \\S+ \\S+ ?".repeat(dups),
          ".*",
        ].join(""),
      ),
      (...a) => {
        return (
          `${a[1]}` +
          [...Array(dups).keys()]
            .map((d) => {
              const [x, y] = a.slice(2 + dups * 2 + d * 2);
              return `M${x} ${y} C${x} ${y}, ${x} ${y}, ${x} ${y} `;
            })
            .join("")
            .repeat(repeat - i)
        );
      },
    );
    if (i === 0) {
      ele.setAttribute("d", dFrom);
    }
    const animate = svg.ownerDocument.createElementNS(SVG_NS, "animate");
    animate.setAttribute("attributeName", "d");
    animate.setAttribute("from", dFrom);
    animate.setAttribute("to", dLast);
    animate.setAttribute("begin", `${currentMs + i * (durationMs / repeat)}ms`);
    animate.setAttribute("dur", `${durationMs / repeat}ms`);
    animate.setAttribute("fill", "freeze");
    ele.appendChild(animate);
    dLast = dFrom;
  }
  hideBeforeAnimation(svg, ele, currentMs, durationMs, true);
};

const animateText = (
  svg: SVGSVGElement,
  width: number,
  ele: SVGElement,
  currentMs: number,
  durationMs: number,
  options: AnimateOptions,
) => {
  const anchor = ele.getAttribute("text-anchor") || "start";
  if (anchor !== "start") {
    // Not sure how to support it, fallback with opacity
    const toOpacity = ele.getAttribute("opacity") || "1.0";
    const animate = svg.ownerDocument.createElementNS(SVG_NS, "animate");
    animate.setAttribute("attributeName", "opacity");
    animate.setAttribute("from", "0.0");
    animate.setAttribute("to", toOpacity);
    animate.setAttribute("begin", `${currentMs}ms`);
    animate.setAttribute("dur", `${durationMs}ms`);
    animate.setAttribute("fill", "freeze");
    ele.appendChild(animate);
    ele.setAttribute("opacity", "0.0");
    return;
  }
  const x = Number(ele.getAttribute("x") || 0);
  const y = Number(ele.getAttribute("y") || 0);
  const pathId = `pathForText${Date.now()}${Math.random()}`;
  const path = svg.ownerDocument.createElementNS(SVG_NS, "path");
  path.setAttribute("id", pathId);
  const animate = svg.ownerDocument.createElementNS(SVG_NS, "animate");
  animate.setAttribute("attributeName", "d");
  animate.setAttribute("from", `m${x} ${y} h0`);
  animate.setAttribute("to", `m${x} ${y} h${width}`);
  animate.setAttribute("begin", `${currentMs}ms`);
  animate.setAttribute("dur", `${durationMs}ms`);
  animate.setAttribute("fill", "freeze");
  path.appendChild(animate);
  const textPath = svg.ownerDocument.createElementNS(SVG_NS, "textPath");
  textPath.setAttribute("href", "#" + pathId);
  textPath.textContent = ele.textContent;
  ele.textContent = " "; // HACK for Firefox as `null` does not work
  findNode(svg, "defs")?.appendChild(path);
  ele.appendChild(textPath);
};

const patchSvgLine = (
  svg: SVGSVGElement,
  ele: SVGElement,
  isRounded: boolean,
  currentMs: number,
  durationMs: number,
  options: AnimateOptions,
) => {
  const animateLine = isRounded ? animatePath : animatePolygon;
  const childNodes = ele.childNodes as NodeListOf<SVGElement>;
  if (childNodes[0].getAttribute("fill-rule")) {
    animateLine(
      svg,
      childNodes[0].childNodes[1] as SVGElement,
      currentMs,
      durationMs * 0.75,
      options,
    );
    currentMs += durationMs * 0.75;
    animateFillPath(
      svg,
      childNodes[0].childNodes[0] as SVGElement,
      currentMs,
      durationMs * 0.25,
      options,
    );
  } else {
    animateLine(
      svg,
      childNodes[0].childNodes[0] as SVGElement,
      currentMs,
      durationMs,
      options,
    );
  }
};

const patchSvgArrow = (
  svg: SVGSVGElement,
  ele: SVGElement,
  isRounded: boolean,
  currentMs: number,
  durationMs: number,
  options: AnimateOptions,
) => {
  const animateLine = isRounded ? animatePath : animatePolygon;
  const numParts = ele.childNodes.length;
  animateLine(
    svg,
    ele.childNodes[0].childNodes[0] as SVGElement,
    currentMs,
    (durationMs / (numParts + 2)) * 3,
    options,
  );
  currentMs += (durationMs / (numParts + 2)) * 3;
  for (let i = 1; i < numParts; i += 1) {
    const numChildren = ele.childNodes[i].childNodes.length;
    for (let j = 0; j < numChildren; j += 1) {
      animatePath(
        svg,
        ele.childNodes[i].childNodes[j] as SVGElement,
        currentMs,
        durationMs / (numParts + 2) / numChildren,
        options,
      );
      currentMs += durationMs / (numParts + 2) / numChildren;
    }
  }
};

const patchSvgRectangle = (
  svg: SVGSVGElement,
  ele: SVGElement,
  currentMs: number,
  durationMs: number,
  options: AnimateOptions,
) => {
  if (ele.childNodes[1]) {
    animatePolygon(
      svg,
      ele.childNodes[1] as SVGElement,
      currentMs,
      durationMs * 0.75,
      options,
    );
    currentMs += durationMs * 0.75;
    animateFillPath(
      svg,
      ele.childNodes[0] as SVGElement,
      currentMs,
      durationMs * 0.25,
      options,
    );
  } else {
    animatePolygon(
      svg,
      ele.childNodes[0] as SVGElement,
      currentMs,
      durationMs,
      options,
    );
  }
};

const patchSvgEllipse = (
  svg: SVGSVGElement,
  ele: SVGElement,
  currentMs: number,
  durationMs: number,
  options: AnimateOptions,
) => {
  if (ele.childNodes[1]) {
    animatePath(
      svg,
      ele.childNodes[1] as SVGElement,
      currentMs,
      durationMs * 0.75,
      options,
    );
    currentMs += durationMs * 0.75;
    animateFillPath(
      svg,
      ele.childNodes[0] as SVGElement,
      currentMs,
      durationMs * 0.25,
      options,
    );
  } else {
    animatePath(
      svg,
      ele.childNodes[0] as SVGElement,
      currentMs,
      durationMs,
      options,
    );
  }
};

const patchSvgText = (
  svg: SVGSVGElement,
  ele: SVGElement,
  width: number,
  currentMs: number,
  durationMs: number,
  options: AnimateOptions,
) => {
  const childNodes = ele.childNodes as NodeListOf<SVGElement>;
  const len = childNodes.length;
  childNodes.forEach((child) => {
    animateText(svg, width, child, currentMs, durationMs / len, options);
    currentMs += durationMs / len;
  });
};

const patchSvgFreedraw = (
  svg: SVGSVGElement,
  ele: SVGElement,
  element: DrawingElement,
  currentMs: number,
  durationMs: number,
  options: AnimateOptions,
) => {
  const childNode = ele.childNodes[0] as SVGPathElement;
  if (!childNode) return;

  // Hide initially
  childNode.setAttribute("opacity", "0");

  // Show at start of animation
  const showAnimate = svg.ownerDocument.createElementNS(SVG_NS, "animate");
  showAnimate.setAttribute("attributeName", "opacity");
  showAnimate.setAttribute("from", "0");
  showAnimate.setAttribute("to", "1");
  showAnimate.setAttribute("calcMode", "discrete");
  showAnimate.setAttribute("begin", `${currentMs}ms`);
  showAnimate.setAttribute("dur", "1ms");
  showAnimate.setAttribute("fill", "freeze");
  childNode.appendChild(showAnimate);

  // Progressive path animation using smooth transitions
  if (element.points && element.points.length > 1) {
    // Convert to excalidraw format for proper animation
    const excalidrawElement = convertToExcalidrawElement(element);

    // Progressive animation: build path gradually with fewer, smoother steps
    const pointCount = element.points.length;
    const animationSteps = Math.min(Math.max(pointCount / 3, 8), 20); // Fewer steps, smoother animation

    let currentPath = "M 0 0";

    for (let step = 0; step < animationSteps; step++) {
      const progress = (step + 1) / animationSteps;
      const pointsToInclude = Math.ceil(progress * pointCount);

      // Create partial excalidraw element with fewer points
      const partialElement = {
        ...excalidrawElement,
        points: excalidrawElement.points.slice(0, pointsToInclude),
      };

      // Generate path for this step
      const stepPathData =
        pointsToInclude > 0 ? getFreeDrawSvgPath(partialElement) : "M 0 0";

      // Create smooth animation frame with longer duration per step
      const stepAnimate = svg.ownerDocument.createElementNS(SVG_NS, "animate");
      stepAnimate.setAttribute("attributeName", "d");
      stepAnimate.setAttribute("from", currentPath);
      stepAnimate.setAttribute("to", stepPathData);
      stepAnimate.setAttribute(
        "begin",
        `${currentMs + step * (durationMs / animationSteps)}ms`,
      );
      stepAnimate.setAttribute("dur", `${durationMs / animationSteps}ms`);
      stepAnimate.setAttribute("fill", "freeze");
      stepAnimate.setAttribute("calcMode", "spline");
      stepAnimate.setAttribute("keySplines", "0.25 0.1 0.25 1"); // Smooth easing
      stepAnimate.setAttribute("keyTimes", "0;1");
      childNode.appendChild(stepAnimate);

      currentPath = stepPathData;
    }
  }
};

// Helper function to create path from points
const createPathFromPoints = (points: { x: number; y: number }[]): string => {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
};

const patchSvgImage = (
  svg: SVGSVGElement,
  ele: SVGElement,
  currentMs: number,
  durationMs: number,
) => {
  const toOpacity = ele.getAttribute("opacity") || "1.0";
  const animate = svg.ownerDocument.createElementNS(SVG_NS, "animate");
  animate.setAttribute("attributeName", "opacity");
  animate.setAttribute("from", "0.0");
  animate.setAttribute("to", toOpacity);
  animate.setAttribute("begin", `${currentMs}ms`);
  animate.setAttribute("dur", `${durationMs}ms`);
  animate.setAttribute("fill", "freeze");
  ele.appendChild(animate);
  ele.setAttribute("opacity", "0.0");
};

const patchSvgEle = (
  svg: SVGSVGElement,
  ele: SVGElement,
  element: DrawingElement,
  currentMs: number,
  durationMs: number,
  options: AnimateOptions,
) => {
  const { type, width } = element;
  const isRounded = (element.roughness || 1) > 0;

  if (type === "line") {
    patchSvgLine(svg, ele, isRounded, currentMs, durationMs, options);
  } else if (type === "arrow") {
    patchSvgArrow(svg, ele, isRounded, currentMs, durationMs, options);
  } else if (type === "rectangle" || type === "diamond") {
    patchSvgRectangle(svg, ele, currentMs, durationMs, options);
  } else if (type === "ellipse") {
    patchSvgEllipse(svg, ele, currentMs, durationMs, options);
  } else if (type === "text") {
    patchSvgText(svg, ele, width || 100, currentMs, durationMs, options);
  } else if (type === "path" || type === "highlighter") {
    patchSvgFreedraw(svg, ele, element, currentMs, durationMs, options);
  } else {
    console.error("unknown element type", element.type);
  }
};

// Convert our DrawingElement to Excalidraw format for SVG export
function convertToExcalidrawElement(element: DrawingElement): any {
  console.log("Converting element:\", element.type, element.id);\n  console.log(\"Original world coordinates:\", element.x, element.y);\n  \n  // CRITICAL FIX: Transform world coordinates to origin box (0,0 to 1920,1080) space\n  const normalizedCoords = normalizeToOriginBoxSpace(element);\n  console.log(\"Normalized coordinates:", normalizedCoords.x, normalizedCoords.y);
  
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
      excalidrawElement.fontFamily = 1;
      excalidrawElement.textAlign = "left";
      excalidrawElement.verticalAlign = "top";
      break;
  }

  return excalidrawElement;
}

// Create app state for SVG export
function createAppState(): any {
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
    width: 1920,  // CRITICAL FIX: Use origin box dimensions
    height: 1080, // CRITICAL FIX: Use origin box dimensions
  };
}

// Export elements to SVG using Excalidraw (export all together to preserve positioning)
async function exportElementsToSvg(
  elements: DrawingElement[],
): Promise<SVGSVGElement> {
  console.log("Exporting elements to SVG:", elements.length);
  const excalidrawElements = elements.map(convertToExcalidrawElement);
  console.log("Converted to excalidraw elements:", excalidrawElements.length);
  const appState = createAppState();

  try {
    const svg = await exportToSvg({
      elements: excalidrawElements,
      appState: appState,
      files: {},
      exportPadding: 0, // CRITICAL FIX: Remove padding to prevent cropping
    });
    console.log("SVG exported successfully:", svg);
    return svg;
  } catch (error) {
    console.error("Error exporting to SVG:", error);
    throw error;
  }
}

const filterGroupNodes = (nodes: NodeListOf<SVGElement>) =>
  [...nodes].filter((node) => node.tagName === "g" || node.tagName === "use");

// Categorize elements by type for different animation timing
function categorizeElement(
  element: DrawingElement,
): "penStrokes" | "shapes" | "libraryObjects" {
  switch (element.type) {
    case "path":
      return "penStrokes";
    case "highlighter": // Include highlighter in shapes as requested
    case "rectangle":
    case "ellipse":
    case "diamond":
    case "line":
    case "arrow":
      return "shapes";
    case "library-component":
      return "libraryObjects";
    default:
      return "shapes";
  }
}

// Main animation function using excalidraw-animate approach with enhanced timing
export const animateSvg = (
  svg: SVGSVGElement,
  elements: DrawingElement[],
  options: AnimateOptions = {},
) => {
  let current = options.startMs ?? 500;
  const groupNodes = filterGroupNodes(svg.childNodes as NodeListOf<SVGElement>);

  if (groupNodes.length !== elements.length) {
    console.warn("element length mismatch", groupNodes.length, elements.length);
    return { finishedMs: current + 1000 };
  }

  // Default timing if no extended config provided
  const defaultConfig: ExtendedAnimationConfig = {
    penStrokes: {
      elementDuration: 2500,
      groupDelay: 300,
      easing: "ease-in-out",
    },
    shapes: { elementDuration: 2000, groupDelay: 300, easing: "ease-out" },
    libraryObjects: {
      elementDuration: 1500,
      groupDelay: 250,
      easing: "ease-out",
    },
  };

  const extendedConfig = options.extendedConfig || defaultConfig;

  // Debug logging to verify configuration is being applied
  console.log("Animation config:", extendedConfig);

  // Group elements by category and track last type for group delays
  let lastCategory: string | null = null;

  groupNodes.forEach((ele, index) => {
    if (index < elements.length) {
      const element = elements[index];
      const category = categorizeElement(element);
      const config = extendedConfig[category];

      // Apply group delay if we're switching to a different element type
      if (lastCategory !== null && lastCategory !== category) {
        current += config.groupDelay;
      }

      // Animate this element with type-specific duration
      patchSvgEle(svg, ele, element, current, config.elementDuration, options);
      current += config.elementDuration;

      lastCategory = category;
    }
  });

  const finishedMs = current + 100; // Small final margin
  return { finishedMs };
};

// Main animation functions for compatibility
export async function animateDrawingElement(
  element: DrawingElement,
  container: HTMLElement,
  config: AnimationConfig = {
    duration: 2000,
    delay: 0,
    easing: "ease-out",
  },
): Promise<void> {
  return animateDrawingElements([element], container, config);
}

export async function animateDrawingElements(
  elements: DrawingElement[],
  container: HTMLElement,
  config: AnimationConfig = {
    duration: 2000,
    delay: 100,
    easing: "ease-out",
  },
): Promise<void> {
  try {
    // Clear container
    container.innerHTML = "";

    // Sort elements by timestamp for chronological animation
    const sortedElements = [...elements].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    if (sortedElements.length === 0) return;

    // Export ALL elements to SVG together to preserve positioning
    const svg = await exportElementsToSvg(sortedElements);

    // Style the SVG for animation
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.overflow = "visible";

    // Hide SVG initially to prevent flash, then show after animation setup
    svg.style.opacity = "0";

    // Add to container
    container.appendChild(svg);

    // Wait for delay
    if (config.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.delay));
    }

    // Animate using excalidraw-animate approach with all elements
    animateSvg(svg, sortedElements, {
      startMs: 100, // Reduce back to original timing
    });

    // Show SVG after a small delay to let animation setup complete
    setTimeout(() => {
      svg.style.opacity = "1";
    }, 50);
  } catch (error) {
    console.error("Error animating elements:", error);
  }
}

// Enhanced animation function with extended configuration support
export async function animateDrawingElementsWithExtendedConfig(
  elements: DrawingElement[],
  container: HTMLElement,
  config: AnimationConfig,
  extendedConfig?: ExtendedAnimationConfig,
): Promise<void> {
  try {
    console.log("animateDrawingElementsWithExtendedConfig starting with:", {
      elementCount: elements.length,
      container: container,
      containerInnerHTML: container.innerHTML,
    });

    // Clear container
    container.innerHTML = "";
    console.log("Container cleared");

    // Sort elements by timestamp for chronological animation
    const sortedElements = [...elements].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
    console.log("Sorted elements:", sortedElements.length);

    if (sortedElements.length === 0) {
      console.log("No elements to animate");
      return;
    }

    // Export ALL elements to SVG together to preserve positioning
    console.log("Exporting to SVG...");
    const svg = await exportElementsToSvg(sortedElements);
    console.log("SVG created:", svg);

    // Style the SVG for animation
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.overflow = "visible";

    // Hide SVG initially to prevent flash, then show after animation setup
    svg.style.opacity = "0";

    // Add to container
    console.log("Adding SVG to container...");
    container.appendChild(svg);
    console.log("SVG added to container. Container children:", container.children.length);

    // Animate using enhanced excalidraw-animate approach with extended config
    console.log("Starting SVG animation...");
    animateSvg(svg, sortedElements, {
      startMs: 100,
      extendedConfig: extendedConfig,
    });

    // Show SVG after a small delay to let animation setup complete
    setTimeout(() => {
      console.log("Making SVG visible");
      svg.style.opacity = "1";
    }, 50);
  } catch (error) {
    console.error("Error animating elements:", error);
  }
}

// Enhanced animation function with virtual page support and progressive fills
export async function animateElementsDirectlyWithVirtualPages(
  elements: DrawingElement[],
  container: HTMLElement,
  options: {
    animationConfig?: AnimationConfig;
    extendedConfig?: ExtendedAnimationConfig;
    onProgress?: (progress: number) => void;
    onComplete?: () => void;
    mode?: "chronological" | "layer";
    showPageTransitions?: boolean;
    transitionDuration?: number;
  } = {},
): Promise<void> {
  console.log("Virtual page animation with progressive fills:", {
    elementCount: elements.length,
    mode: options.mode || "chronological",
  });

  // For now, just call the regular animation function
  // This preserves all the progressive fill logic
  await animateElementsDirectly(elements, container, {
    animationConfig: options.animationConfig,
    extendedConfig: options.extendedConfig,
    onProgress: options.onProgress,
    onComplete: options.onComplete,
  });
}

// Enhanced animation function with extended configuration support
export async function animateElementsDirectly(
  elements: DrawingElement[],
  container: HTMLElement,
  options: {
    animationConfig?: AnimationConfig;
    extendedConfig?: ExtendedAnimationConfig;
    onProgress?: (progress: number) => void;
    onComplete?: () => void;
  } = {},
): Promise<void> {
  console.log("animateElementsDirectly called with:", {
    elementCount: elements.length,
    container: container,
    options: options,
  });

  const config = options.animationConfig || {
    duration: 500,
    delay: 100,
    easing: "ease-out",
  };

  if (options.onProgress) {
    options.onProgress(0);
  }

  // Calculate total animation time with enhanced timing for different element types
  const sortedElements = [...elements].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  // More accurate duration calculation considering element types
  let totalDuration = 0;
  let lastCategory: string | null = null;

  sortedElements.forEach((element) => {
    const category = categorizeElement(element);
    const elementConfig = options.extendedConfig?.[category] || {
      elementDuration: config.duration,
      groupDelay: config.delay,
      easing: config.easing,
    };

    // Add group delay if switching element types
    if (lastCategory !== null && lastCategory !== category) {
      totalDuration += elementConfig.groupDelay;
    }

    totalDuration += elementConfig.elementDuration;
    lastCategory = category;
  });

  // Track progress during animation
  const startTime = Date.now();
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min((elapsed / totalDuration) * 100, 99); // Cap at 99% until complete

    if (options.onProgress) {
      options.onProgress(progress);
    }

    if (progress >= 99) {
      clearInterval(progressInterval);
    }
  }, 50); // Update every 50ms

  await animateDrawingElementsWithExtendedConfig(
    elements,
    container,
    config,
    options.extendedConfig,
  );

  // Clear progress tracking and set to 100%
  clearInterval(progressInterval);

  if (options.onProgress) {
    options.onProgress(100);
  }

  if (options.onComplete) {
    options.onComplete();
  }
}
