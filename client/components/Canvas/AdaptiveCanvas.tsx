import React, { useRef, useEffect, useCallback, useState } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { useAnimation } from "../../contexts/AnimationContext";
import { useCanvasBackground } from "../../contexts/CanvasBackgroundContext";
import { useCanvasSettings } from "../../contexts/CanvasSettingsContext";
import { usePageMode } from "../../contexts/PageModeContext";
import { useUIVisibility } from "../../contexts/UIVisibilityContext";
import { useTextTool } from "../../contexts/TextToolContext";

import { useCameraPathAnimation } from "../../hooks/useCameraPathAnimation";
import { usePalmRejection } from "../../hooks/usePalmRejection";
import { useStylusOnly } from "../../contexts/StylusOnlyContext";
import { cn } from "../../lib/utils";
import {
  renderRoughElement,
  getRoughnessFromSloppiness,
  getBowingFromSloppiness,
} from "../../lib/roughRenderer";

import { PasteButtons } from "./PasteButtons";
import { GoBackToContentButton } from "./GoBackToContentButton";
import { SelectionOverlay } from "./SelectionOverlay";
import { OriginBoxOverlay } from "./OriginBoxOverlay";
import { VirtualPagesOverlay } from "./VirtualPagesOverlay";
import { KeyboardTextInput } from "./TextInput/KeyboardTextInput";
import { StylusTextInput } from "./TextInput/StylusTextInput";

import {
  drawSmoothStroke,
  enhancePoints,
  SLOPPINESS_PRESETS,
} from "../../lib/strokeRenderer";

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

// Camera tracking utility functions
function smoothDamp(
  current: number,
  target: number,
  velocity: number,
  smoothTime: number,
  deltaTime: number,
): { value: number; velocity: number } {
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

  const change = current - target;
  const temp = (velocity + omega * change) * deltaTime;
  velocity = (velocity - omega * temp) * exp;
  const value = target + (change + temp) * exp;

  return { value, velocity };
}

