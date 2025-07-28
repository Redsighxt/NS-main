import { useEffect } from "react";
import { useDrawing } from "../contexts/DrawingContext";

export function useKeyboardShortcuts() {
  const { state, dispatch } = useDrawing();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      // Tool shortcuts
      switch (key) {
        case "v":
          if (!isCtrlOrCmd) {
            dispatch({ type: "SET_TOOL", tool: "select" });
            event.preventDefault();
          }
          break;
        case "h":
          if (!isCtrlOrCmd) {
            dispatch({ type: "SET_TOOL", tool: "hand" });
            event.preventDefault();
          }
          break;
        case "p":
          if (!isCtrlOrCmd) {
            dispatch({ type: "SET_TOOL", tool: "pencil" });
            event.preventDefault();
          }
          break;
        case "r":
          if (!isCtrlOrCmd) {
            dispatch({ type: "SET_TOOL", tool: "rectangle" });
            event.preventDefault();
          }
          break;
        case "o":
          if (!isCtrlOrCmd) {
            dispatch({ type: "SET_TOOL", tool: "ellipse" });
            event.preventDefault();
          }
          break;
        case "d":
          if (!isCtrlOrCmd) {
            dispatch({ type: "SET_TOOL", tool: "diamond" });
            event.preventDefault();
          }
          break;
        case "l":
          if (!isCtrlOrCmd) {
            dispatch({ type: "SET_TOOL", tool: "line" });
            event.preventDefault();
          }
          break;
        case "a":
          if (!isCtrlOrCmd) {
            dispatch({ type: "SET_TOOL", tool: "arrow" });
            event.preventDefault();
          }
          break;
        case "t":
          if (!isCtrlOrCmd) {
            dispatch({ type: "SET_TOOL", tool: "text" });
            event.preventDefault();
          }
          break;
        case "e":
          if (!isCtrlOrCmd) {
            dispatch({ type: "SET_TOOL", tool: "eraser" });
            event.preventDefault();
          }
          break;
        case "delete":
        case "backspace":
          if (state.selectedElements.length > 0) {
            dispatch({ type: "DELETE_SELECTED" });
            event.preventDefault();
          }
          break;
        case "escape":
          dispatch({ type: "SELECT_ELEMENTS", elementIds: [] });
          event.preventDefault();
          break;
      }

      // Ctrl/Cmd shortcuts
      if (isCtrlOrCmd) {
        switch (key) {
          case "a":
            if (isCtrlOrCmd) {
              // Select all elements on visible and unlocked layers
              const visibleLayerIds = state.layers
                .filter((layer) => layer.visible && !layer.locked)
                .map((layer) => layer.id);
              const allElementIds = state.elements
                .filter((el) => visibleLayerIds.includes(el.layerId))
                .map((el) => el.id);
              dispatch({ type: "SELECT_ELEMENTS", elementIds: allElementIds });
              event.preventDefault();
            } else {
              // Arrow tool shortcut
              dispatch({ type: "SET_TOOL", tool: "arrow" });
              event.preventDefault();
            }
            break;
          case "d":
            // Deselect all
            dispatch({ type: "SELECT_ELEMENTS", elementIds: [] });
            event.preventDefault();
            break;
          case "c":
            // Copy selected elements
            if (state.selectedElements.length > 0) {
              const selectedElements = state.elements.filter((el) =>
                state.selectedElements.includes(el.id),
              );

              // Calculate bounding box for proper paste positioning
              let minX = Infinity, minY = Infinity;
              selectedElements.forEach(element => {
                if (element.points && element.points.length > 0) {
                  element.points.forEach(point => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                  });
                } else {
                  minX = Math.min(minX, element.x);
                  minY = Math.min(minY, element.y);
                }
              });

              const clipboardData = {
                elements: selectedElements,
                bounds: { minX, minY },
                timestamp: Date.now()
              };

              try {
                localStorage.setItem("clipboard", JSON.stringify(clipboardData));
                console.log(`Copied ${selectedElements.length} elements`);
              } catch (error) {
                console.warn("Failed to copy to clipboard:", error);
              }
            }
            event.preventDefault();
            break;
          case "v":
            // Paste elements
            try {
              const clipboardData = localStorage.getItem("clipboard");
              if (clipboardData) {
                const data = JSON.parse(clipboardData);
                const elements = data.elements || data; // Support both old and new format
                const bounds = data.bounds || { minX: 0, minY: 0 };

                // Calculate paste offset (20px from original position or from current view center)
                const pasteOffset = 20;
                let offsetX = pasteOffset;
                let offsetY = pasteOffset;

                // If we have bounds information, paste relative to current view
                if (bounds.minX !== undefined && bounds.minY !== undefined) {
                  offsetX = pasteOffset;
                  offsetY = pasteOffset;
                }

                const pastedElements = elements.map((el: any) => {
                  const newElement = {
                    ...el,
                    id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: Date.now(),
                    layerId: state.activeLayerId, // Assign to current active layer
                  };

                  // Apply offset to position
                  newElement.x = el.x + offsetX;
                  newElement.y = el.y + offsetY;

                  // Apply offset to points if they exist
                  if (el.points && Array.isArray(el.points)) {
                    newElement.points = el.points.map((p: any) => ({
                      x: p.x + offsetX,
                      y: p.y + offsetY,
                    }));
                  }

                  return newElement;
                });

                // Save state before pasting for undo
                dispatch({ type: "SAVE_STATE" });

                pastedElements.forEach((element: any) => {
                  dispatch({ type: "ADD_ELEMENT", element });
                });

                const newIds = pastedElements.map((el: any) => el.id);
                dispatch({ type: "SELECT_ELEMENTS", elementIds: newIds });
                console.log(`Pasted ${pastedElements.length} elements`);
              }
            } catch (error) {
              console.error("Failed to paste:", error);
            }
            event.preventDefault();
            break;
          case "z":
            if (event.shiftKey) {
              // Ctrl+Shift+Z = Redo
              dispatch({ type: "REDO" });
            } else {
              // Ctrl+Z = Undo
              dispatch({ type: "UNDO" });
            }
            event.preventDefault();
            break;
          case "y":
            // Ctrl+Y = Redo (alternative)
            dispatch({ type: "REDO" });
            event.preventDefault();
            break;
        }
      }

      // Zoom shortcuts
      if (isCtrlOrCmd || event.altKey) {
        switch (key) {
          case "=":
          case "+":
            // Zoom in
            const newScaleIn = Math.min(5, state.viewTransform.scale * 1.2);
            dispatch({
              type: "SET_VIEW_TRANSFORM",
              transform: { ...state.viewTransform, scale: newScaleIn },
            });
            event.preventDefault();
            break;
          case "-":
            // Zoom out
            const newScaleOut = Math.max(0.1, state.viewTransform.scale * 0.8);
            dispatch({
              type: "SET_VIEW_TRANSFORM",
              transform: { ...state.viewTransform, scale: newScaleOut },
            });
            event.preventDefault();
            break;
          case "0":
            // Reset zoom
            dispatch({
              type: "SET_VIEW_TRANSFORM",
              transform: { x: 0, y: 0, scale: 1 },
            });
            event.preventDefault();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, dispatch]);
}
