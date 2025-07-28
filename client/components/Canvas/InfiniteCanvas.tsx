import React, { useRef, useEffect, useCallback, useState } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { useAnimation } from "../../contexts/AnimationContext";
import {
  renderExcalidrawElement,
  toExcalidrawElement,
} from "../../lib/excalidrawRenderer";
import { useCanvasBackground } from "../../contexts/CanvasBackgroundContext";
import {
  findBindableElementAtPoint,
  createArrowBinding,
} from "../../lib/arrowSystem";

import { cn } from "../../lib/utils";

interface Point {
  x: number;
  y: number;
}

// Generate control points for curved lines
function generateControlPoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
  nodeCount: number,
): { x: number; y: number }[] {
  if (nodeCount === 0) return [];

  const points: { x: number; y: number }[] = [];
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Generate control points along the line with some offset for curvature
  for (let i = 0; i < nodeCount; i++) {
    const t = (i + 1) / (nodeCount + 1); // Position along the line (0 to 1)
    const x = start.x + dx * t;
    const y = start.y + dy * t;

    // Add perpendicular offset to create curve
    const perpOffsetX = -dy * 0.2 * Math.sin(t * Math.PI);
    const perpOffsetY = dx * 0.2 * Math.sin(t * Math.PI);

    points.push({
      x: x + perpOffsetX,
      y: y + perpOffsetY,
    });
  }

  return points;
}

// Helper function to calculate distance from point to line segment
function distanceToLineSegment(
  point: Point,
  lineStart: Point,
  lineEnd: Point,
): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) {
    // Line segment is actually a point
    return Math.sqrt(A * A + B * B);
  }

  let param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

// Helper function to check if point is inside polygon (for lasso selection)
function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (
      polygon[i].y > point.y !== polygon[j].y > point.y &&
      point.x <
        ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) /
          (polygon[j].y - polygon[i].y) +
          polygon[i].x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

// Helper function to check if point is on resize handle
function getResizeHandle(
  point: Point,
  element: any,
  viewTransform: any,
  screenToWorld: (p: Point) => Point,
): string | null {
  if (!element.width || !element.height) return null;

  const handleSize = 8; // Size of resize handles in screen pixels
  const halfHandle = handleSize / 2;

  // Convert element bounds to screen coordinates
  const topLeft = {
    x: element.x * viewTransform.scale + viewTransform.x,
    y: element.y * viewTransform.scale + viewTransform.y,
  };
  const bottomRight = {
    x: (element.x + element.width) * viewTransform.scale + viewTransform.x,
    y: (element.y + element.height) * viewTransform.scale + viewTransform.y,
  };

  const centerX = (topLeft.x + bottomRight.x) / 2;
  const centerY = (topLeft.y + bottomRight.y) / 2;

  // Check each handle
  const handles = [
    { name: "nw", x: topLeft.x, y: topLeft.y },
    { name: "n", x: centerX, y: topLeft.y },
    { name: "ne", x: bottomRight.x, y: topLeft.y },
    { name: "e", x: bottomRight.x, y: centerY },
    { name: "se", x: bottomRight.x, y: bottomRight.y },
    { name: "s", x: centerX, y: bottomRight.y },
    { name: "sw", x: topLeft.x, y: bottomRight.y },
    { name: "w", x: topLeft.x, y: centerY },
  ];

  for (const handle of handles) {
    if (
      point.x >= handle.x - halfHandle &&
      point.x <= handle.x + halfHandle &&
      point.y >= handle.y - halfHandle &&
      point.y <= handle.y + halfHandle
    ) {
      return handle.name;
    }
  }

  return null;
}

