import React, { useRef, useEffect, useState, ReactNode } from "react";
import { useFloatingPanels } from "../../contexts/FloatingPanelContext";
import { useDraggable } from "../../hooks/useDraggable";
import { Button } from "../ui/button";
import { X, Minus } from "lucide-react";
import { cn } from "../../lib/utils";

interface FloatingPanelProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  children: ReactNode;
  className?: string;
  hideCloseButton?: boolean;
  defaultOpen?: boolean;
  defaultMinimized?: boolean;
  hideFromDock?: boolean;
}

export function FloatingPanel({
  id,
  title,
  icon: Icon,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 300, height: 400 },
  children,
  className,
  hideCloseButton = false,
  defaultOpen = true,
  defaultMinimized = false,
  hideFromDock = false,
}: FloatingPanelProps) {
  const { state, dispatch } = useFloatingPanels();
  const headerRef = useRef<HTMLDivElement>(null);
  const panel = state.panels[id];

  // Use the enhanced draggable hook that supports touch and Apple Pencil
  const {
    elementRef: panelRef,
    position,
    isDragging,
    handleMouseDown,
    handleTouchStart,
    handlePointerDown,
    setPosition,
  } = useDraggable({
    initialPosition: panel?.position || defaultPosition,
    constrainToViewport: true,
  });

  // Register panel on mount
  useEffect(() => {
    if (!panel) {
      dispatch({
        type: "REGISTER_PANEL",
        panel: {
          id,
          title,
          icon: Icon,
          isOpen: defaultMinimized ? true : defaultOpen,
          isMinimized: defaultMinimized,
          position: defaultPosition,
          size: defaultSize,
          hideFromDock,
        },
      });
    }
  }, [id, title, Icon, defaultPosition, defaultSize, panel, dispatch]);

  // Sync position with context when drag state changes
  useEffect(() => {
    if (
      panel &&
      (position.x !== panel.position.x || position.y !== panel.position.y)
    ) {
      dispatch({
        type: "SET_PANEL_POSITION",
        panelId: id,
        position,
      });
    }
  }, [position, panel, id, dispatch]);

  // Sync drag state with context
  useEffect(() => {
    if (isDragging && panel && !panel.isDragging) {
      dispatch({ type: "START_DRAG", panelId: id });
    } else if (!isDragging && panel && panel.isDragging) {
      dispatch({ type: "END_DRAG", panelId: id });
    }
  }, [isDragging, panel, id, dispatch]);

  // Update local position when panel position changes externally
  useEffect(() => {
    if (panel && !isDragging) {
      setPosition(panel.position);
    }
  }, [panel?.position, isDragging, setPosition]);

  const handleMinimize = () => {
    dispatch({ type: "MINIMIZE_PANEL", panelId: id });
  };

  const handleClose = () => {
    dispatch({ type: "CLOSE_PANEL", panelId: id });
  };

  const handlePanelClick = () => {
    dispatch({ type: "BRING_TO_FRONT", panelId: id });
  };

  if (!panel || !panel.isOpen || panel.isMinimized) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed bg-background border border-border rounded-lg shadow-xl overflow-hidden",
        "transition-all duration-200 ease-in-out",
        panel.isDragging && "cursor-grabbing",
        className,
      )}
      style={{
        left: position.x,
        top: position.y,
        width: panel.size.width,
        height: panel.size.height,
        zIndex: panel.zIndex,
      }}
      onClick={handlePanelClick}
    >
      {/* Header */}
      <div
        ref={headerRef}
        className={cn(
          "flex items-center justify-between p-3 bg-muted/50 border-b border-border",
          "cursor-grab active:cursor-grabbing select-none",
          "floating-panel-header",
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onPointerDown={handlePointerDown}
        style={{
          touchAction: "none",
          pointerEvents: "auto",
        }}
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
            className="h-6 w-6 hover:bg-muted"
          >
            <Minus className="h-3 w-3" />
          </Button>
          {!hideCloseButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="h-6 w-6 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 h-full overflow-auto">{children}</div>
    </div>
  );
}
