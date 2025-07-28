import React, { useState, useRef, useCallback } from "react";
import { useDrawing } from "../../contexts/DrawingContext";

interface ResizeHandle {
  id: string;
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top" | "bottom" | "left" | "right";
  cursor: string;
}

const RESIZE_HANDLES: ResizeHandle[] = [
  { id: "tl", position: "top-left", cursor: "nw-resize" },
  { id: "tr", position: "top-right", cursor: "ne-resize" },
  { id: "bl", position: "bottom-left", cursor: "sw-resize" },
  { id: "br", position: "bottom-right", cursor: "se-resize" },
  { id: "t", position: "top", cursor: "n-resize" },
  { id: "b", position: "bottom", cursor: "s-resize" },
  { id: "l", position: "left", cursor: "w-resize" },
  { id: "r", position: "right", cursor: "e-resize" },
];

export function SelectionOverlay() {
  const { state, dispatch } = useDrawing();
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [startBounds, setStartBounds] = useState<any>(null);
  const [startMousePos, setStartMousePos] = useState({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Calculate combined bounds of all selected elements
  const getSelectionBounds = useCallback(() => {
    if (state.selectedElements.length === 0) return null;

    const selectedElementsData = state.elements.filter((el) =>
      state.selectedElements.includes(el.id),
    );

    if (selectedElementsData.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    selectedElementsData.forEach((element) => {
      if (element.points && element.points.length > 0) {
        // For path elements, use points
        element.points.forEach((point) => {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        });
      } else if (element.type === "text") {
        // For text elements, calculate bounds based on text content
        const fontSize = element.style.fontSize || 16;
        const textWidth = element.width || (element.text || "").length * fontSize * 0.6;
        const textHeight = element.height || fontSize * 1.2;
        minX = Math.min(minX, element.x);
        minY = Math.min(minY, element.y);
        maxX = Math.max(maxX, element.x + textWidth);
        maxY = Math.max(maxY, element.y + textHeight);
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

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
      worldBounds: { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
    };
  }, [state.selectedElements, state.elements, state.viewTransform]);

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback((worldPoint: { x: number; y: number }) => {
    const { viewTransform } = state;
    return {
      x: worldPoint.x * viewTransform.scale + viewTransform.x,
      y: worldPoint.y * viewTransform.scale + viewTransform.y,
    };
  }, [state.viewTransform]);

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenPoint: { x: number; y: number }) => {
    const { viewTransform } = state;
    return {
      x: (screenPoint.x - viewTransform.x) / viewTransform.scale,
      y: (screenPoint.y - viewTransform.y) / viewTransform.scale,
    };
  }, [state.viewTransform]);

  const handleResizeStart = (handleId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const bounds = getSelectionBounds();
    if (!bounds) return;

    setIsResizing(true);
    setResizeHandle(handleId);
    setStartBounds(bounds);
    setStartMousePos({ x: event.clientX, y: event.clientY });
  };

  const handleRotationStart = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const bounds = getSelectionBounds();
    if (!bounds) return;

    setIsRotating(true);
    setStartBounds(bounds);
    setStartMousePos({ x: event.clientX, y: event.clientY });
  };

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isResizing && !isRotating) return;
    if (!startBounds) return;

    const deltaX = event.clientX - startMousePos.x;
    const deltaY = event.clientY - startMousePos.y;

    if (isResizing && resizeHandle) {
      // Calculate new bounds based on resize handle
      let newBounds = { ...startBounds.worldBounds };
      
      switch (resizeHandle) {
        case "tl": // Top-left
          newBounds.minX += deltaX / state.viewTransform.scale;
          newBounds.minY += deltaY / state.viewTransform.scale;
          break;
        case "tr": // Top-right
          newBounds.maxX += deltaX / state.viewTransform.scale;
          newBounds.minY += deltaY / state.viewTransform.scale;
          break;
        case "bl": // Bottom-left
          newBounds.minX += deltaX / state.viewTransform.scale;
          newBounds.maxY += deltaY / state.viewTransform.scale;
          break;
        case "br": // Bottom-right
          newBounds.maxX += deltaX / state.viewTransform.scale;
          newBounds.maxY += deltaY / state.viewTransform.scale;
          break;
        case "t": // Top
          newBounds.minY += deltaY / state.viewTransform.scale;
          break;
        case "b": // Bottom
          newBounds.maxY += deltaY / state.viewTransform.scale;
          break;
        case "l": // Left
          newBounds.minX += deltaX / state.viewTransform.scale;
          break;
        case "r": // Right
          newBounds.maxX += deltaX / state.viewTransform.scale;
          break;
      }

      // Update element bounds
      newBounds.width = newBounds.maxX - newBounds.minX;
      newBounds.height = newBounds.maxY - newBounds.minY;

      // Apply resize to selected elements
      const scaleX = newBounds.width / startBounds.worldBounds.width;
      const scaleY = newBounds.height / startBounds.worldBounds.height;

      if (scaleX > 0.1 && scaleY > 0.1) { // Minimum size limit
        state.selectedElements.forEach(elementId => {
          const element = state.elements.find(el => el.id === elementId);
          if (!element) return;

          if (element.type === "path" || element.type === "highlighter") {
            // For path elements, scale points
            if (element.points) {
              const scaledPoints = element.points.map(point => ({
                x: newBounds.minX + (point.x - startBounds.worldBounds.minX) * scaleX,
                y: newBounds.minY + (point.y - startBounds.worldBounds.minY) * scaleY,
              }));
              
              // Update element with new points
              dispatch({
                type: "RESIZE_ELEMENT",
                elementId: element.id,
                width: newBounds.width,
                height: newBounds.height,
                x: newBounds.minX,
                y: newBounds.minY,
              });
            }
          } else {
            // For shape and text elements, scale dimensions
            const newWidth = (element.width || 100) * scaleX;
            const newHeight = (element.height || 100) * scaleY;
            const newX = newBounds.minX + (element.x - startBounds.worldBounds.minX) * scaleX;
            const newY = newBounds.minY + (element.y - startBounds.worldBounds.minY) * scaleY;

            dispatch({
              type: "RESIZE_ELEMENT",
              elementId: element.id,
              width: newWidth,
              height: newHeight,
              x: newX,
              y: newY,
            });
          }
        });
      }
    } else if (isRotating) {
      // Calculate rotation angle
      const centerX = startBounds.x + startBounds.width / 2;
      const centerY = startBounds.y + startBounds.height / 2;
      
      const startAngle = Math.atan2(startMousePos.y - centerY, startMousePos.x - centerX);
      const currentAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
      const rotationAngle = (currentAngle - startAngle) * (180 / Math.PI);
      
      console.log(`Rotating: ${rotationAngle.toFixed(2)}°`);
      // TODO: Apply rotation to elements when rotation is fully implemented
    }
  }, [isResizing, isRotating, resizeHandle, startBounds, startMousePos, state, dispatch]);

  const handleMouseUp = useCallback(() => {
    if (isResizing || isRotating) {
      setIsResizing(false);
      setIsRotating(false);
      setResizeHandle(null);
      setStartBounds(null);
      dispatch({ type: "SAVE_STATE" }); // Save state for undo
    }
  }, [isResizing, isRotating, dispatch]);

  // Add global mouse event listeners
  React.useEffect(() => {
    if (isResizing || isRotating) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, isRotating, handleMouseMove, handleMouseUp]);

  const bounds = getSelectionBounds();
  
  if (!bounds || state.selectedElements.length === 0) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className="absolute pointer-events-none z-30"
      style={{
        left: bounds.x - 10,
        top: bounds.y - 10,
        width: bounds.width + 20,
        height: bounds.height + 20,
      }}
    >
      {/* Selection border */}
      <div 
        className="absolute inset-2 border-2 border-primary border-dashed pointer-events-none"
        style={{
          borderColor: "var(--canvas-selection)",
        }}
      />
      
      {/* Resize handles */}
      {RESIZE_HANDLES.map((handle) => {
        let handleStyle: React.CSSProperties = {
          position: "absolute",
          width: "8px",
          height: "8px",
          backgroundColor: "#007AFF",
          border: "2px solid white",
          borderRadius: "2px",
          cursor: handle.cursor,
          pointerEvents: "auto",
        };

        // Position handles
        switch (handle.position) {
          case "top-left":
            handleStyle.top = "0px";
            handleStyle.left = "0px";
            break;
          case "top-right":
            handleStyle.top = "0px";
            handleStyle.right = "0px";
            break;
          case "bottom-left":
            handleStyle.bottom = "0px";
            handleStyle.left = "0px";
            break;
          case "bottom-right":
            handleStyle.bottom = "0px";
            handleStyle.right = "0px";
            break;
          case "top":
            handleStyle.top = "0px";
            handleStyle.left = "50%";
            handleStyle.transform = "translateX(-50%)";
            break;
          case "bottom":
            handleStyle.bottom = "0px";
            handleStyle.left = "50%";
            handleStyle.transform = "translateX(-50%)";
            break;
          case "left":
            handleStyle.left = "0px";
            handleStyle.top = "50%";
            handleStyle.transform = "translateY(-50%)";
            break;
          case "right":
            handleStyle.right = "0px";
            handleStyle.top = "50%";
            handleStyle.transform = "translateY(-50%)";
            break;
        }

        return (
          <div
            key={handle.id}
            style={handleStyle}
            onMouseDown={(e) => handleResizeStart(handle.id, e)}
          />
        );
      })}

      {/* Rotation handle */}
      <div
        style={{
          position: "absolute",
          top: "-30px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "16px",
          height: "16px",
          backgroundColor: "#007AFF",
          border: "2px solid white",
          borderRadius: "50%",
          cursor: "grab",
          pointerEvents: "auto",
        }}
        onMouseDown={handleRotationStart}
        title="Rotate"
      >
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "2px",
            height: "20px",
            backgroundColor: "#007AFF",
          }}
        />
      </div>
    </div>
  );
}
