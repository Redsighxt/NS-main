import React, { useState } from "react";
import { useDrawing } from "../../contexts/DrawingContext";
import { AnimatedFloatingPanel } from "../FloatingPanel/AnimatedFloatingPanel";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Layers,
  Pin,
  PinOff,
  Eraser,
} from "lucide-react";
import { cn } from "../../lib/utils";

export function LayerManager() {
  const { state, dispatch } = useDrawing();
  const [newLayerName, setNewLayerName] = useState("");

  const handleAddLayer = () => {
    const layerName = newLayerName.trim() || `Layer ${state.layers.length + 1}`;
    const layerId = `layer-${Date.now()}`;

    dispatch({
      type: "ADD_LAYER",
      layer: { id: layerId, name: layerName },
    });

    dispatch({ type: "SET_ACTIVE_LAYER", layerId });
    setNewLayerName("");
  };

  const handleToggleVisibility = (layerId: string) => {
    dispatch({ type: "TOGGLE_LAYER_VISIBILITY", layerId });
  };

  const handleToggleLock = (layerId: string) => {
    dispatch({ type: "TOGGLE_LAYER_LOCK", layerId });
  };

  const handleTogglePin = (layerId: string) => {
    dispatch({ type: "TOGGLE_LAYER_PIN", layerId });
  };

  const handleSetActiveLayer = (layerId: string) => {
    dispatch({ type: "SET_ACTIVE_LAYER", layerId });
  };

  const handleClearLayer = (layerId: string) => {
    dispatch({ type: "CLEAR_LAYER", layerId });
  };

  return (
    <AnimatedFloatingPanel
      id="layers"
      title="Layers"
      icon={Layers}
      defaultPosition={{
        x: 20,
        y: typeof window !== "undefined" ? window.innerHeight - 400 : 400,
      }}
      defaultSize={{ width: 280, height: 350 }}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          {state.layers.map((layer) => {
            const elementCount = state.elements.filter(
              (el) => el.layerId === layer.id,
            ).length;
            const isActive = layer.id === state.activeLayerId;

            return (
              <div
                key={layer.id}
                className={cn(
                  "flex items-center space-x-2 p-2 rounded border cursor-pointer",
                  isActive
                    ? "bg-primary/10 border-primary"
                    : "border-border hover:bg-muted",
                )}
                onClick={() => handleSetActiveLayer(layer.id)}
              >
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleVisibility(layer.id);
                    }}
                    className="h-6 w-6 p-0"
                    title={layer.visible ? "Hide layer" : "Show layer"}
                  >
                    {layer.visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3 opacity-50" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleLock(layer.id);
                    }}
                    className={cn(
                      "h-6 w-6 p-0",
                      layer.locked && "text-orange-500",
                    )}
                    title={layer.locked ? "Unlock layer" : "Lock layer"}
                  >
                    {layer.locked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Unlock className="h-3 w-3 opacity-50" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePin(layer.id);
                    }}
                    className={cn(
                      "h-6 w-6 p-0",
                      layer.pinned && "text-blue-500",
                    )}
                    title={layer.pinned ? "Unpin layer" : "Pin layer"}
                  >
                    {layer.pinned ? (
                      <Pin className="h-3 w-3" />
                    ) : (
                      <PinOff className="h-3 w-3 opacity-50" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Clear all elements from "${layer.name}"?`,
                        )
                      ) {
                        handleClearLayer(layer.id);
                      }
                    }}
                    className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900"
                    title="Clear layer content"
                  >
                    <Eraser className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm font-medium truncate flex items-center space-x-1",
                      !layer.visible && "opacity-50",
                      layer.locked && "text-orange-600",
                    )}
                  >
                    <span>{layer.name}</span>
                    {layer.pinned && <Pin className="h-3 w-3 text-blue-500" />}
                    {layer.locked && (
                      <Lock className="h-3 w-3 text-orange-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {elementCount} element{elementCount !== 1 ? "s" : ""}
                    {layer.locked && " • Locked"}
                    {layer.pinned && " • Pinned"}
                  </div>
                </div>

                {isActive && (
                  <div className="text-xs text-primary font-medium">Active</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex space-x-2">
          <Input
            placeholder="New layer name..."
            value={newLayerName}
            onChange={(e) => setNewLayerName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddLayer()}
            className="flex-1 text-sm"
          />
          <Button size="sm" onClick={handleAddLayer} className="px-3">
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Total elements: {state.elements.length}
          </div>
        </div>
      </div>
    </AnimatedFloatingPanel>
  );
}