export function InfiniteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch } = useDrawing();
  const { state: animationState, dispatch: animationDispatch } = useAnimation();

  // Provide canvas ref to animation system
  useEffect(() => {
    if (canvasRef.current) {
      animationDispatch({ type: "SET_CANVAS_REF", canvasRef });
    }
  }, [animationDispatch]);
  const { currentBackground } = useCanvasBackground();

  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point>({ x: 0, y: 0 });
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragStartPoint, setDragStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [elementDragOffsets, setElementDragOffsets] = useState<
    Record<string, Point>
  >({});
  const [lassoPath, setLassoPath] = useState<Point[]>([]);
  const [isLassoing, setIsLassoing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartPoint, setResizeStartPoint] = useState<Point>({
    x: 0,
    y: 0,
  });
  const [resizeElementId, setResizeElementId] = useState<string | null>(null);

  const screenToWorld = useCallback(
    (screenPoint: Point): Point => {
      const { viewTransform } = state;
      return {
        x: (screenPoint.x - viewTransform.x) / viewTransform.scale,
        y: (screenPoint.y - viewTransform.y) / viewTransform.scale,
      };
    },
    [state.viewTransform],
  );

  const worldToScreen = useCallback(
    (worldPoint: Point): Point => {
      const { viewTransform } = state;
      return {
        x: worldPoint.x * viewTransform.scale + viewTransform.x,
        y: worldPoint.y * viewTransform.scale + viewTransform.y,
      };
    },
    [state.viewTransform],
  );

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { viewTransform } = state;
      const gridSize = 20 * viewTransform.scale;

      if (gridSize < 5) return; // Don't draw grid when too zoomed out

      ctx.strokeStyle =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--canvas-grid")
          .trim() || "#e0e0e0";
      ctx.lineWidth = 1;

      const startX = -viewTransform.x % gridSize;
      const startY = -viewTransform.y % gridSize;

      ctx.beginPath();
      for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();
    },
    [state.viewTransform],
  );

  const drawElement = useCallback(
    (ctx: CanvasRenderingContext2D, element: any) => {
      const { viewTransform } = state;

      ctx.save();
      ctx.scale(viewTransform.scale, viewTransform.scale);
      ctx.translate(
        viewTransform.x / viewTransform.scale,
        viewTransform.y / viewTransform.scale,
      );

      ctx.strokeStyle = element.style.stroke;
      ctx.lineWidth = element.style.strokeWidth;
      ctx.fillStyle = element.style.fill || "transparent";

      switch (element.type) {
        case "path":
          if (element.points && element.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(element.points[0].x, element.points[0].y);
            for (let i = 1; i < element.points.length; i++) {
              ctx.lineTo(element.points[i].x, element.points[i].y);
            }
            ctx.stroke();
          }
          break;

        case "rectangle":
          ctx.beginPath();
          ctx.rect(
            element.x,
            element.y,
            element.width || 100,
            element.height || 100,
          );
          if (element.style.fill && element.style.fill !== "transparent") {
            ctx.fill();
          }
          ctx.stroke();
          break;

        case "ellipse":
          ctx.beginPath();
          const rx = (element.width || 100) / 2;
          const ry = (element.height || 100) / 2;
          ctx.ellipse(
            element.x + rx,
            element.y + ry,
            rx,
            ry,
            0,
            0,
            2 * Math.PI,
          );
          if (element.style.fill && element.style.fill !== "transparent") {
            ctx.fill();
          }
          ctx.stroke();
          break;

        case "line":
          if (element.points && element.points.length === 2) {
            ctx.beginPath();
            ctx.moveTo(element.points[0].x, element.points[0].y);
            ctx.lineTo(element.points[1].x, element.points[1].y);
            ctx.stroke();
          }
          break;

        case "arrow":
          if (element.points && element.points.length === 2) {
            const [start, end] = element.points;
            const headLength = 15;
            const angle = Math.atan2(end.y - start.y, end.x - start.x);

            // Draw line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            // Draw arrowhead
            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - headLength * Math.cos(angle - Math.PI / 6),
              end.y - headLength * Math.sin(angle - Math.PI / 6),
            );
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - headLength * Math.cos(angle + Math.PI / 6),
              end.y - headLength * Math.sin(angle + Math.PI / 6),
            );
            ctx.stroke();
          }
          break;

        case "text":
          ctx.font = `${element.style.fontSize || 16}px ${element.style.fontFamily || "Arial"}`;
          ctx.fillStyle = element.style.stroke;
          ctx.fillText(element.text || "", element.x, element.y);
          break;
      }

      ctx.restore();
    },
    [state.viewTransform],
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx);

    // Draw all elements using Excalidraw-style rendering
    state.elements.forEach((element) => {
      const layer = state.layers.find((l) => l.id === element.layerId);
      if (layer?.visible) {
        const excalidrawElement = toExcalidrawElement(element);
        // Pass the background pattern to the renderer
        renderExcalidrawElement(ctx, excalidrawElement, state.viewTransform);
      }
    });

    // Draw current element being drawn
    if (state.currentElement) {
      const excalidrawElement = toExcalidrawElement(state.currentElement);
      renderExcalidrawElement(ctx, excalidrawElement, state.viewTransform);
    }

    // Draw current path for pencil and highlighter tools
    if (
      (state.currentTool === "pencil" || state.currentTool === "highlighter") &&
      currentPath.length > 1
    ) {
      const { viewTransform } = state;
      ctx.save();
      ctx.scale(viewTransform.scale, viewTransform.scale);
      ctx.translate(
        viewTransform.x / viewTransform.scale,
        viewTransform.y / viewTransform.scale,
      );

      if (state.currentTool === "highlighter") {
        ctx.globalAlpha = state.highlighterOpacity;
        ctx.strokeStyle = state.highlighterColor;
        ctx.lineWidth = state.brushSize * 3;
      } else {
        ctx.strokeStyle = state.brushColor;
        ctx.lineWidth = state.brushSize;
      }

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw selection
    if (state.selectedElements.length > 0) {
      ctx.strokeStyle =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--canvas-selection")
          .trim() || "#007AFF";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      if (state.deepSelect && state.selectedElements.length > 1) {
        // Deep selection: draw one big bounding box around all selected elements
        const selectedElementsData = state.elements.filter((el) =>
          state.selectedElements.includes(el.id),
        );

        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;

        selectedElementsData.forEach((element) => {
          if (element.points && element.points.length > 0) {
            // For path elements, use points
            element.points.forEach((point) => {
              minX = Math.min(minX, point.x);
              minY = Math.min(minY, point.y);
              maxX = Math.max(maxX, point.x);
              maxY = Math.max(maxY, point.y);
            });
          } else {
            // For shape elements, use x, y, width, height
            const width = element.width || 100;
            const height = element.height || 100;
            minX = Math.min(minX, element.x);
            minY = Math.min(minY, element.y);
            maxX = Math.max(maxX, element.x + width);
            maxY = Math.max(maxY, element.y + height);
          }
        });

        // Convert to screen coordinates
        const topLeft = worldToScreen({ x: minX, y: minY });
        const bottomRight = worldToScreen({ x: maxX, y: maxY });

        // Draw unified bounding box
        ctx.strokeRect(
          topLeft.x - 5,
          topLeft.y - 5,
          bottomRight.x - topLeft.x + 10,
          bottomRight.y - topLeft.y + 10,
        );

        // Note: For deep selection, we don't show resize handles as it would be complex
        // to resize multiple elements of different types
      } else {
        // Normal selection: draw individual boxes for each element
        state.selectedElements.forEach((elementId) => {
          const element = state.elements.find((el) => el.id === elementId);
          if (element) {
            const screenPos = worldToScreen({ x: element.x, y: element.y });
            const width = (element.width || 100) * state.viewTransform.scale;
            const height = (element.height || 100) * state.viewTransform.scale;

            ctx.strokeRect(
              screenPos.x - 5,
              screenPos.y - 5,
              width + 10,
              height + 10,
            );

            // Draw resize handles for rectangles and ellipses
            if (element.type === "rectangle" || element.type === "ellipse") {
              const handleSize = 8;
              const halfHandle = handleSize / 2;

              // Calculate handle positions
              const topLeft = { x: screenPos.x, y: screenPos.y };
              const bottomRight = {
                x: screenPos.x + width,
                y: screenPos.y + height,
              };
              const centerX = (topLeft.x + bottomRight.x) / 2;
              const centerY = (topLeft.y + bottomRight.y) / 2;

              const handles = [
                { x: topLeft.x, y: topLeft.y }, // nw
                { x: centerX, y: topLeft.y }, // n
                { x: bottomRight.x, y: topLeft.y }, // ne
                { x: bottomRight.x, y: centerY }, // e
                { x: bottomRight.x, y: bottomRight.y }, // se
                { x: centerX, y: bottomRight.y }, // s
                { x: topLeft.x, y: bottomRight.y }, // sw
                { x: topLeft.x, y: centerY }, // w
              ];

              // Draw handles
              ctx.fillStyle = "#007AFF";
              ctx.strokeStyle = "#FFFFFF";
              ctx.lineWidth = 1;

              handles.forEach((handle) => {
                ctx.fillRect(
                  handle.x - halfHandle,
                  handle.y - halfHandle,
                  handleSize,
                  handleSize,
                );
                ctx.strokeRect(
                  handle.x - halfHandle,
                  handle.y - halfHandle,
                  handleSize,
                  handleSize,
                );
              });
            }
          }
        });
      }

      ctx.setLineDash([]);
    }

    // Draw lasso path
    if (isLassoing && lassoPath.length > 1) {
      const { viewTransform } = state;
      ctx.save();
      ctx.scale(viewTransform.scale, viewTransform.scale);
      ctx.translate(
        viewTransform.x / viewTransform.scale,
        viewTransform.y / viewTransform.scale,
      );

      ctx.strokeStyle = "#007AFF";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(lassoPath[0].x, lassoPath[0].y);
      for (let i = 1; i < lassoPath.length; i++) {
        ctx.lineTo(lassoPath[i].x, lassoPath[i].y);
      }
      // Close the path
      if (lassoPath.length > 2) {
        ctx.lineTo(lassoPath[0].x, lassoPath[0].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }, [
    state,
    drawGrid,
    drawElement,
    worldToScreen,
    currentPath,
    isLassoing,
    lassoPath,
    animationState,
  ]);

  useEffect(() => {
    render();
  }, [render]);

  const getEventPoint = useCallback((event: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      const point = getEventPoint(event);
      const worldPoint = screenToWorld(point);

      if (
        event.button === 1 ||
        (event.button === 0 && event.altKey) ||
        state.currentTool === "hand"
      ) {
        // Middle mouse, Alt+Click, or Hand tool for panning
        setIsPanning(true);
        setLastPanPoint(point);
        return;
      }

      switch (state.currentTool) {
        case "pencil":
          const newElement = {
            id: `element-${Date.now()}`,
            type: "path" as const,
            x: worldPoint.x,
            y: worldPoint.y,
            points: [worldPoint],
            style: {
              stroke: state.brushColor,
              strokeWidth: state.brushSize,
            },
            strokeStyle: "solid" as const, // Pencil always uses solid strokes
            opacity: 1,
            layerId: state.activeLayerId,
            timestamp: Date.now(),
          };

          dispatch({ type: "START_DRAWING", element: newElement });
          setCurrentPath([worldPoint]);
          break;

        case "highlighter":
          const highlighterElement = {
            id: `element-${Date.now()}`,
            type: "highlighter" as const,
            x: worldPoint.x,
            y: worldPoint.y,
            points: [worldPoint],
            style: {
              stroke: state.highlighterColor,
              strokeWidth: state.brushSize * 3, // Highlighters are typically wider
            },
            layerId: state.activeLayerId,
            timestamp: Date.now(),
            opacity: state.highlighterOpacity,
          };

          dispatch({ type: "START_DRAWING", element: highlighterElement });
          setCurrentPath([worldPoint]);
          break;

        case "rectangle":
        case "ellipse":
        case "diamond":
          const shapeElement = {
            id: `element-${Date.now()}`,
            type: state.currentTool,
            x: worldPoint.x,
            y: worldPoint.y,
            width: 1,
            height: 1,
            style: {
              stroke: state.brushColor,
              strokeWidth: state.brushSize,
              fill: state.fillColor,
            },
            strokeStyle: state.lineStyle.type as "solid" | "dashed" | "dotted",
            opacity: state.lineStyle.opacity,
            layerId: state.activeLayerId,
            timestamp: Date.now(),
            roughness: state.roughness,
            fillStyle: (state.fillColor === "transparent" ||
            state.backgroundPattern === "none"
              ? "none"
              : state.backgroundPattern) as
              | "none"
              | "hachure"
              | "cross-hatch"
              | "dots"
              | "zigzag"
              | "solid",
          };

          dispatch({ type: "START_DRAWING", element: shapeElement });
          break;

        case "line":
        case "arrow":
          const lineElement = {
            id: `element-${Date.now()}`,
            type: state.currentTool,
            x: worldPoint.x,
            y: worldPoint.y,
            points: [worldPoint, worldPoint],
            style: {
              stroke: state.brushColor,
              strokeWidth: state.brushSize,
            },
            strokeStyle: state.lineStyle.type as "solid" | "dashed" | "dotted",
            opacity: state.lineStyle.opacity,
            // Add control points for curved lines
            controlPoints:
              state.lineNodes > 0
                ? generateControlPoints(worldPoint, worldPoint, state.lineNodes)
                : undefined,
            // Arrow-specific properties
            ...(state.currentTool === "arrow" && {
              startArrowhead: state.arrowSettings.startArrowhead,
              endArrowhead: state.arrowSettings.endArrowhead,
              startBinding: null,
              endBinding: null,
            }),
            layerId: state.activeLayerId,
            timestamp: Date.now(),
          };

          dispatch({ type: "START_DRAWING", element: lineElement });
          break;

        case "select":
          // First check if clicking on a resize handle of a selected element
          let resizeHandleClicked = null;
          let resizeElementClicked = null;

          for (const elementId of state.selectedElements) {
            const element = state.elements.find((el) => el.id === elementId);
            if (
              element &&
              (element.type === "rectangle" || element.type === "ellipse")
            ) {
              const handle = getResizeHandle(
                point,
                element,
                state.viewTransform,
                screenToWorld,
              );
              if (handle) {
                resizeHandleClicked = handle;
                resizeElementClicked = element;
                break;
              }
            }
          }

          if (resizeHandleClicked && resizeElementClicked) {
            setIsResizing(true);
            setResizeHandle(resizeHandleClicked);
            setResizeStartPoint(worldPoint);
            setResizeElementId(resizeElementClicked.id);
            return;
          }

          // Check if clicking on an element with improved hit detection
          const clickedElement = state.elements.find((element) => {
            if (element.type === "path" && element.points) {
              // For paths, check if click is near any line segment
              const tolerance = 5 / state.viewTransform.scale;
              for (let i = 0; i < element.points.length - 1; i++) {
                const p1 = element.points[i];
                const p2 = element.points[i + 1];
                const distance = distanceToLineSegment(worldPoint, p1, p2);
                if (distance <= tolerance) return true;
              }
              return false;
            } else if (element.type === "line" || element.type === "arrow") {
              // For lines and arrows
              if (element.points && element.points.length >= 2) {
                const tolerance = 5 / state.viewTransform.scale;
                const distance = distanceToLineSegment(
                  worldPoint,
                  element.points[0],
                  element.points[1],
                );
                return distance <= tolerance;
              }
              return false;
            } else if (element.type === "text") {
              // For text, use a simple bounding box
              const textWidth =
                (element.text || "").length *
                (element.style.fontSize || 16) *
                0.6;
              const textHeight = element.style.fontSize || 16;
              return (
                worldPoint.x >= element.x &&
                worldPoint.x <= element.x + textWidth &&
                worldPoint.y >= element.y - textHeight &&
                worldPoint.y <= element.y
              );
            } else {
              // For rectangles and ellipses
              return (
                worldPoint.x >= element.x &&
                worldPoint.x <= element.x + (element.width || 100) &&
                worldPoint.y >= element.y &&
                worldPoint.y <= element.y + (element.height || 100)
              );
            }
          });

          if (clickedElement) {
            if (event.ctrlKey || event.metaKey) {
              // Add to selection
              const newSelection = state.selectedElements.includes(
                clickedElement.id,
              )
                ? state.selectedElements.filter(
                    (id) => id !== clickedElement.id,
                  )
                : [...state.selectedElements, clickedElement.id];
              dispatch({ type: "SELECT_ELEMENTS", elementIds: newSelection });
            } else {
              // Replace selection if not already selected
              if (!state.selectedElements.includes(clickedElement.id)) {
                dispatch({
                  type: "SELECT_ELEMENTS",
                  elementIds: [clickedElement.id],
                });
              }

              // Start dragging the selected elements
              setIsDraggingElement(true);
              setDragStartPoint(worldPoint);

              // Calculate offset for each selected element
              const offsets: Record<string, Point> = {};
              const elementsToMove = state.selectedElements.includes(
                clickedElement.id,
              )
                ? state.selectedElements
                : [clickedElement.id];

              elementsToMove.forEach((elementId) => {
                const element = state.elements.find(
                  (el) => el.id === elementId,
                );
                if (element) {
                  offsets[elementId] = {
                    x: worldPoint.x - element.x,
                    y: worldPoint.y - element.y,
                  };
                }
              });
              setElementDragOffsets(offsets);
            }
          } else {
            // Clear selection
            dispatch({ type: "SELECT_ELEMENTS", elementIds: [] });
          }
          break;

        case "text":
          const text = prompt("Enter text:") || "Text";
          const textElement = {
            id: `element-${Date.now()}`,
            type: "text" as const,
            x: worldPoint.x,
            y: worldPoint.y + 16, // Offset for baseline
            text: text,
            style: {
              stroke: state.brushColor,
              strokeWidth: state.brushSize,
              fontSize: 16,
              fontFamily: "Arial",
            },
            layerId: state.activeLayerId,
            timestamp: Date.now(),
          };

          dispatch({ type: "ADD_ELEMENT", element: textElement });
          break;

        case "lasso":
          setIsLassoing(true);
          setLassoPath([worldPoint]);
          break;
      }
    },
    [getEventPoint, screenToWorld, state, dispatch],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const point = getEventPoint(event);
      const worldPoint = screenToWorld(point);

      if (isPanning) {
        const deltaX = point.x - lastPanPoint.x;
        const deltaY = point.y - lastPanPoint.y;

        dispatch({
          type: "SET_VIEW_TRANSFORM",
          transform: {
            ...state.viewTransform,
            x: state.viewTransform.x + deltaX,
            y: state.viewTransform.y + deltaY,
          },
        });

        setLastPanPoint(point);
        return;
      }

      if (isResizing && resizeElementId && resizeHandle) {
        const element = state.elements.find((el) => el.id === resizeElementId);
        if (element) {
          const deltaX = worldPoint.x - resizeStartPoint.x;
          const deltaY = worldPoint.y - resizeStartPoint.y;

          let newWidth = element.width || 100;
          let newHeight = element.height || 100;
          let newX = element.x;
          let newY = element.y;

          switch (resizeHandle) {
            case "nw":
              newX = element.x + deltaX;
              newY = element.y + deltaY;
              newWidth = (element.width || 100) - deltaX;
              newHeight = (element.height || 100) - deltaY;
              break;
            case "n":
              newY = element.y + deltaY;
              newHeight = (element.height || 100) - deltaY;
              break;
            case "ne":
              newY = element.y + deltaY;
              newWidth = (element.width || 100) + deltaX;
              newHeight = (element.height || 100) - deltaY;
              break;
            case "e":
              newWidth = (element.width || 100) + deltaX;
              break;
            case "se":
              newWidth = (element.width || 100) + deltaX;
              newHeight = (element.height || 100) + deltaY;
              break;
            case "s":
              newHeight = (element.height || 100) + deltaY;
              break;
            case "sw":
              newX = element.x + deltaX;
              newWidth = (element.width || 100) - deltaX;
              newHeight = (element.height || 100) + deltaY;
              break;
            case "w":
              newX = element.x + deltaX;
              newWidth = (element.width || 100) - deltaX;
              break;
          }

          // Enforce minimum size
          if (newWidth < 10) {
            newWidth = 10;
            if (["nw", "sw", "w"].includes(resizeHandle)) {
              newX = element.x + (element.width || 100) - 10;
            }
          }
          if (newHeight < 10) {
            newHeight = 10;
            if (["nw", "n", "ne"].includes(resizeHandle)) {
              newY = element.y + (element.height || 100) - 10;
            }
          }

          dispatch({
            type: "RESIZE_ELEMENT",
            elementId: resizeElementId,
            width: newWidth,
            height: newHeight,
            x: newX,
            y: newY,
          });
        }
        return;
      }

      if (isDraggingElement && state.selectedElements.length > 0) {
        const deltaX = worldPoint.x - dragStartPoint.x;
        const deltaY = worldPoint.y - dragStartPoint.y;

        dispatch({
          type: "MOVE_ELEMENTS",
          elementIds: state.selectedElements,
          deltaX: deltaX,
          deltaY: deltaY,
        });

        setDragStartPoint(worldPoint);
        return;
      }

      if (state.isDrawing && state.currentElement) {
        switch (state.currentTool) {
          case "pencil":
          case "highlighter":
            const newPath = [...currentPath, worldPoint];
            setCurrentPath(newPath);
            dispatch({ type: "UPDATE_DRAWING", points: newPath });
            break;

          case "rectangle":
          case "ellipse":
            const startX = state.currentElement.x;
            const startY = state.currentElement.y;
            const width = worldPoint.x - startX;
            const height = worldPoint.y - startY;

            // Update current element being drawn
            dispatch({
              type: "START_DRAWING",
              element: {
                ...state.currentElement,
                width: Math.abs(width),
                height: Math.abs(height),
                x: width < 0 ? worldPoint.x : startX,
                y: height < 0 ? worldPoint.y : startY,
              },
            });
            break;

          case "line":
          case "arrow":
            dispatch({
              type: "UPDATE_DRAWING",
              points: [state.currentElement.points![0], worldPoint],
            });
            break;
        }
      }

      // Handle lasso tool
      if (isLassoing) {
        setLassoPath((prev) => [...prev, worldPoint]);
      }
    },
    [
      getEventPoint,
      screenToWorld,
      isPanning,
      lastPanPoint,
      state,
      dispatch,
      currentPath,
    ],
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setResizeElementId(null);
      return;
    }

    if (isDraggingElement) {
      // Save final position to history when dragging ends
      dispatch({ type: "FINISH_MOVING_ELEMENTS" });
      setIsDraggingElement(false);
      setElementDragOffsets({});
      return;
    }

    if (isLassoing) {
      // Complete lasso selection
      if (lassoPath.length > 2) {
        const selectedIds: string[] = [];

        state.elements.forEach((element) => {
          const layer = state.layers.find((l) => l.id === element.layerId);
          if (!layer?.visible) return;

          let elementCenter: Point;

          if (
            element.type === "path" &&
            element.points &&
            element.points.length > 0
          ) {
            // For paths, check if any point is inside lasso
            const isInside = element.points.some((point) =>
              pointInPolygon(point, lassoPath),
            );
            if (isInside) selectedIds.push(element.id);
          } else if (element.type === "line" || element.type === "arrow") {
            // For lines/arrows, check both endpoints
            if (element.points && element.points.length >= 2) {
              const isInside = element.points.some((point) =>
                pointInPolygon(point, lassoPath),
              );
              if (isInside) selectedIds.push(element.id);
            }
          } else if (element.type === "text") {
            elementCenter = { x: element.x, y: element.y };
            if (pointInPolygon(elementCenter, lassoPath)) {
              selectedIds.push(element.id);
            }
          } else {
            // For rectangles and ellipses, check center point
            elementCenter = {
              x: element.x + (element.width || 100) / 2,
              y: element.y + (element.height || 100) / 2,
            };
            if (pointInPolygon(elementCenter, lassoPath)) {
              selectedIds.push(element.id);
            }
          }
        });

        dispatch({ type: "SELECT_ELEMENTS", elementIds: selectedIds });
      }

      setIsLassoing(false);
      setLassoPath([]);
      return;
    }

    if (state.isDrawing) {
      if (
        state.currentTool === "pencil" ||
        state.currentTool === "highlighter"
      ) {
        dispatch({ type: "FINISH_DRAWING" });
        setCurrentPath([]);
      } else if (
        ["rectangle", "ellipse", "diamond", "line", "arrow"].includes(
          state.currentTool,
        )
      ) {
        // For arrows, check for binding before finishing
        if (
          state.currentTool === "arrow" &&
          state.currentElement &&
          state.arrowSettings.enableBinding
        ) {
          const element = state.currentElement;
          if (element.points && element.points.length >= 2) {
            const startPoint = element.points[0];
            const endPoint = element.points[element.points.length - 1];

            // Check for binding at start point
            const startBindableElement = findBindableElementAtPoint(
              startPoint,
              state.elements.filter((el) => el.id !== element.id),
            );

            // Check for binding at end point
            const endBindableElement = findBindableElementAtPoint(
              endPoint,
              state.elements.filter((el) => el.id !== element.id),
            );

            // Update element with bindings
            let updatedElement = { ...element };
            if (startBindableElement) {
              updatedElement.startBinding = createArrowBinding(
                startPoint,
                startBindableElement,
              );
            }
            if (endBindableElement) {
              updatedElement.endBinding = createArrowBinding(
                endPoint,
                endBindableElement,
              );
            }

            // Update the current element before finishing
            if (startBindableElement || endBindableElement) {
              dispatch({ type: "START_DRAWING", element: updatedElement });
            }
          }
        }

        dispatch({ type: "FINISH_DRAWING" });
      }
    }
  }, [
    isPanning,
    isDraggingElement,
    state.isDrawing,
    state.currentTool,
    dispatch,
  ]);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault();

      const point = getEventPoint(event);
      const worldPoint = screenToWorld(point);

      const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(
        0.1,
        Math.min(5, state.viewTransform.scale * scaleFactor),
      );

      // Zoom towards mouse position
      const newTransform = {
        scale: newScale,
        x: point.x - worldPoint.x * newScale,
        y: point.y - worldPoint.y * newScale,
      };

      dispatch({ type: "SET_VIEW_TRANSFORM", transform: newTransform });
    },
    [getEventPoint, screenToWorld, state.viewTransform, dispatch],
  );

  const getCanvasStyle = () => {
    let cursor = "default";

    if (isPanning) {
      cursor = "grabbing";
    } else if (isDraggingElement) {
      cursor = "move";
    } else if (isResizing) {
      // Set resize cursor based on handle
      switch (resizeHandle) {
        case "nw":
        case "se":
          cursor = "nw-resize";
          break;
        case "n":
        case "s":
          cursor = "ns-resize";
          break;
        case "ne":
        case "sw":
          cursor = "ne-resize";
          break;
        case "e":
        case "w":
          cursor = "ew-resize";
          break;
        default:
          cursor = "default";
      }
    } else {
      switch (state.currentTool) {
        case "hand":
          cursor = "grab";
          break;
        case "lasso":
        case "pencil":
          cursor = "crosshair";
          break;
        case "text":
          cursor = "text";
          break;
        case "select":
          cursor = "default";
          break;
        default:
          cursor = "crosshair";
      }
    }

    const baseStyle = { cursor } as React.CSSProperties;

    // Handle different patterns
    let backgroundImage: string | undefined;
    let backgroundSize: string | undefined;
    let backgroundColor = currentBackground.color;

    switch (currentBackground.pattern) {
      case "dots":
        backgroundImage =
          "radial-gradient(circle, rgba(148, 163, 184, 0.3) 1px, transparent 1px)";
        backgroundSize = "20px 20px";
        break;
      case "grid":
        backgroundImage = `
          linear-gradient(rgba(148, 163, 184, 0.2) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148, 163, 184, 0.2) 1px, transparent 1px)
        `;
        backgroundSize = "20px 20px";
        break;
      case "lines":
        backgroundImage =
          "linear-gradient(90deg, rgba(148, 163, 184, 0.1) 1px, transparent 1px)";
        backgroundSize = "20px 20px";
        break;
      case "none":
      default:
        backgroundImage = undefined;
        backgroundSize = undefined;
        break;
    }

    // Handle transparent background
    if (currentBackground.color === "transparent") {
      backgroundColor = "transparent";
      // Add checkerboard pattern for transparent backgrounds
      if (!backgroundImage) {
        backgroundImage = `
          linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
          linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
          linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
        `;
        backgroundSize = "20px 20px";
      }
    }

    return {
      ...baseStyle,
      backgroundColor,
      backgroundImage,
      backgroundSize,
      backgroundPosition:
        currentBackground.color === "transparent" && !currentBackground.pattern
          ? "0 0, 0 10px, 10px -10px, -10px 0px"
          : undefined,
    };
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative"
      style={getCanvasStyle()}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Recording is now automatic - no indicator needed */}
    </div>
  );
}
