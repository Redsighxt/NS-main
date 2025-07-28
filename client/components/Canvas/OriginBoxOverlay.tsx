import React, { useEffect, useRef } from "react";
import { useCanvasSettings } from "../../contexts/CanvasSettingsContext";
import { useDrawing } from "../../contexts/DrawingContext";

/**
 * OriginBoxOverlay renders a 1920x1080 reference frame on the infinite canvas
 * Similar to Excalidraw's initialData system but as a persistent overlay
 */
export function OriginBoxOverlay() {
  const { state: canvasSettings } = useCanvasSettings();
  const { state: drawingState } = useDrawing();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Only show origin box in infinite canvas mode
  const shouldShowOriginBox =
    canvasSettings.canvasMode === "infinite" &&
    canvasSettings.originBox.visible;

  useEffect(() => {
    if (!shouldShowOriginBox || !overlayRef.current) return;

    const overlay = overlayRef.current;
    const { originBox } = canvasSettings;
    const { viewTransform } = drawingState;

    // Apply view transform to position the origin box correctly
    const transformedX = originBox.x * viewTransform.scale + viewTransform.x;
    const transformedY = originBox.y * viewTransform.scale + viewTransform.y;
    const transformedWidth = originBox.width * viewTransform.scale;
    const transformedHeight = originBox.height * viewTransform.scale;

    // Update overlay position and size
    overlay.style.left = `${transformedX}px`;
    overlay.style.top = `${transformedY}px`;
    overlay.style.width = `${transformedWidth}px`;
    overlay.style.height = `${transformedHeight}px`;

    // Update border styles
    overlay.style.borderColor = originBox.style.strokeColor;
    overlay.style.borderWidth = `${originBox.style.strokeWidth}px`;
    overlay.style.opacity = originBox.style.opacity.toString();

    // Set border style based on strokeStyle
    switch (originBox.style.strokeStyle) {
      case "dashed":
        overlay.style.borderStyle = "dashed";
        break;
      case "dotted":
        overlay.style.borderStyle = "dotted";
        break;
      case "solid":
      default:
        overlay.style.borderStyle = "solid";
        break;
    }
  }, [
    shouldShowOriginBox,
    canvasSettings.originBox,
    drawingState.viewTransform,
  ]);

  if (!shouldShowOriginBox) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className="origin-box-overlay"
      style={{
        position: "absolute",
        pointerEvents: "none", // Don't interfere with drawing
        zIndex: 10, // Above canvas but below UI
        borderRadius: "4px",
        boxSizing: "border-box",
      }}
    >
      {/* Origin box label */}
      <div
        className="origin-box-label"
        style={{
          position: "absolute",
          top: "-30px",
          left: "0px",
          backgroundColor: canvasSettings.originBox.style.strokeColor,
          color: "white",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: "600",
          fontFamily: "system-ui, -apple-system, sans-serif",
          opacity: canvasSettings.originBox.style.opacity,
          pointerEvents: "none",
        }}
      >
        Origin Box (1920×1080)
      </div>

      {/* Corner indicators for better visibility */}
      <div
        className="corner-indicators"
        style={{
          position: "absolute",
          inset: "-2px",
          pointerEvents: "none",
        }}
      >
        {/* Top-left corner */}
        <div
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "20px",
            height: "20px",
            borderTop: `3px solid ${canvasSettings.originBox.style.strokeColor}`,
            borderLeft: `3px solid ${canvasSettings.originBox.style.strokeColor}`,
            opacity: canvasSettings.originBox.style.opacity,
          }}
        />

        {/* Top-right corner */}
        <div
          style={{
            position: "absolute",
            top: "0",
            right: "0",
            width: "20px",
            height: "20px",
            borderTop: `3px solid ${canvasSettings.originBox.style.strokeColor}`,
            borderRight: `3px solid ${canvasSettings.originBox.style.strokeColor}`,
            opacity: canvasSettings.originBox.style.opacity,
          }}
        />

        {/* Bottom-left corner */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            width: "20px",
            height: "20px",
            borderBottom: `3px solid ${canvasSettings.originBox.style.strokeColor}`,
            borderLeft: `3px solid ${canvasSettings.originBox.style.strokeColor}`,
            opacity: canvasSettings.originBox.style.opacity,
          }}
        />

        {/* Bottom-right corner */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            right: "0",
            width: "20px",
            height: "20px",
            borderBottom: `3px solid ${canvasSettings.originBox.style.strokeColor}`,
            borderRight: `3px solid ${canvasSettings.originBox.style.strokeColor}`,
            opacity: canvasSettings.originBox.style.opacity,
          }}
        />
      </div>

      {/* Center cross indicator */}
      <div
        className="center-cross"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "40px",
          height: "40px",
          pointerEvents: "none",
        }}
      >
        {/* Horizontal line */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "0",
            width: "100%",
            height: "2px",
            backgroundColor: canvasSettings.originBox.style.strokeColor,
            opacity: canvasSettings.originBox.style.opacity * 0.8,
          }}
        />
        {/* Vertical line */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "0",
            width: "2px",
            height: "100%",
            backgroundColor: canvasSettings.originBox.style.strokeColor,
            opacity: canvasSettings.originBox.style.opacity * 0.8,
          }}
        />
      </div>
    </div>
  );
}