export function AdaptiveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, dispatch } = useDrawing();
  const { state: animationState, dispatch: animationDispatch } = useAnimation();
  const { currentBackground } = useCanvasBackground();
  const { state: canvasSettings, dispatch: canvasDispatch } =
    useCanvasSettings();
  const pageMode = usePageMode();
  const palmRejection = usePalmRejection();
  const { state: stylusOnlyState } = useStylusOnly();
  const { isUIVisible } = useUIVisibility();
  const { state: textToolState, dispatch: textToolDispatch } = useTextTool();

  const { isAnimatingCamera } = useCameraPathAnimation();

  // Reset text tool state when switching away from text tool
  useEffect(() => {
    if (state.currentTool !== "text") {
      textToolDispatch({ type: "COMPLETE_TEXT_INPUT" });
      setIsAddingText(false);
    }
  }, [state.currentTool, textToolDispatch]);

  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<Point>({ x: 0, y: 0 });
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragStartPoint, setDragStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [elementDragOffsets, setElementDragOffsets] = useState<
    Record<string, Point>
  >({});

  const [isAddingText, setIsAddingText] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState<Point>({
    x: 0,
    y: 0,
  });
  const [textInputValue, setTextInputValue] = useState("");

  // Camera tracking state
  const [cameraVelocity, setCameraVelocity] = useState({
    x: 0,
    y: 0,
    scale: 0,
  });
  const [lastDrawPosition, setLastDrawPosition] = useState<Point | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // Set canvas ref in animation context
  useEffect(() => {
    if (canvasRef.current) {
      animationDispatch({ type: "SET_CANVAS_REF", canvasRef });
    }
  }, [canvasRef, animationDispatch]);

  // Update page size on window resize and observe container size changes
  useEffect(() => {
    const handleResize = () => {
      canvasDispatch({
        type: "SET_PAGE_SIZE",
        size: { width: window.innerWidth, height: window.innerHeight },
      });
      // Force canvas resize
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const rect = container.getBoundingClientRect();
        const width = rect.width || window.innerWidth;
        const height = rect.height || window.innerHeight - 100;
        canvas.width = width;
        canvas.height = Math.max(height, 400);
      }
    };

    // Create ResizeObserver to watch container size changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const canvas = canvasRef.current;
        if (canvas && height > 0) {
          canvas.width = width;
          canvas.height = height;
          // Force re-render by updating a state or calling render directly
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      }
    });

    const container = containerRef.current;
    if (container) {
      resizeObserver.observe(container);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, [canvasDispatch]);

  const screenToWorld = useCallback(
    (screenPoint: Point): Point => {
      const { viewTransform } = state;
      if (canvasSettings.canvasMode === "page") {
        // In page mode, restrict to page bounds
        return {
          x: Math.max(
            0,
            Math.min(
              canvasSettings.pageSize.width,
              (screenPoint.x - viewTransform.x) / viewTransform.scale,
            ),
          ),
          y: Math.max(
            0,
            Math.min(
              canvasSettings.pageSize.height,
              (screenPoint.y - viewTransform.y) / viewTransform.scale,
            ),
          ),
        };
      }
      return {
        x: (screenPoint.x - viewTransform.x) / viewTransform.scale,
        y: (screenPoint.y - viewTransform.y) / viewTransform.scale,
      };
    },
    [state.viewTransform, canvasSettings.canvasMode, canvasSettings.pageSize],
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

  // Automatic camera tracking
  const updateCameraTracking = useCallback(
    (drawingPosition: Point) => {
      if (canvasSettings.cameraTrackingMode !== "automatic") return;

      const currentTime = Date.now();
      const deltaTime = (currentTime - lastUpdateTime) / 1000;
      setLastUpdateTime(currentTime);

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Calculate target camera position to center on drawing
      const targetX =
        canvas.width / 2 - drawingPosition.x * state.viewTransform.scale;
      const targetY =
        canvas.height / 2 - drawingPosition.y * state.viewTransform.scale;

      // Smooth camera movement
      const smoothTime = (1 - canvasSettings.autoTrackingSmoothing) * 2 + 0.1;

      const newX = smoothDamp(
        state.viewTransform.x,
        targetX,
        cameraVelocity.x,
        smoothTime,
        deltaTime,
      );
      const newY = smoothDamp(
        state.viewTransform.y,
        targetY,
        cameraVelocity.y,
        smoothTime,
        deltaTime,
      );

      setCameraVelocity({
        x: newX.velocity,
        y: newY.velocity,
        scale: cameraVelocity.scale,
      });

      dispatch({
        type: "SET_VIEW_TRANSFORM",
        transform: {
          ...state.viewTransform,
          x: newX.value,
          y: newY.value,
        },
      });

      canvasDispatch({
        type: "SET_CAMERA_POSITION",
        position: {
          x: newX.value,
          y: newY.value,
          scale: state.viewTransform.scale,
        },
      });
    },
    [
      canvasSettings,
      state.viewTransform,
      dispatch,
      canvasDispatch,
      lastUpdateTime,
      cameraVelocity,
    ],
  );

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { viewTransform } = state;

      if (canvasSettings.canvasMode === "page") {
        // Draw page boundary
        ctx.save();
        ctx.strokeStyle =
          getComputedStyle(document.documentElement)
            .getPropertyValue("--canvas-grid")
            .trim() || "#ccc";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);

        const pageScreenPos = worldToScreen({ x: 0, y: 0 });
        const pageWidth = canvasSettings.pageSize.width * viewTransform.scale;
        const pageHeight = canvasSettings.pageSize.height * viewTransform.scale;

        ctx.strokeRect(pageScreenPos.x, pageScreenPos.y, pageWidth, pageHeight);
        ctx.setLineDash([]);

        // Draw ruled lines if enabled
        if (canvasSettings.showRuledLines) {
          ctx.strokeStyle = canvasSettings.ruledLineColor || "#d1d5db";
          ctx.lineWidth = 1;

          const ruledSpacing =
            canvasSettings.ruledLineSpacing * viewTransform.scale;
          const startY = pageScreenPos.y + ruledSpacing;

          for (
            let y = startY;
            y < pageScreenPos.y + pageHeight;
            y += ruledSpacing
          ) {
            ctx.beginPath();
            ctx.moveTo(pageScreenPos.x, y);
            ctx.lineTo(pageScreenPos.x + pageWidth, y);
            ctx.stroke();
          }
        }

        // Draw margin if enabled
        if (canvasSettings.showMargins) {
          ctx.strokeStyle = canvasSettings.marginColor || "#d1d5db";
          ctx.lineWidth = 2;

          // Set line dash pattern based on style
          switch (canvasSettings.marginStyle) {
            case "solid":
              ctx.setLineDash([]);
              break;
            case "dashed":
              ctx.setLineDash([5, 5]);
              break;
            case "dotted":
              ctx.setLineDash([2, 2]);
              break;
            default:
              ctx.setLineDash([5, 5]);
          }

          const marginX =
            pageScreenPos.x + (pageWidth * canvasSettings.marginPosition) / 100;
          ctx.beginPath();
          ctx.moveTo(marginX, pageScreenPos.y);
          ctx.lineTo(marginX, pageScreenPos.y + pageHeight);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore();
        return;
      }

      // Draw infinite grid only if enabled
      if (canvasSettings.showGrid) {
        const gridSize = canvasSettings.gridSize * viewTransform.scale;
        if (gridSize >= 5) {
          // Only draw if grid is large enough to be visible
          ctx.save();
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
          ctx.restore();
        }
      }

      // Draw infinite ruled lines only if enabled
      if (canvasSettings.showRuledLines) {
        const ruledSpacing =
          canvasSettings.ruledLineSpacing * viewTransform.scale;
        if (ruledSpacing >= 3) {
          // Only draw if spacing is large enough to be visible
          ctx.save();
          ctx.strokeStyle = canvasSettings.ruledLineColor || "#d1d5db";
          ctx.lineWidth = 1;

          const startY = -viewTransform.y % ruledSpacing;

          ctx.beginPath();
          for (let y = startY; y < canvas.height; y += ruledSpacing) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
          }
          ctx.stroke();
          ctx.restore();
        }
      }
    },
    [state.viewTransform, canvasSettings, worldToScreen],
  );

  const handleTextComplete = useCallback(
    (text: string, position?: { x: number; y: number }) => {
      if (text.trim()) {
        // Use provided position or fall back to textInputPosition
        const screenPos = position || textInputPosition;

        // Convert screen position to world coordinates
        const canvasRect = containerRef.current?.getBoundingClientRect();
        if (canvasRect) {
          const worldPos = {
            x:
              (screenPos.x - state.viewTransform.x) / state.viewTransform.scale,
            y:
              (screenPos.y - state.viewTransform.y) / state.viewTransform.scale,
          };

          // Get effective text color from TextTool context
          const effectiveTextColor = textToolState.useAutomaticColor
            ? state.brushColor
            : textToolState.textColor;

          const textElement = {
            id: `element-${Date.now()}`,
            type: "text" as const,
            x: worldPos.x,
            y: worldPos.y,
            text: text.trim(),
            width: text.length * textToolState.fontSize * 0.6, // Estimated width
            height: textToolState.fontSize * 1.2, // Estimated height
            style: {
              stroke: effectiveTextColor,
              strokeWidth: state.brushSize,
              fontSize: textToolState.fontSize / state.viewTransform.scale, // Convert to world coordinates
              fontFamily: textToolState.fontFamily,
              fill: effectiveTextColor,
            },
            layerId: state.activeLayerId,
            timestamp: Date.now(),
          };

          dispatch({ type: "ADD_ELEMENT", element: textElement });
        }
      }

      // Reset text input states
      setIsAddingText(false);
      setTextInputValue("");
      textToolDispatch({ type: "COMPLETE_TEXT_INPUT" });
    },
    [
      textInputPosition,
      state.viewTransform,
      state.brushColor,
      state.brushSize,
      state.activeLayerId,
      textToolState.useAutomaticColor,
      textToolState.textColor,
      textToolState.fontSize,
      textToolState.fontFamily,
      textToolDispatch,
      dispatch,
    ],
  );

  const handleTextCancel = useCallback(() => {
    setIsAddingText(false);
    setTextInputValue("");
    textToolDispatch({ type: "CANCEL_TEXT_INPUT" });
  }, [textToolDispatch]);

  const drawElement = useCallback(
    (ctx: CanvasRenderingContext2D, element: any) => {
      const { viewTransform } = state;
      const canvas = canvasRef.current;
      if (!canvas) return;

      ctx.save();
      ctx.scale(viewTransform.scale, viewTransform.scale);
      ctx.translate(
        viewTransform.x / viewTransform.scale,
        viewTransform.y / viewTransform.scale,
      );

      // Use completely smooth rendering for pencil/path/highlighter, Rough.js for shapes
      if (element.type === "path" || element.type === "highlighter") {
        if (element.points && element.points.length > 1) {
          // Use completely smooth, clean stroke rendering for pencil and highlighter
          ctx.strokeStyle = element.style.stroke;
          ctx.lineWidth = element.style.strokeWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          // Set opacity and blend mode for highlighter
          if (element.type === "highlighter") {
            ctx.globalAlpha = element.opacity || 0.3;
            ctx.globalCompositeOperation = "multiply"; // Highlighter blend mode
          }

          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);

          if (element.points.length === 2) {
            ctx.lineTo(element.points[1].x, element.points[1].y);
          } else {
            // Use quadratic curves for super smooth lines
            for (let i = 1; i < element.points.length - 1; i++) {
              const midX = (element.points[i].x + element.points[i + 1].x) / 2;
              const midY = (element.points[i].y + element.points[i + 1].y) / 2;
              ctx.quadraticCurveTo(
                element.points[i].x,
                element.points[i].y,
                midX,
                midY,
              );
            }
            // Final point
            const lastPoint = element.points[element.points.length - 1];
            const secondLastPoint = element.points[element.points.length - 2];
            ctx.quadraticCurveTo(
              secondLastPoint.x,
              secondLastPoint.y,
              lastPoint.x,
              lastPoint.y,
            );
          }

          ctx.stroke();

          // Reset opacity and composite operation
          if (element.type === "highlighter") {
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
          }
        }
      } else {
        // Use Rough.js for all shapes (rectangle, ellipse, diamond, line, arrow, text)
        renderRoughElement(canvas, ctx, element, state.backgroundPattern, {
          roughness: getRoughnessFromSloppiness(state.sloppiness),
          bowing: getBowingFromSloppiness(state.sloppiness),
        });
      }

      ctx.restore();
    },
    [state.viewTransform, state.sloppiness],
  );

  // Draw camera path for manual mode
  const drawCameraPath = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (
        canvasSettings.cameraTrackingMode !== "manual" ||
        !canvasSettings.cameraPath
      )
        return;

      const { keyframes } = canvasSettings.cameraPath;
      if (keyframes.length < 2) return;

      ctx.save();
      ctx.strokeStyle = "#ff6b6b";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);

      // Draw path line
      ctx.beginPath();
      const firstFrame = worldToScreen({
        x: keyframes[0].x,
        y: keyframes[0].y,
      });
      ctx.moveTo(firstFrame.x, firstFrame.y);

      for (let i = 1; i < keyframes.length; i++) {
        const frame = worldToScreen({ x: keyframes[i].x, y: keyframes[i].y });
        ctx.lineTo(frame.x, frame.y);
      }
      ctx.stroke();

      // Draw keyframe nodes
      ctx.setLineDash([]);
      ctx.fillStyle = "#ff6b6b";
      keyframes.forEach((keyframe, index) => {
        const screenPos = worldToScreen({ x: keyframe.x, y: keyframe.y });
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, 8, 0, 2 * Math.PI);
        ctx.fill();

        // Draw timestamp
        ctx.fillStyle = "#fff";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${keyframe.timestamp}s`, screenPos.x, screenPos.y + 4);
        ctx.fillStyle = "#ff6b6b";
      });

      ctx.restore();
    },
    [canvasSettings, worldToScreen],
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    // Ensure proper canvas sizing
    const width = rect.width || window.innerWidth;
    const height = rect.height || window.innerHeight - 100; // Account for toolbars

    // Canvas sizing logic

    canvas.width = width;
    canvas.height = Math.max(height, 400); // Minimum 400px height

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid or page boundary
    drawGrid(ctx);

    // Draw all elements - NO ANIMATION ON MAIN CANVAS
    // Filter elements based on canvas mode
    const elementsToRender =
      canvasSettings.canvasMode === "page"
        ? pageMode.getCurrentPage()?.elements || []
        : state.elements;

    elementsToRender.forEach((element) => {
      const layer = state.layers.find((l) => l.id === element.layerId);
      if (layer?.visible) {
        drawElement(ctx, element);
      }
    });

    // This is moved above to handle drawing elements properly

    // Draw current element being drawn (for all tools except pencil which is handled below)
    if (
      state.currentElement &&
      state.isDrawing &&
      state.currentTool !== "pencil"
    ) {
      drawElement(ctx, state.currentElement);
    }

    // Draw live pencil/highlighter/eraser path with super smooth rendering
    if (
      (state.currentTool === "pencil" ||
        state.currentTool === "highlighter" ||
        (state.currentTool === "eraser" && state.eraserMode === "normal")) &&
      currentPath.length > 1
    ) {
      const { viewTransform } = state;
      ctx.save();
      ctx.scale(viewTransform.scale, viewTransform.scale);
      ctx.translate(
        viewTransform.x / viewTransform.scale,
        viewTransform.y / viewTransform.scale,
      );

      // Super smooth live drawing
      if (state.currentTool === "highlighter") {
        ctx.strokeStyle = state.highlighterColor;
        ctx.lineWidth = state.brushSize * 3; // Highlighter is wider
        ctx.globalAlpha = state.highlighterOpacity;
        ctx.globalCompositeOperation = "multiply"; // Highlighter blend mode
      } else if (
        state.currentTool === "eraser" &&
        state.eraserMode === "normal"
      ) {
        ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
        ctx.lineWidth = state.eraserSize;
        ctx.globalAlpha = 0.5;
      } else {
        ctx.strokeStyle = state.brushColor;
        // Use the current element's stroke width if available (for pressure-sensitive drawing)
        ctx.lineWidth =
          state.currentElement?.style?.strokeWidth || state.brushSize;
      }

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);

      if (currentPath.length === 2) {
        ctx.lineTo(currentPath[1].x, currentPath[1].y);
      } else {
        // Use quadratic curves for super smooth live drawing
        for (let i = 1; i < currentPath.length - 1; i++) {
          const midX = (currentPath[i].x + currentPath[i + 1].x) / 2;
          const midY = (currentPath[i].y + currentPath[i + 1].y) / 2;
          ctx.quadraticCurveTo(currentPath[i].x, currentPath[i].y, midX, midY);
        }
        // Final point
        if (currentPath.length > 2) {
          const lastPoint = currentPath[currentPath.length - 1];
          const secondLastPoint = currentPath[currentPath.length - 2];
          ctx.quadraticCurveTo(
            secondLastPoint.x,
            secondLastPoint.y,
            lastPoint.x,
            lastPoint.y,
          );
        }
      }

      ctx.stroke();

      // Reset alpha and composite operation
      if (
        state.currentTool === "highlighter" ||
        (state.currentTool === "eraser" && state.eraserMode === "normal")
      ) {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over"; // Reset to default
      }

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
        const selectedElementsData = elementsToRender.filter((el) =>
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
      } else {
        // Normal selection: draw individual boxes for each element
        state.selectedElements.forEach((elementId) => {
          const element = elementsToRender.find((el) => el.id === elementId);
          if (element) {
            let screenPos, width, height;

            if (element.type === "text") {
              // Special handling for text elements
              const fontSize = element.style.fontSize || 16;
              const textWidth =
                element.width || (element.text || "").length * fontSize * 0.6;
              const textHeight = element.height || fontSize * 1.2;
              screenPos = worldToScreen({ x: element.x, y: element.y });
              width = textWidth * state.viewTransform.scale;
              height = textHeight * state.viewTransform.scale;
            } else if (element.points && element.points.length > 0) {
              // For path elements, calculate bounding box from points
              let minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity;
              element.points.forEach((point) => {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
              });
              screenPos = worldToScreen({ x: minX, y: minY });
              const bottomRight = worldToScreen({ x: maxX, y: maxY });
              width = bottomRight.x - screenPos.x;
              height = bottomRight.y - screenPos.y;
            } else {
              screenPos = worldToScreen({ x: element.x, y: element.y });
              width = (element.width || 100) * state.viewTransform.scale;
              height = (element.height || 100) * state.viewTransform.scale;
            }

            ctx.strokeRect(
              screenPos.x - 5,
              screenPos.y - 5,
              width + 10,
              height + 10,
            );
          }
        });
      }

      ctx.setLineDash([]);
    }

    // Draw camera path
    drawCameraPath(ctx);
  }, [
    state,
    drawGrid,
    drawElement,
    worldToScreen,
    currentPath,
    drawCameraPath,
  ]);

  useEffect(() => {
    render();
  }, [render]);

  // Initialize canvas on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const rect = container.getBoundingClientRect();
        const width = rect.width || window.innerWidth;
        const height = rect.height || window.innerHeight - 100;
        canvas.width = width;
        canvas.height = Math.max(height, 400);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const getEventPoint = useCallback((event: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  const getTouchPoint = useCallback(
    (
      event: React.TouchEvent,
    ): Point & { pressure?: number; pointerType?: string } => {
      const canvas = canvasRef.current;
      if (!canvas || event.touches.length === 0)
        return { x: 0, y: 0, pressure: 1.0, pointerType: "touch" };

      const rect = canvas.getBoundingClientRect();
      const touch = event.touches[0];

      // Get pressure for Apple Pencil support (if available)
      // Type assertion is safe here as we're providing fallback values
      const touchWithForce = touch as Touch & {
        force?: number;
        pressure?: number;
        touchType?: string;
      };
      const pressure = touchWithForce.force || touchWithForce.pressure || 1.0;
      const touchType = touchWithForce.touchType || "direct";

      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
        pressure: Math.max(0.1, Math.min(1.0, pressure)), // Clamp pressure between 0.1 and 1.0
        pointerType: touchType === "stylus" ? "pen" : "touch",
      };
    },
    [],
  );

  // Enhanced pointer event handling for Apple Pencil and other stylus devices
  const getPointerPoint = useCallback(
    (
      event: React.PointerEvent,
    ): Point & { pressure?: number; pointerType?: string } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0, pressure: 1.0, pointerType: "mouse" };

      const rect = canvas.getBoundingClientRect();

      // Use native pressure and pointerType from PointerEvent
      const pressure = event.pressure || 1.0;

      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        pressure: Math.max(0.1, Math.min(1.0, pressure)),
        pointerType: event.pointerType,
      };
    },
    [],
  );

  const getUnifiedPoint = useCallback(
    (
      event: React.MouseEvent | React.TouchEvent | React.PointerEvent,
    ): Point => {
      if ("pointerId" in event) {
        return getPointerPoint(event);
      } else if ("touches" in event) {
        return getTouchPoint(event);
      }
      return getEventPoint(event);
    },
    [getEventPoint, getTouchPoint, getPointerPoint],
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      const point = getEventPoint(event);
      const worldPoint = screenToWorld(point);

      if (
        event.button === 1 ||
        (event.button === 0 && event.altKey) ||
        state.currentTool === "hand"
      ) {
        setIsPanning(true);
        setLastPanPoint(point);
        return;
      }

      // Handle camera path creation in manual mode
      if (
        canvasSettings.cameraTrackingMode === "manual" &&
        canvasSettings.isCreatingCameraPath &&
        event.ctrlKey
      ) {
        const timestamp = parseFloat(
          prompt("Enter timestamp (seconds):") || "0",
        );
        const keyframe = {
          id: `keyframe-${Date.now()}`,
          timestamp,
          x: worldPoint.x,
          y: worldPoint.y,
          scale: state.viewTransform.scale,
        };
        canvasDispatch({ type: "ADD_CAMERA_KEYFRAME", keyframe });
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
          setLastDrawPosition(worldPoint);
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
              strokeWidth: state.brushSize * 3, // Highlighter is wider
            },
            opacity: state.highlighterOpacity,
            layerId: state.activeLayerId,
            timestamp: Date.now(),
          };

          dispatch({ type: "START_DRAWING", element: highlighterElement });
          setCurrentPath([worldPoint]);
          setLastDrawPosition(worldPoint);
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
            fillStyle: state.backgroundPattern,
            opacity: state.lineStyle.opacity,
            layerId: state.activeLayerId,
            timestamp: Date.now(),
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
            layerId: state.activeLayerId,
            timestamp: Date.now(),
          };

          dispatch({ type: "START_DRAWING", element: lineElement });
          break;

        case "select":
          // Check if clicking on an element
          const elementsAtPoint = [];

          // Get all elements at the click point
          for (const element of state.elements) {
            const layer = state.layers.find((l) => l.id === element.layerId);
            if (!layer?.visible) continue;

            let isHit = false;

            if (element.type === "path" || element.type === "highlighter") {
              if (element.points) {
                const tolerance = 5 / state.viewTransform.scale;
                for (let i = 0; i < element.points.length - 1; i++) {
                  const p1 = element.points[i];
                  const p2 = element.points[i + 1];
                  const distance = distanceToLineSegment(worldPoint, p1, p2);
                  if (distance <= tolerance) {
                    isHit = true;
                    break;
                  }
                }
              }
            } else if (element.type === "line" || element.type === "arrow") {
              if (element.points && element.points.length >= 2) {
                const tolerance = 5 / state.viewTransform.scale;
                const distance = distanceToLineSegment(
                  worldPoint,
                  element.points[0],
                  element.points[1],
                );
                isHit = distance <= tolerance;
              }
            } else {
              isHit =
                worldPoint.x >= element.x &&
                worldPoint.x <= element.x + (element.width || 100) &&
                worldPoint.y >= element.y &&
                worldPoint.y <= element.y + (element.height || 100);
            }

            if (isHit) {
              elementsAtPoint.push(element);
            }
          }

          let selectedElementIds = [];

          if (elementsAtPoint.length > 0) {
            if (state.deepSelect) {
              // Deep select - select all elements at point
              selectedElementIds = elementsAtPoint.map((el) => el.id);
            } else {
              // Normal select - select only the top-most element (last in array)
              selectedElementIds = [
                elementsAtPoint[elementsAtPoint.length - 1].id,
              ];
            }

            if (event.ctrlKey || event.metaKey) {
              // Toggle selection
              const newSelection = [...state.selectedElements];
              selectedElementIds.forEach((id) => {
                const index = newSelection.indexOf(id);
                if (index >= 0) {
                  newSelection.splice(index, 1);
                } else {
                  newSelection.push(id);
                }
              });
              dispatch({ type: "SELECT_ELEMENTS", elementIds: newSelection });
            } else {
              // Replace selection
              dispatch({
                type: "SELECT_ELEMENTS",
                elementIds: selectedElementIds,
              });
              setIsDraggingElement(true);
              setDragStartPoint(worldPoint);
            }
          } else {
            dispatch({ type: "SELECT_ELEMENTS", elementIds: [] });
          }
          break;

        case "eraser":
          if (state.eraserMode === "element") {
            // Element eraser - click to delete entire element
            const clickedElement = state.elements.find((element) => {
              const layer = state.layers.find((l) => l.id === element.layerId);
              if (!layer?.visible) return false;

              if (element.type === "path" || element.type === "highlighter") {
                const tolerance =
                  Math.max(5, element.style.strokeWidth * 2) /
                  state.viewTransform.scale;
                if (element.points && element.points.length > 1) {
                  return element.points.some((point) => {
                    const distance = Math.sqrt(
                      Math.pow(point.x - worldPoint.x, 2) +
                        Math.pow(point.y - worldPoint.y, 2),
                    );
                    return distance <= tolerance;
                  });
                }
                return false;
              } else if (element.type === "line" || element.type === "arrow") {
                if (element.points && element.points.length >= 2) {
                  const tolerance =
                    Math.max(5, element.style.strokeWidth * 2) /
                    state.viewTransform.scale;
                  const distance = distanceToLineSegment(
                    worldPoint,
                    element.points[0],
                    element.points[1],
                  );
                  return distance <= tolerance;
                }
                return false;
              } else if (element.type === "text") {
                // For text, check if click is within text bounds
                const fontSize = element.style.fontSize || 16;
                const textWidth = (element.text || "").length * fontSize * 0.6;
                return (
                  worldPoint.x >= element.x &&
                  worldPoint.x <= element.x + textWidth &&
                  worldPoint.y >= element.y - fontSize &&
                  worldPoint.y <= element.y + fontSize * 0.3
                );
              } else {
                // For shapes (rectangle, ellipse, diamond)
                return (
                  worldPoint.x >= element.x &&
                  worldPoint.x <= element.x + (element.width || 100) &&
                  worldPoint.y >= element.y &&
                  worldPoint.y <= element.y + (element.height || 100)
                );
              }
            });

            if (clickedElement) {
              // Use proper dispatch to delete element
              dispatch({
                type: "SELECT_ELEMENTS",
                elementIds: [clickedElement.id],
              });
              dispatch({ type: "DELETE_SELECTED" });
            }
          } else {
            // Normal eraser - start erasing path
            const eraserElement = {
              id: `eraser-${Date.now()}`,
              type: "eraser" as const,
              x: worldPoint.x,
              y: worldPoint.y,
              points: [worldPoint],
              style: {
                stroke: "rgba(255, 0, 0, 0.5)",
                strokeWidth: state.eraserSize,
              },
              layerId: state.activeLayerId,
              timestamp: Date.now(),
            };

            dispatch({ type: "START_DRAWING", element: eraserElement });
            setCurrentPath([worldPoint]);
          }
          break;

        case "text":
          // Handle text input based on mode
          const canvasRect = containerRef.current?.getBoundingClientRect();
          if (canvasRect) {
            const screenPos = {
              x:
                worldPoint.x * state.viewTransform.scale +
                state.viewTransform.x -
                canvasRect.left,
              y:
                worldPoint.y * state.viewTransform.scale +
                state.viewTransform.y -
                canvasRect.top,
            };

            // Set input box position for stylus mode
            textToolDispatch({
              type: "SET_INPUT_BOX_POSITION",
              position: screenPos,
            });
            textToolDispatch({ type: "SET_INPUT_BOX_VISIBLE", visible: true });

            setTextInputPosition(screenPos);
            setIsAddingText(true);
          }
          break;
      }
    },
    [
      getEventPoint,
      screenToWorld,
      state,
      dispatch,
      canvasSettings,
      canvasDispatch,
      textToolState.inputMode,
      textToolDispatch,
    ],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      const point = getEventPoint(event);
      const worldPoint = screenToWorld(point);

      if (isPanning) {
        const deltaX = point.x - lastPanPoint.x;
        const deltaY = point.y - lastPanPoint.y;

        let newX = state.viewTransform.x + deltaX;
        let newY = state.viewTransform.y + deltaY;

        // Restrict panning in page mode
        if (canvasSettings.canvasMode === "page") {
          const canvas = canvasRef.current;
          if (canvas) {
            const maxX = 0;
            const minX =
              canvas.width -
              canvasSettings.pageSize.width * state.viewTransform.scale;
            const maxY = 0;
            const minY =
              canvas.height -
              canvasSettings.pageSize.height * state.viewTransform.scale;

            newX = Math.max(minX, Math.min(maxX, newX));
            newY = Math.max(minY, Math.min(maxY, newY));
          }
        }

        dispatch({
          type: "SET_VIEW_TRANSFORM",
          transform: {
            ...state.viewTransform,
            x: newX,
            y: newY,
          },
        });

        setLastPanPoint(point);
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
            setLastDrawPosition(worldPoint);
            updateCameraTracking(worldPoint);
            break;

          case "eraser":
            if (state.eraserMode === "normal" && state.currentElement) {
              const eraserPath = [...currentPath, worldPoint];
              setCurrentPath(eraserPath);

              // Erase elements that intersect with eraser path
              // Use current element's stroke width for pressure-sensitive erasing
              const eraserRadius =
                (state.currentElement?.style?.strokeWidth || state.eraserSize) /
                2;
              let elementsChanged = false;

              const elementsToKeep = state.elements.filter((element) => {
                const layer = state.layers.find(
                  (l) => l.id === element.layerId,
                );
                if (!layer?.visible || layer.locked) return true;

                if (element.type === "path" || element.type === "highlighter") {
                  if (!element.points || element.points.length === 0)
                    return true;

                  // Check if any part of the stroke intersects with eraser
                  const hasIntersection = element.points.some((point) => {
                    return eraserPath.some((eraserPoint) => {
                      const distance = Math.sqrt(
                        Math.pow(point.x - eraserPoint.x, 2) +
                          Math.pow(point.y - eraserPoint.y, 2),
                      );
                      return distance <= eraserRadius;
                    });
                  });

                  if (hasIntersection) {
                    elementsChanged = true;
                    return false;
                  }
                  return true;
                } else if (element.type === "text") {
                  // For text, check if eraser intersects with text bounds
                  const fontSize = element.style.fontSize || 16;
                  const textWidth =
                    (element.text || "").length * fontSize * 0.6;
                  const textBounds = {
                    x: element.x,
                    y: element.y - fontSize,
                    width: textWidth,
                    height: fontSize * 1.3,
                  };

                  const hasIntersection = eraserPath.some((eraserPoint) => {
                    return (
                      eraserPoint.x >= textBounds.x - eraserRadius &&
                      eraserPoint.x <=
                        textBounds.x + textBounds.width + eraserRadius &&
                      eraserPoint.y >= textBounds.y - eraserRadius &&
                      eraserPoint.y <=
                        textBounds.y + textBounds.height + eraserRadius
                    );
                  });

                  if (hasIntersection) {
                    elementsChanged = true;
                    return false;
                  }
                  return true;
                } else {
                  // For shapes, check if eraser intersects with shape bounds
                  const elementBounds = {
                    x: element.x,
                    y: element.y,
                    width: element.width || 100,
                    height: element.height || 100,
                  };

                  const hasIntersection = eraserPath.some((eraserPoint) => {
                    return (
                      eraserPoint.x >= elementBounds.x - eraserRadius &&
                      eraserPoint.x <=
                        elementBounds.x + elementBounds.width + eraserRadius &&
                      eraserPoint.y >= elementBounds.y - eraserRadius &&
                      eraserPoint.y <=
                        elementBounds.y + elementBounds.height + eraserRadius
                    );
                  });

                  if (hasIntersection) {
                    elementsChanged = true;
                    return false;
                  }
                  return true;
                }
              });

              // Update elements only if something was erased
              if (
                elementsChanged &&
                elementsToKeep.length !== state.elements.length
              ) {
                dispatch({
                  type: "LOAD_PROJECT",
                  elements: elementsToKeep,
                  layers: state.layers,
                });
              }
            }
            break;

          case "rectangle":
          case "ellipse":
          case "diamond":
            const startX = state.currentElement.x;
            const startY = state.currentElement.y;
            const width = worldPoint.x - startX;
            const height = worldPoint.y - startY;

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
            const updatedElement = {
              ...state.currentElement,
              points: [state.currentElement.points![0], worldPoint],
            };

            // Update control points if there are any
            if (state.lineNodes > 0 && state.currentElement.points) {
              updatedElement.controlPoints = generateControlPoints(
                state.currentElement.points[0],
                worldPoint,
                state.lineNodes,
              );
            }

            dispatch({
              type: "START_DRAWING",
              element: updatedElement,
            });
            break;
        }
      }
    },
    [
      getEventPoint,
      screenToWorld,
      isPanning,
      lastPanPoint,
      isDraggingElement,
      dragStartPoint,
      state,
      dispatch,
      currentPath,
      canvasSettings,
      updateCameraTracking,
    ],
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDraggingElement) {
      // Save final position to history when dragging ends
      dispatch({ type: "FINISH_MOVING_ELEMENTS" });
      setIsDraggingElement(false);
      setElementDragOffsets({});
      return;
    }

    if (state.isDrawing) {
      if (
        state.currentTool === "pencil" ||
        state.currentTool === "highlighter"
      ) {
        dispatch({ type: "FINISH_DRAWING" });
        setCurrentPath([]);
        setLastDrawPosition(null);
      } else if (
        state.currentTool === "eraser" &&
        state.eraserMode === "normal"
      ) {
        // Finish erasing and save state
        dispatch({ type: "SAVE_STATE" });
        setCurrentPath([]);
      } else if (
        ["rectangle", "ellipse", "diamond", "line", "arrow"].includes(
          state.currentTool,
        )
      ) {
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

  // Unified handlers that work with both mouse and touch events
  const handlePointerDown = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      // For touch events, prevent default to avoid scrolling and double-tap zoom
      if ("touches" in event) {
        if (event.touches.length !== 1) return; // Only handle single touch
        event.preventDefault();

        // Check palm rejection for touch events
        const canvas = canvasRef.current;
        if (
          canvas &&
          palmRejection.shouldRejectTouch(event.nativeEvent, canvas)
        ) {
          return; // Reject this touch as palm input
        }
      }

      const point = getUnifiedPoint(event);
      const worldPoint = screenToWorld(point);

      // Check if current page is locked (only for page mode)
      if (canvasSettings.canvasMode === "page") {
        const currentPage = pageMode.getCurrentPage();
        if (currentPage?.locked) {
          // Show a brief notification that the page is locked
          console.log("Cannot draw on locked page");
          return;
        }
      }

      // Track touch for palm rejection
      if ("touches" in event && event.touches.length > 0) {
        const touch = event.touches[0];
        palmRejection.onTouchStart(touch.identifier, {
          id: touch.identifier,
          x: touch.clientX,
          y: touch.clientY,
          timestamp: Date.now(),
          pointerType: (point as any).pointerType || "touch",
        });
      }

      // Check for panning gesture (middle mouse or two-finger touch or alt+click)
      const isPanGesture =
        ("button" in event &&
          (event.button === 1 || (event.button === 0 && event.altKey))) ||
        state.currentTool === "hand";

      if (isPanGesture) {
        setIsPanning(true);
        setLastPanPoint(point);
        return;
      }

      // Handle camera path creation in manual mode
      if (
        canvasSettings.cameraTrackingMode === "manual" &&
        canvasSettings.isCreatingCameraPath &&
        (("ctrlKey" in event && event.ctrlKey) || "touches" in event)
      ) {
        const timestamp = parseFloat(
          prompt("Enter timestamp (seconds):") || "0",
        );
        const keyframe = {
          id: `keyframe-${Date.now()}`,
          timestamp,
          x: worldPoint.x,
          y: worldPoint.y,
          scale: state.viewTransform.scale,
        };
        canvasDispatch({ type: "ADD_CAMERA_KEYFRAME", keyframe });
        return;
      }

      // Handle drawing tools - same logic as mouse handler but unified
      switch (state.currentTool) {
        case "pencil":
          const pencilPoint = getUnifiedPoint(event);
          const pressure = (pencilPoint as any).pressure || 1.0;
          const pointerType = (pencilPoint as any).pointerType || "mouse";

          // Adjust brush size based on pressure for stylus input (Apple Pencil)
          const pressureSensitiveSize =
            pointerType === "pen" || pointerType === "stylus"
              ? Math.max(1, state.brushSize * Math.max(0.2, pressure))
              : state.brushSize;

          const newElement = {
            id: `element-${Date.now()}`,
            type: "path" as const,
            x: worldPoint.x,
            y: worldPoint.y,
            points: [worldPoint],
            style: {
              stroke: state.brushColor,
              strokeWidth: pressureSensitiveSize,
            },
            strokeStyle: "solid" as const,
            opacity: 1,
            layerId: state.activeLayerId,
            timestamp: Date.now(),
          };

          dispatch({ type: "START_DRAWING", element: newElement });
          setCurrentPath([worldPoint]);
          setLastDrawPosition(worldPoint);
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
              strokeWidth: state.brushSize * 3,
            },
            opacity: state.highlighterOpacity,
            layerId: state.activeLayerId,
            timestamp: Date.now(),
          };

          dispatch({ type: "START_DRAWING", element: highlighterElement });
          setCurrentPath([worldPoint]);
          setLastDrawPosition(worldPoint);
          break;

        case "eraser":
          if (state.eraserMode === "element") {
            // Element eraser - click to delete entire element
            const clickedElement = state.elements.find((element) => {
              const layer = state.layers.find((l) => l.id === element.layerId);
              if (!layer?.visible) return false;

              if (element.type === "path" || element.type === "highlighter") {
                const tolerance =
                  Math.max(5, element.style.strokeWidth * 2) /
                  state.viewTransform.scale;
                if (element.points && element.points.length > 1) {
                  return element.points.some((point) => {
                    const distance = Math.sqrt(
                      Math.pow(point.x - worldPoint.x, 2) +
                        Math.pow(point.y - worldPoint.y, 2),
                    );
                    return distance <= tolerance;
                  });
                }
                return false;
              } else if (element.type === "text") {
                const fontSize = element.style.fontSize || 16;
                const textWidth = (element.text || "").length * fontSize * 0.6;
                return (
                  worldPoint.x >= element.x &&
                  worldPoint.x <= element.x + textWidth &&
                  worldPoint.y >= element.y - fontSize &&
                  worldPoint.y <= element.y + fontSize * 0.3
                );
              } else {
                return (
                  worldPoint.x >= element.x &&
                  worldPoint.x <= element.x + element.width &&
                  worldPoint.y >= element.y &&
                  worldPoint.y <= element.y + element.height
                );
              }
            });

            if (clickedElement) {
              dispatch({
                type: "DELETE_ELEMENT",
                elementId: clickedElement.id,
              });
            }
          } else {
            // Normal eraser - start erasing path with pressure support
            const eraserPoint = getUnifiedPoint(event);
            const pressure = (eraserPoint as any).pressure || 1.0;
            const pointerType = (eraserPoint as any).pointerType || "mouse";

            // Adjust eraser size based on pressure for Apple Pencil
            const pressureSensitiveEraserSize =
              pointerType === "pen" || pointerType === "stylus"
                ? Math.max(5, state.eraserSize * Math.max(0.3, pressure))
                : state.eraserSize;

            const eraserElement = {
              id: `eraser-${Date.now()}`,
              type: "eraser" as const,
              x: worldPoint.x,
              y: worldPoint.y,
              points: [worldPoint],
              style: {
                stroke: "rgba(255, 0, 0, 0.5)",
                strokeWidth: pressureSensitiveEraserSize,
              },
              layerId: state.activeLayerId,
              timestamp: Date.now(),
            };

            dispatch({ type: "START_DRAWING", element: eraserElement });
            setCurrentPath([worldPoint]);
          }
          break;

        case "rectangle":
        case "ellipse":
        case "diamond":
          const shapePoint = getUnifiedPoint(event);
          const shapePressure = (shapePoint as any).pressure || 1.0;
          const shapePointerType = (shapePoint as any).pointerType || "mouse";

          // Adjust stroke width based on pressure for Apple Pencil
          const pressureSensitiveStrokeWidth =
            shapePointerType === "pen" || shapePointerType === "stylus"
              ? Math.max(1, state.brushSize * Math.max(0.2, shapePressure))
              : state.brushSize;

          const shapeElement = {
            id: `element-${Date.now()}`,
            type: state.currentTool as "rectangle" | "ellipse" | "diamond",
            x: worldPoint.x,
            y: worldPoint.y,
            width: 0,
            height: 0,
            style: {
              stroke: state.brushColor,
              strokeWidth: pressureSensitiveStrokeWidth,
              fill: state.fillColor,
            },
            layerId: state.activeLayerId,
            timestamp: Date.now(),
          };

          dispatch({ type: "START_DRAWING", element: shapeElement });
          break;

        case "line":
        case "arrow":
          const linePoint = getUnifiedPoint(event);
          const linePressure = (linePoint as any).pressure || 1.0;
          const linePointerType = (linePoint as any).pointerType || "mouse";

          const pressureSensitiveLineWidth =
            linePointerType === "pen" || linePointerType === "stylus"
              ? Math.max(1, state.brushSize * Math.max(0.2, linePressure))
              : state.brushSize;

          const lineElement = {
            id: `element-${Date.now()}`,
            type: state.currentTool as "line" | "arrow",
            x: worldPoint.x,
            y: worldPoint.y,
            points: [worldPoint, worldPoint],
            style: {
              stroke: state.brushColor,
              strokeWidth: pressureSensitiveLineWidth,
            },
            layerId: state.activeLayerId,
            timestamp: Date.now(),
          };

          dispatch({ type: "START_DRAWING", element: lineElement });
          break;

        // Add other tool cases as needed...
        default:
          // Fallback to original mouse handler for complex cases
          if ("button" in event) {
            handleMouseDown(event);
          }
      }
    },
    [
      getUnifiedPoint,
      screenToWorld,
      state,
      canvasSettings,
      canvasDispatch,
      dispatch,
      handleMouseDown,
      setIsPanning,
      setLastPanPoint,
      setCurrentPath,
      setLastDrawPosition,
    ],
  );

  const handlePointerMove = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      // For touch events, prevent default scrolling
      if ("touches" in event) {
        if (event.touches.length !== 1) return;
        event.preventDefault();
      }

      const point = getUnifiedPoint(event);
      const worldPoint = screenToWorld(point);

      if (isPanning) {
        const deltaX = point.x - lastPanPoint.x;
        const deltaY = point.y - lastPanPoint.y;

        let newX = state.viewTransform.x + deltaX;
        let newY = state.viewTransform.y + deltaY;

        // Restrict panning in page mode
        if (canvasSettings.canvasMode === "page") {
          const canvas = canvasRef.current;
          if (canvas) {
            const maxX = 0;
            const minX =
              canvas.width -
              canvasSettings.pageSize.width * state.viewTransform.scale;
            const maxY = 0;
            const minY =
              canvas.height -
              canvasSettings.pageSize.height * state.viewTransform.scale;

            newX = Math.max(minX, Math.min(maxX, newX));
            newY = Math.max(minY, Math.min(maxY, newY));
          }
        }

        dispatch({
          type: "SET_VIEW_TRANSFORM",
          transform: {
            ...state.viewTransform,
            x: newX,
            y: newY,
          },
        });

        setLastPanPoint(point);
        return;
      }

      // Handle drawing for active tools
      if (state.isDrawing) {
        if (
          state.currentTool === "pencil" ||
          state.currentTool === "highlighter" ||
          (state.currentTool === "eraser" && state.eraserMode === "normal")
        ) {
          const distance = lastDrawPosition
            ? Math.sqrt(
                Math.pow(worldPoint.x - lastDrawPosition.x, 2) +
                  Math.pow(worldPoint.y - lastDrawPosition.y, 2),
              )
            : 0;

          if (distance > 2) {
            const newPath = [...currentPath, worldPoint];
            setCurrentPath(newPath);
            setLastDrawPosition(worldPoint);

            dispatch({
              type: "UPDATE_DRAWING",
              points: newPath,
            });
          }
        } else {
          // Fallback to original mouse handler for complex drawing tools
          if ("clientX" in event) {
            handleMouseMove(event);
          }
        }
      }
    },
    [
      getUnifiedPoint,
      screenToWorld,
      isPanning,
      lastPanPoint,
      state,
      canvasSettings,
      dispatch,
      canvasRef,
      currentPath,
      lastDrawPosition,
      handleMouseMove,
      setLastPanPoint,
      setCurrentPath,
      setLastDrawPosition,
    ],
  );

  const handlePointerUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDraggingElement) {
      dispatch({ type: "FINISH_MOVING_ELEMENTS" });
      setIsDraggingElement(false);
      setElementDragOffsets({});
      return;
    }

    if (state.isDrawing) {
      if (
        state.currentTool === "pencil" ||
        state.currentTool === "highlighter"
      ) {
        dispatch({ type: "FINISH_DRAWING" });
        setCurrentPath([]);
        setLastDrawPosition(null);
      } else if (
        state.currentTool === "eraser" &&
        state.eraserMode === "normal"
      ) {
        dispatch({ type: "SAVE_STATE" });
        setCurrentPath([]);
      } else if (
        ["rectangle", "ellipse", "diamond", "line", "arrow"].includes(
          state.currentTool,
        )
      ) {
        dispatch({ type: "FINISH_DRAWING" });
      }
    }
  }, [
    isPanning,
    isDraggingElement,
    state.isDrawing,
    state.currentTool,
    state.eraserMode,
    dispatch,
    setIsPanning,
    setIsDraggingElement,
    setElementDragOffsets,
    setCurrentPath,
    setLastDrawPosition,
  ]);

  // Touch-specific handlers with gesture support
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(
    null,
  );
  const [lastTouchCenter, setLastTouchCenter] = useState<Point | null>(null);
  const [lastTouchMoveTime, setLastTouchMoveTime] = useState<number>(0);

  const getTouchDistance = useCallback((touches: TouchList): number => {
    if (touches.length < 2) return 0;
    try {
      const touch1 = touches[0];
      const touch2 = touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2),
      );
      return isNaN(distance) ? 0 : distance;
    } catch (error) {
      console.warn("Error calculating touch distance:", error);
      return 0;
    }
  }, []);

  const getTouchCenter = useCallback((touches: TouchList): Point => {
    if (touches.length === 0) return { x: 0, y: 0 };
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    try {
      const touch1 = touches[0];
      const touch2 = touches[1];
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      return {
        x: isNaN(centerX) ? 0 : centerX,
        y: isNaN(centerY) ? 0 : centerY,
      };
    } catch (error) {
      console.warn("Error calculating touch center:", error);
      return { x: 0, y: 0 };
    }
  }, []);

  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (event.touches.length === 1) {
        handlePointerDown(event);
      } else if (event.touches.length === 2) {
        // Two-finger touch - prepare for pinch/pan
        event.preventDefault();
        setLastTouchDistance(getTouchDistance(event.touches));
        setLastTouchCenter(getTouchCenter(event.touches));
        setIsPanning(true);
      }
    },
    [handlePointerDown, getTouchDistance, getTouchCenter],
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      // Throttle touch move events for better performance (max 60fps)
      const now = Date.now();
      if (now - lastTouchMoveTime < 16) return; // ~60fps
      setLastTouchMoveTime(now);

      if (event.touches.length === 1) {
        handlePointerMove(event);
      } else if (event.touches.length === 2) {
        // Handle pinch-to-zoom and two-finger pan
        event.preventDefault();

        const currentDistance = getTouchDistance(event.touches);
        const currentCenter = getTouchCenter(event.touches);

        if (lastTouchDistance && lastTouchCenter) {
          // Handle zoom
          const scaleChange = currentDistance / lastTouchDistance;
          if (Math.abs(scaleChange - 1) > 0.02) {
            // Threshold to avoid jitter
            const canvas = canvasRef.current;
            if (canvas) {
              const rect = canvas.getBoundingClientRect();
              const canvasCenter = {
                x: currentCenter.x - rect.left,
                y: currentCenter.y - rect.top,
              };
              const worldPoint = screenToWorld(canvasCenter);

              let newScale = Math.max(
                0.1,
                Math.min(5, state.viewTransform.scale * scaleChange),
              );

              // Calculate new position to zoom toward touch center
              const scaleRatio = newScale / state.viewTransform.scale;
              const newX =
                canvasCenter.x -
                (canvasCenter.x - state.viewTransform.x) * scaleRatio;
              const newY =
                canvasCenter.y -
                (canvasCenter.y - state.viewTransform.y) * scaleRatio;

              dispatch({
                type: "SET_VIEW_TRANSFORM",
                transform: {
                  x: newX,
                  y: newY,
                  scale: newScale,
                },
              });
            }
          }

          // Handle two-finger pan
          const deltaX = currentCenter.x - lastTouchCenter.x;
          const deltaY = currentCenter.y - lastTouchCenter.y;

          if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
            let newX = state.viewTransform.x + deltaX;
            let newY = state.viewTransform.y + deltaY;

            // Restrict panning in page mode
            if (canvasSettings.canvasMode === "page") {
              const canvas = canvasRef.current;
              if (canvas) {
                const maxX = 0;
                const minX =
                  canvas.width -
                  canvasSettings.pageSize.width * state.viewTransform.scale;
                const maxY = 0;
                const minY =
                  canvas.height -
                  canvasSettings.pageSize.height * state.viewTransform.scale;

                newX = Math.max(minX, Math.min(maxX, newX));
                newY = Math.max(minY, Math.min(maxY, newY));
              }
            }

            dispatch({
              type: "SET_VIEW_TRANSFORM",
              transform: {
                ...state.viewTransform,
                x: newX,
                y: newY,
              },
            });
          }
        }

        setLastTouchDistance(currentDistance);
        setLastTouchCenter(currentCenter);
      }
    },
    [
      lastTouchMoveTime,
      handlePointerMove,
      getTouchDistance,
      getTouchCenter,
      lastTouchDistance,
      lastTouchCenter,
      canvasRef,
      screenToWorld,
      state.viewTransform,
      canvasSettings,
      dispatch,
    ],
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      event.preventDefault();

      if (event.touches.length === 0) {
        // All touches ended
        handlePointerUp();
        setLastTouchDistance(null);
        setLastTouchCenter(null);
        setIsPanning(false);
      } else if (event.touches.length === 1) {
        // One finger remaining - reset for single touch
        setLastTouchDistance(null);
        setLastTouchCenter(null);
        setIsPanning(false);
      }
    },
    [handlePointerUp],
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault();

      const point = getEventPoint(event);
      const worldPoint = screenToWorld(point);

      const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
      let newScale = Math.max(
        0.1,
        Math.min(5, state.viewTransform.scale * scaleFactor),
      );

      // In page mode, limit zoom out to fit page
      if (canvasSettings.canvasMode === "page") {
        const canvas = canvasRef.current;
        if (canvas) {
          const minScale =
            Math.min(
              canvas.width / canvasSettings.pageSize.width,
              canvas.height / canvasSettings.pageSize.height,
            ) * 0.8;
          newScale = Math.max(minScale, newScale);
        }
      }

      const newTransform = {
        scale: newScale,
        x: point.x - worldPoint.x * newScale,
        y: point.y - worldPoint.y * newScale,
      };

      dispatch({ type: "SET_VIEW_TRANSFORM", transform: newTransform });
    },
    [
      getEventPoint,
      screenToWorld,
      state.viewTransform,
      dispatch,
      canvasSettings,
    ],
  );

  const getCanvasStyle = () => {
    let cursor = "default";

    if (isPanning) {
      cursor = "grabbing";
    } else if (isDraggingElement) {
      cursor = "move";
    } else {
      switch (state.currentTool) {
        case "hand":
          cursor = "grab";
          break;
        case "pencil":
        case "highlighter":
          cursor = "crosshair";
          break;
        case "text":
          cursor = "text";
          break;
        case "select":
          cursor = "default";
          break;
        case "eraser":
          cursor = "crosshair";
          break;
        default:
          cursor = "crosshair";
      }
    }

    const baseStyle = { cursor } as React.CSSProperties;

    // Handle different patterns
    let backgroundImage: string | undefined;
    let backgroundSize: string | undefined;
    let backgroundPosition: string | undefined;
    let backgroundColor = currentBackground.color;

    switch (currentBackground.pattern) {
      case "dots":
        backgroundImage =
          "radial-gradient(circle, rgba(148, 163, 184, 0.4) 1px, transparent 1px)";
        backgroundSize = "20px 20px";
        break;
      case "grid":
        backgroundImage = `
          linear-gradient(rgba(148, 163, 184, 0.3) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148, 163, 184, 0.3) 1px, transparent 1px)
        `;
        backgroundSize = "20px 20px";
        break;
      case "lines":
        backgroundImage =
          "linear-gradient(90deg, rgba(148, 163, 184, 0.2) 1px, transparent 1px)";
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
        backgroundPosition = "0 0, 0 10px, 10px -10px, -10px 0px";
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
          : backgroundPosition,
    };
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative w-full"
      style={{
        ...getCanvasStyle(),
        height: "100%",
        minHeight: "400px",
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onPointerDown={(e) => {
          if (e.isPrimary) {
            // Check global stylus-only mode (both light and full block canvas touches)
            if (
              (stylusOnlyState.mode === "light" ||
                stylusOnlyState.mode === "full") &&
              e.pointerType !== "pen"
            ) {
              e.preventDefault();
              return;
            }

            // Check palm rejection for pointer events
            const canvas = canvasRef.current;
            if (
              canvas &&
              palmRejection.shouldRejectTouch(e.nativeEvent, canvas)
            ) {
              e.preventDefault();
              return;
            }

            // Track pointer for palm rejection
            palmRejection.onTouchStart(e.pointerId, {
              id: e.pointerId,
              x: e.clientX,
              y: e.clientY,
              timestamp: Date.now(),
              pointerType: e.pointerType,
            });

            // Handle stylus input
            if (e.pointerType === "pen") {
              palmRejection.onStylusStart();
            }

            handlePointerDown(e);
          }
        }}
        onPointerMove={(e) => {
          if (e.isPrimary && !palmRejection.isTouchRejected(e.pointerId)) {
            handlePointerMove(e);
          }
        }}
        onPointerUp={(e) => {
          if (e.isPrimary) {
            palmRejection.onTouchEnd(e.pointerId);
            handlePointerUp();
          }
        }}
        onPointerCancel={(e) => {
          if (e.isPrimary) {
            palmRejection.onTouchEnd(e.pointerId);
            handlePointerUp();
          }
        }}
        onTouchStart={(e) => {
          // Check global stylus-only mode (both light and full block canvas touches)
          if (
            stylusOnlyState.mode === "light" ||
            stylusOnlyState.mode === "full"
          ) {
            e.preventDefault();
            return;
          }

          // Check palm rejection for touch events
          const canvas = canvasRef.current;
          if (
            canvas &&
            palmRejection.shouldRejectTouch(e.nativeEvent, canvas)
          ) {
            e.preventDefault();
            return;
          }
          handleTouchStart(e);
        }}
        onTouchMove={(e) => {
          // Check global stylus-only mode (both light and full block canvas touches)
          if (
            stylusOnlyState.mode === "light" ||
            stylusOnlyState.mode === "full"
          ) {
            e.preventDefault();
            return;
          }

          // Check if any touches should be rejected
          const canvas = canvasRef.current;
          if (
            canvas &&
            palmRejection.shouldRejectTouch(e.nativeEvent, canvas)
          ) {
            e.preventDefault();
            return;
          }
          handleTouchMove(e);
        }}
        onTouchEnd={(e) => {
          // Clean up touch tracking
          for (let i = 0; i < e.changedTouches.length; i++) {
            palmRejection.onTouchEnd(e.changedTouches[i].identifier);
          }
          handleTouchEnd(e);
        }}
        onTouchCancel={(e) => {
          // Clean up touch tracking
          for (let i = 0; i < e.changedTouches.length; i++) {
            palmRejection.onTouchEnd(e.changedTouches[i].identifier);
          }
          handleTouchEnd(e);
        }}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          touchAction: "none",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
        }}
      />

      {/* Origin Box Overlay for infinite canvas */}
      <OriginBoxOverlay />

      {/* Virtual Pages Overlay for infinite canvas */}
      <VirtualPagesOverlay />

      {/* Recording is now automatic - no indicator needed */}

      {/* Canvas Mode Indicator */}
      {isUIVisible && (
        <div className="absolute top-4 left-4 bg-black/10 backdrop-blur-sm text-foreground px-3 py-2 rounded-full shadow-lg">
          <span className="text-sm font-medium">
            {canvasSettings.canvasMode === "infinite"
              ? "∞ Infinite Canvas"
              : "📄 Page Mode"}
          </span>
        </div>
      )}

      {/* Camera Tracking Indicator */}
      {isUIVisible && canvasSettings.cameraTrackingMode !== "off" && (
        <div
          className={cn(
            "absolute top-16 left-4 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg transition-all",
            canvasSettings.cameraTrackingMode === "automatic"
              ? "bg-green-500/20 text-green-700 animate-pulse"
              : canvasSettings.cameraTrackingMode === "manual" &&
                  isAnimatingCamera
                ? "bg-purple-500/20 text-purple-700"
                : "bg-blue-500/20 text-blue-700",
          )}
        >
          <span className="text-sm font-medium">
            📹 Camera: {canvasSettings.cameraTrackingMode}
            {canvasSettings.cameraTrackingMode === "automatic" && " (Active)"}
            {canvasSettings.cameraTrackingMode === "manual" &&
              isAnimatingCamera &&
              " (Following Path)"}
            {canvasSettings.cameraTrackingMode === "manual" &&
              canvasSettings.isCreatingCameraPath &&
              " (Ctrl+Click to add keyframe)"}
          </span>
        </div>
      )}

      {/* Stylus Text Input */}
      {state.currentTool === "text" && (
        <StylusTextInput
          onComplete={handleTextComplete}
          onCancel={handleTextCancel}
        />
      )}

      {/* Selection Overlay */}
      <SelectionOverlay />

      {/* Paste Buttons */}
      <PasteButtons />

      {/* Go Back to Content Button */}
      <GoBackToContentButton />
    </div>
  );
}
