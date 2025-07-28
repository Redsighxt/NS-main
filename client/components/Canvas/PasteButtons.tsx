import React, { useState } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { Button } from "../ui/button";
import { Clipboard, X, RotateCw, Maximize } from "lucide-react";

export function PasteButtons() {
  const { state, dispatch } = useDrawing();
  const [activePasteId, setActivePasteId] = useState<string | null>(null);
  const [pastePosition, setPastePosition] = useState({ x: 0, y: 0 });

  if (
    !state.showPasteButtons ||
    state.pasteStates.length === 0 ||
    state.currentTool !== "lasso"
  ) {
    return null;
  }

  const handlePasteClick = (pasteId: string) => {
    setActivePasteId(pasteId);
    // Show paste preview at cursor position
    // For now, we'll use a default position
    setPastePosition({ x: 100, y: 100 });
  };

  const handlePasteAt = (
    pasteId: string,
    position: { x: number; y: number },
  ) => {
    // Convert screen position to world position
    const worldPosition = {
      x: (position.x - state.viewTransform.x) / state.viewTransform.scale,
      y: (position.y - state.viewTransform.y) / state.viewTransform.scale,
    };

    dispatch({ type: "PASTE_ELEMENTS", pasteId, position: worldPosition });
    setActivePasteId(null);
  };

  const handleRemovePasteState = (pasteId: string) => {
    dispatch({ type: "REMOVE_PASTE_STATE", pasteId });
    if (activePasteId === pasteId) {
      setActivePasteId(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (activePasteId) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      handlePasteAt(activePasteId, position);
    }
  };

  return (
    <>
      {/* Floating paste buttons */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {state.pasteStates.map((pasteState) => (
          <div
            key={pasteState.id}
            className="flex items-center space-x-2 bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-lg p-2"
          >
            <Button
              size="sm"
              variant={activePasteId === pasteState.id ? "default" : "outline"}
              onClick={() => handlePasteClick(pasteState.id)}
              className="flex items-center space-x-1"
            >
              <Clipboard className="h-4 w-4" />
              <span>{pasteState.name}</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRemovePasteState(pasteState.id)}
              className="p-1"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Active paste preview */}
      {activePasteId && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleCanvasClick}
          style={{ cursor: "crosshair" }}
        >
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-lg p-2">
            <span className="text-sm text-muted-foreground">
              Click anywhere to paste{" "}
              {state.pasteStates.find((p) => p.id === activePasteId)?.name}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
