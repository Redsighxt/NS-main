import React, { useState } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { useLibrary } from "../../contexts/LibraryContext";
import { useFloatingPanels } from "../../contexts/FloatingPanelContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useStylusOnly } from "../../contexts/StylusOnlyContext";
import { useCanvasSettings } from "../../contexts/CanvasSettingsContext";
import { useDraggable } from "../../hooks/useDraggable";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  MousePointer,
  Pencil,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Type,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Undo,
  Redo,
  Hand,
  Eraser,
  GripVertical,
  Diamond,
  Highlighter,
  Library,
  Pen,
  MoreHorizontal,
  Navigation,
} from "lucide-react";
import { cn } from "../../lib/utils";

const tools = [
  { id: "select", icon: MousePointer, label: "Select" },
  { id: "hand", icon: Hand, label: "Hand" },
  { id: "pencil", icon: Pencil, label: "Pencil" },
  { id: "highlighter", icon: Highlighter, label: "Highlighter" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "ellipse", icon: Circle, label: "Ellipse" },
  { id: "diamond", icon: Diamond, label: "Diamond" },
  { id: "line", icon: Minus, label: "Line" },
  { id: "arrow", icon: ArrowRight, label: "Arrow" },
  { id: "text", icon: Type, label: "Text" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
] as const;

export function ToolPanel() {
  const { state, dispatch } = useDrawing();
  const { state: libraryState, dispatch: libraryDispatch } = useLibrary();
  const { dispatch: panelDispatch } = useFloatingPanels();
  const { state: canvasSettings } = useCanvasSettings();
  const { actualTheme } = useTheme();
  const { state: stylusState, toggle: toggleStylusOnly } = useStylusOnly();
  const [isMinimized, setIsMinimized] = useState(false);

  // Tools that have property panels
  const toolsWithProperties = [
    "select",
    "pencil",
    "highlighter",
    "rectangle",
    "ellipse",
    "diamond",
    "line",
    "arrow",
    "text",
    "eraser",
  ];

  const {
    elementRef,
    position,
    isDragging,
    handleMouseDown,
    handlePointerDown,
    resetPosition,
  } = useDraggable({
    initialPosition: { x: window.innerWidth / 2 - 200, y: 80 }, // Centered horizontally
    constrainToViewport: true,
  });

  const handleToolSelect = (toolId: (typeof tools)[number]["id"]) => {
    // If clicking the same tool, deselect it
    if (state.currentTool === toolId) {
      dispatch({ type: "SET_TOOL", tool: "select" });
      return;
    }

    // Ensure immediate tool selection without any delay
    dispatch({ type: "SET_TOOL", tool: toolId });

    // Clear selections when switching tools
    if (toolId !== "select") {
      dispatch({ type: "SELECT_ELEMENTS", elementIds: [] });
    }
  };

  const handleDeleteSelected = () => {
    dispatch({ type: "DELETE_SELECTED" });
  };

  const handleClearCanvas = () => {
    if (confirm("Are you sure you want to clear the entire canvas?")) {
      dispatch({ type: "CLEAR_CANVAS" });
    }
  };

  const handleUndo = () => {
    dispatch({ type: "UNDO" });
  };

  const handleRedo = () => {
    dispatch({ type: "REDO" });
  };

  const handleToggleLibrary = () => {
    libraryDispatch({ type: "TOGGLE_LIBRARY_PANEL" });
  };

  const handleScrollToOriginBox = () => {
    // Calculate the view transform to center the origin box
    const originBox = canvasSettings.originBox;
    const canvasElement = document.querySelector("canvas");

    if (canvasElement) {
      const canvasRect = canvasElement.getBoundingClientRect();
      const canvasWidth = canvasRect.width;
      const canvasHeight = canvasRect.height;

      // Center the origin box in the viewport
      const targetX = canvasWidth / 2 - (originBox.x + originBox.width / 2);
      const targetY = canvasHeight / 2 - (originBox.y + originBox.height / 2);

      dispatch({
        type: "SET_VIEW_TRANSFORM",
        transform: {
          x: targetX,
          y: targetY,
          scale: 1,
        },
      });
    }
  };

  const handlePropertyDotClick = (toolId: string) => {
    // Open tool-specific properties panel
    if (toolsWithProperties.includes(toolId)) {
      if (toolId === "text") {
        // Open dedicated text tool properties panel
        panelDispatch({ type: "MAXIMIZE_PANEL", panelId: "text-properties" });
      } else {
        // Open general properties panel for other tools
        panelDispatch({ type: "MAXIMIZE_PANEL", panelId: "properties" });
      }
    }
  };

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      {isMinimized ? (
        // Minimized state - just a small button
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMinimized(false)}
          className="bg-background/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200"
          onMouseDown={handleMouseDown}
          onPointerDown={handlePointerDown}
          style={{ touchAction: "none" }}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      ) : (
        // Full toolbar
        <div className="flex items-center space-x-1 bg-background/90 backdrop-blur-sm rounded-2xl p-3 border border-border/50 shadow-xl">
          {/* Drag Handle */}
          <div
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/50 rounded-lg mr-1"
            onMouseDown={handleMouseDown}
            onPointerDown={handlePointerDown}
            style={{ touchAction: "none" }}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Stylus-Only Mode Toggle - Always clickable */}
          <div className="relative group">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleStylusOnly}
              className={cn(
                "w-11 h-11 rounded-xl transition-all duration-200 hover:scale-105",
                stylusState.mode === "full"
                  ? "bg-orange-500 text-white shadow-lg scale-105 hover:bg-orange-600"
                  : stylusState.mode === "light"
                    ? "bg-orange-300 text-white shadow-lg scale-105 hover:bg-orange-400"
                    : "hover:bg-muted/50 hover:shadow-sm text-orange-500 border border-orange-500/30",
              )}
              // This style ensures the stylus button is always clickable, even in stylus-only mode
              style={{ pointerEvents: "auto", touchAction: "manipulation" }}
            >
              <Pen className="h-5 w-5" />
            </Button>

            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                {stylusState.mode === "off"
                  ? "Enable Light Stylus"
                  : stylusState.mode === "light"
                    ? "Enable Full Stylus"
                    : "Disable Stylus Mode"}
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-border/50 mx-2" />
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = state.currentTool === tool.id;
            const hasProperties = toolsWithProperties.includes(tool.id);
            return (
              <div key={tool.id} className="relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToolSelect(tool.id)}
                  className={cn(
                    "w-11 h-11 rounded-xl transition-all duration-200 hover:scale-105 relative",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg scale-105"
                      : "hover:bg-muted/50 hover:shadow-sm",
                    stylusState.mode === "full" &&
                      "opacity-60 pointer-events-none",
                  )}
                  style={
                    stylusState.mode === "full" ? { touchAction: "none" } : {}
                  }
                >
                  <Icon className="h-5 w-5" />

                  {/* Property dot */}
                  {isActive && hasProperties && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePropertyDotClick(tool.id);
                      }}
                      className={cn(
                        "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full transition-all duration-200 hover:scale-125 cursor-pointer border",
                        actualTheme === "dark"
                          ? "bg-white border-gray-300 hover:bg-gray-100 hover:border-gray-400"
                          : "bg-black border-gray-600 hover:bg-gray-800 hover:border-gray-500",
                      )}
                      title="Open properties"
                    />
                  )}
                </Button>

                {/* Tooltip */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  <div className="bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                    {tool.label}
                    {hasProperties && " (⚙️ for props)"}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Separator */}
          <div className="w-px h-6 bg-border/50 mx-2" />

          {/* Undo/Redo */}
          <div className="relative group">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUndo}
              disabled={state.historyIndex <= 0 || stylusState.mode === "full"}
              className={cn(
                "w-11 h-11 rounded-xl transition-all duration-200",
                state.historyIndex <= 0 || stylusState.mode === "full"
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-muted/50 hover:scale-105",
              )}
              style={stylusState.mode === "full" ? { touchAction: "none" } : {}}
            >
              <Undo className="h-5 w-5" />
            </Button>

            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                Undo
              </div>
            </div>
          </div>

          <div className="relative group">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRedo}
              disabled={
                state.historyIndex >= state.history.length - 1 ||
                stylusState.mode === "full"
              }
              className={cn(
                "w-11 h-11 rounded-xl transition-all duration-200",
                state.historyIndex >= state.history.length - 1 ||
                  stylusState.mode === "full"
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-muted/50 hover:scale-105",
              )}
              style={stylusState.mode === "full" ? { touchAction: "none" } : {}}
            >
              <Redo className="h-5 w-5" />
            </Button>

            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                Redo
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-border/50 mx-2" />

          {/* Action Tools */}
          <div className="relative group">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteSelected}
              disabled={
                state.selectedElements.length === 0 ||
                stylusState.mode === "full"
              }
              className={cn(
                "w-11 h-11 rounded-xl transition-all duration-200",
                state.selectedElements.length === 0 ||
                  stylusState.mode === "full"
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-destructive/10 hover:text-destructive hover:scale-105",
              )}
              style={stylusState.mode === "full" ? { touchAction: "none" } : {}}
            >
              <Trash2 className="h-5 w-5" />
            </Button>

            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                Delete Selected
              </div>
            </div>
          </div>

          {/* Clear Canvas with Properties */}
          <div className="flex items-center gap-1">
            <div className="relative group">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearCanvas}
                disabled={stylusState.mode === "full"}
                className={cn(
                  "w-11 h-11 rounded-xl transition-all duration-200",
                  stylusState.mode === "full"
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-destructive/10 hover:text-destructive hover:scale-105",
                )}
                style={
                  stylusState.mode === "full" ? { touchAction: "none" } : {}
                }
              >
                <RotateCcw className="h-5 w-5" />
              </Button>

              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                <div className="bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                  Clear Canvas
                </div>
              </div>
            </div>

            {/* Properties dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={stylusState.mode === "full"}
                  className={cn(
                    "w-5 h-5 p-0 rounded-full transition-all duration-200",
                    stylusState.mode === "full"
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-muted/50 hover:scale-110",
                  )}
                  style={
                    stylusState.mode === "full" ? { touchAction: "none" } : {}
                  }
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" side="bottom">
                <DropdownMenuItem
                  onClick={handleScrollToOriginBox}
                  className="cursor-pointer"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Scroll back to origin box
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-border/50 mx-2" />

          {/* Library Toggle */}
          <div className="relative group">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleLibrary}
              disabled={stylusState.mode === "full"}
              className={cn(
                "w-11 h-11 rounded-xl transition-all duration-200 hover:scale-105",
                libraryState.isLibraryPanelOpen
                  ? "bg-primary/10 text-primary shadow-lg scale-105"
                  : "hover:bg-muted/50 hover:shadow-sm",
                stylusState.mode === "full" && "opacity-40 cursor-not-allowed",
              )}
              style={stylusState.mode === "full" ? { touchAction: "none" } : {}}
            >
              <Library className="h-5 w-5" />
            </Button>

            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                Library ({libraryState.libraries.length})
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-border/50 mx-2" />

          {/* Minimize Button */}
          <div className="relative group">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              disabled={stylusState.mode === "full"}
              className={cn(
                "w-11 h-11 rounded-xl transition-all duration-200",
                stylusState.mode === "full"
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-muted/50 hover:scale-105",
              )}
              style={stylusState.mode === "full" ? { touchAction: "none" } : {}}
            >
              <ChevronUp className="h-5 w-5" />
            </Button>

            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              <div className="bg-foreground text-background text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                Minimize
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
