import React, { useRef, useEffect, useState, ReactNode } from "react";
import { useFloatingPanels } from "../../contexts/FloatingPanelContext";
import { Button } from "../ui/button";
import { X, Minus } from "lucide-react";
import { cn } from "../../lib/utils";

interface AnimatedFloatingPanelProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  children: ReactNode;
  className?: string;
  hideFromDock?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export function AnimatedFloatingPanel({
  id,
  title,
  icon: Icon,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 300, height: 400 },
  children,
  className,
  hideFromDock = false,
  minWidth = 200,
  minHeight = 150,
  maxWidth = 1200,
  maxHeight = 800,
}: AnimatedFloatingPanelProps) {
  const { state, dispatch } = useFloatingPanels();
  const panelRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] =
    useState<ResizeDirection | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStartData, setResizeStartData] = useState({
    mouseX: 0,
    mouseY: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  });
  const [isAnimating, setIsAnimating] = useState(false);

  const panel = state.panels[id];

  // Register panel on mount
  useEffect(() => {
    if (!panel) {
      dispatch({
        type: "REGISTER_PANEL",
        panel: {
          id,
          title,
          icon: Icon,
          isOpen: false,
          isMinimized: true,
          position: defaultPosition,
          size: defaultSize,
          hideFromDock,
        },
      });
    }
  }, [id, title, Icon, defaultPosition, defaultSize, panel, dispatch]);

  // Handle mouse events for dragging and resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!panel) return;

      if (isDragging) {
        const newPosition = {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        };

        // Keep panel within viewport bounds
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight,
        };

        newPosition.x = Math.max(
          0,
          Math.min(newPosition.x, viewport.width - panel.size.width),
        );
        newPosition.y = Math.max(
          0,
          Math.min(newPosition.y, viewport.height - panel.size.height),
        );

        dispatch({
          type: "SET_PANEL_POSITION",
          panelId: id,
          position: newPosition,
        });
      } else if (isResizing && resizeDirection) {
        const deltaX = e.clientX - resizeStartData.mouseX;
        const deltaY = e.clientY - resizeStartData.mouseY;

        let newWidth = resizeStartData.width;
        let newHeight = resizeStartData.height;
        let newX = resizeStartData.x;
        let newY = resizeStartData.y;

        // Handle different resize directions
        if (resizeDirection.includes("e")) {
          newWidth = Math.max(
            minWidth,
            Math.min(maxWidth, resizeStartData.width + deltaX),
          );
        }
        if (resizeDirection.includes("w")) {
          const widthChange =
            Math.max(
              minWidth,
              Math.min(maxWidth, resizeStartData.width - deltaX),
            ) - resizeStartData.width;
          newWidth = resizeStartData.width + widthChange;
          newX = resizeStartData.x - widthChange;
        }
        if (resizeDirection.includes("s")) {
          newHeight = Math.max(
            minHeight,
            Math.min(maxHeight, resizeStartData.height + deltaY),
          );
        }
        if (resizeDirection.includes("n")) {
          const heightChange =
            Math.max(
              minHeight,
              Math.min(maxHeight, resizeStartData.height - deltaY),
            ) - resizeStartData.height;
          newHeight = resizeStartData.height + heightChange;
          newY = resizeStartData.y - heightChange;
        }

        // Keep panel within viewport bounds
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight,
        };

        newX = Math.max(0, Math.min(newX, viewport.width - newWidth));
        newY = Math.max(0, Math.min(newY, viewport.height - newHeight));

        dispatch({
          type: "SET_PANEL_SIZE",
          panelId: id,
          size: { width: newWidth, height: newHeight },
        });

        if (newX !== panel.position.x || newY !== panel.position.y) {
          dispatch({
            type: "SET_PANEL_POSITION",
            panelId: id,
            position: { x: newX, y: newY },
          });
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        dispatch({ type: "END_DRAG", panelId: id });
      }
      if (isResizing) {
        setIsResizing(false);
        setResizeDirection(null);
        dispatch({ type: "END_RESIZE", panelId: id });
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    isResizing,
    resizeDirection,
    dragOffset,
    resizeStartData,
    panel,
    id,
    dispatch,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
  ]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!panel || !panelRef.current) return;

    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    setIsDragging(true);
    dispatch({ type: "START_DRAG", panelId: id });
  };

  const handleResizeStart = (
    direction: ResizeDirection,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (!panel) return;

    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStartData({
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: panel.size.width,
      height: panel.size.height,
      x: panel.position.x,
      y: panel.position.y,
    });

    dispatch({ type: "START_RESIZE", panelId: id });
  };

  const handleMinimize = async () => {
    if (!panelRef.current || isAnimating) return;

    setIsAnimating(true);

    // Get current position and dock position
    const rect = panelRef.current.getBoundingClientRect();
    const dockPosition = {
      x: window.innerWidth / 2,
      y: window.innerHeight - 50,
    };

    // Use a ref to prevent multiple completion calls
    let completed = false;
    const completeMinimize = () => {
      if (completed) return;
      completed = true;

      // Hide the panel immediately to prevent flash
      if (panelRef.current) {
        panelRef.current.style.visibility = "hidden";
      }

      // Dispatch minimize action
      dispatch({ type: "MINIMIZE_PANEL", panelId: id });

      // Reset animation state after a brief delay
      setTimeout(() => {
        setIsAnimating(false);
        // Restore visibility for next time (when panel is restored)
        if (panelRef.current) {
          panelRef.current.style.visibility = "visible";
        }
      }, 100);
    };

    try {
      // Animate the panel "sucking" to the dock
      const animation = panelRef.current.animate(
        [
          {
            transform: `translate(0, 0) scale(1)`,
            opacity: "1",
          },
          {
            transform: `translate(${dockPosition.x - rect.left - rect.width / 2}px, ${dockPosition.y - rect.top - rect.height / 2}px) scale(0.1)`,
            opacity: "0",
          },
        ],
        {
          duration: 250, // Shorter duration for snappier feel
          easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          fill: "forwards", // Keep final state
        },
      );

      // Use Promise-based approach for better control
      animation.finished
        .then(() => {
          completeMinimize();
        })
        .catch(() => {
          // Fallback if animation fails
          completeMinimize();
        });
    } catch (error) {
      // Fallback if animation setup fails
      console.warn(
        "Animation failed, falling back to immediate minimize:",
        error,
      );
      completeMinimize();
    }
  };

  const handleClose = () => {
    dispatch({ type: "CLOSE_PANEL", panelId: id });
  };

  const handlePanelClick = () => {
    dispatch({ type: "BRING_TO_FRONT", panelId: id });
  };

  // Handle panel restoration animation
  useEffect(() => {
    if (
      panel?.isOpen &&
      !panel.isMinimized &&
      panelRef.current &&
      !isAnimating
    ) {
      // Ensure visibility is restored
      panelRef.current.style.visibility = "visible";

      // Animate panel appearing from dock position
      const dockPosition = {
        x: window.innerWidth / 2,
        y: window.innerHeight - 50,
      };

      const rect = panelRef.current.getBoundingClientRect();

      panelRef.current.animate(
        [
          {
            transform: `translate(${dockPosition.x - rect.left - rect.width / 2}px, ${dockPosition.y - rect.top - rect.height / 2}px) scale(0.1)`,
            opacity: "0",
          },
          {
            transform: `translate(0, 0) scale(1)`,
            opacity: "1",
          },
        ],
        {
          duration: 300,
          easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        },
      );
    }
  }, [panel?.isOpen, panel?.isMinimized, isAnimating]);

  if (!panel || !panel.isOpen || (panel.isMinimized && !isAnimating)) {
    return null;
  }

  const getCursorStyle = (direction: ResizeDirection) => {
    const cursors = {
      n: "cursor-ns-resize",
      s: "cursor-ns-resize",
      e: "cursor-ew-resize",
      w: "cursor-ew-resize",
      ne: "cursor-nesw-resize",
      nw: "cursor-nwse-resize",
      se: "cursor-nwse-resize",
      sw: "cursor-nesw-resize",
    };
    return cursors[direction];
  };

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed bg-background border border-border rounded-lg shadow-xl overflow-hidden",
        "transition-all duration-200 ease-in-out",
        (panel.isDragging || panel.isResizing) && "select-none",
        panel.isDragging && "cursor-grabbing",
        "backdrop-blur-sm bg-background/95",
        className,
      )}
      style={{
        left: panel.position.x,
        top: panel.position.y,
        width: panel.size.width,
        height: panel.size.height,
        zIndex: panel.zIndex,
      }}
      onClick={handlePanelClick}
    >
      {/* Resize Handles - Simple and Visible */}
      {/* Corner handles */}
      <div
        className={cn(
          "absolute top-0 left-0 w-4 h-4 -m-1 z-30",
          getCursorStyle("nw"),
          "bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/50",
          "rounded-sm transition-all duration-200 hover:scale-110",
        )}
        onMouseDown={(e) => handleResizeStart("nw", e)}
        title="Resize corner"
      />
      <div
        className={cn(
          "absolute top-0 right-0 w-4 h-4 -m-1 z-30",
          getCursorStyle("ne"),
          "bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/50",
          "rounded-sm transition-all duration-200 hover:scale-110",
        )}
        onMouseDown={(e) => handleResizeStart("ne", e)}
        title="Resize corner"
      />
      <div
        className={cn(
          "absolute bottom-0 left-0 w-4 h-4 -m-1 z-30",
          getCursorStyle("sw"),
          "bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/50",
          "rounded-sm transition-all duration-200 hover:scale-110",
        )}
        onMouseDown={(e) => handleResizeStart("sw", e)}
        title="Resize corner"
      />
      <div
        className={cn(
          "absolute bottom-0 right-0 w-4 h-4 -m-1 z-30",
          getCursorStyle("se"),
          "bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/50",
          "rounded-sm transition-all duration-200 hover:scale-110",
        )}
        onMouseDown={(e) => handleResizeStart("se", e)}
        title="Resize corner"
      />

      {/* Edge handles */}
      <div
        className={cn(
          "absolute top-0 left-6 right-6 h-2 -mt-1 z-30",
          getCursorStyle("n"),
          "bg-blue-500/10 hover:bg-blue-500/30 border-t border-blue-500/50",
          "transition-all duration-200",
        )}
        onMouseDown={(e) => handleResizeStart("n", e)}
        title="Resize top edge"
      />
      <div
        className={cn(
          "absolute bottom-0 left-6 right-6 h-2 -mb-1 z-30",
          getCursorStyle("s"),
          "bg-blue-500/10 hover:bg-blue-500/30 border-b border-blue-500/50",
          "transition-all duration-200",
        )}
        onMouseDown={(e) => handleResizeStart("s", e)}
        title="Resize bottom edge"
      />
      <div
        className={cn(
          "absolute left-0 top-6 bottom-6 w-2 -ml-1 z-30",
          getCursorStyle("w"),
          "bg-blue-500/10 hover:bg-blue-500/30 border-l border-blue-500/50",
          "transition-all duration-200",
        )}
        onMouseDown={(e) => handleResizeStart("w", e)}
        title="Resize left edge"
      />
      <div
        className={cn(
          "absolute right-0 top-6 bottom-6 w-2 -mr-1 z-30",
          getCursorStyle("e"),
          "bg-blue-500/10 hover:bg-blue-500/30 border-r border-blue-500/50",
          "transition-all duration-200",
        )}
        onMouseDown={(e) => handleResizeStart("e", e)}
        title="Resize right edge"
      />

      {/* Header */}
      <div
        ref={headerRef}
        className={cn(
          "flex items-center justify-between p-3 bg-muted/50 border-b border-border",
          "cursor-grab active:cursor-grabbing select-none relative z-20",
          "backdrop-blur-sm",
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">{title}</h3>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleMinimize();
            }}
            className="h-6 w-6 hover:bg-muted transition-all duration-200"
          >
            <Minus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div
        className="h-full overflow-auto p-6 relative z-10"
        style={{ height: `calc(100% - 52px)` }}
      >
        {children}
      </div>
    </div>
  );
}
