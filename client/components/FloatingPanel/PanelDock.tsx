import React, { useState } from "react";
import { useFloatingPanels } from "../../contexts/FloatingPanelContext";
import { useDraggable } from "../../hooks/useDraggable";
import { Button } from "../ui/button";
import { ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { cn } from "../../lib/utils";

export function PanelDock() {
  const { state, dispatch } = useFloatingPanels();
  const [isDockMinimized, setIsDockMinimized] = useState(false);

  const {
    elementRef,
    position,
    isDragging,
    handleMouseDown,
    handlePointerDown,
  } = useDraggable({
    initialPosition: {
      x: window.innerWidth / 2 - 50, // Centered horizontally
      y: window.innerHeight - 80,
    }, // Bottom center area
    constrainToViewport: true,
  });

  const minimizedPanels = Object.values(state.panels).filter(
    (panel) => panel.isMinimized && !panel.hideFromDock,
  );

  // Show dock if there are minimized panels OR if the dock itself is minimized but has content
  if (minimizedPanels.length === 0 && !isDockMinimized) {
    return null;
  }

  const handlePanelClick = (panelId: string) => {
    dispatch({ type: "MAXIMIZE_PANEL", panelId });
  };

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className="fixed z-[9999]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      {isDockMinimized ? (
        // Minimized dock - just a small button
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsDockMinimized(false)}
          className="bg-background/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200"
          onMouseDown={handleMouseDown}
          onPointerDown={handlePointerDown}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      ) : (
        // Full dock
        <div className="flex items-center space-x-2 bg-background/90 backdrop-blur-sm border border-border rounded-full px-3 py-2 shadow-lg">
          {/* Drag Handle */}
          <div
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/50 rounded-lg"
            onMouseDown={handleMouseDown}
            onPointerDown={handlePointerDown}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Panel Icons */}
          {minimizedPanels.map((panel) => {
            const Icon = panel.icon;
            return (
              <Button
                key={panel.id}
                variant="ghost"
                size="icon"
                onClick={() => handlePanelClick(panel.id)}
                className={cn(
                  "h-10 w-10 rounded-full",
                  "hover:bg-primary/10 hover:scale-110",
                  "transition-all duration-200 ease-in-out",
                  "group relative",
                )}
                title={panel.title}
              >
                <Icon className="h-4 w-4" />

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded border shadow-md whitespace-nowrap">
                    {panel.title}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover"></div>
                  </div>
                </div>
              </Button>
            );
          })}

          {/* Minimize Button - only show if there are panels */}
          {minimizedPanels.length > 0 && (
            <>
              {/* Separator */}
              <div className="w-px h-6 bg-border/50 mx-1" />

              {/* Minimize dock button */}
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDockMinimized(true)}
                  className="h-10 w-10 rounded-full hover:bg-muted/50 hover:scale-110 transition-all duration-200"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded border shadow-md whitespace-nowrap">
                    Minimize Dock
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-popover"></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
