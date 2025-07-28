import React from "react";
import { useCanvasSettings } from "../../contexts/CanvasSettingsContext";
import { useVirtualPages } from "../../contexts/VirtualPagesContext";
import { useDrawing } from "../../contexts/DrawingContext";

/**
 * VirtualPagesOverlay shows the boundaries of virtual pages in infinite canvas mode
 */
export function VirtualPagesOverlay() {
  const { state: canvasSettings } = useCanvasSettings();
  const { state: drawingState } = useDrawing();
  const { pages, statistics } = useVirtualPages();

  // Only show in infinite canvas mode when origin box is visible
  const shouldShow =
    canvasSettings.canvasMode === "infinite" &&
    canvasSettings.originBox.visible &&
    pages.length > 1; // Only show if there are multiple pages

  if (!shouldShow) {
    return null;
  }

  const { viewTransform } = drawingState;

  return (
    <div
      className="virtual-pages-overlay"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {pages.map((page) => {
        // Skip origin page (already shown by OriginBoxOverlay)
        if (page.isOrigin) return null;

        // Apply view transform to position the page correctly
        const transformedX = page.x * viewTransform.scale + viewTransform.x;
        const transformedY = page.y * viewTransform.scale + viewTransform.y;
        const transformedWidth = page.width * viewTransform.scale;
        const transformedHeight = page.height * viewTransform.scale;

        // Only render if the page is visible in viewport (performance optimization)
        const isVisible =
          transformedX + transformedWidth > -50 &&
          transformedX < window.innerWidth + 50 &&
          transformedY + transformedHeight > -50 &&
          transformedY < window.innerHeight + 50;

        if (!isVisible) return null;

        const hasElements = page.elements.length > 0;
        const borderColor = hasElements ? "#10b981" : "#6b7280"; // Green if has elements, gray if empty
        const opacity = hasElements ? 0.6 : 0.3;

        return (
          <div
            key={page.id}
            className="virtual-page-boundary"
            style={{
              position: "absolute",
              left: `${transformedX}px`,
              top: `${transformedY}px`,
              width: `${transformedWidth}px`,
              height: `${transformedHeight}px`,
              border: `2px dashed ${borderColor}`,
              borderRadius: "4px",
              opacity,
              boxSizing: "border-box",
            }}
          >
            {/* Page label */}
            <div
              style={{
                position: "absolute",
                top: "-25px",
                left: "0px",
                backgroundColor: borderColor,
                color: "white",
                padding: "2px 6px",
                borderRadius: "3px",
                fontSize: "10px",
                fontWeight: "600",
                fontFamily: "system-ui, -apple-system, sans-serif",
                opacity: 0.8,
              }}
            >
              Page {page.gridPosition.row},{page.gridPosition.col}
              {hasElements && ` (${page.elements.length})`}
            </div>

            {/* Page content indicator */}
            {hasElements && (
              <div
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  width: "12px",
                  height: "12px",
                  backgroundColor: borderColor,
                  borderRadius: "50%",
                  opacity: 0.7,
                }}
              />
            )}

            {/* Grid position indicator */}
            <div
              style={{
                position: "absolute",
                bottom: "8px",
                left: "8px",
                fontSize: "12px",
                color: borderColor,
                fontWeight: "600",
                opacity: 0.6,
              }}
            >
              ({page.gridPosition.row}, {page.gridPosition.col})
            </div>
          </div>
        );
      })}

      {/* Virtual pages statistics */}
      {statistics.totalPages > 1 && (
        <div
          className="virtual-pages-stats"
          style={{
            position: "absolute",
            bottom: "20px",
            right: "20px",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            backdropFilter: "blur(4px)",
          }}
        >
          <div>
            📄 Virtual Pages: {statistics.pagesWithElements}/
            {statistics.totalPages}
          </div>
          <div>📝 Total Elements: {statistics.totalElements}</div>
        </div>
      )}
    </div>
  );
}
